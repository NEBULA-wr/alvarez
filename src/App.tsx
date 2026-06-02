import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Profile } from './types';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import ClientPortal from './components/ClientPortal';

type PageState = 'landing' | 'login' | 'admin' | 'client';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageState>('landing');
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Intentar restaurar sesión activa de Supabase
  useEffect(() => {
    async function restoreSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.user) {
          // Consultar el perfil
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (!error && profile) {
            setCurrentProfile(profile as Profile);
            if (profile.role === 'admin') {
              setCurrentPage('admin');
            } else {
              setCurrentPage('client');
            }
          } else {
            // Si no tiene perfil pero si tiene sesión (caso raro), lo mandamos a autenticarse otra vez
            await supabase.auth.signOut();
          }
        }
      } catch (err) {
        console.error('Error restaurando sesión de Supabase:', err);
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  const handleLoginSuccess = (profile: Profile) => {
    setCurrentProfile(profile);
    if (profile.role === 'admin') {
      setCurrentPage('admin');
    } else {
      setCurrentPage('client');
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setCurrentProfile(null);
      setCurrentPage('landing');
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    } finally {
      setLoading(false);
    }
  };

  // Switch de vistas (páginas)
  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#000263] flex flex-col items-center justify-center text-white z-50">
        <div className="text-center space-y-4">
          <span className="w-10 h-10 border-4 border-white/20 border-t-[#d4af37] rounded-full animate-spin inline-block"></span>
          <p className="text-xs tracking-widest uppercase text-gray-400 font-mono">Restaurando sesión técnica Frayers Solutions...</p>
        </div>
      </div>
    );
  }

  switch (currentPage) {
    case 'landing':
      return (
        <LandingPage 
          onGoToLogin={() => setCurrentPage('login')}
          onGoToClientPortal={() => setCurrentPage('client')}
        />
      );
    case 'login':
      return (
        <Login 
          onLoginSuccess={handleLoginSuccess}
          onGoBack={() => setCurrentPage('landing')}
        />
      );
    case 'admin':
      return currentProfile && currentProfile.role === 'admin' ? (
        <AdminPanel 
          currentProfile={currentProfile}
          onLogout={handleLogout}
        />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} onGoBack={() => setCurrentPage('landing')} />
      );
    case 'client':
      return (
        <ClientPortal 
          currentUserProfile={currentProfile}
          onLogout={handleLogout}
          onGoBackToLanding={() => setCurrentPage('landing')}
          onGoToLogin={() => setCurrentPage('login')}
        />
      );
    default:
      return (
        <LandingPage 
          onGoToLogin={() => setCurrentPage('login')}
          onGoToClientPortal={() => setCurrentPage('client')}
        />
      );
  }
}
