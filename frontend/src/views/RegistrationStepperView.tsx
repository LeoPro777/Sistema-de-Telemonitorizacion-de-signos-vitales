import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Heart, ArrowLeft, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export const RegistrationStepperView: React.FC = () => {
  const navigate = useNavigate();
  const { selectedRole, user, onboarding } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirigir si no hay rol seleccionado o si el usuario no tiene estado incompleto
  useEffect(() => {
    if (!selectedRole) {
      toast.error('Por favor, seleccione el tipo de aspirante primero');
      navigate('/register-select');
    }
  }, [selectedRole, navigate]);

  // --- ESTADO DEL FORMULARIO ---
  // Paso 1: Datos Comunes & Cuenta
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const email = user?.email || '';
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');

  // Paso 2: Datos Específicos (Dinámicos)
  // Doctor
  const [medicalLicense, setMedicalLicense] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [institutionOrigin, setInstitutionOrigin] = useState('');
  // Cliente
  const [corporateName, setCorporateName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [clientType, setClientType] = useState('CLINICA');
  // Paciente
  const [bloodType, setBloodType] = useState('O+');
  const [notes, setNotes] = useState('');

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!firstName || !lastName || !email || !phone || !nationalId) {
        toast.error('Complete todos los campos del Paso 1');
        return;
      }
    } else if (currentStep === 2) {
      if (selectedRole === 'DOCTOR') {
        if (!medicalLicense || !specialty) {
          toast.error('Complete la licencia médica y especialidad');
          return;
        }
      } else if (selectedRole === 'CLIENT') {
        if (!corporateName || !taxId) {
          toast.error('Complete la razón social y el ID fiscal');
          return;
        }
      }
    }
    setCurrentStep((prev) => prev + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // Mapear los metadatos específicos según rol
    let professionalMetadata: any = {};
    if (selectedRole === 'DOCTOR') {
      professionalMetadata = {
        medical_license: medicalLicense,
        specialty: specialty,
        institution_origin: institutionOrigin,
      };
    } else if (selectedRole === 'CLIENT') {
      professionalMetadata = {
        corporate_name: corporateName,
        tax_id: taxId,
        client_type: clientType,
      };
    } else if (selectedRole === 'PATIENT') {
      professionalMetadata = {
        blood_type: bloodType,
        notes: notes,
      };
    }

    const personalData = {
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phone,
      identification_number: nationalId,
    };

    try {
      if (!selectedRole) throw 'No se ha seleccionado rol de aspirante.';
      await onboarding(selectedRole, personalData, professionalMetadata);
      toast.success('Solicitud enviada exitosamente. Su cuenta ha quedado pendiente de aprobación.');
      navigate('/waiting-approval');
    } catch (err: any) {
      toast.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col justify-between p-6 md:p-12 relative overflow-hidden">
      
      {/* Glows decorativos */}
      <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[80%] bg-[#D4AF37]/5 rounded-full blur-[140px]" />

      {/* Header superior */}
      <div className="flex justify-between items-center relative z-10">
        <Link to="/register-select" className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-gradient-to-br from-[#D4AF37] to-[#AA820A] rounded-lg flex items-center justify-center border border-[#D4AF37]/20 shadow-md">
            <Heart className="h-4 w-4 text-black stroke-[2.5]" />
          </div>
          <span className="font-bold tracking-wider text-sm uppercase text-slate-300">AURA</span>
        </Link>
        <span className="text-xs font-semibold text-[#D4AF37] uppercase tracking-wider">
          Aspirante: {selectedRole}
        </span>
      </div>

      {/* Formulario Stepper */}
      <div className="max-w-2xl mx-auto w-full my-auto py-8 relative z-10">
        
        {/* Indicador visual de los pasos */}
        <div className="flex items-center justify-between mb-8 px-4">
          {[1, 2].map((step) => (
            <React.Fragment key={step}>
              <div className="flex items-center space-x-2.5">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs border transition-all duration-300 ${
                  currentStep === step
                    ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/15'
                    : currentStep > step
                      ? 'bg-[#1E2640] border-[#D4AF37]/40 text-[#D4AF37]'
                      : 'bg-[#101626] border-[#1E2640] text-slate-500'
                }`}>
                  {step}
                </div>
                <span className={`text-xs font-bold uppercase tracking-wider hidden sm:inline ${
                  currentStep === step ? 'text-slate-100' : 'text-slate-500'
                }`}>
                  {step === 1 ? 'Personales' : 'Específicos'}
                </span>
              </div>
              {step < 2 && (
                <div className={`flex-grow h-[1px] mx-4 border-t border-dashed ${
                  currentStep > step ? 'border-[#D4AF37]/40' : 'border-[#1E2640]'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Bloque del formulario principal */}
        <div className="bg-glass p-8 md:p-10 rounded-3xl border border-[#1E2640] shadow-2xl relative">
          
          {/* PASO 1: DATOS PERSONALES / COMUNES */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="mb-4">
                <h3 className="text-xl font-bold tracking-tight">Datos Personales y de Cuenta</h3>
                <p className="text-xs text-slate-400 mt-1">Ingrese sus datos de identidad y credenciales para la cuenta.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nombre(s)</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="ej: Andrés"
                    className="w-full px-4 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl focus:border-[#D4AF37] outline-none text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Apellido(s)</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="ej: Valenzuela"
                    className="w-full px-4 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl focus:border-[#D4AF37] outline-none text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Identificación Nacional</label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="ej: V-12345678"
                    className="w-full px-4 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl focus:border-[#D4AF37] outline-none text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Teléfono</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="ej: +58 412 1234567"
                    className="w-full px-4 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl focus:border-[#D4AF37] outline-none text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Email (Vinculado a Google)</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full px-4 py-2.5 bg-[#101626] border border-[#1E2640] rounded-xl outline-none text-sm text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>
          )}

          {/* PASO 2: DATOS DINÁMICOS POR ROL */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="mb-4">
                <h3 className="text-xl font-bold tracking-tight">Información de Perfil</h3>
                <p className="text-xs text-slate-400 mt-1">Proporcione detalles específicos del rol solicitado.</p>
              </div>

              {/* DYNAMIC FIELDS FOR DOCTOR */}
              {selectedRole === 'DOCTOR' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Licencia Médica Estatal</label>
                    <input
                      type="text"
                      value={medicalLicense}
                      onChange={(e) => setMedicalLicense(e.target.value)}
                      placeholder="ej: LIC-98765-MED"
                      className="w-full px-4 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl focus:border-[#D4AF37] outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Especialidad</label>
                    <input
                      type="text"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      placeholder="ej: Cardiología o Pediatría"
                      className="w-full px-4 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl focus:border-[#D4AF37] outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Institución de Procedencia</label>
                    <input
                      type="text"
                      value={institutionOrigin}
                      onChange={(e) => setInstitutionOrigin(e.target.value)}
                      placeholder="ej: Hospital Clínico Central"
                      className="w-full px-4 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl focus:border-[#D4AF37] outline-none text-sm"
                    />
                  </div>
                </div>
              )}

              {/* DYNAMIC FIELDS FOR CLIENT */}
              {selectedRole === 'CLIENT' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Razón Social</label>
                    <input
                      type="text"
                      value={corporateName}
                      onChange={(e) => setCorporateName(e.target.value)}
                      placeholder="ej: Servicios Médicos del Norte S.A."
                      className="w-full px-4 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl focus:border-[#D4AF37] outline-none text-sm"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">ID Fiscal (Tax ID) / RIF</label>
                      <input
                        type="text"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                        placeholder="ej: J-99888777-9"
                        className="w-full px-4 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl focus:border-[#D4AF37] outline-none text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Tipo de Entidad</label>
                      <select
                        value={clientType}
                        onChange={(e) => setClientType(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl focus:border-[#D4AF37] outline-none text-sm text-slate-200"
                      >
                        <option value="CLINICA">Clínica / Hospital</option>
                        <option value="FAMILIAR">Familiar / Persona Natural</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* DYNAMIC FIELDS FOR PATIENT */}
              {selectedRole === 'PATIENT' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Grupo Sanguíneo</label>
                    <select
                      value={bloodType}
                      onChange={(e) => setBloodType(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl focus:border-[#D4AF37] outline-none text-sm text-slate-200"
                    >
                      <option value="A+">A Positivo (A+)</option>
                      <option value="A-">A Negativo (A-)</option>
                      <option value="B+">B Positivo (B+)</option>
                      <option value="B-">B Negativo (B-)</option>
                      <option value="AB+">AB Positivo (AB+)</option>
                      <option value="AB-">AB Negativo (AB-)</option>
                      <option value="O+">O Positivo (O+)</option>
                      <option value="O-">O Negativo (O-)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Antecedentes Clínicos / Alergias</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="ej: Hipertensión, alergia a la penicilina..."
                      rows={4}
                      className="w-full px-4 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl focus:border-[#D4AF37] outline-none text-sm text-slate-200 placeholder:text-slate-600 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}



          {/* Botones de navegación del stepper */}
          <div className="flex items-center justify-between mt-8 border-t border-[#1E2640]/50 pt-6">
            <button
              onClick={currentStep === 1 ? () => navigate('/register-select') : handlePrevStep}
              className="px-4 py-2.5 bg-transparent text-slate-400 hover:text-slate-200 text-sm font-semibold flex items-center space-x-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Atrás</span>
            </button>

            {currentStep < 2 ? (
              <button
                onClick={handleNextStep}
                className="px-6 py-2.5 bg-[#1E2640] text-[#D4AF37] hover:bg-[#1E2640]/80 text-sm font-semibold rounded-xl border border-[#D4AF37]/20 flex items-center space-x-1.5 transition-all"
              >
                <span>Siguiente</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#AA820A] text-black font-bold text-sm rounded-xl hover:from-[#E5BE48] hover:to-[#BC931B] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Enviar Registro</span>
                )}
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500 relative z-10">
        ¿Ya tiene una cuenta?{' '}
        <Link to="/login" className="text-[#D4AF37] font-semibold hover:underline">
          Inicie sesión aquí
        </Link>
      </div>

    </div>
  );
};
export default RegistrationStepperView;
