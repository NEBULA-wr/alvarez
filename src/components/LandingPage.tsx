import { useEffect, useRef, useState, FormEvent } from 'react';
import { 
  Phone, Mail, MapPin, Menu, X, ArrowRight, Image as ImageIcon, 
  Award, ShieldCheck, Leaf, Users, Target, Eye, Gem, Check, 
  Building2, Pencil, Compass, Wrench, ClipboardList, Building, 
  Sun, HardHat, Truck, Briefcase, Maximize2, CheckCircle2, Clock, 
  Facebook, Instagram, Linkedin, MessageCircle, LogIn, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Project } from '../types';

interface LandingPageProps {
  onGoToLogin: () => void;
  onGoToClientPortal: () => void;
}

export default function LandingPage({ onGoToLogin, onGoToClientPortal }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  
  // Lightbox State
  const [lightboxActive, setLightboxActive] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Form States
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch featured projects from Supabase
  useEffect(() => {
    async function fetchProjects() {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('is_draft', false)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!error && data) {
          setProjects(data);
        }
      } catch (err) {
        console.error('Error fetching featured projects:', err);
      } finally {
        setLoadingProjects(false);
      }
    }
    fetchProjects();
  }, []);

  // Animación de Partículas Canvas (Efecto Hero)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Array<{
      x: number;
      y: number;
      r: number;
      vx: number;
      vy: number;
      alpha: number;
      gold: boolean;
      reset: () => void;
      update: () => void;
    }> = [];

    const resize = () => {
      canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.offsetHeight || window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    class Particle {
      x!: number;
      y!: number;
      r!: number;
      vx!: number;
      vy!: number;
      alpha!: number;
      gold!: boolean;

      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * (canvas?.width || window.innerWidth);
        this.y = Math.random() * (canvas?.height || window.innerHeight);
        this.r = Math.random() * 2 + 0.5;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.alpha = Math.random() * 0.5 + 0.1;
        this.gold = Math.random() > 0.75;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (canvas && (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height)) {
          this.reset();
        }
      }
    }

    const COUNT = 60;
    for (let i = 0; i < COUNT; i++) {
      particles.push(new Particle() as any);
    }

    const drawConnections = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(212,175,55,${0.08 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawConnections();
      particles.forEach(p => {
        p.update();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.gold
          ? `rgba(212,175,55,${p.alpha})`
          : `rgba(255,255,255,${p.alpha})`;
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Form Submission
  const handleContactSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactEmail || !contactMessage) {
      setSubmitError('Por favor completa todos los campos requeridos (*).');
      return;
    }

    setSendingMessage(true);
    setSubmitError('');
    setSubmitSuccess(false);

    try {
      const { error } = await supabase.from('messages').insert({
        kind: 'Mensaje',
        name: contactName,
        email: contactEmail,
        phone: contactPhone || null,
        subject: contactSubject || 'Consulta desde Landing Page',
        message: contactMessage,
        is_read: false
      });

      if (error) throw error;

      setSubmitSuccess(true);
      setContactName('');
      setContactPhone('');
      setContactEmail('');
      setContactSubject('');
      setContactMessage('');
    } catch (err: any) {
      console.error('Error sending message:', err);
      setSubmitError('Hubo un error al enviar tu mensaje: ' + err.message);
    } finally {
      setSendingMessage(false);
    }
  };

  // Lightbox Navigation
  const handleLightboxPrev = () => {
    if (projects.length === 0) return;
    setLightboxIndex((prev) => (prev - 1 + projects.length) % projects.length);
  };

  const handleLightboxNext = () => {
    if (projects.length === 0) return;
    setLightboxIndex((prev) => (prev + 1) % projects.length);
  };

  return (
    <div className="text-gray-800 bg-[#f5f5f0] min-h-screen selection:bg-[#d4af37] selection:text-white" id="inicio">
      
      {/* ===================== TOP BAR ===================== */}
      <div className="hidden lg:block bg-white border-b border-gray-200 py-2">
        <div className="container mx-auto px-6 flex justify-between items-center text-xs">
          <div className="flex gap-6">
            <a href="tel:+18099651012" className="flex items-center gap-2 text-gray-600 hover:text-[#001f3f] transition">
              <Phone className="w-3.5 h-3.5 text-[#d4af37]" /> +1 (809) 965-1012
            </a>
            <a href="mailto:frayerssolutions@gmail.com" className="flex items-center gap-2 text-gray-600 hover:text-[#001f3f] transition">
              <Mail className="w-3.5 h-3.5 text-[#d4af37]" /> frayerssolutions@gmail.com
            </a>
            <span className="flex items-center gap-2 text-gray-600">
              <MapPin className="w-3.5 h-3.5 text-[#d4af37]" /> Santo Domingo Este, Rep. Dom.
            </span>
          </div>
          <button 
            onClick={onGoToClientPortal}
            className="bg-[#d4af37] hover:bg-[#b8952e] hover:shadow-md text-white px-5 py-1.5 rounded font-display font-bold tracking-wider uppercase transition scale-95"
          >
            PORTAL CLIENTES
          </button>
        </div>
      </div>

      {/* ===================== NAVIGATION ===================== */}
      <nav className="sticky top-0 z-50 bg-[#001f3f]">
        <div className="container mx-auto px-6 py-3.5 flex justify-between items-center">
          <a href="#inicio" className="flex items-center gap-3">
            {!logoError ? (
              <img 
                src="/logo.png" 
                alt="Frayers Solutions" 
                className="h-9 w-auto object-contain" 
                onError={() => setLogoError(true)} 
              />
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded bg-[#d4af37] flex items-center justify-center text-white font-serif font-black text-xl">F</div>
                <div>
                  <div className="font-display font-bold text-white text-base leading-none">Frayers</div>
                  <div className="font-display font-medium text-gray-400 text-xs tracking-wider">Solutions</div>
                </div>
              </div>
            )}
          </a>

          {/* Desktop Menu */}
          <ul className="hidden lg:flex items-center gap-8 text-xs font-semibold tracking-wider uppercase">
            <li><a href="#inicio" className="text-white hover:text-[#d4af37] transition">Inicio</a></li>
            <li><a href="#nosotros" className="text-white hover:text-[#d4af37] transition">Nosotros</a></li>
            <li><a href="#servicios" className="text-white hover:text-[#d4af37] transition">Servicios</a></li>
            <li><a href="#proyectos" className="text-white hover:text-[#d4af37] transition">Proyectos</a></li>
            <li><a href="#contacto" className="text-white hover:text-[#d4af37] transition">Contacto</a></li>
            <li className="h-4 w-px bg-blue-900 mx-1"></li>
            <li>
              <button 
                onClick={onGoToLogin}
                className="flex items-center gap-1.5 text-white hover:text-[#d4af37] bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded transition text-[11px]"
              >
                <LogIn className="w-3.5 h-3.5 text-[#d4af37]" /> Iniciar Sesión / Regístrate
              </button>
            </li>
          </ul>

          <button 
            className="lg:hidden text-white text-2xl" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menú móvil"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#001f3f] border-t border-blue-900/40 py-5 px-6 anim-up">
            <ul className="flex flex-col gap-4 font-display font-bold uppercase text-xs tracking-wider text-white">
              <li><a href="#inicio" onClick={() => setMobileMenuOpen(false)} className="block py-1">Inicio</a></li>
              <li><a href="#nosotros" onClick={() => setMobileMenuOpen(false)} className="block py-1">Nosotros</a></li>
              <li><a href="#servicios" onClick={() => setMobileMenuOpen(false)} className="block py-1">Servicios</a></li>
              <li><a href="#proyectos" onClick={() => setMobileMenuOpen(false)} className="block py-1">Proyectos</a></li>
              <li><a href="#contacto" onClick={() => setMobileMenuOpen(false)} className="block py-1">Contacto</a></li>
              <li className="h-px bg-blue-900/50 my-2"></li>
              <li>
                <button 
                  onClick={() => { setMobileMenuOpen(false); onGoToLogin(); }}
                  className="w-full flex items-center justify-center gap-2 bg-[#d4af37] py-2.5 rounded text-white font-bold"
                >
                  <LogIn className="w-4 h-4" /> Acceso Interno y Clientes
                </button>
              </li>
            </ul>
          </div>
        )}
      </nav>

      {/* ===================== HERO SECTION ===================== */}
      <header className="relative h-[90vh] min-h-[550px] overflow-hidden flex items-center bg-[#000a1f] text-white">
        
        {/* Poster de fondo fallback */}
        <div 
          className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-10 z-0" 
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1920&q=80')` }}
        />

        {/* Video de fondo de YouTube */}
        <div className="absolute inset-0 w-full h-full overflow-hidden z-0 pointer-events-none select-none">
          <iframe
            src="https://www.youtube.com/embed/TPyXCFmG2Ws?autoplay=1&mute=1&playlist=TPyXCFmG2Ws&loop=1&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&disablekb=1&fs=0&playsinline=1&enablejsapi=1"
            className="absolute top-1/2 left-1/2 w-[220%] h-[220%] md:w-[150%] md:h-[150%] -translate-x-1/2 -translate-y-1/2 opacity-75 pointer-events-none select-none"
            allow="autoplay; encrypted-media"
            style={{ border: 'none', pointerEvents: 'none' }}
            tabIndex={-1}
            title="Video corporativo de fondo"
          />
          {/* Capa invisible absoluta para absorber cualquier evento táctil o de mouse residual */}
          <div className="absolute inset-0 bg-transparent pointer-events-auto z-10" />
        </div>

        {/* Overlay degradado elegante */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#000f28cc] via-[#001f3fa1] to-[#010a1acc] z-10" />

        {/* Canvas de Partículas doradas */}
        <canvas ref={canvasRef} id="particles-canvas" className="absolute inset-0 z-20 pointer-events-none" />

        {/* Contenido principal */}
        <div className="container mx-auto px-6 relative z-30 w-full">
          <div className="max-w-2xl anim-up">
            
            <div className="flex items-center gap-3 mb-5">
              <span className="w-8 h-[2px] bg-[#d4af37]"></span>
              <p className="text-[#d4af37] font-display font-bold text-xs uppercase tracking-widest leading-none">FRAYERS SOLUTIONS INGENIERÍA</p>
            </div>

            <h1 className="font-display font-extrabold italic text-4xl sm:text-5xl md:text-6xl text-white uppercase tracking-tight leading-none mb-2">
              Tú lo sueñas,
            </h1>
            <h1 className="font-display font-black italic text-4xl sm:text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-[#d4af37] via-[#f5e07a] to-[#d4af37] uppercase tracking-tight leading-none mb-6">
              Nosotros lo construimos
            </h1>

            <div className="w-[100px] h-[3.5px] bg-[#d4af37] mb-6"></div>

            <p className="text-gray-300 text-sm sm:text-base md:text-lg mb-8 leading-relaxed max-w-lg">
              Soluciones integrales de ingeniería y arquitectura orientadas a la innovación técnica, la gestión eficiente y el aseguramiento de la calidad.
            </p>

            <div className="flex flex-wrap gap-4">
              <a 
                href="#nosotros" 
                className="bg-[#d4af37] hover:bg-[#b8952e] hover:shadow-lg text-white font-display font-extrabold text-[11px] sm:text-xs uppercase tracking-widest px-8 py-3.5 rounded-full inline-flex items-center gap-2 transition duration-300"
              >
                Conoce Más <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <a 
                href="#proyectos" 
                className="hover:bg-white hover:text-[#001f3f] border-2 border-white/50 text-white font-display font-bold text-[11px] sm:text-xs uppercase tracking-widest px-8 py-3.5 rounded-full inline-flex items-center gap-2 transition duration-300"
              >
                <ImageIcon className="w-3.5 h-3.5" /> Ver Proyectos
              </a>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1.5 text-center opacity-60">
          <div className="w-5 h-8 border border-white/40 rounded-full relative">
            <span className="w-1 h-2 bg-[#d4af37] rounded-full absolute top-1.5 left-1/2 -translate-x-1/2 animate-bounce"></span>
          </div>
          <span className="text-[10px] tracking-widest uppercase font-semibold text-white/50">Scroll</span>
        </div>
      </header>

      {/* ===================== BADGES ===================== */}
      <div className="bg-[#001f3f] py-8 border-t border-blue-900/30">
        <div className="container mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-white">
          <div className="p-4 flex flex-col items-center hover:-translate-y-1 transition duration-300">
            <Award className="w-8 h-8 text-[#d4af37] mb-3" />
            <h4 className="font-display font-bold text-xs uppercase tracking-wider">Calidad Garantizada</h4>
          </div>
          <div className="p-4 flex flex-col items-center hover:-translate-y-1 transition duration-300">
            <ShieldCheck className="w-8 h-8 text-[#d4af37] mb-3" />
            <h4 className="font-display font-bold text-xs uppercase tracking-wider">Seguridad Total</h4>
          </div>
          <div className="p-4 flex flex-col items-center hover:-translate-y-1 transition duration-300">
            <Leaf className="w-8 h-8 text-[#d4af37] mb-3" />
            <h4 className="font-display font-bold text-xs uppercase tracking-wider">Sostenibilidad</h4>
          </div>
          <div className="p-4 flex flex-col items-center hover:-translate-y-1 transition duration-300">
            <Users className="w-8 h-8 text-[#d4af37] mb-3" />
            <h4 className="font-display font-bold text-xs uppercase tracking-wider">Integridad Ética</h4>
          </div>
        </div>
      </div>

      {/* ===================== ABOUT SECTION ===================== */}
      <section id="nosotros" className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-4">
              <h2 className="font-display font-extrabold text-2xl sm:text-3xl uppercase text-[#001f3f] mb-2">
                ¿Quiénes Somos?
              </h2>
              <div className="w-14 h-1 bg-[#d4af37] mb-6"></div>
              <p className="text-gray-600 text-sm mb-5 leading-relaxed">
                Frayers Solutions Ingeniería y Arquitectura es una prestigiosa firma de ingeniería dedicada a la planificación, diseño de planos, ejecución y fiscalización de proyectos civiles e industriales. Ofrecemos respuestas inteligentes que equilibran creatividad con rigor constructivo.
              </p>
              <p className="text-gray-600 text-sm mb-8 leading-relaxed">
                Nos caracterizamos por un enfoque multidisciplinario, guiado por profesionales con amplia experiencia y equipados con herramientas de última generación técnica.
              </p>
              <a 
                href="#contacto" 
                className="bg-[#001f3f] hover:bg-[#002d5c] hover:shadow-lg text-white font-display font-bold text-xs tracking-wider uppercase px-6 py-3 rounded inline-flex items-center gap-1.5 transition duration-300"
              >
                Contáctanos <ArrowRight className="w-4 h-4 text-[#d4af37]" />
              </a>
            </div>

            <div className="lg:col-span-8 grid md:grid-cols-3 gap-0 shadow-lg rounded-xl overflow-hidden">
              <div className="bg-[#001f3f] p-8 text-white text-center flex flex-col justify-center min-h-[220px]">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4 border border-white/15">
                  <Target className="w-5 h-5 text-[#d4af37]" />
                </div>
                <h3 className="font-display font-bold mb-3 text-lg uppercase tracking-wide">Misión</h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Entregar soluciones constructivas que unan arquitectura y viabilidad técnica, garantizando el bienestar de los usuarios y el rendimiento de la inversión.
                </p>
              </div>

              <div className="bg-[#d4af37] p-8 text-white text-center flex flex-col justify-center min-h-[220px]">
                <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-4 border border-white/20">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-display font-bold mb-3 text-lg uppercase tracking-wide">Visión</h3>
                <p className="text-xs text-amber-50 leading-relaxed">
                  Consolidarnos como el estudio líder en innovación estructural en la República Dominicana, expandiendo nuestra influencia en el panorama regional.
                </p>
              </div>

              <div className="bg-white p-8 text-[#001f3f] text-center border-t-4 border-[#001f3f] md:border-t-0 flex flex-col justify-center min-h-[220px]">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4 border border-blue-100">
                  <Gem className="w-5 h-5 text-[#001f3f]" />
                </div>
                <h3 className="font-display font-bold mb-3 text-lg uppercase tracking-wide">Valores</h3>
                <ul className="text-xs font-semibold text-left inline-block mx-auto space-y-1.5 text-gray-700">
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#d4af37]" /> Calidad absoluta</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#d4af37]" /> Compromiso ético</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#d4af37]" /> Innovación real</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#d4af37]" /> Seguridad en obra</li>
                </ul>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ===================== SERVICES SECTION ===================== */}
      <section id="servicios" className="bg-white py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="font-display font-black text-2xl sm:text-3xl uppercase text-[#001f3f] mb-2">
              Servicios que Ofrecemos
            </h2>
            <div className="w-14 h-1 bg-[#d4af37] mx-auto mb-4"></div>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              Brindamos acompañamiento del más alto nivel técnico y profesional en cada fase del desarrollo.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-100 text-center hover:shadow-md transition duration-300">
              <Building2 className="w-7 h-7 text-[#d4af37] mx-auto mb-3" />
              <h3 className="font-display font-bold text-xs uppercase tracking-wide text-[#001f3f] leading-snug">Construcción y Desarrollo</h3>
            </div>
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-100 text-center hover:shadow-md transition duration-300">
              <Pencil className="w-7 h-7 text-[#d4af37] mx-auto mb-3" />
              <h3 className="font-display font-bold text-xs uppercase tracking-wide text-[#001f3f] leading-snug">Diseño Arquitectónico</h3>
            </div>
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-100 text-center hover:shadow-md transition duration-300">
              <Compass className="w-7 h-7 text-[#d4af37] mx-auto mb-3" />
              <h3 className="font-display font-bold text-xs uppercase tracking-wide text-[#001f3f] leading-snug">Ingeniería Civil</h3>
            </div>
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-100 text-center hover:shadow-md transition duration-300">
              <Wrench className="w-7 h-7 text-[#d4af37] mx-auto mb-3" />
              <h3 className="font-display font-bold text-xs uppercase tracking-wide text-[#001f3f] leading-snug">Remodelaciones</h3>
            </div>
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-100 text-center hover:shadow-md transition duration-300">
              <ClipboardList className="w-7 h-7 text-[#d4af37] mx-auto mb-3" />
              <h3 className="font-display font-bold text-xs uppercase tracking-wide text-[#001f3f] leading-snug">Gestión de Proyectos</h3>
            </div>
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-100 text-center hover:shadow-md transition duration-300">
              <Building className="w-7 h-7 text-[#d4af37] mx-auto mb-3" />
              <h3 className="font-display font-bold text-xs uppercase tracking-wide text-[#001f3f] leading-snug">Infraestructura Urbana</h3>
            </div>
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-100 text-center hover:shadow-md transition duration-300">
              <Sun className="w-7 h-7 text-[#d4af37] mx-auto mb-3" />
              <h3 className="font-display font-bold text-xs uppercase tracking-wide text-[#001f3f] leading-snug">Energía Sostenible</h3>
            </div>
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-100 text-center hover:shadow-md transition duration-300">
              <HardHat className="w-7 h-7 text-[#d4af37] mx-auto mb-3" />
              <h3 className="font-display font-bold text-xs uppercase tracking-wide text-[#001f3f] leading-snug">Obras Especializadas</h3>
            </div>
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-100 text-center hover:shadow-md transition duration-300">
              <Truck className="w-7 h-7 text-[#d4af37] mx-auto mb-3" />
              <h3 className="font-display font-bold text-xs uppercase tracking-wide text-[#001f3f] leading-snug">Venta de Materiales</h3>
            </div>
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-100 text-center hover:shadow-md transition duration-300">
              <Briefcase className="w-7 h-7 text-[#d4af37] mx-auto mb-3" />
              <h3 className="font-display font-bold text-xs uppercase tracking-wide text-[#001f3f] leading-snug">Consultoría Técnica</h3>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== PROJECTS SECTION ===================== */}
      {(loadingProjects || projects.length > 0) && (
        <section id="proyectos" className="py-20 bg-[#001f3f] text-white">
          <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon className="w-5 h-5 text-[#d4af37]" />
                  <h2 className="font-display font-black text-2xl uppercase tracking-wide leading-none">
                    Proyectos Destacados
                  </h2>
                </div>
                <div className="w-12 h-1 bg-[#d4af37]"></div>
              </div>
              <button 
                onClick={onGoToClientPortal}
                className="bg-[#d4af37] hover:bg-[#b8952e] text-white px-6 py-2.5 rounded font-display font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1.5 transition duration-300"
              >
                Ver Todos los Proyectos <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {loadingProjects ? (
                <div className="col-span-full py-16 text-center text-gray-400">
                  <span className="inline-block w-6 h-6 border-2 border-white/20 border-t-[#d4af37] rounded-full animate-spin"></span>
                  <p className="text-xs mt-2 font-mono">Consultando base de datos Supabase...</p>
                </div>
              ) : (
                projects.map((p, idx) => (
                  <div 
                    key={p.id} 
                    className="group relative overflow-hidden rounded-lg h-[260px] cursor-pointer shadow-lg border border-blue-900/40"
                    onClick={() => {
                      setLightboxIndex(idx);
                      setLightboxActive(true);
                    }}
                  >
                    <img 
                      src={p.cover_url || 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80'} 
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-500" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent group-hover:from-[#001f3fdc] transition duration-300" />
                    <div className="absolute inset-0 flex flex-col justify-end p-4">
                      <div className="w-8 h-8 rounded-full bg-[#d4af37] text-white flex items-center justify-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 transition duration-300">
                        <Maximize2 className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] text-[#d4af37] font-bold uppercase tracking-wider mb-1">{p.category}</span>
                      <h4 className="font-display font-bold text-xs uppercase text-white leading-tight">{p.title}</h4>
                      <p className="text-[10px] text-gray-400 mt-1">Ver detalles</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* ===================== WHY US + STATS ===================== */}
      <section className="py-20 bg-teal-800 text-white border-t border-teal-900/30">
        <div className="container mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-3 gap-12">
          
          <div>
            <h3 className="font-display font-black text-xl uppercase mb-6 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#d4af37]" /> ¿Por Qué Elegirnos?
            </h3>
            <ul className="space-y-4 text-xs leading-relaxed text-teal-100">
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 bg-[#d4af37] rounded-full mt-1.5 flex-shrink-0"></span>
                <span>Más de 10 años de experiencia técnica comprobada en construcciones exigentes.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 bg-[#d4af37] rounded-full mt-1.5 flex-shrink-0"></span>
                <span>Equipo técnico multidisciplinar certificado nacional e internacionalmente.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 bg-[#d4af37] rounded-full mt-1.5 flex-shrink-0"></span>
                <span>Estricta observancia del presupuesto establecido, evitando sobrecostos.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 bg-[#d4af37] rounded-full mt-1.5 flex-shrink-0"></span>
                <span>Garantía de cumplimiento estricto con los reglamentos de construcción (MOPC).</span>
              </li>
            </ul>
            <a 
              href="#contacto" 
              className="mt-8 bg-[#d4af37] hover:bg-[#b8952e] text-white px-5 py-3 rounded font-display font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1.5 transition duration-300"
            >
              Solicitar Cotización <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <div>
            <h3 className="font-display font-black text-xl uppercase mb-6">Nuestra Experiencia</h3>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-teal-900/40 p-4 rounded-lg border border-teal-700/50 flex flex-col justify-center">
                <span className="font-display font-black text-2xl sm:text-3xl text-[#d4af37]">10+</span>
                <p className="text-[10px] uppercase font-bold mt-1 tracking-wider text-teal-200">Años de Trayectoria</p>
              </div>
              <div className="bg-teal-900/40 p-4 rounded-lg border border-teal-700/50 flex flex-col justify-center">
                <span className="font-display font-black text-2xl sm:text-3xl text-[#d4af37]">150+</span>
                <p className="text-[10px] uppercase font-bold mt-1 tracking-wider text-teal-200">Obras Ejecutadas</p>
              </div>
              <div className="bg-teal-900/40 p-4 rounded-lg border border-teal-700/50 flex flex-col justify-center">
                <span className="font-display font-black text-2xl sm:text-3xl text-[#d4af37]">80+</span>
                <p className="text-[10px] uppercase font-bold mt-1 tracking-wider text-teal-200">Clientes Satisfechos</p>
              </div>
              <div className="bg-teal-900/40 p-4 rounded-lg border border-teal-700/50 flex flex-col justify-center">
                <span className="font-display font-black text-2xl sm:text-3xl text-[#d4af37]">25+</span>
                <p className="text-[10px] uppercase font-bold mt-1 tracking-wider text-teal-200">Ingenieros & Colaboradores</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-display font-black text-xl uppercase mb-6">Proceso de Trabajo</h3>
            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white text-teal-800 flex items-center justify-center font-display font-black text-sm shadow-md flex-shrink-0">1</div>
                <div>
                  <strong className="block text-white">Consulta Inicial</strong>
                  <span className="text-teal-200 text-[11px] leading-tight block">Definición de requerimientos del cliente.</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white text-teal-800 flex items-center justify-center font-display font-black text-sm shadow-md flex-shrink-0">2</div>
                <div>
                  <strong className="block text-white">Planificación</strong>
                  <span className="text-teal-200 text-[11px] leading-tight block">Diseño técnico estructural y presupuesto cerrado.</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white text-teal-800 flex items-center justify-center font-display font-black text-sm shadow-md flex-shrink-0">3</div>
                <div>
                  <strong className="block text-white">Ejecución</strong>
                  <span className="text-teal-200 text-[11px] leading-tight block">Construcción bajo rigurosa supervisión técnica.</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white text-teal-800 flex items-center justify-center font-display font-black text-sm shadow-md flex-shrink-0">4</div>
                <div>
                  <strong className="block text-white">Entrega Final</strong>
                  <span className="text-teal-200 text-[11px] leading-tight block">Inauguración con garantías del estudio.</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ===================== FOOTER / CONTACTO ===================== */}
      <footer id="contacto" className="bg-[#001f3f] text-white pt-16 pb-8">
        <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              {!logoError ? (
                <img 
                  src="/logo.png" 
                  alt="Frayers Solutions" 
                  className="h-10 w-auto object-contain bg-white/5 p-1 rounded" 
                  onError={() => setLogoError(true)} 
                />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded bg-[#d4af37] flex items-center justify-center text-white font-serif font-black text-xl">F</div>
                  <div>
                    <dt className="font-display font-bold text-white text-sm leading-none">Frayers Solutions</dt>
                    <dd className="font-display font-medium text-gray-400 text-[10px] tracking-wider mt-0.5">Ingeniería y Arquitectura</dd>
                  </div>
                </div>
              )}
            </div>
            <p className="text-gray-400 mb-6 italic text-xs leading-relaxed">
              &ldquo;Tú lo sueñas, nosotros lo construimos.&rdquo;
            </p>
            <div className="flex gap-3 text-sm">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 hover:text-[#d4af37] flex items-center justify-center transition border border-white/10">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 hover:text-[#d4af37] flex items-center justify-center transition border border-white/10">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 hover:text-[#d4af37] flex items-center justify-center transition border border-white/10">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="https://wa.me/18099651012" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/5 hover:bg-[#25D366]/20 hover:text-[#25D366] flex items-center justify-center transition border border-white/10">
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-[#d4af37] font-display font-bold mb-5 uppercase text-xs tracking-wider">Enlaces Rápidos</h4>
            <ul className="space-y-2 text-gray-400 text-xs">
              <li><a href="#inicio" className="hover:text-white transition">Inicio</a></li>
              <li><a href="#nosotros" className="hover:text-white transition">Nosotros</a></li>
              <li><a href="#servicios" className="hover:text-white transition">Servicios</a></li>
              <li><a href="#proyectos" className="hover:text-white transition">Proyectos</a></li>
              <li><button onClick={onGoToLogin} className="hover:text-white text-left transition">Panel Interno</button></li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-[#d4af37] font-display font-bold mb-5 uppercase text-xs tracking-wider">Servicios clave</h4>
            <ul className="space-y-2 text-gray-400 text-xs">
              <li>Construcción y Desarrollo</li>
              <li>Diseño de Planos y Estructuras</li>
              <li>Supervisión de Obras Civiles</li>
              <li>Remodelaciones de Interiores</li>
              <li>Consultoría e Ingeniería Vial</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-[#d4af37] font-display font-bold mb-5 uppercase text-xs tracking-wider">Contacto Directo</h4>
            <ul className="space-y-3.5 text-xs text-gray-300">
              <li className="flex gap-2.5">
                <MapPin className="w-4 h-4 text-[#d4af37] flex-shrink-0 mt-0.5" />
                <span className="leading-normal text-gray-400">Calle Segunda, No. 6, Los Frailes, Santo Domingo Este, Rep. Dom.</span>
              </li>
              <li className="flex gap-2.5">
                <Phone className="w-4 h-4 text-[#d4af37] flex-shrink-0" />
                <a href="tel:+18099651012" className="hover:text-white transition text-gray-400">+1 (809) 965-1012</a>
              </li>
              <li className="flex gap-2.5">
                <Mail className="w-4 h-4 text-[#d4af37] flex-shrink-0" />
                <a href="mailto:frayerssolutions@gmail.com" className="hover:text-white transition text-gray-400">frayerssolutions@gmail.com</a>
              </li>
              <li className="flex gap-2.5">
                <Clock className="w-4 h-4 text-[#d4af37] flex-shrink-0 mt-0.5" />
                <div className="text-gray-400">
                  <p>Lun &ndash; Vie: 8:00 am &ndash; 6:00 pm</p>
                  <p className="mt-0.5">Sáb: 8:00 am &ndash; 1:00 pm</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Formulario de Contacto rápido integrado */}
        <div className="container mx-auto px-6 mb-12">
          <div className="bg-gradient-to-br from-[#00142d] to-[#01254bf1] p-8 sm:p-10 rounded-2xl border border-blue-900/60 max-w-3xl mx-auto shadow-xl">
            <div className="text-center mb-6">
              <h3 className="font-display font-black text-xl sm:text-2xl uppercase mb-1">¿Tienes un proyecto en mente?</h3>
              <p className="font-medium text-xs text-gray-300">Escríbenos directamente para cotizar o consultar con ingenieros expertos.</p>
            </div>
            
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-300 mb-1.5">Nombre Completo *</label>
                  <input 
                    type="text" 
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Tu nombre completo" 
                    className="w-full bg-[#001124] border border-blue-900/60 rounded px-4 py-2.5 text-xs text-white outline-none focus:border-[#d4af37] transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-300 mb-1.5">WhatsApp / Celular</label>
                  <input 
                    type="tel" 
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+1 (809) 000-0000" 
                    className="w-full bg-[#001124] border border-blue-900/60 rounded px-4 py-2.5 text-xs text-white outline-none focus:border-[#d4af37] transition"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-300 mb-1.5">Correo Electrónico *</label>
                  <input 
                    type="email" 
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="correo@ejemplo.com" 
                    className="w-full bg-[#001124] border border-blue-900/60 rounded px-4 py-2.5 text-xs text-white outline-none focus:border-[#d4af37] transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-300 mb-1.5">Asunto</label>
                  <input 
                    type="text" 
                    value={contactSubject}
                    onChange={(e) => setContactSubject(e.target.value)}
                    placeholder="Ej. Cotización Nave Industrial" 
                    className="w-full bg-[#001124] border border-blue-900/60 rounded px-4 py-2.5 text-xs text-white outline-none focus:border-[#d4af37] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-300 mb-1.5">Descripción de tu Idea / Proyecto *</label>
                <textarea 
                  required
                  rows={4}
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Detalla las dimensiones, materiales o consultoría que necesitas..." 
                  className="w-full bg-[#001124] border border-blue-900/60 rounded px-4 py-2.5 text-xs text-white outline-none focus:border-[#d4af37] transition resize-none"
                />
              </div>

              {submitError && (
                <div className="bg-red-950/40 border border-red-900/50 text-red-200 text-xs px-4 py-2.5 rounded">
                  {submitError}
                </div>
              )}

              {submitSuccess && (
                <div className="bg-emerald-950/40 border border-emerald-900/50 text-emerald-200 text-xs px-4 py-2.5 rounded">
                  ¡Mensaje enviado con éxito! Un ingeniero de Frayers Solutions se pondrá en contacto contigo a la brevedad.
                </div>
              )}

              <div className="text-right">
                <button 
                  type="submit" 
                  disabled={sendingMessage}
                  className="bg-[#d4af37] hover:bg-[#b8952e] text-white font-display font-extrabold text-xs uppercase tracking-wider px-8 py-3 rounded transition duration-200 inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {sendingMessage ? 'Enviando...' : 'Enviar Mensaje Solución'} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-blue-900/30 pt-6 text-center text-[10px] text-gray-500">
          <p>&copy; 2026 Frayers Solutions Ingeniería y Arquitectura. Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* ===================== LIGHTBOX ===================== */}
      {lightboxActive && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade"
          role="dialog"
          aria-modal="true"
        >
          <button 
            onClick={() => setLightboxActive(false)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition hover:scale-105"
            aria-label="Cerrar lightbox"
          >
            <X className="w-5 h-5" />
          </button>

          <button 
            onClick={handleLightboxPrev}
            className="absolute left-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition"
            aria-label="Imagen anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button 
            onClick={handleLightboxNext}
            className="absolute right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition"
            aria-label="Siguiente imagen"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <div className="max-w-4xl w-full text-center">
            <img 
              src={projects[lightboxIndex]?.cover_url || ''} 
              alt="Proyecto ampliado" 
              className="max-h-[75vh] max-w-full object-contain mx-auto rounded-lg shadow-2xl"
            />
            <p className="text-white mt-4 font-display font-bold text-sm tracking-widest uppercase">
              {projects[lightboxIndex]?.title || ''}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              {projects[lightboxIndex]?.category || ''}
            </p>
          </div>
        </div>
      )}

      {/* ===================== WHATSAPP FLOATING BTN ===================== */}
      <a 
        href="https://wa.me/18099651012?text=Hola,%20me%20interesa%20obtener%20información%20sobre%20sus%20servicios%20de%20ingeniería%20y%20diseño."
        target="_blank" 
        rel="noopener noreferrer" 
        className="fixed bottom-6 right-6 bg-[#25d366] text-white w-14 h-14 rounded-full flex items-center justify-center text-3xl shadow-xl hover:scale-110 transition duration-300 z-[200] before:absolute before:inset-[-4px] before:border-2 before:border-[#25d366] before:rounded-full before:animate-ping before:opacity-40"
        aria-label="Contactar por WhatsApp"
      >
        <MessageCircle className="w-7 h-7 fill-white text-[#25d366]" />
      </a>

    </div>
  );
}
