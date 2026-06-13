import React, { useState, useEffect } from 'react';
import { 
  Server, Cpu, UserCheck, Check, X 
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface AdminDashboardProps {
  kpis: any;
  onRefresh: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ kpis, onRefresh }) => {
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(true);
  const [rejectingEmail, setRejectingEmail] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Cargar cola de aspirantes pendientes
  const fetchApplicants = async () => {
    try {
      setLoadingApplicants(true);
      const res = await api.get('/applicants', { params: { status: 'PENDING_APPROVAL', limit: 10 } });
      setApplicants(res.data.applicants || []);
      setLoadingApplicants(false);
    } catch (err) {
      console.error('Error cargando aspirantes:', err);
      setLoadingApplicants(false);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, [kpis]);

  // Manejar Aprobación
  const handleApprove = async (email: string) => {
    const loadingToast = toast.loading('Aprobando aspirante e inicializando perfil...');
    try {
      await api.post(`/applicants/${email}/review`, {
        status: 'APPROVED'
      });
      toast.dismiss(loadingToast);
      toast.success('Aspirante aprobado exitosamente.');
      fetchApplicants();
      onRefresh(); // Sincronizar contadores del panel
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.detail || 'Error al aprobar al aspirante');
    }
  };

  // Manejar Rechazo
  const handleReject = async (email: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Debe ingresar un motivo para el rechazo');
      return;
    }
    const loadingToast = toast.loading('Rechazando solicitud...');
    try {
      await api.post(`/applicants/${email}/review`, {
        status: 'REJECTED',
        rejection_reason: rejectionReason
      });
      toast.dismiss(loadingToast);
      toast.success('Solicitud rechazada correctamente.');
      setRejectingEmail(null);
      setRejectionReason('');
      fetchApplicants();
      onRefresh();
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.detail || 'Error al rechazar solicitud');
    }
  };

  // Convertir segundos de uptime a formato legible
  const formatUptime = (totalSeconds: number) => {
    if (!totalSeconds) return '--';
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    let uptimeStr = '';
    if (days > 0) uptimeStr += `${days}d `;
    if (hours > 0) uptimeStr += `${hours}h `;
    uptimeStr += `${minutes}m`;
    return uptimeStr;
  };

  const throughputHistory = kpis.server_throughput_history || [];
  const hardwareIssues = kpis.hardware_issues || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Zona Superior: Métricas de Servidor */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Throughput API */}
        <div className="bg-[#1E2640] p-6 rounded-3xl border border-[#1E2640] hover:border-[#D4AF37]/30 transition-all flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div className="h-12 w-12 bg-[#0B0F19] rounded-2xl flex items-center justify-center text-cyan-400 border border-cyan-500/25">
              <Server className="h-5 w-5 animate-pulse" />
            </div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">RENDIMIENTO</span>
          </div>
          <div className="my-2">
            <span className="text-4xl font-extrabold tracking-tight text-white block">
              {kpis.throughput_rps || 0}
            </span>
            <span className="text-xs font-semibold text-slate-300 block mt-0.5">
              Ingesta de Telemetría (pts/seg)
            </span>
          </div>
        </div>

        {/* Uptime Servidor */}
        <div className="bg-[#1E2640] p-6 rounded-3xl border border-[#1E2640] hover:border-[#D4AF37]/30 transition-all flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div className="h-12 w-12 bg-[#0B0F19] rounded-2xl flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/20">
              <Cpu className="h-5 w-5" />
            </div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">INFRAESTRUCTURA</span>
          </div>
          <div className="my-2">
            <span className="text-4xl font-extrabold tracking-tight text-white block">
              {formatUptime(kpis.uptime_seconds)}
            </span>
            <span className="text-xs font-semibold text-slate-300 block mt-0.5">
              Uptime del Contenedor FastAPI
            </span>
          </div>
        </div>

        {/* Aspirantes Pendientes */}
        <div className="bg-[#1E2640] p-6 rounded-3xl border border-[#1E2640] hover:border-[#D4AF37]/30 transition-all flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div className="h-12 w-12 bg-[#0B0F19] rounded-2xl flex items-center justify-center text-red-400 border border-red-500/25">
              <UserCheck className="h-5 w-5" />
            </div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">AUDITORÍA</span>
          </div>
          <div className="my-2">
            <span className="text-4xl font-extrabold tracking-tight text-white block">
              {kpis.pending_applicants || 0}
            </span>
            <span className="text-xs font-semibold text-slate-300 block mt-0.5">
              Aspirantes Pendientes de Verificación
            </span>
          </div>
        </div>

      </div>

      {/* 2. Área Central (40% Cola de Atención de Aspirantes - 60% Telemetría de Infraestructura) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        
        {/* Cola de Atención de Aspirantes (40% / 4 columnas) */}
        <div className="bg-[#1E2640] p-6 rounded-3xl border border-[#1E2640] lg:col-span-4 flex flex-col justify-between">
          <div className="mb-4">
            <span className="text-[10px] text-[#D4AF37] tracking-[0.2em] font-bold uppercase block mb-1">AUDITORÍA LEGAL</span>
            <h3 className="text-base font-bold text-white">Cola de Atención de Aspirantes</h3>
            <p className="text-xs text-slate-400 mt-1">Nuevas solicitudes pendientes de revisión por Google OAuth.</p>
          </div>

          {loadingApplicants ? (
            <div className="h-72 flex flex-col items-center justify-center space-y-2">
              <div className="w-6 h-6 border-3 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-500">Buscando solicitudes...</span>
            </div>
          ) : applicants.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center border border-dashed border-[#0B0F19]/80 rounded-2xl bg-black/10">
              <span className="text-xs text-slate-500">Cola vacía. Todo al día.</span>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto max-h-[26rem] pr-2 custom-scrollbar">
              {applicants.map((app) => (
                <div key={app._id} className="p-4 rounded-2xl bg-[#0B0F19]/30 border border-[#0B0F19]/60 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="px-2 py-0.5 rounded-md text-[8px] font-bold bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 uppercase">
                        {app.requested_role}
                      </span>
                      <span className="text-[8px] text-slate-500 font-mono">
                        {new Date(app.submitted_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wide mt-2">
                      {app.personal_data?.first_name} {app.personal_data?.last_name}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">{app.personal_data?.email}</p>
                    {app.professional_metadata?.specialty && (
                      <p className="text-[9px] text-[#D4AF37] font-semibold mt-1">
                        Especialidad: <span className="text-slate-300 font-sans">{app.professional_metadata.specialty}</span>
                      </p>
                    )}
                    {app.professional_metadata?.corporate_name && (
                      <p className="text-[9px] text-[#D4AF37] font-semibold mt-1">
                        Clínica: <span className="text-slate-300 font-sans">{app.professional_metadata.corporate_name}</span>
                      </p>
                    )}
                  </div>

                  {rejectingEmail === app.personal_data.email ? (
                    <div className="space-y-2 animate-in slide-in-from-bottom-2 duration-150">
                      <textarea
                        placeholder="Escriba el motivo del rechazo..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full p-2 bg-[#0B0F19] border border-[#FF1744]/30 rounded-xl text-[10px] outline-none text-slate-100 focus:border-[#FF1744]"
                        rows={2}
                      />
                      <div className="flex space-x-2 justify-end">
                        <button
                          onClick={() => handleReject(app.personal_data.email)}
                          className="px-3 py-1 bg-[#FF1744] hover:bg-[#FF1744]/90 text-black font-bold text-[9px] rounded-lg transition-all"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => { setRejectingEmail(null); setRejectionReason(''); }}
                          className="px-3 py-1 bg-[#1E2640] hover:bg-[#1E2640]/80 text-slate-300 font-bold text-[9px] rounded-lg border border-[#0B0F19]"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        onClick={() => handleApprove(app.personal_data.email)}
                        className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-[10px] rounded-xl flex items-center justify-center space-x-1 transition-all uppercase tracking-wider"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Aprobar</span>
                      </button>
                      <button
                        onClick={() => setRejectingEmail(app.personal_data.email)}
                        className="px-3 py-1.5 bg-[#FF1744]/15 hover:bg-[#FF1744]/25 text-[#FF1744] border border-[#FF1744]/20 font-bold text-[10px] rounded-xl flex items-center justify-center space-x-1 transition-all"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Telemetría de Servidores e Infraestructura (60% / 6 columnas) */}
        <div className="lg:col-span-6 space-y-6 flex flex-col justify-between">
          
          {/* Velocidad de Ingesta y Carga de Redis */}
          <div className="bg-[#1E2640] p-6 rounded-3xl border border-[#1E2640] h-[225px] flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wide">Velocidad de Ingesta & Carga de Redis</h4>
              <p className="text-[9px] text-slate-400 mt-0.5">Throughput de FastAPI WebSockets y carga de cola Redis.</p>
            </div>

            <div className="h-32 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={throughputHistory} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0B0F19/50" vertical={false} />
                  <XAxis dataKey="time" stroke="#5E6A8A" fontSize={9} tickLine={false} />
                  <YAxis yAxisId="left" stroke="#00F2FE" fontSize={8} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#D4AF37" fontSize={8} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0B0F19', border: '1px solid #1E2640', borderRadius: '8px' }}
                    labelStyle={{ color: '#94A3B8', fontSize: '9px', fontWeight: 'bold' }}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="rps" stroke="#00F2FE" strokeWidth={2} name="RPS" dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="redis_load" stroke="#D4AF37" strokeWidth={2} name="Redis (%)" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Incidencias Técnicas de Hardware (Horizontal Bars) */}
          <div className="bg-[#1E2640] p-6 rounded-3xl border border-[#1E2640] h-[225px] flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wide">Mapeo de Incidencias Técnicas de Hardware</h4>
              <p className="text-[9px] text-slate-400 mt-0.5">Alertas técnicas reportadas por chips ESP32 (Batería, Red, Handshake).</p>
            </div>

            <div className="h-32 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={hardwareIssues}
                  margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#0B0F19/50" horizontal={false} />
                  <XAxis type="number" stroke="#5E6A8A" fontSize={8} tickLine={false} />
                  <YAxis dataKey="issue" type="category" stroke="#5E6A8A" fontSize={8} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0B0F19', border: '1px solid #1E2640', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" fill="#D4AF37" radius={[0, 4, 4, 0]} barSize={12} name="Alertas Activas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
export default AdminDashboard;
