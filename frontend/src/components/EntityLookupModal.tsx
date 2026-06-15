import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Link as LinkIcon, User, Activity, Stethoscope, Building2 } from 'lucide-react';
import api from '../utils/api';

export type EntityType = 'patients' | 'devices' | 'doctors' | 'clients';

interface EntityLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: EntityType;
  onSelect: (entity: any) => void;
  title: string;
}

export const EntityLookupModal: React.FC<EntityLookupModalProps> = ({
  isOpen,
  onClose,
  entityType,
  onSelect,
  title
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);

  // Determinar icono base según la entidad
  const getIcon = () => {
    switch (entityType) {
      case 'patients': return <User className="h-5 w-5 text-slate-400" />;
      case 'devices': return <Activity className="h-5 w-5 text-slate-400" />;
      case 'doctors': return <Stethoscope className="h-5 w-5 text-slate-400" />;
      case 'clients': return <Building2 className="h-5 w-5 text-slate-400" />;
      default: return <LinkIcon className="h-5 w-5 text-slate-400" />;
    }
  };

  // Renderizador de cada fila según el tipo de entidad
  const renderItemInfo = (item: any) => {
    switch (entityType) {
      case 'patients':
        return (
          <>
            <h4 className="text-sm font-bold text-slate-200">{item.first_name} {item.last_name}</h4>
            <p className="text-[10px] text-slate-400 font-mono">ID: {item.national_id} | Record: {item.medical_record_id}</p>
          </>
        );
      case 'devices':
        return (
          <>
            <h4 className="text-sm font-bold text-slate-200">{item.serial_number}</h4>
            <p className="text-[10px] text-slate-400 font-mono">MAC: {item.mac_address} | Modelo: {item.device_model}</p>
          </>
        );
      case 'doctors':
        return (
          <>
            <h4 className="text-sm font-bold text-slate-200">{item.first_name} {item.last_name}</h4>
            <p className="text-[10px] text-slate-400 font-mono">Licencia: {item.medical_license}</p>
          </>
        );
      case 'clients':
        return (
          <>
            <h4 className="text-sm font-bold text-slate-200">{item.corporate_name}</h4>
            <p className="text-[10px] text-slate-400 font-mono">Tax ID: {item.tax_id}</p>
          </>
        );
      default:
        return null;
    }
  };

  // Búsqueda con debounce
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      // Si está vacío, traer una lista inicial pequeña
      setIsLoading(true);
      api.get(`/${entityType}?limit=20`)
        .then(res => {
          setResults(res.data[entityType] || []);
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
      return;
    }

    debounceRef.current = setTimeout(() => {
      setIsLoading(true);
      api.get(`/${entityType}?search=${encodeURIComponent(query)}&limit=20`)
        .then(res => {
          setResults(res.data[entityType] || []);
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, isOpen, entityType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#0B0F19]/85 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
      <div className="bg-[#0F1420] border border-[#1E2640] rounded-3xl p-6 w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.7)] relative animate-in fade-in zoom-in-95 duration-200 flex flex-col h-[600px] max-h-[85vh]">
        
        {/* Cabecera */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#1E2640]/50 rounded-xl border border-[#1E2640]">
              <LinkIcon className="h-5 w-5 text-[#D4AF37]" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-200 tracking-wide uppercase">{title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1 hover:bg-[#1E2640]/40 rounded-lg transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Buscador Superior */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4.5 w-4.5 text-slate-500" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 bg-[#1E2640]/30 border border-[#1E2640] rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] text-sm transition-all"
            placeholder="Escriba nombre, cédula o ID clínico..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Lista de Resultados Virtualizada/Scroll */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
          {isLoading ? (
            // Skeletons
            [...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center space-x-4 p-3 rounded-xl border border-[#1E2640]/40 bg-[#1E2640]/10">
                <div className="h-10 w-10 bg-[#1E2640] rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-[#1E2640] rounded w-1/3"></div>
                  <div className="h-2 bg-[#1E2640] rounded w-1/2"></div>
                </div>
              </div>
            ))
          ) : results.length > 0 ? (
            results.map((item, idx) => (
              <div key={item._id || idx} className="flex items-center justify-between p-3 rounded-xl border border-[#1E2640]/60 bg-[#1E2640]/20 hover:bg-[#1E2640]/40 transition-colors group">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-black/30 rounded-full border border-[#1E2640]">
                    {getIcon()}
                  </div>
                  <div>
                    {renderItemInfo(item)}
                  </div>
                </div>
                <button
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className="px-4 py-1.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-black border border-[#D4AF37]/30 hover:border-[#D4AF37] rounded-lg text-xs font-bold uppercase tracking-wider transition-all opacity-80 group-hover:opacity-100"
                >
                  Seleccionar
                </button>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3">
              <Search className="h-8 w-8 opacity-20" />
              <p className="text-sm font-semibold">No se encontraron resultados.</p>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default EntityLookupModal;
