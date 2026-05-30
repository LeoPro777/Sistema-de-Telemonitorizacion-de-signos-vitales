import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore, UserRole } from '../store/authStore';
import { Stethoscope, Building2, User2, ArrowRight, Heart } from 'lucide-react';

export const ApplicantTypeView: React.FC = () => {
  const navigate = useNavigate();
  const { selectedRole, setSelectedRole } = useAuthStore();

  const rolesConfig = [
    {
      id: 'DOCTOR' as UserRole,
      title: 'Médico Especialista',
      description: 'Acceso para el monitoreo de pacientes, control de alertas clínicas, calibración de umbrales clínicos y descarga de analíticas.',
      icon: Stethoscope,
      accent: 'from-[#D4AF37] to-[#8C6F12]',
    },
    {
      id: 'CLIENT' as UserRole,
      title: 'Cliente Institucional o Familiar',
      description: 'Acceso para la administración de centros clínicos, compra o gestión de dispositivos IoT, y control general de familiares.',
      icon: Building2,
      accent: 'from-[#00F2FE] to-[#00A7B5]',
    },
    {
      id: 'PATIENT' as UserRole,
      title: 'Paciente',
      description: 'Acceso restrictivo exclusivo de solo lectura para la telemetría en tiempo real y revisión simple de su propio historial clínico.',
      icon: User2,
      accent: 'from-[#FF1744] to-[#B21030]',
    },
  ];

  const handleContinue = () => {
    if (selectedRole) {
      navigate('/register-form');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col justify-between p-6 md:p-12 relative overflow-hidden">
      
      {/* Glows decorativos */}
      <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[80%] bg-[#D4AF37]/5 rounded-full blur-[140px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#00F2FE]/5 rounded-full blur-[120px]" />

      {/* Header superior */}
      <div className="flex justify-between items-center relative z-10">
        <Link to="/login" className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-gradient-to-br from-[#D4AF37] to-[#AA820A] rounded-lg flex items-center justify-center border border-[#D4AF37]/20 shadow-md">
            <Heart className="h-4 w-4 text-black stroke-[2.5]" />
          </div>
          <span className="font-bold tracking-wider text-sm uppercase text-slate-300">AURA</span>
        </Link>
        
        <Link to="/login" className="text-xs font-semibold text-slate-400 hover:text-slate-200 hover:underline">
          Volver al Inicio
        </Link>
      </div>

      {/* Cuerpo central */}
      <div className="max-w-5xl mx-auto w-full my-auto py-12 relative z-10">
        <div className="text-center mb-12">
          <span className="text-[10px] text-[#D4AF37] tracking-[0.2em] font-bold uppercase">PROCESO DE ALTA</span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-2">Seleccione su Tipo de Cuenta</h2>
          <p className="text-sm text-slate-400 mt-3 max-w-lg mx-auto leading-relaxed">
            Para iniciar el proceso de onboarding, por favor seleccione el rol de acceso correspondiente a sus actividades.
          </p>
        </div>

        {/* Grid de 3 Columnas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {rolesConfig.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;
            
            return (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`flex flex-col text-left p-8 rounded-3xl bg-glass border transition-all duration-300 hover:scale-[1.03] outline-none group relative overflow-hidden ${
                  isSelected 
                    ? 'border-[#D4AF37] bg-glass-active border-glow-gold' 
                    : 'border-[#1E2640] hover:border-[#1E2640]/80'
                }`}
              >
                {/* Indicador de selección */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${role.accent} opacity-5 group-hover:opacity-10 transition-opacity`} />
                
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center border transition-all duration-300 mb-6 ${
                  isSelected 
                    ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20' 
                    : 'bg-[#1E2640] border-[#1E2640] text-slate-300 group-hover:text-white'
                }`}>
                  <Icon className="h-7 w-7" />
                </div>

                <h4 className="text-xl font-bold tracking-tight text-slate-100 group-hover:text-white transition-colors">
                  {role.title}
                </h4>
                
                <p className="text-xs md:text-sm text-slate-400 mt-4 leading-relaxed flex-grow">
                  {role.description}
                </p>

                {/* Sello o indicador del borde */}
                <div className={`mt-6 flex items-center text-xs font-semibold space-x-1.5 transition-all ${
                  isSelected ? 'text-[#D4AF37]' : 'text-slate-500 group-hover:text-slate-300'
                }`}>
                  <span>Seleccionar</span>
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Botón continuar */}
        <div className="flex flex-col items-center justify-center mt-12">
          <button
            onClick={handleContinue}
            disabled={!selectedRole}
            className="px-8 py-3.5 bg-gradient-to-r from-[#D4AF37] to-[#AA820A] text-black font-bold rounded-xl hover:from-[#E5BE48] hover:to-[#BC931B] transition-all duration-300 shadow-lg shadow-[#D4AF37]/10 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-2 relative group"
          >
            <span>Continuar</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500 relative z-10">
        ¿Ya tiene una cuenta de usuario?{' '}
        <Link to="/login" className="text-[#D4AF37] font-semibold hover:underline">
          Inicie sesión aquí
        </Link>
      </div>

    </div>
  );
};
export default ApplicantTypeView;
