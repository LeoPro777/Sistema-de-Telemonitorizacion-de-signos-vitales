import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Activity, UserCheck, Smartphone, ChevronRight 
} from 'lucide-react';
import api from '../utils/api';

interface AdminDashboardProps {
  kpis: any;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ kpis }) => {
  const navigate = useNavigate();
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(true);

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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Zona Superior: Tarjetas de KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        
        {/* Clientes Activos */}
        <div className="bg-[#1E2640] p-4 md:p-6 rounded-2xl md:rounded-3xl border border-[#1E2640] hover:border-[#D4AF37]/35 transition-all flex flex-col justify-between h-32 md:h-40 group shadow-lg">
          <div className="flex justify-between items-start">
            <div className="h-9 w-9 md:h-12 md:w-12 bg-[#0B0F19] rounded-xl md:rounded-2xl flex items-center justify-center text-cyan-400 border border-cyan-500/25 group-hover:scale-110 transition-transform">
              <Users className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            <span className="text-[8px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">CLIENTES</span>
          </div>
          <div className="my-1 md:my-2">
            <span className="text-2xl md:text-4xl font-extrabold tracking-tight text-white block">
              {kpis.active_clients || 0}
            </span>
            <span className="text-[10px] md:text-xs font-semibold text-slate-300 block mt-0.5">
              Clientes Activos
            </span>
          </div>
        </div>

        {/* Pacientes Activos */}
        <div className="bg-[#1E2640] p-4 md:p-6 rounded-2xl md:rounded-3xl border border-[#1E2640] hover:border-[#D4AF37]/35 transition-all flex flex-col justify-between h-32 md:h-40 group shadow-lg">
          <div className="flex justify-between items-start">
            <div className="h-9 w-9 md:h-12 md:w-12 bg-[#0B0F19] rounded-xl md:rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <Activity className="h-4 w-4 md:h-5 md:w-5 animate-pulse" />
            </div>
            <span className="text-[8px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">PACIENTES</span>
          </div>
          <div className="my-1 md:my-2">
            <span className="text-2xl md:text-4xl font-extrabold tracking-tight text-white block">
              {kpis.active_patients || 0}
            </span>
            <span className="text-[10px] md:text-xs font-semibold text-slate-300 block mt-0.5">
              Pacientes Activos
            </span>
          </div>
        </div>

        {/* Doctores Activos */}
        <div className="bg-[#1E2640] p-4 md:p-6 rounded-2xl md:rounded-3xl border border-[#1E2640] hover:border-[#D4AF37]/35 transition-all flex flex-col justify-between h-32 md:h-40 group shadow-lg">
          <div className="flex justify-between items-start">
            <div className="h-9 w-9 md:h-12 md:w-12 bg-[#0B0F19] rounded-xl md:rounded-2xl flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/20 group-hover:scale-110 transition-transform">
              <UserCheck className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            <span className="text-[8px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">DOCTORES</span>
          </div>
          <div className="my-1 md:my-2">
            <span className="text-2xl md:text-4xl font-extrabold tracking-tight text-white block">
              {kpis.active_doctors || 0}
            </span>
            <span className="text-[10px] md:text-xs font-semibold text-slate-300 block mt-0.5">
              Doctores Activos
            </span>
          </div>
        </div>

        {/* Dispositivos Activos */}
        <div className="bg-[#1E2640] p-4 md:p-6 rounded-2xl md:rounded-3xl border border-[#1E2640] hover:border-[#D4AF37]/35 transition-all flex flex-col justify-between h-32 md:h-40 group shadow-lg">
          <div className="flex justify-between items-start">
            <div className="h-9 w-9 md:h-12 md:w-12 bg-[#0B0F19] rounded-xl md:rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/25 group-hover:scale-110 transition-transform">
              <Smartphone className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            <span className="text-[8px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">DISPOSITIVOS</span>
          </div>
          <div className="my-1 md:my-2">
            <span className="text-2xl md:text-4xl font-extrabold tracking-tight text-white block">
              {kpis.active_devices || 0}
            </span>
            <span className="text-[10px] md:text-xs font-semibold text-slate-300 block mt-0.5">
              Dispositivos Activos
            </span>
          </div>
        </div>

      </div>

      {/* 2. Área Central: Panel Reducido de Aspirantes */}
      <div className="bg-[#1E2640] p-6 rounded-3xl border border-[#1E2640] shadow-xl">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <span className="text-[10px] text-[#D4AF37] tracking-[0.2em] font-bold uppercase block mb-1">AUDITORÍA Y ONBOARDING</span>
            <h3 className="text-lg font-bold text-white">Cola de Aspirantes</h3>
            <p className="text-xs text-slate-400 mt-1">
              Revisión de solicitudes registradas en el sistema pendientes de aprobación.
            </p>
          </div>
          <span className="px-3 py-1 bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-bold rounded-full border border-[#D4AF37]/20 font-mono">
            {applicants.length} Pendientes
          </span>
        </div>

        {loadingApplicants ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400">Cargando aspirantes...</span>
          </div>
        ) : applicants.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center border border-dashed border-[#0B0F19]/80 rounded-2xl bg-black/10">
            <UserCheck className="h-12 w-12 text-slate-600 mb-3 animate-pulse" />
            <span className="text-sm font-semibold text-slate-400">Sin solicitudes pendientes</span>
            <p className="text-xs text-slate-500 mt-1">Todos los aspirantes han sido procesados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[36rem] overflow-y-auto pr-2 custom-scrollbar">
            {applicants.map((app) => (
              <div 
                key={app._id} 
                className="bg-[#0B0F19]/40 border border-[#0B0F19]/80 rounded-2xl p-5 hover:border-[#D4AF37]/35 transition-all flex flex-col justify-between space-y-4 shadow-md"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                      app.requested_role === 'DOCTOR' 
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                        : app.requested_role === 'CLIENT'
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {app.requested_role === 'DOCTOR' ? 'Doctor' : app.requested_role === 'CLIENT' ? 'Cliente' : 'Paciente'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(app.submitted_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white uppercase tracking-wide mt-3">
                    {app.personal_data?.first_name} {app.personal_data?.last_name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 font-mono">{app.personal_data?.email}</p>
                  
                  <div className="mt-3 pt-3 border-t border-[#1E2640]/55 space-y-1.5 text-xs text-slate-300">
                    <p><strong className="text-slate-400">Identificación:</strong> {app.personal_data?.identification_number}</p>
                    <p><strong className="text-slate-400">Teléfono:</strong> {app.personal_data?.phone}</p>
                    {app.professional_metadata?.specialty && (
                      <p><strong className="text-slate-400">Especialidad:</strong> {app.professional_metadata.specialty}</p>
                    )}
                    {app.professional_metadata?.medical_license && (
                      <p><strong className="text-slate-400">Licencia:</strong> {app.professional_metadata.medical_license}</p>
                    )}
                    {app.professional_metadata?.corporate_name && (
                      <p><strong className="text-slate-400">Razón Social:</strong> {app.professional_metadata.corporate_name}</p>
                    )}
                    {app.professional_metadata?.tax_id && (
                      <p><strong className="text-slate-400">Tax ID:</strong> {app.professional_metadata.tax_id}</p>
                    )}
                  </div>
                </div>

                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      onClick={() => navigate(`/applicants/${app.personal_data.email}`)}
                      className="w-full py-2 bg-[#1E2640] hover:bg-[#D4AF37] text-[#D4AF37] hover:text-black border border-[#D4AF37]/20 hover:border-[#D4AF37] font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all uppercase tracking-wider shadow-md active:scale-[0.98] group"
                    >
                      <span>Revisar</span>
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1 duration-300" />
                    </button>
                  </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default AdminDashboard;
