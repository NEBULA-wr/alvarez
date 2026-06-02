import { useState, FormEvent } from 'react';
import { supabase } from '../supabaseClient';
import { LogIn, UserPlus, Eye, EyeOff, Key, Compass, X } from 'lucide-react';
import { Profile } from '../types';

interface LoginProps {
  onLoginSuccess: (profile: Profile) => void;
  onGoBack: () => void;
}

export default function Login({ onLoginSuccess, onGoBack }: LoginProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [logoError, setLogoError] = useState(false);
  
  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Register Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [regError, setRegError] = useState('');
  const [registering, setRegistering] = useState(false);

  // Intentar cargar o crear de inmediato un perfil de usuario para asegurar que existan los roles
  const loadOrCreateProfile = async (userId: string, email: string, name: string = '', phone: string = ''): Promise<Profile | null> => {
    try {
      // 1. Intentar consultar si el perfil ya existe
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        return profile as Profile;
      }

      // 2. Si no existe, crearlo dinámicamente según el correo
      // Correo de administración por defecto para la empresa
      const isCompanyAdmin = email.toLowerCase() === 'admin@frayerssolutions.com' || email.toLowerCase().includes('admin@frayers');
      const assignedRole = isCompanyAdmin ? 'admin' : 'client';
      const fallbackName = name || email.split('@')[0] || 'Usuario';

      console.log(`Creando perfil dinámico para: ${email} con rol: ${assignedRole}`);

      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          full_name: fallbackName,
          email: email,
          phone: phone,
          role: assignedRole,
          bio: ''
        }, { onConflict: 'id' })
        .select()
        .single();

      if (insertError) {
        console.error('Error insertando perfil manual en login:', insertError);
        throw insertError;
      }

      return newProfile as Profile;
    } catch (err) {
      console.error('Error en loadOrCreateProfile:', err);
      return null;
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginEmail || !loginPass) {
      setLoginError('Por favor completa todos los campos.');
      return;
    }

    setLoggingIn(true);
    try {
      let { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPass,
      });

      // Si falla y es el correo administrador demo por defecto, intentamos registrarlo automáticamente
      if (error && loginEmail.trim().toLowerCase() === 'admin@frayerssolutions.com') {
        console.log('El usuario administrador no existe en la BD. Registrando automáticamente...');
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: loginEmail.trim(),
          password: loginPass,
          options: {
            data: {
              full_name: 'Frayers Administrador',
              phone: '8294503020',
            }
          }
        });

        if (!signUpError && signUpData.user) {
          // Intentar iniciar sesión una vez más después del registro
          const { data: retryLogin, error: retryError } = await supabase.auth.signInWithPassword({
            email: loginEmail.trim(),
            password: loginPass,
          });

          if (!retryError && retryLogin.user) {
            data = retryLogin;
            error = null;
          }
        }
      }

      if (error) {
        setLoginError('Credenciales incorrectas. Verifica tu contraseña o regístrate en la pestaña "Crear Cuenta".');
        setLoggingIn(false);
        return;
      }

      if (data.user) {
        // Cargar o crear perfil garantizadamente y obtener su rol
        const userProfile = await loadOrCreateProfile(data.user.id, data.user.email || loginEmail);
        
        if (userProfile) {
          onLoginSuccess(userProfile);
        } else {
          setLoginError('No se pudo verificar o configurar el rol de tu usuario en la base de datos.');
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setLoginError('Error de conexión con el servidor: ' + err.message);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regName || !regEmail || !regPass) {
      setRegError('Nombre, correo electrónico y contraseña son obligatorios.');
      return;
    }
    if (regPass.length < 6) {
      setRegError('La contraseña debe tener un mínimo de 6 caracteres.');
      return;
    }

    setRegistering(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: regEmail.trim(),
        password: regPass,
        options: {
          data: {
            full_name: regName,
            phone: regPhone || '',
          }
        }
      });

      if (error) {
        setRegError(error.message);
        setRegistering(false);
        return;
      }

      if (data.user) {
        // Creamos su perfil de inmediato asegurando el rol de cliente
        const userProfile = await loadOrCreateProfile(
          data.user.id, 
          regEmail.trim(), 
          regName, 
          regPhone
        );

        if (userProfile) {
          onLoginSuccess(userProfile);
        } else {
          setRegError('Cuenta creada con éxito, pero con problemas al registrar el rol de cliente.');
        }
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setRegError('Error al crear la cuenta: ' + err.message);
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans text-gray-900 bg-[#f4f6ff]">
      
      {/* Panel Izquierdo / Video o Imagen de Marca */}
      <div className="relative flex-1 bg-[#000263] flex flex-col items-center justify-center p-10 md:p-16 overflow-hidden">
        
        {/* Efecto decorativo radial */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#000263] via-[#001783] to-[#2040d0] opacity-90 z-0" />
        
        {/* Cuadrícula de líneas de fondo */}
        <div 
          className="absolute inset-0 opacity-10 z-0 bg-repeat"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)`,
            backgroundSize: '48px 48px'
          }}
        />

        <div className="relative z-10 text-center max-w-sm flex flex-col items-center select-none anim-up">
          <div className="w-24 h-24 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/25 shadow-xl mb-6 p-4 overflow-hidden">
            {!logoError ? (
              <img 
                src="/logo.png" 
                alt="Frayers Solutions" 
                className="max-h-full max-w-full object-contain filter brightness-0 invert" 
                onError={() => setLogoError(true)} 
              />
            ) : (
              <Compass className="w-12 h-12 text-[#d4af37]" />
            )}
          </div>
          
          <h1 className="font-display font-black text-3xl sm:text-4xl text-white tracking-widest uppercase leading-snug">
            FRAYERS
          </h1>
          <h2 className="font-display font-light text-2xl text-[#d4af37] tracking-[0.3em] uppercase leading-none mt-1">
            SOLUTIONS
          </h2>
          <div className="w-12 h-0.5 bg-[#d4af37] my-4"></div>
          <p className="text-gray-300 text-xs tracking-wider uppercase font-medium">Ingeniería y Arquitectura</p>
          
          <div className="grid grid-cols-3 gap-6 text-center text-white mt-10 w-full pt-6 border-t border-white/10">
            <div>
              <p className="font-serif font-bold text-xl text-[#d4af37]">150+</p>
              <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-0.5">Obras</p>
            </div>
            <div>
              <p className="font-serif font-bold text-xl text-[#d4af37]">10</p>
              <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-0.5">Años</p>
            </div>
            <div>
              <p className="font-serif font-bold text-xl text-[#d4af37]">100%</p>
              <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-0.5">Confianza</p>
            </div>
          </div>
        </div>
      </div>

      {/* Panel Derecho / Formularios */}
      <div className="flex-1 bg-white flex items-center justify-center p-8 sm:p-12 md:p-16 relative">
        
        {/* Botón Cerrar / Volver */}
        <button 
          onClick={onGoBack}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 shadow-sm transition hover:scale-105"
          title="Regresar a inicio"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-full max-w-sm anim-up">
          <div className="mb-6 text-center md:text-left">
            <h3 className="font-display font-extrabold text-2xl uppercase text-[#0d1340]">Bienvenido</h3>
            <p className="text-xs text-gray-500 mt-1">Ingresa a tu cuenta técnica o crea tu portal personal</p>
          </div>

          {/* Pestañas de Login / Registro */}
          <div className="flex bg-[#f4f6ff] rounded-lg p-1.5 gap-1.5 mb-6 shadow-inner">
            <button 
              onClick={() => { setActiveTab('login'); setLoginError(''); }}
              className={`flex-1 py-2 text-xs font-bold tracking-wide rounded-md uppercase transition ${
                activeTab === 'login' ? 'bg-[#000263] text-white shadow' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Iniciar Sesión
            </button>
            <button 
              onClick={() => { setActiveTab('register'); setRegError(''); }}
              className={`flex-1 py-2 text-xs font-bold tracking-wide rounded-md uppercase transition ${
                activeTab === 'register' ? 'bg-[#000263] text-white shadow' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Crear Cuenta
            </button>
          </div>

          {/* Formulario Iniciar Sesión */}
          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Correo Electrónico</label>
                <input 
                  type="email" 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="correo@ejemplo.com" 
                  className="w-full bg-white border-2 border-gray-100 rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none focus:border-[#2040d0] transition focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Contraseña</label>
                <div className="relative">
                  <input 
                    type={showLoginPass ? 'text' : 'password'}
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="••••••••" 
                    className="w-full bg-white border-2 border-gray-100 rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none focus:border-[#2040d0] transition pr-10"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowLoginPass(!showLoginPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-xs px-4 py-2.5 rounded-lg">
                  {loginError}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loggingIn}
                className="w-full flex items-center justify-center gap-2 bg-[#000263] hover:bg-[#001aa0] disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-lg transition shadow-md"
              >
                {loggingIn ? 'Ingresando...' : 'Ingresar al Portal'} <LogIn className="w-4 h-4 text-[#d4af37]" />
              </button>
            </form>
          ) : (
            // Formulario Crear Cuenta
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Nombre Completo</label>
                <input 
                  type="text" 
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Tu nombre completo" 
                  className="w-full bg-white border-2 border-gray-100 rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none focus:border-[#2040d0] transition"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Correo Electrónico</label>
                <input 
                  type="email" 
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="correo@ejemplo.com" 
                  className="w-full bg-white border-2 border-gray-100 rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none focus:border-[#2040d0] transition"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Contraseña</label>
                <div className="relative">
                  <input 
                    type={showRegPass ? 'text' : 'password'}
                    value={regPass}
                    onChange={(e) => setRegPass(e.target.value)}
                    placeholder="Mínimo 6 caracteres" 
                    className="w-full bg-white border-2 border-gray-100 rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none focus:border-[#2040d0] transition pr-10"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowRegPass(!showRegPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showRegPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-[#0d1340] mb-1.5">Teléfono (opcional)</label>
                <input 
                  type="tel" 
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+1 (809) 000-0000" 
                  className="w-full bg-white border-2 border-gray-100 rounded-lg px-4 py-2.5 text-xs text-gray-800 outline-none focus:border-[#2040d0] transition"
                />
              </div>

              {regError && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-xs px-4 py-2.5 rounded-lg">
                  {regError}
                </div>
              )}

              <button 
                type="submit" 
                disabled={registering}
                className="w-full flex items-center justify-center gap-2 bg-[#000263] hover:bg-[#001aa0] disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-lg transition shadow-md"
              >
                {registering ? 'Creando...' : 'Crear Cuenta'} <UserPlus className="w-4 h-4 text-[#d4af37]" />
              </button>
            </form>
          )}

          <div className="mt-6 text-center select-none">
            <button 
              onClick={onGoBack}
              className="text-gray-400 hover:text-[#2040d0] text-xs font-semibold tracking-wide border-b border-dashed border-gray-300 hover:border-[#2040d0] transition pb-0.5"
            >
              Explorar Landing Page →
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
