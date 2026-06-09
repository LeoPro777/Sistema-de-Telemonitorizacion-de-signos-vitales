import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Shield, Mail, Phone, MapPin, FileText, 
  Award, Briefcase, Settings, Edit3, Building, Heart
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const ProfileView: React.FC = () => {
  const navigate = useNavigate();

  // Estados de datos
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'PERSONAL' | 'ROLE'>('PERSONAL');

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      // 1. Obtener perfil
      const response = await api.get('/profile');
      setProfile(response.data);

      setIsLoading(false);
    } catch (err: any) {
      toast.error('Error al cargar la ficha de perfil de usuario.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-3 font-mono">
        <div className="w-8 h-8 border-3 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cargando expediente personal...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6 font-mono max-w-xl mx-auto text-center py-12">
        <User className="h-12 w-12 text-[#FF1744] mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-200">Perfil no inicializado</h3>
        <p className="text-xs text-slate-500">Ocurrió un error al cargar tus credenciales de perfil.</p>
        <button
          onClick={fetchProfile}
          className="mt-6 px-4 py-2 bg-[#1E2640] text-[#D4AF37] border border-[#D4AF37]/15 rounded-xl text-xs font-bold hover:bg-[#1E2640]/80 transition-all uppercase"
        >
          Reintentar Carga
        </button>
      </div>
    );
  }

  const personal = profile.personal_data || {};
  const roleData = profile.role_specific_data || {};

  // Determinar rol del perfil para renderizado polimórfico
  const hasLicense = roleData.medical_license !== undefined;
  const hasTaxId = roleData.tax_id !== undefined;
  const hasClinicalId = roleData.clinical_id !== undefined;

  let profileRoleLabel = "Administrador del Sistema";
  let profileRoleIcon = <Shield className="h-4 w-4 text-[#D4AF37]" />;

  if (hasLicense) {
    profileRoleLabel = "Personal Médico Autorizado";
    profileRoleIcon = <Award className="h-4 w-4 text-[#D4AF37]" />;
  } else if (hasTaxId) {
    profileRoleLabel = roleData.client_type === 'CLINICA' ? "Clínica Asociada AURA" : "Fondeo Familiar Activo";
    profileRoleIcon = <Building className="h-4 w-4 text-[#D4AF37]" />;
  } else if (hasClinicalId) {
    profileRoleLabel = "Paciente Telemonitoreado";
    profileRoleIcon = <Heart className="h-4 w-4 text-[#D4AF37]" />;
  }

  return (
    <div className="space-y-6 font-mono max-w-4xl mx-auto">
      
      {/* Cabecera superior */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] text-[#D4AF37] tracking-[0.2em] font-bold uppercase block mb-1">
            MÓDULO 10: CONFIGURACIÓN DE EXPEDIENTE PERSONAL
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Mi Perfil</h2>
          <p className="text-xs text-slate-400 mt-1">Supervise sus credenciales de seguridad, datos de contacto y rol de gobernanza en AURA.</p>
        </div>

        <button
          onClick={() => navigate('/profile/edit')}
          className="px-4 py-2.5 bg-[#1E2640] hover:bg-[#D4AF37] hover:text-black text-xs font-extrabold text-[#D4AF37] rounded-xl border border-[#D4AF37]/25 transition-all self-start md:self-auto flex items-center space-x-2 uppercase tracking-wider"
        >
          <Edit3 className="h-4 w-4" />
          <span>Modificar Perfil</span>
        </button>
      </div>

      {/* Banner Principal de Perfil (Glassmorphism con Avatar Grande) */}
      <div className="bg-glass rounded-3xl border border-[#1E2640] p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
        
        {/* Glow de fondo de ambientación */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Avatar Circular */}
        <div className="relative">
          <div className="h-24 w-24 md:h-28 md:w-28 rounded-full border-2 border-[#D4AF37]/45 p-1 bg-black/40 shadow-xl">
            <img 
              src={profile.google_avatar_url || "https://api.dicebear.com/7.x/adventurer/svg?seed=AuraUser"} 
              alt="Avatar de Usuario" 
              className="h-full w-full rounded-full object-cover bg-[#0B0F19]"
            />
          </div>
          <div className="absolute bottom-1 right-1 h-5 w-5 bg-emerald-500 rounded-full border-2 border-[#0B0F19] flex items-center justify-center" title="Conexión Segura Activa">
            <div className="h-2.5 w-2.5 bg-white rounded-full animate-ping" />
          </div>
        </div>

        {/* Detalles de Cuenta */}
        <div className="text-center md:text-left space-y-2">
          <div className="flex flex-col md:flex-row items-center gap-2">
            <h3 className="text-lg md:text-xl font-extrabold text-slate-100 font-sans leading-tight">
              {personal.first_name} {personal.last_name}
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-[#1E2640] text-[#D4AF37] border border-[#D4AF37]/20 text-[9px] font-bold tracking-wider flex items-center space-x-1 uppercase">
              {profileRoleIcon}
              <span>{profileRoleLabel}</span>
            </span>
          </div>

          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
            Cédula de Identidad: <strong className="text-slate-400 select-all">{personal.identification_number}</strong>
          </p>
        </div>
      </div>

      {/* Tabs de Navegación Interna */}
      <div className="flex bg-[#0F1420] border border-[#1E2640] p-1 rounded-xl w-full md:w-96">
        <button
          onClick={() => setActiveTab('PERSONAL')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all text-center flex items-center justify-center space-x-2 ${
            activeTab === 'PERSONAL'
              ? 'bg-[#D4AF37] text-black shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="h-3.5 w-3.5" />
          <span>Datos Personales</span>
        </button>
        
        <button
          onClick={() => setActiveTab('ROLE')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all text-center flex items-center justify-center space-x-2 ${
            activeTab === 'ROLE'
              ? 'bg-[#D4AF37] text-black shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Briefcase className="h-3.5 w-3.5" />
          <span>Información de Rol</span>
        </button>
      </div>

      {/* Cajas de Información */}
      <div className="bg-glass rounded-3xl border border-[#1E2640] p-6 md:p-8">
        
        {/* PESTAÑA 1: DATOS PERSONALES */}
        {activeTab === 'PERSONAL' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs md:text-sm">
            
            <div className="p-4 bg-black/20 border border-[#1E2640] rounded-2xl space-y-1.5">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Nombres Completos</span>
              <strong className="text-slate-200 block text-sm font-sans">{personal.first_name}</strong>
            </div>

            <div className="p-4 bg-black/20 border border-[#1E2640] rounded-2xl space-y-1.5">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Apellidos Clínicos</span>
              <strong className="text-slate-200 block text-sm font-sans">{personal.last_name}</strong>
            </div>

            <div className="p-4 bg-black/20 border border-[#1E2640] rounded-2xl space-y-1.5 flex items-center justify-between col-span-1 md:col-span-2">
              <div className="space-y-1.5">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Correo Electrónico Validado</span>
                <strong className="text-slate-200 block text-sm font-sans select-all">{personal.email}</strong>
              </div>
              <Mail className="h-5 w-5 text-slate-600 mr-2" />
            </div>

            <div className="p-4 bg-black/20 border border-[#1E2640] rounded-2xl space-y-1.5 flex items-center justify-between">
              <div className="space-y-1.5">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Teléfono de Emergencias</span>
                <strong className="text-slate-200 block text-sm font-sans select-all">{personal.phone}</strong>
              </div>
              <Phone className="h-5 w-5 text-slate-600 mr-2" />
            </div>

            <div className="p-4 bg-black/20 border border-[#1E2640] rounded-2xl space-y-1.5 flex items-center justify-between">
              <div className="space-y-1.5">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Cédula / RIF / Identificación Fiscal</span>
                <strong className="text-slate-200 block text-sm font-sans select-all">{personal.identification_number}</strong>
              </div>
              <FileText className="h-5 w-5 text-slate-600 mr-2" />
            </div>

            <div className="p-4 bg-black/20 border border-[#1E2640] rounded-2xl space-y-1.5 flex items-center justify-between col-span-1 md:col-span-2">
              <div className="space-y-1.5">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Dirección Particular / Física</span>
                <strong className="text-slate-200 block text-sm font-sans">{personal.address}</strong>
              </div>
              <MapPin className="h-5 w-5 text-slate-600 mr-2" />
            </div>

          </div>
        )}

        {/* PESTAÑA 2: INFORMACIÓN DE ROL (POLIMÓRFICO) */}
        {activeTab === 'ROLE' && (
          <div className="space-y-6 font-mono text-xs md:text-sm">
            
            {/* Si es Médico */}
            {hasLicense && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-[#1E2640]/25 border border-[#1E2640] rounded-2xl space-y-1.5">
                  <span className="text-[9px] text-[#D4AF37] font-bold uppercase tracking-wider block">Licencia Médica de Acreditación</span>
                  <strong className="text-slate-200 block text-sm font-mono select-all">{roleData.medical_license}</strong>
                </div>

                <div className="p-4 bg-[#1E2640]/25 border border-[#1E2640] rounded-2xl space-y-1.5">
                  <span className="text-[9px] text-[#D4AF37] font-bold uppercase tracking-wider block">Especialidad Clínica</span>
                  <strong className="text-slate-200 block text-sm font-sans">{roleData.specialty}</strong>
                </div>

                <div className="p-4 bg-black/20 border border-[#1E2640] rounded-2xl space-y-1.5 col-span-1 md:col-span-2 flex items-center justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Ubicación de Consulta / Box</span>
                    <strong className="text-slate-200 block text-sm font-sans">{roleData.office_location}</strong>
                  </div>
                  <Briefcase className="h-5 w-5 text-slate-600 mr-2" />
                </div>
              </div>
            )}

            {/* Si es Cliente (Clínica o Familiar) */}
            {hasTaxId && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-[#1E2640]/25 border border-[#1E2640] rounded-2xl space-y-1.5 col-span-1 md:col-span-2">
                  <span className="text-[9px] text-[#D4AF37] font-bold uppercase tracking-wider block">Razón Social Jurídica</span>
                  <strong className="text-slate-200 block text-sm font-sans">{roleData.corporate_name}</strong>
                </div>

                <div className="p-4 bg-[#1E2640]/25 border border-[#1E2640] rounded-2xl space-y-1.5">
                  <span className="text-[9px] text-[#D4AF37] font-bold uppercase tracking-wider block">Documento Fiscal (TAX ID)</span>
                  <strong className="text-slate-200 block text-sm font-mono select-all">{roleData.tax_id}</strong>
                </div>

                <div className="p-4 bg-black/20 border border-[#1E2640] rounded-2xl space-y-1.5 flex items-center justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Tipo de Fondeo Registrado</span>
                    <strong className="text-slate-200 block text-sm font-sans uppercase">
                      {roleData.client_type === 'CLINICA' ? 'Institucional / Clínica' : 'Familiar Directo'}
                    </strong>
                  </div>
                  <Building className="h-5 w-5 text-slate-600 mr-2" />
                </div>
              </div>
            )}

            {/* Si es Paciente */}
            {hasClinicalId && (
              <div className="p-4 bg-[#1E2640]/25 border border-[#1E2640] rounded-2xl space-y-1.5 max-w-md flex items-center justify-between">
                <div className="space-y-1.5">
                  <span className="text-[9px] text-[#D4AF37] font-bold uppercase tracking-wider block">Identificador Clínico Único</span>
                  <strong className="text-slate-200 block text-sm font-mono select-all">{roleData.clinical_id}</strong>
                </div>
                <Heart className="h-5 w-5 text-[#FF1744] mr-2" />
              </div>
            )}

            {/* Si es Admin u otro sin campos específicos de rol */}
            {!hasLicense && !hasTaxId && !hasClinicalId && (
              <div className="p-8 text-center bg-black/20 border border-[#1E2640]/40 rounded-2xl">
                <Settings className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-300">Privilegios Generales de Gobernanza</h4>
                <p className="text-[10px] text-slate-500 mt-1">Como Administrador General de AURA, su cuenta cuenta con acceso maestro absoluto sin vinculación a consultorios médicos específicos.</p>
              </div>
            )}

          </div>
        )}

      </div>

    </div>
  );
};
export default ProfileView;
