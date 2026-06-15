import React from 'react';
import { AlertTriangle, AlertCircle, HelpCircle, CheckCircle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning'
}) => {
  if (!isOpen) return null;

  // Determinar colores y gráficos según la criticidad
  const getColors = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <AlertCircle className="h-6 w-6 text-[#FF1744]" />,
          border: 'border-[#FF1744]/30',
          btnConfirm: 'bg-[#FF1744] hover:bg-[#FF1744]/95 text-white',
          textTitle: 'text-slate-200',
          subTitle: 'text-[#FF1744]'
        };
      case 'success':
        return {
          icon: <CheckCircle className="h-6 w-6 text-emerald-400" />,
          border: 'border-emerald-500/30',
          btnConfirm: 'bg-emerald-500 hover:bg-emerald-400 text-white',
          textTitle: 'text-slate-200',
          subTitle: 'text-emerald-400'
        };
      case 'info':
        return {
          icon: <HelpCircle className="h-6 w-6 text-[#00F2FE]" />,
          border: 'border-[#00F2FE]/30',
          btnConfirm: 'bg-[#1E2640] border border-[#00F2FE]/45 text-[#00F2FE] hover:bg-[#00F2FE]/10',
          textTitle: 'text-slate-200',
          subTitle: 'text-[#00F2FE]'
        };
      case 'warning':
      default:
        return {
          icon: <AlertTriangle className="h-6 w-6 text-[#D4AF37]" />,
          border: 'border-[#D4AF37]/30',
          btnConfirm: 'bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black',
          textTitle: 'text-slate-200',
          subTitle: 'text-[#D4AF37]'
        };
    }
  };

  const colors = getColors();

  return (
    <div className="fixed inset-0 bg-[#0B0F19]/85 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
      <div className={`bg-[#0F1420] border ${colors.border} rounded-3xl p-6 w-full max-w-md text-xs flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.7)] relative font-mono animate-in fade-in zoom-in-95 duration-200`}>
        
        {/* Header con botón de salida */}
        <div className="flex justify-between items-start border-b border-[#1E2640]/60 pb-3 mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-black/30 rounded-xl border border-[#1E2640]">
              {colors.icon}
            </div>
            <div>
              <strong className={`text-sm ${colors.textTitle} font-extrabold block uppercase tracking-wide`}>
                {title}
              </strong>
              <span className={`text-[9px] ${colors.subTitle} font-bold uppercase tracking-wider block mt-0.5`}>
                Confirmación de Seguridad
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 p-1 hover:bg-[#1E2640]/40 rounded-lg transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mensaje descriptivo */}
        <div className="my-2 py-1">
          <p className="text-slate-400 leading-relaxed font-sans text-xs">
            {message}
          </p>
        </div>

        {/* Acciones */}
        <div className="flex items-center space-x-3 pt-5 border-t border-[#1E2640]/45 mt-4">
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-2.5 ${colors.btnConfirm} font-extrabold text-xs rounded-xl transition-all uppercase tracking-wider text-center active:scale-95 shadow-md`}
          >
            {confirmText}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-black/25 text-slate-400 border border-[#1E2640] hover:text-slate-200 hover:bg-[#1E2640]/20 font-extrabold text-xs rounded-xl transition-all uppercase tracking-wider text-center active:scale-95"
          >
            {cancelText}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ConfirmationModal;
