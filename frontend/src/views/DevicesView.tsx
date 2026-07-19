import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Battery, Wifi, Cpu, AlertTriangle,
  CheckCircle, Settings, ShieldAlert, WifiOff
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useTour } from '../hooks/useTour';

export const DevicesView: React.FC = () => {
  const navigate = useNavigate();

  // Configuración del Product Tour
  const tourSteps = [
    {
      element: '#devices-header',
      popover: {
        title: 'Consola de Dispositivos',
        description: 'Aquí puedes supervisar y administrar todos los microcontroladores ESP32 e instrumentos biométricos del sistema.',
        position: 'bottom'
      }
    },
    {
      element: '#provision-device-btn',
      popover: {
        title: 'Provisión de Hardware',
        description: 'Utiliza esta opción para registrar y aprovisionar un nuevo dispositivo ESP32 en el ecosistema IoT.',
        position: 'bottom'
      }
    },
    {
      element: '#devices-search',
      popover: {
        title: 'Buscador Técnico',
        description: 'Busca rápidamente dispositivos utilizando su número de serie de hardware (S/N) o su dirección MAC única.',
        position: 'bottom'
      }
    },
    {
      element: '#operational-status-filter',
      popover: {
        title: 'Filtro Operacional',
        description: 'Filtra el equipamiento de acuerdo a su estado en tiempo real: Disponible, Asignado a paciente o en Mantenimiento técnico.',
        position: 'bottom'
      }
    }
  ];

  useTour('devices_tour', tourSteps);

  // Estados de datos
  const [devices, setDevices] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [search, setSearch] = useState('');
  const [operationalStatus, setOperationalStatus] = useState<string>('');
  const [approvalStatus, setApprovalStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/devices', {
        params: {
          search: search || undefined,
          operational_status: operationalStatus || undefined,
          approval_status: approvalStatus || undefined,
          page,
          limit
        }
      });
      setDevices(response.data.devices);
      setTotal(response.data.total);
      setIsLoading(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al cargar el inventario técnico de hardware.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchDevices();
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [search, operationalStatus, approvalStatus, page]);

  const getOperationalStatusColor = (status: string) => {
    switch (status) {
      case 'ASSIGNED':
        return 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/35';
      case 'AVAILABLE':
        return 'bg-[#00F2FE]/10 text-[#00F2FE] border border-[#00F2FE]/35';
      case 'MAINTENANCE':
        return 'bg-[#FF1744]/10 text-[#FF1744] border border-[#FF1744]/35';
      default:
        return 'bg-slate-800 text-slate-400 border border-slate-700';
    }
  };

  const getApprovalStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25';
      case 'PENDING_APPROVAL':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/25 animate-pulse';
      case 'REJECTED':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/25';
      default:
        return 'bg-slate-800 text-slate-400';
    }
  };

  // Determinar la potencia de la señal wifi
  const getWifiIcon = (dbm: number) => {
    if (dbm > -60) return <span title={`${dbm} dBm - Excelente`}><Wifi className="h-4 w-4 text-emerald-400" /></span>;
    if (dbm > -80) return <span title={`${dbm} dBm - Regular`}><Wifi className="h-4 w-4 text-amber-400" /></span>;
    return <span title={`${dbm} dBm - Crítica`}><WifiOff className="h-4 w-4 text-[#FF1744] animate-pulse" /></span>;
  };

  // Determinar el color de la batería
  const getBatteryColor = (percent: number) => {
    if (percent > 50) return 'bg-emerald-400';
    if (percent > 20) return 'bg-amber-400';
    return 'bg-[#FF1744] animate-pulse';
  };

  return (
    <div className="space-y-6">

      {/* Cabecera de Página */}
      <div id="devices-header" className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Consola de Dispositivos</h2>
        </div>

        {/* Botón Provisión de Hardware */}
        <button
          onClick={() => navigate('/devices/provision')}
          id="provision-device-btn"
          className="px-4 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] hover:from-[#AA7C11] hover:to-[#AA7C11]/80 text-black text-xs font-extrabold rounded-xl shadow-lg shadow-[#D4AF37]/15 flex items-center space-x-2 transition-all self-start md:self-auto uppercase tracking-wider"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>Proveer Dispositivo</span>
        </button>
      </div>

      {/* Barra de Filtros Avanzada */}
      <div className="bg-glass p-5 rounded-3xl border border-[#1E2640] flex flex-col lg:flex-row gap-4 items-center justify-between">

        {/* Buscador */}
        <div className="relative w-full lg:w-96">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="h-4.5 w-4.5" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="devices-search"
            placeholder="Buscar por MAC o Número de Serie..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl text-sm focus:border-[#D4AF37] outline-none transition-all placeholder:text-slate-600 font-mono"
          />
        </div>

        {/* selectores de Filtro */}
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">

          {/* Filtro Estado Operacional */}
          <select
            value={operationalStatus}
            onChange={(e) => setOperationalStatus(e.target.value)}
            id="operational-status-filter"
            className="bg-[#0B0F19] border border-[#1E2640] text-slate-300 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-[#D4AF37] transition-all cursor-pointer"
          >
            <option value="">Estado Operacional (Todos)</option>
            <option value="AVAILABLE">DISPONIBLE</option>
            <option value="ASSIGNED">ASIGNADO</option>
            <option value="MAINTENANCE">MANTENIMIENTO</option>
          </select>

          {/* Filtro Provisión */}
          <select
            value={approvalStatus}
            onChange={(e) => setApprovalStatus(e.target.value)}
            className="bg-[#0B0F19] border border-[#1E2640] text-slate-300 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-[#D4AF37] transition-all cursor-pointer"
          >
            <option value="">Estado de Provisión (Todos)</option>
            <option value="PENDING_APPROVAL">PENDIENTE DE APROBACIÓN</option>
            <option value="APPROVED">APROBADO (ACTIVO)</option>
            <option value="REJECTED">RECHAZADO</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="h-[40vh] flex flex-col items-center justify-center space-y-4">
          <div className="w-8 h-8 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-semibold tracking-widest uppercase font-mono">Leyendo registros de hardware...</p>
        </div>
      ) : devices.length === 0 ? (
        <div className="bg-glass p-12 text-center rounded-3xl border border-[#1E2640]">
          <AlertTriangle className="h-10 w-10 text-[#FFD700] mx-auto mb-4" />
          <h4 className="text-base font-bold text-slate-200">No se encontraron dispositivos</h4>
          <p className="text-xs text-slate-500 mt-1">Verifique los filtros seleccionados o registre un nuevo hardware.</p>
        </div>
      ) : (
        <>
          {/* Technical Monospaced Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {devices.map((device) => {
              const metrics = device.hardware_metrics || { battery_percent: 100, signal_strength_dbm: -50 };
              const isPending = device.approval_status === 'PENDING_APPROVAL';

              return (
                <div
                  key={device._id}
                  className={`bg-glass rounded-3xl border p-6 flex flex-col justify-between transition-all duration-300 hover:scale-[1.03] group outline-none relative overflow-hidden font-mono ${!device.is_active ? 'grayscale opacity-60' : ''
                    } ${device.has_hardware_alert
                      ? 'border-[#FFD700] bg-[#FFD700]/5 shadow-[0_0_15px_rgba(255,215,0,0.06)] animate-pulse'
                      : 'border-[#1E2640] hover:border-[#D4AF37]/30'
                    }`}
                >

                  {/* Decorative hardware pattern overlay */}
                  <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none select-none">
                    <Cpu className="h-24 w-24" />
                  </div>

                  <div>
                    {/* Tarjeta Cabecera */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2">
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center border ${device.has_hardware_alert
                            ? 'bg-[#FFD700]/25 border-[#FFD700] text-[#FFD700]'
                            : 'bg-[#1E2640] border-[#1E2640] text-slate-400'
                          }`}>
                          <Cpu className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block">MODELO {device.model_version}</span>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase mt-0.5 inline-block ${getApprovalStatusBadge(device.approval_status)}`}>
                            {device.approval_status}
                          </span>
                        </div>
                      </div>

                      {/* Botón Inspección Técnica */}
                      {!isPending && (
                        <button
                          onClick={() => navigate(`/devices/${device._id}`)}
                          className="p-1.5 bg-[#1E2640] hover:bg-[#D4AF37] hover:text-black rounded-lg border border-[#D4AF37]/15 transition-all text-[#D4AF37]"
                          title="Inspeccionar Configuración de Hardware"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                      )}

                      {isPending && (
                        <button
                          onClick={() => navigate(`/devices/provision`)}
                          className="px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:border-amber-400 rounded-lg text-[9px] font-bold transition-all uppercase tracking-wider"
                        >
                          Aprobar
                        </button>
                      )}
                    </div>

                    {/* Serial y MAC Address (Mono) */}
                    <div className="mt-5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-bold">S/N:</span>
                        <strong className="text-slate-200 uppercase tracking-wider">{device.serial_number}</strong>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-bold">MAC:</span>
                        <span className="text-slate-400 tracking-wider font-semibold">{device.mac_address}</span>
                      </div>
                    </div>

                    {/* Hardware Metrics section (Battery and Signal) */}
                    <div className="my-5 border-t border-[#1E2640]/55 pt-4 space-y-3.5">

                      {/* Batería */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500 font-bold flex items-center space-x-1">
                            <Battery className="h-3.5 w-3.5 text-slate-400" />
                            <span>Batería</span>
                          </span>
                          <strong className="text-slate-300">{metrics.battery_percent}%</strong>
                        </div>
                        <div className="w-full bg-black/40 h-2 border border-[#1E2640]/40 rounded overflow-hidden p-[1px]">
                          <div
                            className={`h-full rounded-sm transition-all duration-500 ${getBatteryColor(metrics.battery_percent)}`}
                            style={{ width: `${metrics.battery_percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Potencia de Señal Wifi y Pings */}
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-500 font-bold flex items-center space-x-1">
                          {getWifiIcon(metrics.signal_strength_dbm)}
                          <span>Potencia RF</span>
                        </span>
                        <span className="text-slate-400 font-bold">{metrics.signal_strength_dbm} dBm</span>
                      </div>

                    </div>
                  </div>

                  {/* Footer de Tarjeta con estatus operacional e indicador de alertas */}
                  <div className="flex justify-between items-center border-t border-[#1E2640]/55 pt-4 mt-1">

                    {/* Badge operacional */}
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${getOperationalStatusColor(device.operational_status)}`}>
                      {device.operational_status}
                    </span>

                    {/* Alertas críticas */}
                    {device.has_hardware_alert ? (
                      <span className="text-[8px] font-bold px-2 py-0.5 rounded-md bg-[#FFD700]/25 text-[#FFD700] border border-[#FFD700]/40 flex items-center space-x-1 animate-pulse">
                        <ShieldAlert className="h-3 w-3" />
                        <span>HARDWARE ALERT</span>
                      </span>
                    ) : (
                      <span className="text-[8px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center space-x-1">
                        <CheckCircle className="h-3 w-3" />
                        <span>SISTEMA OK</span>
                      </span>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

          {/* Technical Pagination */}
          {total > limit && (
            <div className="flex justify-between items-center mt-6 px-2 font-mono">
              <span className="text-xs text-slate-500 font-semibold">
                REGISTROS {devices.length} DE {total}
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-[#1E2640] text-[#D4AF37] disabled:opacity-40 disabled:cursor-not-allowed border border-[#D4AF37]/15 rounded-xl text-xs font-bold hover:bg-[#1E2640]/80 transition-all uppercase"
                >
                  PREV
                </button>
                <button
                  onClick={() => setPage(prev => (prev * limit < total ? prev + 1 : prev))}
                  disabled={page * limit >= total}
                  className="px-4 py-2 bg-[#1E2640] text-[#D4AF37] disabled:opacity-40 disabled:cursor-not-allowed border border-[#D4AF37]/15 rounded-xl text-xs font-bold hover:bg-[#1E2640]/80 transition-all uppercase"
                >
                  NEXT
                </button>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
};
export default DevicesView;
