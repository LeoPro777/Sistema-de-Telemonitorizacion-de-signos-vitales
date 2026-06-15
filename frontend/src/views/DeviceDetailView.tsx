import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Cpu, Wifi, ShieldAlert, CheckCircle, HelpCircle,
  Trash2, User, Clock, HardDrive, RefreshCw, AlertTriangle, AlertCircle
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { ConfirmationModal } from '../components';

export const DeviceDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Estados de datos
  const [device, setDevice] = useState<any>(null);
  const [newFirmware, setNewFirmware] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isConfirmToggleOpen, setIsConfirmToggleOpen] = useState(false);
  const [isConfirmFirmwareOpen, setIsConfirmFirmwareOpen] = useState(false);

  const fetchDeviceDetail = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/devices/${id}`);
      setDevice(response.data);
      setNewFirmware(response.data.model_version);
      setIsLoading(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al obtener detalles técnicos del dispositivo.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchDeviceDetail();
    }
  }, [id]);

  const handleUpdateFirmware = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirmware.trim()) {
      toast.error('Debe ingresar una versión de firmware válida.');
      return;
    }
    setIsConfirmFirmwareOpen(true);
  };

  const executeUpdateFirmware = async () => {
    setIsUpdating(true);
    try {
      await api.put(`/devices/${id}`, {
        model_version: newFirmware.trim()
      });
      toast.success(`Firmware actualizado con éxito a la versión ${newFirmware}`);
      await fetchDeviceDetail();
      setIsUpdating(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al actualizar el firmware.');
      setIsUpdating(false);
    }
  };

  const handleToggleActiveState = async () => {
    const nextState = !device.is_active;
    
    setIsUpdating(true);
    try {
      await api.put(`/devices/${id}`, {
        is_active: nextState
      });
      toast.success(nextState ? 'Dispositivo reactivado exitosamente.' : 'Dispositivo desactivado lógicamente con éxito.');
      await fetchDeviceDetail();
      setIsUpdating(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al modificar el estado de activación.');
      setIsUpdating(false);
    }
  };

  // Determinar la potencia de la señal wifi
  const getWifiStatusLabel = (dbm: number) => {
    if (dbm > -60) return { text: 'Excelente', color: 'text-emerald-400' };
    if (dbm > -80) return { text: 'Regular', color: 'text-amber-400' };
    return { text: 'Débil / Inestable', color: 'text-[#FF1744]' };
  };

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-semibold tracking-widest uppercase font-mono">Cargando telemetría del chip...</p>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="bg-glass p-12 text-center rounded-3xl border border-[#1E2640] max-w-lg mx-auto mt-12">
        <AlertTriangle className="h-10 w-10 text-[#FF1744] mx-auto mb-4" />
        <h4 className="text-base font-bold text-slate-200">Dispositivo no encontrado</h4>
        <p className="text-xs text-slate-500 mt-1 mb-6">El hardware solicitado no existe o fue removido de la red NoSQL.</p>
        <button
          onClick={() => navigate('/devices')}
          className="px-4 py-2 bg-[#1E2640] text-[#D4AF37] border border-[#D4AF37]/25 rounded-xl text-xs font-semibold hover:bg-[#1E2640]/80 transition-all flex items-center space-x-2 mx-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al Inventario</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono">
      
      {/* Botón Volver y Cabecera */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/devices')}
          className="p-2 bg-[#1E2640] hover:bg-[#1E2640]/80 border border-[#1E2640] rounded-xl transition-all text-[#D4AF37]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <span className="text-[9px] text-[#D4AF37] tracking-[0.2em] font-bold uppercase block mb-0.5">
            CONSOLA DE CONTROL TÉCNICO
          </span>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-white uppercase">
            Dispositivo {device.serial_number}
          </h2>
        </div>
      </div>

      {/* Main Grid: Details + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna Izquierda: Información y Firmware (2/3 de ancho en pantallas grandes) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Panel 1: Datos Principales */}
          <div className="bg-glass rounded-3xl border border-[#1E2640] p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Cpu className="h-32 w-32" />
            </div>

            <h3 className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest border-b border-[#1E2640] pb-3 mb-4 flex items-center space-x-2">
              <HardDrive className="h-4 w-4 text-[#D4AF37]" />
              <span>Especificaciones Físicas y del Chip</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Número de Serie</span>
                  <span className="text-slate-200 text-sm font-extrabold uppercase select-all">{device.serial_number}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Dirección MAC</span>
                  <span className="text-slate-200 text-sm font-semibold select-all tracking-wider">{device.mac_address}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Versión de MCU</span>
                  <span className="text-[#00F2FE] text-sm font-bold">ESP32-WROOM-32E (Espressif Systems)</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Último Latido (Ping)</span>
                  <span className="text-slate-300 text-xs font-semibold flex items-center space-x-1.5 mt-0.5">
                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                    <span>{new Date(device.hardware_metrics.last_ping_at).toLocaleString('es-VE', { timeZone: 'America/Caracas' })}</span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Estado Operacional</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-block mt-1 ${
                    device.operational_status === 'ASSIGNED' 
                      ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30'
                      : device.operational_status === 'AVAILABLE'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                      : 'bg-[#FF1744]/15 text-[#FF1744] border border-[#FF1744]/35'
                  }`}>
                    {device.operational_status}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Estado de Provisión</span>
                  <span className="text-slate-300 text-xs font-semibold block mt-0.5 uppercase">
                    {device.approval_status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Panel 2: Firmware Upgrade */}
          <div className="bg-glass rounded-3xl border border-[#1E2640] p-6">
            <h3 className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest border-b border-[#1E2640] pb-3 mb-4 flex items-center space-x-2">
              <RefreshCw className="h-4 w-4 text-[#D4AF37]" />
              <span>Actualización de Firmware OTA (Over-The-Air)</span>
            </h3>

            <form onSubmit={handleUpdateFirmware} className="flex flex-col md:flex-row items-end gap-4">
              <div className="flex-1 w-full space-y-2">
                <label className="text-[10px] text-slate-500 font-bold uppercase block">
                  Compilación de Firmware (Ej: V1.2.4)
                </label>
                <input
                  type="text"
                  value={newFirmware}
                  onChange={(e) => setNewFirmware(e.target.value)}
                  placeholder="Ingrese versión de compilación..."
                  disabled={isUpdating}
                  className="w-full pl-4 pr-4 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl text-sm focus:border-[#D4AF37] outline-none transition-all placeholder:text-slate-600 font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdating}
                className="w-full md:w-auto px-6 py-3 bg-[#1E2640] hover:bg-[#D4AF37] hover:text-black text-[#D4AF37] text-xs font-extrabold rounded-xl border border-[#D4AF37]/25 hover:border-[#D4AF37] flex items-center justify-center space-x-2 transition-all uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Flashear OTA</span>
              </button>
            </form>
          </div>

          {/* Panel 3: Historial de Alertas de Hardware */}
          <div className="bg-glass rounded-3xl border border-[#1E2640] p-6">
            <h3 className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest border-b border-[#1E2640] pb-3 mb-4 flex items-center space-x-2">
              <ShieldAlert className="h-4 w-4 text-[#D4AF37]" />
              <span>Bitácora de Incidentes de Hardware</span>
            </h3>

            {(!device.alerts_history || device.alerts_history.length === 0) ? (
              <div className="p-4 text-center text-xs text-slate-500 font-semibold uppercase">
                <CheckCircle className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                <span>No se registran fallas de hardware en las últimas 72 horas.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {device.alerts_history.map((alert: any) => (
                  <div 
                    key={alert._id}
                    className="p-3 bg-black/40 border border-[#1E2640] rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <AlertCircle className="h-4.5 w-4.5 text-[#FF1744] animate-pulse" />
                      <div>
                        <strong className="text-slate-300 block">{alert.alert_type}</strong>
                        <span className="text-[10px] text-slate-500">{alert.description}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold">
                      {new Date(alert.created_at).toLocaleTimeString('es-VE', { timeZone: 'America/Caracas' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Columna Derecha: Asignación e Inactivación Crítica (1/3 de ancho) */}
        <div className="space-y-6">
          
          {/* Panel Paciente Asignado: Reactivo y dinámico */}
          <div className="bg-glass rounded-3xl border border-[#1E2640] p-6 relative overflow-hidden">
            <h3 className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest border-b border-[#1E2640] pb-3 mb-4 flex items-center space-x-2">
              <User className="h-4 w-4 text-[#D4AF37]" />
              <span>Vínculo Clínico</span>
            </h3>

            {device.assigned_patient ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-start space-x-3">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold block">PACIENTE ACTIVO</span>
                    <strong className="text-slate-200 text-sm block leading-tight mt-0.5">
                      {device.assigned_patient.first_name} {device.assigned_patient.last_name}
                    </strong>
                    <span className="text-[10px] text-slate-400 font-bold block mt-1">
                      REC: {device.assigned_patient.medical_record_id}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/patients/${device.assigned_patient.id}`)}
                  className="w-full py-2.5 bg-[#1E2640] hover:bg-[#D4AF37] hover:text-black text-[#D4AF37] text-xs font-bold rounded-xl border border-[#D4AF37]/20 transition-all uppercase tracking-wider text-center"
                >
                  Ver Ficha de Paciente
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-slate-900/50 border border-dashed border-[#1E2640] rounded-2xl text-center">
                  <HelpCircle className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">SIN ASIGNACIÓN ACTIVA</span>
                  <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                    Este hardware está disponible en bodega técnica para ser asignado.
                  </p>
                </div>

                {device.is_active && device.operational_status === 'AVAILABLE' && (
                  <button
                    onClick={() => {
                      toast('Para vincular este dispositivo a un paciente, diríjase a la ficha del paciente en la Consola Médica y realice la vinculación desde allí.');
                      navigate('/patients');
                    }}
                    className="w-full py-2.5 bg-[#1E2640] hover:bg-[#D4AF37]/20 text-slate-300 text-xs font-bold rounded-xl border border-[#1E2640] transition-all uppercase tracking-wider text-center"
                  >
                    Vincular a Paciente
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Panel RF & Telemetría en Caliente */}
          <div className="bg-glass rounded-3xl border border-[#1E2640] p-6">
            <h3 className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest border-b border-[#1E2640] pb-3 mb-4 flex items-center space-x-2">
              <Wifi className="h-4 w-4 text-[#D4AF37]" />
              <span>Diagnóstico de Radiofrecuencia</span>
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold">Nivel RSSI</span>
                <strong className={`font-bold ${getWifiStatusLabel(device.hardware_metrics.signal_strength_dbm).color}`}>
                  {device.hardware_metrics.signal_strength_dbm} dBm
                </strong>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold">Carga de Batería</span>
                <strong className="text-slate-300 font-bold">{device.hardware_metrics.battery_percent}%</strong>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold">Calidad de Enlace</span>
                <span className="text-slate-300 font-semibold">
                  {getWifiStatusLabel(device.hardware_metrics.signal_strength_dbm).text}
                </span>
              </div>
            </div>
          </div>

          {/* Botón de Control Crítico: Desactivación Lógica */}
          <div className="bg-glass rounded-3xl border border-[#1E2640] p-6 border-dashed border-[#FF1744]/25">
            <h3 className="text-xs text-[#FF1744] font-bold uppercase tracking-widest border-b border-[#FF1744]/20 pb-3 mb-4 flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-[#FF1744]" />
              <span>Zona de Control Crítico</span>
            </h3>

            <p className="text-[10px] text-slate-500 leading-normal mb-4 font-bold">
              Desactivar temporalmente el hardware cortará de forma lógica cualquier transmisión telemétrica vinculada en los servidores AURA.
            </p>

            <button
              onClick={() => setIsConfirmToggleOpen(true)}
              disabled={isUpdating}
              className={`w-full py-3 text-xs font-extrabold rounded-xl flex items-center justify-center space-x-2 transition-all uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed ${
                device.is_active 
                  ? 'bg-rose-500/10 hover:bg-[#FF1744] text-[#FF1744] hover:text-white border border-[#FF1744]/25 hover:border-[#FF1744]' 
                  : 'bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/25 hover:border-emerald-500'
              }`}
            >
              <Trash2 className="h-4 w-4" />
              <span>{device.is_active ? 'Desactivar Hardware' : 'Reactivar Hardware'}</span>
            </button>
          </div>

        </div>

      </div>

      <ConfirmationModal
        isOpen={isConfirmToggleOpen}
        onClose={() => setIsConfirmToggleOpen(false)}
        onConfirm={handleToggleActiveState}
        title={device.is_active ? 'Desactivar Hardware' : 'Reactivar Hardware'}
        message={
          device.is_active
            ? `¿Está seguro de que desea desactivar el dispositivo con S/N "${device.serial_number}"? Esto detendrá temporalmente el procesamiento de sus lecturas biométricas en el servidor.`
            : `¿Está seguro de que desea reactivar el dispositivo con S/N "${device.serial_number}"? Esto volverá a recibir y procesar sus transmisiones biométricas.`
        }
        confirmText={device.is_active ? 'Desactivar' : 'Reactivar'}
        type={device.is_active ? 'danger' : 'success'}
      />

      <ConfirmationModal
        isOpen={isConfirmFirmwareOpen}
        onClose={() => setIsConfirmFirmwareOpen(false)}
        onConfirm={executeUpdateFirmware}
        title="Flashear Firmware OTA"
        message={`¿Está seguro de que desea iniciar el proceso OTA para cargar la versión de firmware "${newFirmware.trim()}" en el dispositivo "${device.serial_number}"? El dispositivo se reiniciará durante el flasheo.`}
        confirmText="Iniciar Flasheo"
        type="warning"
      />
    </div>
  );
};
export default DeviceDetailView;
