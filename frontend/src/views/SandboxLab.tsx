import React, { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Heart, Activity, Thermometer, FlaskConical, Plus, Power, ShieldAlert, WifiOff, Trash2 } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface SimulatedDevice {
  id: string;
  serialNumber: string;
  macAddress: string;
  patientId: string;
  isOn: boolean;
  pulse: number;
  spo2: number;
  temperature: number;
  ws: WebSocket | null;
  intervalId: any;
  blink: boolean;
}

export const SandboxLab: React.FC = () => {
  const { user } = useAuthStore();
  const [patients, setPatients] = useState<any[]>([]);
  const [devices, setDevices] = useState<SimulatedDevice[]>([]);
  const [globalJitter, setGlobalJitter] = useState<number>(1);
  const nextSerialRef = useRef<number>(1001);
  
  // Novedad: Referencias fuera del estado para evitar race conditions y "ghost data" de React Strict Mode
  const deviceInstancesRef = useRef<Map<string, { ws: WebSocket | null, intervalId: any, currentRef: any }>>(new Map());
  const globalJitterRef = useRef(globalJitter);

  useEffect(() => {
    globalJitterRef.current = globalJitter;
  }, [globalJitter]);

  // Enforce ADMIN role
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  // Fetch active patients on mount
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await api.get('/patients', { params: { limit: 100 } });
        setPatients(response.data.patients || []);
      } catch (err) {
        console.error('Error fetching patients for Sandbox:', err);
        toast.error('Error al cargar la lista de pacientes.');
      }
    };
    fetchPatients();

    // Cleanup active WebSockets/intervals on unmount using the robust ref map
    return () => {
      deviceInstancesRef.current.forEach((instance) => {
        if (instance.intervalId) clearInterval(instance.intervalId);
        if (instance.ws) instance.ws.close();
      });
      deviceInstancesRef.current.clear();
    };
  }, []);

  // Generate random MAC address
  const generateRandomMac = (): string => {
    const hexDigits = "0123456789ABCDEF";
    let mac = "";
    for (let i = 0; i < 6; i++) {
      mac += hexDigits.charAt(Math.floor(Math.random() * 16));
      mac += hexDigits.charAt(Math.floor(Math.random() * 16));
      if (i < 5) mac += ":";
    }
    return mac;
  };

  // Provision simulated device
  const provisionDevice = () => {
    const serial = `AURA-SIM-${nextSerialRef.current}`;
    nextSerialRef.current += 1;
    const mac = generateRandomMac();

    const newDevice: SimulatedDevice = {
      id: crypto.randomUUID(),
      serialNumber: serial,
      macAddress: mac,
      patientId: '',
      isOn: false,
      pulse: 75,
      spo2: 98,
      temperature: 36.6,
      ws: null,
      intervalId: null,
      blink: false
    };

    deviceInstancesRef.current.set(newDevice.id, { ws: null, intervalId: null, currentRef: null });
    setDevices(prev => [...prev, newDevice]);
    toast.success(`Dispositivo ${serial} provisionado exitosamente en memoria.`);
  };

  // Remove device
  const removeDevice = (id: string) => {
    const instance = deviceInstancesRef.current.get(id);
    if (instance) {
      if (instance.intervalId) clearInterval(instance.intervalId);
      if (instance.ws) instance.ws.close();
      deviceInstancesRef.current.delete(id);
    }
    setDevices(prev => prev.filter(d => d.id !== id));
    toast.success('Dispositivo retirado del laboratorio.');
  };

  // WebSocket protocol selection helper
  const getWsUrl = (patientId: string): string => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const baseHost = window.location.port
      ? `${window.location.hostname}:8000` // Backend port
      : window.location.host;
    return `${wsProtocol}//${baseHost}/ws/vitals/${patientId}`;
  };

  // Start sending telemetry loop
  const startSendingLoop = (device: SimulatedDevice, patientId: string) => {
    if (!patientId) return { ws: null, intervalId: null, currentRef: null };

    const wsUrl = getWsUrl(patientId);
    const ws = new WebSocket(wsUrl);

    // Store state references to send current slider values
    const currentRef = {
      pulse: device.pulse,
      spo2: device.spo2,
      temperature: device.temperature
    };

    ws.onopen = () => {
      console.log(`[Sim] WebSocket conectado al canal del paciente: ${patientId}`);
      toast.success(`Canal establecido para ${device.serialNumber}`);
    };

    ws.onclose = () => {
      console.log(`[Sim] WebSocket desconectado.`);
    };

    ws.onerror = (err) => {
      console.error(`[Sim] Error WebSocket:`, err);
    };

    // Telemetry dispatch loop every 10 seconds
    const intervalId = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        // Calculate random jitter based on global setting
        let jitterVal = 0;
        if (globalJitterRef.current > 0) {
          jitterVal = (Math.random() * globalJitterRef.current * 2) - globalJitterRef.current;
        }

        // Apply slider values + jitter
        const finalPulse = Math.max(40, Math.min(180, Math.round(currentRef.pulse + jitterVal)));
        const finalSpo2 = Math.max(80, Math.min(100, Math.round(currentRef.spo2 + (jitterVal * 0.2))));
        const finalTemp = Math.max(35.0, Math.min(42.0, parseFloat((currentRef.temperature + (jitterVal * 0.05)).toFixed(1))));

        const payload = {
          heart_rate: finalPulse,
          spo2: finalSpo2,
          temperature: finalTemp
        };

        ws.send(JSON.stringify(payload));

        // Pulse the LED indicator visually
        setDevices(prev => prev.map(d => {
          if (d.id === device.id) {
            return { ...d, blink: true };
          }
          return d;
        }));

        setTimeout(() => {
          setDevices(prev => prev.map(d => {
            if (d.id === device.id) {
              return { ...d, blink: false };
            }
            return d;
          }));
        }, 150);
      }
    }, 10000);

    return { ws, intervalId, currentRef };
  };

  // Toggle Power Switch
  const togglePower = (id: string) => {
    const device = devices.find(d => d.id === id);
    if (!device) return;

    if (!device.isOn) {
      if (!device.patientId) {
        toast.error('Debe seleccionar y vincular un paciente antes de encender el dispositivo.');
        return;
      }

      const instance = deviceInstancesRef.current.get(id);
      if (instance) {
        if (instance.intervalId) clearInterval(instance.intervalId);
        if (instance.ws) instance.ws.close();
      }

      const setup = startSendingLoop(device, device.patientId);
      deviceInstancesRef.current.set(id, setup);

      setDevices(prev => prev.map(d => d.id === id ? { ...d, isOn: true } : d));
    } else {
      const instance = deviceInstancesRef.current.get(id);
      if (instance) {
        if (instance.intervalId) clearInterval(instance.intervalId);
        if (instance.ws) instance.ws.close();
        deviceInstancesRef.current.set(id, { ws: null, intervalId: null, currentRef: null });
      }
      setDevices(prev => prev.map(d => d.id === id ? { ...d, isOn: false, blink: false } : d));
    }
  };

  // Handle patient mapping change
  const handlePatientChange = (id: string, patientId: string) => {
    const device = devices.find(d => d.id === id);
    if (!device) return;

    const instance = deviceInstancesRef.current.get(id);

    if (device.isOn) {
      if (instance) {
        if (instance.intervalId) clearInterval(instance.intervalId);
        if (instance.ws) instance.ws.close();
      }

      if (patientId) {
        const setup = startSendingLoop({ ...device, patientId }, patientId);
        deviceInstancesRef.current.set(id, setup);
      } else {
        deviceInstancesRef.current.set(id, { ws: null, intervalId: null, currentRef: null });
      }
    }

    setDevices(prev => prev.map(d => d.id === id ? {
      ...d,
      patientId,
      isOn: patientId ? d.isOn : false
    } : d));
  };

  // Handle slider updates
  const updateSlider = (id: string, metric: 'pulse' | 'spo2' | 'temperature', value: number) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, [metric]: value } : d));
    
    const instance = deviceInstancesRef.current.get(id);
    if (instance && instance.currentRef) {
      instance.currentRef[metric] = value;
      // Eliminada la transmisión inmediata: los datos solo se enviarán en el intervalo de 10s
    }
  };

  // Inject Tachycardia (140 bpm)
  const injectTachycardia = (id: string) => {
    const device = devices.find(d => d.id === id);
    if (device) {
      toast.error(`Inyectando Taquicardia Crítica (140 bpm) en ${device.serialNumber}`, { icon: '🚨' });
    }
    setDevices(prev => prev.map(d => d.id === id ? { ...d, pulse: 140 } : d));
    
    const instance = deviceInstancesRef.current.get(id);
    if (instance && instance.currentRef) {
      instance.currentRef.pulse = 140;
      // Eliminada la transmisión inmediata
    }
  };

  // Inject Hypoxia (88% SpO2)
  const injectHypoxia = (id: string) => {
    const device = devices.find(d => d.id === id);
    if (device) {
      toast.error(`Inyectando Hipoxia Crítica (88% SpO2) en ${device.serialNumber}`, { icon: '🚨' });
    }
    setDevices(prev => prev.map(d => d.id === id ? { ...d, spo2: 88 } : d));
    
    const instance = deviceInstancesRef.current.get(id);
    if (instance && instance.currentRef) {
      instance.currentRef.spo2 = 88;
      // Eliminada la transmisión inmediata
    }
  };

  // Force Abrupt Disconnect (Socket Close immediately)
  const forceDisconnect = (id: string) => {
    const device = devices.find(d => d.id === id);
    if (!device) return;

    if (!device.isOn) {
      toast('El dispositivo debe estar encendido para simular una desconexión abrupta.', { icon: '⚠️' });
      return;
    }

    toast.error(`¡Desconexión Abrupta Forzada! Interrupción destructiva de señal Wi-Fi en ${device.serialNumber}`, { icon: '🔌' });

    const instance = deviceInstancesRef.current.get(id);
    if (instance) {
      if (instance.intervalId) clearInterval(instance.intervalId);
      if (instance.ws) instance.ws.close();
      deviceInstancesRef.current.set(id, { ws: null, intervalId: null, currentRef: null });
    }

    setDevices(prev => prev.map(d => d.id === id ? {
      ...d,
      isOn: false,
      blink: false
    } : d));
  };

  return (
    <div className="space-y-6 font-mono text-xs text-slate-200">

      {/* HEADER PRINCIPAL */}
      <div className="border-b border-[#1E2640] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#D4AF37]">
            <FlaskConical className="h-5 w-5 animate-pulse" />
            <h1 className="text-xl font-black uppercase tracking-wider">SANDBOX LABORATORY</h1>
          </div>
          <p className="text-[10px] text-slate-500 font-sans mt-1">
            Panel de instrumentación y estrés técnico para la simulación de telemetría IoT activa mediante WebSockets.
          </p>
        </div>

        {/* CONTROLES GLOBALES */}
        <div className="flex flex-wrap items-center gap-3">
          {/* JITTER SELECTOR */}
          <div className="flex items-center space-x-2 bg-[#0A0D15] border border-[#1E2640] px-3 py-1.5 rounded-xl">
            <span className="text-[10px] text-slate-500 font-semibold uppercase">Filtro de Ruido (Jitter):</span>
            <select
              value={globalJitter}
              onChange={(e) => setGlobalJitter(Number(e.target.value))}
              className="bg-transparent border-none outline-none text-[#D4AF37] font-bold cursor-pointer pr-4"
            >
              <option value={0} className="bg-[#0F1420]">±0 (Línea Base Pura)</option>
              <option value={1} className="bg-[#0F1420]">±1 (Fluctuación Normal)</option>
              <option value={2} className="bg-[#0F1420]">±2 (Ruido Técnico Medio)</option>
              <option value={3} className="bg-[#0F1420]">±3 (Ruido Técnico Alto)</option>
            </select>
          </div>

          {/* PROVISION BUTTON */}
          <button
            onClick={provisionDevice}
            className="flex items-center space-x-2 bg-gradient-to-r from-[#D4AF37] to-[#AA820A] text-black font-extrabold px-4 py-2 rounded-xl hover:opacity-95 active:scale-98 transition-all shadow-md uppercase"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Provisionar Dispositivo</span>
          </button>
        </div>
      </div>

      {/* GRID DE DISPOSITIVOS SIMULADOS */}
      {devices.length === 0 ? (
        <div className="bg-[#0F1420]/30 border border-dashed border-[#1E2640] rounded-3xl p-12 text-center max-w-lg mx-auto mt-8">
          <FlaskConical className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-400">Sandbox vacío</h3>
          <p className="text-[10px] text-slate-500 mt-1 font-sans">
            Aún no has provisionado ningún microcontrolador simulado. Presiona el botón superior para virtualizar tu primer chip ESP32.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {devices.map((device) => (
            <div
              key={device.id}
              className={`bg-[#0F1420] border rounded-3xl p-5 shadow-2xl relative transition-all duration-300 ${device.isOn
                  ? 'border-[#00F2FE]/40 shadow-[#00F2FE]/5'
                  : 'border-[#1E2640]'
                }`}
            >

              {/* CABECERA TARJETA */}
              <div className="flex items-center justify-between border-b border-[#1E2640]/60 pb-3 mb-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-sm text-[#D4AF37]">{device.serialNumber}</span>
                    {/* Blinking Transmission LED */}
                    <div
                      className={`h-2.5 w-2.5 rounded-full border transition-all duration-150 ${device.isOn
                          ? device.blink
                            ? 'bg-[#00F2FE] border-[#00F2FE] shadow-[0_0_8px_#00F2FE]'
                            : 'bg-[#00F2FE]/20 border-[#00F2FE]/40'
                          : 'bg-red-500/20 border-red-500/40'
                        }`}
                      title={device.isOn ? "Transmitiendo telemetría..." : "Apagado"}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">MAC: {device.macAddress}</div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* POWER TOGGLE */}
                  <button
                    onClick={() => togglePower(device.id)}
                    className={`p-2 rounded-xl border transition-all flex items-center justify-center ${device.isOn
                        ? 'bg-[#00F2FE]/15 border-[#00F2FE]/40 text-[#00F2FE] shadow-[0_0_10px_rgba(0,242,254,0.15)]'
                        : 'bg-red-500/10 border-red-500/25 text-red-500 hover:bg-red-500/20'
                      }`}
                    title={device.isOn ? "Apagar dispositivo" : "Encender e iniciar transmisión WebSocket"}
                  >
                    <Power className="h-4.5 w-4.5" />
                  </button>

                  {/* REMOVE DEVICE */}
                  <button
                    onClick={() => removeDevice(device.id)}
                    className="p-2 bg-slate-800/40 border border-[#1E2640] hover:border-[#FF1744] hover:text-[#FF1744] rounded-xl text-slate-500 transition-all"
                    title="Desprovisionar"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

              {/* CUERPO DE LA TARJETA */}
              <div className="space-y-5">
                {/* SELECTOR DE PACIENTE VINCULADO */}
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[9px] text-slate-500 uppercase font-bold">Vincular a Expediente Clínico:</label>
                  <select
                    value={device.patientId}
                    onChange={(e) => handlePatientChange(device.id, e.target.value)}
                    className="w-full bg-[#0A0D15] border border-[#1E2640] rounded-xl px-3 py-2 outline-none text-slate-300 font-sans focus:border-[#D4AF37] transition-all"
                  >
                    <option value="">-- SELECCIONE UN PACIENTE --</option>
                    {patients.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.first_name} {p.last_name} ({p.medical_record_id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* MODULADORES DE SENSORES (SLIDERS) */}
                <div className="space-y-4 bg-[#0A0D15]/60 border border-[#1E2640]/50 p-4 rounded-2xl">
                  <div className="text-[9px] text-[#D4AF37] uppercase font-black tracking-widest border-b border-[#1E2640]/40 pb-1.5 mb-2">
                    Moduladores de Sensores
                  </div>

                  {/* SLIDER 1: PULSO CARDIACO */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="flex items-center space-x-1.5 text-slate-400 font-bold">
                        <Heart className="h-3.5 w-3.5 text-rose-500" />
                        <span>Frecuencia Cardíaca:</span>
                      </span>
                      <span className="text-[#00F2FE] font-bold">{device.pulse} bpm</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="180"
                      value={device.pulse}
                      onChange={(e) => updateSlider(device.id, 'pulse', Number(e.target.value))}
                      className="w-full h-1 bg-[#1E2640] rounded-lg appearance-none cursor-pointer accent-[#00F2FE]"
                    />
                    <div className="flex justify-between text-[8px] text-slate-600">
                      <span>40 bpm</span>
                      <span>180 bpm</span>
                    </div>
                  </div>

                  {/* SLIDER 2: OXIGENACION */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="flex items-center space-x-1.5 text-slate-400 font-bold">
                        <Activity className="h-3.5 w-3.5 text-cyan-400" />
                        <span>Saturación SpO2:</span>
                      </span>
                      <span className="text-[#00F2FE] font-bold">{device.spo2}%</span>
                    </div>
                    <input
                      type="range"
                      min="80"
                      max="100"
                      value={device.spo2}
                      onChange={(e) => updateSlider(device.id, 'spo2', Number(e.target.value))}
                      className="w-full h-1 bg-[#1E2640] rounded-lg appearance-none cursor-pointer accent-[#00F2FE]"
                    />
                    <div className="flex justify-between text-[8px] text-slate-600">
                      <span>80% SpO2</span>
                      <span>100% SpO2</span>
                    </div>
                  </div>

                  {/* SLIDER 3: TEMPERATURA */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="flex items-center space-x-1.5 text-slate-400 font-bold">
                        <Thermometer className="h-3.5 w-3.5 text-amber-500" />
                        <span>Temperatura Corporal:</span>
                      </span>
                      <span className="text-[#00F2FE] font-bold">{device.temperature.toFixed(1)} °C</span>
                    </div>
                    <input
                      type="range"
                      min="35.0"
                      max="42.0"
                      step="0.1"
                      value={device.temperature}
                      onChange={(e) => updateSlider(device.id, 'temperature', Number(e.target.value))}
                      className="w-full h-1 bg-[#1E2640] rounded-lg appearance-none cursor-pointer accent-[#00F2FE]"
                    />
                    <div className="flex justify-between text-[8px] text-slate-600">
                      <span>35.0 °C</span>
                      <span>42.0 °C</span>
                    </div>
                  </div>
                </div>

                {/* INYECTORES DE ATAQUES CLINICOS */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => injectTachycardia(device.id)}
                    className="flex items-center justify-center space-x-1 py-2 bg-red-950/40 border border-red-500/25 hover:border-red-500/60 text-red-400 hover:text-red-200 rounded-xl transition-all"
                    title="Mueve pulso a 140 bpm"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span className="text-[9px] font-bold uppercase">Taquicardia</span>
                  </button>

                  <button
                    onClick={() => injectHypoxia(device.id)}
                    className="flex items-center justify-center space-x-1 py-2 bg-red-950/40 border border-red-500/25 hover:border-red-500/60 text-red-400 hover:text-red-200 rounded-xl transition-all"
                    title="Mueve SpO2 a 88%"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span className="text-[9px] font-bold uppercase">Hipoxia</span>
                  </button>

                  <button
                    onClick={() => forceDisconnect(device.id)}
                    className="flex items-center justify-center space-x-1 py-2 bg-slate-900 border border-amber-500/20 hover:border-amber-500/60 text-amber-500 hover:text-amber-200 rounded-xl transition-all"
                    title="Cierra el WebSocket de forma abrupta"
                  >
                    <WifiOff className="h-3.5 w-3.5" />
                    <span className="text-[9px] font-bold uppercase">Desconectar</span>
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default SandboxLab;

