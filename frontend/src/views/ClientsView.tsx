import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Grid, List as ListIcon, Building2, Home,
  ShieldAlert, Activity, ChevronRight
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const ClientsView: React.FC = () => {
  const navigate = useNavigate();

  // Estados de datos
  const [clients, setClients] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [search, setSearch] = useState('');
  const [clientType, setClientType] = useState<string>('');

  // Preferencias de vista (CARDS o LIST)
  const [viewType, setViewType] = useState<'CARDS' | 'LIST'>('CARDS');
  const [isLoading, setIsLoading] = useState(true);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/clients', {
        params: {
          search: search || undefined,
          client_type: clientType || undefined,
          page,
          limit
        }
      });
      setClients(response.data.clients);
      setTotal(response.data.total);
      setIsLoading(false);
    } catch (err: any) {
      toast.error('Error al cargar la plantilla de clientes de financiamiento.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchClients();
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [search, clientType, page]);

  const handleToggleViewType = () => {
    const nextView = viewType === 'CARDS' ? 'LIST' : 'CARDS';
    setViewType(nextView);
    toast.success(`Consola alternada a vista de ${nextView === 'CARDS' ? 'Tarjetas' : 'Tabla'}`);
  };


  return (
    <div className="space-y-6">

      {/* Cabecera superior y barra de herramientas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Consola de Clientes</h2>
        </div>

        {/* Alternador de Vista (Grid / Tabla) */}
        <button
          onClick={handleToggleViewType}
          className="px-4 py-2 bg-[#1E2640] hover:bg-[#1E2640]/80 text-[#D4AF37] text-xs font-semibold rounded-xl border border-[#D4AF37]/25 flex items-center space-x-2 transition-all self-start md:self-auto uppercase tracking-wider"
        >
          {viewType === 'CARDS' ? (
            <>
              <ListIcon className="h-4 w-4" />
              <span>Ver en Tabla</span>
            </>
          ) : (
            <>
              <Grid className="h-4 w-4" />
              <span>Ver en Tarjetas</span>
            </>
          )}
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-glass p-5 rounded-3xl border border-[#1E2640] flex flex-col md:flex-row gap-4 items-center justify-between">

        {/* Buscador Semántico */}
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="h-4.5 w-4.5" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por identificación fiscal (Tax ID) o razón social..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl text-sm focus:border-[#D4AF37] outline-none transition-all placeholder:text-slate-600"
          />
        </div>

        {/* Selector de Tipo de Cliente */}
        <div className="w-full md:w-auto">
          <select
            value={clientType}
            onChange={(e) => setClientType(e.target.value)}
            className="w-full md:w-60 bg-[#0B0F19] border border-[#1E2640] text-slate-300 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-[#D4AF37] transition-all cursor-pointer"
          >
            <option value="">Cuentas de Fondeo (Todas)</option>
            <option value="CLINICA">CLÍNICA / INSTITUCIONAL</option>
            <option value="FAMILIAR">FONDEO FAMILIAR / INDIVIDUAL</option>
          </select>
        </div>

      </div>

      {isLoading ? (
        <div className="h-[40vh] flex flex-col items-center justify-center space-y-4">
          <div className="w-8 h-8 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-semibold tracking-widest uppercase">Consultando base NoSQL de clientes...</p>
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-glass p-12 text-center rounded-3xl border border-[#1E2640]">
          <ShieldAlert className="h-10 w-10 text-[#FFD700] mx-auto mb-4" />
          <h4 className="text-base font-bold text-slate-200">No se encontraron cuentas de clientes</h4>
          <p className="text-xs text-slate-500 mt-1">Verifique los filtros del buscador tributario o de tipo de fondeo.</p>
        </div>
      ) : (
        <>
          {/* MODO 1: GRIDA DE TARJETAS (CARDS) */}
          {viewType === 'CARDS' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {clients.map((client) => {
                const cache = client.summary_cache || { assigned_patients_count: 0, active_critical_alerts: 0, contract_health_percent: 100 };
                const hasAlert = cache.active_critical_alerts > 0;
                const isInstitution = client.client_type === 'CLINICA';
                const isActive = client.is_active;

                return (
                  <button
                    key={client._id}
                    onClick={() => navigate(`/clients/${client._id}`)}
                    className={`bg-glass p-6 rounded-3xl border text-left flex flex-col justify-between transition-all duration-300 hover:scale-[1.03] group outline-none relative overflow-hidden ${!isActive
                        ? 'border-[#1E2640]/40 opacity-50 bg-black/10'
                        : hasAlert
                          ? 'border-[#FF1744]/40 bg-[#FF1744]/2 shadow-[0_0_15px_rgba(255,23,68,0.05)]'
                          : 'border-[#1E2640] hover:border-[#D4AF37]/30'
                      }`}
                  >
                    <div>
                      {/* Cabecera Tarjeta: Icono de negocio */}
                      <div className="flex justify-between items-start">
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border transition-all ${!isActive
                            ? 'bg-[#1E2640]/40 border-slate-700 text-slate-500'
                            : hasAlert
                              ? 'bg-[#FF1744]/15 border-[#FF1744] text-[#FF1744] animate-pulse'
                              : 'bg-[#1E2640] border-[#1E2640] text-[#D4AF37]'
                          }`}>
                          {isInstitution ? <Building2 className="h-5.5 w-5.5" /> : <Home className="h-5.5 w-5.5" />}
                        </div>

                        {/* Indicador de alertas vigentes */}
                        {isActive && hasAlert && (
                          <span className="px-2 py-0.5 rounded-full bg-[#FF1744] text-black font-extrabold text-[9px] tracking-wider animate-pulse flex items-center space-x-1">
                            <Activity className="h-3 w-3" />
                            <span>{cache.active_critical_alerts} S.O.S</span>
                          </span>
                        )}

                        {!hasAlert && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-black/35 border border-[#1E2640] text-slate-500">
                            {isInstitution ? 'CLÍNICA' : 'FAMILIA'}
                          </span>
                        )}
                      </div>

                      {/* Razón Social y ID Fiscal */}
                      <div className="mt-5">
                        <h4 className="text-sm font-extrabold text-slate-200 group-hover:text-white transition-colors truncate">
                          {client.corporate_name}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">TAX ID: {client.tax_id}</p>
                      </div>
                    </div>

                    {/* Métricas del Cliente */}
                    <div className="my-6 space-y-2 border-y border-[#1E2640]/50 py-4 font-mono">

                      {/* Barra 2: Pacientes vinculados */}
                      <div className="flex justify-between items-center text-[10px] pt-1">
                        <span className="text-slate-500 font-bold uppercase tracking-wider">Pacientes Fondeados</span>
                        <strong className="text-slate-300">
                          {cache.assigned_patients_count} PAC
                        </strong>
                      </div>

                    </div>

                    {/* Footer Tarjeta: Acceso rápido */}
                    <div className="text-[10px] font-semibold text-slate-500 group-hover:text-[#D4AF37] flex items-center justify-between w-full transition-colors font-mono">
                      <span>AUDITAR CONTRATO</span>
                      <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>

                  </button>
                );
              })}
            </div>
          )}

          {/* MODO 2: TABLA DE ALTA DENSIDAD (LIST) */}
          {viewType === 'LIST' && (
            <div className="bg-glass rounded-3xl border border-[#1E2640] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0F1420] border-b border-[#1E2640] text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      <th className="py-4 px-6">Razón Social / Entidad</th>
                      <th className="py-4 px-6 text-center">TAX ID Fiscal</th>
                      <th className="py-4 px-6 text-center">Tipo Fondeo</th>
                      <th className="py-4 px-6 text-center">Pacientes Activos</th>
                      <th className="py-4 px-6 text-center">Alertas Clínicas</th>
                      <th className="py-4 px-6 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2640]/40 text-xs md:text-sm font-mono">
                    {clients.map((client) => {
                      const cache = client.summary_cache || { assigned_patients_count: 0, active_critical_alerts: 0, contract_health_percent: 100 };
                      const hasAlert = cache.active_critical_alerts > 0;
                      const isActive = client.is_active;

                      return (
                        <tr
                          key={client._id}
                          className={`hover:bg-[#1E2640]/20 transition-all ${!isActive ? 'opacity-50 bg-black/10' : ''
                            }`}
                        >
                          {/* Col 1: Nombre */}
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-3">
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center border ${!isActive
                                  ? 'bg-[#1E2640]/40 border-slate-700 text-slate-500'
                                  : hasAlert
                                    ? 'bg-[#FF1744]/15 border-[#FF1744] text-[#FF1744]'
                                    : 'bg-[#1E2640] border-[#1E2640] text-[#D4AF37]'
                                }`}>
                                {client.client_type === 'CLINICA' ? <Building2 className="h-4.5 w-4.5" /> : <Home className="h-4.5 w-4.5" />}
                              </div>
                              <div>
                                <span className="font-extrabold text-slate-200 block">{client.corporate_name}</span>
                                <span className="text-[9px] text-slate-500">CORREO: {client.contact_info?.emergency_email}</span>
                              </div>
                            </div>
                          </td>

                          {/* Col 2: Tax ID */}
                          <td className="py-4 px-6 text-center">
                            <span className="text-xs px-2 py-1 bg-black/30 border border-[#1E2640] rounded text-slate-400 select-all">
                              {client.tax_id}
                            </span>
                          </td>

                          {/* Col 3: Client Type */}
                          <td className="py-4 px-6 text-center">
                            <span className="text-slate-400 font-bold uppercase">
                              {client.client_type}
                            </span>
                          </td>

                          {/* Col 4: Patients Count */}
                          <td className="py-4 px-6 text-center font-bold text-slate-300">
                            <span>{cache.assigned_patients_count}</span>
                          </td>

                          {/* Col 5: Alertas Clínicas */}
                          <td className="py-4 px-6 text-center">
                            {isActive && hasAlert ? (
                              <span className="px-2 py-0.5 rounded-full bg-[#FF1744]/25 text-[#FF1744] border border-[#FF1744]/45 text-[9px] font-extrabold tracking-wider animate-pulse flex items-center justify-center space-x-1 w-20 mx-auto">
                                <Activity className="h-3 w-3" />
                                <span>{cache.active_critical_alerts} S.O.S</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[9px] font-bold">
                                NORMAL
                              </span>
                            )}
                          </td>

                          {/* Col 7: Acciones */}
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => navigate(`/clients/${client._id}`)}
                              className="px-3 py-1.5 bg-[#1E2640] hover:bg-[#D4AF37] hover:text-black font-bold text-xs text-[#D4AF37] rounded-lg border border-[#D4AF37]/20 hover:border-[#D4AF37] transition-all uppercase"
                            >
                              Auditar
                            </button>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Paginación */}
          {total > limit && (
            <div className="flex justify-between items-center mt-6 px-2 font-mono">
              <span className="text-xs text-slate-500 font-semibold">
                REGISTROS {clients.length} DE {total}
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-[#1E2640] text-[#D4AF37] disabled:opacity-40 disabled:cursor-not-allowed border border-[#D4AF37]/15 rounded-xl text-xs font-bold hover:bg-[#1E2640]/80 transition-all uppercase"
                >
                  PREV
                </button>
                <button
                  onClick={() => setPage(prev => (prev * limit < total ? prev + 1 : prev))}
                  disabled={page * limit >= total}
                  className="px-4 py-2 bg-[#1E2640] text-[#D4AF37] disabled:opacity-40 disabled:cursor-not-allowed border border-[#D4AF37]/15 rounded-xl text-xs font-bold hover:bg-[#1E2640]/80 transition-all uppercase"
                >
                  NEXT
                </button>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
};
export default ClientsView;
