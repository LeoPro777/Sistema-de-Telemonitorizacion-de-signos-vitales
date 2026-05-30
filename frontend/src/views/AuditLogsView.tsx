import React, { useState } from 'react';
import { 
  Search, Cpu, Terminal, 
  Download, X, HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export const AuditLogsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'GLOBAL_ACTIVITY' | 'IOT_TELEMETRY'>('GLOBAL_ACTIVITY');
  const [criticalityFilter, setCriticalityFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Detalle de log en modal

  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // Datos Semilla de Alta Fidelidad para Auditoría Fuera de Línea / Simulado
  const [globalLogs] = useState<any[]>([
    {
      _id: "60c72b2f9b1d8b2a3c8e4d21",
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
      log_type: "GLOBAL_ACTIVITY",
      criticality: "WARNING",
      event_action: "UPDATE_PATIENT_THRESHOLDS",
      actor: { user_id: "60c72b2f9b1d8b2a3c8e4d10", username: "dr_lopez", role: "DOCTOR", ip_address: "192.168.1.104" },
      previous_values: {
        patient_id: "60c72b2f9b1d8b2a3c8e4d99",
        heart_rate: { min_bpm: 60, max_bpm: 100 },
        spo2: { critical_min_percent: 92 },
        temperature: { min_celsius: 35.0, max_celsius: 38.0 }
      },
      new_values: {
        patient_id: "60c72b2f9b1d8b2a3c8e4d99",
        heart_rate: { min_bpm: 65, max_bpm: 110 }, // Cambios resaltados
        spo2: { critical_min_percent: 90 },
        temperature: { min_celsius: 35.0, max_celsius: 38.0 }
      }
    },
    {
      _id: "60c72b2f9b1d8b2a3c8e4d22",
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      log_type: "GLOBAL_ACTIVITY",
      criticality: "CRITICAL",
      event_action: "DISABLE_DOCTOR_ACCOUNT",
      actor: { user_id: "60c72b2f9b1d8b2a3c8e4d01", username: "admin_master", role: "ADMIN", ip_address: "186.23.45.112" },
      previous_values: {
        doctor_id: "60c72b2f9b1d8b2a3c8e4d15",
        first_name: "Pedro",
        last_name: "Ramírez",
        is_active: true,
        user_status: "ACTIVE"
      },
      new_values: {
        doctor_id: "60c72b2f9b1d8b2a3c8e4d15",
        first_name: "Pedro",
        last_name: "Ramírez",
        is_active: false, // Cambios
        user_status: "SUSPENDED"
      }
    },
    {
      _id: "60c72b2f9b1d8b2a3c8e4d23",
      timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
      log_type: "GLOBAL_ACTIVITY",
      criticality: "INFO",
      event_action: "ESP32_PROVISION",
      actor: { user_id: "60c72b2f9b1d8b2a3c8e4d01", username: "admin_master", role: "ADMIN", ip_address: "127.0.0.1" },
      previous_values: null, // Muestra badge REGISTRO NUEVO
      new_values: {
        serial_number: "AURA-ESP32-8822",
        mac_address: "AA:BB:CC:DD:11:22",
        operational_status: "AVAILABLE",
        approval_status: "APPROVED"
      }
    }
  ]);

  const [iotLogs] = useState<any[]>([
    {
      _id: "70a72b2f9b1d8b2a3c8e4e01",
      timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
      log_type: "IOT_TELEMETRY",
      criticality: "INFO",
      device_id: "AURA-ESP32-9021",
      mac_address: "5F:AA:4C:E1:92:2F",
      event_action: "PING_RESPONSE",
      duration_ms: 124,
      connection_state: "CONNECTED"
    },
    {
      _id: "70a72b2f9b1d8b2a3c8e4e02",
      timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
      log_type: "IOT_TELEMETRY",
      criticality: "WARNING",
      device_id: "AURA-ESP32-1002",
      mac_address: "7A:B3:2E:10:E4:9C",
      event_action: "VOLTAGE_DROP_DETECTION",
      duration_ms: 450,
      connection_state: "UNSTABLE"
    },
    {
      _id: "70a72b2f9b1d8b2a3c8e4e03",
      timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
      log_type: "IOT_TELEMETRY",
      criticality: "CRITICAL",
      device_id: "AURA-ESP32-9021",
      mac_address: "5F:AA:4C:E1:92:2F",
      event_action: "CONNECTION_TIMEOUT",
      duration_ms: 5000,
      connection_state: "DISCONNECTED"
    }
  ]);

  const getFilteredLogs = () => {
    const list = activeTab === 'GLOBAL_ACTIVITY' ? globalLogs : iotLogs;
    return list.filter(log => {
      // Filtrar por criticalidad
      if (criticalityFilter && log.criticality !== criticalityFilter) return false;
      
      // Filtrar por búsqueda
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const actionMatch = log.event_action?.toLowerCase().includes(query);
        const actorMatch = log.actor?.username?.toLowerCase().includes(query);
        const deviceMatch = log.device_id?.toLowerCase().includes(query);
        const macMatch = log.mac_address?.toLowerCase().includes(query);
        return actionMatch || actorMatch || deviceMatch || macMatch;
      }
      return true;
    });
  };

  const filteredLogs = getFilteredLogs();

  const getCriticalityColor = (level: string) => {
    switch (level) {
      case 'INFO': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25';
      case 'WARNING': return 'text-amber-400 bg-amber-500/10 border-amber-500/25';
      case 'CRITICAL': return 'text-[#FF1744] bg-[#FF1744]/10 border-[#FF1744]/25 animate-pulse';
      default: return 'text-slate-400 bg-slate-800';
    }
  };

  const handleDownloadJson = (log: any) => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(log, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `aura_audit_log_${log._id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('Expediente de logs JSON descargado con éxito.');
  };

  return (
    <div className="space-y-6 font-mono relative">
      
      {/* Cabecera superior */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] text-[#D4AF37] tracking-[0.2em] font-bold uppercase block mb-1">
            MÓDULO 12: AUDITORÍA FORENSE Y SEGURIDAD INMUTABLE
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Consola de Auditoría</h2>
          <p className="text-xs text-slate-400 mt-1">Supervisión de cambios del sistema, ping de hardware e inyección de directivas clínicas.</p>
        </div>

        {/* selectores de tipo de Logs */}
        <div className="flex items-center space-x-2 bg-[#0F1420] border border-[#1E2640] p-1 rounded-xl self-start md:self-auto">
          <button
            onClick={() => { setActiveTab('GLOBAL_ACTIVITY'); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 ${
              activeTab === 'GLOBAL_ACTIVITY'
                ? 'bg-[#D4AF37] text-black shadow-md shadow-[#D4AF37]/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>Actividad Global</span>
          </button>
          
          <button
            onClick={() => { setActiveTab('IOT_TELEMETRY'); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 ${
              activeTab === 'IOT_TELEMETRY'
                ? 'bg-[#D4AF37] text-black shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            <span>Conectividad IoT</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-glass p-5 rounded-3xl border border-[#1E2640] flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Buscador */}
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="h-4.5 w-4.5" />
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
      {filteredLogs.length === 0 ? (
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
                  <th className="py-4 px-6">Timestamp / Fecha</th>
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
                {filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-[#1E2640]/20 transition-all">
                    {/* Col 1: Sello de tiempo */}
                    <td className="py-4 px-6 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
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
                          {log.device_id}
                        </td>
                        {/* Col 5: MAC */}
                        <td className="py-4 px-6 text-center text-slate-500 select-all">
                          {log.mac_address}
                        </td>
                        {/* Col 6: Ping */}
                        <td className="py-4 px-6 text-center font-bold text-slate-300">
                          {log.duration_ms} ms
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
                          onClick={() => handleDownloadJson(log)}
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
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto bg-black/40 border border-[#1E2640]/55 p-6 rounded-2xl">
              
              {/* Columna Izquierda: Estado Anterior */}
              <div className="space-y-3 flex flex-col h-full">
                <span className="text-[9px] text-rose-400 font-bold uppercase tracking-wider block border-b border-rose-500/10 pb-1">
                  Estado Anterior
                </span>
                
                {selectedLog.previous_values ? (
                  <pre className="flex-1 p-4 bg-[#0A0D14] border border-[#1E2640]/30 rounded-xl font-mono text-[10px] text-slate-400 overflow-auto whitespace-pre-wrap select-all leading-normal">
                    {JSON.stringify(selectedLog.previous_values, null, 2)}
                  </pre>
                ) : (
                  <div className="flex-1 border border-dashed border-[#1E2640] rounded-xl flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase border-spacing-2 select-none">
                    [ REGISTRO NUEVO ]
                  </div>
                )}
              </div>

              {/* Columna Derecha: Estado Nuevo */}
              <div className="space-y-3 flex flex-col h-full">
                <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider block border-b border-emerald-500/10 pb-1">
                  Estado Nuevo (Modificaciones Resaltadas)
                </span>
                
                <pre className="flex-1 p-4 bg-[#0A0D14] border border-[#1E2640]/30 rounded-xl font-mono text-[10px] text-emerald-400 overflow-auto whitespace-pre-wrap select-all leading-normal">
                  {/* Visualización inteligente simulando resaltados en neón */}
                  {JSON.stringify(selectedLog.new_values, null, 2)}
                </pre>
              </div>

            </div>

            {/* Footer Modal */}
            <div className="flex items-center space-x-3 mt-6 pt-4 border-t border-[#1E2640]/50">
              <button
                onClick={() => handleDownloadJson(selectedLog)}
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
