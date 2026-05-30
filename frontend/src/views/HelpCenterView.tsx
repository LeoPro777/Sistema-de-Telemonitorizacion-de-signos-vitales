import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, BookOpen, HelpCircle, MessageSquare, AlertCircle, 
  Send, ChevronRight, X, Clock
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const HelpCenterView: React.FC = () => {
  const navigate = useNavigate();

  // Estados de datos
  const [articles, setArticles] = useState<any[]>([]);
  const [categories] = useState<string[]>(['Todos', 'Hardware', 'Clínica', 'Fondeo']);
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [activeTab, setActiveTab] = useState<'FAQ' | 'GUIDE'>('FAQ');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  // Estados para Modal de Ticket
  const [isTicketModalOpen, setIsTicketModalOpen] = useState<boolean>(false);
  const [ticketSubject, setTicketSubject] = useState<string>('');
  const [ticketMessage, setTicketMessage] = useState<string>('');
  const [ticketPriority, setTicketPriority] = useState<string>('MEDIUM');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState<boolean>(false);

  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Consultar artículos con filtros
  const fetchArticles = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/support/articles', {
        params: {
          q: searchQuery || undefined,
          category: activeCategory === 'Todos' ? undefined : activeCategory,
          format_type: activeTab
        }
      });
      setArticles(response.data);
      setIsLoading(false);
    } catch (err: any) {
      toast.error('Error al cargar los artículos de soporte.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [activeCategory, activeTab]);

  // Consultar autocompletado para type-ahead
  useEffect(() => {
    const fetchAutocomplete = async () => {
      if (searchQuery.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const response = await api.get('/support/articles/autocomplete', {
          params: { q: searchQuery }
        });
        setSuggestions(response.data);
      } catch (err) {
        // Silenciar error en autocompletado para no molestar la UX
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchAutocomplete();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Cerrar sugerencias al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    fetchArticles();
  };

  const handleSuggestionClick = (slug: string) => {
    setShowSuggestions(false);
    navigate(`/support/articles/${slug}`);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      toast.error('Por favor complete todos los campos obligatorios.');
      return;
    }

    setIsSubmittingTicket(true);
    try {
      await api.post('/support/tickets', {
        subject: ticketSubject,
        message: ticketMessage,
        priority: ticketPriority
      });
      toast.success('¡Ticket de soporte creado con éxito!');
      setIsTicketModalOpen(false);
      setTicketSubject('');
      setTicketMessage('');
      setTicketPriority('MEDIUM');
    } catch (err: any) {
      toast.error('Error al enviar la solicitud de soporte.');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  return (
    <div className="space-y-6 font-mono relative">
      
      {/* Cabecera superior */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] text-[#D4AF37] tracking-[0.2em] font-bold uppercase block mb-1">
            MÓDULO 9: CENTRO DE AYUDA Y SOPORTE TÉCNICO
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Centro de Ayuda</h2>
          <p className="text-xs text-slate-400 mt-1">Busque guías, resuelva dudas técnicas o contacte con gobernanza de AURA.</p>
        </div>

        <button
          onClick={() => setIsTicketModalOpen(true)}
          className="px-4 py-2.5 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black text-xs font-extrabold rounded-xl transition-all self-start md:self-auto flex items-center space-x-2 shadow-md shadow-[#D4AF37]/10 uppercase tracking-wider"
        >
          <MessageSquare className="h-4 w-4" />
          <span>Contactar a Soporte</span>
        </button>
      </div>

      {/* Buscador Semántico Inteligente con Type-Ahead */}
      <div className="bg-glass p-6 rounded-3xl border border-[#1E2640] relative z-20">
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-2xl mx-auto">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Buscar guías del ESP32, alertas clínicas, facturación..."
            className="w-full pl-11 pr-24 py-3 bg-[#0B0F19] border border-[#1E2640] rounded-2xl text-sm focus:border-[#D4AF37] outline-none transition-all placeholder:text-slate-600 font-sans"
          />
          <button
            type="submit"
            className="absolute right-2 top-2 bottom-2 px-4 bg-[#1E2640] hover:bg-[#D4AF37] hover:text-black text-xs text-[#D4AF37] font-bold rounded-xl border border-[#D4AF37]/20 transition-all uppercase"
          >
            Buscar
          </button>

          {/* Caja Type-Ahead de sugerencias instantáneas */}
          {showSuggestions && suggestions.length > 0 && (
            <div 
              ref={suggestionsRef}
              className="absolute left-0 right-0 mt-2 bg-[#0F1420] border border-[#1E2640] rounded-2xl shadow-2xl overflow-hidden z-30 divide-y divide-[#1E2640]/55"
            >
              {suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSuggestionClick(sug.slug)}
                  className="w-full px-5 py-3 hover:bg-[#1E2640]/40 text-left flex items-center justify-between text-xs transition-colors group"
                >
                  <div className="flex items-center space-x-3 truncate">
                    {sug.format_type === 'FAQ' ? (
                      <HelpCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <BookOpen className="h-4 w-4 text-[#D4AF37] flex-shrink-0" />
                    )}
                    <span className="text-slate-300 font-semibold truncate group-hover:text-white transition-colors">
                      {sug.title}
                    </span>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-black/40 border border-[#1E2640] text-slate-500 font-mono flex-shrink-0">
                    {sug.category}
                  </span>
                </button>
              ))}
            </div>
          )}
        </form>
      </div>

      {/* Píldoras de Categorías y Selector de Formato FAQ/Guías */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E2640]/55 pb-4">
        
        {/* Píldoras horizontales de categoría */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); }}
              className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                activeCategory === cat
                  ? 'bg-[#1E2640] text-[#D4AF37] border-[#D4AF37]/30 shadow-md'
                  : 'bg-black/10 text-slate-400 border-[#1E2640] hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Tabs FAQ vs Guías */}
        <div className="flex bg-[#0F1420] border border-[#1E2640] p-1 rounded-xl self-start md:self-auto">
          <button
            onClick={() => setActiveTab('FAQ')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 ${
              activeTab === 'FAQ'
                ? 'bg-[#D4AF37] text-black shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>FAQs</span>
          </button>
          
          <button
            onClick={() => setActiveTab('GUIDE')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 ${
              activeTab === 'GUIDE'
                ? 'bg-[#D4AF37] text-black shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Guías Clínicas</span>
          </button>
        </div>
      </div>

      {/* Listado de Artículos */}
      {isLoading ? (
        <div className="h-[30vh] flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cargando base de conocimiento...</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="bg-glass p-12 text-center rounded-3xl border border-[#1E2640] max-w-md mx-auto">
          <AlertCircle className="h-10 w-10 text-slate-600 mx-auto mb-4" />
          <h4 className="text-sm font-bold text-slate-200">No se encontraron artículos</h4>
          <p className="text-[10px] text-slate-500 mt-1">Pruebe limpiando el buscador o seleccionando otra categoría.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {articles.map((art) => (
            <button
              key={art._id}
              onClick={() => navigate(`/support/articles/${art.slug}`)}
              className="bg-glass p-6 rounded-3xl border border-[#1E2640] hover:border-[#D4AF37]/30 text-left flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] group outline-none h-full min-h-[160px]"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-black/45 border border-[#1E2640] text-[#D4AF37] uppercase">
                    {art.category}
                  </span>
                  
                  <span className="text-[9px] text-slate-500 font-mono font-bold flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{art.format_type === 'FAQ' ? 'Pregunta Frecuente' : 'Guía de Lectura'}</span>
                  </span>
                </div>

                <h4 className="text-base font-extrabold text-slate-200 group-hover:text-white transition-colors leading-tight">
                  {art.title}
                </h4>
                
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-sans">
                  {art.content.replace(/[#*`_]/g, '').slice(0, 150)}...
                </p>
              </div>

              <div className="border-t border-[#1E2640]/55 pt-3 mt-4 flex justify-between items-center text-[10px] font-bold text-slate-500 group-hover:text-[#D4AF37] transition-colors font-mono">
                <span>LEER ARTÍCULO</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* MODAL GLASSMORPHIC DE CREACIÓN DE TICKET DE SOPORTE */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 bg-[#0B0F19]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F1420] border border-[#1E2640] rounded-3xl p-6 w-full max-w-lg text-xs flex flex-col justify-between shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            
            <button
              onClick={() => setIsTicketModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 bg-[#1E2640] text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="border-b border-[#1E2640]/60 pb-3 mb-5">
              <span className="text-[9px] text-[#D4AF37] font-bold uppercase tracking-wider block">
                AUDITORÍA Y SOPORTE DE CONECTIVIDAD
              </span>
              <strong className="text-base text-slate-200 font-extrabold leading-none mt-1 block">
                Crear Ticket de Soporte Técnico
              </strong>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 font-mono">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase block">Asunto / Título</label>
                <input
                  type="text"
                  required
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="Ej: Problemas con el pulso en el ESP32 o facturas duplicadas"
                  className="w-full p-3 bg-[#0B0F19] border border-[#1E2640] rounded-xl text-xs focus:border-[#D4AF37] outline-none text-slate-200 font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase block">Prioridad de Atención</label>
                <select
                  value={ticketPriority}
                  onChange={(e) => setTicketPriority(e.target.value)}
                  className="w-full p-3 bg-[#0B0F19] border border-[#1E2640] rounded-xl text-xs focus:border-[#D4AF37] outline-none text-slate-200 cursor-pointer"
                >
                  <option value="LOW">Baja (Consultas generales)</option>
                  <option value="MEDIUM">Media (Errores menores de interfaz)</option>
                  <option value="HIGH">Alta (Dispositivo desconectado o fallo vital)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase block">Mensaje de Detalles</label>
                <textarea
                  required
                  rows={5}
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  placeholder="Por favor describa en detalle el problema físico, número de serie o error registrado."
                  className="w-full p-3 bg-[#0B0F19] border border-[#1E2640] rounded-xl text-xs focus:border-[#D4AF37] outline-none text-slate-200 font-sans resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingTicket}
                className="w-full mt-4 py-3 bg-[#D4AF37] hover:bg-[#D4AF37]/90 disabled:opacity-50 text-black font-extrabold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all uppercase tracking-wider text-center"
              >
                {isSubmittingTicket ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Enviar Solicitud Técnica</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default HelpCenterView;
