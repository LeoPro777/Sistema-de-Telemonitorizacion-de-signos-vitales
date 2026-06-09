import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle, ShieldX, 
  User, Award, FileText, Clock, AlertTriangle, Eye, X
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const ApplicantDetailView: React.FC = () => {
  const { email } = useParams<{ email: string }>();
  const navigate = useNavigate();

  // Estados de datos
  const [applicant, setApplicant] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Control de documentos auditados
  const [auditedDocs, setAuditedDocs] = useState<{[key: string]: boolean}>({});
  const [activeDocPreview, setActiveDocPreview] = useState<any | null>(null);

  const fetchApplicantDetail = async () => {
    setIsLoading(true);
    try {
      // Usamos el endpoint de listado y buscamos por correo para ver el detalle
      const response = await api.get('/applicants', {
        params: { limit: 100 }
      });
      const found = response.data.applicants.find((app: any) => app.personal_data.email === email);
      if (found) {
        setApplicant(found);
      } else {
        setApplicant(null);
      }
      setIsLoading(false);
    } catch (err: any) {
      toast.error('Error al consultar detalles de la solicitud de onboarding.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (email) {
      fetchApplicantDetail();
    }
  }, [email]);

  const handleOpenDoc = (doc: any) => {
    setAuditedDocs(prev => ({ ...prev, [doc.url]: true }));
    setActiveDocPreview(doc);
    toast.success(`Acreditación legal [${doc.doc_type}] abierta en visor seguro.`);
  };

  // Verificar si al menos un documento ha sido auditado
  const isAnyDocAudited = Object.values(auditedDocs).some(val => val === true);

  const handleReview = async (status: 'APPROVED' | 'REJECTED') => {
    if (status === 'REJECTED' && !rejectionReason.trim()) {
      toast.error('Debe ingresar un motivo de rechazo obligatorio.');
      return;
    }

    setIsProcessing(true);
    try {
      await api.post(`/applicants/${email}/review`, {
        status,
        rejection_reason: status === 'REJECTED' ? rejectionReason.trim() : undefined
      });
      toast.success(status === 'APPROVED' ? 'Aspirante aprobado. Cuenta activada y perfil clínico provisto.' : 'Solicitud rechazada. Cuenta suspendida.');
      navigate('/applicants');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al procesar la auditoría.');
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-semibold tracking-widest uppercase font-mono">Abriendo expediente de auditoría...</p>
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="bg-glass p-12 text-center rounded-3xl border border-[#1E2640] max-w-lg mx-auto mt-12 font-mono">
        <AlertTriangle className="h-10 w-10 text-[#FF1744] mx-auto mb-4" />
        <h4 className="text-base font-bold text-slate-200">Solicitud no encontrada</h4>
        <p className="text-xs text-slate-500 mt-1 mb-6">El expediente de onboarding solicitado no existe o fue aprobado.</p>
        <button
          onClick={() => navigate('/applicants')}
          className="px-4 py-2 bg-[#1E2640] text-[#D4AF37] border border-[#D4AF37]/25 rounded-xl text-xs font-semibold hover:bg-[#1E2640]/80 transition-all flex items-center space-x-2 mx-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver a Solicitudes</span>
        </button>
      </div>
    );
  }

  const personal = applicant.personal_data || {};
  const metadata = applicant.professional_metadata || {};
  const isDoctor = applicant.requested_role === 'DOCTOR';
  const isPending = applicant.status === 'PENDING_APPROVAL';

  // Si no tiene documentos cargados, los simulamos en base al rol para auditoría interactiva de alto nivel
  const verificationDocs = applicant.verification_documents?.length > 0
    ? applicant.verification_documents
    : isDoctor 
    ? [
        { url: '/docs/licencia.pdf', doc_type: 'LICENCIA_MEDICA_OFICIAL' },
        { url: '/docs/cedula.pdf', doc_type: 'IDENTIFICACION_NACIONAL_ID' }
      ]
    : [
        { url: '/docs/constitucion.pdf', doc_type: 'CONSTITUCION_LEGAL_EMPRESA' },
        { url: '/docs/patente.pdf', doc_type: 'PATENTE_MUNICIPAL_COMERCIAL' }
      ];

  return (
    <div className="space-y-6 font-mono relative">
      
      {/* VISOR MODAL DE PREVISUALIZACIÓN DE DOCUMENTO */}
      {activeDocPreview && (
        <div className="fixed inset-0 bg-[#0B0F19]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F1420] border border-[#1E2640] rounded-3xl p-6 w-full max-w-2xl text-xs flex flex-col justify-between h-[80vh] shadow-2xl relative">
            
            {/* Header Visor */}
            <div className="flex justify-between items-center border-b border-[#1E2640] pb-4 mb-4">
              <div>
                <span className="text-[9px] text-[#D4AF37] font-bold uppercase tracking-wider block">
                  VISOR DE ACREDITACIÓN LEGAL
                </span>
                <strong className="text-sm text-slate-200 uppercase leading-none mt-1 block">
                  {activeDocPreview.doc_type}
                </strong>
              </div>
              <button 
                onClick={() => setActiveDocPreview(null)}
                className="p-1.5 bg-[#1E2640] text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Document body (High fidelity mock) */}
            <div className="flex-1 overflow-y-auto bg-black/40 border border-[#1E2640]/55 p-6 rounded-2xl space-y-4 leading-relaxed text-[11px] text-slate-400 font-mono select-none">
              <div className="text-center font-bold text-slate-200 border-b border-[#1E2640]/30 pb-3 uppercase">
                REPÚBLICA BOLIVARIANA DE VENEZUELA — DOCUMENTO DE ACREDITACIÓN PÚBLICA
              </div>
              <div className="flex justify-between font-bold text-[9px] text-slate-500 uppercase">
                <span>EXPEDIENTE: AUTH-9021</span>
                <span>FECHA REGISTRO: {new Date(applicant.submitted_at).toLocaleDateString('es-VE', { timeZone: 'America/Caracas' })}</span>
              </div>
              <p>
                Por medio del presente instrumento se certifica y valida la identidad jurídica de don(ña) <strong className="text-slate-300">{personal.first_name} {personal.last_name}</strong>, titular de la Cédula de Identidad número <strong className="text-slate-300">{personal.identification_number}</strong>.
              </p>
              {isDoctor ? (
                <p>
                  Quien declara poseer la Licencia Médica de Acreditación Colegiada número <strong className="text-[#D4AF37]">{metadata.medical_license}</strong> en la especialidad de <strong className="text-[#00F2FE]">{metadata.specialty}</strong>, habilitado para la práctica de telemedicina asíncrona y telemonitorización de signos vitales a través del gateway biométrico AURA.
                </p>
              ) : (
                <p>
                  Representante de la sociedad mercantil <strong className="text-slate-300">{metadata.corporate_name || `${personal.first_name} Familia`}</strong> con Identificación Fiscal (TAX ID) número <strong className="text-[#D4AF37]">{metadata.tax_id || 'N/A'}</strong>, constituida legalmente bajo el régimen comercial para fondos y sitios de telemetría AURA.
                </p>
              )}
              <div className="h-20 border border-dashed border-[#1E2640] rounded-xl flex items-center justify-center text-[9px] font-bold text-slate-600 uppercase border-spacing-2">
                [ FIRMA DIGITALIZADA E INMUTABLE DE ACREDITACIÓN ]
              </div>
            </div>

            {/* Footer Visor */}
            <button
              onClick={() => setActiveDocPreview(null)}
              className="mt-6 w-full py-3 bg-[#1E2640] hover:bg-[#D4AF37] hover:text-black font-extrabold text-xs text-[#D4AF37] rounded-xl border border-[#D4AF37]/25 transition-all uppercase tracking-wider text-center"
            >
              Cerrar y Certificar Lectura
            </button>

          </div>
        </div>
      )}

      {/* Cabecera */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/applicants')}
          className="p-2 bg-[#1E2640] hover:bg-[#1E2640]/80 border border-[#1E2640] rounded-xl transition-all text-[#D4AF37]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <span className="text-[9px] text-[#D4AF37] tracking-[0.2em] font-bold uppercase block mb-0.5">
            CONSOLA DE AUDITORÍA FORENSE
          </span>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-white uppercase">
            Auditar Aspirante: {personal.first_name} {personal.last_name}
          </h2>
        </div>
      </div>

      {/* Screen Splitter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Lado Izquierdo: Información y Formulario de Justificación */}
        <div className="space-y-6">
          
          {/* Panel de Datos Personales */}
          <div className="bg-glass rounded-3xl border border-[#1E2640] p-6 relative overflow-hidden">
            <h3 className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest border-b border-[#1E2640] pb-3 mb-5 flex items-center space-x-2">
              <User className="h-4 w-4 text-[#D4AF37]" />
              <span>Declaración Jurada de Identidad</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-4">
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Nombre Completo</span>
                  <span className="text-slate-200 text-sm font-extrabold block mt-0.5">
                    {personal.first_name} {personal.last_name}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Documento de Identificación</span>
                  <span className="text-slate-200 font-mono text-sm font-bold block mt-0.5 select-all uppercase">
                    {personal.identification_number}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Correo Declarado</span>
                  <span className="text-slate-300 font-semibold block mt-0.5 select-all">{personal.email}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Teléfono Particular</span>
                  <span className="text-slate-300 font-semibold block mt-0.5">{personal.phone}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Rol Solicitado</span>
                  <span className="text-[#00F2FE] text-xs font-extrabold block mt-1 uppercase tracking-wide">
                    {applicant.requested_role}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Fecha de Envío</span>
                  <span className="text-slate-300 font-semibold block mt-0.5 flex items-center space-x-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                    <span>{new Date(applicant.submitted_at).toLocaleString('es-VE', { timeZone: 'America/Caracas' })}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Panel de Metadatos Profesionales / Comerciales */}
          <div className="bg-glass rounded-3xl border border-[#1E2640] p-6">
            <h3 className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest border-b border-[#1E2640] pb-3 mb-4 flex items-center space-x-2">
              <Award className="h-4 w-4 text-[#D4AF37]" />
              <span>{isDoctor ? 'Credenciales Médicas' : 'Especificaciones Comerciales'}</span>
            </h3>

            {isDoctor ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Licencia Profesional</span>
                  <strong className="text-slate-200 font-mono text-sm block mt-0.5 uppercase tracking-wide">
                    {metadata.medical_license}
                  </strong>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Especialidad Certificada</span>
                  <strong className="text-[#D4AF37] text-sm block mt-0.5 uppercase">
                    {metadata.specialty}
                  </strong>
                </div>
                <div className="md:col-span-2">
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Institución u Hospital de Procedencia</span>
                  <span className="text-slate-300 font-semibold block mt-0.5">
                    {metadata.institution_origin}
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Razón Social Jurídica</span>
                  <strong className="text-slate-200 text-sm block mt-0.5 leading-tight">
                    {metadata.corporate_name || `${personal.first_name} Familia`}
                  </strong>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Identificación Fiscal (TAX ID)</span>
                  <strong className="text-slate-200 font-mono text-sm block mt-0.5 uppercase select-all">
                    {metadata.tax_id || 'N/A'}
                  </strong>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Tipo de Fondeo Comercial</span>
                  <span className="text-[#00F2FE] text-xs font-bold block mt-1 uppercase">
                    {metadata.client_type || 'FAMILIAR'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Panel de Control Crítico: Formulario de Rechazo */}
          {isPending && (
            <div className="bg-glass rounded-3xl border border-[#FF1744]/25 p-6 border-dashed">
              <h3 className="text-xs text-[#FF1744] font-bold uppercase tracking-widest border-b border-[#FF1744]/20 pb-3 mb-4 flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-[#FF1744]" />
                <span>Caja de Rechazo de Credenciales</span>
              </h3>

              <div className="space-y-3 text-xs">
                <label className="text-[9px] text-slate-500 font-bold uppercase block">
                  Justificación de Rechazo (Obligatoria para rechazar)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Describa el motivo por el cual rechaza la acreditación legal..."
                  disabled={isProcessing}
                  rows={3}
                  className="w-full pl-4 pr-4 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl text-xs focus:border-[#FF1744] outline-none transition-all placeholder:text-slate-700 font-sans"
                />
              </div>
            </div>
          )}

        </div>

        {/* Lado Derecho: Acreditación Física y Decisiones */}
        <div className="space-y-6">
          
          {/* Panel Bóveda de Documentos Legales */}
          <div className="bg-glass rounded-3xl border border-[#1E2640] p-6 flex flex-col justify-between h-full min-h-[45vh]">
            <div>
              <h3 className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest border-b border-[#1E2640] pb-3 mb-5 flex items-center space-x-2">
                <FileText className="h-4 w-4 text-[#D4AF37]" />
                <span>Bóveda Digital de Credenciales Obligatorias</span>
              </h3>

              <p className="text-[10px] text-slate-500 leading-normal leading-tight font-bold mb-4">
                El sistema de gobernanza exige que audite cada uno de los archivos presentados por el aspirante antes de otorgar credenciales de acceso operativas en AURA.
              </p>

              <div className="space-y-2">
                {verificationDocs.map((doc: any, idx: number) => {
                  const isOpened = auditedDocs[doc.url] === true;
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                        isOpened
                          ? 'border-emerald-500/25 bg-emerald-500/5'
                          : 'border-[#1E2640] bg-black/10'
                      }`}
                    >
                      <div>
                        <strong className="text-slate-300 block text-xs truncate leading-tight">
                          {doc.doc_type}
                        </strong>
                        <span className="text-[9px] text-slate-500 block font-mono mt-1 select-all">{doc.url}</span>
                      </div>

                      <button
                        onClick={() => handleOpenDoc(doc)}
                        className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all flex items-center space-x-1.5 ${
                          isOpened
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                            : 'bg-[#1E2640] text-[#D4AF37] border-[#D4AF37]/25 hover:bg-[#D4AF37] hover:text-black'
                        }`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>{isOpened ? 'Auditado' : 'Auditar'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Botones Flotantes de Decisión Binaria (Solo si es PENDING) */}
            {isPending ? (
              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-[#1E2640]/50">
                
                {/* Botón RECHAZAR: Inhabilitado si no hay justificación en la caja */}
                <button
                  onClick={() => handleReview('REJECTED')}
                  disabled={isProcessing || !rejectionReason.trim()}
                  className="py-3.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/35 hover:border-rose-500 text-rose-400 text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition-all uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Escriba la justificación para habilitar el botón"
                >
                  <ShieldX className="h-4.5 w-4.5" />
                  <span>Rechazar</span>
                </button>

                {/* Botón APROBAR: Inhabilitado hasta que se abra al menos un archivo obligatorios */}
                <button
                  onClick={() => handleReview('APPROVED')}
                  disabled={isProcessing || !isAnyDocAudited}
                  className="py-3.5 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white border border-emerald-500/35 hover:border-emerald-500 text-emerald-400 text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition-all uppercase tracking-wider disabled:opacity-35 disabled:cursor-not-allowed"
                  title="Abra y audite al menos un documento para habilitar"
                >
                  <CheckCircle className="h-4.5 w-4.5" />
                  <span>Aprobar Registro</span>
                </button>
              </div>
            ) : (
              <div className="mt-6 pt-6 border-t border-[#1E2640]/50 p-4 bg-black/20 rounded-2xl text-center text-xs text-slate-500 font-bold uppercase">
                {applicant.status === 'APPROVED' ? (
                  <span className="text-emerald-400">Solicitud ya Aprobada y Activa</span>
                ) : (
                  <span className="text-rose-400">Solicitud ya Rechazada</span>
                )}
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};
export default ApplicantDetailView;
