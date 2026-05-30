import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, ChevronRight, HelpCircle, CheckCircle, XCircle
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const ApplicantsView: React.FC = () => {
  const navigate = useNavigate();

  // Estados de datos
  const [applicants, setApplicants] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING_APPROVAL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchApplicants = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/applicants', {
        params: {
          status: statusFilter || undefined,
          page,
          limit
        }
      });
      setApplicants(response.data.applicants);
      setTotal(response.data.total);
      setIsLoading(false);
    } catch (err: any) {
      toast.error('Error al cargar la plantilla de solicitudes de onboarding.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, [statusFilter, page]);

  const getStatusBadge = (status: string) => {
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

  const getRoleLabel = (role: string) => {
    if (role === 'DOCTOR') return 'Personal Médico';
    if (role === 'CLIENT') return 'Entidad de Fondeo';
    return 'Paciente';
  };

  return (
    <div className="space-y-6">
      
      {/* Cabecera superior */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] text-[#D4AF37] tracking-[0.2em] font-bold uppercase block mb-1">
            MÓDULO 8: VALIDACIÓN DE ONBOARDING (AUDITORÍA)
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Registro de Aspirantes</h2>
          <p className="text-xs text-slate-400 mt-1">Inspección de credenciales y expedientes de acreditación legal de médicos y clínicas.</p>
        </div>

        {/* selectores de Estado de Solicitudes */}
        <div className="flex items-center space-x-2 bg-[#0F1420] border border-[#1E2640] p-1 rounded-xl self-start md:self-auto">
          <button
            onClick={() => { setStatusFilter('PENDING_APPROVAL'); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 ${
              statusFilter === 'PENDING_APPROVAL'
                ? 'bg-[#D4AF37] text-black shadow-md shadow-[#D4AF37]/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Pendientes</span>
          </button>
          
          <button
            onClick={() => { setStatusFilter('APPROVED'); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Aprobados</span>
          </button>

          <button
            onClick={() => { setStatusFilter('REJECTED'); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 ${
              statusFilter === 'REJECTED'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <XCircle className="h-3.5 w-3.5" />
            <span>Rechazados</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-[40vh] flex flex-col items-center justify-center space-y-4">
          <div className="w-8 h-8 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-semibold tracking-widest uppercase">Consultando solicitudes NoSQL...</p>
        </div>
      ) : applicants.length === 0 ? (
        <div className="bg-glass p-12 text-center rounded-3xl border border-[#1E2640] max-w-xl mx-auto">
          <HelpCircle className="h-10 w-10 text-slate-600 mx-auto mb-4" />
          <h4 className="text-base font-bold text-slate-200">Bandeja de solicitudes vacía</h4>
          <p className="text-xs text-slate-500 mt-1">No se registran solicitudes en este estado de auditoría.</p>
        </div>
      ) : (
        <>
          {/* Prioritized Ledger (Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {applicants.map((applicant) => {
              const personal = applicant.personal_data || {};
              const metadata = applicant.professional_metadata || {};
              const isDoctor = applicant.requested_role === 'DOCTOR';
              
              return (
                <div
                  key={applicant._id}
                  className={`bg-glass p-6 rounded-3xl border flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] group relative ${
                    statusFilter === 'PENDING_APPROVAL' 
                      ? 'border-[#1E2640] hover:border-[#D4AF37]/30 shadow-sm'
                      : 'border-[#1E2640]/50 bg-black/10'
                  }`}
                >
                  <div>
                    {/* Tarjeta Cabecera */}
                    <div className="flex justify-between items-start">
                      <div className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${getStatusBadge(applicant.status)}`}>
                        {applicant.status}
                      </div>
                      
                      <span className="text-[9px] font-mono text-slate-500 font-bold block bg-black/35 px-2 py-0.5 rounded border border-[#1E2640]">
                        {isDoctor ? 'MÉDICO' : 'CLIENTE'}
                      </span>
                    </div>

                    {/* Información del Solicitante */}
                    <div className="mt-5 space-y-4">
                      <div>
                        <span className="text-[10px] text-[#D4AF37] font-extrabold uppercase tracking-widest block mb-0.5">
                          {getRoleLabel(applicant.requested_role)}
                        </span>
                        <h4 className="text-base font-extrabold text-slate-200 group-hover:text-white transition-colors truncate">
                          {personal.first_name} {personal.last_name}
                        </h4>
                        <span className="text-[9px] text-slate-500 font-mono font-bold uppercase block mt-0.5">
                          RUT ID: {personal.identification_number}
                        </span>
                      </div>

                      {/* Origen Institucional / Razón Social */}
                      <div className="p-3 bg-black/35 border border-[#1E2640] rounded-xl text-xs space-y-1">
                        <span className="text-[9px] text-slate-500 font-bold uppercase block">
                          {isDoctor ? 'Acreditación Clínica' : 'Razón Social'}
                        </span>
                        <strong className="text-slate-300 block truncate">
                          {isDoctor 
                            ? (metadata.institution_origin || 'Hospital / Clínica Origen') 
                            : (metadata.corporate_name || `${personal.first_name} Familia`)}
                        </strong>
                        {isDoctor && (
                          <span className="text-[9px] text-slate-500 font-mono block">
                            LIC: {metadata.medical_license} | {metadata.specialty}
                          </span>
                        )}
                        {!isDoctor && (
                          <span className="text-[9px] text-slate-500 font-mono block">
                            FISCAL ID: {metadata.tax_id}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer Tarjeta: Botón central "Revisar" o Fecha de envío */}
                  <div className="flex justify-between items-center border-t border-[#1E2640]/50 pt-4 mt-6">
                    <span className="text-[9px] text-slate-500 font-mono font-bold flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(applicant.submitted_at).toLocaleDateString()}</span>
                    </span>
                    
                    <button
                      onClick={() => navigate(`/applicants/${personal.email}`)}
                      className={`px-3.5 py-1.5 font-bold text-xs rounded-xl border transition-all flex items-center space-x-1 ${
                        applicant.status === 'PENDING_APPROVAL'
                          ? 'bg-[#1E2640] text-[#D4AF37] border-[#D4AF37]/20 hover:bg-[#D4AF37] hover:text-black hover:border-[#D4AF37]'
                          : 'bg-black/20 text-slate-400 border-slate-700/30 hover:bg-[#1E2640]'
                      }`}
                    >
                      <span>{applicant.status === 'PENDING_APPROVAL' ? 'Revisar' : 'Detalles'}</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>

          {/* Paginación */}
          {total > limit && (
            <div className="flex justify-between items-center mt-6 px-2 font-mono">
              <span className="text-xs text-slate-500 font-semibold">
                REGISTROS {applicants.length} DE {total}
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
export default ApplicantsView;
