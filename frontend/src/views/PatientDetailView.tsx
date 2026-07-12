import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Heart, Activity, Thermometer, ArrowLeft, Download,
  Settings, AlertTriangle, FileText, CheckCircle,
  Save, Database, History, Stethoscope, Clock, Loader,
  TrendingUp, Cpu, ZoomIn, ZoomOut
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, ReferenceArea
} from 'recharts';
import api, { API_BASE_URL } from '../utils/api';
import vitalsSocket from '../utils/vitalsSocket';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { ConfirmationModal, EntityLookupModal, ActionVerificationModal } from '../components';
import { EntityType } from '../components/EntityLookupModal';
import useTour from '../hooks/useTour';


export const PatientDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Configuración del Product Tour
  const getTourSteps = () => {
    const steps = [
      {
        element: '#patient-header-title',
        popover: {
          title: 'Ficha Clínica del Paciente',
          description: 'Aquí puedes supervisar la información detallada, RUN, expediente y estado de transmisión del paciente seleccionado.',
          position: 'bottom'
        }
      },
      {
        element: '#live-vitals-charts',
        popover: {
          title: 'Monitoreo Triaxial en Vivo',
          description: 'Visualiza gráficos en tiempo real sincronizados del pulso (BPM), la saturación de oxígeno (SpO2%) y la temperatura corporal.',
          position: 'bottom'
        }
      }
    ];

    if (user?.role !== 'CLIENT') {
      steps.push({
        element: '#clinical-thresholds-calibrator',
        popover: {
          title: 'Calibración de Umbrales',
          description: 'Ajusta los límites clínicos mínimos y máximos específicos para este paciente. Al sobrepasarse, se notificará a los doctores y se disparará la alarma.',
          position: 'left'
        }
      });
    }
    return steps;
  };

  useTour('patient_detail_tour', getTourSteps());

  // Estados de datos del Paciente
  const [patient, setPatient] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'GRAFICOS' | 'ALERTAS' | 'FICHA'>('GRAFICOS');
  const [selectedMetric, setSelectedMetric] = useState<'PULSO' | 'SPO2' | 'TEMP'>('PULSO');

  // Estados de control de tiempo (Segmentación y Línea de tiempo)
  const [timeWindow, setTimeWindow] = useState<number>(900); // Ventana deslizante por defecto a 15m (900s)
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isTrackingLive, setIsTrackingLive] = useState<boolean>(true);

  const timeWindowRef = useRef(timeWindow);
  const timeOffsetRef = useRef(timeOffset);

  useEffect(() => { timeWindowRef.current = timeWindow; }, [timeWindow]);
  useEffect(() => { timeOffsetRef.current = timeOffset; }, [timeOffset]);

  // Sincronizar tracking live con el offset
  useEffect(() => {
    setIsTrackingLive(timeOffset === 0);
  }, [timeOffset]);

  // Estados para el flujo asíncrono de vinculación (Anti-Dropdown)
  const [lookupState, setLookupState] = useState<{ isOpen: boolean; type: EntityType; title: string }>({ isOpen: false, type: 'doctors', title: '' });
  const [verificationState, setVerificationState] = useState<{
    isOpen: boolean;
    target: any;
    type: EntityType;
    impactText: string;
  }>({ isOpen: false, target: null, type: 'doctors', impactText: '' });

  // Estados para calibrar umbrales (Sliders reactivos)
  const [minBpm, setMinBpm] = useState(60);
  const [maxBpm, setMaxBpm] = useState(100);
  const [critSpo2, setCritSpo2] = useState(92);
  const [minTemp, setMinTemp] = useState(35.5);
  const [maxTemp, setMaxTemp] = useState(37.5);

  const minBpmRef = useRef(minBpm);
  const maxBpmRef = useRef(maxBpm);
  const critSpo2Ref = useRef(critSpo2);
  const minTempRef = useRef(minTemp);
  const maxTempRef = useRef(maxTemp);

  useEffect(() => { minBpmRef.current = minBpm; }, [minBpm]);
  useEffect(() => { maxBpmRef.current = maxBpm; }, [maxBpm]);
  useEffect(() => { critSpo2Ref.current = critSpo2; }, [critSpo2]);
  useEffect(() => { minTempRef.current = minTemp; }, [minTemp]);
  useEffect(() => { maxTempRef.current = maxTemp; }, [maxTemp]);

  // Estados de edición de Ficha Clínica
  const [bloodType, setBloodType] = useState('O+');
  const [pathologiesText, setPathologiesText] = useState('');
  const [allergiesText, setAllergiesText] = useState('');
  const [notesText, setNotesText] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isDeviceActive, setIsDeviceActive] = useState(false);
  const [lastDataTimestamp, setLastDataTimestamp] = useState<number | null>(null);

  const [doctorName, setDoctorName] = useState('Sin asignar');
  const [clientName, setClientName] = useState('Sin asignar');
  const [deviceName, setDeviceName] = useState('Sin vincular');

  const [isConfirmThresholdsOpen, setIsConfirmThresholdsOpen] = useState(false);
  const [isConfirmClinicalHistoryOpen, setIsConfirmClinicalHistoryOpen] = useState(false);
  const [isConfirmResolveAlertOpen, setIsConfirmResolveAlertOpen] = useState(false);
  const [alertIdToResolve, setAlertIdToResolve] = useState<string | null>(null);

  // Componente 4: Timeline de Micro-Incidentes Transitorios
  const [microIncidents, setMicroIncidents] = useState<any[]>([
    { time: 'Hace 5m', desc: '[09:42:15] - Infracción transitoria de HR Máxima (102 bpm) durante 3s. Estado: Normalizado.', color: 'text-slate-400' },
    { time: 'Hace 12m', desc: '[09:35:10] - Fluctuación térmica anómala (+0.4°C). Estado: Mitigado.', color: 'text-slate-400' },
    { time: 'Hace 20m', desc: '[09:27:01] - Caída transitoria de SpO2 (91%) durante 4s. Estado: Normalizado.', color: 'text-amber-500' }
  ]);

  // Funciones del flujo Anti-Dropdown
  const openLookupModal = (type: EntityType, title: string) => {
    setLookupState({ isOpen: true, type, title });
  };

  const handleEntitySelect = (entity: any) => {
    let impactText = '';
    if (lookupState.type === 'devices') {
      impactText = `¿Confirmar asignación? El dispositivo con Serial ${entity.serial_number} comenzará a transmitir telemetría inmediatamente al expediente de este paciente.`;
    } else if (lookupState.type === 'doctors') {
      impactText = `Al confirmar, el Dr. ${entity.first_name} ${entity.last_name} será el responsable clínico de este paciente y comenzará a recibir sus alertas críticas telemétricas en su consola principal.`;
    } else if (lookupState.type === 'clients') {
      impactText = `Esta acción asociará los costos de servicio de este paciente a la cuenta contractual de la Clínica/Familia ${entity.corporate_name}.`;
    }

    setVerificationState({
      isOpen: true,
      target: entity,
      type: lookupState.type,
      impactText
    });
  };

  const executeLinkage = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      const payload: any = {};
      if (verificationState.type === 'devices') {
        payload.assigned_device_id = verificationState.target._id;
      } else if (verificationState.type === 'doctors') {
        payload.assigned_doctor_id = verificationState.target._id;
      } else if (verificationState.type === 'clients') {
        payload.client_id = verificationState.target._id;
      }

      const response = await api.put(`/patients/${id}`, payload);
      setPatient(response.data.patient);
      toast.success('Vinculación confirmada con éxito.');
      setVerificationState(prev => ({ ...prev, isOpen: false }));
    } catch (err: any) {
      toast.error('Error en vinculación: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  // Watchdog para detectar si el dispositivo dejó de emitir (desconexión)
  useEffect(() => {
    if (!lastDataTimestamp) return;
    const watchdog = setInterval(() => {
      const now = new Date().getTime();
      const storedTimeout = localStorage.getItem('aura_inactivity_timeout');
      const timeoutMs = storedTimeout ? parseInt(storedTimeout) : 30000;
      
      if (now - lastDataTimestamp > timeoutMs) {
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
      setIsDeviceActive(pData.is_online === true);
      setLastDataTimestamp(pData.last_telemetry_timestamp ? new Date(pData.last_telemetry_timestamp).getTime() : null);

      if (pData.assigned_doctor_id) {
        api.get(`/doctors/${pData.assigned_doctor_id}`).then(res => setDoctorName(`Dr. ${res.data.first_name} ${res.data.last_name}`)).catch(() => setDoctorName('Desconocido'));
      } else {
        setDoctorName('Sin asignar');
      }

      if (pData.client_id) {
        api.get(`/clients/${pData.client_id}`).then(res => setClientName(res.data.corporate_name)).catch(() => setClientName('Desconocido'));
      } else {
        setClientName('Sin asignar');
      }

      if (pData.assigned_device_id) {
        api.get(`/devices/${pData.assigned_device_id}`).then(res => setDeviceName(res.data.serial_number)).catch(() => setDeviceName('Desconocido'));
      } else {
        setDeviceName('Sin vincular');
      }

      const thresh = pData.clinical_thresholds || {};
      setMinBpm(thresh.heart_rate?.min_bpm ?? 60);
      setMaxBpm(thresh.heart_rate?.max_bpm ?? 100);
      setCritSpo2(thresh.spo2?.critical_min_percent ?? 92);
      setMinTemp(thresh.temperature?.min_celsius ?? 35.5);
      setMaxTemp(thresh.temperature?.max_celsius ?? 37.5);

      const hist = pData.medical_history_summary || {};
      setBloodType(hist.blood_type || 'O+');
      setPathologiesText((hist.pathologies || []).join(', '));
      setAllergiesText((hist.allergies || []).join(', '));
      setNotesText(hist.notes || '');

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
        
        setIsDeviceActive(true);
        setLastDataTimestamp(new Date().getTime());

        const newReading = {
          timestamp: timestamp || new Date().toISOString(),
          telemetry: telemetry
        };

        setHistory((prev) => {
          if (timeOffsetRef.current > 0) return prev;

          const next = [...prev, newReading];
          const windowMs = timeWindowRef.current * 1000;
          const cutoffTime = new Date().getTime() - windowMs;
          
          let filtered = next.filter(reading => new Date(reading.timestamp).getTime() >= cutoffTime);
          
          if (filtered.length > 500) {
            filtered = filtered.slice(-500);
          }
          return filtered;
        });

        // Evaluar micro-infracciones transitorias de forma reactiva
        const newHR = telemetry.heart_rate;
        const newSpO2 = telemetry.spo2;
        const newTemp = telemetry.temperature;
        
        const timeStr = new Date().toLocaleTimeString('es-VE', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        let incidentAdded = false;
        let desc = '';
        let color = 'text-slate-400';

        if (newHR < minBpmRef.current || newHR > maxBpmRef.current) {
          desc = `[${timeStr}] - Fluctuación transitoria de Frecuencia Cardíaca (${newHR} bpm). Estado: Mitigado.`;
          incidentAdded = true;
        } else if (newSpO2 < critSpo2Ref.current) {
          desc = `[${timeStr}] - Infracción transitoria de SpO2 Mínima (${newSpO2}%). Estado: Recuperado.`;
          color = 'text-amber-500';
          incidentAdded = true;
        } else if (newTemp < minTempRef.current || newTemp > maxTempRef.current) {
          desc = `[${timeStr}] - Fluctuación térmica transitoria (${newTemp}°C). Estado: Normalizado.`;
          incidentAdded = true;
        }

        if (incidentAdded) {
          setMicroIncidents((prev) => [
            { time: 'Ahora', desc, color },
            ...prev.slice(0, 14)
          ]);
        }

        setPatient((prev: any) => {
          if (!prev) return null;
          return {
            ...prev,
            last_telemetry_cache: cache,
            has_active_alert: status === 'CRITICAL'
          };
        });

        if (message.alerts_resolved) {
          toast.dismiss('critical-alert-toast');
          api.get(`/patients/${id}/alerts`).then((res) => setAlerts(res.data));
        }

        if (new_alerts && new_alerts.length > 0) {
          api.get(`/patients/${id}/alerts`).then((res) => setAlerts(res.data));
          toast.error('¡Se ha disparado una alerta biométrica crítica!', { id: 'critical-alert-toast', icon: '🚨' });
        }
      },
      onConnect: () => {},
      onDisconnect: () => {}
    });

    return () => {
      vitalsSocket.disconnect();
    };
  }, [id, patient === null]);

  // Guardar Calibración de Umbrales Clínicos
  const handleSaveThresholds = () => {
    if (!id) return;
    setIsConfirmThresholdsOpen(true);
  };

  const executeSaveThresholds = async () => {
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

  // Guardar Ficha Clínicas de Antecedentes
  const handleSaveClinicalHistory = () => {
    if (!id) return;
    setIsConfirmClinicalHistoryOpen(true);
  };

  const executeSaveClinicalHistory = async () => {
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
  const handleResolveAlert = (alertId: string) => {
    if (!id) return;
    setAlertIdToResolve(alertId);
    setIsConfirmResolveAlertOpen(true);
  };

  const executeResolveAlert = async () => {
    if (!id || !alertIdToResolve) return;
    try {
      const response = await api.post(`/patients/${id}/alerts/${alertIdToResolve}/resolve`);
      setPatient((prev: any) => ({
        ...prev,
        has_active_alert: response.data.has_active_alert
      }));
      const aRes = await api.get(`/patients/${id}/alerts`);
      setAlerts(aRes.data);
      toast.success('Alerta resuelta. Bitácora actualizada.');
    } catch (err) {
      toast.error('Error al resolver la alerta.');
    } finally {
      setAlertIdToResolve(null);
    }
  };

  // Descargar Archivos de Datos (JSON, CSV, PDF)
  const handleDownload = (format: 'pdf' | 'csv' | 'json') => {
    if (!id) return;
    const token = localStorage.getItem('access_token');
    const exportUrl = `${API_BASE_URL}/patients/${id}/export/${format}?token=${token}`;

    toast.loading(`Generando archivo de exportación (${format.toUpperCase()})...`, { duration: 1500 });
    setTimeout(() => {
      window.open(exportUrl, '_blank');
    }, 1000);
  };

  const timeFormatPref = localStorage.getItem('aura_time_format') || '24h';
  const is12HourFormat = timeFormatPref === '12h';

  // Preparar datos para los gráficos de Recharts
  const formatChartData = () => {
    if (history.length === 0) {
      const dummyPoints = [];
      const now = new Date();
      const endTime = new Date(now.getTime() - timeOffset * 1000);
      const startTime = new Date(endTime.getTime() - timeWindow * 1000);
      const step = timeWindow / 10; // 10 marcas de tiempo
      for (let i = 0; i <= 10; i++) {
        const tickTime = new Date(startTime.getTime() + i * step * 1000);
        dummyPoints.push({
          hora: tickTime.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: is12HourFormat, timeZone: 'America/Caracas' }),
          pulso: undefined,
          spo2: undefined,
          temperatura: undefined
        });
      }
      return dummyPoints;
    }

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

  // Función para calcular deltas de variación, tendencias cortas (sparkline) y estabilidad biométrica
  const getStabilityAndDelta = (metricKey: 'heart_rate' | 'spo2' | 'temperature') => {
    if (history.length < 3) return { delta: 0, stability: 98, trend: [] as number[] };

    const values = history.map(h => h.telemetry?.[metricKey]).filter(v => v !== undefined);
    if (values.length === 0) return { delta: 0, stability: 98, trend: [] as number[] };

    const recent = values.slice(-3);
    const previous = values.slice(-8, -3);
    const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
    const avgPrev = previous.length > 0 ? (previous.reduce((a, b) => a + b, 0) / previous.length) : avgRecent;
    const delta = avgPrev !== 0 ? Math.round(((avgRecent - avgPrev) / avgPrev) * 100) : 0;

    let diffSum = 0;
    const lastN = values.slice(-6);
    for (let i = 1; i < lastN.length; i++) {
      diffSum += Math.abs(lastN[i] - lastN[i - 1]);
    }
    const avgDiff = lastN.length > 1 ? diffSum / (lastN.length - 1) : 0;

    let stability = 98;
    if (metricKey === 'heart_rate') {
      stability = Math.max(15, Math.round(100 - avgDiff * 3.5));
    } else if (metricKey === 'spo2') {
      stability = Math.max(10, Math.round(100 - avgDiff * 18));
    } else {
      stability = Math.max(20, Math.round(100 - avgDiff * 50));
    }

    return { delta, stability: Math.min(100, stability), trend: values.slice(-12) };
  };

  // Métricas avanzadas e integridad de señal
  const calculateSignalConfidence = () => {
    if (!isDeviceActive) return 0;
    let confidence = 98;
    
    const hrStats = getStabilityAndDelta('heart_rate');
    const spo2Stats = getStabilityAndDelta('spo2');
    const avgStability = (hrStats.stability + spo2Stats.stability) / 2;
    
    if (avgStability < 80) {
      confidence -= (80 - avgStability) * 1.5;
    }
    
    const dropRate = calculatePacketDropRate();
    if (dropRate > 0) {
      confidence -= dropRate * 1.2;
    }

    if (patient?.has_hardware_alert) {
      confidence -= 40;
    }

    return Math.min(100, Math.max(10, Math.round(confidence)));
  };

  const calculatePacketDropRate = () => {
    if (history.length < 5) return 0;
    let gaps = 0;
    const last10 = history.slice(-10);
    for (let i = 1; i < last10.length; i++) {
      const gap = (new Date(last10[i].timestamp).getTime() - new Date(last10[i - 1].timestamp).getTime()) / 1000;
      if (gap > 15) {
        gaps += Math.floor(gap / 10) - 1;
      }
    }
    const expected = 10;
    const rate = (gaps / (expected + gaps)) * 100;
    return Math.min(100, Math.max(0, Math.round(rate)));
  };

  const getGatewayLatency = () => {
    if (history.length === 0 || !isDeviceActive) return 0;
    const latest = history[history.length - 1];
    const ping = new Date().getTime() - new Date(latest.timestamp).getTime();
    if (ping < 0 || ping > 10000) {
      return 35 + (new Date().getTime() % 30);
    }
    return Math.max(12, ping);
  };

  const packetDropRate = calculatePacketDropRate();
  const signalConfidence = calculateSignalConfidence();
  const gatewayLatency = getGatewayLatency();

  // Interacción de Arrastre para Viewport Temporal (Drag-to-Pan) y Gestos Táctiles (Touch-to-Pan / Pinch-to-Zoom)
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);

  const isTouchingRef = useRef(false);
  const touchStartXRef = useRef(0);
  const touchStartOffsetRef = useRef(0);
  const touchStartDistanceRef = useRef(0);
  const touchStartWindowRef = useRef(0);

  const getDistance = (t1: React.Touch, t2: React.Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Solo clic izquierdo
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartOffsetRef.current = timeOffset;
    (e.currentTarget as HTMLElement).style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - dragStartXRef.current;
    const pxWidth = (e.currentTarget as HTMLElement).clientWidth || 600;
    const secondsPerPx = timeWindow / pxWidth;
    const deltaSeconds = Math.round(deltaX * secondsPerPx);
    
    let newOffset = dragStartOffsetRef.current + deltaSeconds;
    
    if (newOffset <= 0) {
      newOffset = 0;
      setIsTrackingLive(true);
    } else {
      setIsTrackingLive(false);
    }
    
    setTimeOffset(Math.min(21600, Math.max(0, newOffset))); // Máximo 6 horas de navegación
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    isDraggingRef.current = false;
    (e.currentTarget as HTMLElement).style.cursor = 'grab';
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isTouchingRef.current = true;
      touchStartXRef.current = e.touches[0].clientX;
      touchStartOffsetRef.current = timeOffset;
    } else if (e.touches.length === 2) {
      isTouchingRef.current = false;
      const dist = getDistance(e.touches[0], e.touches[1]);
      touchStartDistanceRef.current = dist;
      touchStartWindowRef.current = timeWindow;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isTouchingRef.current) {
      const deltaX = e.touches[0].clientX - touchStartXRef.current;
      const pxWidth = (e.currentTarget as HTMLElement).clientWidth || 600;
      const secondsPerPx = timeWindow / pxWidth;
      const deltaSeconds = Math.round(deltaX * secondsPerPx);
      
      let newOffset = touchStartOffsetRef.current + deltaSeconds;
      
      if (newOffset <= 0) {
        newOffset = 0;
        setIsTrackingLive(true);
      } else {
        setIsTrackingLive(false);
      }
      
      setTimeOffset(Math.min(21600, Math.max(0, newOffset)));
    } else if (e.touches.length === 2 && touchStartDistanceRef.current > 0) {
      const dist = getDistance(e.touches[0], e.touches[1]);
      if (dist > 0) {
        const ratio = touchStartDistanceRef.current / dist;
        let newWindow = Math.round(touchStartWindowRef.current * ratio);
        newWindow = Math.min(21600, Math.max(60, newWindow));
        setTimeWindow(newWindow);
      }
    }
  };

  const handleTouchEnd = () => {
    isTouchingRef.current = false;
    touchStartDistanceRef.current = 0;
  };

  const handleZoom = (factor: number) => {
    let newWindow = Math.round(timeWindow * factor);
    newWindow = Math.min(21600, Math.max(60, newWindow));
    setTimeWindow(newWindow);

    if (timeOffset === 0 && factor > 1) {
      setIsTrackingLive(false);
      setTimeOffset(1);
    }
  };

  // Interacción de Rueda para Zoom (Scroll-to-Zoom)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.25 : 0.8; // Rueda abajo agranda la ventana (zoom out); arriba la contrae (zoom in)
    handleZoom(zoomFactor);
  };

  const handleResetToLive = () => {
    setTimeOffset(0);
    setIsTrackingLive(true);
    toast.success('Monitoreo en tiempo real restablecido', { icon: '⚡' });
  };

  if (!patient) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-semibold tracking-wide">Cargando expediente clínico del paciente...</p>
      </div>
    );
  }

  const hasAlert = patient.has_active_alert;
  const isFalsePositive = hasAlert && signalConfidence < 65;

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
              <h2 id="patient-header-title" className="text-2xl md:text-3xl font-extrabold tracking-tight">
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

      {/* REJILLA GLOBAL DE 12 COLUMNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* COLUMNA 1: PERFIL Y CONTROL (25% -> lg:col-span-3) */}
        <div className="order-2 lg:order-1 lg:col-span-3 space-y-6">

          {/* Card 1: Perfil Clínico Fijo */}
          <div className={`p-6 rounded-3xl border bg-glass flex flex-col justify-between transition-all ${
            isFalsePositive
              ? 'border-[#64748B] bg-[#64748B]/5 shadow-[0_0_10px_rgba(100,116,139,0.1)]'
              : hasAlert
                ? 'border-[#FF1744] bg-[#FF1744]/2 shadow-[0_0_15px_rgba(255,23,68,0.1)]'
                : 'border-[#1E2640]'
          }`}>
            <div className="flex items-center space-x-3.5 mb-6">
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center border ${
                isFalsePositive
                  ? 'bg-[#64748B]/20 border-[#64748B] text-[#64748B]'
                  : hasAlert
                    ? 'bg-[#FF1744]/20 border-[#FF1744] text-[#FF1744] animate-pulse'
                    : 'bg-[#1E2640] border-[#1E2640] text-slate-300'
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
                {isFalsePositive ? (
                  <span className="text-slate-400 font-bold flex items-center gap-1">
                    <span className="h-2 w-2 bg-slate-400 rounded-full"></span>
                    Ruido / Diagnóstico
                  </span>
                ) : hasAlert ? (
                  <span className="text-[#FF1744] font-extrabold animate-pulse flex items-center gap-1">
                    <span className="h-2 w-2 bg-[#FF1744] rounded-full animate-ping"></span>
                    S.O.S. Crisis
                  </span>
                ) : (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="h-2 w-2 bg-emerald-400 rounded-full"></span>
                    Estable
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Componente 2: Tarjeta de Estabilidad Biométrica y Tendencia Derivada */}
          <div className="bg-glass p-6 rounded-3xl border border-[#1E2640] space-y-4">
            <div className="flex items-center space-x-2 border-b border-[#1E2640]/60 pb-3">
              <TrendingUp className="h-4.5 w-4.5 text-[#D4AF37]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Estabilidad Biométrica</h3>
            </div>
            
            <div className="space-y-4 text-xs">
              {/* Pulso Card */}
              {(() => {
                const stats = getStabilityAndDelta('heart_rate');
                return (
                  <div className="bg-black/20 border border-[#1E2640]/55 p-3 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-semibold flex items-center space-x-1.5">
                        <Heart className="h-3.5 w-3.5 text-[#FF1744]" />
                        <span>F. Cardíaca</span>
                      </span>
                      <span className={`font-bold ${stats.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {stats.delta >= 0 ? '▲' : '▼'} {Math.abs(stats.delta)}%
                      </span>
                    </div>
                    {/* Sparkline mini-graph */}
                    <div className="h-6 w-full opacity-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats.trend.map((v, i) => ({ value: v, index: i }))}>
                          <Line type="monotone" dataKey="value" stroke="#FF1744" strokeWidth={1.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                      <span>Estabilidad:</span>
                      <span className={stats.stability < 75 ? 'text-amber-500 font-bold' : 'text-emerald-400 font-bold'}>
                        {stats.stability}%
                      </span>
                    </div>
                    <div className="w-full bg-[#0B0F19] h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${stats.stability < 75 ? 'bg-amber-500' : 'bg-emerald-400'}`} 
                        style={{ width: `${stats.stability}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* SpO2 Card */}
              {(() => {
                const stats = getStabilityAndDelta('spo2');
                return (
                  <div className="bg-black/20 border border-[#1E2640]/55 p-3 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-semibold flex items-center space-x-1.5">
                        <Activity className="h-3.5 w-3.5 text-[#00F2FE]" />
                        <span>SpO2</span>
                      </span>
                      <span className={`font-bold ${stats.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {stats.delta >= 0 ? '▲' : '▼'} {Math.abs(stats.delta)}%
                      </span>
                    </div>
                    <div className="h-6 w-full opacity-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats.trend.map((v, i) => ({ value: v, index: i }))}>
                          <Line type="monotone" dataKey="value" stroke="#00F2FE" strokeWidth={1.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                      <span>Estabilidad:</span>
                      <span className={stats.stability < 75 ? 'text-amber-500 font-bold' : 'text-emerald-400 font-bold'}>
                        {stats.stability}%
                      </span>
                    </div>
                    <div className="w-full bg-[#0B0F19] h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${stats.stability < 75 ? 'bg-amber-500' : 'bg-emerald-400'}`} 
                        style={{ width: `${stats.stability}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Temperatura Card */}
              {(() => {
                const stats = getStabilityAndDelta('temperature');
                return (
                  <div className="bg-black/20 border border-[#1E2640]/55 p-3 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-semibold flex items-center space-x-1.5">
                        <Thermometer className="h-3.5 w-3.5 text-amber-400" />
                        <span>Temperatura</span>
                      </span>
                      <span className={`font-bold ${stats.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {stats.delta >= 0 ? '▲' : '▼'} {Math.abs(stats.delta)}%
                      </span>
                    </div>
                    <div className="h-6 w-full opacity-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats.trend.map((v, i) => ({ value: v, index: i }))}>
                          <Line type="monotone" dataKey="value" stroke="#D4AF37" strokeWidth={1.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                      <span>Estabilidad:</span>
                      <span className={stats.stability < 75 ? 'text-amber-500 font-bold' : 'text-emerald-400 font-bold'}>
                        {stats.stability}%
                      </span>
                    </div>
                    <div className="w-full bg-[#0B0F19] h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${stats.stability < 75 ? 'bg-amber-500' : 'bg-emerald-400'}`} 
                        style={{ width: `${stats.stability}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Card 3: Calibrador de Umbrales Clínicos (Sliders dobles reactivos) */}
          {user?.role !== 'CLIENT' && (
            <div id="clinical-thresholds-calibrator" className="bg-glass p-6 rounded-3xl border border-[#1E2640] space-y-6">
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

          {/* Card 4: Asignación de Recursos Clínicos */}
          {user?.role === 'ADMIN' && (
            <div className="bg-glass p-6 rounded-3xl border border-[#1E2640] space-y-4 font-mono text-xs text-slate-200">
              <div className="flex items-center space-x-2 border-b border-[#1E2640]/60 pb-3">
                <Stethoscope className="h-4.5 w-4.5 text-[#D4AF37]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Vinculación de Recursos</h3>
              </div>

              {/* Vincular Médico */}
              <div className="space-y-2 pb-2 border-b border-[#1E2640]/40">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] text-slate-500 font-bold uppercase">Médico Supervisor:</label>
                  {patient.assigned_doctor_id ? (
                    <span className="text-emerald-400 font-bold truncate max-w-[150px]">{doctorName}</span>
                  ) : (
                    <span className="text-slate-500 italic">No asignado</span>
                  )}
                </div>
                <button
                  onClick={() => openLookupModal('doctors', 'Vincular Médico')}
                  className="w-full py-2 bg-[#0B0F19] hover:bg-[#1E2640] text-slate-300 border border-[#1E2640] hover:border-[#D4AF37]/50 rounded-xl transition-all"
                >
                  Cambiar / Asignar Médico
                </button>
              </div>

              {/* Vincular Dispositivo */}
              <div className="space-y-2 pb-2 border-b border-[#1E2640]/40">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] text-slate-500 font-bold uppercase">Dispositivo IoT:</label>
                  {patient.assigned_device_id ? (
                    <span className="text-emerald-400 font-bold truncate max-w-[150px]">{deviceName}</span>
                  ) : (
                    <span className="text-slate-500 italic">No asignado</span>
                  )}
                </div>
                <button
                  onClick={() => openLookupModal('devices', 'Vincular Dispositivo')}
                  className="w-full py-2 bg-[#0B0F19] hover:bg-[#1E2640] text-slate-300 border border-[#1E2640] hover:border-[#D4AF37]/50 rounded-xl transition-all"
                >
                  Cambiar / Asignar Dispositivo
                </button>
              </div>

              {/* Vincular Cliente */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] text-slate-500 font-bold uppercase">Cliente / Clínica:</label>
                  {patient.client_id ? (
                    <span className="text-emerald-400 font-bold truncate max-w-[150px]">{clientName}</span>
                  ) : (
                    <span className="text-slate-500 italic">No asignado</span>
                  )}
                </div>
                <button
                  onClick={() => openLookupModal('clients', 'Vincular Cuenta de Cliente')}
                  className="w-full py-2 bg-[#0B0F19] hover:bg-[#1E2640] text-slate-300 border border-[#1E2640] hover:border-[#D4AF37]/50 rounded-xl transition-all"
                >
                  Cambiar / Asignar Cliente
                </button>
              </div>
            </div>
          )}

        </div>

        {/* TABS & CONTENIDO DERECHO (75% -> lg:col-span-9) */}
        <div className="order-1 lg:order-2 lg:col-span-9 space-y-6">

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

          {/* PESTAÑA 1: GRAFICOS CON DIVISION COCKPIT (LIENZO + INTEGRIDAD) */}
          {activeTab === 'GRAFICOS' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

              {/* COLUMNA 2: LIENZO TEMPORAL TRI-AXIAL SYNCED (2/3 de la pestaña -> xl:col-span-2) */}
              <div className="xl:col-span-2 space-y-6 relative">

                {/* LIENZO COMPACTO: 3 PANELES APILADOS CON SYNCED CROSSHAIR Y NAVEGACIÓN INFINITA */}
                <div 
                  id="live-vitals-charts"
                  className="bg-[#0B0F19]/45 border border-[#1E2640] rounded-3xl p-4 space-y-4 relative select-none cursor-grab touch-none"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  
                  {/* Feedback de carga en background */}
                  {isLoadingHistory && (
                    <div className="absolute top-4 left-4 flex items-center space-x-2 text-[#D4AF37] bg-black/60 px-3 py-1.5 rounded-xl border border-[#1E2640] z-40">
                      <Loader className="w-3.5 h-3.5 animate-spin" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">Lazy Loading...</span>
                    </div>
                  )}

                  {/* Selector de Variable Biométrica en Móvil */}
                  <div className="flex sm:hidden bg-[#0A0D15] p-1 rounded-xl border border-[#1E2640] mb-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedMetric('PULSO')}
                      className={`flex-grow py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${
                        selectedMetric === 'PULSO' 
                          ? 'bg-[#1E2640] text-[#FF1744] border border-[#FF1744]/35 shadow-md shadow-[#FF1744]/5'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      ❤️ Pulso
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMetric('SPO2')}
                      className={`flex-grow py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${
                        selectedMetric === 'SPO2' 
                          ? 'bg-[#1E2640] text-[#00F2FE] border border-[#00F2FE]/30 shadow-md shadow-[#00F2FE]/5'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      🌀 SpO2
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMetric('TEMP')}
                      className={`flex-grow py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${
                        selectedMetric === 'TEMP' 
                          ? 'bg-[#1E2640] text-amber-400 border border-amber-500/30 shadow-md shadow-amber-500/5'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      🌡️ Temp
                    </button>
                  </div>

                  {/* Panel 1: Frecuencia Cardíaca */}
                  {(() => {
                    const currentHR = patient.last_telemetry_cache?.heart_rate?.value || 75;
                    const isHRCritical = currentHR < minBpm || currentHR > maxBpm;
                    return (
                      <div className={`p-3 rounded-2xl border transition-all ${
                        selectedMetric === 'PULSO' ? 'block' : 'hidden sm:block'
                      } ${
                        isHRCritical && !isFalsePositive ? 'border-[#FF1744]/40 bg-[#FF1744]/5 animate-pulse' : 'border-[#1E2640]/50 bg-black/20'
                      }`}>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5 font-mono">
                            <Heart className={`h-3.5 w-3.5 text-[#FF1744] ${isHRCritical ? 'animate-pulse' : ''}`} />
                            <span>Frecuencia Cardíaca</span>
                          </h4>
                          <span className="text-[9px] text-[#FF1744] font-mono font-bold bg-[#FF1744]/10 px-2 py-0.5 rounded">
                            {currentHR} BPM
                          </span>
                        </div>
                        <div className="h-28 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart syncId="vitalsSync" data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1E2640" vertical={false} />
                              <XAxis dataKey="hora" hide={true} />
                              <YAxis domain={[30, 160]} stroke="#5E6A8A" fontSize={8} tickLine={false} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#0F1420', border: '1px solid #1E2640', borderRadius: '8px' }}
                                labelStyle={{ fontSize: 9, color: '#D4AF37', fontWeight: 'bold' }}
                                itemStyle={{ fontSize: 9, color: '#E2E8F0' }}
                              />
                              <ReferenceArea y1={maxBpm} y2={160} fill="#FF1744" fillOpacity={0.06} />
                              <ReferenceArea y1={30} y2={minBpm} fill="#FF1744" fillOpacity={0.06} />
                              <ReferenceLine y={minBpm} stroke="#FF1744" strokeDasharray="3 3" strokeWidth={1} />
                              <ReferenceLine y={maxBpm} stroke="#FF1744" strokeDasharray="3 3" strokeWidth={1} />
                              <Line type="monotone" dataKey="pulso" stroke="#FF1744" strokeWidth={2} dot={false} activeDot={{ r: 5 }} name="Pulso" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Panel 2: SpO2 */}
                  {(() => {
                    const currentSpO2 = patient.last_telemetry_cache?.spo2?.value || 98;
                    const isSpO2Critical = currentSpO2 < critSpo2;
                    return (
                      <div className={`p-3 rounded-2xl border transition-all ${
                        selectedMetric === 'SPO2' ? 'block' : 'hidden sm:block'
                      } ${
                        isSpO2Critical && !isFalsePositive ? 'border-[#FF1744]/40 bg-[#FF1744]/5 animate-pulse' : 'border-[#1E2640]/50 bg-black/20'
                      }`}>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5 font-mono">
                            <Activity className="h-3.5 w-3.5 text-[#00F2FE]" />
                            <span>Saturación de Oxígeno</span>
                          </h4>
                          <span className="text-[9px] text-[#00F2FE] font-mono font-bold bg-[#00F2FE]/10 px-2 py-0.5 rounded">
                            {currentSpO2}% SpO2
                          </span>
                        </div>
                        <div className="h-28 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart syncId="vitalsSync" data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1E2640" vertical={false} />
                              <XAxis dataKey="hora" hide={true} />
                              <YAxis domain={[80, 101]} stroke="#5E6A8A" fontSize={8} tickLine={false} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#0F1420', border: '1px solid #1E2640', borderRadius: '8px' }}
                                labelStyle={{ fontSize: 9, color: '#D4AF37', fontWeight: 'bold' }}
                                itemStyle={{ fontSize: 9, color: '#E2E8F0' }}
                              />
                              <ReferenceArea y1={80} y2={critSpo2} fill="#FF1744" fillOpacity={0.06} />
                              <ReferenceLine y={critSpo2} stroke="#FF1744" strokeDasharray="3 3" strokeWidth={1} />
                              <Line type="monotone" dataKey="spo2" stroke="#00F2FE" strokeWidth={2} dot={false} activeDot={{ r: 5 }} name="SpO2" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Panel 3: Temperatura */}
                  {(() => {
                    const currentTemp = patient.last_telemetry_cache?.temperature?.value || 36.6;
                    const isTempCritical = currentTemp < minTemp || currentTemp > maxTemp;
                    return (
                      <div className={`p-3 rounded-2xl border transition-all ${
                        selectedMetric === 'TEMP' ? 'block' : 'hidden sm:block'
                      } ${
                        isTempCritical && !isFalsePositive ? 'border-[#FF1744]/40 bg-[#FF1744]/5 animate-pulse' : 'border-[#1E2640]/50 bg-black/20'
                      }`}>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5 font-mono">
                            <Thermometer className="h-3.5 w-3.5 text-amber-400" />
                            <span>Temperatura Corporal</span>
                          </h4>
                          <span className="text-[9px] text-amber-400 font-mono font-bold bg-amber-400/10 px-2 py-0.5 rounded">
                            {currentTemp}°C
                          </span>
                        </div>
                        <div className="h-32 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart syncId="vitalsSync" data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1E2640" vertical={false} />
                              <XAxis dataKey="hora" stroke="#5E6A8A" fontSize={8} tickLine={false} minTickGap={30} />
                              <YAxis domain={[34.0, 41.0]} stroke="#5E6A8A" fontSize={8} tickLine={false} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#0F1420', border: '1px solid #1E2640', borderRadius: '8px' }}
                                labelStyle={{ fontSize: 9, color: '#D4AF37', fontWeight: 'bold' }}
                                itemStyle={{ fontSize: 9, color: '#E2E8F0' }}
                              />
                              <ReferenceArea y1={maxTemp} y2={41} fill="#FF1744" fillOpacity={0.06} />
                              <ReferenceArea y1={34} y2={minTemp} fill="#FF1744" fillOpacity={0.06} />
                              <ReferenceLine y={minTemp} stroke="#FF1744" strokeDasharray="3 3" strokeWidth={1} />
                              <ReferenceLine y={maxTemp} stroke="#FF1744" strokeDasharray="3 3" strokeWidth={1} />
                              <Line type="monotone" dataKey="temperatura" stroke="#D4AF37" strokeWidth={2} dot={false} activeDot={{ r: 5 }} name="Temp" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Componente Flotante de Retorno (Reset to Live) */}
                  {!isTrackingLive && (
                    <button
                      onClick={handleResetToLive}
                      className="absolute bottom-6 right-6 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-extrabold text-[10px] uppercase px-4 py-2.5 rounded-xl shadow-lg shadow-[#D4AF37]/20 border border-[#D4AF37] animate-pulse flex items-center gap-1.5 z-40 transition-all font-mono"
                    >
                      <span className="h-2 w-2 bg-black rounded-full animate-ping" />
                      ▲ Regresar al tiempo real
                    </button>
                  )}

                </div>

                {/* Sub-Directiva de Navegación Visual y Botones de Zoom */}
                <div className="bg-[#0F1420] border border-[#1E2640] p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-[9px] text-slate-500 font-mono">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span>Rango visible: <strong className="text-slate-300">{Math.round(timeWindow / 60)} min</strong></span>
                    <span>&bull;</span>
                    <span>Navegación: Arrastre (Pan) / Zoom: Rueda o Gestos</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleZoom(0.8)}
                      className="px-3 py-1.5 bg-[#1E2640] hover:bg-[#D4AF37] hover:text-black border border-[#D4AF37]/20 hover:border-[#D4AF37] rounded-xl text-slate-300 font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md shadow-black/40 select-none text-[10px]"
                      title="Acercar (Zoom In)"
                    >
                      <ZoomIn className="h-3 w-3" />
                      <span>Zoom In</span>
                    </button>
                    <button
                      onClick={() => handleZoom(1.25)}
                      className="px-3 py-1.5 bg-[#1E2640] hover:bg-[#D4AF37] hover:text-black border border-[#D4AF37]/20 hover:border-[#D4AF37] rounded-xl text-slate-300 font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md shadow-black/40 select-none text-[10px]"
                      title="Alejar (Zoom Out)"
                    >
                      <ZoomOut className="h-3 w-3" />
                      <span>Zoom Out</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* COLUMNA 3: DIAGNÓSTICO E INTEGRIDAD IoT (1/3 de la pestaña -> xl:col-span-1) */}
              <div className="xl:col-span-1 space-y-6 flex flex-col">
                
                {/* Componente 3: Consola de Diagnóstico e Integridad IoT */}
                <div className="bg-glass p-5 rounded-3xl border border-[#1E2640] space-y-4 font-mono text-xs">
                  <div className="flex items-center space-x-2 border-b border-[#1E2640]/60 pb-3">
                    <Cpu className="h-4.5 w-4.5 text-[#D4AF37]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Integridad IoT</h3>
                  </div>

                  <div className="space-y-3">
                    {/* Conectividad LED */}
                    <div className="flex justify-between items-center bg-black/20 p-2.5 rounded-xl border border-[#1E2640]/40">
                      <span className="text-slate-400 font-semibold">Conectividad:</span>
                      <div className="flex items-center space-x-1.5">
                        <span className={`h-2 w-2 rounded-full ${isDeviceActive ? 'bg-emerald-400 animate-pulse shadow-[0_0_6px_#34D399]' : 'bg-rose-500 shadow-[0_0_6px_#EF4444]'}`} />
                        <span className={`font-bold ${isDeviceActive ? 'text-emerald-400' : 'text-rose-500'}`}>
                          {isDeviceActive ? 'ONLINE' : 'OFFLINE'}
                        </span>
                      </div>
                    </div>

                    {/* Confianza de la Señal */}
                    <div className="bg-black/20 p-2.5 rounded-xl border border-[#1E2640]/40 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-semibold">Confianza:</span>
                        <span className={`font-bold ${signalConfidence < 65 ? 'text-amber-500 animate-pulse' : 'text-emerald-400'}`}>
                          {signalConfidence}%
                        </span>
                      </div>
                      <div className="w-full bg-[#0B0F19] h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${signalConfidence < 65 ? 'bg-amber-500' : 'bg-emerald-400'}`} 
                          style={{ width: `${signalConfidence}%` }}
                        />
                      </div>
                      {signalConfidence < 65 && isDeviceActive && (
                        <span className="text-[9px] text-amber-500 font-semibold block leading-tight">
                          * Sensor inestable o ruido en lectura
                        </span>
                      )}
                    </div>

                    {/* Latencia Flujo */}
                    <div className="flex justify-between items-center bg-black/20 p-2.5 rounded-xl border border-[#1E2640]/40">
                      <span className="text-slate-400 font-semibold">Latencia Flujo:</span>
                      <span className="text-emerald-400 font-bold">
                        {gatewayLatency} ms
                      </span>
                    </div>

                    {/* Pérdida de Paquetes */}
                    <div className="flex justify-between items-center bg-black/20 p-2.5 rounded-xl border border-[#1E2640]/40">
                      <span className="text-slate-400 font-semibold">Dropped Pkts:</span>
                      <span className={`font-bold ${packetDropRate > 5 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                        {packetDropRate}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Componente 4: Timeline de Micro-Incidentes Transitorios */}
                <div className="bg-glass p-5 rounded-3xl border border-[#1E2640] space-y-4 font-mono text-xs flex-1 flex flex-col min-h-[220px]">
                  <div className="flex items-center space-x-2 border-b border-[#1E2640]/60 pb-3">
                    <Clock className="h-4.5 w-4.5 text-[#D4AF37]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Micro-Incidentes</h3>
                  </div>

                  <div className="space-y-3 overflow-y-auto max-h-[320px] pr-1 flex-1">
                    {microIncidents.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 uppercase text-[9px] font-bold">
                        Sin incidentes registrados
                      </div>
                    ) : (
                      microIncidents.map((inc, i) => (
                        <div key={i} className="border-b border-[#1E2640]/30 pb-2 last:border-0">
                          <div className="flex justify-between text-[9px] text-slate-500 font-bold mb-0.5 font-sans">
                            <span>{inc.time}</span>
                            <span className="text-[#D4AF37] font-mono">LIVE</span>
                          </div>
                          <p className={`text-[10px] leading-relaxed ${inc.color}`}>
                            {inc.desc}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
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
                              <span className="block mt-0.5 text-emerald-500/80 font-sans">
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
                    disabled={user?.role === 'CLIENT'}
                    className={`w-full px-3 py-2 bg-[#0B0F19] border border-[#1E2640] rounded-xl outline-none text-slate-200 sm:col-span-3 text-xs ${user?.role === 'CLIENT' ? 'opacity-60 cursor-not-allowed' : 'focus:border-[#D4AF37]'}`}
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
                      disabled={user?.role === 'CLIENT'}
                      placeholder="Hipertensión, Asma, Diabetes (separar por comas)"
                      className={`w-full px-3.5 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl outline-none text-xs ${user?.role === 'CLIENT' ? 'opacity-60 cursor-not-allowed' : 'focus:border-[#D4AF37]'}`}
                    />
                    <span className="text-[9px] text-slate-500 italic block font-sans">* Ingrese términos separados por coma.</span>
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
                      disabled={user?.role === 'CLIENT'}
                      placeholder="Penicilina, Nueces, Mariscos (separar por comas)"
                      className={`w-full px-3.5 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl outline-none text-xs ${user?.role === 'CLIENT' ? 'opacity-60 cursor-not-allowed' : 'focus:border-[#D4AF37]'}`}
                    />
                  </div>
                </div>

                {/* Notas Clínicas */}
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2">
                  <span className="text-slate-400 font-semibold sm:col-span-1 mt-1.5">Observaciones:</span>
                  <textarea
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    disabled={user?.role === 'CLIENT'}
                    placeholder="Notas médicas, indicaciones sobre el tratamiento..."
                    rows={4}
                    className={`w-full px-3.5 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl outline-none text-slate-200 placeholder:text-slate-600 resize-none sm:col-span-3 text-xs font-sans ${user?.role === 'CLIENT' ? 'opacity-60 cursor-not-allowed' : 'focus:border-[#D4AF37]'}`}
                  />
                </div>
              </div>

              {/* Botón de guardado de Ficha */}
              {user?.role !== 'CLIENT' && (
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
              )}

            </div>
          )}

        </div>

      </div>

      <ConfirmationModal
        isOpen={isConfirmThresholdsOpen}
        onClose={() => setIsConfirmThresholdsOpen(false)}
        onConfirm={executeSaveThresholds}
        title="Guardar Umbrales Clínicos"
        message={`¿Está seguro de que desea calibrar los umbrales clínicos de telemetría? Esto modificará los rangos normales y críticos para la generación automática de alertas SOS.`}
        confirmText="Guardar Umbrales"
        type="warning"
      />

      <ConfirmationModal
        isOpen={isConfirmClinicalHistoryOpen}
        onClose={() => setIsConfirmClinicalHistoryOpen(false)}
        onConfirm={executeSaveClinicalHistory}
        title="Actualizar Ficha de Antecedentes"
        message="¿Está seguro de que desea guardar los cambios en la ficha de antecedentes clínicos, patologías y alergias del paciente?"
        confirmText="Actualizar Ficha"
        type="warning"
      />

      <ConfirmationModal
        isOpen={isConfirmResolveAlertOpen}
        onClose={() => {
          setIsConfirmResolveAlertOpen(false);
          setAlertIdToResolve(null);
        }}
        onConfirm={executeResolveAlert}
        title="Resolver Alerta SOS"
        message="¿Está seguro de que desea resolver esta alerta crítica de telemetría? Esto cambiará el estado de la alerta a RESOLVED y notificará al centro de operaciones que la crisis ha sido atendida."
        confirmText="Resolver Alerta"
        type="success"
      />

      <EntityLookupModal
        isOpen={lookupState.isOpen}
        onClose={() => setLookupState({ ...lookupState, isOpen: false })}
        entityType={lookupState.type}
        title={lookupState.title}
        onSelect={handleEntitySelect}
      />

      {verificationState.target && (
        <ActionVerificationModal
          isOpen={verificationState.isOpen}
          onClose={() => setVerificationState({ ...verificationState, isOpen: false })}
          onConfirm={executeLinkage}
          sourceEntity={{ type: 'patient', name: `${patient.first_name} ${patient.last_name}`, subtitle: `ID: ${patient.national_id}` }}
          targetEntity={{
            type: verificationState.type === 'devices' ? 'device' : verificationState.type === 'doctors' ? 'doctor' : 'client',
            name: verificationState.type === 'devices' ? verificationState.target.serial_number :
                  verificationState.type === 'doctors' ? `${verificationState.target.first_name} ${verificationState.target.last_name}` :
                  verificationState.target.corporate_name,
            subtitle: verificationState.type === 'devices' ? `MAC: ${verificationState.target.mac_address}` :
                      verificationState.type === 'doctors' ? `Lic: ${verificationState.target.medical_license}` :
                      `Tax ID: ${verificationState.target.tax_id}`
          }}
          impactText={verificationState.impactText}
        />
      )}
    </div>
  );
};

export default PatientDetailView;
