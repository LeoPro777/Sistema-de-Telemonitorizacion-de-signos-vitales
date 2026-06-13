import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BadgeCheck, Activity, Heart, Thermometer, ShieldAlert, Zap 
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import api from '../utils/api';

interface DoctorDashboardProps {
  kpis: any;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ kpis }) => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<any[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);

  // Cargar lista de pacientes asignados para triage activo
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoadingPatients(true);
        const res = await api.get('/patients', { params: { limit: 50 } });
        
        // Segregar y ordenar: los pacientes con alerta activa arriba
        const sorted = [...res.data.patients].sort((a: any, b: any) => {
          if (a.has_active_alert && !b.has_active_alert) return -1;
          if (!a.has_active_alert && b.has_active_alert) return 1;
          return 0;
        });
        setPatients(sorted);
        setLoadingPatients(false);
      } catch (err) {
        console.error('Error cargando lista de pacientes:', err);
        setLoadingPatients(false);
      }
    };
    fetchPatients();
  }, [kpis]);

  // Estilo dinámico de telemetría según el status del enum
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CRITICAL': return 'text-[#FF1744]';
      case 'WARNING': return 'text-[#FBBF24]';
      default: return 'text-[#00F2FE]';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'CRITICAL': return 'bg-[#FF1744]/10 border-[#FF1744]/30';
      case 'WARNING': return 'bg-[#FBBF24]/10 border-[#FBBF24]/30';
      default: return 'bg-[#00F2FE]/5 border-[#00F2FE]/15';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Zona Superior: Métricas de Impacto (Contadores Numéricos Masivos) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Pacientes Críticos Actuales */}
        <div className={`p-6 rounded-3xl border transition-all flex flex-col justify-between relative overflow-hidden h-40 ${
          (kpis.critical_patients_count || kpis.active_alerts) > 0 
            ? 'border-[#FF1744]/40 bg-gradient-to-br from-[#FF1744]/10 to-transparent shadow-[0_0_20px_rgba(255,23,68,0.15)]' 
            : 'bg-[#1E2640] border-[#1E2640]'
        }`}>
          <div className="flex justify-between items-start">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border ${
              (kpis.critical_patients_count || kpis.active_alerts) > 0 
                ? 'bg-[#FF1744]/20 border-[#FF1744]/40 text-[#FF1744]' 
                : 'bg-[#0B0F19] border-[#1E2640] text-slate-400'
            }`}>
              <ShieldAlert className={`h-5 w-5 ${(kpis.critical_patients_count || kpis.active_alerts) > 0 ? 'animate-bounce' : ''}`} />
            </div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">Real-Time</span>
          </div>
          <div className="my-2">
            <span className={`text-4xl font-extrabold tracking-tight block ${
              (kpis.critical_patients_count || kpis.active_alerts) > 0 ? 'text-[#FF1744] text-glow-red animate-pulse' : 'text-white'
            }`}>
              {kpis.critical_patients_count || kpis.active_alerts || 0}
            </span>
            <span className="text-xs font-semibold text-slate-300 block mt-0.5">
              Pacientes Críticos Actuales
            </span>
          </div>
        </div>

        {/* Alertas Atendidas en las Últimas 24h */}
        <div className="bg-[#1E2640] p-6 rounded-3xl border border-[#1E2640] hover:border-[#D4AF37]/30 transition-all flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div className="h-12 w-12 bg-[#0B0F19] rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">24 HORAS</span>
          </div>
          <div className="my-2">
            <span className="text-4xl font-extrabold tracking-tight text-white block">
              {kpis.resolved_today || 0}
            </span>
            <span className="text-xs font-semibold text-slate-300 block mt-0.5">
              Alertas Atendidas (Últimas 24h)
            </span>
          </div>
        </div>

        {/* Tasa de Estabilidad del Clúster de Pacientes */}
        <div className="bg-[#1E2640] p-6 rounded-3xl border border-[#1E2640] hover:border-[#D4AF37]/30 transition-all flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div className="h-12 w-12 bg-[#0B0F19] rounded-2xl flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/20">
              <Zap className="h-5 w-5 animate-pulse" />
            </div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">Eficiencia</span>
          </div>
          <div className="my-2">
            <span className="text-4xl font-extrabold tracking-tight text-white block">
              {kpis.stability_rate_percent !== undefined ? kpis.stability_rate_percent : 100}%
            </span>
            <span className="text-xs font-semibold text-slate-300 block mt-0.5">
              Estabilidad del Grupo de Pacientes
            </span>
          </div>
        </div>

      </div>

      {/* 2. Área Central (60% Consola de Tríage - 40% Analíticas de Guardia) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        
        {/* Consola de Tríage Activo (60% / 6 columnas) */}
        <div className="bg-[#1E2640] p-6 rounded-3xl border border-[#1E2640] lg:col-span-6 flex flex-col justify-between">
          <div className="mb-4">
            <span className="text-[10px] text-[#D4AF37] tracking-[0.2em] font-bold uppercase block mb-1">TRÍAGE DE GUARDIA</span>
            <h3 className="text-lg font-bold text-white">Consola de Tríage Activo</h3>
            <p className="text-xs text-slate-400 mt-1">Los pacientes con alertas de rango crítico se priorizan y parpadean al inicio de la consola.</p>
          </div>

          {loadingPatients ? (
            <div className="h-96 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400">Analizando telemetría de pacientes...</span>
            </div>
          ) : patients.length === 0 ? (
            <div className="h-96 flex flex-col items-center justify-center border border-dashed border-[#1E2640]/80 rounded-2xl bg-black/10">
              <span className="text-xs text-slate-500">No hay pacientes asignados actualmente en guardia.</span>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[30rem] pr-2 custom-scrollbar">
              {patients.map((patient) => {
                const telemetry = patient.last_telemetry_cache || {};
                const hasAlert = patient.has_active_alert;
                
                return (
                  <div
                    key={patient._id}
                    onClick={() => navigate(`/patients/${patient._id}`)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer hover:scale-[1.01] duration-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                      hasAlert 
                        ? 'border-[#FF1744]/40 bg-[#FF1744]/5 animate-pulse-crimson shadow-[0_0_12px_rgba(255,23,68,0.08)]' 
                        : 'border-[#0B0F19]/40 bg-[#0B0F19]/25 hover:border-[#D4AF37]/20'
                    }`}
                  >
                    {/* Ficha básica */}
                    <div>
                      <div className="flex items-center space-x-2">
                        {hasAlert && (
                          <span className="h-2 w-2 rounded-full bg-[#FF1744] animate-ping" />
                        )}
                        <h4 className="text-xs font-bold text-white uppercase tracking-wide">
                          {patient.first_name} {patient.last_name}
                        </h4>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#1E2640] text-slate-400 border border-[#0B0F19]">
                          {patient.medical_record_id}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Cédula: <strong className="text-slate-300">{patient.national_id}</strong>
                      </p>
                    </div>

                    {/* Ficha Biométrica */}
                    <div className="grid grid-cols-3 gap-4 w-full sm:w-auto">
                      
                      {/* Ritmo cardiaco */}
                      <div className={`p-2 rounded-xl border flex flex-col items-center min-w-[5.5rem] ${getStatusBg(telemetry.heart_rate?.status)}`}>
                        <div className="flex items-center space-x-1 mb-0.5 text-slate-400">
                          <Heart className="h-3 w-3 text-red-500" />
                          <span className="text-[9px] font-bold">Pulso</span>
                        </div>
                        <span className={`text-xs font-bold tracking-tight ${getStatusColor(telemetry.heart_rate?.status)}`}>
                          {telemetry.heart_rate?.value ? `${Math.round(telemetry.heart_rate.value)}` : '--'} <span className="text-[8px] text-slate-500 font-normal">bpm</span>
                        </span>
                      </div>

                      {/* Oxigenación */}
                      <div className={`p-2 rounded-xl border flex flex-col items-center min-w-[5.5rem] ${getStatusBg(telemetry.spo2?.status)}`}>
                        <div className="flex items-center space-x-1 mb-0.5 text-slate-400">
                          <Activity className="h-3 w-3 text-cyan-400" />
                          <span className="text-[9px] font-bold">SpO2</span>
                        </div>
                        <span className={`text-xs font-bold tracking-tight ${getStatusColor(telemetry.spo2?.status)}`}>
                          {telemetry.spo2?.value ? `${Math.round(telemetry.spo2.value)}` : '--'} <span className="text-[8px] text-slate-500 font-normal">%</span>
                        </span>
                      </div>

                      {/* Temperatura */}
                      <div className={`p-2 rounded-xl border flex flex-col items-center min-w-[5.5rem] ${getStatusBg(telemetry.temperature?.status)}`}>
                        <div className="flex items-center space-x-1 mb-0.5 text-slate-400">
                          <Thermometer className="h-3 w-3 text-amber-500" />
                          <span className="text-[9px] font-bold">Temp</span>
                        </div>
                        <span className={`text-xs font-bold tracking-tight ${getStatusColor(telemetry.temperature?.status)}`}>
                          {telemetry.temperature?.value ? `${parseFloat(telemetry.temperature.value).toFixed(1)}` : '--'} <span className="text-[8px] text-slate-500 font-normal">°C</span>
                        </span>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Suite Analítica de Guardia (40% / 4 columnas) */}
        <div className="lg:col-span-4 space-y-6 flex flex-col justify-between">
          
          {/* Gráfico 1: Matriz de Tendencias Biométricas Cruzadas */}
          <div className="bg-[#1E2640] p-6 rounded-3xl border border-[#1E2640] flex flex-col justify-between h-[230px]">
            <div>
              <h4 className="text-xs font-bold text-white">Tendencias Biométricas (Últimas 6h)</h4>
              <p className="text-[9px] text-slate-400 mt-0.5">Comportamiento fisiológico promedio del clúster de guardia.</p>
            </div>
            
            <div className="h-36 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={kpis.biometric_trends} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0B0F19/50" vertical={false} />
                  <XAxis dataKey="time" stroke="#5E6A8A" fontSize={9} tickLine={false} />
                  <YAxis yAxisId="hr" domain={[50, 120]} stroke="#FF1744" fontSize={8} tickLine={false} />
                  <YAxis yAxisId="spo2" orientation="right" domain={[90, 100]} stroke="#00F2FE" fontSize={8} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0B0F19', border: '1px solid #1E2640', borderRadius: '8px' }}
                    labelStyle={{ color: '#94A3B8', fontSize: '9px', fontWeight: 'bold' }}
                  />
                  <Line yAxisId="hr" type="monotone" dataKey="heart_rate" stroke="#FF1744" strokeWidth={2} dot={false} name="Pulso (bpm)" />
                  <Line yAxisId="spo2" type="monotone" dataKey="spo2" stroke="#00F2FE" strokeWidth={2} dot={false} name="SpO2 (%)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 2: Histograma de Distribución de Criticidad */}
          <div className="bg-[#1E2640] p-6 rounded-3xl border border-[#1E2640] flex flex-col justify-between h-[230px]">
            <div>
              <h4 className="text-xs font-bold text-white">Distribución de Criticidad</h4>
              <p className="text-[9px] text-slate-400 mt-0.5">Segmentación de telemetría de pacientes activos por grupo patológico.</p>
            </div>

            <div className="h-36 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kpis.criticality_distribution} margin={{ top: 10, right: 5, left: -30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0B0F19/50" vertical={false} />
                  <XAxis dataKey="group" stroke="#5E6A8A" fontSize={9} tickLine={false} />
                  <YAxis stroke="#5E6A8A" fontSize={8} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0B0F19', border: '1px solid #1E2640', borderRadius: '8px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', paddingTop: '5px' }} />
                  <Bar dataKey="NORMAL" stackId="status" fill="#10B981" name="Estable" />
                  <Bar dataKey="WARNING" stackId="status" fill="#FBBF24" name="Alerta" />
                  <Bar dataKey="CRITICAL" stackId="status" fill="#FF1744" name="Crítico" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
export default DoctorDashboard;
