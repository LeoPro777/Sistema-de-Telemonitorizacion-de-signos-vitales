import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Heart, LogOut, ShieldAlert } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const WaitingApprovalView: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, checkAuth } = useAuthStore();
  const [dots, setDots] = useState('');
  const [simulatedAdminApproved, setSimulatedAdminApproved] = useState(false);

  // Animación del texto de carga (...)
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  // Polling para chequear si ha sido aprobado
  useEffect(() => {
    // Si no hay usuario logueado o no está pending_approval, redirigir
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (user.status === 'approved') {
      navigate('/dashboard');
      return;
    }

    const pollingInterval = setInterval(async () => {
      try {
        await checkAuth(); // Esto recarga el estado del usuario en authStore
      } catch (err) {
        console.error('Error durante el polling de aprobación:', err);
      }
    }, 4000); // Polling cada 4 segundos

    return () => clearInterval(pollingInterval);
  }, [user, checkAuth, navigate]);

  // Si el usuario cambia a approved, redirigir automáticamente
  useEffect(() => {
    if (user && user.status === 'approved') {
      toast.success('¡Su cuenta ha sido aprobada por la administración!');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSimulatedApproval = async () => {
    if (!user) return;
    try {
      // Endpoint de prueba que creamos en el backend para aprobar solicitudes
      await api.post(`/applicants/${user.email}/review`, {
        status: 'APPROVED'
      });
      setSimulatedAdminApproved(true);
      toast.success('Simulación: Solicitud aprobada en base de datos. Esperando siguiente ciclo de polling...');
    } catch (err: any) {
      toast.error('Error al simular aprobación: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#0A0D14] text-slate-100 flex flex-col justify-between p-6 relative overflow-hidden">
      
      {/* Glows de fondo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] bg-[#FF1744]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center max-w-5xl mx-auto w-full relative z-10">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-gradient-to-br from-[#D4AF37] to-[#AA820A] rounded-lg flex items-center justify-center border border-[#D4AF37]/20 shadow-md">
            <Heart className="h-4 w-4 text-black stroke-[2.5]" />
          </div>
          <span className="font-bold tracking-wider text-sm uppercase text-slate-300">AURA</span>
        </div>
        
        <button
          onClick={handleLogout}
          className="text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center space-x-1.5 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Volver al Inicio</span>
        </button>
      </div>

      {/* Pantalla central - ECG Heartbeat */}
      <div className="flex flex-col items-center justify-center flex-grow relative z-10 max-w-md mx-auto text-center px-4">
        
        <div className="w-56 h-56 relative flex items-center justify-center mb-10">
          
          {/* Sombreado de fondo ECG */}
          <div className="absolute inset-0 bg-[#FF1744]/10 rounded-full blur-2xl animate-pulse" />
          
          {/* Marco del osciloscopio circular */}
          <div className="absolute inset-0 rounded-full border border-dashed border-[#FF1744]/25 animate-[spin_40s_linear_infinite]" />
          <div className="absolute inset-4 rounded-full border border-[#1E2640] bg-black/40 flex items-center justify-center shadow-inner" />
          
          {/* Corazón latiendo */}
          <div className="absolute h-20 w-20 bg-[#1E2640] rounded-2xl flex items-center justify-center border border-[#FF1744]/30 animate-pulse-heart">
            <Heart className="h-10 w-10 text-[#FF1744]" />
          </div>
        </div>

        {/* Mensaje dinámico de auditoría */}
        <div>
          <span className="text-[10px] text-[#D4AF37] tracking-[0.2em] font-bold uppercase block mb-3">
            VERIFICACIÓN DE CREDENCIALES
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Auditoría de Cuenta Pendiente{dots}
          </h2>
          <p className="text-sm text-slate-400 mt-4 leading-relaxed">
            Estimado <strong>{user?.first_name} {user?.last_name}</strong>, su solicitud de ingreso con el rol de{' '}
            <strong className="text-slate-200">{user?.role}</strong> está siendo auditada por el personal administrativo.
          </p>
          <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
            Esta pantalla se actualizará automáticamente una vez que sus credenciales y documentos sean validados.
          </p>
        </div>

        {/* Acceso directo para el desarrollador: Simulador de aprobación */}
        <div className="mt-10 p-5 bg-[#1E2640]/40 rounded-2xl border border-[#FF1744]/20 max-w-sm w-full">
          <div className="flex items-center space-x-2.5 text-left mb-3">
            <ShieldAlert className="h-5 w-5 text-[#D4AF37] flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Módulo de Pruebas</h4>
              <p className="text-[10px] text-slate-500">Pruebe el flujo de onboarding instantáneamente sin abrir MongoDB.</p>
            </div>
          </div>
          
          <button
            onClick={handleSimulatedApproval}
            disabled={simulatedAdminApproved}
            className="w-full py-2.5 bg-[#FF1744]/20 hover:bg-[#FF1744]/35 text-[#FF1744] hover:text-white border border-[#FF1744]/40 font-semibold text-xs rounded-xl transition-all duration-300 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {simulatedAdminApproved ? '✓ Cuenta Aprobada' : 'Aprobar Cuenta Ahora (Simulación)'}
          </button>
        </div>

      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-slate-600 relative z-10 py-4">
        Canal de Verificación Criptográfica Directa &bull; Aura Biomedical Systems
      </div>

    </div>
  );
};
export default WaitingApprovalView;
