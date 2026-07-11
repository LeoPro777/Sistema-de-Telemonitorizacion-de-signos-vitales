import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { RefreshCw } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { DoctorDashboard } from './DoctorDashboard';
import { ClientDashboard } from './ClientDashboard';
import { AdminDashboard } from './AdminDashboard';
import { useTour } from '../hooks/useTour';

export const DashboardHubView: React.FC = () => {
  const { user } = useAuthStore();
  const [role, setRole] = useState<string>('');
  const [layoutVersion, setLayoutVersion] = useState<string>('1.0.0');
  const [kpis, setKpis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // Configuración del Product Tour
  const tourSteps = [
    {
      element: '#welcome-header',
      popover: {
        title: '¡Bienvenido a AURA!',
        description: 'Esta es tu consola de telemonitoreo central. Aquí puedes ver el resumen general de pacientes, doctores, dispositivos y alertas activas en tiempo real.',
        position: 'bottom'
      }
    },
    {
      element: '#sidebar-logo',
      popover: {
        title: 'Ecosistema de Monitoreo',
        description: 'AURA consolida los datos biométricos de los pacientes transmitidos desde hardware IoT y ESP32.',
        position: 'right'
      }
    },
    {
      element: '#sidebar-nav',
      popover: {
        title: 'Navegación de Módulos',
        description: 'Accede a la lista de pacientes, gestión técnica de dispositivos IoT, expedientes de médicos, logs de auditoría forense y centro de soporte.',
        position: 'right'
      }
    },
    {
      element: '#bell-notifications',
      popover: {
        title: 'Centro de Alertas Críticas',
        description: 'La campana parpadea en rojo y activa la alarma médica sonora si hay pacientes con constantes vitales críticas. Desde aquí puedes resolverlas directamente.',
        position: 'bottom'
      }
    },
    {
      element: '#settings-dropdown-btn',
      popover: {
        title: 'Ajustes y Preferencias',
        description: 'Configura el volumen del sintetizador acústico de alarmas, los estilos de visualización, tus datos de perfil o accede al Centro de Ayuda.',
        position: 'bottom'
      }
    },
    {
      element: '#refresh-kpis-btn',
      popover: {
        title: 'Sincronizar Panel',
        description: 'Sincroniza la caché de métricas y KPIs con la base de datos MongoDB al instante.',
        position: 'bottom'
      }
    }
  ];

  useTour('dashboard_tour', tourSteps);

  const displayName = user 
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Usuario'
    : 'Usuario';

  // 1. Cargar datos de inicialización del dashboard y de KPIs
  const loadDashboardData = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      
      // Llamada de inicialización por Stateful Cookie a /api/v1/dashboard/init
      const initRes = await api.get('/v1/dashboard/init');
      setRole(initRes.data.role);
      setLayoutVersion(initRes.data.layout_version);

      // Cargar KPIs precalculados
      const kpiRes = await api.get('/dashboard/kpis');
      setKpis(kpiRes.data.cached_metrics);
      
      setLastUpdate(new Date().toLocaleTimeString('es-VE', { timeZone: 'America/Caracas' }));
      setIsLoading(false);
    } catch (err: any) {
      console.error(err);
      toast.error('Error al inicializar la consola del Dashboard');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // 2. Sistema de actualización periódica para telemetría en tiempo real
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboardData(true);
    }, 10000); // Sincroniza telemetría cada 10 segundos en segundo plano

    const handleKpisUpdated = () => {
      loadDashboardData(true);
    };
    window.addEventListener('kpis-updated', handleKpisUpdated);

    return () => {
      clearInterval(interval);
      window.removeEventListener('kpis-updated', handleKpisUpdated);
    };
  }, []);

  const handleManualRefresh = () => {
    loadDashboardData();
    toast.success('Consola de telemetría sincronizada');
  };

  if (isLoading || !kpis) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-semibold tracking-wide">Cargando consola de telemetría biométrica...</p>
      </div>
    );
  }

  // Renderizado dinámico del dashboard según el UserRole retornado por el backend
  const renderDashboardByRole = () => {
    switch (role) {
      case 'ADMIN':
        return <AdminDashboard kpis={kpis} />;
      case 'DOCTOR':
        return <DoctorDashboard kpis={kpis} />;
      case 'CLIENT':
        return <ClientDashboard kpis={kpis} />;
      default:
        return (
          <div className="bg-[#1E2640] p-8 rounded-3xl border border-[#FF1744]/30 text-center">
            <h3 className="text-lg font-bold text-[#FF1744]">Rol no soportado</h3>
            <p className="text-sm text-slate-300 mt-2">Su rol de usuario ({role}) no cuenta con una consola de telemetría asignada.</p>
          </div>
        );
    }
  };

  const getRoleLabel = () => {
    if (role === 'ADMIN') return 'Administrador Global';
    if (role === 'DOCTOR') return 'Médico Clínico';
    if (role === 'CLIENT') return 'Gestor de Activos';
    return role;
  };

  return (
    <div className="space-y-8">
      
      {/* Saludo y Cabecera General del Dashboard */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#1E2640]/55 pb-6">
        <div id="welcome-header">
          <span className="text-[10px] text-[#D4AF37] tracking-[0.2em] font-bold uppercase block mb-1">
            CONSOLA DE TELEMONITOREO • {getRoleLabel()}
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            Hola, {displayName}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Diseño Premium Dark • Layout v{layoutVersion} • Sincronizado: <strong className="text-slate-300">{lastUpdate}</strong>.
          </p>
        </div>

        <button
          id="refresh-kpis-btn"
          onClick={handleManualRefresh}
          className="px-4 py-2 bg-[#1E2640] hover:bg-[#1E2640]/80 text-[#D4AF37] text-xs font-semibold rounded-xl border border-[#D4AF37]/25 flex items-center space-x-2 transition-all shadow-md active:scale-95"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Sincronizar Caché</span>
        </button>
      </div>

      {/* Renderizado del Dashboard segregado */}
      {renderDashboardByRole()}

    </div>
  );
};

export default DashboardHubView;
