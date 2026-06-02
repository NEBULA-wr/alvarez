import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../supabaseClient';
import { 
  FolderOpen, LayoutDashboard, MessageSquare, Settings, LogOut, 
  Search, Bell, Trash2, MapPin, Image as ImageIcon, X, 
  CheckCircle2, Plus, Inbox, Mail, MessageCircle, Lock, 
  Map, Save, UploadCloud, FileText
} from 'lucide-react';
import { Profile, Project, Message } from '../types';

interface AdminPanelProps {
  currentProfile: Profile;
  onLogout: () => void;
}

export default function AdminPanel({ currentProfile, onLogout }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'projects' | 'messages' | 'settings'>('upload');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data States
  const [projects, setProjects] = useState<Project[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Por favor espera...');

  // Upload Project State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [year, setYear] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [areaTerreno, setAreaTerreno] = useState('');
  const [areaConstruida, setAreaConstruida] = useState('');
  const [niveles, setNiveles] = useState('');
  const [colaboradores, setColaboradores] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Settings State
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [companyPhone, setCompanyPhone] = useState('+1 (809) 965-1012');

  // Toast State
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: 'success' | 'error' | 'info' }>({
    show: false,
    msg: '',
    type: 'success'
  });

  // Modal Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  // Fetch initial data
  useEffect(() => {
    fetchProjects();
    fetchMessages();
  }, []);

  // Subscribe to real-time updates for messages and projects in Supabase
  useEffect(() => {
    const projectSub = supabase
      .channel('realtime-projects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        fetchProjects();
      })
      .subscribe();

    const messageSub = supabase
      .channel('realtime-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        fetchMessages();
        showToast(`📲 Nuevo mensaje de ${payload.new.name}`, 'info');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(projectSub);
      supabase.removeChannel(messageSub);
    };
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setProjects(data);
    } catch (err: any) {
      console.error('Error fetching projects:', err);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setMessages(data);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
    }
  };

  // File handling
  const handleFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const fileArray = Array.from(selectedFiles).filter(f => f.type.startsWith('image/'));
    
    if (files.length + fileArray.length > 4) {
      showToast('Solo puedes subir un máximo de 4 imágenes por proyecto.', 'error');
      return;
    }

    const newFiles = [...files, ...fileArray].slice(0, 4);
    setFiles(newFiles);

    // Generate previews
    const previewUrls = newFiles.map(file => URL.createObjectURL(file));
    setPreviews(previewUrls);
  };

  const removeImage = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);

    const updatedPreviews = previews.filter((_, i) => i !== index);
    setPreviews(updatedPreviews);
    showToast('Imagen removida.', 'info');
  };

  // Handle Project Publishing
  const handlePublishProject = async (e: FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      showToast('Por favor completa el título y la descripción.', 'error');
      return;
    }

    setUploadProgress(true);
    setLoading(true);
    setLoadingMsg('Creando el proyecto en Supabase...');

    try {
      // 1. Crear el proyecto en Supabase
      const { data: proj, error: projErr } = await supabase
        .from('projects')
        .insert({
          title,
          description,
          location: location || 'Santo Domingo',
          year: year || '2026',
          category: category || 'Residencial',
          status: status || 'En Proyecto',
          area_terreno: areaTerreno ? parseFloat(areaTerreno) : null,
          area_construida: areaConstruida ? parseFloat(areaConstruida) : null,
          niveles: niveles ? parseInt(niveles) : null,
          colaboradores: colaboradores || 'Frayers Solutions',
          is_draft: false,
          created_by: currentProfile.id
        })
        .select()
        .single();

      if (projErr) throw projErr;

      let coverUrl = 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80'; // Fallback
      
      // 2. Subir imágenes si existen
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          setLoadingMsg(`Subiendo imagen ${i + 1} de ${files.length}...`);
          const file = files[i];
          const ext = file.name.split('.').pop();
          const path = `${proj.id}/${i}_${Date.now()}.${ext}`;

          const { error: upErr } = await supabase.storage
            .from('project-images')
            .upload(path, file);

          if (!upErr) {
            const { data: urlData } = supabase.storage
              .from('project-images')
              .getPublicUrl(path);

            const url = urlData.publicUrl;
            
            // Insertar relación de imagen
            await supabase.from('project_images').insert({
              project_id: proj.id,
              url: url,
              position: i
            });

            if (i === 0) {
              coverUrl = url;
            }
          } else {
            console.warn('Omitiendo subida a Storage (Storage no configurado). Se usará mockup por ahora.');
            // Usar link aleatorio Unsplash temático para arquitectura
            const randomUrls = [
              'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
              'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80',
              'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80',
              'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80'
            ];
            coverUrl = randomUrls[i % randomUrls.length];
            
            await supabase.from('project_images').insert({
              project_id: proj.id,
              url: coverUrl,
              position: i
            });
          }
        }

        // Actualizar cover_url de la portada del proyecto
        await supabase
          .from('projects')
          .update({ cover_url: coverUrl })
          .eq('id', proj.id);
      } else {
        // Asignar un link por defecto si no subió fotos
        await supabase
          .from('projects')
          .update({ cover_url: coverUrl })
          .eq('id', proj.id);
      }

      showToast('¡Proyecto publicado con éxito!');
      
      // Reset form
      setTitle('');
      setDescription('');
      setLocation('');
      setYear('');
      setCategory('');
      setStatus('');
      setAreaTerreno('');
      setAreaConstruida('');
      setNiveles('');
      setColaboradores('');
      setFiles([]);
      setPreviews([]);
      
      fetchProjects();
      setActiveTab('projects');
    } catch (err: any) {
      console.error('Error publishing project:', err);
      showToast('No se pudo guardar el proyecto: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setUploadProgress(false);
    }
  };

  // Delete project trigger
  const confirmDeleteProject = async () => {
    if (!deleteId) return;
    setLoading(true);
    setLoadingMsg('Eliminando proyecto...');
    
    try {
      // 1. Eliminar imágenes del Storage
      const { data: imgs } = await supabase
        .from('project_images')
        .select('url')
        .eq('project_id', deleteId);

      if (imgs) {
        for (const img of imgs) {
          const path = img.url.split('/project-images/')[1];
          if (path) {
            await supabase.storage.from('project-images').remove([path]);
          }
        }
      }

      // 2. Eliminar el proyecto
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      showToast('Proyecto eliminado definitivamente.');
      setDeleteId(null);
      fetchProjects();
    } catch (err: any) {
      console.error('Error deleting project:', err);
      showToast('Error al eliminar: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Mark all messages as read
  const handleMarkAllRead = async () => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) throw error;
      showToast('Todos los mensajes marcados como leídos.', 'info');
      fetchMessages();
    } catch (err: any) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  // Delete single message
  const handleDeleteMessage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Mensaje eliminado.', 'info');
      fetchMessages();
    } catch (err: any) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  // Update password settings
  const handleUpdatePassword = async () => {
    if (!newPass) {
      showToast('Por favor escribe tu nueva contraseña.', 'error');
      return;
    }
    if (newPass !== confirmPass) {
      showToast('Las contraseñas no coinciden.', 'error');
      return;
    }

    setLoading(true);
    setLoadingMsg('Actualizando tu contraseña...');
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPass
      });

      if (error) throw error;
      showToast('Contraseña actualizada con éxito.');
      setNewPass('');
      setConfirmPass('');
    } catch (err: any) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filtered projects
  const filteredProjects = projects.filter(p => !p.is_draft).filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.location && p.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const unreadMessagesCount = messages.filter(m => !m.is_read).length;

  return (
    <div className="flex bg-[#f4f6ff] min-h-screen text-[#0d1340] font-sans">
      
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl z-[9999] text-white anim-up ${
          toast.type === 'error' ? 'bg-red-600' : toast.type === 'info' ? 'bg-[#3060ff]' : 'bg-[#000263]'
        }`}>
          <CheckCircle2 className="w-5 h-5 text-[#d4af37]" />
          <span className="text-xs font-bold font-sans tracking-wide">{toast.msg}</span>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-[#000263]/20 backdrop-blur-[2px] flex items-center justify-center z-[9999]">
          <div className="bg-white px-8 py-6 rounded-2xl shadow-xl text-center flex flex-col items-center gap-4">
            <span className="w-9 h-9 border-4 border-gray-100 border-t-[#000263] rounded-full animate-spin"></span>
            <p className="text-xs text-gray-500 font-mono">{loadingMsg}</p>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {deleteId && (
        <div className="fixed inset-0 bg-[#000263]/50 backdrop-blur-[3px] flex items-center justify-center z-[9999] p-4">
          <div className="bg-white max-w-sm w-full rounded-2xl p-6 text-center shadow-2xl anim-up">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600 mx-auto mb-4 border border-red-100">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-[#0d1340] mb-2 text-center">Eliminar Proyecto</h3>
            <p className="text-xs text-gray-400 mb-6 leading-relaxed">
              ¿Estás completamente seguro de eliminar este proyecto de forma permanente? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 font-bold text-xs rounded-lg uppercase tracking-wide"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDeleteProject}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg uppercase tracking-wide"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BARRA LATERAL (SIDEBAR) */}
      <aside className="w-[240px] bg-[#000263] text-white flex-shrink-0 sticky top-0 h-screen overflow-y-auto flex flex-col justify-between hidden md:flex border-r border-[#dde3f7]">
        <div>
          
          {/* Logo */}
          <div className="p-6 border-b border-white/5 flex items-center gap-3">
            {!logoError ? (
              <img 
                src="/logo.png" 
                alt="Frayers Solutions" 
                className="h-8 w-auto object-contain bg-white/5 p-1 rounded" 
                onError={() => setLogoError(true)} 
              />
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-[#d4af37] flex items-center justify-center text-white font-serif font-black text-lg">F</div>
                <div>
                  <div className="font-display font-extrabold text-[#d4af37] text-sm leading-none">Frayers</div>
                  <div className="font-display font-medium text-gray-400 text-[10px] tracking-wider mt-0.5">Solutions</div>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4">
            <p className="text-[10px] uppercase font-bold tracking-widest text-[#7b8db0]">Panel Admin</p>
          </div>

          {/* Nav */}
          <nav className="px-3 space-y-1">
            <button 
              onClick={() => adminSection('upload')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold tracking-wide uppercase transition ${
                activeTab === 'upload' ? 'bg-[#2040d0] text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <FolderOpen className="w-4 h-4 text-[#d4af37]" /> Subir Proyecto
            </button>

            <button 
              onClick={() => adminSection('projects')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold tracking-wide uppercase transition ${
                activeTab === 'projects' ? 'bg-[#2040d0] text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-[#d4af37]" /> Publicados
              <span className="ml-auto bg-[#3060ff] px-2 py-0.5 rounded-full text-[9px] font-black">{projects.length}</span>
            </button>

            <button 
              onClick={() => adminSection('messages')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold tracking-wide uppercase transition ${
                activeTab === 'messages' ? 'bg-[#2040d0] text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-[#d4af37]" /> Mensajes
              {unreadMessagesCount > 0 && (
                <span className="ml-auto bg-red-500 px-2 py-0.5 rounded-full text-[9px] font-black">{unreadMessagesCount}</span>
              )}
            </button>

            <button 
              onClick={() => adminSection('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold tracking-wide uppercase transition ${
                activeTab === 'settings' ? 'bg-[#2040d0] text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4 text-[#d4af37]" /> Ajustes
            </button>
          </nav>
        </div>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-white/5 space-y-3">
          <div className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded-md hover:bg-white/10 transition select-none">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-semibold text-gray-300">Tiempo Real Sincronizado</span>
          </div>
          
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold tracking-wide uppercase text-red-400/80 hover:text-red-400 hover:bg-white/5 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* CUERPO CENTRAL DE INFORMACIÓN */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* Header Superior */}
        <header className="h-16 bg-white border-b border-[#dde3f7] flex items-center justify-between px-8 text-xs sticky top-0 z-40">
          <div className="flex items-center gap-3 text-gray-400 w-full max-w-sm bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 focus-within:border-[#2040d0] focus-within:bg-white transition duration-200">
            <Search className="w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por títulos, categorías..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-[#0d1340] w-full"
            />
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => adminSection('messages')}
              className="relative p-1 text-gray-500 hover:text-[#000263]"
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full"></span>
              )}
            </button>

            <span className="w-px h-6 bg-gray-200"></span>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#2040d0] text-white flex items-center justify-center font-bold text-xs select-none">
                {currentProfile.full_name?.slice(0, 2).toUpperCase() || 'AD'}
              </div>
              <div>
                <p className="text-xs font-bold leading-none">{currentProfile.full_name || 'Panel de Administración'}</p>
                <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">Administrador General</p>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENEDOR MULTIPESTAÑA */}
        <main className="flex-1 p-8 overflow-y-auto">
          
          {/* SECCIÓN 1: SUBIR PROYECTO */}
          {activeTab === 'upload' && (
            <div className="max-w-4xl mx-auto anim-up">
              <div className="mb-6">
                <h1 className="font-display font-extrabold text-2xl text-[#0d1340]">Subir Nuevo Proyecto</h1>
                <p className="text-xs text-gray-500 mt-1">Sube la información de las construcciones, materiales u obras realizadas por Frayers Solutions.</p>
              </div>

              <form onSubmit={handlePublishProject} className="grid md:grid-cols-12 gap-8 items-start">
                
                {/* Formulario Izquierda */}
                <div className="md:col-span-8 bg-white p-6 rounded-xl border border-[#dde3f7] space-y-6">
                  
                  <div>
                    <h4 className="text-[10px] uppercase font-bold tracking-widest text-gray-400 border-b border-gray-100 pb-2 mb-4">Información Principal</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Título del Proyecto *</label>
                        <input 
                          type="text" 
                          required
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Ej. Torre Horizonte Azul" 
                          className="w-full bg-white border border-gray-200 focus:border-[#2040d0] rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none transition"
                        />
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-[10px] uppercase font-bold text-[#0d1340]">Descripción Detallada *</label>
                          <span className="text-[9px] text-gray-400 font-mono">{description.length}/1000</span>
                        </div>
                        <textarea 
                          required
                          rows={5}
                          maxLength={1000}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Detalle de materiales, contexto geográfico, arquitectura, desafíos y soluciones de ingeniería..." 
                          className="w-full bg-white border border-gray-200 focus:border-[#2040d0] rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none transition resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Ubicación</label>
                          <input 
                            type="text" 
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Ej. Santo Domingo Este" 
                            className="w-full bg-white border border-gray-200 focus:border-[#2040d0] rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none transition"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Año de Conclusión</label>
                          <select 
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            className="w-full bg-white border border-gray-200 focus:border-[#2040d0] rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none transition"
                          >
                            <option value="">Selecciona año</option>
                            <option value="2026">2026</option>
                            <option value="2025">2025</option>
                            <option value="2024">2024</option>
                            <option value="2023">2023</option>
                            <option value="2022">2022</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Categoría Técnica</label>
                          <select 
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-white border border-gray-200 focus:border-[#2040d0] rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none transition"
                          >
                            <option value="Residencial">Residencial</option>
                            <option value="Comercial">Comercial</option>
                            <option value="Industrial">Industrial</option>
                            <option value="Paisajismo">Paisajismo</option>
                            <option value="Interiores">Diseño de Interiores</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Estado</label>
                          <select 
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full bg-white border border-gray-200 focus:border-[#2040d0] rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none transition"
                          >
                            <option value="Construido">Construido (Terminado)</option>
                            <option value="En Construcción">En Construcción</option>
                            <option value="En Proyecto">En Proyecto</option>
                            <option value="Conceptual">Conceptual</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] uppercase font-bold tracking-widest text-gray-400 border-b border-gray-100 pb-2 mb-4">Métricas Técnicas (Opcional)</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Terreno m²</label>
                        <input 
                          type="number" 
                          value={areaTerreno}
                          onChange={(e) => setAreaTerreno(e.target.value)}
                          placeholder="350" 
                          className="w-full bg-white border border-gray-200 focus:border-[#2040d0] rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Construido m²</label>
                        <input 
                          type="number" 
                          value={areaConstruida}
                          onChange={(e) => setAreaConstruida(e.target.value)}
                          placeholder="280" 
                          className="w-full bg-white border border-gray-200 focus:border-[#2040d0] rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Nivel / Pisos</label>
                        <input 
                          type="number" 
                          value={niveles}
                          onChange={(e) => setNiveles(e.target.value)}
                          placeholder="2" 
                          className="w-full bg-white border border-gray-200 focus:border-[#2040d0] rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none transition"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Colaboradores / Profesionales</label>
                      <input 
                        type="text" 
                        value={colaboradores}
                        onChange={(e) => setColaboradores(e.target.value)}
                        placeholder="Ing. Juan Pérez, Arquitecto Gómez (separados por coma)" 
                        className="w-full bg-white border border-gray-200 focus:border-[#2040d0] rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none transition"
                      />
                    </div>
                  </div>

                </div>

                {/* Formulario Derecha (Imágenes y Botones) */}
                <div className="md:col-span-4 space-y-6">
                  
                  {/* Caja de subida */}
                  <div className="bg-white p-6 rounded-xl border border-[#dde3f7]">
                    <h4 className="text-[10px] uppercase font-bold tracking-widest text-[#7b8db0] mb-4">Fotos de Desarrollo</h4>
                    
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-5 text-center bg-gray-50/50 hover:bg-gray-50 hover:border-[#2040d0] transition duration-200 relative cursor-pointer">
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*"
                        onChange={(e) => handleFiles(e.target.files)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-[11px] font-bold text-[#0d1340]">Arrastra o selecciona las fotos</p>
                      <p className="text-[9px] text-gray-400 mt-1">Hasta 4 archivos PNG, JPG, WebP</p>
                    </div>

                    {/* Previews */}
                    {previews.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mt-4">
                        {previews.map((src, i) => (
                          <div key={i} className="relative aspect-square rounded-md overflow-hidden bg-gray-100 border border-gray-200">
                            <img src={src} alt="preview" className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => removeImage(i)}
                              className="absolute top-1 right-1 w-4.5 h-4.5 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                            {i === 0 && (
                              <span className="absolute bottom-0 inset-x-0 bg-[#000263]/80 text-[7px] text-center text-white py-0.5 font-bold uppercase uppercase text-nowrap">Portada</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="bg-white p-6 rounded-xl border border-[#dde3f7]">
                    <button 
                      type="submit" 
                      disabled={uploadProgress}
                      className="w-full py-3 bg-[#000263] hover:bg-[#001aa0] disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4 text-[#d4af37]" /> Publicar Proyecto
                    </button>
                    
                    <button 
                      type="button" 
                      onClick={() => showToast('Borrador guardado localmente de forma temporal.')}
                      className="w-full py-2.5 mt-3 border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold text-xs uppercase tracking-wide rounded-lg transition"
                    >
                      Guardar en Borradores
                    </button>
                  </div>

                </div>

              </form>
            </div>
          )}

          {/* SECCIÓN 2: PUBLICADOS */}
          {activeTab === 'projects' && (
            <div className="max-w-6xl mx-auto anim-up">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                <div>
                  <h1 className="font-display font-extrabold text-2xl text-[#0d1340]">Proyectos Publicados</h1>
                  <p className="text-xs text-gray-500 mt-1">Explora, edita o elimina construcciones cargadas en tu portafolio.</p>
                </div>
                <button 
                  onClick={() => adminSection('upload')}
                  className="bg-[#000263] hover:bg-[#001aa0] text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg inline-flex items-center gap-1.5 transition transition-all duration-200 self-start"
                >
                  <Plus className="w-4 h-4 text-[#d4af37]" /> Nuevo Proyecto
                </button>
              </div>

              {filteredProjects.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 py-16 text-center text-gray-400">
                  <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-xs font-bold text-gray-600">No hay proyectos para mostrar</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Sube proyectos desde el formulario para poblar el portafolio</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredProjects.map((p) => (
                    <div key={p.id} className="bg-white rounded-xl border border-[#dde3f7] overflow-hidden flex flex-col hover:shadow-lg transition duration-300 group relative">
                      
                      {/* Portada */}
                      <div className="h-44 bg-gray-100 relative overflow-hidden flex items-center justify-center">
                        {p.cover_url ? (
                          <img src={p.cover_url} alt={p.title} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-gray-300" />
                        )}
                        
                        {/* Insignia de Estado */}
                        <span className="absolute top-3 left-3 bg-[#000263] text-[#d4af37] py-0.5 px-2 rounded-full text-[8px] font-bold uppercase">
                          {p.status}
                        </span>

                        {/* Botón Eliminar */}
                        <button 
                          onClick={() => setDeleteId(p.id)}
                          className="absolute top-3 right-3 w-7 h-7 bg-white hover:bg-red-50 text-red-500 hover:text-red-700 rounded-full flex items-center justify-center shadow transition hover:scale-105"
                          title="Eliminar proyecto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Info */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <p className="text-[9px] text-[#2040d0] font-black tracking-wider uppercase mb-1">{p.category} &middot; {p.year}</p>
                          <h3 className="font-display font-bold text-sm text-[#0d1340] line-clamp-1 group-hover:text-[#2040d0] transition">{p.title}</h3>
                          <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">{p.description}</p>
                        </div>

                        <div className="border-t border-gray-100 pt-3 mt-4 flex items-center text-[10px] text-gray-400 gap-1 font-semibold">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{p.location || 'Santo Domingo'}</span>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECCIÓN 3: MENSAJES */}
          {activeTab === 'messages' && (
            <div className="max-w-4xl mx-auto anim-up">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                <div>
                  <h1 className="font-display font-extrabold text-2xl text-[#0d1340]">Mensajes y Cotizaciones</h1>
                  <p className="text-xs text-gray-500 mt-1">Bandeja de requerimientos de clientes y contactos en tiempo real.</p>
                </div>
                {messages.length > 0 && (
                  <button 
                    onClick={handleMarkAllRead}
                    className="border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-900 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-lg inline-flex items-center gap-1.5 transition self-start"
                  >
                    Marcar Todos como Leídos
                  </button>
                )}
              </div>

              {messages.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 py-16 text-center text-gray-400">
                  <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-xs font-bold text-gray-600">No hay requerimientos en la bandeja</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Cuando los clientes completen cotizaciones se listarán aquí de forma instantánea</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((m) => (
                    <div 
                      key={m.id} 
                      className={`bg-white rounded-xl p-5 border transition duration-300 relative shadow-sm ${
                        m.is_read ? 'border-gray-200/80 hover:border-gray-300' : 'border-[#3060ff]/45 bg-[#f0f4ff]/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap mb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-[#0d1340]">{m.name}</span>
                            {!m.is_read && (
                              <span className="bg-blue-600 text-white rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide">Nuevo</span>
                            )}
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                              m.kind === 'Cotización' ? 'bg-[#fff3d1] text-[#8a5c00]' : 'bg-[#eef0fb] text-gray-500'
                            }`}>
                              {m.kind}
                            </span>
                            {m.project_type && (
                              <span className="bg-blue-50 text-[#2040d0] rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide border border-blue-100/50">
                                {m.project_type}
                              </span>
                            )}
                          </div>
                          
                          <p className="text-[10px] text-gray-400">
                            {m.email} &middot; <span className="font-mono">{m.phone || 'Sin número'}</span>
                          </p>
                          {m.subject && (
                            <p className="text-xs font-bold text-[#0d1340] pt-1">Asunto: {m.subject}</p>
                          )}
                        </div>

                        {/* Fecha */}
                        <span className="text-[9px] text-[#7b8db0] font-mono leading-none select-none">
                          {m.created_at ? new Date(m.created_at).toLocaleDateString() : ''}
                        </span>
                      </div>

                      {/* Mensaje */}
                      <p className="bg-[#f8f9fe] border border-gray-100 text-xs text-gray-700 leading-relaxed rounded-lg p-3.5 mb-4 font-sans max-w-3xl">
                        {m.message}
                      </p>

                      {/* Botones de acción directos */}
                      <div className="flex items-center gap-2 flex-wrap text-xs font-bold uppercase">
                        <a 
                          href={`mailto:${m.email}?subject=Respuesta de Frayers Solutions&body=Hola ${m.name},%0D%0A%0D%0AHemos recibido tu requerimiento de ${m.kind.toLowerCase()}: "${m.message.substring(0,60)}..."%0D%0A%0D%0AEstamos listos para asesorarte.%0D%0A%0D%0AAtentamente,%0D%0AFrayers Solutions`}
                          className="px-3.5 py-2 bg-[#000263] hover:bg-[#001aa0] text-white rounded-lg inline-flex items-center gap-1.5 transition"
                        >
                          <Mail className="w-3.5 h-3.5" /> Responder por Email
                        </a>

                        {m.phone && (
                          <a 
                            href={`https://wa.me/${m.phone.replace(/[^0-9]/g, '')}?text=Hola%20${encodeURIComponent(m.name)},%20te%20contacto%20de%20parte%20de%20Frayers%20Solutions%20respecto%20a%20tu%20${encodeURIComponent(m.kind.toLowerCase())}.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-lg inline-flex items-center gap-1.5 transition"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Directo
                          </a>
                        )}

                        <button 
                          onClick={() => handleDeleteMessage(m.id)}
                          className="ml-auto w-8 h-8 flex items-center justify-center border border-red-100 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition"
                          title="Eliminar mensaje"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECCIÓN 4: AJUSTES */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto anim-up">
              <div className="mb-6">
                <h1 className="font-display font-extrabold text-2xl text-[#0d1340]">Ajustes Administrativos</h1>
                <p className="text-xs text-gray-500 mt-1">Configura credenciales técnicas y el perfil corporativo de Frayers Solutions.</p>
              </div>

              <div className="space-y-6">
                
                {/* Seguridad contraseña */}
                <div className="bg-white p-6 rounded-xl border border-[#dde3f7]">
                  <h4 className="text-[10px] uppercase font-bold tracking-widest text-[#7b8db0] border-b border-gray-100 pb-2 mb-4">Actualizar Seguridad de Acceso</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Nueva Contraseña</label>
                      <input 
                        type="password" 
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        placeholder="Mínimo 6 caracteres" 
                        className="w-full bg-white border border-gray-200 focus:border-[#2040d0] rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Confirmar Nueva Contraseña</label>
                      <input 
                        type="password" 
                        value={confirmPass}
                        onChange={(e) => setConfirmPass(e.target.value)}
                        placeholder="Repite tu contraseña de ingreso" 
                        className="w-full bg-white border border-gray-200 focus:border-[#2040d0] rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none transition"
                      />
                    </div>
                    <button 
                      onClick={handleUpdatePassword}
                      className="px-5 py-2.5 bg-[#000263] hover:bg-[#001aa0] text-white font-bold text-xs uppercase tracking-wider rounded-lg transition inline-flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" /> Cambiar Contraseña Acceso
                    </button>
                  </div>
                </div>

                {/* Perfil Corporativo */}
                <div className="bg-white p-6 rounded-xl border border-[#dde3f7]">
                  <h4 className="text-[10px] uppercase font-bold tracking-widest text-[#7b8db0] border-b border-gray-100 pb-2 mb-4">Información Corporativa de la Empresa</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Nombre De Empresa</label>
                      <input 
                        type="text" 
                        defaultValue="Frayers Solutions" 
                        disabled
                        className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-2.5 text-xs text-gray-400 outline-none cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Email de atención corporativa</label>
                      <input 
                        type="email" 
                        defaultValue="contacto@frayerssolutions.com" 
                        disabled
                        className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-2.5 text-xs text-gray-400 outline-none cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5 text-gray-400">WhatsApp / Celular de la firma</label>
                      <input 
                        type="text" 
                        value={companyPhone}
                        onChange={(e) => setCompanyPhone(e.target.value)}
                        placeholder="+1 (809) 965-1012" 
                        className="w-full bg-white border border-gray-200 focus:border-[#2040d0] rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none transition"
                      />
                    </div>
                    <button 
                      onClick={() => showToast('Configuración guardada satisfactoriamente.')}
                      className="px-5 py-2.5 bg-[#000263] hover:bg-[#001aa0] text-white font-bold text-xs uppercase tracking-wider rounded-lg transition inline-flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" /> Guardar Cambios Corp.
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );

  function adminSection(tab: 'upload' | 'projects' | 'messages' | 'settings') {
    setActiveTab(tab);
    setSearchQuery('');
  }
}
