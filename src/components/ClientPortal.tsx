import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../supabaseClient';
import { 
  LayoutGrid, FileText, Mail, UserCircle2, LogOut, 
  MapPin, ArrowRight, Building2, X, Plus, Inbox, 
  Camera, Save, Lock, ArrowLeft, CheckCircle2
} from 'lucide-react';
import { Profile, Project } from '../types';

interface ClientPortalProps {
  currentUserProfile: Profile | null; // null si entra como visitante / no registrado
  onLogout: () => void;
  onGoBackToLanding: () => void;
  onGoToLogin: () => void;
}

export default function ClientPortal({ currentUserProfile, onLogout, onGoBackToLanding, onGoToLogin }: ClientPortalProps) {
  const [activeTab, setActiveTab] = useState<'portfolio' | 'quote' | 'contact' | 'profile'>('portfolio');
  const [filterCategory, setFilterCategory] = useState('Todos');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [logoError, setLogoError] = useState(false);

  // Modal Detail State
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectImages, setProjectImages] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);

  // Form Prefill State (Pre-llenado de cotización desde un proyecto)
  const [quoteMessage, setQuoteMessage] = useState('');
  const [quoteType, setQuoteType] = useState('');

  // Form States (Quote)
  const [qName, setQName] = useState(currentUserProfile?.full_name || '');
  const [qPhone, setQPhone] = useState(currentUserProfile?.phone || '');
  const [qEmail, setQEmail] = useState(currentUserProfile?.email || '');
  
  // Form States (Message)
  const [cName, setCName] = useState(currentUserProfile?.full_name || '');
  const [cPhone, setCPhone] = useState(currentUserProfile?.phone || '');
  const [cEmail, setCEmail] = useState(currentUserProfile?.email || '');
  const [cSubject, setCSubject] = useState('');
  const [cMessage, setCMessage] = useState('');

  // Profile Edit States
  const [pName, setPName] = useState(currentUserProfile?.full_name || '');
  const [pPhone, setPPhone] = useState(currentUserProfile?.phone || '');
  const [pBio, setPBio] = useState(currentUserProfile?.bio || '');
  const [pAvatar, setPAvatar] = useState(currentUserProfile?.avatar_url || '');

  // Security password states
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  // Feedback State
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Enviando...');
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: 'success' | 'error' | 'info' }>({
    show: false,
    msg: '',
    type: 'success'
  });

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  // Fetch projects from Supabase on load
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('is_draft', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setProjects(data);
    } catch (err) {
      console.error('Error fetching client projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Subscribe in real-time to list changes
  useEffect(() => {
    const sub = supabase
      .channel('client-realtime-projects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        fetchProjects();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, []);

  // Fetch images for selected project in modal
  const handleOpenProjectDetails = async (project: Project) => {
    setSelectedProject(project);
    setLoadingImages(true);
    setProjectImages([]);

    try {
      const { data, error } = await supabase
        .from('project_images')
        .select('url')
        .eq('project_id', project.id)
        .order('position');

      if (!error && data) {
        setProjectImages(data.map(img => img.url));
      }
    } catch (err) {
      console.error('Error loading gallery images:', err);
    } finally {
      setLoadingImages(false);
    }
  };

  const handlePrefillQuote = (projectTitle: string, projectCategory: string) => {
    setSelectedProject(null);
    setQuoteMessage(`Me interesa cotizar un proyecto de ingeniería y arquitectura similar al publicado con título "${projectTitle}". Por favor, asesórenme sobre las especificaciones técnicas y costos estimados.`);
    setQuoteType(projectCategory);
    setActiveTab('quote');
    showToast('Formulario prellenado con el proyecto.', 'info');
  };

  // Handle Form Submission: Quote
  const handleSubmitQuote = async (e: FormEvent) => {
    e.preventDefault();
    if (!qName || !qEmail || !quoteMessage) {
      showToast('Por favor completa los campos requeridos (*).', 'error');
      return;
    }

    setLoading(true);
    setLoadingMsg('Enviando propuesta...');

    try {
      const { error } = await supabase.from('messages').insert({
        kind: 'Cotización',
        name: qName,
        email: qEmail,
        phone: qPhone || null,
        project_type: quoteType || 'General',
        message: quoteMessage,
        sender_id: currentUserProfile?.id || null,
        is_read: false
      });

      if (error) throw error;

      showToast('¡Cotización enviada de manera exitosa! Te contactaremos.');
      
      // Reset forms
      setQuoteMessage('');
      setQuoteType('');
      if (!currentUserProfile) {
        setQName('');
        setQPhone('');
        setQEmail('');
      }

      setActiveTab('portfolio');
    } catch (err: any) {
      showToast('Error al enviar: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Form Submission: General Message
  const handleSubmitContact = async (e: FormEvent) => {
    e.preventDefault();
    if (!cName || !cEmail || !cMessage) {
      showToast('Por favor completa los campos requeridos (*).', 'error');
      return;
    }

    setLoading(true);
    setLoadingMsg('Registrando mensaje...');

    try {
      const { error } = await supabase.from('messages').insert({
        kind: 'Mensaje',
        name: cName,
        email: cEmail,
        phone: cPhone || null,
        subject: cSubject || 'Contacto Simple',
        message: cMessage,
        sender_id: currentUserProfile?.id || null,
        is_read: false
      });

      if (error) throw error;

      showToast('¡Mensaje enviado con éxito!.');
      
      // Reset forms
      setCMessage('');
      setCSubject('');
      if (!currentUserProfile) {
        setCName('');
        setCPhone('');
        setCEmail('');
      }
      setActiveTab('portfolio');
    } catch (err: any) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Save/Update Client Profile
  const handleSaveProfile = async () => {
    if (!currentUserProfile) return;
    if (!pName) {
      showToast('Tu nombre completo no puede quedar vacío.', 'error');
      return;
    }

    setLoading(true);
    setLoadingMsg('Actualizando datos de perfil...');

    try {
      // 1. Guardar en base de datos profiles
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: pName,
          phone: pPhone,
          bio: pBio
        })
        .eq('id', currentUserProfile.id);

      if (error) throw error;

      // Actualizar el objeto profile localmente
      currentUserProfile.full_name = pName;
      currentUserProfile.phone = pPhone;
      currentUserProfile.bio = pBio;

      showToast('Perfil actualizado correctamente.');
    } catch (err: any) {
      showToast('Error al guardar datos: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Avatar Image Upload
  const handleAvatarFileChange = async (file: File | undefined) => {
    if (!file || !currentUserProfile) return;
    setLoading(true);
    setLoadingMsg('Subiendo foto de perfil...');

    try {
      const ext = file.name.split('.').pop();
      const path = `${currentUserProfile.id}/avatar.${ext}`;

      // Clean upsert
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      if (upErr) throw upErr;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      const url = `${data.publicUrl}?t=${Date.now()}`;
      
      // Update profile
      const { error: matchErr } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', currentUserProfile.id);

      if (matchErr) throw matchErr;

      setPAvatar(url);
      currentUserProfile.avatar_url = url;
      showToast('Imagen de perfil actualizada.');
    } catch (err: any) {
      showToast('Error de subida: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Update password
  const handleSavePassword = async () => {
    if (!newPass) {
      showToast('Falta escribir la nueva contraseña.', 'error');
      return;
    }
    if (newPass !== confirmPass) {
      showToast('Las contraseñas escritas no coinciden.', 'error');
      return;
    }

    setLoading(true);
    setLoadingMsg('Actualizando contraseña de usuario...');

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPass
      });

      if (error) throw error;
      showToast('Tu contraseña se ha cambiado satisfactoriamente.');
      setNewPass('');
      setConfirmPass('');
    } catch (err: any) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter project lists
  const filteredProjects = filterCategory === 'Todos'
    ? projects
    : projects.filter(p => p.category === filterCategory);

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
        <div className="fixed inset-0 bg-[#000263]/25 backdrop-blur-[2px] flex items-center justify-center z-[9999]">
          <div className="bg-white px-8 py-6 rounded-2xl shadow-xl text-center flex flex-col items-center gap-4">
            <span className="w-9 h-9 border-4 border-gray-100 border-t-[#000263] rounded-full animate-spin"></span>
            <p className="text-xs text-gray-500 font-mono">{loadingMsg}</p>
          </div>
        </div>
      )}

      {/* DETALLES DEL PROYECTO (MODAL) */}
      {selectedProject && (
        <div className="fixed inset-0 bg-[#000263]/50 backdrop-blur-[4px] flex items-center justify-center z-[9999] p-4" onClick={(e) => {
          if (e.target === e.currentTarget) setSelectedProject(null);
        }}>
          <div className="bg-white max-w-2xl w-full rounded-2xl overflow-hidden shadow-2xl anim-up max-h-[90vh] flex flex-col">
            
            {/* Header del modal con portada */}
            <div className="h-56 bg-[#000263] relative flex-shrink-0 flex items-center justify-center overflow-hidden">
              {selectedProject.cover_url ? (
                <img src={selectedProject.cover_url} alt={selectedProject.title} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-12 h-12 text-white/30" />
              )}
              
              <button 
                onClick={() => setSelectedProject(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-[#0d1340] flex items-center justify-center shadow transition hover:scale-105"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="absolute top-4 left-4 bg-[#000263] text-[#d4af37] text-[8px] font-bold uppercase py-0.5 px-2.5 rounded-full border border-blue-950">
                {selectedProject.status}
              </div>
            </div>

            {/* Cuerpo del modal scrollable */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              <div>
                <span className="text-[10px] text-[#2040d0] font-black tracking-widest uppercase block mb-1">{selectedProject.category} &middot; {selectedProject.year || '2026'}</span>
                <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[#0d1340]">{selectedProject.title}</h2>
                <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1.5 font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-[#d4af37]" /> {selectedProject.location || 'Santo Domingo, Rep. Dom.'}
                </p>
              </div>

              <div className="w-12 h-1 bg-[#d4af37]"></div>

              <p className="text-xs text-gray-600 leading-relaxed font-sans">{selectedProject.description}</p>

              {/* Métricas e Info Adicional */}
              {(selectedProject.area_terreno || selectedProject.area_construida || selectedProject.niveles) && (
                <div className="grid grid-cols-3 gap-4 bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
                  {selectedProject.area_terreno && (
                    <div>
                      <p className="font-display font-black text-sm text-[#0d1340]">{selectedProject.area_terreno}m²</p>
                      <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold mt-1">Terreno</p>
                    </div>
                  )}
                  {selectedProject.area_construida && (
                    <div>
                      <p className="font-display font-black text-sm text-[#0d1340]">{selectedProject.area_construida}m²</p>
                      <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold mt-1">Construido</p>
                    </div>
                  )}
                  {selectedProject.niveles && (
                    <div>
                      <p className="font-display font-black text-sm text-[#0d1340]">{selectedProject.niveles}</p>
                      <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold mt-1">Niveles</p>
                    </div>
                  )}
                </div>
              )}

              {/* Colaboradores */}
              {selectedProject.colaboradores && (
                <p className="text-[11px] text-gray-500 font-sans leading-relaxed">
                  <strong className="text-[#0d1340]" style={{ color: '#000' }}>Profesionales Involucrados:</strong> {selectedProject.colaboradores}
                </p>
              )}

              {/* Galería Adicional */}
              {loadingImages ? (
                <p className="text-[10px] text-gray-400 text-center py-4 font-mono">Buscando fotos de archivo...</p>
              ) : projectImages.length > 1 ? (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Planos e Imágenes Adicionales</p>
                  <div className="grid grid-cols-3 gap-2">
                    {projectImages.slice(1).map((src, i) => (
                      <div key={i} className="aspect-[4/3] rounded-lg overflow-hidden bg-gray-50 border border-gray-100 shadow-sm">
                        <img src={src} alt="galería" className="w-full h-full object-cover hover:scale-105 transition duration-300" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Botón Acción Cotizar Proyecto */}
              <button 
                onClick={() => handlePrefillQuote(selectedProject.title, selectedProject.category)}
                className="w-full py-3 bg-[#000263] hover:bg-[#001aa0] text-white text-xs uppercase font-bold tracking-wider rounded-lg transition duration-200 mt-2 block "
              >
                Solicitar Cotización de este Proyecto
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
            <p className="text-[10px] uppercase font-bold tracking-widest text-[#7b8db0]">Portal Clientes</p>
          </div>

          {/* Nav */}
          <nav className="px-3 space-y-1">
            <button 
              onClick={() => setActiveTab('portfolio')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold tracking-wide uppercase transition ${
                activeTab === 'portfolio' ? 'bg-[#2040d0] text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-[#d4af37]" /> Portafolio
            </button>

            <button 
              onClick={() => setActiveTab('quote')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold tracking-wide uppercase transition ${
                activeTab === 'quote' ? 'bg-[#2040d0] text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4 text-[#d4af37]" /> Solicitar Cotización
            </button>

            <button 
              onClick={() => setActiveTab('contact')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold tracking-wide uppercase transition ${
                activeTab === 'contact' ? 'bg-[#2040d0] text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Mail className="w-4 h-4 text-[#d4af37]" /> Enviar Mensaje
            </button>

            {currentUserProfile && (
              <button 
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold tracking-wide uppercase transition ${
                  activeTab === 'profile' ? 'bg-[#2040d0] text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <UserCircle2 className="w-4 h-4 text-[#d4af37]" /> Mi Perfil
              </button>
            )}
          </nav>
        </div>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-white/5 space-y-3.5">
          <div className="px-3 py-1 text-xs text-gray-400 leading-tight">
            Hola, <span className="font-extrabold text-white text-sm block truncate mt-0.5">{currentUserProfile?.full_name || 'Visitante Explorador'}</span>
          </div>

          <button 
            onClick={onGoBackToLanding}
            className="w-full flex items-center justify-center gap-3 px-4 py-4.5 text-sm font-black tracking-widest uppercase bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 rounded-xl transition-all duration-200 shadow-md active:scale-[0.98]"
          >
            <ArrowLeft className="w-5 h-5 text-[#d4af37] stroke-[3.0]" /> Ir a Inicio
          </button>
          
          {currentUserProfile ? (
            <button 
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-3 px-4 py-4.5 text-sm font-black tracking-widest uppercase bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-900/40 hover:border-red-500/50 rounded-xl transition-all duration-200 shadow-md active:scale-[0.98]"
            >
              <LogOut className="w-5 h-5 stroke-[3.0]" /> Salir de Sesión
            </button>
          ) : (
            <button 
              onClick={onGoToLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-4.5 text-sm font-black tracking-widest uppercase bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 hover:border-emerald-500/50 rounded-xl transition-all duration-200 shadow-md active:scale-[0.98]"
            >
              <LogOut className="w-5 h-5 stroke-[3.0]" /> Iniciar Sesión / Crear Cuenta
            </button>
          )}
        </div>
      </aside>

      {/* CUERPO CENTRAL DE INFORMACIÓN */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* Header Superior del Portal de Clientes */}
        <header className="h-16 bg-white border-b border-[#dde3f7] flex items-center justify-between px-8 text-xs sticky top-0 z-40 flex-wrap sm:flex-nowrap gap-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide leading-none">{
              activeTab === 'portfolio' ? 'Portafolio de Proyectos' : 
              activeTab === 'quote' ? 'Solicitar Cotización de Obras' :
              activeTab === 'contact' ? 'Enviar Mensaje / Consulta Técnica' : 'Mi Perfil Personal'
            }</h3>
            <p className="text-[10px] text-gray-400 mt-1">Explora construcciones y coordina con ingenieros y arquitectos</p>
          </div>

          {/* Filtros de Categoría para el Portafolio */}
          {activeTab === 'portfolio' && (
            <div className="flex gap-1 bg-gray-100 border border-gray-200/50 rounded-lg p-0.5">
              {['Todos', 'Residencial', 'Comercial', 'Industrial'].map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition ${
                    filterCategory === cat ? 'bg-[#000263] text-white shadow-sm' : 'text-gray-500 hover:text-[#000263]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 select-none">
              {currentUserProfile?.avatar_url ? (
                <img src={currentUserProfile.avatar_url} alt="perfil" className="w-8 h-8 rounded-full object-cover border border-[#dde3f7]" />
              ) : (
                <div onClick={() => { if(currentUserProfile) setActiveTab('profile'); }} className="w-8 h-8 rounded-full bg-[#2040d0] text-white flex items-center justify-center font-bold text-xs pointer relative">
                  {(currentUserProfile?.full_name || 'CL').slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* CONTENEDOR DE LA PÁGINA ACTIVA */}
        <main className="flex-1 p-8 overflow-y-auto">
          
          {/* PORTAFOLIO */}
          {activeTab === 'portfolio' && (
            <div className="max-w-6xl mx-auto anim-up">
              {loadingProjects ? (
                <div className="py-24 text-center text-gray-400">
                  <span className="inline-block w-8 h-8 border-4 border-gray-100 border-t-[#000263] rounded-full animate-spin"></span>
                  <p className="text-xs mt-3 font-mono">Buscando obras en la base de datos de Frayers Solutions...</p>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 py-20 text-center text-gray-400">
                  <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-xs font-bold text-gray-600">No hay proyectos publicados para la categoría {filterCategory}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">El estudio está terminando nuevos bocetos y planos para publicar.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProjects.map((p) => (
                    <div 
                      key={p.id} 
                      onClick={() => handleOpenProjectDetails(p)}
                      className="bg-white rounded-xl border border-[#dde3f7] overflow-hidden flex flex-col hover:shadow-xl hover:-translate-y-1 transition duration-300 cursor-pointer group"
                    >
                      
                      {/* Portada */}
                      <div className="h-48 bg-gray-100 relative overflow-hidden flex items-center justify-center">
                        {p.cover_url ? (
                          <img src={p.cover_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                        ) : (
                          <Building2 className="w-10 h-10 text-gray-300" />
                        )}
                        <span className="absolute top-3 left-3 bg-[#000263] text-[#d4af37] py-0.5 px-2.5 rounded-full text-[8px] font-bold uppercase border border-blue-950">
                          {p.status}
                        </span>
                      </div>

                      {/* Info general */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <p className="text-[9px] text-[#2040d0] font-black tracking-wider uppercase mb-1">{p.category} &middot; {p.year}</p>
                          <h3 className="font-display font-bold text-sm text-[#0d1340] group-hover:text-[#2040d0] transition">{p.title}</h3>
                          <p className="text-[11.5px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">{p.description}</p>
                        </div>

                        <div className="border-t border-gray-100 pt-3.5 mt-4 flex items-center justify-between text-[10px] text-gray-400">
                          <div className="flex items-center gap-1 font-semibold truncate max-w-[130px]">
                            <MapPin className="w-3.5 h-3.5 text-[#d4af37] flex-shrink-0" />
                            <span className="truncate">{p.location || 'Santo Domingo'}</span>
                          </div>
                          
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrefillQuote(p.title, p.category);
                            }}
                            className="text-[#2040d0] hover:text-[#000263] font-bold inline-flex items-center gap-1"
                          >
                            Cotizar <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FORMULARIO COTIZACIÓN */}
          {activeTab === 'quote' && (
            <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-xl border border-[#dde3f7] anim-up shadow-sm">
              <div className="mb-6">
                <h2 className="font-display font-extrabold text-[#0d1340] text-xl uppercase">Solicitar Cotización Técnica</h2>
                <div className="w-10 h-0.5 bg-[#d4af37] my-2"></div>
                <p className="text-xs text-gray-500">Menciona las expectativas, materiales o dimensiones aproximadas para preparar tu estimado.</p>
              </div>

              <form onSubmit={handleSubmitQuote} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Nombre Completo *</label>
                    <input 
                      type="text" 
                      required
                      value={qName}
                      onChange={(e) => setQName(e.target.value)}
                      placeholder="Tu nombre para el contrato" 
                      className="w-full bg-white border border-gray-200 focus:border-[#2040d0] rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none transition"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Celular / WhatsApp</label>
                    <input 
                      type="tel" 
                      value={qPhone}
                      onChange={(e) => setQPhone(e.target.value)}
                      placeholder="+1 (809) 000-0000" 
                      className="w-full bg-white border border-gray-200 focus:border-[#2040d0] rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Correo Electrónico de Contacto *</label>
                  <input 
                    type="email" 
                    required
                    value={qEmail}
                    onChange={(e) => setQEmail(e.target.value)}
                    placeholder="correo@ejemplo.com" 
                    className="w-full bg-white border border-gray-200 focus:border-[#2040d0] rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Tipo de Obra / Proyecto</label>
                  <select 
                    value={quoteType}
                    onChange={(e) => setQuoteType(e.target.value)}
                    className="w-full bg-white border border-gray-200 focus:border-[#2040d0] rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none transition"
                  >
                    <option value="">Selecciona tipo de obra</option>
                    <option value="Residencial">Residencial (Casas, Torres)</option>
                    <option value="Comercial">Comercial (Plazas, Oficinas)</option>
                    <option value="Industrial">Industrial (Naves, Cubiertas)</option>
                    <option value="Paisajismo">Paisajismo & Áreas verdes</option>
                    <option value="Interiores">Diseño de Interiores</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Descripción Detallada, Dimensiones y Requisitos *</label>
                  <textarea 
                    required
                    rows={6}
                    value={quoteMessage}
                    onChange={(e) => setQuoteMessage(e.target.value)}
                    placeholder="Ej. Deseo cotizar una estructura de nave industrial de 500m² con perfiles W, cubierta de lámina Aluzinc calibres 24..." 
                    className="w-full bg-white border border-gray-200 focus:border-[#2040d0] rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none transition resize-none"
                  />
                </div>

                <div className="text-right">
                  <button 
                    type="submit" 
                    className="px-6 py-2.5 bg-[#000263] hover:bg-[#001aa0] hover:shadow-md text-white text-xs uppercase font-bold tracking-wider rounded-lg transition duration-200"
                  >
                    Enviar Requerimiento Cotización
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* FORMULARIO MENSAJE */}
          {activeTab === 'contact' && (
            <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-xl border border-[#dde3f7] anim-up shadow-sm">
              <div className="mb-6">
                <h2 className="font-display font-extrabold text-[#0d1340] text-xl uppercase">Enviar Consulta Técnica</h2>
                <div className="w-10 h-0.5 bg-[#d4af37] my-2"></div>
                <p className="text-xs text-gray-500">¿Tienes dudas estructurales o de tramitación de planos? Envíanos tus interrogantes.</p>
              </div>

              <form onSubmit={handleSubmitContact} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Nombre Completo *</label>
                    <input 
                      type="text" 
                      required
                      value={cName}
                      onChange={(e) => setCName(e.target.value)}
                      placeholder="Tu nombre completo" 
                      className="w-full bg-white border border-gray-200 focus:border-[#2040d0] rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Celular / Teléfono</label>
                    <input 
                      type="tel" 
                      value={cPhone}
                      onChange={(e) => setCPhone(e.target.value)}
                      placeholder="+1 (809) 000-0000" 
                      className="w-full bg-white border border-gray-200 focus:border-[#2040d0] rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Email *</label>
                  <input 
                    type="email" 
                    required
                    value={cEmail}
                    onChange={(e) => setCEmail(e.target.value)}
                    placeholder="correo@ejemplo.com" 
                    className="w-full bg-white border border-gray-200 focus:border-[#2040d0] rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Asunto / Motivo</label>
                  <input 
                    type="text" 
                    value={cSubject}
                    onChange={(e) => setCSubject(e.target.value)}
                    placeholder="Ej. Revisión y firma de plano de carga" 
                    className="w-full bg-white border border-gray-200 focus:border-[#2040d0] rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Mensaje o Pregunta *</label>
                  <textarea 
                    required
                    rows={5}
                    value={cMessage}
                    onChange={(e) => setCMessage(e.target.value)}
                    placeholder="Redacta detalladamente tu pregunta aquí..." 
                    className="w-full bg-white border border-gray-200 focus:border-[#2040d0] rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none transition resize-none"
                  />
                </div>

                <div className="text-right">
                  <button 
                    type="submit" 
                    className="px-6 py-2.5 bg-[#000263] hover:bg-[#001aa0] hover:shadow-md text-white text-xs uppercase font-bold tracking-wider rounded-lg transition duration-200"
                  >
                    Enviar Mensaje Directo
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* PERFIL */}
          {activeTab === 'profile' && currentUserProfile && (
            <div className="max-w-2xl mx-auto space-y-6 anim-up">
              
              {/* Información Personal */}
              <div className="bg-white p-6 rounded-xl border border-[#dde3f7] shadow-sm">
                <h3 className="text-[10px] uppercase font-bold tracking-widest text-gray-400 border-b border-gray-100 pb-2 mb-4">Mis Datos y Avatar</h3>
                
                <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
                  
                  {/* Foto de Perfil */}
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full border-2 border-[#dde3f7] bg-gray-50 overflow-hidden relative flex items-center justify-center group cursor-pointer shadow">
                      {pAvatar ? (
                        <img src={pAvatar} alt="perfil" className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle2 className="w-10 h-10 text-gray-300" />
                      )}
                      
                      <div className="absolute inset-0 bg-[#000263]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200">
                        <Camera className="w-5 h-5 text-white" />
                      </div>
                      
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => handleAvatarFileChange(e.target.files?.[0])}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 hover:text-[#2040d0] block mt-1 hover:underline cursor-pointer">Cambiar Foto</span>
                  </div>

                  {/* Campos */}
                  <div className="flex-1 w-full space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Nombre Completo</label>
                      <input 
                        type="text" 
                        value={pName}
                        onChange={(e) => setPName(e.target.value)}
                        placeholder="Tu nombre para las solicitudes" 
                        className="w-full bg-white border border-gray-200 focus:border-[#2040d0] rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none transition"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Teléfono / Celular</label>
                      <input 
                        type="tel" 
                        value={pPhone}
                        onChange={(e) => setPPhone(e.target.value)}
                        placeholder="+1 (809) 000-0000" 
                        className="w-full bg-white border border-gray-200 focus:border-[#2040d0] rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Breve Biografía / Notas de Obra</label>
                    <textarea 
                      rows={3}
                      value={pBio}
                      onChange={(e) => setPBio(e.target.value)}
                      placeholder="Agrega comentarios sobre tu corporativo o requisitos usuales..." 
                      className="w-full bg-white border border-gray-200 focus:border-[#2040d0] rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none transition resize-none"
                    />
                  </div>

                  <div className="text-right">
                    <button 
                      onClick={handleSaveProfile}
                      className="px-5 py-2.5 bg-[#000263] hover:bg-[#001aa0] hover:shadow-md text-white text-xs uppercase font-bold tracking-wider rounded-lg transition inline-flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" /> Guardar Perfil
                    </button>
                  </div>
                </div>

              </div>

              {/* Seguridad */}
              <div className="bg-white p-6 rounded-xl border border-[#dde3f7] shadow-sm">
                <h3 className="text-[10px] uppercase font-bold tracking-widest text-gray-400 border-b border-gray-100 pb-2 mb-4">Actualizar Password de Acceso</h3>
                
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
                      placeholder="Confirma la contraseña escrita arriba" 
                      className="w-full bg-white border border-gray-200 focus:border-[#2040d0] rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none transition"
                    />
                  </div>
                  
                  <div className="text-right">
                    <button 
                      onClick={handleSavePassword}
                      className="px-5 py-2.5 bg-[#000263] hover:bg-[#001aa0] hover:shadow-md text-white text-xs uppercase font-bold tracking-wider rounded-lg transition inline-flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" /> Actualizar Contraseña
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
}
