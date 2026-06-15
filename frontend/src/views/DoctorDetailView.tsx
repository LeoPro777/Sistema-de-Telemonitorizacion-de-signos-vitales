import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Award, Phone, MapPin, 
  Trash2, User, Clock, CheckCircle2, History, AlertTriangle, AlertCircle

} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { ConfirmationModal } from '../components';

export const DoctorDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Estados de datos
  const [doctor, setDoctor] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const fetchDoctorDetail = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/doctors/${id}`);
      setDoctor(response.data);
      setIsLoading(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al obtener detalles técnicos del doctor.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchDoctorDetail();
    }
  }, [id]);

  const handleToggleActiveState = async () => {
    const nextState = !doctor.is_active;
    
    setIsUpdating(true);
    try {
      await api.put(`/doctors/${id}`, {
        is_active: nextState
      });
      toast.success(nextState ? 'Médico reactivado con éxito.' : 'Médico inhabilitado y cuenta de usuario suspendida con éxito.');
      await fetchDoctorDetail();
      setIsUpdating(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al cambiar el estado del médico.');
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-semibold tracking-widest uppercase font-mono">Cargando expediente médico...</p>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="bg-glass p-12 text-center rounded-3xl border border-[#1E2640] max-w-lg mx-auto mt-12">
        <AlertTriangle className="h-10 w-10 text-[#FF1744] mx-auto mb-4" />
        <h4 className="text-base font-bold text-slate-200">Personal Médico no encontrado</h4>
        <p className="text-xs text-slate-500 mt-1 mb-6">El profesional solicitado no se encuentra registrado en el sistema.</p>
        <button
          onClick={() => navigate('/doctors')}
          className="px-4 py-2 bg-[#1E2640] text-[#D4AF37] border border-[#D4AF37]/25 rounded-xl text-xs font-semibold hover:bg-[#1E2640]/80 transition-all flex items-center space-x-2 mx-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al Personal</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 font-mono transition-opacity duration-350 ${
      !doctor.is_active ? 'opacity-65' : '' // Dimmed opacity visual representation!
    }`}>
      
      {/* LOCKED SCREEN WARNING BANNER IF INACTIVE */}
      {!doctor.is_active && (
        <div className="w-full bg-[#FF1744]/15 border border-[#FF1744]/40 p-4 rounded-2xl flex items-center space-x-3 text-[#FF1744] animate-pulse">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="text-xs font-bold leading-normal uppercase">
            ATENCIÓN: Esta cuenta de personal clínico se encuentra <strong className="underline">DESACTIVADA</strong>. 
            El acceso al sistema para este usuario ha sido revocado en la base de datos de forma inmediata.
          </div>
        </div>
      )}

      {/* Botón Volver y Cabecera */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/doctors')}
          className="p-2 bg-[#1E2640] hover:bg-[#1E2640]/80 border border-[#1E2640] rounded-xl transition-all text-[#D4AF37]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <span className="text-[9px] text-[#D4AF37] tracking-[0.2em] font-bold uppercase block mb-0.5">
            MÓDULO DE RECURSOS HUMANOS CLÍNICOS
          </span>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-white uppercase">
            Dr. {doctor.first_name} {doctor.last_name}
          </h2>
        </div>
      </div>

      {/* Main Grid: Details + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna Izquierda: Información de Ficha y Auditoría (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Panel 1: Ficha del Médico (Solo-Lectura) */}
          <div className="bg-glass rounded-3xl border border-[#1E2640] p-6 relative overflow-hidden">
            <h3 className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest border-b border-[#1E2640] pb-3 mb-5 flex items-center space-x-2">
              <Award className="h-4 w-4 text-[#D4AF37]" />
              <span>Ficha Profesional Colegiada</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-4">
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Nombres y Apellidos</span>
                  <span className="text-slate-200 text-sm font-extrabold block mt-0.5">
                    Dr. {doctor.first_name} {doctor.last_name}
                  </span>
                </div>
                
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Especialidad Certificada</span>
                  <span className="text-[#D4AF37] text-sm font-extrabold block mt-0.5 uppercase tracking-wide">
                    {doctor.specialty}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Número de Licencia Médica</span>
                  <span className="text-slate-200 font-mono text-sm font-bold block mt-0.5 select-all uppercase">
                    {doctor.license_number}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Código de Personal Interno</span>
                  <span className="text-slate-200 font-mono text-sm font-bold block mt-0.5 uppercase">
                    {doctor.internal_staff_id}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Teléfono de Oficina</span>
                  <span className="text-slate-300 font-semibold block mt-0.5 flex items-center space-x-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-500" />
                    <span>{doctor.contact?.phone || 'No registrado'}</span>
                  </span>
                </div>

                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Ubicación Física del Consultorio</span>
                  <span className="text-slate-300 font-semibold block mt-0.5 flex items-center space-x-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-500" />
                    <span>{doctor.contact?.office_location || 'No registrado'}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Panel 2: Bitácora de Auditoría Forense de Perfil */}
          <div className="bg-glass rounded-3xl border border-[#1E2640] p-6">
            <h3 className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest border-b border-[#1E2640] pb-3 mb-4 flex items-center space-x-2">
              <History className="h-4 w-4 text-[#D4AF37]" />
              <span>Bitácora de Auditoría del Perfil</span>
            </h3>

            {(!doctor.audit_logs || doctor.audit_logs.length === 0) ? (
              <div className="p-4 text-center text-xs text-slate-500 font-semibold uppercase">
                <CheckCircle2 className="h-5 w-5 text-slate-600 mx-auto mb-2" />
                <span>No se reportan modificaciones de seguridad en el perfil del profesional.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {doctor.audit_logs.map((log: any) => (
                  <div 
                    key={log._id}
                    className="p-3.5 bg-black/40 border border-[#1E2640] rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <AlertCircle className={`h-4.5 w-4.5 ${
                        log.criticality === 'CRITICAL' ? 'text-[#FF1744]' : 'text-slate-400'
                      }`} />
                      <div>
                        <strong className="text-slate-300 block">{log.event_action}</strong>
                        <span className="text-[10px] text-slate-500">IP: {log.actor.ip_address} | {log.timestamp}</span>
                      </div>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 bg-[#1E2640] text-slate-400 rounded-md">
                      {log.criticality}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Columna Derecha: Tutela Clínica y Control Crítico (1/3) */}
        <div className="space-y-6">
          
          {/* Panel Pacientes a Cargo */}
          <div className="bg-glass rounded-3xl border border-[#1E2640] p-6">
            <h3 className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest border-b border-[#1E2640] pb-3 mb-4 flex items-center space-x-2">
              <User className="h-4 w-4 text-[#D4AF37]" />
              <span>Tutela Clínica</span>
            </h3>

            <div className="space-y-4">
              <div className="p-4 bg-black/30 border border-[#1E2640] rounded-2xl text-center">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Pacientes Activos Asignados</span>
                <strong className="text-[#00F2FE] text-3xl font-extrabold block mt-2">
                  {doctor.active_patients_count}
                </strong>
                <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                  Pacientes que reportan telemetría en tiempo real bajo su supervisión.
                </p>
              </div>

              {doctor.active_patients_count > 0 && (
                <button
                  onClick={() => navigate('/patients')}
                  className="w-full py-2.5 bg-[#1E2640] hover:bg-[#D4AF37] hover:text-black text-[#D4AF37] text-xs font-bold rounded-xl border border-[#D4AF37]/20 transition-all uppercase tracking-wider text-center"
                >
                  Ver Nómina Completa
                </button>
              )}
            </div>
          </div>

          {/* Panel Disponibilidad LED */}
          <div className="bg-glass rounded-3xl border border-[#1E2640] p-6">
            <h3 className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest border-b border-[#1E2640] pb-3 mb-4 flex items-center space-x-2">
              <Clock className="h-4 w-4 text-[#D4AF37]" />
              <span>Estado Técnico</span>
            </h3>

            <div className="flex items-center space-x-3 p-3 bg-black/30 border border-[#1E2640] rounded-xl">
              <span className={`h-3.5 w-3.5 rounded-full inline-block ${
                doctor.is_active 
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse' 
                  : 'bg-[#FF1744] shadow-[0_0_8px_#ef4444]'
              }`} />
              <div>
                <strong className="text-slate-200 text-xs block leading-none">
                  {doctor.is_active ? 'AUTORIZADO PARA PRÁCTICA' : 'DESACTIVADO LOGICAMENTE'}
                </strong>
                <span className="text-[9px] text-slate-500 font-bold block mt-1 uppercase">
                  Vía API Gateway
                </span>
              </div>
            </div>
          </div>

          {/* Panel Control Crítico: Desactivar Doctor (Admin Only) */}
          <div className="bg-glass rounded-3xl border border-[#FF1744]/25 p-6 border-dashed">
            <h3 className="text-xs text-[#FF1744] font-bold uppercase tracking-widest border-b border-[#FF1744]/20 pb-3 mb-4 flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-[#FF1744]" />
              <span>Desactivación Profesional</span>
            </h3>

            <p className="text-[10px] text-slate-500 leading-normal mb-4 font-bold">
              Desactivar a este médico suspenderá inmediatamente sus privilegios de login, bloqueará el acceso a las rutas clínicas NoSQL y atenuará su perfil en consolas.
            </p>

            <button
              onClick={() => setIsConfirmOpen(true)}
              disabled={isUpdating}
              className={`w-full py-3 text-xs font-extrabold rounded-xl flex items-center justify-center space-x-2 transition-all uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed ${
                doctor.is_active 
                  ? 'bg-rose-500/10 hover:bg-[#FF1744] text-[#FF1744] hover:text-white border border-[#FF1744]/25 hover:border-[#FF1744]' 
                  : 'bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/25 hover:border-emerald-500'
              }`}
            >
              <Trash2 className="h-4.5 w-4.5" />
              <span>{doctor.is_active ? 'Inhabilitar Doctor' : 'Habilitar Doctor'}</span>
            </button>
          </div>

        </div>

      </div>

      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleToggleActiveState}
        title={doctor.is_active ? 'Inhabilitar Médico' : 'Habilitar Médico'}
        message={
          doctor.is_active
            ? `¿Está seguro de que desea inhabilitar al Dr. ${doctor.first_name} ${doctor.last_name}? Esto suspenderá su acceso al sistema y revocará sus permisos clínicos de forma inmediata.`
            : `¿Está seguro de que desea habilitar al Dr. ${doctor.first_name} ${doctor.last_name}? Esto reactivará su acceso al sistema y sus funciones clínicas.`
        }
        confirmText={doctor.is_active ? 'Inhabilitar' : 'Habilitar'}
        type={doctor.is_active ? 'danger' : 'success'}
      />
    </div>
  );
};
export default DoctorDetailView;
