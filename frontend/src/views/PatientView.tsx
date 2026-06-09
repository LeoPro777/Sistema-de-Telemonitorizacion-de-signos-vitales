import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Heart, Activity, Thermometer, LogOut, ShieldCheck, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import vitalsSocket from '../utils/vitalsSocket';
import toast from 'react-hot-toast';

export const PatientView: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const displayName = user 
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Usuario'
    : 'Usuario';
  
  const [patientData, setPatientData] = useState<any>(null);
  const [pulse, setPulse] = useState<number>(75);
  const [spo2, setSpo2] = useState<number>(98);
  const [temp, setTemp] = useState<number>(36.6);
  
  // Estados de criticidad reactivos en tiempo real
  const [pulseStatus, setPulseStatus] = useState<string>('NORMAL');
  const [spo2Status, setSpo2Status] = useState<string>('NORMAL');
  const [tempStatus, setTempStatus] = useState<string>('NORMAL');
  const [overallStatus, setOverallStatus] = useState<string>('NORMAL');

  const [isDeviceActive, setIsDeviceActive] = useState<boolean>(false);
  const [lastDataTimestamp, setLastDataTimestamp] = useState<number | null>(null);

  // Watchdog para detectar desconexión (si pasan más de 15s sin trama)
  useEffect(() => {
    if (!lastDataTimestamp) return;
    const watchdog = setInterval(() => {
      const now = new Date().getTime();
      if (now - lastDataTimestamp > 15000) {
        setIsDeviceActive(false);
        setPulseStatus('OFFLINE');
        setSpo2Status('OFFLINE');
        setTempStatus('OFFLINE');
        setOverallStatus('OFFLINE');
      }
    }, 2000);
    return () => clearInterval(watchdog);
  }, [lastDataTimestamp]);

  // 1. Obtener expediente de paciente autenticado
  useEffect(() => {
    const fetchPatientProfile = async () => {
      try {
        const response = await api.get('/patients');
        const patients = response.data.patients;
        
        if (patients && patients.length > 0) {
          const patient = patients[0];
          setPatientData(patient);
          
          // Cargar valores iniciales desde el cache de la BD
          const cache = patient.last_telemetry_cache || {};
          setPulse(cache.heart_rate?.value || 75);
          setPulseStatus(cache.heart_rate?.status || 'NORMAL');
          
          setSpo2(cache.spo2?.value || 98);
          setSpo2Status(cache.spo2?.status || 'NORMAL');
          
          setTemp(cache.temperature?.value || 36.6);
          setTempStatus(cache.temperature?.status || 'NORMAL');
          
          setOverallStatus(patient.has_active_alert ? 'CRITICAL' : 'NORMAL');
          
          // 2. Conectar al WebSocket real de telemetría usando vitalsSocket
          vitalsSocket.connect(patient._id, {
            onMessage: (message) => {
              // Recibe la trama en vivo
              const { telemetry, status, cache, new_alerts } = message;
              
              setIsDeviceActive(true);
              setLastDataTimestamp(new Date().getTime());
              
              setPulse(telemetry.heart_rate);
              setSpo2(telemetry.spo2);
              setTemp(telemetry.temperature);
              
              setPulseStatus(cache.heart_rate?.status || 'NORMAL');
              setSpo2Status(cache.spo2?.status || 'NORMAL');
              setTempStatus(cache.temperature?.status || 'NORMAL');
              setOverallStatus(status || 'NORMAL');
              
              if (new_alerts && new_alerts.length > 0) {
                new_alerts.forEach((alert: any) => {
                  toast.error(`¡Alerta Clínica Crítica!: ${alert.description}`, {
                    duration: 5000,
                    icon: '🚨'
                  });
                });
              }
            },
            onConnect: () => {
              toast.success('Canal de telemetría IoT establecido');
            },
            onDisconnect: () => {
              console.warn('Canal de telemetría desconectado, reintentando...');
            }
          });
        } else {
          toast.error('No se encontró expediente clínico activo para esta cuenta.');
        }
      } catch (err) {
        console.error('Error cargando perfil de paciente:', err);
        toast.error('Error al sincronizar expediente de paciente.');
      }
    };

    fetchPatientProfile();

    return () => {
      // Limpieza: desconectar WebSocket al desmontar
      vitalsSocket.disconnect();
    };
  }, []);

  const handleLogout = () => {
    vitalsSocket.disconnect();
    logout();
    toast.success('Sesión finalizada. Cuide su salud.');
    navigate('/login');
  };

  // Convertidor de color semántico de TelemetryStatus
  const getStatusColorClasses = (status: string) => {
    switch (status) {
      case 'CRITICAL':
        return {
          border: 'border-[#FF1744] bg-[#FF1744]/5 animate-pulse',
          badge: 'bg-[#FF1744]/20 text-[#FF1744] border-[#FF1744]/30 animate-pulse',
          text: 'text-[#FF1744] text-glow-red',
          glow: 'shadow-[0_0_20px_rgba(255,23,68,0.2)]'
        };
      case 'WARNING':
        return {
          border: 'border-[#FFD700]/50 bg-[#FFD700]/5',
          badge: 'bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30',
          text: 'text-[#FFD700] text-glow-gold',
          glow: 'shadow-[0_0_15px_rgba(255,215,0,0.15)]'
        };
      case 'OFFLINE':
        return {
          border: 'border-[#1E2640] bg-[#0A0D15]',
          badge: 'bg-[#1E2640]/50 text-slate-500 border-[#1E2640]',
          text: 'text-slate-600',
          glow: ''
        };
      default: // NORMAL
        return {
          border: 'border-[#00F2FE]/20 bg-glass',
          badge: 'bg-[#00F2FE]/10 text-[#00F2FE] border-[#00F2FE]/20',
          text: 'text-[#00F2FE] text-glow-gold',
          glow: ''
        };
    }
  };

  const pulseStyle = getStatusColorClasses(pulseStatus);
  const spo2Style = getStatusColorClasses(spo2Status);
  const tempStyle = getStatusColorClasses(tempStatus);

  return (
    <div className={`min-h-screen transition-colors duration-1000 flex flex-col justify-between p-5 relative overflow-hidden ${
      overallStatus === 'CRITICAL' ? 'bg-[#15050A]' : 'bg-[#0B0F19]'
    }`}>
      
      {/* Glows decorativos */}
      <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[80%] bg-[#00F2FE]/5 rounded-full blur-[140px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-[#FF1744]/5 rounded-full blur-[120px]" />

      {/* Header superior */}
      <header className="flex justify-between items-center max-w-md mx-auto w-full relative z-10 py-2">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-gradient-to-br from-[#D4AF37] to-[#AA820A] rounded-lg flex items-center justify-center border border-[#D4AF37]/20 shadow-md">
            <Heart className="h-4 w-4 text-black stroke-[2.5]" />
          </div>
          <span className="font-bold tracking-wider text-sm text-slate-300">AURA</span>
        </div>
        
        <button
          onClick={handleLogout}
          className="text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center space-x-1.5 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Salir</span>
        </button>
      </header>

      {/* Cuerpo principal exclusivo móvil vertical */}
      <div className="max-w-md mx-auto w-full my-auto py-6 relative z-10 space-y-6">
        
        {/* Info Paciente */}
        <div className="bg-glass p-5 rounded-2xl border border-[#1E2640] flex items-center space-x-4">
          <div className="h-12 w-12 bg-[#1E2640] rounded-xl flex items-center justify-center border border-[#D4AF37]/25 text-[#D4AF37] font-bold text-sm">
            <User className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center w-full">
              <span className="text-[9px] text-[#D4AF37] tracking-[0.2em] font-bold uppercase block">PACIENTE ACTIVO</span>
              {isDeviceActive ? (
                <span className="text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold animate-pulse">EN VIVO</span>
              ) : (
                <span className="text-[8px] bg-slate-800 text-slate-500 border border-slate-700 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">DESCONECTADO</span>
              )}
            </div>
            <h3 className="text-base font-extrabold text-slate-200 mt-0.5">
              {patientData ? `${patientData.first_name} ${patientData.last_name}` : displayName}
            </h3>
            <p className="text-[10px] text-slate-500">Expediente: {patientData?.medical_record_id || 'N/A'}</p>
          </div>
        </div>

        {/* 1. Tarjeta Pulso Cardíaco */}
        <div className={`p-6 rounded-3xl border transition-all duration-500 relative overflow-hidden group ${pulseStyle.border} ${pulseStyle.glow}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2.5">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center border transition-all ${
                pulseStatus === 'CRITICAL' ? 'bg-[#FF1744]/20 border-[#FF1744]/30 text-[#FF1744] animate-pulse-heart' : 'bg-[#1E2640] border-[#1E2640] text-slate-300'
              }`}>
                <Heart className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-slate-400">Ritmo Cardíaco</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider transition-all ${pulseStyle.badge}`}>
              {pulseStatus}
            </span>
          </div>

          <div className="my-6 flex items-baseline justify-center space-x-2">
            <span className={`text-6xl font-black tracking-tight transition-all duration-300 ${pulseStyle.text} ${
              pulseStatus === 'CRITICAL' ? 'animate-[pulse_0.7s_infinite]' : ''
            }`}>
              {isDeviceActive ? pulse : '--'}
            </span>
            <span className="text-base font-bold text-slate-500">bpm</span>
          </div>
          
          <div className="flex items-center justify-center space-x-2 text-[10px] text-slate-500">
            <Activity className="h-3.5 w-3.5 text-[#00F2FE] animate-pulse" />
            <span>Monitoreo continuo IoT activo</span>
          </div>
        </div>

        {/* 2. Tarjeta Oxigenación SpO2 */}
        <div className={`p-6 rounded-3xl border transition-all duration-500 relative overflow-hidden group ${spo2Style.border} ${spo2Style.glow}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2.5">
              <div className="h-10 w-10 bg-[#00F2FE]/10 rounded-xl flex items-center justify-center text-[#00F2FE] border border-[#00F2FE]/20">
                <Activity className="h-5 w-5 animate-pulse" />
              </div>
              <span className="text-xs font-bold text-slate-400">Saturación Oxígeno (SpO2)</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider transition-all ${spo2Style.badge}`}>
              {spo2Status}
            </span>
          </div>

          <div className="my-6 flex items-baseline justify-center space-x-1">
            <span className={`text-6xl font-black tracking-tight transition-all duration-300 ${spo2Style.text}`}>
              {isDeviceActive ? spo2 : '--'}
            </span>
            <span className="text-base font-bold text-slate-500">%</span>
          </div>
          
          <div className="w-full bg-[#1E2640]/55 h-1.5 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${
              spo2Status === 'CRITICAL' ? 'bg-[#FF1744]' : 'bg-[#00F2FE]'
            }`} style={{ width: `${spo2}%` }} />
          </div>
        </div>

        {/* 3. Tarjeta Temperatura */}
        <div className={`p-6 rounded-3xl border transition-all duration-500 relative overflow-hidden group ${tempStyle.border} ${tempStyle.glow}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2.5">
              <div className="h-10 w-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400 border border-amber-500/20">
                <Thermometer className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-slate-400">Temperatura Corporal</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider transition-all ${tempStyle.badge}`}>
              {tempStatus}
            </span>
          </div>

          <div className="my-6 flex items-baseline justify-center space-x-1">
            <span className={`text-6xl font-black tracking-tight transition-all duration-300 ${tempStyle.text}`}>
              {isDeviceActive ? temp : '--'}
            </span>
            <span className="text-base font-bold text-slate-500">°C</span>
          </div>
        </div>

      </div>

      {/* Footer inferior */}
      <footer className="text-center text-[10px] text-slate-600 relative z-10 py-2 max-w-md mx-auto w-full">
        <div className="flex items-center justify-center space-x-1.5">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Encriptación de grado clínico AES-256 habilitada.</span>
        </div>
      </footer>

    </div>
  );
};
export default PatientView;
