import React from 'react';
import { 
  Users, Smartphone, ShieldCheck, HardDrive 
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid 
} from 'recharts';

interface ClientDashboardProps {
  kpis: any;
}

const COLORS = ['#10B981', '#D4AF37', '#FF1744'];

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ kpis }) => {
  const deviceData = kpis.device_operational_status || [];
  const patientList = kpis.patient_device_list || [];
  const incidentHistory = kpis.incident_history || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Zona Superior: Métricas de Negocio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* SLA Contractual */}
        <div className="bg-[#1E2640] p-6 rounded-3xl border border-[#1E2640] hover:border-[#D4AF37]/30 transition-all flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div className="h-12 w-12 bg-[#0B0F19] rounded-2xl flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">CONTRATO</span>
          </div>
          <div className="my-2">
            <span className="text-4xl font-extrabold tracking-tight text-white block">
              {kpis.contract_health || 100}%
            </span>
            <span className="text-xs font-semibold text-slate-300 block mt-0.5">
              Porcentaje de Salud Contractual
            </span>
          </div>
        </div>

        {/* Total de Pacientes Financiados */}
        <div className="bg-[#1E2640] p-6 rounded-3xl border border-[#1E2640] hover:border-[#D4AF37]/30 transition-all flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div className="h-12 w-12 bg-[#0B0F19] rounded-2xl flex items-center justify-center text-cyan-400 border border-cyan-500/25">
              <Users className="h-5 w-5" />
            </div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">FINANCIACIÓN</span>
          </div>
          <div className="my-2">
            <span className="text-4xl font-extrabold tracking-tight text-white block">
              {kpis.client_patients || kpis.funded_patients_count || 0}
            </span>
            <span className="text-xs font-semibold text-slate-300 block mt-0.5">
              Total de Pacientes Financiados
            </span>
          </div>
        </div>

        {/* Dispositivos IoT Desplegados */}
        <div className="bg-[#1E2640] p-6 rounded-3xl border border-[#1E2640] hover:border-[#D4AF37]/30 transition-all flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div className="h-12 w-12 bg-[#0B0F19] rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <Smartphone className="h-5 w-5" />
            </div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">ACTIVOS</span>
          </div>
          <div className="my-2">
            <span className="text-4xl font-extrabold tracking-tight text-white block">
              {kpis.deployed_devices_count || 0}
            </span>
            <span className="text-xs font-semibold text-slate-300 block mt-0.5">
              Dispositivos IoT Desplegados
            </span>
          </div>
        </div>

      </div>

      {/* 2. Área Central (50% Monitor de Consumo y Alertas - 50% Diagnóstico de Activos) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Monitor de Consumo y Alertas (Sección Izquierda) */}
        <div className="bg-[#1E2640] p-6 rounded-3xl border border-[#1E2640] flex flex-col justify-between">
          <div className="mb-6">
            <span className="text-[10px] text-[#D4AF37] tracking-[0.2em] font-bold uppercase block mb-1">AUDITORÍA GRUPAL</span>
            <h3 className="text-base font-bold text-white">Monitor de Consumo y Alertas</h3>
            <p className="text-xs text-slate-400 mt-1">Monitoreo de telemetría y contabilidad de incidentes del grupo.</p>
          </div>

          <div className="flex-grow overflow-x-auto min-h-[300px]">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0B0F19]/40 text-[#D4AF37] uppercase font-bold text-[9px] tracking-wider border-b border-[#1E2640]">
                <tr>
                  <th className="py-3 px-4 rounded-tl-xl">Paciente</th>
                  <th className="py-3 px-4">Hardware Asignado</th>
                  <th className="py-3 px-4 rounded-tr-xl text-center">Alertas Críticas (Semana)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2640]/50">
                {patientList.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-500 font-medium">
                      No hay pacientes asociados a este contrato actualmente.
                    </td>
                  </tr>
                ) : (
                  patientList.map((p: any, idx: number) => (
                    <tr key={idx} className="hover:bg-[#0B0F19]/20 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-100">{p.name}</td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">{p.hardware}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          p.alerts_week > 0 
                            ? 'bg-[#FF1744]/10 text-[#FF1744] border border-[#FF1744]/20' 
                            : 'bg-emerald-500/10 text-[#10B981] border border-emerald-500/20'
                        }`}>
                          {p.alerts_week} alertas
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Diagnóstico de Activos (Sección Derecha) */}
        <div className="space-y-6 flex flex-col justify-between">
          
          {/* Distribución Operacional de Hardware (Donut) */}
          <div className="bg-[#1E2640] p-6 rounded-3xl border border-[#1E2640] h-[225px] flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wide">Distribución Operacional de Hardware</h4>
                <p className="text-[9px] text-slate-400 mt-0.5">Estado operacional del inventario asignado a su cuenta.</p>
              </div>
              <HardDrive className="h-4.5 w-4.5 text-[#D4AF37]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deviceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={45}
                      paddingAngle={5}
                      dataKey="count"
                    >
                      {deviceData.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0B0F19', border: '1px solid #1E2640', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Leyenda a la derecha */}
              <div className="space-y-2 text-[10px] text-slate-400">
                {deviceData.map((d: any, index: number) => (
                  <div key={index} className="flex items-center justify-between border-b border-[#0B0F19]/25 pb-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="font-mono text-[9px]">{d.status}</span>
                    </div>
                    <span className="font-bold text-white">{d.count} u.</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Carga Histórica de Incidentes (Area Chart) */}
          <div className="bg-[#1E2640] p-6 rounded-3xl border border-[#1E2640] h-[225px] flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wide">Carga Histórica de Incidentes</h4>
              <p className="text-[9px] text-slate-400 mt-0.5">Volumen diario de incidentes críticos generados dentro de su grupo.</p>
            </div>

            <div className="h-32 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={incidentHistory} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncident" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF1744" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#FF1744" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0B0F19/50" vertical={false} />
                  <XAxis dataKey="name" stroke="#5E6A8A" fontSize={9} tickLine={false} />
                  <YAxis stroke="#5E6A8A" fontSize={8} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0B0F19', border: '1px solid #1E2640', borderRadius: '8px' }}
                    labelStyle={{ color: '#94A3B8', fontSize: '9px' }}
                  />
                  <Area type="monotone" dataKey="alertas" stroke="#FF1744" strokeWidth={2} fillOpacity={1} fill="url(#colorIncident)" name="Incidentes" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
export default ClientDashboard;
