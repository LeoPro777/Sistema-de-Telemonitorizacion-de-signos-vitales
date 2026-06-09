import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Heart, Activity, Thermometer, ArrowLeft, Download,
  Settings, AlertTriangle, FileText, CheckCircle,
  Save, Database, History, Stethoscope, Clock, Loader
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer
} from 'recharts';
import api, { API_BASE_URL } from '../utils/api';
import vitalsSocket from '../utils/vitalsSocket';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

export const PatientDetailView: React.FC = () => {
  const { user } = useAuthStore();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Estados de datos del Paciente
  const [patient, setPatient] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'GRAFICOS' | 'ALERTAS' | 'FICHA'>('GRAFICOS');

  // Estados de control de tiempo (Segmentación y Línea de tiempo)
  const [timeWindow, setTimeWindow] = useState<number>(60);
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const timeWindowRef = React.useRef(timeWindow);
  const timeOffsetRef = React.useRef(timeOffset);

  useEffect(() => { timeWindowRef.current = timeWindow; }, [timeWindow]);
  useEffect(() => { timeOffsetRef.current = timeOffset; }, [timeOffset]);

  // Estados de asignación de recursos
  const [allDoctors, setAllDoctors] = useState<any[]>([]);
  const [allDevices, setAllDevices] = useState<any[]>([]);
  const [allClients, setAllClients] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');

  // Cargar opciones de asignación
  useEffect(() => {
    const fetchAssignmentOptions = async () => {
      try {
        const [docRes, devRes, cliRes] = await Promise.all([
          api.get('/doctors', { params: { limit: 100 } }),
          api.get('/devices', { params: { limit: 100 } }),
          api.get('/clients', { params: { limit: 100 } })
        ]);
        setAllDoctors(docRes.data.doctors || []);

        const currentDevId = patient?.assigned_device_id;
        const filteredDevices = (devRes.data.devices || []).filter(
          (d: any) => d.operational_status === 'AVAILABLE' || d._id === currentDevId
        );
        setAllDevices(filteredDevices);
        setAllClients(cliRes.data.clients || []);
      } catch (err) {
        console.error('Error al cargar opciones de asignación:', err);
      }
    };

    if (patient && user?.role === 'ADMIN') {
      fetchAssignmentOptions();
      setSelectedDoctorId(patient.assigned_doctor_id || '');
      setSelectedDeviceId(patient.assigned_device_id || '');
      setSelectedClientId(patient.client_id || '');
    }
  }, [patient?.assigned_doctor_id, patient?.assigned_device_id, patient?.client_id, user?.role]);

  const handleSaveAssignments = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      const payload = {
        assigned_doctor_id: selectedDoctorId || null,
        assigned_device_id: selectedDeviceId || null,
        client_id: selectedClientId || null
      };

      const response = await api.put(`/patients/${id}`, payload);
      setPatient(response.data.patient);
      toast.success('Recursos clínicos asignados con éxito.');
    } catch (err: any) {
      toast.error('Error al guardar asignaciones: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  // Estados para calibrar umbrales (Sliders reactivos)
  const [minBpm, setMinBpm] = useState(60);
  const [maxBpm, setMaxBpm] = useState(100);
  const [critSpo2, setCritSpo2] = useState(92);
  const [minTemp, setMinTemp] = useState(35.5);
  const [maxTemp, setMaxTemp] = useState(37.5);

  // Estados de edición de Ficha Clínica
  const [bloodType, setBloodType] = useState('O+');
  const [pathologiesText, setPathologiesText] = useState('');
  const [allergiesText, setAllergiesText] = useState('');
  const [notesText, setNotesText] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isWssConnected, setIsWssConnected] = useState(false);
  const [isDeviceActive, setIsDeviceActive] = useState(false);
  const [lastDataTimestamp, setLastDataTimestamp] = useState<number | null>(null);

  // Watchdog para detectar si el dispositivo dejó de emitir (desconexión)
  useEffect(() => {
    if (!lastDataTimestamp) return;
    const watchdog = setInterval(() => {
      const now = new Date().getTime();
      // Si pasan más de 15 segundos sin recibir datos (intervalo esperado es 10s), consideramos el dispositivo desconectado
      if (now - lastDataTimestamp > 15000) {
        setIsDeviceActive(false);
      }
    }, 2000);
    return () => clearInterval(watchdog);
  }, [lastDataTimestamp]);

  // Cargar expediente, historial y alertas
  const loadPatientData = async () => {
    if (!id) return;
    try {
      const pRes = await api.get(`/patients/${id}`);
      const pData = pRes.data;
      setPatient(pData);

      // Sincronizar sliders con los umbrales de la BD
      const thresh = pData.clinical_thresholds || {};
      setMinBpm(thresh.heart_rate?.min_bpm ?? 60);
      setMaxBpm(thresh.heart_rate?.max_bpm ?? 100);
      setCritSpo2(thresh.spo2?.critical_min_percent ?? 92);
      setMinTemp(thresh.temperature?.min_celsius ?? 35.5);
      setMaxTemp(thresh.temperature?.max_celsius ?? 37.5);

      // Sincronizar Ficha Clínica
      const hist = pData.medical_history_summary || {};
      setBloodType(hist.blood_type || 'O+');
      setPathologiesText((hist.pathologies || []).join(', '));
      setAllergiesText((hist.allergies || []).join(', '));
      setNotesText(hist.notes || '');

      // No cargamos history aquí, se encarga el useEffect de timeWindow/timeOffset

      // Obtener alertas
      const aRes = await api.get(`/patients/${id}/alerts`);
      setAlerts(aRes.data);

    } catch (err) {
      toast.error('Error al recuperar datos del expediente clínico.');
      navigate('/patients');
    }
  };

  useEffect(() => {
    loadPatientData();
  }, [id]);

  // Efecto para Cargar Historial Basado en timeWindow y timeOffset
  useEffect(() => {
    const fetchHistorySegment = async () => {
      if (!id || !patient) return;
      setIsLoadingHistory(true);
      try {
        const params: any = { limit: 1000 };
        const now = new Date();
        const endTime = new Date(now.getTime() - timeOffset * 1000);
        const startTime = new Date(endTime.getTime() - timeWindow * 1000);

        params.end_time = endTime.toISOString();
        params.start_time = startTime.toISOString();

        const hRes = await api.get(`/patients/${id}/vitals-history`, { params });
        setHistory(hRes.data.reverse());
      } catch (err) {
        console.error('Error fetching historical segment:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    // Debounce manual simple para el slider
    const timer = setTimeout(() => {
      fetchHistorySegment();
    }, 300);

    return () => clearTimeout(timer);
  }, [id, patient?.has_active_alert, timeWindow, timeOffset]);

  // Suscribirse a WebSockets para actualizaciones en tiempo real de los gráficos
  useEffect(() => {
    if (!id || !patient) return;

    vitalsSocket.connect(id, {
      onMessage: (message) => {
        const { telemetry, status, cache, new_alerts, timestamp } = message;
        
        // El dispositivo está emitiendo
        setIsDeviceActive(true);
        setLastDataTimestamp(new Date().getTime());

        // Añadir la nueva lectura al historial para actualizar el gráfico al vuelo
        const newReading = {
          timestamp: timestamp || new Date().toISOString(),
          telemetry: telemetry
        };

        setHistory((prev) => {
          // Congelar el gráfico si estamos viendo el pasado
          if (timeOffsetRef.current > 0) return prev;

          const next = [...prev, newReading];
          
          // Precisión de Inserción: Filtramos estrictamente por la ventana de tiempo (memoria real), 
          // no por cantidad fija de puntos, para soportar ráfagas de datos sin ofuscar/borrar el historial viejo.
          const windowMs = timeWindowRef.current * 1000;
          const cutoffTime = new Date().getTime() - windowMs;
          
          let filtered = next.filter(reading => new Date(reading.timestamp).getTime() >= cutoffTime);
          
          // Límite de seguridad para evitar cuelgues del navegador (max 500 puntos)
          if (filtered.length > 500) {
            filtered = filtered.slice(-500);
          }
          return filtered;
        });

        // Actualizar estados reactivos locales en el perfil del paciente
        setPatient((prev: any) => {
          if (!prev) return null;
          return {
            ...prev,
            last_telemetry_cache: cache,
            has_active_alert: status === 'CRITICAL'
          };
        });

        // Recargar alertas en background si hay una nueva
        if (new_alerts && new_alerts.length > 0) {
          api.get(`/patients/${id}/alerts`).then((res) => setAlerts(res.data));
          toast.error('¡Se ha disparado una alerta biométrica crítica!', { icon: '🚨' });
        }
      },
      onConnect: () => {
        setIsWssConnected(true);
      },
      onDisconnect: () => {
        setIsWssConnected(false);
      }
    });

    return () => {
      vitalsSocket.disconnect();
    };
  }, [id, patient === null]); // Conectar una vez que el paciente está cargado

  // Guardar Calibración de Umbrales Clínicos
  const handleSaveThresholds = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      const payload = {
        clinical_thresholds: {
          heart_rate: { min_bpm: minBpm, max_bpm: maxBpm },
          spo2: { critical_min_percent: critSpo2 },
          temperature: { min_celsius: minTemp, max_celsius: maxTemp }
        }
      };

      const response = await api.put(`/patients/${id}`, payload);
      setPatient(response.data.patient);
      toast.success('Umbrales clínicos calibrados y guardados con éxito.');
    } catch (err: any) {
      toast.error('Fallo al guardar límites clínicos: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  // Guardar Ficha Clínica de Antecedentes
  const handleSaveClinicalHistory = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      const payload = {
        medical_history_summary: {
          blood_type: bloodType,
          pathologies: pathologiesText.split(',').map(s => s.trim()).filter(Boolean),
          allergies: allergiesText.split(',').map(s => s.trim()).filter(Boolean),
          notes: notesText
        }
      };

      const response = await api.put(`/patients/${id}`, payload);
      setPatient(response.data.patient);
      toast.success('Ficha clínica de antecedentes actualizada.');
    } catch (err: any) {
      toast.error('Fallo al guardar ficha clínica.');
    } finally {
      setIsSaving(false);
    }
  };

  // Resolver Alerta Activa
  const handleResolveAlert = async (alertId: string) => {
    if (!id) return;
    try {
      const response = await api.post(`/patients/${id}/alerts/${alertId}/resolve`);

      // Actualizar estado de alerta local
      setPatient((prev: any) => ({
        ...prev,
        has_active_alert: response.data.has_active_alert
      }));

      // Recargar lista de alertas
      const aRes = await api.get(`/patients/${id}/alerts`);
      setAlerts(aRes.data);

      toast.success('Alerta resuelta. Bitácora actualizada.');
    } catch (err) {
      toast.error('Error al resolver la alerta.');
    }
  };

  // Descargar Archivos de Datos (JSON, CSV, PDF)
  const handleDownload = (format: 'pdf' | 'csv' | 'json') => {
    if (!id) return;
    const token = localStorage.getItem('access_token');

    // Abrir ruta de descarga en backend agregando el token JWT en la URL como query param
    // O hacer window.open directo si el backend no requiere Auth para descarga o soporta cookies,
    // pero como requiere JWT Bearer, nuestro endpoint acepta la descarga. 
    // Para simplificar y descargar el archivo de forma nativa, abrimos la url.
    // Para inyectar la cabecera, se puede simular abriendo una pestaña:
    const exportUrl = `${API_BASE_URL}/patients/${id}/export/${format}?token=${token}`;

    toast.loading(`Generando archivo de exportación (${format.toUpperCase()})...`, { duration: 1500 });

    setTimeout(() => {
      window.open(exportUrl, '_blank');
    }, 1000);
  };

  const timeFormatPref = localStorage.getItem('aura_time_format') || '24h';
  const is12HourFormat = timeFormatPref === '12h';

  // Preparar datos para los gráficos multilineales de Recharts
  const formatChartData = () => {
    return history.map((h: any) => {
      const d = new Date(h.timestamp);
      return {
        hora: d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: is12HourFormat, timeZone: 'America/Caracas' }),
        pulso: h.telemetry?.heart_rate,
        spo2: h.telemetry?.spo2,
        temperatura: h.telemetry?.temperature
      };
    });
  };

  const chartData = formatChartData();

  if (!patient) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-semibold tracking-wide">Cargando expediente clínico del paciente...</p>
      </div>
    );
  }

  const hasAlert = patient.has_active_alert;

  const assignedDoctorObj = allDoctors.find(d => d._id === patient.assigned_doctor_id);
  const doctorName = assignedDoctorObj
    ? `${assignedDoctorObj.first_name} ${assignedDoctorObj.last_name}`
    : 'Sin asignar';

  const assignedClientObj = allClients.find(c => c._id === patient.client_id);
  const clientName = assignedClientObj
    ? assignedClientObj.corporate_name
    : 'Sin asignar';

  return (
    <div className="space-y-6">

      {/* Cabecera superior y volver */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link
            to="/patients"
            className="p-2.5 bg-[#1E2640] hover:bg-[#1E2640]/80 text-[#D4AF37] border border-[#D4AF37]/25 rounded-xl transition-all"
            title="Volver a la nómina"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                {patient.first_name} {patient.last_name}
              </h2>
              {isDeviceActive ? (
                <span className="h-2.5 w-2.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_#34D399]" title="Dispositivo IoT emitiendo en vivo" />
              ) : (
                <span className="h-2.5 w-2.5 bg-slate-600 rounded-full" title="Dispositivo IoT desconectado o sin señal" />
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">Expediente Clínico &bull; <strong className="text-mono font-normal">{patient.medical_record_id}</strong> &bull; <span className={isDeviceActive ? "text-emerald-500 font-semibold" : "text-slate-500"}>{isDeviceActive ? "Transmitiendo" : "Sin Transmisión"}</span></p>
          </div>
        </div>

        {/* Dropdown flotante DESCARGAR DATOS */}
        <div className="relative group self-start sm:self-auto">
          <button
            className="px-4 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#AA820A] text-black font-bold text-xs rounded-xl hover:from-[#E5BE48] hover:to-[#BC931B] transition-all duration-300 shadow-lg shadow-[#D4AF37]/10 flex items-center space-x-2"
          >
            <Download className="h-4 w-4 stroke-[2.5]" />
            <span>DESCARGAR DATOS</span>
          </button>

          {/* Menú flotante del Dropdown en hover */}
          <div className="absolute right-0 top-full mt-2 w-48 bg-[#0F1420] border border-[#1E2640] rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 p-2 space-y-1">
            <button
              onClick={() => handleDownload('pdf')}
              className="w-full text-left px-4 py-2 hover:bg-[#1E2640]/50 rounded-xl text-xs text-slate-200 hover:text-[#D4AF37] font-semibold flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>Informe Clínico PDF</span>
            </button>
            <button
              onClick={() => handleDownload('csv')}
              className="w-full text-left px-4 py-2 hover:bg-[#1E2640]/50 rounded-xl text-xs text-slate-200 hover:text-[#D4AF37] font-semibold flex items-center space-x-2"
            >
              <Database className="h-4 w-4" />
              <span>Hoja de Cálculo CSV</span>
            </button>
            <button
              onClick={() => handleDownload('json')}
              className="w-full text-left px-4 py-2 hover:bg-[#1E2640]/50 rounded-xl text-xs text-slate-200 hover:text-[#D4AF37] font-semibold flex items-center space-x-2"
            >
              <Database className="h-4 w-4" />
              <span>Datos Brutos JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* REJILLA DIVISION: 30% Izquierda Sliders / 70% Derecha Pestañas */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">

        {/* PANEL IZQUIERDO (30% -> 3 cols de 10) */}
        <div className="lg:col-span-3 space-y-6">

          {/* Card 1: Perfil Clínico Fijo */}
          <div className={`p-6 rounded-3xl border bg-glass flex flex-col justify-between transition-all ${hasAlert ? 'border-[#FF1744] bg-[#FF1744]/2' : 'border-[#1E2640]'
            }`}>
            <div className="flex items-center space-x-3.5 mb-6">
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center border ${hasAlert ? 'bg-[#FF1744]/20 border-[#FF1744] text-[#FF1744] animate-pulse-heart' : 'bg-[#1E2640] border-[#1E2640] text-slate-300'
                }`}>
                {hasAlert ? <AlertTriangle className="h-5.5 w-5.5" /> : <Stethoscope className="h-5.5 w-5.5 text-[#D4AF37]" />}
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-200">{patient.first_name} {patient.last_name}</h4>
                <span className="text-[10px] text-slate-500 font-bold uppercase">{patient.medical_record_id}</span>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between border-b border-[#1E2640]/30 pb-2.5">
                <span className="text-slate-500 font-semibold">Cédula Nacional:</span>
                <strong className="text-slate-300">{patient.national_id}</strong>
              </div>
              <div className="flex justify-between border-b border-[#1E2640]/30 pb-2.5">
                <span className="text-slate-500 font-semibold">Grupo Sanguíneo:</span>
                <strong className="text-slate-300">{bloodType}</strong>
              </div>
              <div className="flex justify-between border-b border-[#1E2640]/30 pb-2.5">
                <span className="text-slate-500 font-semibold">Médico Supervisor:</span>
                <strong className="text-slate-300">{doctorName}</strong>
              </div>
              <div className="flex justify-between border-b border-[#1E2640]/30 pb-2.5">
                <span className="text-slate-500 font-semibold">Cliente / Clínica:</span>
                <strong className="text-slate-300 truncate max-w-[120px]" title={clientName}>{clientName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Estado Clínico:</span>
                {hasAlert ? (
                  <span className="text-[#FF1744] font-extrabold animate-pulse">S.O.S. Crisis</span>
                ) : (
                  <span className="text-emerald-400 font-bold">Estable</span>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Asignación de Recursos Clínicos */}
          {user?.role === 'ADMIN' && (
            <div className="bg-glass p-6 rounded-3xl border border-[#1E2640] space-y-4 font-mono text-xs text-slate-200">
              <div className="flex items-center space-x-2 border-b border-[#1E2640]/60 pb-3">
                <Stethoscope className="h-4.5 w-4.5 text-[#D4AF37]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Asignar Recursos</h3>
              </div>

              {/* Asignar Médico */}
              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-bold uppercase">Médico Supervisor:</label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-[#1E2640] rounded-xl px-2.5 py-2 outline-none text-slate-300 font-sans focus:border-[#D4AF37] transition-all"
                >
                  <option value="">-- SIN ASIGNAR --</option>
                  {allDoctors.map(d => (
                    <option key={d._id} value={d._id}>
                      {d.first_name} {d.last_name} ({d.specialty})
                    </option>
                  ))}
                </select>
              </div>

              {/* Asignar Dispositivo */}
              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-bold uppercase">Dispositivo IoT:</label>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-[#1E2640] rounded-xl px-2.5 py-2 outline-none text-slate-300 font-sans focus:border-[#D4AF37] transition-all"
                >
                  <option value="">-- SIN ASIGNAR --</option>
                  {allDevices.map(d => (
                    <option key={d._id} value={d._id}>
                      {d.serial_number} ({d.mac_address})
                    </option>
                  ))}
                </select>
              </div>

              {/* Asignar Cliente (Clínica o Fondeo) */}
              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-bold uppercase">Cliente / Clínica:</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-[#1E2640] rounded-xl px-2.5 py-2 outline-none text-slate-300 font-sans focus:border-[#D4AF37] transition-all"
                >
                  <option value="">-- SIN ASIGNAR --</option>
                  {allClients.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.corporate_name} ({c.client_type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Botón de guardado */}
              <button
                onClick={handleSaveAssignments}
                disabled={isSaving}
                className="w-full py-2.5 bg-[#1E2640] hover:bg-[#D4AF37] hover:text-black font-semibold text-xs text-[#D4AF37] border border-[#D4AF37]/20 hover:border-[#D4AF37] rounded-xl flex items-center justify-center space-x-2 transition-all mt-2"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Guardar Asignaciones</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Card 2: Calibrador de Umbrales Clínicos (Sliders dobles reactivos) */}
          {user?.role !== 'CLIENT' && (
            <div className="bg-glass p-6 rounded-3xl border border-[#1E2640] space-y-6">
              <div className="flex items-center space-x-2 border-b border-[#1E2640]/60 pb-3">
                <Settings className="h-4.5 w-4.5 text-[#D4AF37]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Calibrar Umbrales</h3>
              </div>

              {/* Sliders Frecuencia Cardiaca */}
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-semibold flex items-center space-x-1">
                    <Heart className="h-3.5 w-3.5 text-[#FF1744]" />
                    <span>Pulso (Min-Max)</span>
                  </span>
                  <strong className="text-[#D4AF37]">{minBpm} - {maxBpm} bpm</strong>
                </div>
                <div className="space-y-1">
                  <input
                    type="range"
                    min="40"
                    max="80"
                    value={minBpm}
                    onChange={(e) => setMinBpm(parseInt(e.target.value))}
                    className="w-full h-1 bg-[#1E2640] rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
                  />
                  <input
                    type="range"
                    min="85"
                    max="140"
                    value={maxBpm}
                    onChange={(e) => setMaxBpm(parseInt(e.target.value))}
                    className="w-full h-1 bg-[#1E2640] rounded-lg appearance-none cursor-pointer accent-[#FF1744]"
                  />
                </div>
              </div>

              {/* Sliders Temperatura */}
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-semibold flex items-center space-x-1">
                    <Thermometer className="h-3.5 w-3.5 text-amber-400" />
                    <span>Temperatura (Min-Max)</span>
                  </span>
                  <strong className="text-[#D4AF37]">{minTemp} - {maxTemp} °C</strong>
                </div>
                <div className="space-y-1">
                  <input
                    type="range"
                    min="34.0"
                    max="36.0"
                    step="0.1"
                    value={minTemp}
                    onChange={(e) => setMinTemp(parseFloat(e.target.value))}
                    className="w-full h-1 bg-[#1E2640] rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
                  />
                  <input
                    type="range"
                    min="36.8"
                    max="39.5"
                    step="0.1"
                    value={maxTemp}
                    onChange={(e) => setMaxTemp(parseFloat(e.target.value))}
                    className="w-full h-1 bg-[#1E2640] rounded-lg appearance-none cursor-pointer accent-[#FF1744]"
                  />
                </div>
              </div>

              {/* Slider SpO2 */}
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-semibold flex items-center space-x-1">
                    <Activity className="h-3.5 w-3.5 text-[#00F2FE]" />
                    <span>SpO2 Crítico Min</span>
                  </span>
                  <strong className="text-[#D4AF37]">{critSpo2}%</strong>
                </div>
                <input
                  type="range"
                  min="80"
                  max="95"
                  value={critSpo2}
                  onChange={(e) => setCritSpo2(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-[#1E2640] rounded-lg appearance-none cursor-pointer accent-[#FF1744]"
                />
              </div>

              {/* Botón de guardado */}
              <button
                onClick={handleSaveThresholds}
                disabled={isSaving}
                className="w-full py-2.5 bg-[#1E2640] hover:bg-[#D4AF37] hover:text-black font-semibold text-xs text-[#D4AF37] border border-[#D4AF37]/20 hover:border-[#D4AF37] rounded-xl flex items-center justify-center space-x-2 transition-all"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Guardar Umbrales</span>
                  </>
                )}
              </button>

            </div>
          )}

        </div>

        {/* PANEL DERECHO (70% -> 7 cols de 10) */}
        <div className="lg:col-span-7 space-y-6">

          {/* Navegación por Pestañas */}
          <div className="flex bg-[#0F1420] p-1.5 rounded-2xl border border-[#1E2640] space-x-2">
            {[
              { id: 'GRAFICOS', label: 'Gráficos de Signos', icon: Activity },
              { id: 'ALERTAS', label: 'Historial de Alertas', icon: History },
              { id: 'FICHA', label: 'Ficha Clínica', icon: FileText }
            ].map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-grow py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all outline-none ${isActive
                    ? 'bg-[#1E2640] text-[#D4AF37] border border-[#D4AF37]/20 shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E2640]/20'
                    }`}
                >
                  <TabIcon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* CONTENIDO DE PESTAÑAS */}

          {/* PESTAÑA 1: GRAFICOS */}
          {activeTab === 'GRAFICOS' && (
            <div className="space-y-6">

              {/* Toolbar de Controles de Tiempo */}
              <div className="bg-glass p-4 rounded-2xl border border-[#1E2640] flex flex-col xl:flex-row items-center gap-4 justify-between">

                {/* Selector de Segmentación */}
                <div className="flex items-center space-x-3 whitespace-nowrap">
                  <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Ventana:
                  </span>
                  <div className="flex space-x-1 bg-[#0B0F19] p-1 rounded-xl border border-[#1E2640]">
                    {[
                      { label: '1 Min', value: 60 },
                      { label: '3 Min', value: 180 },
                      { label: '5 Min', value: 300 },
                      { label: '10 Min', value: 600 }
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setTimeWindow(opt.value)}
                        className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${timeWindow === opt.value ? 'bg-[#1E2640] text-[#D4AF37]' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slider de Línea de Tiempo continua */}
                <div className="flex-1 w-full flex items-center space-x-4 min-w-[200px]">
                  <span className="text-[10px] text-slate-500 font-bold uppercase whitespace-nowrap hidden sm:block">
                    {timeOffset > 0 ? `Hace ${timeOffset}s` : 'Tiempo Real'}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="3600" // Historial de 1 hora
                    step="10"
                    value={timeOffset}
                    onChange={(e) => setTimeOffset(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[#1E2640] rounded-lg appearance-none cursor-pointer accent-[#00F2FE]"
                    style={{ direction: 'rtl' }} // Invertir slider para que la derecha sea el pasado y la izquierda el presente
                  />
                  <span className="text-[10px] text-slate-500 font-bold uppercase whitespace-nowrap">
                    Presente
                  </span>
                </div>

                {/* Feedback de carga y Botón Volver al En Vivo */}
                <div className="flex items-center gap-3">
                  {isLoadingHistory && (
                    <div className="flex items-center space-x-2 text-[#D4AF37]">
                      <Loader className="w-4 h-4 animate-spin" />
                      <span className="text-[10px] font-bold uppercase">Cargando...</span>
                    </div>
                  )}

                  {timeOffset > 0 && (
                    <button
                      onClick={() => setTimeOffset(0)}
                      className="px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-[10px] font-extrabold transition-all whitespace-nowrap flex items-center gap-2 shadow-[0_0_10px_rgba(52,211,153,0.1)]"
                    >
                      <span className="h-2 w-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_5px_#34D399]"></span>
                      VOLVER AL EN VIVO
                    </button>
                  )}
                </div>
              </div>

              {/* Gráfico 1: heart_rate */}
              <div className="bg-glass p-5 rounded-3xl border border-[#1E2640] relative">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                    <Heart className="h-4 w-4 text-[#FF1744] animate-pulse" />
                    <span>Frecuencia Cardíaca en vivo</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">Unidad: bpm</span>
                </div>

                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E2640" vertical={false} />
                      <XAxis dataKey="hora" stroke="#5E6A8A" fontSize={10} tickLine={false} minTickGap={30} />
                      <YAxis domain={[30, 160]} stroke="#5E6A8A" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0F1420', border: '1px solid #1E2640' }} />

                      {/* LÍNEAS GUÍA REACTIVAS ROJAS DE UMBRALES */}
                      <ReferenceLine y={minBpm} stroke="#FF1744" strokeDasharray="3 3" label={{ value: `Mín: ${minBpm}`, fill: '#FF1744', fontSize: 9, position: 'insideBottomLeft' }} />
                      <ReferenceLine y={maxBpm} stroke="#FF1744" strokeDasharray="3 3" label={{ value: `Máx: ${maxBpm}`, fill: '#FF1744', fontSize: 9, position: 'insideTopLeft' }} />

                      <Line type="monotone" dataKey="pulso" stroke="#FF1744" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} name="Ritmo Cardíaco" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico 2: spo2 */}
              <div className="bg-glass p-5 rounded-3xl border border-[#1E2640]">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                    <Activity className="h-4 w-4 text-[#00F2FE] animate-pulse" />
                    <span>Saturación de Oxígeno (SpO2)</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">Unidad: %</span>
                </div>

                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E2640" vertical={false} />
                      <XAxis dataKey="hora" stroke="#5E6A8A" fontSize={10} tickLine={false} minTickGap={30} />
                      <YAxis domain={[80, 101]} stroke="#5E6A8A" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0F1420', border: '1px solid #1E2640' }} />

                      {/* LÍNEA GUÍA REACTIVA DE SPO2 MÍNIMO */}
                      <ReferenceLine y={critSpo2} stroke="#FF1744" strokeDasharray="3 3" label={{ value: `Crit: ${critSpo2}%`, fill: '#FF1744', fontSize: 9, position: 'insideBottomLeft' }} />

                      <Line type="monotone" dataKey="spo2" stroke="#00F2FE" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} name="Saturación Oxígeno" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico 3: temperatura */}
              <div className="bg-glass p-5 rounded-3xl border border-[#1E2640]">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                    <Thermometer className="h-4 w-4 text-amber-400" />
                    <span>Temperatura Corporal</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">Unidad: °C</span>
                </div>

                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E2640" vertical={false} />
                      <XAxis dataKey="hora" stroke="#5E6A8A" fontSize={10} tickLine={false} minTickGap={30} />
                      <YAxis domain={[34.0, 41.0]} stroke="#5E6A8A" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0F1420', border: '1px solid #1E2640' }} />

                      {/* LÍNEAS GUÍA REACTIVAS DE TEMPERATURA */}
                      <ReferenceLine y={minTemp} stroke="#FF1744" strokeDasharray="3 3" label={{ value: `Mín: ${minTemp}°C`, fill: '#FF1744', fontSize: 9, position: 'insideBottomLeft' }} />
                      <ReferenceLine y={maxTemp} stroke="#FF1744" strokeDasharray="3 3" label={{ value: `Máx: ${maxTemp}°C`, fill: '#FF1744', fontSize: 9, position: 'insideTopLeft' }} />

                      <Line type="monotone" dataKey="temperatura" stroke="#D4AF37" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} name="Temperatura" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          )}

          {/* PESTAÑA 2: HISTORIAL DE ALERTAS */}
          {activeTab === 'ALERTAS' && (
            <div className="bg-glass rounded-3xl border border-[#1E2640] p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-[#1E2640]/60 pb-3.5 mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Bitácora de Incidencias e Alertas</h4>
                <span className="text-[10px] text-slate-500">Historial clínico inmutable NoSQL</span>
              </div>

              {alerts.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle className="h-9 w-9 text-emerald-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-semibold">El paciente no registra alertas vigentes ni históricas.</p>
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-2">
                  {alerts.map((alert) => (
                    <div
                      key={alert._id}
                      className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${alert.status === 'ACTIVE'
                        ? 'border-[#FF1744]/45 bg-[#FF1744]/4 shadow-[0_0_10px_rgba(255,23,68,0.06)]'
                        : 'border-[#1E2640] bg-[#0A0D15]/40 opacity-70'
                        }`}
                    >
                      <div className="flex items-start space-x-3 min-w-0">
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center border flex-shrink-0 ${alert.status === 'ACTIVE'
                          ? 'bg-[#FF1744]/20 border-[#FF1744] text-[#FF1744] animate-pulse'
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          }`}>
                          <AlertTriangle className="h-4.5 w-4.5" />
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-200 leading-snug truncate">{alert.description}</p>
                          <div className="mt-1 text-[10px] text-slate-500 font-mono">
                            Disparado el: {new Date(alert.created_at).toLocaleString('es-VE', { timeZone: 'America/Caracas', hour12: is12HourFormat })}
                            {alert.status === 'RESOLVED' && alert.resolved_at && (
                              <span className="block mt-0.5 text-emerald-500/80">
                                Resuelta en fecha: {new Date(alert.resolved_at).toLocaleString('es-VE', { timeZone: 'America/Caracas', hour12: is12HourFormat })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {alert.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleResolveAlert(alert._id)}
                          className="px-4 py-2 bg-[#FF1744]/25 hover:bg-[#FF1744] hover:text-white border border-[#FF1744]/45 font-bold text-[10px] uppercase rounded-xl transition-all shadow-md flex-shrink-0"
                        >
                          Resolver
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* PESTAÑA 3: FICHA CLINICA DE ANTECEDENTES */}
          {activeTab === 'FICHA' && (
            <div className="bg-glass p-6 rounded-3xl border border-[#1E2640] space-y-6">
              <div className="flex justify-between items-center border-b border-[#1E2640]/60 pb-3.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Ficha Técnica de Antecedentes</h4>
                <span className="text-[10px] text-slate-500">Mapeado polimórfico flexible</span>
              </div>

              <div className="space-y-4 text-xs">
                {/* Grupo Sanguíneo */}
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
                  <span className="text-slate-400 font-semibold sm:col-span-1">Grupo Sanguíneo:</span>
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-[#1E2640] rounded-xl focus:border-[#D4AF37] outline-none text-slate-200 sm:col-span-3 text-xs"
                  >
                    <option value="A+">A Positivo (A+)</option>
                    <option value="A-">A Negativo (A-)</option>
                    <option value="B+">B Positivo (B+)</option>
                    <option value="B-">B Negativo (B-)</option>
                    <option value="AB+">AB Positivo (AB+)</option>
                    <option value="AB-">AB Negativo (AB-)</option>
                    <option value="O+">O Positivo (O+)</option>
                    <option value="O-">O Negativo (O-)</option>
                  </select>
                </div>

                {/* Patologías registradas */}
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2">
                  <span className="text-slate-400 font-semibold sm:col-span-1 mt-1.5">Patologías:</span>
                  <div className="sm:col-span-3 space-y-1.5">
                    <input
                      type="text"
                      value={pathologiesText}
                      onChange={(e) => setPathologiesText(e.target.value)}
                      placeholder="Hipertensión, Asma, Diabetes (separar por comas)"
                      className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl focus:border-[#D4AF37] outline-none text-xs"
                    />
                    <span className="text-[9px] text-slate-500 italic block">* Ingrese términos separados por coma.</span>
                  </div>
                </div>

                {/* Alergias */}
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2">
                  <span className="text-slate-400 font-semibold sm:col-span-1 mt-1.5">Alergias conocidas:</span>
                  <div className="sm:col-span-3 space-y-1.5">
                    <input
                      type="text"
                      value={allergiesText}
                      onChange={(e) => setAllergiesText(e.target.value)}
                      placeholder="Penicilina, Nueces, Mariscos (separar por comas)"
                      className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl focus:border-[#D4AF37] outline-none text-xs"
                    />
                  </div>
                </div>

                {/* Notas Clínicas */}
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2">
                  <span className="text-slate-400 font-semibold sm:col-span-1 mt-1.5">Observaciones:</span>
                  <textarea
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Notas médicas, indicaciones sobre el tratamiento..."
                    rows={4}
                    className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl focus:border-[#D4AF37] outline-none text-slate-200 placeholder:text-slate-600 resize-none sm:col-span-3 text-xs"
                  />
                </div>
              </div>

              {/* Botón de guardado de Ficha */}
              <div className="border-t border-[#1E2640]/50 pt-4 flex justify-end">
                <button
                  onClick={handleSaveClinicalHistory}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-[#1E2640] hover:bg-[#D4AF37] hover:text-black font-semibold text-xs text-[#D4AF37] border border-[#D4AF37]/20 hover:border-[#D4AF37] rounded-xl flex items-center space-x-2 transition-all"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Actualizar Ficha Técnica</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
export default PatientDetailView;
