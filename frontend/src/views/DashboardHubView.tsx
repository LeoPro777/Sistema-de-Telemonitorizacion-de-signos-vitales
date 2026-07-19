import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { DoctorDashboard } from './DoctorDashboard';
import { ClientDashboard } from './ClientDashboard';
import { AdminDashboard } from './AdminDashboard';
import { useTour } from '../hooks/useTour';

export const DashboardHubView: React.FC = () => {
  const [role, setRole] = useState<string>('');
  const [kpis, setKpis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Configuración del Product Tour
  const tourSteps = [
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
    }
  ];

  useTour('dashboard_tour', tourSteps);

  // 1. Cargar datos de inicialización del dashboard y de KPIs
  const loadDashboardData = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      
      // Llamada de inicialización por Stateful Cookie a /api/v1/dashboard/init
      const initRes = await api.get('/v1/dashboard/init');
      setRole(initRes.data.role);

      // Cargar KPIs precalculados
      const kpiRes = await api.get('/dashboard/kpis');
      setKpis(kpiRes.data.cached_metrics);
      
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

  return (
    <div className="space-y-8">
      {/* Renderizado del Dashboard segregado */}
      {renderDashboardByRole()}
    </div>
  );
};

export default DashboardHubView;
