import React, { useState, useEffect } from 'react';
import {
  Search, Cpu, Terminal,
  Download, X, HelpCircle, Loader
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { API_BASE_URL } from '../utils/api';

export const AuditLogsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'GLOBAL_ACTIVITY' | 'IOT_TELEMETRY'>('GLOBAL_ACTIVITY');
  const [criticalityFilter, setCriticalityFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  // Estados para logs reales del backend
  const [logs, setLogs] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Detalle de log en modal
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // Debounce para evitar sobrecarga de consultas en FastAPI
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Resetear y cargar logs cuando cambian los filtros principales
  useEffect(() => {
    fetchLogs(true);
  }, [activeTab, criticalityFilter, debouncedSearch]);

  const fetchLogs = async (reset = false) => {
    setIsLoading(true);
    try {
      const params: any = {
        limit: 25,
        log_type: activeTab,
        criticality: criticalityFilter || undefined,
        search: debouncedSearch || undefined
      };
      if (!reset && nextCursor) {
        params.last_id = nextCursor;
      }

      const res = await api.get('/audit-logs', { params });
      if (reset) {
        setLogs(res.data.logs);
      } else {
        setLogs((prev) => [...prev, ...res.data.logs]);
      }
      setNextCursor(res.data.next_cursor);
      setHasMore(res.data.has_more);
    } catch (err) {
      toast.error('Error al recuperar registros de auditoría del servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const getCriticalityColor = (level: string) => {
    switch (level) {
      case 'INFO': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25';
      case 'WARNING': return 'text-amber-400 bg-amber-500/10 border-amber-500/25';
      case 'CRITICAL': return 'text-[#FF1744] bg-[#FF1744]/10 border-[#FF1744]/25 animate-pulse';
      default: return 'text-slate-400 bg-slate-800';
    }
  };

  const handleDownloadSingleJson = (log: any) => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(log, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `aura_audit_log_${log._id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('Log JSON descargado con éxito.');
  };

  const handleExportMassive = (format: 'json' | 'csv') => {
    const token = localStorage.getItem('access_token');
    const queryParams = new URLSearchParams({
      log_type: activeTab,
      criticality: criticalityFilter || '',
      search: debouncedSearch || '',
      token: token || ''
    });
    const exportUrl = `${API_BASE_URL}/audit-logs/export/${format}?${queryParams.toString()}`;

    toast.loading(`Generando exportación de logs (${format.toUpperCase()})...`, { duration: 1500 });
    setTimeout(() => {
      window.open(exportUrl, '_blank');
    }, 1000);
  };

  // Renderizador interactivo comparativo de diferencias JSON (Diff Viewer)
  const renderFormattedDiff = (prevObj: any, newObj: any, type: 'prev' | 'new') => {
    if (!prevObj && type === 'prev') {
      return (
        <div className="flex-grow border border-dashed border-[#1E2640]/80 rounded-2xl flex items-center justify-center p-12 text-[10px] font-bold text-slate-600 uppercase tracking-widest select-none bg-black/10">
          [ REGISTRO NUEVO ]
        </div>
      );
    }

    const obj = type === 'prev' ? prevObj : newObj;
    const opposite = type === 'prev' ? newObj : prevObj;

    if (!obj) {
      return (
        <div className="flex-grow border border-dashed border-[#1E2640]/80 rounded-2xl flex items-center justify-center p-12 text-[10px] font-bold text-slate-600 uppercase tracking-widest select-none bg-black/10">
          [ SIN VALOR ]
        </div>
      );
    }

    return (
      <pre className="flex-grow p-4 bg-[#0A0D14] border border-[#1E2640]/30 rounded-xl font-mono text-[10px] overflow-auto whitespace-pre-wrap select-all leading-relaxed max-h-[50vh]">
        {"{\n"}
        {Object.entries(obj).map(([key, val], idx, arr) => {
          const oppositeVal = opposite ? opposite[key] : undefined;
          const isChanged = oppositeVal !== undefined && JSON.stringify(val) !== JSON.stringify(oppositeVal);
          const isAdded = oppositeVal === undefined && type === 'new';
          const isRemoved = oppositeVal === undefined && type === 'prev';

          let lineClass = "text-slate-400";
          if (isChanged) {
            lineClass = type === 'prev'
              ? "bg-rose-500/10 text-rose-400 font-bold border-l-2 border-rose-500 pl-1.5"
              : "bg-emerald-500/10 text-emerald-400 font-bold border-l-2 border-emerald-500 pl-1.5";
          } else if (isAdded) {
            lineClass = "bg-emerald-500/10 text-emerald-400 font-bold border-l-2 border-emerald-500 pl-1.5";
          } else if (isRemoved) {
            lineClass = "bg-rose-500/10 text-rose-400 font-bold border-l-2 border-rose-500 pl-1.5";
          }

          const formatVal = (v: any): string => {
            if (v === null) return "null";
            if (typeof v === 'object') return JSON.stringify(v);
            if (typeof v === 'string') return `"${v}"`;
            return String(v);
          };

          const comma = idx < arr.length - 1 ? "," : "";
          return (
            <div key={key} className={`px-2 py-0.5 rounded my-0.5 transition-all ${lineClass}`}>
              &nbsp;&nbsp;"{key}": {formatVal(val)}{comma}
            </div>
          );
        })}
        {"}"}
      </pre>
    );
  };

  return (
    <div className="space-y-6 font-mono relative">

      {/* Cabecera superior */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Consola de Auditoría</h2>
        </div>

        {/* selectores y descarga */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-[#0F1420] border border-[#1E2640] p-1 rounded-xl">
            <button
              onClick={() => { setActiveTab('GLOBAL_ACTIVITY'); }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 ${activeTab === 'GLOBAL_ACTIVITY'
                  ? 'bg-[#D4AF37] text-black shadow-md shadow-[#D4AF37]/10'
                  : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>Actividad Global</span>
            </button>

            <button
              onClick={() => { setActiveTab('IOT_TELEMETRY'); }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 ${activeTab === 'IOT_TELEMETRY'
                  ? 'bg-[#D4AF37] text-black shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <Cpu className="h-3.5 w-3.5" />
              <span>Conectividad IoT</span>
            </button>
          </div>

          <button
            onClick={() => handleExportMassive('json')}
            className="px-3.5 py-2 bg-[#1E2640] hover:bg-[#D4AF37] hover:text-black border border-[#D4AF37]/20 hover:border-[#D4AF37] text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 shadow-md active:scale-95"
            title="Exportar bitácora en JSON"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exportar JSON</span>
          </button>

          <button
            onClick={() => handleExportMassive('csv')}
            className="px-3.5 py-2 bg-[#1E2640] hover:bg-[#D4AF37] hover:text-black border border-[#D4AF37]/20 hover:border-[#D4AF37] text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 shadow-md active:scale-95"
            title="Exportar bitácora plana CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-glass p-5 rounded-3xl border border-[#1E2640] flex flex-col md:flex-row gap-4 items-center justify-between">

        {/* Buscador */}
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            {isLoading ? <Loader className="h-4.5 w-4.5 animate-spin text-[#D4AF37]" /> : <Search className="h-4.5 w-4.5" />}
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'GLOBAL_ACTIVITY' ? "Buscar por acción o usuario actor..." : "Buscar por ID del ESP32 o MAC..."}
            className="w-full pl-10 pr-4 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl text-sm focus:border-[#D4AF37] outline-none transition-all placeholder:text-slate-600"
          />
        </div>

        {/* Selector de Nivel de Criticidad */}
        <div className="w-full md:w-auto">
          <select
            value={criticalityFilter}
            onChange={(e) => setCriticalityFilter(e.target.value)}
            className="w-full md:w-56 bg-[#0B0F19] border border-[#1E2640] text-slate-300 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-[#D4AF37] transition-all cursor-pointer"
          >
            <option value="">Criticidad (Todos)</option>
            <option value="INFO">INFO (Cian)</option>
            <option value="WARNING">WARNING (Ámbar)</option>
            <option value="CRITICAL">CRITICAL (Rojo)</option>
          </select>
        </div>

      </div>

      {/* Consola de Logs (Tabla de Alta Densidad) */}
      {logs.length === 0 && !isLoading ? (
        <div className="bg-glass p-12 text-center rounded-3xl border border-[#1E2640] max-w-xl mx-auto">
          <HelpCircle className="h-10 w-10 text-slate-600 mx-auto mb-4" />
          <h4 className="text-base font-bold text-slate-200">No se encontraron logs</h4>
          <p className="text-xs text-slate-500 mt-1">Verifique la palabra clave o el filtro de severidad forense.</p>
        </div>
      ) : (
        <div className="bg-glass rounded-3xl border border-[#1E2640] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0F1420] border-b border-[#1E2640] text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  <th className="py-4 px-6">Timestamp (UTC)</th>
                  <th className="py-4 px-6 text-center">Nivel</th>
                  <th className="py-4 px-6">Acción Evento</th>

                  {activeTab === 'GLOBAL_ACTIVITY' ? (
                    <>
                      <th className="py-4 px-6">Actor / Usuario</th>
                      <th className="py-4 px-6 text-center">Dirección IP</th>
                    </>
                  ) : (
                    <>
                      <th className="py-4 px-6">Hardware ID</th>
                      <th className="py-4 px-6 text-center">Dirección MAC</th>
                      <th className="py-4 px-6 text-center">Ping (ms)</th>
                    </>
                  )}
                  <th className="py-4 px-6 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2640]/40 text-xs font-mono">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-[#1E2640]/20 transition-all">
                    {/* Col 1: Sello de tiempo */}
                    <td className="py-4 px-6 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toISOString().replace('T', ' ').substring(0, 19)}
                    </td>

                    {/* Col 2: Nivel */}
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2 py-0.5 rounded border text-[9px] font-extrabold tracking-wider ${getCriticalityColor(log.criticality)}`}>
                        {log.criticality}
                      </span>
                    </td>

                    {/* Col 3: Acción */}
                    <td className="py-4 px-6 font-bold text-slate-200">
                      {log.event_action}
                    </td>

                    {activeTab === 'GLOBAL_ACTIVITY' ? (
                      <>
                        {/* Col 4: Actor */}
                        <td className="py-4 px-6">
                          <span className="text-[#D4AF37] font-bold">{log.actor?.username}</span>
                          <span className="text-[9px] text-slate-500 block uppercase">{log.actor?.role}</span>
                        </td>
                        {/* Col 5: IP */}
                        <td className="py-4 px-6 text-center text-slate-500 select-all">
                          {log.actor?.ip_address}
                        </td>
                      </>
                    ) : (
                      <>
                        {/* Col 4: Hardware ID */}
                        <td className="py-4 px-6 text-[#D4AF37] font-bold">
                          {log.device_id || "N/A"}
                        </td>
                        {/* Col 5: MAC */}
                        <td className="py-4 px-6 text-center text-slate-500 select-all">
                          {log.mac_address || "N/A"}
                        </td>
                        {/* Col 6: Ping */}
                        <td className="py-4 px-6 text-center font-bold text-slate-300">
                          {log.duration_ms || 0} ms
                        </td>
                      </>
                    )}

                    {/* Col 7: Acciones */}
                    <td className="py-4 px-6 text-right">
                      {activeTab === 'GLOBAL_ACTIVITY' ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1.5 bg-[#1E2640] hover:bg-[#D4AF37] hover:text-black font-bold text-[10px] text-[#D4AF37] rounded-lg border border-[#D4AF37]/20 hover:border-[#D4AF37] transition-all uppercase"
                        >
                          Inspeccionar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDownloadSingleJson(log)}
                          className="p-1.5 bg-[#1E2640] hover:bg-[#D4AF37] hover:text-black rounded-lg border border-[#D4AF37]/20 transition-all"
                          title="Descargar Log JSON"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Botón Cargar Más (Paginación por Cursor) */}
      {hasMore && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => fetchLogs(false)}
            disabled={isLoading}
            className="px-6 py-2.5 bg-[#1E2640] hover:bg-[#D4AF37] hover:text-black font-semibold text-xs text-[#D4AF37] border border-[#D4AF37]/20 hover:border-[#D4AF37] rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md active:scale-95"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Cargar registros anteriores (Cargar más)</span>
            )}
          </button>
        </div>
      )}

      {/* MODAL GLOBAL DIFF VIEWER (AUDITORÍA COMPLETA) */}
      {selectedLog && (
        <div className="fixed inset-0 bg-[#0B0F19]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#080C14] border border-[#1E2640] rounded-3xl p-6 w-full max-w-4xl text-xs flex flex-col justify-between h-[85vh] shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">

            <button
              onClick={() => setSelectedLog(null)}
              className="absolute right-4 top-4 p-1.5 bg-[#1E2640] text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header del Modal */}
            <div className="border-b border-[#1E2640]/60 pb-3 mb-5">
              <div className="flex items-center space-x-2 text-[9px] text-[#D4AF37] font-bold uppercase tracking-wider">
                <Terminal className="h-3.5 w-3.5" />
                <span>Visor de Trazabilidad Completa (Diff Viewer)</span>
              </div>
              <strong className="text-sm text-slate-200 font-extrabold leading-none mt-1 block">
                {selectedLog.event_action} — ID: {selectedLog._id}
              </strong>
            </div>

            {/* Diff Columns */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto bg-black/45 border border-[#1E2640]/55 p-4 md:p-6 rounded-2xl">

              {/* Columna Izquierda: Estado Anterior */}
              <div className="space-y-3 flex flex-col h-full">
                <span className="text-[9px] text-rose-400 font-bold uppercase tracking-wider block border-b border-rose-500/10 pb-1">
                  Estado Anterior
                </span>
                {renderFormattedDiff(selectedLog.previous_values, selectedLog.new_values, 'prev')}
              </div>

              {/* Columna Derecha: Estado Nuevo */}
              <div className="space-y-3 flex flex-col h-full">
                <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider block border-b border-emerald-500/10 pb-1">
                  Estado Nuevo (Modificaciones Resaltadas)
                </span>
                {renderFormattedDiff(selectedLog.previous_values, selectedLog.new_values, 'new')}
              </div>

            </div>

            {/* Footer Modal */}
            <div className="flex items-center space-x-3 mt-6 pt-4 border-t border-[#1E2640]/50">
              <button
                onClick={() => handleDownloadSingleJson(selectedLog)}
                className="flex-1 py-3 bg-[#1E2640] hover:bg-[#D4AF37] hover:text-black font-extrabold text-xs text-[#D4AF37] rounded-xl border border-[#D4AF37]/25 transition-all uppercase tracking-wider text-center flex items-center justify-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Descargar Log Completo</span>
              </button>

              <button
                onClick={() => setSelectedLog(null)}
                className="px-6 py-3 bg-black/35 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-[#1E2640] font-extrabold text-xs rounded-xl transition-all uppercase tracking-wider text-center"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
export default AuditLogsView;
