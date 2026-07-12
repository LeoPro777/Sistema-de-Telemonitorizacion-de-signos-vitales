import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Grid, List as ListIcon, AlertTriangle, 
  Activity, Heart, Thermometer, User, CheckCircle2, ChevronRight 
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import useTour from '../hooks/useTour';

export const PatientsView: React.FC = () => {
  const navigate = useNavigate();

  // Configuración del Product Tour
  const tourSteps = [
    {
      element: '#patients-header',
      popover: {
        title: 'Consola de Pacientes',
        description: 'Aquí puedes supervisar la nómina médica de pacientes del sistema. Cada tarjeta muestra constantes de pulso, SpO2 y temperatura en tiempo real.',
        position: 'bottom'
      }
    },
    {
      element: '#view-toggle-btn',
      popover: {
        title: 'Alternar Vista',
        description: 'Cambia entre vista de tarjetas de alta fidelidad o tabla clínica de alta densidad para una lectura rápida.',
        position: 'bottom'
      }
    },
    {
      element: '#patients-search',
      popover: {
        title: 'Búsqueda de Pacientes',
        description: 'Busca expedientes, RUN o nombres de pacientes de manera instantánea.',
        position: 'bottom'
      }
    },
    {
      element: '#criticality-filters',
      popover: {
        title: 'Filtrado por Gravedad',
        description: 'Filtra la nómina para ver solo pacientes críticos con alertas activas o pacientes estables con signos normales.',
        position: 'bottom'
      }
    }
  ];

  useTour('patients_tour', tourSteps);
  
  // Estados de datos
  const [patients, setPatients] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [search, setSearch] = useState('');
  const [criticality, setCriticality] = useState<string>('');
  
  // Preferencias de vista (CARDS o LIST)
  const [viewType, setViewType] = useState<'CARDS' | 'LIST'>('CARDS');
  const [isLoading, setIsLoading] = useState(true);

  // Estado dinámico en vivo y Referencia para conexiones WS
  const [liveData, setLiveData] = useState<Record<string, { cache: any, hasAlert: boolean, isDeviceActive: boolean }>>({});
  const wsInstancesRef = useRef<Map<string, { ws: WebSocket | null, timeoutId: any }>>(new Map());

  const fetchPatients = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/patients', {
        params: {
          search: search || undefined,
          criticality: criticality || undefined,
          page,
          limit
        }
      });
      setPatients(response.data.patients);
      setTotal(response.data.total);
      setIsLoading(false);
    } catch (err) {
      toast.error('Error al cargar la nómina de pacientes.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Debounce de búsqueda o recarga directa
    const delayDebounce = setTimeout(() => {
      fetchPatients();
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [search, criticality, page]);

  // Manejador del ciclo de vida de WebSockets por paciente visible
  useEffect(() => {
    const currentMap = wsInstancesRef.current;
    const currentIds = new Set(patients.map(p => p._id));

    // 1. Limpiar WebSockets de pacientes que ya no están en esta página
    currentMap.forEach((instance, id) => {
      if (!currentIds.has(id)) {
        if (instance.ws) {
          instance.ws.close();
        }
        if (instance.timeoutId) {
          clearTimeout(instance.timeoutId);
        }
        currentMap.delete(id);
      }
    });

    // 2. Establecer conexiones WebSockets para los nuevos pacientes cargados
    patients.forEach(patient => {
      if (!currentMap.has(patient._id)) {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const baseHost = (import.meta as any).env.VITE_WS_BASE_URL 
          ? (import.meta as any).env.VITE_WS_BASE_URL.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '')
          : window.location.host;
        const wsUrl = `${wsProtocol}//${baseHost}/ws/vitals/${patient._id}`;

        let ws: WebSocket | null = null;
        try {
          ws = new WebSocket(wsUrl);
        } catch(err) {
          console.error("No se pudo iniciar WS para paciente", patient._id, err);
          return;
        }

        const resetTimeout = () => {
          const inst = currentMap.get(patient._id);
          if (inst?.timeoutId) clearTimeout(inst.timeoutId);
          
          const storedTimeout = localStorage.getItem('aura_inactivity_timeout');
          const timeoutMs = storedTimeout ? parseInt(storedTimeout) : 30000;
          
          const newTimeoutId = setTimeout(() => {
            setLiveData(prev => ({
              ...prev,
              [patient._id]: { ...(prev[patient._id] || {}), isDeviceActive: false }
            }));
          }, timeoutMs);
          
          if (inst) inst.timeoutId = newTimeoutId;
        };

        ws.onopen = () => {
          console.log(`[PatientsView] WS Conectado: ${patient._id}`);
          setLiveData(prev => ({
            ...prev,
            [patient._id]: { 
              cache: patient.last_telemetry_cache, 
              hasAlert: patient.has_active_alert, 
              isDeviceActive: patient.is_online === true // Respeta el estado que viene de la BDD
            }
          }));
          resetTimeout();
        };

        ws.onmessage = (event) => {
          if (event.data === 'pong') return;
          try {
            const data = JSON.parse(event.data);
            if (data.error) return; // Sesión inválida o faltante
            
            setLiveData(prev => ({
              ...prev,
              [patient._id]: {
                cache: data.cache,
                hasAlert: data.status === 'CRITICAL',
                isDeviceActive: true
              }
            }));
            resetTimeout();
          } catch (e) {}
        };

        ws.onclose = () => {
          console.log(`[PatientsView] WS Desconectado: ${patient._id}`);
          setLiveData(prev => ({
            ...prev,
            [patient._id]: { ...(prev[patient._id] || {}), isDeviceActive: false }
          }));
        };

        currentMap.set(patient._id, { ws, timeoutId: null });
      }
    });

  }, [patients]);

  // Limpieza global de WebSockets al desmontar la vista
  useEffect(() => {
    return () => {
      wsInstancesRef.current.forEach(instance => {
        if (instance.ws) instance.ws.close();
        if (instance.timeoutId) clearTimeout(instance.timeoutId);
      });
      wsInstancesRef.current.clear();
    };
  }, []);

  const handleToggleViewType = () => {
    const nextView = viewType === 'CARDS' ? 'LIST' : 'CARDS';
    setViewType(nextView);
    toast.success(`Consola alternada a vista de ${nextView === 'CARDS' ? 'Tarjetas' : 'Tabla'}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CRITICAL':
        return 'text-[#FF1744]';
      case 'WARNING':
        return 'text-[#FFD700]';
      default:
        return 'text-[#00F2FE]';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Cabecera superior y barra de herramientas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] text-[#D4AF37] tracking-[0.2em] font-bold uppercase block mb-1">
            MÓDULO DE GESTIÓN MÉDICA
          </span>
          <h2 id="patients-header" className="text-2xl md:text-3xl font-extrabold tracking-tight">Consola de Pacientes</h2>
          <p className="text-xs text-slate-400 mt-1">Supervisión e inspección de expedientes vitales en red.</p>
        </div>

        {/* Alternador de Vista (Grid / Tabla) */}
        <button
          id="view-toggle-btn"
          onClick={handleToggleViewType}
          className="px-4 py-2 bg-[#1E2640] hover:bg-[#1E2640]/80 text-[#D4AF37] text-xs font-semibold rounded-xl border border-[#D4AF37]/25 flex items-center space-x-2 transition-all self-start md:self-auto"
        >
          {viewType === 'CARDS' ? (
            <>
              <ListIcon className="h-4 w-4" />
              <span>Ver en Tabla</span>
            </>
          ) : (
            <>
              <Grid className="h-4 w-4" />
              <span>Ver en Tarjetas</span>
            </>
          )}
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-glass p-3 md:p-5 rounded-2xl md:rounded-3xl border border-[#1E2640] flex flex-col sm:flex-row gap-3 items-center justify-between">
        
        {/* Buscador Semántico */}
        <div className="relative w-full sm:w-72 md:w-96">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="h-4.5 w-4.5" />
          </div>
          <input
            id="patients-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por expediente, RUN o nombre..."
            className="w-full pl-10 pr-4 py-2 bg-[#0B0F19] border border-[#1E2640] rounded-xl text-xs focus:border-[#D4AF37] outline-none transition-all placeholder:text-slate-600"
          />
        </div>

        {/* Píldoras de Filtrado por Criticidad */}
        <div id="criticality-filters" className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto py-0.5 justify-start sm:justify-end">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:inline">Criticidad:</span>
          
          <button
            onClick={() => setCriticality('')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
              criticality === '' 
                ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-md shadow-[#D4AF37]/10' 
                : 'bg-[#0B0F19] border-[#1E2640] text-slate-400 hover:text-slate-200'
            }`}
          >
            Todos
          </button>
          
          <button
            onClick={() => setCriticality('CRITICAL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center space-x-1 ${
              criticality === 'CRITICAL' 
                ? 'bg-[#FF1744] border-[#FF1744] text-white shadow-md shadow-[#FF1744]/15 animate-pulse' 
                : 'bg-[#0B0F19] border-[#1E2640] text-[#FF1744] hover:bg-[#FF1744]/5'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Crítico</span>
          </button>
          
          <button
            onClick={() => setCriticality('NORMAL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center space-x-1 ${
              criticality === 'NORMAL' 
                ? 'bg-[#00F2FE]/20 border-[#00F2FE]/40 text-[#00F2FE] shadow-md shadow-[#00F2FE]/10' 
                : 'bg-[#0B0F19] border-[#1E2640] text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>Normal</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-[40vh] flex flex-col items-center justify-center space-y-4">
          <div className="w-8 h-8 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-semibold tracking-widest uppercase">Consultando base NoSQL...</p>
        </div>
      ) : patients.length === 0 ? (
        <div className="bg-glass p-12 text-center rounded-3xl border border-[#1E2640]">
          <AlertTriangle className="h-10 w-10 text-[#FFD700] mx-auto mb-4" />
          <h4 className="text-base font-bold text-slate-200">No se encontraron pacientes</h4>
          <p className="text-xs text-slate-500 mt-1">Intente cambiar los parámetros de búsqueda o de severidad.</p>
        </div>
      ) : (
        <>
          {/* MODO 1: GRId DE TARJETAS (CARDS) */}
          {viewType === 'CARDS' && (
            <>
              {/* Vista para Pantallas Grandes (Desktop Grid) */}
              <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {patients.map((patient) => {
                  const live = liveData[patient._id];
                  const cache = live?.cache || patient.last_telemetry_cache || {};
                  const hasAlert = live ? live.hasAlert : patient.has_active_alert;
                  const isDeviceActive = live !== undefined ? live.isDeviceActive : (patient.is_online === true);
                  
                  return (
                    <button
                      key={patient._id}
                      onClick={() => navigate(`/patients/${patient._id}`)}
                      className={`bg-glass p-6 rounded-3xl border text-left flex flex-col justify-between transition-all duration-300 hover:scale-[1.03] group outline-none relative overflow-hidden ${
                        !isDeviceActive ? 'grayscale opacity-60' : ''
                      } ${
                        hasAlert 
                          ? 'border-[#FF1744]/40 bg-[#FF1744]/5 shadow-[0_0_15px_rgba(255,23,68,0.08)]' 
                          : 'border-[#1E2640] hover:border-[#D4AF37]/30'
                      }`}
                    >
                      <div>
                        {/* Cabecera Tarjeta: Avatar reactivo */}
                        <div className="flex justify-between items-start">
                          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border transition-all ${
                            hasAlert 
                              ? 'bg-[#FF1744]/20 border-[#FF1744] text-[#FF1744] animate-pulse' 
                              : 'bg-[#1E2640] border-[#1E2640] text-slate-400 group-hover:text-slate-200'
                          }`}>
                            {hasAlert ? <AlertTriangle className="h-5 w-5 animate-bounce" /> : <User className="h-5.5 w-5.5" />}
                          </div>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-black/30 border border-[#1E2640] text-slate-500">
                            {patient.medical_record_id}
                          </span>
                        </div>

                        {/* Nombre y Expediente */}
                        <div className="mt-4">
                          <h4 className="text-sm font-extrabold text-slate-200 group-hover:text-white transition-colors truncate">
                            {patient.first_name} {patient.last_name}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">RUN: {patient.national_id}</p>
                        </div>
                      </div>

                      {/* Resumen de telemetría cacheada (3 barras horizontales) */}
                      <div className="my-6 space-y-3.5 border-y border-[#1E2640]/50 py-4">
                        
                        {/* Barra 1: heart_rate */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-500 font-semibold flex items-center space-x-1">
                              <Heart className="h-3 w-3 text-[#FF1744]" />
                              <span>Pulso</span>
                            </span>
                            <strong className={getStatusColor(cache.heart_rate?.status)}>
                              {cache.heart_rate?.value ? `${cache.heart_rate.value} bpm` : 'N/A'}
                            </strong>
                          </div>
                          <div className="w-full bg-black/30 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                cache.heart_rate?.status === 'CRITICAL' ? 'bg-[#FF1744] animate-pulse' : 'bg-[#FF1744]'
                              }`}
                              style={{ width: `${Math.min((cache.heart_rate?.value || 0) / 120 * 100, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Barra 2: spo2 */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-500 font-semibold flex items-center space-x-1">
                              <Activity className="h-3 w-3 text-[#00F2FE]" />
                              <span>SpO2</span>
                            </span>
                            <strong className={getStatusColor(cache.spo2?.status)}>
                              {cache.spo2?.value ? `${cache.spo2.value}%` : 'N/A'}
                            </strong>
                          </div>
                          <div className="w-full bg-black/30 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                cache.spo2?.status === 'CRITICAL' ? 'bg-[#FF1744] animate-pulse' : 'bg-[#00F2FE]'
                              }`}
                              style={{ width: `${cache.spo2?.value || 0}%` }}
                            />
                          </div>
                        </div>

                        {/* Barra 3: temperature */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-500 font-semibold flex items-center space-x-1">
                              <Thermometer className="h-3 w-3 text-amber-400" />
                              <span>Temp</span>
                            </span>
                            <strong className={getStatusColor(cache.temperature?.status)}>
                              {cache.temperature?.value ? `${cache.temperature.value}°C` : 'N/A'}
                            </strong>
                          </div>
                          <div className="w-full bg-black/30 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                cache.temperature?.status === 'CRITICAL' ? 'bg-[#FF1744] animate-pulse' : 'bg-[#FFB300]'
                              }`}
                              style={{ width: `${((cache.temperature?.value || 36.5) - 34) / 6 * 100}%` }}
                            />
                          </div>
                        </div>

                      </div>

                      {/* Footer Tarjeta: Acceso rápido */}
                      <div className="text-[10px] font-semibold text-slate-500 group-hover:text-[#D4AF37] flex items-center justify-between w-full transition-colors">
                        <span>Inspeccionar expediente</span>
                        <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                      </div>

                    </button>
                  );
                })}
              </div>

              {/* Vista Compacta para Móviles (Mobile List Layout) */}
              <div className="flex flex-col gap-3 sm:hidden">
                {patients.map((patient) => {
                  const live = liveData[patient._id];
                  const cache = live?.cache || patient.last_telemetry_cache || {};
                  const hasAlert = live ? live.hasAlert : patient.has_active_alert;
                  const isDeviceActive = live !== undefined ? live.isDeviceActive : (patient.is_online === true);
                  
                  return (
                    <button
                      key={patient._id}
                      onClick={() => navigate(`/patients/${patient._id}`)}
                      className={`bg-glass p-3 rounded-2xl border text-left flex flex-col gap-2 transition-all outline-none relative overflow-hidden ${
                        !isDeviceActive ? 'grayscale opacity-60' : ''
                      } ${
                        hasAlert 
                          ? 'border-[#FF1744]/45 bg-[#FF1744]/5 shadow-[0_0_10px_rgba(255,23,68,0.08)]' 
                          : 'border-[#1E2640] hover:border-[#D4AF37]/35'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className={`h-8 w-8 rounded-xl flex items-center justify-center border flex-shrink-0 ${
                            hasAlert 
                              ? 'bg-[#FF1744]/20 border-[#FF1744] text-[#FF1744] animate-pulse' 
                              : 'bg-[#1E2640] border-[#1E2640] text-slate-400'
                          }`}>
                            {hasAlert ? <AlertTriangle className="h-4 w-4 animate-bounce" /> : <User className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-200 truncate">
                              {patient.first_name} {patient.last_name}
                            </h4>
                            <p className="text-[9px] text-slate-500 font-mono">
                              {patient.medical_record_id} &bull; RUN: {patient.national_id}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-500 flex-shrink-0" />
                      </div>

                      {/* Mini Indicadores de Telemetría */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1E2640]/40">
                        {/* Pulso Mini Badge */}
                        <div className={`px-2 py-1 rounded-lg border flex items-center justify-between ${
                          cache.heart_rate?.status === 'CRITICAL' ? 'bg-[#FF1744]/15 border-[#FF1744]/35 text-[#FF1744] animate-pulse' :
                          cache.heart_rate?.status === 'WARNING' ? 'bg-[#FFD700]/15 border-[#FFD700]/30 text-[#FFD700]' : 'bg-[#0F1420] border-[#1E2640] text-slate-300'
                        } text-[9px] font-mono font-semibold`}>
                          <span className="flex items-center space-x-1">
                            <Heart className="h-3 w-3 text-[#FF1744]" />
                            <span className="text-[8px] text-slate-500 font-sans hidden xs:inline">BPM</span>
                          </span>
                          <span>{cache.heart_rate?.value || '--'}</span>
                        </div>

                        {/* SpO2 Mini Badge */}
                        <div className={`px-2 py-1 rounded-lg border flex items-center justify-between ${
                          cache.spo2?.status === 'CRITICAL' ? 'bg-[#FF1744]/15 border-[#FF1744]/35 text-[#FF1744] animate-pulse' :
                          cache.spo2?.status === 'WARNING' ? 'bg-[#FFD700]/15 border-[#FFD700]/30 text-[#FFD700]' : 'bg-[#0F1420] border-[#1E2640] text-[#00F2FE]'
                        } text-[9px] font-mono font-semibold`}>
                          <span className="flex items-center space-x-1">
                            <Activity className="h-3 w-3 text-[#00F2FE]" />
                            <span className="text-[8px] text-slate-500 font-sans hidden xs:inline">SpO2</span>
                          </span>
                          <span>{cache.spo2?.value ? `${cache.spo2.value}%` : '--'}</span>
                        </div>

                        {/* Temp Mini Badge */}
                        <div className={`px-2 py-1 rounded-lg border flex items-center justify-between ${
                          cache.temperature?.status === 'CRITICAL' ? 'bg-[#FF1744]/15 border-[#FF1744]/35 text-[#FF1744] animate-pulse' :
                          cache.temperature?.status === 'WARNING' ? 'bg-[#FFD700]/15 border-[#FFD700]/30 text-[#FFD700]' : 'bg-[#0F1420] border-[#1E2640] text-amber-400'
                        } text-[9px] font-mono font-semibold`}>
                          <span className="flex items-center space-x-1">
                            <Thermometer className="h-3 w-3 text-amber-400" />
                            <span className="text-[8px] text-slate-500 font-sans hidden xs:inline">T°</span>
                          </span>
                          <span>{cache.temperature?.value ? `${cache.temperature.value}°C` : '--'}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* MODO 2: TABLA DE ALTA DENSIDAD (LIST) */}
          {viewType === 'LIST' && (
            <div className="bg-glass rounded-3xl border border-[#1E2640] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0F1420] border-b border-[#1E2640] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-4 px-6">Paciente</th>
                      <th className="py-4 px-6 text-center">Expediente</th>
                      <th className="py-4 px-6 text-center">Frec. Cardiaca</th>
                      <th className="py-4 px-6 text-center">Saturación SpO2</th>
                      <th className="py-4 px-6 text-center">Temperatura</th>
                      <th className="py-4 px-6 text-center">Alerta Activa</th>
                      <th className="py-4 px-6 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2640]/40 text-xs md:text-sm">
                    {patients.map((patient) => {
                      const live = liveData[patient._id];
                      const cache = live?.cache || patient.last_telemetry_cache || {};
                      const hasAlert = live ? live.hasAlert : patient.has_active_alert;
                      const isDeviceActive = live !== undefined ? live.isDeviceActive : (patient.is_online === true);
                      
                      return (
                        <tr 
                          key={patient._id} 
                          className={`hover:bg-[#1E2640]/20 transition-all ${
                            !isDeviceActive ? 'grayscale opacity-60' : ''
                          } ${
                            hasAlert ? 'bg-[#FF1744]/2' : ''
                          }`}
                        >
                          {/* Col 1: Nombre */}
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-3">
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center border ${
                                hasAlert ? 'bg-[#FF1744]/20 border-[#FF1744] text-[#FF1744]' : 'bg-[#1E2640] border-[#1E2640] text-slate-400'
                              }`}>
                                <User className="h-4.5 w-4.5" />
                              </div>
                              <div>
                                <span className="font-bold text-slate-200 block">{patient.first_name} {patient.last_name}</span>
                                <span className="text-[10px] text-slate-500">RUN: {patient.national_id}</span>
                              </div>
                            </div>
                          </td>

                          {/* Col 2: Expediente */}
                          <td className="py-4 px-6 text-center">
                            <span className="font-mono text-xs px-2 py-1 bg-black/30 border border-[#1E2640] rounded text-slate-400">
                              {patient.medical_record_id}
                            </span>
                          </td>

                          {/* Col 3: Heart Rate */}
                          <td className="py-4 px-6 text-center font-semibold">
                            <span className={getStatusColor(cache.heart_rate?.status)}>
                              {cache.heart_rate?.value ? `${cache.heart_rate.value} bpm` : 'N/A'}
                            </span>
                          </td>

                          {/* Col 4: SpO2 */}
                          <td className="py-4 px-6 text-center font-semibold">
                            <span className={getStatusColor(cache.spo2?.status)}>
                              {cache.spo2?.value ? `${cache.spo2.value}%` : 'N/A'}
                            </span>
                          </td>

                          {/* Col 5: Temp */}
                          <td className="py-4 px-6 text-center font-semibold">
                            <span className={getStatusColor(cache.temperature?.status)}>
                              {cache.temperature?.value ? `${cache.temperature.value} °C` : 'N/A'}
                            </span>
                          </td>

                          {/* Col 6: Alerta Activa */}
                          <td className="py-4 px-6 text-center">
                            {hasAlert ? (
                              <span className="px-2 py-0.5 rounded-full bg-[#FF1744]/25 text-[#FF1744] border border-[#FF1744]/45 text-[9px] font-extrabold tracking-wider animate-pulse">
                                S.O.S.
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[9px] font-bold">
                                NORMAL
                              </span>
                            )}
                          </td>

                          {/* Col 7: Acciones */}
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => navigate(`/patients/${patient._id}`)}
                              className="px-3.5 py-1.5 bg-[#1E2640] hover:bg-[#D4AF37] hover:text-black font-semibold text-xs text-[#D4AF37] rounded-lg border border-[#D4AF37]/20 hover:border-[#D4AF37] transition-all"
                            >
                              Ficha
                            </button>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Paginación */}
          {total > limit && (
            <div className="flex justify-between items-center mt-6 px-2">
              <span className="text-xs text-slate-500">
                Mostrando {patients.length} de {total} pacientes
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-[#1E2640] text-[#D4AF37] disabled:opacity-40 disabled:cursor-not-allowed border border-[#D4AF37]/15 rounded-xl text-xs font-semibold hover:bg-[#1E2640]/80 transition-all"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage(prev => (prev * limit < total ? prev + 1 : prev))}
                  disabled={page * limit >= total}
                  className="px-4 py-2 bg-[#1E2640] text-[#D4AF37] disabled:opacity-40 disabled:cursor-not-allowed border border-[#D4AF37]/15 rounded-xl text-xs font-semibold hover:bg-[#1E2640]/80 transition-all"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
};
export default PatientsView;
