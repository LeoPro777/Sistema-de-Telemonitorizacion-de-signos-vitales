import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Heart } from 'lucide-react';
import toast from 'react-hot-toast';

export const LoginView: React.FC = () => {
  const navigate = useNavigate();
  const { isLoading, bypassLogin } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [bypassEmail, setBypassEmail] = React.useState('');

  const executeBypass = async (email: string) => {
    try {
      const res = await bypassLogin(email);
      toast.success('¡Sesión iniciada con Bypass!');
      const userStatus = res.user.status;
      if (userStatus === 'incomplete') {
        navigate('/register-select', { replace: true });
      } else if (userStatus === 'pending_approval') {
        navigate('/waiting-approval', { replace: true });
      } else if (userStatus === 'approved') {
        if (res.user.role === 'PATIENT') {
          navigate('/patient-view', { replace: true });
        } else if (res.user.role === 'CLIENT' || res.user.role === 'DOCTOR') {
          navigate('/patients', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }
    } catch (err: any) {
      toast.error(typeof err === 'string' ? err : 'Error al iniciar sesión con Bypass.');
    }
  };

  const handleBypassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bypassEmail.trim()) {
      toast.error('Por favor, ingresa un correo para el bypass.');
      return;
    }
    await executeBypass(bypassEmail);
  };


  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (code) {
      // Limpiar el código de la URL de forma síncrona e inmediata
      // Esto evita que futuros re-renders vuelvan a evaluar este 'code'
      window.history.replaceState({}, document.title, window.location.pathname);

      // Prevenir la doble llamada en desarrollo (React 18 StrictMode)
      const processedCode = sessionStorage.getItem('processed_oauth_code');
      if (processedCode !== code) {
        sessionStorage.setItem('processed_oauth_code', code);

        useAuthStore.getState().googleLogin(code, true)
          .then((res) => {
            toast.success('¡Sesión iniciada con éxito!');
            const userStatus = res.user.status;
            if (userStatus === 'incomplete') {
              navigate('/register-select', { replace: true });
            } else if (userStatus === 'pending_approval') {
              navigate('/waiting-approval', { replace: true });
            } else if (userStatus === 'approved') {
              if (res.user.role === 'PATIENT') {
                navigate('/patient-view', { replace: true });
              } else if (res.user.role === 'CLIENT' || res.user.role === 'DOCTOR') {
                navigate('/patients', { replace: true });
              } else {
                navigate('/dashboard', { replace: true });
              }
            }
          })
          .catch((err) => {
            toast.error(typeof err === 'string' ? err : 'Error al iniciar sesión con Google.');
            navigate('/login', { replace: true });
          });
      }
    } else if (error) {
      // Limpiar el error de la URL de forma síncrona
      window.history.replaceState({}, document.title, window.location.pathname);

      if (error === 'suspended') {
        toast.error('Esta cuenta ha sido suspendida. Contacte al administrador.');
      } else if (error === 'rejected') {
        toast.error('Su solicitud de registro ha sido rechazada.');
      } else {
        toast.error('Error al iniciar sesión con Google. Inténtelo de nuevo.');
      }
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate]);

  const clientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || '';
  const redirectUri = `${window.location.origin}/login`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
  });
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString().replace(/\+/g, '%20')}`;

  const isProcessing = isLoading || !!searchParams.get('code');

  return (
    <div className="min-h-screen flex bg-[#0B0F19] text-slate-100 overflow-hidden">
      
      {/* PANEL IZQUIERDO: Branding e Ilustración IoT Biomédica */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#101726] to-[#0A0D16] flex-col justify-between p-12 border-r border-[#1E2640] overflow-hidden">
        
        {/* Glows abstractos decorativos */}
        <div className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] bg-[#D4AF37]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#FF1744]/10 rounded-full blur-[100px]" />

        {/* Logo/Branding superior */}
        <div className="flex items-center space-x-3 relative z-10">
          <div className="h-10 w-10 bg-gradient-to-br from-[#D4AF37] to-[#AA820A] rounded-xl flex items-center justify-center border border-[#D4AF37]/30 shadow-md shadow-[#D4AF37]/20">
            <Heart className="h-5 w-5 text-black stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-wider text-slate-100 uppercase">AURA</h2>
            <p className="text-[10px] text-[#D4AF37] tracking-widest uppercase font-semibold">Telemonitorización Vital</p>
          </div>
        </div>

        {/* Ilustración Biomédica Central SVG */}
        <div className="flex flex-col items-center justify-center flex-grow relative z-10">
          <div className="w-80 h-80 relative flex items-center justify-center">
            
            {/* Círculo base de radar */}
            <div className="absolute inset-0 rounded-full border border-dashed border-[#D4AF37]/20 animate-[spin_60s_linear_infinite]" />
            <div className="absolute inset-8 rounded-full border border-double border-[#1E2640] flex items-center justify-center" />
            
            {/* Ondas biométricas concéntricas */}
            <div className="absolute w-48 h-48 rounded-full bg-gradient-to-tr from-[#D4AF37]/5 to-transparent border border-[#D4AF37]/15 animate-signal" />
            
            {/* Corazón biométrico pulsante central */}
            <div className="absolute h-24 w-24 bg-[#1E2640] rounded-2xl flex items-center justify-center border border-[#D4AF37]/30 shadow-lg shadow-black animate-pulse-heart">
              <Heart className="h-12 w-12 text-[#FF1744]" />
            </div>
            
            {/* Nodos IoT flotantes */}
            <div className="absolute top-6 left-12 h-3 w-3 bg-[#00F2FE] rounded-full shadow-[0_0_10px_#00F2FE] animate-pulse" />
            <div className="absolute bottom-10 left-16 h-2 w-2 bg-[#FFD700] rounded-full shadow-[0_0_8px_#FFD700] animate-bounce" />
            <div className="absolute top-16 right-10 h-3.5 w-3.5 bg-[#FF1744] rounded-full shadow-[0_0_12px_#FF1744] animate-pulse" />
          </div>
          
          <div className="text-center mt-8 max-w-sm">
            <h3 className="text-xl font-bold tracking-tight">Monitoreo IoT en Tiempo Real</h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Conexión asíncrona de grado clínico para resguardar y analizar métricas de salud vitales las 24 horas del día.
            </p>
          </div>
        </div>

        {/* Footer izquierdo */}
        <div className="text-xs text-slate-500 relative z-10">
          &copy; 2026 Aura Biomedical Corp. Todos los derechos reservados.
        </div>
      </div>

      {/* PANEL DERECHO: Formulario de Login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16 relative bg-[#0B0F19]">
        
        {/* Efectos decorativos de fondo en móviles */}
        <div className="lg:hidden absolute top-[-10%] right-[-10%] w-[80%] h-[80%] bg-[#D4AF37]/5 rounded-full blur-[80px]" />
        
        <div className="w-full max-w-md relative z-10">
          
          {/* Contenedor principal de vidrio */}
          <div className="bg-glass p-8 md:p-10 rounded-3xl border border-[#1E2640] shadow-2xl relative overflow-hidden transition-all duration-500">
            
            <div className="mb-8">
              <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight">Iniciar Sesión</h3>
              <p className="text-sm text-slate-400 mt-2">Acceda a la consola de control de signos vitales.</p>
            </div>
            
            <div className="space-y-6 mt-8">
              <div className="w-full flex items-center justify-center pt-2">
                {isProcessing ? (
                  <div className="w-full py-3.5 bg-[#0F1420] border border-[#1E2640] text-slate-400 font-bold rounded-xl flex items-center justify-center space-x-3 opacity-50 cursor-not-allowed">
                    <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    <span>Procesando inicio de sesión...</span>
                  </div>
                ) : (
                  <a
                    href={authUrl}
                    className="w-full py-3.5 bg-[#0F1420] border border-[#1E2640] text-slate-100 hover:border-[#D4AF37]/50 font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-[#D4AF37]/5 flex items-center justify-center space-x-3 group"
                  >
                    <svg className="h-5 w-5 transition-transform group-hover:scale-110 duration-300" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </svg>
                    <span>Continuar con Google</span>
                  </a>
                )}
              </div>
              
              <div className="flex items-center space-x-4 pt-6">
                <div className="flex-1 border-t border-[#1E2640]"></div>
                <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Acceso Seguro</span>
                <div className="flex-1 border-t border-[#1E2640]"></div>
              </div>

              {/* Panel de Bypass en Desarrollo */}
              {(import.meta as any).env.DEV && (
                <div className="mt-6 pt-4 border-t border-[#1E2640]/50 space-y-4">
                  <div className="flex items-center space-x-2 text-[#D4AF37]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Modo Desarrollo / Bypass</span>
                  </div>
                  
                  <form onSubmit={handleBypassSubmit} className="space-y-3">
                    <div className="relative">
                      <input
                        type="email"
                        placeholder="ej: doctor@aura.com"
                        value={bypassEmail}
                        onChange={(e) => setBypassEmail(e.target.value)}
                        className="w-full px-4 py-2 bg-[#0F1420] border border-[#1E2640] rounded-xl text-slate-100 placeholder-slate-600 text-xs focus:border-[#D4AF37]/50 focus:outline-none transition-all duration-300"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="w-full py-2 bg-gradient-to-r from-[#D4AF37]/20 to-[#AA820A]/20 hover:from-[#D4AF37]/35 hover:to-[#AA820A]/35 text-[#D4AF37] hover:text-white border border-[#D4AF37]/30 font-semibold text-xs rounded-xl transition-all duration-300 shadow-md"
                    >
                      Ingresar con Bypass
                    </button>
                  </form>

                  <div className="space-y-1.5">
                    <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Accesos Rápidos:</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Admin', email: 'admin@aura.com' },
                        { label: 'Médico', email: 'medico@aura.com' },
                        { label: 'Cliente', email: 'cliente@aura.com' },
                        { label: 'Nuevo (Onboarding)', email: 'nuevo_usuario@aura.com' }
                      ].map((item) => (
                        <button
                          key={item.label}
                          onClick={() => {
                            setBypassEmail(item.email);
                            executeBypass(item.email);
                          }}
                          disabled={isProcessing}
                          className="px-2.5 py-1 bg-[#101626] border border-[#1E2640] hover:border-[#D4AF37]/40 text-slate-400 hover:text-slate-200 text-[10px] font-medium rounded-lg transition-all duration-200"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Enlace inferior de registro */}
            <div className="mt-8 text-center border-t border-[#1E2640] pt-6 text-xs md:text-sm text-slate-400">
              ¿No tiene una cuenta? Al hacer clic arriba, si eres nuevo se abrirá nuestro portal de onboarding.
            </div>

          </div>
        </div>
      </div>

    </div>
  );
};

export default LoginView;
