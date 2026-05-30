import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Cpu, ShieldAlert, CheckCircle, ShieldX, 
  Send, Plus, Clock, HelpCircle, Server

} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const DeviceProvisionView: React.FC = () => {
  const navigate = useNavigate();

  // Formulario de creación
  const [serialNumber, setSerialNumber] = useState('');
  const [macAddress, setMacAddress] = useState('');
  const [modelVersion, setModelVersion] = useState('V1.2');

  // Estados de datos
  const [pendingDevices, setPendingDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');

  const fetchPendingDevices = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/devices', {
        params: {
          approval_status: 'PENDING_APPROVAL',
          page: 1,
          limit: 100
        }
      });
      setPendingDevices(response.data.devices);
      if (response.data.devices.length > 0) {
        setSelectedDevice(response.data.devices[0]);
      } else {
        setSelectedDevice(null);
      }
      setIsLoading(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al cargar solicitudes de provisión.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingDevices();
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialNumber.trim() || !macAddress.trim() || !modelVersion.trim()) {
      toast.error('Debe completar todos los datos técnicos.');
      return;
    }

    // Validar formato MAC sutilmente
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!macRegex.test(macAddress.trim())) {
      toast.error('Dirección MAC no válida (Ej: 24:0A:C4:8B:58:9C)');
      return;
    }

    setIsProcessing(true);
    setProcessingMessage('Registrando orden de provisión en cola NoSQL...');
    try {
      await api.post('/devices/provision', {
        serial_number: serialNumber.trim().toUpperCase(),
        mac_address: macAddress.trim().toUpperCase(),
        model_version: modelVersion.trim()
      });
      toast.success('Solicitud de provisión registrada con éxito.');
      setSerialNumber('');
      setMacAddress('');
      await fetchPendingDevices();
      setIsProcessing(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al registrar provisión.');
      setIsProcessing(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedDevice) return;

    setIsProcessing(true);
    // Cambiar dinámicamente el mensaje para reflejar el bloqueo exigido por la especificación
    setProcessingMessage(`Inicializando MCU física [${selectedDevice.mac_address}]. Flasheando Firmware compilado OTA y calibrando sensores de telemetría...`);
    
    try {
      await api.post(`/devices/${selectedDevice._id}/approve`);
      toast.success(`Dispositivo ${selectedDevice.serial_number} aprobado. Listo para enlazamiento clínico.`);
      await fetchPendingDevices();
      setIsProcessing(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al aprobar el dispositivo.');
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDevice) return;

    setIsProcessing(true);
    setProcessingMessage('Rechazando provisión técnica...');
    try {
      await api.post(`/devices/${selectedDevice._id}/reject`);
      toast.success('Solicitud de provisión rechazada.');
      await fetchPendingDevices();
      setIsProcessing(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al rechazar el dispositivo.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 font-mono relative">
      
      {/* OVERLAY DE PROCESAMIENTO: Bloquea interfaz y muestra animación de microcontrolador */}
      {isProcessing && (
        <div className="fixed inset-0 bg-[#0B0F19]/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="relative mb-6">
            {/* Pulsing ring */}
            <div className="absolute inset-0 rounded-full bg-[#D4AF37]/10 animate-ping scale-150" />
            <div className="h-16 w-16 bg-[#1E2640] border-2 border-[#D4AF37] rounded-2xl flex items-center justify-center text-[#D4AF37] animate-spin">
              <Cpu className="h-8 w-8" />
            </div>
          </div>
          <h3 className="text-sm font-extrabold text-[#D4AF37] uppercase tracking-[0.2em] mb-2">
            PROCESANDO ENLACE DE HARDWARE
          </h3>
          <p className="text-xs text-slate-400 max-w-md leading-relaxed font-semibold">
            {processingMessage}
          </p>
        </div>
      )}

      {/* Cabecera */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/devices')}
          className="p-2 bg-[#1E2640] hover:bg-[#1E2640]/80 border border-[#1E2640] rounded-xl transition-all text-[#D4AF37]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <span className="text-[9px] text-[#D4AF37] tracking-[0.2em] font-bold uppercase block mb-0.5">
            MÓDULO DE SEGURIDAD Y HARDWARE
          </span>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-white uppercase">
            Flujo de Provisión IoT
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna Izquierda: Formulario de Provisión */}
        <div className="space-y-6">
          <div className="bg-glass rounded-3xl border border-[#1E2640] p-6 relative overflow-hidden">
            <h3 className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest border-b border-[#1E2640] pb-3 mb-4 flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Nueva Orden de Fábrica</span>
            </h3>

            <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
              
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase block">Número de Serie</label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="AURA-ESP32-XXXX"
                  className="w-full pl-4 pr-4 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl text-sm focus:border-[#D4AF37] outline-none transition-all placeholder:text-slate-700 font-bold uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase block">Dirección MAC</label>
                <input
                  type="text"
                  value={macAddress}
                  onChange={(e) => setMacAddress(e.target.value)}
                  placeholder="24:0A:C4:8B:58:9C"
                  className="w-full pl-4 pr-4 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl text-sm focus:border-[#D4AF37] outline-none transition-all placeholder:text-slate-700 font-semibold uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase block">Versión de Modelo de Firmware</label>
                <input
                  type="text"
                  value={modelVersion}
                  onChange={(e) => setModelVersion(e.target.value)}
                  placeholder="V1.2"
                  className="w-full pl-4 pr-4 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl text-sm focus:border-[#D4AF37] outline-none transition-all font-bold"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#1E2640] hover:bg-[#D4AF37] hover:text-black text-[#D4AF37] text-xs font-bold rounded-xl border border-[#D4AF37]/25 hover:border-[#D4AF37] flex items-center justify-center space-x-2 transition-all uppercase tracking-wider mt-2"
              >
                <Send className="h-4 w-4" />
                <span>Enviar a Provisión</span>
              </button>

            </form>
          </div>

          <div className="bg-glass rounded-3xl border border-[#1E2640] p-6 text-xs text-slate-500 space-y-3 leading-relaxed">
            <h4 className="font-extrabold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Server className="h-4 w-4 text-[#D4AF37]" />
              <span>Instrucciones del Chip</span>
            </h4>
            <p>
              El flujo de provisión permite registrar microcontroladores directamente desde fábrica. 
            </p>
            <p>
              Una vez completada la orden, los chips quedan en estado <strong className="text-slate-300">PENDING_APPROVAL</strong> hasta que un Administrador audite los identificadores de hardware y apruebe su integración técnica al servidor.
            </p>
          </div>
        </div>

        {/* Columna Derecha: Consola de Aprobación Binaria (2/3 de ancho) */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-glass rounded-3xl border border-[#1E2640] p-6 flex flex-col md:flex-row gap-6 min-h-[50vh]">
            
            {/* Lista Izquierda de Solicitudes */}
            <div className="w-full md:w-1/2 border-r border-[#1E2640]/55 pr-0 md:pr-6 space-y-4 flex flex-col">
              <h3 className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest border-b border-[#1E2640] pb-3 mb-1 flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Solicitudes en Espera ({pendingDevices.length})</span>
              </h3>

              {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-3">
                  <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] text-slate-600 font-bold uppercase">Buscando colas...</span>
                </div>
              ) : pendingDevices.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12 space-y-2">
                  <CheckCircle className="h-8 w-8 text-emerald-400" />
                  <span className="text-slate-400 font-bold text-xs uppercase block">Cola técnica limpia</span>
                  <p className="text-[10px] text-slate-500 leading-normal max-w-[200px]">
                    No existen solicitudes de provisión pendientes de autorizar.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2 max-h-[40vh] md:max-h-[55vh] pr-1">
                  {pendingDevices.map((dev) => (
                    <button
                      key={dev._id}
                      onClick={() => setSelectedDevice(dev)}
                      className={`w-full p-4 rounded-2xl border text-left flex items-start justify-between transition-all outline-none ${
                        selectedDevice?._id === dev._id
                          ? 'border-[#D4AF37] bg-[#D4AF37]/5'
                          : 'border-[#1E2640] hover:border-[#1E2640]/80 bg-black/10'
                      }`}
                    >
                      <div>
                        <strong className="text-slate-200 block text-xs truncate uppercase leading-tight">
                          {dev.serial_number}
                        </strong>
                        <span className="text-[9px] text-slate-500 font-semibold block mt-1">MAC: {dev.mac_address}</span>
                      </div>
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                        {dev.model_version}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Panel de Aprobación de la Derecha */}
            <div className="w-full md:w-1/2 flex flex-col justify-between">
              
              <div>
                <h3 className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest border-b border-[#1E2640] pb-3 mb-6 flex items-center space-x-2">
                  <ShieldAlert className="h-4 w-4" />
                  <span>Auditoría de Registro</span>
                </h3>

                {selectedDevice ? (
                  <div className="space-y-6 text-xs">
                    
                    <div className="p-4 bg-black/30 border border-[#1E2640] rounded-2xl space-y-4">
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold block uppercase">Dispositivo Solicitado</span>
                        <strong className="text-slate-200 text-sm block mt-0.5 uppercase tracking-wide">
                          {selectedDevice.serial_number}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold block uppercase">Dirección MAC física</span>
                        <span className="text-slate-300 font-semibold block select-all tracking-wider">
                          {selectedDevice.mac_address}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold block uppercase">Versión de Microcódigo</span>
                        <span className="text-slate-300 font-bold block">
                          {selectedDevice.model_version} (ESP32-OTA)
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 font-bold block uppercase">Solicitado en Fecha</span>
                        <span className="text-slate-400 font-semibold block mt-0.5">
                          {selectedDevice.approval_details?.submitted_at
                            ? new Date(selectedDevice.approval_details.submitted_at).toLocaleString()
                            : new Date().toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-amber-500/5 border border-[#D4AF37]/15 rounded-2xl leading-normal text-slate-400 text-[11px]">
                      Al aprobar este chip, el servidor enviará de forma automática el paquete de calibración OTA e inicializará el hardware en estado de inventario <strong className="text-[#00F2FE]">AVAILABLE</strong>.
                    </div>

                  </div>
                ) : (
                  <div className="text-center py-20 text-slate-500">
                    <HelpCircle className="h-10 w-10 text-[#1E2640] mx-auto mb-4" />
                    <span>Seleccione un hardware para iniciar la auditoría forense.</span>
                  </div>
                )}
              </div>

              {/* Botones de Aprobación Binaria */}
              {selectedDevice && (
                <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-[#1E2640]/55">
                  <button
                    onClick={handleReject}
                    className="py-3.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/35 hover:border-rose-500 text-rose-400 text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition-all uppercase tracking-wider"
                  >
                    <ShieldX className="h-4.5 w-4.5" />
                    <span>Rechazar</span>
                  </button>

                  <button
                    onClick={handleApprove}
                    className="py-3.5 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white border border-emerald-500/35 hover:border-emerald-500 text-emerald-400 text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition-all uppercase tracking-wider"
                  >
                    <CheckCircle className="h-4.5 w-4.5" />
                    <span>Aceptar</span>
                  </button>
                </div>
              )}

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
export default DeviceProvisionView;
