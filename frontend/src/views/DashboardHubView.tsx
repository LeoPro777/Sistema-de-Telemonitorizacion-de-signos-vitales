import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { 
  Users, Smartphone, UserCheck, AlertTriangle, 
  Activity, TrendingUp, RefreshCw,
  Heart, Zap, BadgeCheck
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import api from '../utils/api';
import toast from 'react-hot-toast';

// Datos de prueba para gráficos
const incidentData = [
  { name: 'Lun', incidentes: 2, criticas: 1 },
  { name: 'Mar', incidentes: 5, criticas: 3 },
  { name: 'Mié', incidentes: 3, criticas: 1 },
  { name: 'Jue', incidentes: 8, criticas: 4 },
  { name: 'Vie', incidentes: 4, criticas: 2 },
  { name: 'Sáb', incidentes: 1, criticas: 0 },
  { name: 'Dom', incidentes: 3, criticas: 1 },
];

const alertTrendData = [
  { name: 'Sem 1', alertas: 12 },
  { name: 'Sem 2', alertas: 19 },
  { name: 'Sem 3', alertas: 14 },
  { name: 'Sem 4', alertas: 25 },
];

export const DashboardHubView: React.FC = () => {
  const { user } = useAuthStore();
  const displayName = user 
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Usuario'
    : 'Usuario';
  const [widgets, setWidgets] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // 1. Cargar Configuración de Widgets y Caché Inicial de KPIs
  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Obtener widgets configurados para el usuario
      const configRes = await api.get('/dashboard/config');
      // Ordenar por position_order
      const sortedWidgets = configRes.data.visible_widgets.sort(
        (a: any, b: any) => a.position_order - b.position_order
      );
      setWidgets(sortedWidgets);

      // Obtener KPIs de caché precalculados
      const kpiRes = await api.get('/dashboard/kpis');
      setKpis(kpiRes.data.cached_metrics);
      
      setLastUpdate(new Date().toLocaleTimeString());
      setIsLoading(false);
    } catch (err: any) {
      toast.error('Error al cargar la consola del Dashboard');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // 2. Sistema de actualización independiente para cada widget según `refresh_interval_ms`
  useEffect(() => {
    if (widgets.length === 0) return;

    const timers: any[] = [];

    widgets.forEach((widget) => {
      const interval = setInterval(async () => {
        try {
          // Consultar KPIs específicos de caché para actualizar
          const kpiRes = await api.get('/dashboard/kpis');
          const freshKpis = kpiRes.data.cached_metrics;
          
          setKpis((prevKpis: any) => ({
            ...prevKpis,
            [widget.widget_id]: freshKpis[widget.widget_id],
            // También actualiza alertas críticas relacionadas
            ...freshKpis
          }));
          
          // Debug o feedback silencioso en consola
          console.log(`Widget "${widget.widget_id}" actualizado automáticamente.`);
        } catch (err) {
          console.error(`Error actualizando widget de forma independiente:`, err);
        }
      }, widget.refresh_interval_ms);

      timers.push(interval);
    });

    return () => {
      timers.forEach((t) => clearInterval(t));
    };
  }, [widgets]);

  const handleManualRefresh = () => {
    loadDashboardData();
    toast.success('Widgets de telemetría sincronizados manualmente');
  };

  if (isLoading && widgets.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-semibold tracking-wide">Cargando módulos de telemetría biométrica...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Saludo y Top del Dashboard */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] text-[#D4AF37] tracking-[0.2em] font-bold uppercase block mb-1">
            CONSOLA CENTRALIZADA
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Hola, Dr/Administrador {displayName}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Caché precalculada. Última actualización general: <strong className="text-slate-300">{lastUpdate}</strong>.
          </p>
        </div>

        <button
          onClick={handleManualRefresh}
          className="px-4 py-2 bg-[#1E2640] hover:bg-[#1E2640]/80 text-[#D4AF37] text-xs font-semibold rounded-xl border border-[#D4AF37]/25 flex items-center space-x-2 transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Sincronizar Caché</span>
        </button>
      </div>

      {/* REJILLA DE WIDGETS DINÁMICOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {widgets.map((widget) => {
          
          // Renderizado condicional según widget_id
          switch (widget.widget_id) {
            
            // WIDGET 1: TOTAL PACIENTES (Común/Admin)
            case 'total_patients':
            case 'my_patients':
            case 'client_patients': {
              const value = kpis.total_patients || kpis.my_patients || kpis.client_patients || 0;
              return (
                <div key={widget.widget_id} className="bg-glass p-6 rounded-3xl border border-[#1E2640] hover:border-[#D4AF37]/30 transition-all flex flex-col justify-between group relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div className="h-12 w-12 bg-gradient-to-br from-[#00F2FE]/10 to-[#00A7B5]/10 rounded-2xl flex items-center justify-center text-[#00F2FE] border border-[#00F2FE]/20">
                      <Users className="h-5 w-5 animate-pulse" />
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Caché</span>
                  </div>
                  
                  <div className="my-5">
                    <span className="text-3xl md:text-4xl font-extrabold tracking-tight text-white block">
                      {value}
                    </span>
                    <span className="text-xs font-bold text-slate-300 block mt-1">
                      {widget.widget_id === 'my_patients' ? 'Pacientes Asignados' : 'Pacientes Activos'}
                    </span>
                  </div>

                  <div className="flex items-center text-[10px] text-[#00F2FE] font-bold space-x-1">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>+12% esta semana</span>
                  </div>
                </div>
              );
            }

            // WIDGET 2: DISPOSITIVOS ACTIVOS
            case 'active_devices': {
              const value = kpis.active_devices || 0;
              return (
                <div key={widget.widget_id} className="bg-glass p-6 rounded-3xl border border-[#1E2640] hover:border-[#D4AF37]/30 transition-all flex flex-col justify-between relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div className="h-12 w-12 bg-gradient-to-br from-[#D4AF37]/10 to-[#AA820A]/10 rounded-2xl flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/20">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase font-mono">IoT</span>
                  </div>

                  <div className="my-5">
                    <span className="text-3xl md:text-4xl font-extrabold tracking-tight text-white block">
                      {value}
                    </span>
                    <span className="text-xs font-bold text-slate-300 block mt-1">
                      Dispositivos en Red ESP32
                    </span>
                  </div>

                  <div className="flex items-center text-[10px] text-emerald-400 font-bold space-x-1.5">
                    <Zap className="h-3.5 w-3.5 text-[#D4AF37] animate-bounce" />
                    <span>99.8% Tasa de Ping</span>
                  </div>
                </div>
              );
            }

            // WIDGET 3: ASPIRANTES PENDIENTES
            case 'pending_applicants': {
              const value = kpis.pending_applicants || 0;
              return (
                <div key={widget.widget_id} className="bg-glass p-6 rounded-3xl border border-[#1E2640] hover:border-[#D4AF37]/30 transition-all flex flex-col justify-between relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div className="h-12 w-12 bg-gradient-to-br from-[#D4AF37]/10 to-transparent rounded-2xl flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/20">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] text-[#FF1744] font-bold uppercase animate-pulse">Alerta</span>
                  </div>

                  <div className="my-5">
                    <span className="text-3xl md:text-4xl font-extrabold tracking-tight text-white block">
                      {value}
                    </span>
                    <span className="text-xs font-bold text-slate-300 block mt-1">
                      Aspirantes Auditándose
                    </span>
                  </div>

                  <div className="flex items-center text-[10px] text-slate-500 font-bold">
                    <span>Requiere revisión manual</span>
                  </div>
                </div>
              );
            }

            // WIDGET 4: ALERTAS CLÍNICAS CRÍTICAS / ACTIVAS
            case 'active_alerts':
            case 'critical_alerts': {
              const value = kpis.active_alerts || kpis.critical_alerts || kpis.critical_alerts_count || 0;
              return (
                <div key={widget.widget_id} className={`p-6 rounded-3xl border transition-all flex flex-col justify-between relative overflow-hidden ${
                  value > 0 
                    ? 'border-[#FF1744]/40 bg-[#FF1744]/5 shadow-[0_0_15px_rgba(255,23,68,0.1)]' 
                    : 'bg-glass border-[#1E2640]'
                }`}>
                  <div className="flex justify-between items-start">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border ${
                      value > 0 
                        ? 'bg-[#FF1744]/25 border-[#FF1744]/40 text-[#FF1744]' 
                        : 'bg-[#1E2640] border-[#1E2640] text-slate-400'
                    }`}>
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Clínico</span>
                  </div>

                  <div className="my-5">
                    <span className={`text-3xl md:text-4xl font-extrabold tracking-tight block ${
                      value > 0 ? 'text-[#FF1744] text-glow-red animate-pulse' : 'text-white'
                    }`}>
                      {value}
                    </span>
                    <span className="text-xs font-bold text-slate-300 block mt-1">
                      Alertas Activas
                    </span>
                  </div>

                  <div className="flex items-center text-[10px] font-bold">
                    {value > 0 ? (
                      <span className="text-[#FF1744] animate-pulse">¡Respuesta Requerida!</span>
                    ) : (
                      <span className="text-emerald-400">Todo normal</span>
                    )}
                  </div>
                </div>
              );
            }

            // WIDGET 5: CASOS RESUELTOS HOY
            case 'resolved_today': {
              const value = kpis.resolved_today || 0;
              return (
                <div key={widget.widget_id} className="bg-glass p-6 rounded-3xl border border-[#1E2640] hover:border-[#D4AF37]/30 transition-all flex flex-col justify-between relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div className="h-12 w-12 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                      <BadgeCheck className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Acciones</span>
                  </div>

                  <div className="my-5">
                    <span className="text-3xl md:text-4xl font-extrabold tracking-tight text-white block">
                      {value}
                    </span>
                    <span className="text-xs font-bold text-slate-300 block mt-1">
                      Alertas Resueltas Hoy
                    </span>
                  </div>

                  <div className="flex items-center text-[10px] text-emerald-400 font-bold">
                    <span>100% efectividad de resolución</span>
                  </div>
                </div>
              );
            }

            // WIDGET 6: CONTRATO COMERCIAL (Cliente)
            case 'contract_health': {
              const value = kpis.contract_health || 100;
              return (
                <div key={widget.widget_id} className="bg-glass p-6 rounded-3xl border border-[#1E2640] hover:border-[#D4AF37]/30 transition-all flex flex-col justify-between relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div className="h-12 w-12 bg-gradient-to-br from-[#D4AF37]/10 to-transparent rounded-2xl flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/20">
                      <Activity className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">SLA</span>
                  </div>

                  <div className="my-5">
                    <span className="text-3xl md:text-4xl font-extrabold tracking-tight text-white block">
                      {value}%
                    </span>
                    <span className="text-xs font-bold text-slate-300 block mt-1">
                      Salud del Servicio (SLA)
                    </span>
                  </div>

                  <div className="flex items-center text-[10px] text-[#D4AF37] font-bold">
                    <span>Acuerdo operacional óptimo</span>
                  </div>
                </div>
              );
            }

            default:
              return null;
          }
        })}
      </div>

      {/* SECCIÓN DE GRÁFICOS Y ANALÍTICAS DE ALTA GAMA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico 1: Historial de Incidentes Semanales (Ocupa 2 columnas) */}
        <div className="bg-glass p-6 rounded-3xl border border-[#1E2640] lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-100">Bitácora de Incidentes Semanales</h3>
              <p className="text-[10px] text-slate-500 mt-1">Conteo agregado de telemetría alterada y llamadas de código rojo.</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1E2640] border border-[#D4AF37]/20 text-[#D4AF37]">
              Módulos Activos
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incidentData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncidentes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00F2FE" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00F2FE" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorCriticas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF1744" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#FF1744" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2640" vertical={false} />
                <XAxis dataKey="name" stroke="#5E6A8A" fontSize={11} tickLine={false} />
                <YAxis stroke="#5E6A8A" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F1420', border: '1px solid #1E2640', borderRadius: '12px' }}
                  labelStyle={{ color: '#94A3B8', fontWeight: 'bold', fontSize: '11px' }}
                />
                <Bar dataKey="incidentes" fill="url(#colorIncidentes)" radius={[4, 4, 0, 0]} barSize={14} name="Alertas Amarillas" />
                <Bar dataKey="criticas" fill="url(#colorCriticas)" radius={[4, 4, 0, 0]} barSize={14} name="Crisis Críticas (ECG)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Tendencia de Alertas de Hardware (1 columna) */}
        <div className="bg-glass p-6 rounded-3xl border border-[#1E2640] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-100">Tendencia Mensual</h3>
                <p className="text-[10px] text-slate-500 mt-1">Fluctuación de registros históricos.</p>
              </div>
              <div className="h-8 w-8 bg-[#D4AF37]/5 rounded-lg flex items-center justify-center border border-[#D4AF37]/15">
                <Heart className="h-4.5 w-4.5 text-[#D4AF37] animate-pulse" />
              </div>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={alertTrendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAlertsTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2640" vertical={false} />
                  <XAxis dataKey="name" stroke="#5E6A8A" fontSize={10} tickLine={false} />
                  <YAxis stroke="#5E6A8A" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0F1420', border: '1px solid #1E2640', borderRadius: '10px' }}
                    labelStyle={{ color: '#94A3B8', fontSize: '10px' }}
                  />
                  <Area type="monotone" dataKey="alertas" stroke="#D4AF37" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAlertsTrend)" name="Historial de telemetría" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border-t border-[#1E2640] pt-4 mt-4 flex justify-between items-center text-xs">
            <span className="text-slate-400">Estado del Cache del Kernel</span>
            <span className="text-[#00F2FE] font-bold flex items-center space-x-1">
              <span>Sincronizado</span>
              <BadgeCheck className="h-4 w-4" />
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};
export default DashboardHubView;
