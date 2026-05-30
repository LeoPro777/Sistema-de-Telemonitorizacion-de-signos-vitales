import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Eye, EyeOff, Lock, User as UserIcon, Heart, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';

export const LoginView: React.FC = () => {
  const navigate = useNavigate();
  const { login, verify2FA, twoFactorRequired, isLoading } = useAuthStore();
  
  // Formulario de login
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Formulario de 2FA
  const [otpCode, setOtpCode] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail || !password) {
      toast.error('Por favor, complete todos los campos');
      return;
    }

    try {
      const res = await login(usernameOrEmail, password);
      if (res.twoFactorRequired) {
        toast.success('Verificación de dos factores requerida');
      } else {
        toast.success(`¡Bienvenido, ${res.user.username}!`);
        redirectByRole(res.user);
      }
    } catch (err: any) {
      toast.error(err);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      toast.error('Ingrese el código de 6 dígitos');
      return;
    }

    try {
      const res = await verify2FA(otpCode);
      toast.success(`¡Autenticación completada! Bienvenido.`);
      redirectByRole(res.user);
    } catch (err: any) {
      toast.error(err);
    }
  };

  const redirectByRole = (user: any) => {
    if (user.status === 'PENDING') {
      navigate('/waiting-approval');
    } else if (user.role === 'PATIENT') {
      navigate('/patient-view');
    } else {
      navigate('/dashboard');
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

      {/* PANEL DERECHO: Formulario de Login / 2FA */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16 relative bg-[#0B0F19]">
        
        {/* Efectos decorativos de fondo en móviles */}
        <div className="lg:hidden absolute top-[-10%] right-[-10%] w-[80%] h-[80%] bg-[#D4AF37]/5 rounded-full blur-[80px]" />
        
        <div className="w-full max-w-md relative z-10">
          
          {/* Contenedor con transición deslizante si hay 2FA */}
          <div className="bg-glass p-8 md:p-10 rounded-3xl border border-[#1E2640] shadow-2xl relative overflow-hidden transition-all duration-500">
            
            {/* Animación deslizante horizontal */}
            <div className={`transition-transform duration-500 ease-in-out flex w-[200%] ${twoFactorRequired ? '-translate-x-1/2' : 'translate-x-0'}`}>
              
              {/* FORMULARIO 1: INICIO DE SESIÓN */}
              <div className="w-1/2 pr-4 transition-opacity duration-300">
                <div className="mb-8">
                  <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight">Iniciar Sesión</h3>
                  <p className="text-sm text-slate-400 mt-2">Acceda a la consola de control de signos vitales.</p>
                </div>
                
                <form onSubmit={handleLoginSubmit} className="space-y-6">
                  {/* Usuario / Email */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Usuario o Correo</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <UserIcon className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        value={usernameOrEmail}
                        onChange={(e) => setUsernameOrEmail(e.target.value)}
                        placeholder="ej: dr_lopez o lopez@clinic.com"
                        className="w-full pl-10 pr-4 py-3 bg-[#0B0F19] border border-[#1E2640] rounded-xl focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none text-sm transition-all placeholder:text-slate-600"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Contraseña */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Contraseña</label>
                      <a href="#" className="text-xs text-[#D4AF37] hover:underline">¿Olvidó su contraseña?</a>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-3 bg-[#0B0F19] border border-[#1E2640] rounded-xl focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none text-sm transition-all placeholder:text-slate-600"
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Botón de Enviar */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 bg-gradient-to-r from-[#D4AF37] to-[#AA820A] text-black font-bold rounded-xl hover:from-[#E5BE48] hover:to-[#BC931B] transition-all duration-300 shadow-lg shadow-[#D4AF37]/10 flex items-center justify-center space-x-2"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>Ingresar al Sistema</span>
                    )}
                  </button>
                </form>

                {/* Enlace inferior de registro */}
                <div className="mt-8 text-center border-t border-[#1E2640] pt-6 text-xs md:text-sm text-slate-400">
                  ¿No tiene una cuenta?{' '}
                  <Link to="/register-select" className="text-[#D4AF37] font-semibold hover:underline">
                    Solicitar registro
                  </Link>
                </div>
              </div>

              {/* FORMULARIO 2: VERIFICACIÓN 2FA */}
              <div className="w-1/2 pl-4 transition-opacity duration-300">
                <div className="mb-8">
                  <div className="h-12 w-12 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center border border-[#D4AF37]/30 mb-4">
                    <KeyRound className="h-6 w-6 text-[#D4AF37]" />
                  </div>
                  <h3 className="text-2xl font-extrabold tracking-tight">Verificación 2FA</h3>
                  <p className="text-sm text-slate-400 mt-2">
                    Ingrese el código OTP de 6 dígitos enviado a su aplicación móvil.
                  </p>
                </div>

                <form onSubmit={handle2FASubmit} className="space-y-6">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Código de Seguridad</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="ej: 123456"
                      className="w-full py-4 text-center tracking-[0.5em] text-2xl font-mono bg-[#0B0F19] border border-[#1E2640] rounded-xl focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all placeholder:text-slate-700 placeholder:tracking-normal"
                      required
                      disabled={isLoading}
                    />
                    <p className="text-[11px] text-[#D4AF37]/70 mt-2 text-center">
                      * Demo: Ingrese "123456" para aprobar la autenticación.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpCode.length !== 6}
                    className="w-full py-3.5 bg-gradient-to-r from-[#D4AF37] to-[#AA820A] text-black font-bold rounded-xl hover:from-[#E5BE48] hover:to-[#BC931B] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>Verificar Código</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => useAuthStore.setState({ twoFactorRequired: false, tempToken: null })}
                    className="w-full text-center text-xs text-slate-500 hover:text-slate-300 font-semibold transition-colors mt-4"
                  >
                    Volver al login
                  </button>
                </form>
              </div>

            </div>

          </div>
        </div>
      </div>

    </div>
  );
};
export default LoginView;
