import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Save, X, Phone, Mail, MapPin, 
  FileText, Shield, Award, Image
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const ProfileEditView: React.FC = () => {
  const navigate = useNavigate();

  // Estados de datos
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Estados del Formulario
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [idNumber, setIdNumber] = useState<string>('');

  // Campos de rol
  const [medicalLicense, setMedicalLicense] = useState<string>('');
  const [specialty, setSpecialty] = useState<string>('');
  const [officeLocation, setOfficeLocation] = useState<string>('');
  const [corporateName, setCorporateName] = useState<string>('');
  const [taxId, setTaxId] = useState<string>('');
  const [clientType, setClientType] = useState<string>('');
  const [clinicalId, setClinicalId] = useState<string>('');

  // Estados de validación en caliente
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/profile');
      const data = response.data;
      setProfile(data);

      const personal = data.personal_data || {};
      const roleData = data.role_specific_data || {};

      setAvatarUrl(data.google_avatar_url || '');
      setFirstName(personal.first_name || '');
      setLastName(personal.last_name || '');
      setEmail(personal.email || '');
      setPhone(personal.phone || '');
      setAddress(personal.address || '');
      setIdNumber(personal.identification_number || '');

      // Rellenar campos de rol
      if (roleData.medical_license !== undefined) setMedicalLicense(roleData.medical_license);
      if (roleData.specialty !== undefined) setSpecialty(roleData.specialty);
      if (roleData.office_location !== undefined) setOfficeLocation(roleData.office_location);
      if (roleData.corporate_name !== undefined) setCorporateName(roleData.corporate_name);
      if (roleData.tax_id !== undefined) setTaxId(roleData.tax_id);
      if (roleData.client_type !== undefined) setClientType(roleData.client_type);
      if (roleData.clinical_id !== undefined) setClinicalId(roleData.clinical_id);

      setIsLoading(false);
    } catch (err: any) {
      toast.error('Error al obtener los datos del perfil para editar.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Validaciones en caliente reactivas
  useEffect(() => {
    const newErrors: {[key: string]: string} = {};

    // 1. Validar Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      newErrors.email = 'Formato de correo electrónico inválido.';
    }

    // 2. Validar Teléfono
    const phoneRegex = /^\+?[0-9\s\-]{8,20}$/;
    if (phone && !phoneRegex.test(phone)) {
      newErrors.phone = 'Teléfono inválido (mínimo 8 dígitos, solo números, espacios y guiones).';
    }

    // 3. Validar RUT / Cédula (Ejemplo chileno básico)
    const rutRegex = /^\d{1,2}\.?\d{3}\.?\d{3}\-?[0-9kK]$/;
    if (idNumber && !rutRegex.test(idNumber.replace(/\s/g, ''))) {
      newErrors.idNumber = 'Formato de RUT/Cédula inválido (Ej: 12.345.678-9).';
    }

    setErrors(newErrors);
  }, [email, phone, idNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar si hay errores activos
    if (Object.keys(errors).length > 0) {
      toast.error('Por favor corrija los campos marcados en rojo antes de guardar.');
      return;
    }

    setIsSaving(true);
    try {
      const personalData: any = {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        address,
        identification_number: idNumber
      };

      const roleSpecificData: any = {};
      if (profile.role_specific_data.medical_license !== undefined) {
        roleSpecificData.medical_license = medicalLicense;
        roleSpecificData.specialty = specialty;
        roleSpecificData.office_location = officeLocation;
      } else if (profile.role_specific_data.tax_id !== undefined) {
        roleSpecificData.corporate_name = corporateName;
        roleSpecificData.tax_id = taxId;
        roleSpecificData.client_type = clientType;
      } else if (profile.role_specific_data.clinical_id !== undefined) {
        roleSpecificData.clinical_id = clinicalId;
      }

      await api.put('/profile', {
        google_avatar_url: avatarUrl || null,
        personal_data: personalData,
        role_specific_data: roleSpecificData
      });

      toast.success('¡Expediente de perfil actualizado con éxito!');
      navigate('/profile');
    } catch (err: any) {
      toast.error('Error al guardar las modificaciones del perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-3 font-mono">
        <div className="w-8 h-8 border-3 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cargando consola de edición...</p>
      </div>
    );
  }

  const roleData = profile.role_specific_data || {};
  const hasLicense = roleData.medical_license !== undefined;
  const hasTaxId = roleData.tax_id !== undefined;
  const hasClinicalId = roleData.clinical_id !== undefined;

  return (
    <div className="space-y-6 font-mono max-w-4xl mx-auto">
      
      {/* Cabecera superior */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] text-[#D4AF37] tracking-[0.2em] font-bold uppercase block mb-1">
            CONSOLA DE MODIFICACIÓN DE EXPEDIENTE
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Editar Mi Perfil</h2>
          <p className="text-xs text-slate-400 mt-1">Altere sus datos de contacto con validación en caliente y sincronización de red.</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('/profile')}
            className="px-4 py-2 bg-[#1E2640] hover:bg-slate-800 text-slate-400 text-xs font-bold rounded-xl border border-[#1E2640] transition-all uppercase tracking-wider flex items-center space-x-1.5"
          >
            <X className="h-4 w-4" />
            <span>Cancelar</span>
          </button>
        </div>
      </div>

      {/* Formulario Principal */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Sección 1: Avatar y Datos Principales */}
        <div className="bg-glass rounded-3xl border border-[#1E2640] p-6 md:p-8 space-y-6">
          <h3 className="text-xs text-[#D4AF37] font-extrabold uppercase tracking-widest border-b border-[#1E2640] pb-3 mb-5 flex items-center space-x-2">
            <Image className="h-4 w-4 text-[#D4AF37]" />
            <span>Imagen de Identidad y Avatar</span>
          </h3>

          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="h-20 w-20 rounded-full border border-[#1E2640] p-1 bg-black/40 flex-shrink-0">
              <img 
                src={avatarUrl || "https://api.dicebear.com/7.x/adventurer/svg?seed=AuraUser"} 
                alt="Previsualización Avatar" 
                className="h-full w-full rounded-full object-cover bg-[#0B0F19]"
              />
            </div>

            <div className="space-y-1 w-full">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Semilla / URL de Google Avatar</label>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="Ej: https://api.dicebear.com/7.x/adventurer/svg?seed=dr_lopez"
                className="w-full p-3 bg-[#0B0F19] border border-[#1E2640] rounded-xl text-xs focus:border-[#D4AF37] outline-none text-slate-200"
              />
              <span className="text-[9px] text-slate-600 block mt-1">
                Puede ingresar un enlace directo a una imagen o una semilla del servicio Dicebear para generar avatares interactivos.
              </span>
            </div>
          </div>
        </div>

        {/* Sección 2: Datos Personales */}
        <div className="bg-glass rounded-3xl border border-[#1E2640] p-6 md:p-8 space-y-6">
          <h3 className="text-xs text-[#D4AF37] font-extrabold uppercase tracking-widest border-b border-[#1E2640] pb-3 mb-5 flex items-center space-x-2">
            <Shield className="h-4 w-4 text-[#D4AF37]" />
            <span>Datos Clínicos y Personales</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
            
            {/* Nombre */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-bold uppercase block">Nombres</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Nombre del titular"
                className="w-full p-3 bg-[#0B0F19] border border-[#1E2640] rounded-xl focus:border-[#D4AF37] outline-none text-slate-200 font-sans"
              />
            </div>

            {/* Apellido */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-bold uppercase block">Apellidos</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Apellido del titular"
                className="w-full p-3 bg-[#0B0F19] border border-[#1E2640] rounded-xl focus:border-[#D4AF37] outline-none text-slate-200 font-sans"
              />
            </div>

            {/* Email (Validación en caliente) */}
            <div className="space-y-1.5 col-span-1 md:col-span-2">
              <label className="text-[10px] text-slate-500 font-bold uppercase block">Correo Electrónico Validado</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@telemonitor.com"
                  className={`w-full p-3 pl-10 bg-[#0B0F19] border rounded-xl outline-none text-slate-200 font-sans transition-all ${
                    errors.email 
                      ? 'border-rose-500/50 focus:border-rose-500' 
                      : email 
                      ? 'border-emerald-500/50 focus:border-emerald-500' 
                      : 'border-[#1E2640] focus:border-[#D4AF37]'
                  }`}
                />
                <Mail className="h-4.5 w-4.5 text-slate-600 absolute left-3 top-3.5" />
              </div>
              {errors.email && <span className="text-[10px] text-rose-400 font-bold mt-1 block">{errors.email}</span>}
            </div>

            {/* Teléfono (Validación en caliente) */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-bold uppercase block">Teléfono de Emergencia</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej: +56 9 8765 4321"
                  className={`w-full p-3 pl-10 bg-[#0B0F19] border rounded-xl outline-none text-slate-200 font-sans transition-all ${
                    errors.phone 
                      ? 'border-rose-500/50 focus:border-rose-500' 
                      : phone 
                      ? 'border-emerald-500/50 focus:border-emerald-500' 
                      : 'border-[#1E2640] focus:border-[#D4AF37]'
                  }`}
                />
                <Phone className="h-4.5 w-4.5 text-slate-600 absolute left-3 top-3.5" />
              </div>
              {errors.phone && <span className="text-[10px] text-rose-400 font-bold mt-1 block">{errors.phone}</span>}
            </div>

            {/* Identificación (Validación en caliente) */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-bold uppercase block">RUT / Cédula Nacional</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="Ej: 12.345.678-9"
                  className={`w-full p-3 pl-10 bg-[#0B0F19] border rounded-xl outline-none text-slate-200 font-mono transition-all ${
                    errors.idNumber 
                      ? 'border-rose-500/50 focus:border-rose-500' 
                      : idNumber 
                      ? 'border-emerald-500/50 focus:border-emerald-500' 
                      : 'border-[#1E2640] focus:border-[#D4AF37]'
                  }`}
                />
                <FileText className="h-4.5 w-4.5 text-slate-600 absolute left-3 top-3.5" />
              </div>
              {errors.idNumber && <span className="text-[10px] text-rose-400 font-bold mt-1 block">{errors.idNumber}</span>}
            </div>

            {/* Dirección */}
            <div className="space-y-1.5 col-span-1 md:col-span-2">
              <label className="text-[10px] text-slate-500 font-bold uppercase block">Dirección Particular</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ej: Av. Apoquindo 4400, Las Condes, Santiago"
                  className="w-full p-3 pl-10 bg-[#0B0F19] border border-[#1E2640] focus:border-[#D4AF37] rounded-xl outline-none text-slate-200 font-sans"
                />
                <MapPin className="h-4.5 w-4.5 text-slate-600 absolute left-3 top-3.5" />
              </div>
            </div>

          </div>
        </div>

        {/* Sección 3: Datos de Rol (Polimórfico) */}
        {(hasLicense || hasTaxId || hasClinicalId) && (
          <div className="bg-glass rounded-3xl border border-[#1E2640] p-6 md:p-8 space-y-6">
            <h3 className="text-xs text-[#D4AF37] font-extrabold uppercase tracking-widest border-b border-[#1E2640] pb-3 mb-5 flex items-center space-x-2">
              <Award className="h-4 w-4 text-[#D4AF37]" />
              <span>Especificaciones de Tutela y Credencial de Rol</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
              
              {/* Si es Médico */}
              {hasLicense && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase block">Licencia Profesional Colegiada</label>
                    <input
                      type="text"
                      required
                      value={medicalLicense}
                      onChange={(e) => setMedicalLicense(e.target.value)}
                      className="w-full p-3 bg-[#0B0F19] border border-[#1E2640] focus:border-[#D4AF37] rounded-xl outline-none text-slate-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase block">Especialidad Médica</label>
                    <input
                      type="text"
                      required
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      className="w-full p-3 bg-[#0B0F19] border border-[#1E2640] focus:border-[#D4AF37] rounded-xl outline-none text-slate-200 font-sans"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-1 md:col-span-2">
                    <label className="text-[10px] text-slate-500 font-bold uppercase block">Box / Ubicación Física Clínica</label>
                    <input
                      type="text"
                      required
                      value={officeLocation}
                      onChange={(e) => setOfficeLocation(e.target.value)}
                      className="w-full p-3 bg-[#0B0F19] border border-[#1E2640] focus:border-[#D4AF37] rounded-xl outline-none text-slate-200 font-sans"
                    />
                  </div>
                </>
              )}

              {/* Si es Cliente (Clínica o Familiar) */}
              {hasTaxId && (
                <>
                  <div className="space-y-1.5 col-span-1 md:col-span-2">
                    <label className="text-[10px] text-slate-500 font-bold uppercase block">Razón Social del Fondeo</label>
                    <input
                      type="text"
                      required
                      value={corporateName}
                      onChange={(e) => setCorporateName(e.target.value)}
                      className="w-full p-3 bg-[#0B0F19] border border-[#1E2640] focus:border-[#D4AF37] rounded-xl outline-none text-slate-200 font-sans"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase block">TAX ID Tributario / RUT Social</label>
                    <input
                      type="text"
                      required
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      className="w-full p-3 bg-[#0B0F19] border border-[#1E2640] focus:border-[#D4AF37] rounded-xl outline-none text-slate-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase block">Tipo de Entidad</label>
                    <select
                      value={clientType}
                      onChange={(e) => setClientType(e.target.value)}
                      className="w-full p-3 bg-[#0B0F19] border border-[#1E2640] focus:border-[#D4AF37] rounded-xl outline-none text-slate-200 cursor-pointer"
                    >
                      <option value="CLINICA">CLÍNICA / INSTITUCIONAL</option>
                      <option value="FAMILIAR">FONDEO FAMILIAR / INDIVIDUAL</option>
                    </select>
                  </div>
                </>
              )}

              {/* Si es Paciente */}
              {hasClinicalId && (
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase block">Identificador Clínico (Lectura)</label>
                  <input
                    type="text"
                    disabled
                    value={clinicalId}
                    className="w-full p-3 bg-[#0B0F19] border border-[#1E2640]/50 rounded-xl outline-none text-slate-500 cursor-not-allowed select-all"
                  />
                </div>
              )}

            </div>
          </div>
        )}

        {/* Botón de Envío / Guardado */}
        <button
          type="submit"
          disabled={isSaving || Object.keys(errors).length > 0}
          className="w-full py-3.5 bg-[#D4AF37] hover:bg-[#D4AF37]/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-extrabold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all uppercase tracking-wider text-center"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              <span>Guardar Modificaciones de Perfil</span>
            </>
          )}
        </button>

      </form>

    </div>
  );
};
export default ProfileEditView;
