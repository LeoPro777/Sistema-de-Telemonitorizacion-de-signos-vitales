import React from 'react';
import { AlertTriangle, X, Link as LinkIcon, User, Activity, Stethoscope, Building2 } from 'lucide-react';

export type VerificationEntityType = 'patient' | 'device' | 'doctor' | 'client';

interface VerificationEntity {
  type: VerificationEntityType;
  name: string;
  subtitle?: string;
}

interface ActionVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sourceEntity: VerificationEntity;
  targetEntity: VerificationEntity;
  impactText: string;
}

export const ActionVerificationModal: React.FC<ActionVerificationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  sourceEntity,
  targetEntity,
  impactText
}) => {
  if (!isOpen) return null;

  const getEntityIcon = (type: VerificationEntityType) => {
    switch (type) {
      case 'patient': return <User className="h-6 w-6 text-slate-300" />;
      case 'device': return <Activity className="h-6 w-6 text-slate-300" />;
      case 'doctor': return <Stethoscope className="h-6 w-6 text-slate-300" />;
      case 'client': return <Building2 className="h-6 w-6 text-slate-300" />;
      default: return <User className="h-6 w-6 text-slate-300" />;
    }
  };

  const renderCard = (entity: VerificationEntity) => (
    <div className="flex-1 bg-[#1E2640]/30 border border-[#1E2640] rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-b from-[#D4AF37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div className="p-3 bg-black/40 rounded-xl border border-[#1E2640]">
        {getEntityIcon(entity.type)}
      </div>
      <div>
        <h4 className="text-sm font-bold text-slate-200 line-clamp-1">{entity.name}</h4>
        {entity.subtitle && <p className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase">{entity.subtitle}</p>}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-[#0B0F19]/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="bg-[#0F1420] border border-[#D4AF37]/30 rounded-3xl p-6 w-full max-w-md shadow-[0_0_60px_rgba(212,175,55,0.15)] relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabecera */}
        <div className="flex justify-between items-start border-b border-[#1E2640]/60 pb-4 mb-5">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/30">
              <AlertTriangle className="h-6 w-6 text-[#D4AF37]" />
            </div>
            <div>
              <strong className="text-sm text-slate-200 font-extrabold block uppercase tracking-wide">
                Verificación de Impacto
              </strong>
              <span className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-wider block mt-0.5">
                Acción Transaccional
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1 hover:bg-[#1E2640]/40 rounded-lg transition-all">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Tarjetas Contrapuestas */}
        <div className="flex items-center justify-between space-x-3 mb-6 relative">
          {renderCard(sourceEntity)}
          <div className="flex-shrink-0 z-10 px-2">
            <div className="bg-[#D4AF37] rounded-full p-1.5 shadow-[0_0_15px_rgba(212,175,55,0.4)]">
              <LinkIcon className="h-4 w-4 text-black" />
            </div>
          </div>
          {/* Línea conectora de fondo */}
          <div className="absolute top-1/2 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent -translate-y-1/2 -z-0 pointer-events-none"></div>
          {renderCard(targetEntity)}
        </div>

        {/* Texto Dinámico de Impacto */}
        <div className="bg-[#1E2640]/20 rounded-xl p-4 mb-6 border-l-2 border-[#D4AF37]">
          <p className="text-slate-300 leading-relaxed font-sans text-xs">
            {impactText}
          </p>
        </div>

        {/* Acciones */}
        <div className="flex items-center space-x-3 pt-4 border-t border-[#1E2640]/45">
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-3 bg-gradient-to-r from-[#D4AF37] to-[#B3932F] hover:from-[#E5BE48] hover:to-[#C6A234] text-black font-extrabold text-xs rounded-xl transition-all uppercase tracking-wider text-center active:scale-95 shadow-[0_5px_15px_rgba(212,175,55,0.2)]"
          >
            Confirmar Vinculación
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-black/30 text-slate-400 border border-[#1E2640] hover:text-slate-200 hover:bg-[#1E2640]/40 font-extrabold text-xs rounded-xl transition-all uppercase tracking-wider text-center active:scale-95"
          >
            Cancelar
          </button>
        </div>

      </div>
    </div>
  );
};

export default ActionVerificationModal;
