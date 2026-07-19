import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Grid, List as ListIcon, ShieldAlert, Award, ChevronRight

} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const DoctorsView: React.FC = () => {
  const navigate = useNavigate();

  // Estados de datos
  const [doctors, setDoctors] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [search, setSearch] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');

  // Preferencias de vista (CARDS o LIST)
  const [viewType, setViewType] = useState<'CARDS' | 'LIST'>('CARDS');
  const [isLoading, setIsLoading] = useState(true);

  const fetchDoctors = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/doctors', {
        params: {
          search: search || undefined,
          specialty: selectedSpecialty || undefined,
          page,
          limit
        }
      });
      setDoctors(response.data.doctors);
      setTotal(response.data.total);
      setIsLoading(false);
    } catch (err: any) {
      toast.error('Error al cargar la plantilla de personal médico.');
      setIsLoading(false);
    }
  };

  const fetchSpecialties = async () => {
    try {
      const response = await api.get('/doctors/specialties');
      setSpecialties(response.data.specialties);
    } catch (err) {
      console.error('Error al consultar especialidades:', err);
    }
  };

  useEffect(() => {
    fetchSpecialties();
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchDoctors();
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [search, selectedSpecialty, page]);

  const handleToggleViewType = () => {
    const nextView = viewType === 'CARDS' ? 'LIST' : 'CARDS';
    setViewType(nextView);
    toast.success(`Consola de doctores cambiada a vista de ${nextView === 'CARDS' ? 'Tarjetas' : 'Tabla'}`);
  };

  return (
    <div className="space-y-6">

      {/* Cabecera superior y alternador de vista */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Consola de Médicos</h2>
        </div>

        {/* Botón Alternador */}
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
            placeholder="Buscar por licencia, staff ID o nombre..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl text-sm focus:border-[#D4AF37] outline-none transition-all placeholder:text-slate-600"
          />
        </div>

        {/* Selector de Especialidad */}
        <div className="w-full md:w-auto">
          <select
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
            className="w-full md:w-60 bg-[#0B0F19] border border-[#1E2640] text-slate-300 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-[#D4AF37] transition-all cursor-pointer"
          >
            <option value="">Especialidades Médicas (Todas)</option>
            {specialties.map((spec) => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>
        </div>

      </div>

      {isLoading ? (
        <div className="h-[40vh] flex flex-col items-center justify-center space-y-4">
          <div className="w-8 h-8 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-semibold tracking-widest uppercase">Consultando personal clínico...</p>
        </div>
      ) : doctors.length === 0 ? (
        <div className="bg-glass p-12 text-center rounded-3xl border border-[#1E2640]">
          <ShieldAlert className="h-10 w-10 text-[#FFD700] mx-auto mb-4" />
          <h4 className="text-base font-bold text-slate-200">No se encontraron médicos</h4>
          <p className="text-xs text-slate-500 mt-1">Modifique los filtros o el buscador de licencias clínicas.</p>
        </div>
      ) : (
        <>
          {/* MODO 1: GRIDA DE TARJETAS (CARDS) */}
          {viewType === 'CARDS' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {doctors.map((doctor) => {
                const isActive = doctor.is_active;

                return (
                  <button
                    key={doctor._id}
                    onClick={() => navigate(`/doctors/${doctor._id}`)}
                    className={`bg-glass p-6 rounded-3xl border text-left flex flex-col justify-between transition-all duration-300 hover:scale-[1.03] group outline-none relative overflow-hidden ${!isActive
                        ? 'border-[#1E2640]/40 opacity-50 bg-black/10' // 50% opacity deactivation requirement!
                        : 'border-[#1E2640] hover:border-[#D4AF37]/30 shadow-sm'
                      }`}
                  >

                    <div>
                      {/* Cabecera Tarjeta: LED indicador */}
                      <div className="flex justify-between items-start">
                        {/* Indicador LED de disponibilidad */}
                        <div className="flex items-center space-x-1.5 bg-black/35 px-2 py-0.5 rounded-md border border-[#1E2640]">
                          <span className={`h-2 w-2 rounded-full inline-block ${isActive
                              ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                              : 'bg-[#FF1744] shadow-[0_0_6px_#ef4444]'
                            }`} />
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                            {isActive ? 'ACTIVO' : 'INACTIVO'}
                          </span>
                        </div>

                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-black/30 border border-[#1E2640] text-slate-500">
                          {doctor.internal_staff_id}
                        </span>
                      </div>

                      {/* Info Doctor */}
                      <div className="mt-5">
                        <span className="text-[10px] text-[#D4AF37] font-extrabold uppercase tracking-widest flex items-center space-x-1 mb-1">
                          <Award className="h-3.5 w-3.5 text-[#D4AF37]" />
                          <span>{doctor.specialty}</span>
                        </span>

                        <h4 className="text-sm font-extrabold text-slate-200 group-hover:text-white transition-colors truncate">
                          Dr. {doctor.first_name} {doctor.last_name}
                        </h4>
                        <p className="text-[9px] text-slate-500 font-bold font-mono mt-0.5 uppercase">L/N: {doctor.license_number}</p>
                      </div>
                    </div>

                    {/* Patients Count & quick stats */}
                    <div className="my-5 border-t border-[#1E2640]/50 pt-4 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Pacientes Tutelados</span>
                      <strong className="text-slate-200 font-mono bg-black/40 px-2 py-1 rounded border border-[#1E2640]">
                        {doctor.active_patients_count} ACT
                      </strong>
                    </div>

                    {/* Footer Tarjeta: Acceso rápido */}
                    <div className="text-[10px] font-semibold text-slate-500 group-hover:text-[#D4AF37] flex items-center justify-between w-full transition-colors font-mono">
                      <span>VER EXPEDIENTE MÉDICO</span>
                      <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
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
                      <th className="py-4 px-6">Médico</th>
                      <th className="py-4 px-6 text-center">ID Staff</th>
                      <th className="py-4 px-6 text-center">N° Licencia</th>
                      <th className="py-4 px-6 text-center">Especialidad</th>
                      <th className="py-4 px-6 text-center">Pacientes Activos</th>
                      <th className="py-4 px-6 text-center">Disponibilidad</th>
                      <th className="py-4 px-6 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2640]/40 text-xs md:text-sm font-mono">
                    {doctors.map((doctor) => {
                      const isActive = doctor.is_active;

                      return (
                        <tr
                          key={doctor._id}
                          className={`hover:bg-[#1E2640]/20 transition-all ${!isActive ? 'opacity-50 bg-black/10' : ''
                            }`}
                        >
                          {/* Col 1: Nombre */}
                          <td className="py-4 px-6">
                            <span className="font-extrabold text-slate-200 block">Dr. {doctor.first_name} {doctor.last_name}</span>
                          </td>

                          {/* Col 2: Staff ID */}
                          <td className="py-4 px-6 text-center">
                            <span className="text-xs px-2 py-1 bg-black/30 border border-[#1E2640] rounded text-slate-400">
                              {doctor.internal_staff_id}
                            </span>
                          </td>

                          {/* Col 3: License */}
                          <td className="py-4 px-6 text-center">
                            <span className="text-slate-400 select-all font-semibold uppercase">{doctor.license_number}</span>
                          </td>

                          {/* Col 4: Specialty */}
                          <td className="py-4 px-6 text-center font-bold text-[#D4AF37]">
                            <span>{doctor.specialty}</span>
                          </td>

                          {/* Col 5: Active Patients */}
                          <td className="py-4 px-6 text-center font-bold text-slate-300">
                            <span>{doctor.active_patients_count}</span>
                          </td>

                          {/* Col 6: Availability LED */}
                          <td className="py-4 px-6 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              <span className={`h-2.5 w-2.5 rounded-full inline-block ${isActive
                                  ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                                  : 'bg-[#FF1744] shadow-[0_0_6px_#ef4444]'
                                }`} />
                              <span className="text-[10px] text-slate-400 font-bold uppercase">
                                {isActive ? 'Activo' : 'Inactivo'}
                              </span>
                            </div>
                          </td>

                          {/* Col 7: Acciones */}
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => navigate(`/doctors/${doctor._id}`)}
                              className="px-3 py-1.5 bg-[#1E2640] hover:bg-[#D4AF37] hover:text-black font-bold text-xs text-[#D4AF37] rounded-lg border border-[#D4AF37]/20 hover:border-[#D4AF37] transition-all uppercase"
                            >
                              Ficha
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
                REGISTROS {doctors.length} DE {total}
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
export default DoctorsView;
