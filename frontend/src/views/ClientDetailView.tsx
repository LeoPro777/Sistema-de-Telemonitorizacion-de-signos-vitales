import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Building2, Home, Phone, MapPin, Mail, 
  Trash2, Users, FileText, CheckCircle, AlertTriangle, AlertCircle, Plus
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { ConfirmationModal, EntityLookupModal, ActionVerificationModal } from '../components';
import { EntityType } from '../components/EntityLookupModal';
export const ClientDetailView: React.FC = () => {
  const { user } = useAuthStore();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Estados de datos
  const [client, setClient] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Estados para el flujo asíncrono de vinculación (Anti-Dropdown)
  const [lookupState, setLookupState] = useState<{ isOpen: boolean; type: EntityType; title: string }>({ isOpen: false, type: 'patients', title: '' });
  const [verificationState, setVerificationState] = useState<{
    isOpen: boolean;
    target: any;
    impactText: string;
  }>({ isOpen: false, target: null, impactText: '' });

  const openLookupModal = () => {
    setLookupState({ isOpen: true, type: 'patients', title: 'Vincular Paciente' });
  };

  const handleEntitySelect = (entity: any) => {
    const impactText = `Al confirmar, el paciente ${entity.first_name} ${entity.last_name} será asociado comercialmente a la cuenta de ${client.corporate_name}, y la facturación de sus servicios telemétricos será trasladada a este contrato.`;
    setVerificationState({
      isOpen: true,
      target: entity,
      impactText
    });
  };

  const executeLinkage = async () => {
    try {
      await api.put(`/patients/${verificationState.target._id}`, {
        client_id: id
      });
      toast.success('Paciente vinculado con éxito.');
      setVerificationState(prev => ({ ...prev, isOpen: false }));
      fetchClientDetail();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al vincular paciente.');
    }
  };

  const fetchClientDetail = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/clients/${id}`);
      setClient(response.data);
      setIsLoading(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al obtener detalles técnicos del cliente.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchClientDetail();
    }
  }, [id]);

  const handleToggleActiveState = async () => {
    const nextState = !client.is_active;
    
    setIsUpdating(true);
    try {
      await api.put(`/clients/${id}`, {
        is_active: nextState
      });
      toast.success(nextState ? 'Cuenta de cliente habilitada y reactivada.' : 'Cuenta de cliente inhabilitada y credenciales de usuario bloqueadas.');
      await fetchClientDetail();
      setIsUpdating(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al modificar el estado del cliente.');
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-semibold tracking-widest uppercase font-mono">Cargando expediente de fondeo...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="bg-glass p-12 text-center rounded-3xl border border-[#1E2640] max-w-lg mx-auto mt-12">
        <AlertTriangle className="h-10 w-10 text-[#FF1744] mx-auto mb-4" />
        <h4 className="text-base font-bold text-slate-200">Cliente no encontrado</h4>
        <p className="text-xs text-slate-500 mt-1 mb-6">La cuenta de financiamiento solicitada no se encuentra registrada.</p>
        <button
          onClick={() => navigate('/clients')}
          className="px-4 py-2 bg-[#1E2640] text-[#D4AF37] border border-[#D4AF37]/25 rounded-xl text-xs font-semibold hover:bg-[#1E2640]/80 transition-all flex items-center space-x-2 mx-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al Fondeo</span>
        </button>
      </div>
    );
  }

  const isInstitution = client.client_type === 'CLINICA';

  return (
    <>
      <div className={`space-y-6 font-mono transition-opacity duration-350 ${
        !client.is_active ? 'opacity-65' : ''
      }`}>
      
      {/* WARNING LOCKOUT BANNER */}
      {!client.is_active && (
        <div className="w-full bg-[#FF1744]/15 border border-[#FF1744]/40 p-4 rounded-2xl flex items-center space-x-3 text-[#FF1744] animate-pulse">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="text-xs font-bold leading-normal uppercase">
            ATENCIÓN: Esta cuenta de fondeo se encuentra <strong className="underline">INHABILITADA</strong>. 
            El acceso al portal para esta organización ha sido revocado en la base de datos de forma inmediata.
          </div>
        </div>
      )}

      {/* Cabecera */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/clients')}
          className="p-2 bg-[#1E2640] hover:bg-[#1E2640]/80 border border-[#1E2640] rounded-xl transition-all text-[#D4AF37]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <span className="text-[9px] text-[#D4AF37] tracking-[0.2em] font-bold uppercase block mb-0.5">
            CONSOLA DE FINANCIAMIENTO Y CLIENTES
          </span>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-white uppercase flex items-center space-x-2">
            <span>{client.corporate_name}</span>
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna Izquierda: Ficha y Salud de Pago (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Panel Ficha de Datos (Solo-Lectura) */}
          <div className="bg-glass rounded-3xl border border-[#1E2640] p-6 relative overflow-hidden">
            <h3 className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest border-b border-[#1E2640] pb-3 mb-5 flex items-center space-x-2">
              <FileText className="h-4 w-4 text-[#D4AF37]" />
              <span>Ficha Técnica Comercial</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-4">
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Razón Social</span>
                  <span className="text-slate-200 text-sm font-extrabold block mt-0.5 leading-tight">
                    {client.corporate_name}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Identificación Fiscal (TAX ID)</span>
                  <span className="text-slate-200 font-mono text-sm font-bold block mt-0.5 select-all uppercase">
                    {client.tax_id}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Tipo de Fondeo</span>
                  <span className="text-[#00F2FE] text-xs font-bold block mt-0.5 uppercase tracking-wide">
                    {client.client_type === 'CLINICA' ? 'CLÍNICA / INSTITUCIONAL' : 'FONDEO FAMILIAR / INDIVIDUAL'}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Dirección Registrada</span>
                  <span className="text-slate-300 font-semibold block mt-0.5 flex items-center space-x-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-500" />
                    <span>{client.contact_info?.address || 'No registrado'}</span>
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Teléfono Comercial</span>
                  <span className="text-slate-300 font-semibold block mt-0.5 flex items-center space-x-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-500" />
                    <span>{client.contact_info?.phone || 'No registrado'}</span>
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Correo de Urgencia Facturación</span>
                  <span className="text-slate-300 font-semibold block mt-0.5 flex items-center space-x-1.5 select-all">
                    <Mail className="h-3.5 w-3.5 text-slate-500" />
                    <span>{client.contact_info?.emergency_email || 'No registrado'}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Panel Sublista Tabular de Pacientes Fondeados */}
          <div className="bg-glass rounded-3xl border border-[#1E2640] p-6">
            <div className="flex justify-between items-center border-b border-[#1E2640] pb-3 mb-4">
              <h3 className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest flex items-center space-x-2">
                <Users className="h-4 w-4 text-[#D4AF37]" />
                <span>Nómina de Pacientes Asociados ({client.patients?.length ?? 0})</span>
              </h3>
              {client.is_active && user?.role === 'ADMIN' && (
                <button
                  onClick={openLookupModal}
                  className="px-3 py-1.5 bg-[#1E2640] hover:bg-[#D4AF37] hover:text-black border border-[#D4AF37]/25 text-[#D4AF37] font-extrabold text-[10px] rounded-lg transition-all uppercase flex items-center space-x-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Asignar Paciente</span>
                </button>
              )}
            </div>

            {(!client.patients || client.patients.length === 0) ? (
              <div className="p-8 text-center text-xs text-slate-500 font-semibold uppercase">
                <CheckCircle className="h-6 w-6 text-slate-600 mx-auto mb-2" />
                <span>No existen pacientes vinculados a este contrato financiero.</span>
              </div>
            ) : (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-black/35 border-b border-[#1E2640] text-[9px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Paciente</th>
                      <th className="py-3 px-4 text-center">Ficha Clínica</th>
                      <th className="py-3 px-4 text-center">RUT Cédula</th>
                      <th className="py-3 px-4 text-center">Estado Alerta</th>
                      <th className="py-3 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2640]/45">
                    {client.patients.map((pat: any) => (
                      <tr 
                        key={pat.id} 
                        className={`hover:bg-[#1E2640]/25 transition-all ${
                          pat.has_active_alert ? 'bg-[#FF1744]/2' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-200">
                          {pat.first_name} {pat.last_name}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-400">
                          {pat.medical_record_id}
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-400 font-semibold">
                          {pat.national_id}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {pat.has_active_alert ? (
                            <span className="px-2 py-0.5 rounded bg-[#FF1744]/20 border border-[#FF1744]/35 text-[#FF1744] text-[8px] font-bold animate-pulse">
                              S.O.S.
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-bold">
                              NORMAL
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => navigate(`/patients/${pat.id}`)}
                            className="px-2.5 py-1 bg-[#1E2640] hover:bg-[#D4AF37] hover:text-black font-extrabold text-[9px] text-[#D4AF37] border border-[#D4AF37]/20 rounded-md transition-all uppercase"
                          >
                            Expediente
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Columna Derecha: Control Contractual e Inhabilitación (1/3) */}
        <div className="space-y-6">

          {/* Panel Icono e Identificación de Tipo */}
          <div className="bg-glass rounded-3xl border border-[#1E2640] p-6">
            <h3 className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest border-b border-[#1E2640] pb-3 mb-4 flex items-center space-x-2">
              <span>Gobernanza Comercial</span>
            </h3>

            <div className="flex items-center space-x-3 p-3 bg-black/30 border border-[#1E2640] rounded-xl">
              <div className="h-10 w-10 bg-[#1E2640] rounded-xl border border-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center shrink-0">
                {isInstitution ? <Building2 className="h-5 w-5" /> : <Home className="h-5 w-5" />}
              </div>
              <div>
                <strong className="text-slate-200 text-xs block leading-none uppercase">
                  {client.client_type} ACCOUNT
                </strong>
                <span className="text-[9px] text-slate-500 font-bold block mt-1 uppercase">
                  CONTRATO APROBADO
                </span>
              </div>
            </div>
          </div>

          {/* Panel Control Crítico: Desactivar Cliente (Admin Only) */}
          <div className="bg-glass rounded-3xl border border-[#FF1744]/25 p-6 border-dashed">
            <h3 className="text-xs text-[#FF1744] font-bold uppercase tracking-widest border-b border-[#FF1744]/20 pb-3 mb-4 flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-[#FF1744]" />
              <span>Suspensión Contractual</span>
            </h3>

            <p className="text-[10px] text-slate-500 leading-normal mb-4 font-bold">
              Inhabilitar esta cuenta de fondeo congelará de forma inmediata todos los privilegios del cliente, suspendiendo sus accesos de login a AURA y atenuando sus registros.
            </p>

            <button
              onClick={() => setIsConfirmOpen(true)}
              disabled={isUpdating}
              className={`w-full py-3 text-xs font-extrabold rounded-xl flex items-center justify-center space-x-2 transition-all uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed ${
                client.is_active 
                  ? 'bg-rose-500/10 hover:bg-[#FF1744] text-[#FF1744] hover:text-white border border-[#FF1744]/25 hover:border-[#FF1744]' 
                  : 'bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/25 hover:border-emerald-500'
              }`}
            >
              <Trash2 className="h-4.5 w-4.5" />
              <span>{client.is_active ? 'Suspender Contrato' : 'Reactivar Contrato'}</span>
            </button>
          </div>

        </div>

      </div>

    </div>

    <EntityLookupModal
      isOpen={lookupState.isOpen}
      onClose={() => setLookupState({ ...lookupState, isOpen: false })}
      entityType={lookupState.type}
      title={lookupState.title}
      onSelect={handleEntitySelect}
    />

    {verificationState.target && (
      <ActionVerificationModal
        isOpen={verificationState.isOpen}
        onClose={() => setVerificationState({ ...verificationState, isOpen: false })}
        onConfirm={executeLinkage}
        sourceEntity={{ type: 'client', name: client.corporate_name, subtitle: `Tax ID: ${client.tax_id}` }}
        targetEntity={{ type: 'patient', name: `${verificationState.target.first_name} ${verificationState.target.last_name}`, subtitle: `ID: ${verificationState.target.national_id}` }}
        impactText={verificationState.impactText}
      />
    )}
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleToggleActiveState}
        title={client.is_active ? 'Suspender Contrato' : 'Reactivar Contrato'}
        message={
          client.is_active
            ? `¿Está seguro de que desea suspender el contrato de "${client.corporate_name}"? Esto bloqueará de inmediato el acceso al portal para esta organización y sus usuarios asociados.`
            : `¿Está seguro de que desea reactivar el contrato de "${client.corporate_name}"? Esto restaurará el acceso al portal para esta organización.`
        }
        confirmText={client.is_active ? 'Suspender' : 'Reactivar'}
        type={client.is_active ? 'danger' : 'success'}
      />
    </>
  );
};
export default ClientDetailView;
