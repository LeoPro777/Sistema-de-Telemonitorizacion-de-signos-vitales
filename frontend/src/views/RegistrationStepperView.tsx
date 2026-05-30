import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Heart, ArrowLeft, ArrowRight, UploadCloud, CheckCircle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export const RegistrationStepperView: React.FC = () => {
  const navigate = useNavigate();
  const { selectedRole, registerApplicant } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirigir si no hay rol seleccionado
  useEffect(() => {
    if (!selectedRole) {
      toast.error('Por favor, seleccione el tipo de aspirante primero');
      navigate('/register-select');
    }
  }, [selectedRole, navigate]);

  // --- ESTADO DEL FORMULARIO ---
  // Paso 1: Datos Comunes & Cuenta
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
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

  // Paso 3: Documentos (Simulado Drag & Drop)
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; size: string; status: 'uploading' | 'completed' }>>([]);
  const [dragActive, setDragActive] = useState(false);

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!username || !password || !firstName || !lastName || !email || !phone || !nationalId) {
        toast.error('Complete todos los campos del Paso 1');
        return;
      }
      if (password.length < 6) {
        toast.error('La contraseña debe tener al menos 6 caracteres');
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

  // Drag and Drop simulation
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      addSimulatedFile(e.dataTransfer.files[0].name);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      addSimulatedFile(e.target.files[0].name);
    }
  };

  const addSimulatedFile = (fileName: string) => {
    const newFile = { name: fileName, size: '2.4 MB', status: 'uploading' as const };
    setUploadedFiles((prev) => [...prev, newFile]);
    
    // Simular progreso de subida
    setTimeout(() => {
      setUploadedFiles((prev) => 
        prev.map((f) => f.name === fileName ? { ...f, status: 'completed' } : f)
      );
      toast.success(`Archivo "${fileName}" cargado correctamente.`);
    }, 1500);
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Debe cargar al menos un documento de verificación');
      return;
    }
    
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

    const payload = {
      username: username,
      email: email,
      password: password,
      requested_role: selectedRole,
      personal_data: {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone,
        identification_number: nationalId,
      },
      professional_metadata: professionalMetadata,
    };

    try {
      await registerApplicant(payload);
      toast.success('Solicitud enviada exitosamente. Su cuenta ha quedado pendiente de aprobación.');
      navigate('/login'); // Redirigir a login para que pueda entrar y ver su estado de espera!
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
          {[1, 2, 3].map((step) => (
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
                  {step === 1 ? 'Personales' : step === 2 ? 'Específicos' : 'Auditoría'}
                </span>
              </div>
              {step < 3 && (
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
                    placeholder="ej: 12345678-9"
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
                    placeholder="ej: +56 9 1234 5678"
                    className="w-full px-4 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl focus:border-[#D4AF37] outline-none text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Email Único</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="andres@hospital.com"
                  className="w-full px-4 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl focus:border-[#D4AF37] outline-none text-sm"
                  required
                />
              </div>

              <div className="border-t border-[#1E2640] pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nombre de Usuario</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ej: dr_andres"
                    className="w-full px-4 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl focus:border-[#D4AF37] outline-none text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Contraseña</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña de acceso"
                    className="w-full px-4 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl focus:border-[#D4AF37] outline-none text-sm"
                    required
                  />
                </div>
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
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">ID Fiscal (Tax ID)</label>
                      <input
                        type="text"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                        placeholder="ej: 99.888.777-K"
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

          {/* PASO 3: ARCHIVOS Y VERIFICACIÓN DRAG & DROP */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="mb-4">
                <h3 className="text-xl font-bold tracking-tight">Documentación de Soporte</h3>
                <p className="text-xs text-slate-400 mt-1">Cargue documentos que verifiquen su identidad y licencia médica.</p>
              </div>

              {/* Area Drag & Drop */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-3xl p-8 text-center flex flex-col items-center justify-center transition-all ${
                  dragActive
                    ? 'border-[#D4AF37] bg-[#D4AF37]/5'
                    : 'border-[#1E2640] hover:border-[#1E2640]/80 bg-black/10'
                }`}
              >
                <input
                  type="file"
                  id="file-upload"
                  onChange={handleFileInput}
                  className="hidden"
                />
                
                <UploadCloud className="h-12 w-12 text-[#D4AF37] mb-4 stroke-[1.5]" />
                
                <p className="text-sm font-bold text-slate-200">Arrastre y suelte su archivo aquí</p>
                <p className="text-xs text-slate-500 mt-1.5">Formatos soportados: PDF, JPG, PNG (máx. 10MB)</p>
                
                <label
                  htmlFor="file-upload"
                  className="mt-5 px-5 py-2 bg-[#1E2640] text-[#D4AF37] text-xs font-semibold rounded-lg hover:bg-[#1E2640]/80 cursor-pointer border border-[#D4AF37]/20 transition-all"
                >
                  Examinar Archivos
                </label>
              </div>

              {/* Lista de archivos cargados */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Documentos Cargados</h4>
                  <div className="space-y-2">
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3.5 bg-[#0B0F19] rounded-xl border border-[#1E2640]">
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <FileText className="h-5 w-5 text-[#D4AF37] flex-shrink-0" />
                          <div className="truncate pr-4">
                            <p className="text-xs font-bold truncate text-slate-200">{file.name}</p>
                            <p className="text-[10px] text-slate-500">{file.size}</p>
                          </div>
                        </div>

                        {file.status === 'uploading' ? (
                          <div className="w-4 h-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin flex-shrink-0" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                        )}
                      </div>
                    ))}
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

            {currentStep < 3 ? (
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
                disabled={isSubmitting || uploadedFiles.length === 0}
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
