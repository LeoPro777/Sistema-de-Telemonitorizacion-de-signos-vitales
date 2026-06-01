import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Heart } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';

export const LoginView: React.FC = () => {
  const navigate = useNavigate();
  const { googleLogin, isLoading } = useAuthStore();

  const redirectByRole = (user: any) => {
    if (user.status === 'incomplete') {
      navigate('/register-select');
    } else if (user.status === 'pending_approval') {
      navigate('/waiting-approval');
    } else if (user.status === 'approved') {
      if (user.role === 'PATIENT') {
        navigate('/patient-view');
      } else {
        navigate('/dashboard');
      }
    }
  };

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
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <GoogleLogin
                    onSuccess={async (credentialResponse) => {
                      try {
                        const res = await googleLogin(credentialResponse.credential!);
                        if (res.success) {
                          toast.success(`¡Bienvenido, ${res.user.first_name || 'Usuario'}!`);
                          redirectByRole(res.user);
                        }
                      } catch (err: any) {
                        toast.error(typeof err === 'string' ? err : err?.message || 'Error desconocido');
                      }
                    }}
                    onError={() => {
                      toast.error('Fallo al iniciar sesión con Google');
                    }}
                    theme="filled_black"
                    size="large"
                    text="continue_with"
                    shape="rectangular"
                    width="320"
                  />
                )}
              </div>
              
              <div className="flex items-center space-x-4 pt-6">
                <div className="flex-1 border-t border-[#1E2640]"></div>
                <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Acceso Seguro</span>
                <div className="flex-1 border-t border-[#1E2640]"></div>
              </div>
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
