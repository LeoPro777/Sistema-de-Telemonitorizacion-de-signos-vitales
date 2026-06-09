import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ThumbsUp, ThumbsDown, BookOpen, 
  HelpCircle, Calendar, Share2, Printer
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const ArticleDetailView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  // Estados de datos
  const [article, setArticle] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [voteType, setVoteType] = useState<'useful' | 'not_useful' | null>(null);

  const fetchArticleDetail = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/support/articles/${slug}`);
      setArticle(response.data);
      
      // Chequear si ya votamos localmente (guardado en LocalStorage)
      const cachedVote = localStorage.getItem(`aura_vote_${response.data._id}`);
      if (cachedVote) {
        setHasVoted(true);
        setVoteType(cachedVote as any);
      }
      setIsLoading(false);
    } catch (err: any) {
      toast.error('Error al cargar los detalles del artículo.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (slug) {
      fetchArticleDetail();
    }
  }, [slug]);

  const handleVote = async (type: 'useful' | 'not_useful') => {
    if (hasVoted || !article) return;

    try {
      const response = await api.post(`/support/articles/${article._id}/vote`, null, {
        params: { vote_type: type }
      });
      // Actualizar artículo local para reflejar votos instantáneos
      setArticle(response.data);
      setHasVoted(true);
      setVoteType(type);
      localStorage.setItem(`aura_vote_${article._id}`, type);
      
      toast.success(
        type === 'useful' 
          ? '¡Gracias por calificar este artículo como útil!' 
          : 'Gracias por tu feedback. Trabajaremos en mejorar esta guía.'
      );
    } catch (err) {
      toast.error('No se pudo procesar tu calificación.');
    }
  };

  // Renderizador personalizado de Markdown básico a HTML estilizado para la UI premium de AURA
  const renderMarkdown = (markdown: string) => {
    if (!markdown) return null;

    const lines = markdown.split('\n');
    return lines.map((line, idx) => {
      // Título H1
      if (line.startsWith('# ')) {
        return <h1 key={idx} className="text-xl md:text-2xl font-extrabold text-slate-100 border-b border-[#1E2640] pb-3 mt-6 mb-4 font-mono">{line.slice(2)}</h1>;
      }
      // Título H2
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-base md:text-lg font-bold text-[#D4AF37] mt-5 mb-3 font-mono">{line.slice(3)}</h2>;
      }
      // Título H3
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-sm font-bold text-slate-200 mt-4 mb-2 font-mono">{line.slice(4)}</h3>;
      }
      // Items de lista con punto
      if (line.startsWith('* ')) {
        return (
          <li key={idx} className="ml-5 list-disc text-slate-300 font-sans text-xs mb-1.5 leading-relaxed">
            {parseInlineStyles(line.slice(2))}
          </li>
        );
      }
      // Items numerados
      if (/^\d+\.\s/.test(line)) {
        const match = line.match(/^(\d+)\.\s(.*)/);
        return (
          <div key={idx} className="ml-5 text-slate-300 font-sans text-xs mb-1.5 leading-relaxed flex items-start space-x-1">
            <span className="text-[#D4AF37] font-bold font-mono mr-1.5">{match ? match[1] : ''}.</span>
            <span>{parseInlineStyles(match ? match[2] : '')}</span>
          </div>
        );
      }
      // Código monoespaciado en bloque
      if (line.startsWith('`') && line.endsWith('`') && line.length > 2) {
        return (
          <pre key={idx} className="p-3 bg-black/45 border border-[#1E2640] rounded-xl text-[10px] font-mono text-emerald-400 overflow-x-auto my-3">
            <code>{line.slice(1, -1)}</code>
          </pre>
        );
      }
      // Líneas vacías
      if (line.trim() === '') {
        return <div key={idx} className="h-2" />;
      }
      // Párrafos comunes
      return (
        <p key={idx} className="text-slate-300 text-xs md:text-sm font-sans leading-relaxed mb-4">
          {parseInlineStyles(line)}
        </p>
      );
    });
  };

  // Helper para convertir negritas e inline code en JSX
  const parseInlineStyles = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="text-slate-100 font-extrabold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={idx} className="px-1.5 py-0.5 bg-black/45 text-emerald-400 font-mono rounded text-[10px] border border-[#1E2640]">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-3 font-mono">
        <div className="w-8 h-8 border-3 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cargando artículo legal...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="space-y-6 font-mono max-w-xl mx-auto text-center py-12">
        <HelpCircle className="h-12 w-12 text-[#FF1744] mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-200">Artículo no encontrado</h3>
        <p className="text-xs text-slate-500">Este instructivo de soporte puede haber sido removido o archivado.</p>
        <button
          onClick={() => navigate('/support')}
          className="mt-6 px-4 py-2 bg-[#1E2640] text-[#D4AF37] border border-[#D4AF37]/15 rounded-xl text-xs font-bold hover:bg-[#1E2640]/80 transition-all uppercase"
        >
          Volver a Soporte
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono relative max-w-4xl mx-auto">
      
      {/* Botón de retorno y utilidades de artículo */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/support')}
          className="px-4 py-2 bg-[#1E2640] hover:bg-[#1E2640]/80 text-[#D4AF37] text-xs font-bold rounded-xl border border-[#D4AF37]/25 flex items-center space-x-1.5 transition-all uppercase tracking-wider"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver</span>
        </button>

        {/* Utilidades de artículo */}
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => { toast.success('Enlace de artículo copiado al portapapeles'); }}
            className="p-2 bg-[#1E2640]/50 hover:bg-[#1E2640] text-slate-400 hover:text-[#D4AF37] border border-[#1E2640] rounded-xl transition-all"
            title="Compartir Artículo"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button 
            onClick={() => { window.print(); }}
            className="p-2 bg-[#1E2640]/50 hover:bg-[#1E2640] text-slate-400 hover:text-[#D4AF37] border border-[#1E2640] rounded-xl transition-all"
            title="Imprimir"
          >
            <Printer className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tarjeta del Artículo de Conocimiento */}
      <div className="bg-glass rounded-3xl border border-[#1E2640] p-6 md:p-10 space-y-6">
        
        {/* Metadatos superiores */}
        <div className="border-b border-[#1E2640]/55 pb-6">
          <div className="flex items-center space-x-3 text-[10px] text-slate-500 mb-3 font-bold uppercase">
            <span className="px-2 py-0.5 bg-black/45 border border-[#1E2640] rounded text-[#D4AF37]">
              {article.category}
            </span>
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>Actualizado: {new Date(article.updated_at).toLocaleDateString('es-VE', { timeZone: 'America/Caracas' })}</span>
            </div>
            <div className="flex items-center space-x-1">
              {article.format_type === 'FAQ' ? (
                <HelpCircle className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <BookOpen className="h-3.5 w-3.5 text-[#D4AF37]" />
              )}
              <span>{article.format_type === 'FAQ' ? 'FAQ' : 'GUÍA CLÍNICA'}</span>
            </div>
          </div>

          <h2 className="text-xl md:text-3xl font-extrabold text-slate-100 tracking-tight leading-tight font-sans">
            {article.title}
          </h2>
        </div>

        {/* Contenido Renderizado de Alta Distención */}
        <div className="prose prose-invert max-w-none text-slate-300">
          {renderMarkdown(article.content)}
        </div>

        {/* Sección de Tags / Palabras Clave */}
        {article.search_keywords && article.search_keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-6 border-t border-[#1E2640]/45">
            {article.search_keywords.map((tag: string, idx: number) => (
              <span 
                key={idx} 
                className="text-[9px] font-mono text-slate-500 px-2 py-0.5 bg-black/20 border border-[#1E2640]/30 rounded uppercase tracking-wider font-bold"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Widget de Feedback de Utilidad */}
      <div className="bg-glass rounded-3xl border border-[#1E2640] p-6 flex flex-col md:flex-row items-center justify-between gap-4 font-mono shadow-lg relative overflow-hidden">
        
        {/* Adornos sutiles de fondo para ambientar premium dark */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center md:text-left">
          <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">¿Te fue útil este artículo de soporte?</h4>
          <p className="text-[10px] text-slate-500 mt-1">Tus valoraciones nos ayudan a refinar las directivas y manuales clínicos.</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleVote('useful')}
            disabled={hasVoted}
            className={`px-4.5 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center space-x-2 ${
              hasVoted && voteType === 'useful'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : hasVoted
                ? 'opacity-40 bg-black/10 border-[#1E2640] cursor-not-allowed'
                : 'bg-[#1E2640] text-emerald-400 border-emerald-500/15 hover:bg-emerald-500/10 hover:border-emerald-500/30'
            }`}
          >
            <ThumbsUp className="h-4 w-4" />
            <span>Sí, me ayudó</span>
            <span className="text-[9px] font-mono bg-black/35 px-1.5 py-0.5 rounded text-slate-500 ml-1">
              ({article.feedback_counters?.useful_votes || 0})
            </span>
          </button>

          <button
            onClick={() => handleVote('not_useful')}
            disabled={hasVoted}
            className={`px-4.5 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center space-x-2 ${
              hasVoted && voteType === 'not_useful'
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                : hasVoted
                ? 'opacity-40 bg-black/10 border-[#1E2640] cursor-not-allowed'
                : 'bg-[#1E2640] text-rose-400 border-rose-500/15 hover:bg-rose-500/10 hover:border-rose-500/30'
            }`}
          >
            <ThumbsDown className="h-4 w-4" />
            <span>No del todo</span>
            <span className="text-[9px] font-mono bg-black/35 px-1.5 py-0.5 rounded text-slate-500 ml-1">
              ({article.feedback_counters?.not_useful_votes || 0})
            </span>
          </button>
        </div>

      </div>

    </div>
  );
};
export default ArticleDetailView;
