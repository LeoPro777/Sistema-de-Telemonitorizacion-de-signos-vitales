import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, ShieldAlert, Heart, Activity, Thermometer, 
  Smartphone, Battery, Wifi, ShieldCheck, CheckCircle2 
} from 'lucide-react';

interface ClientDashboardProps {
  kpis: any;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ kpis }) => {
  const navigate = useNavigate();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const criticalPatients = kpis.critical_patients_details || [];

  // Mantener la selección sincronizada con el estado de los pacientes críticos
  useEffect(() => {
    if (criticalPatients.length > 0) {
      const exists = criticalPatients.some((p: any) => p.id === selectedPatientId);
      if (!exists) {
        setSelectedPatientId(criticalPatients[0].id);
      }
    } else {
      setSelectedPatientId(null);
    }
  }, [kpis, criticalPatients, selectedPatientId]);

  // Obtener detalles del paciente crítico seleccionado
  const selectedPatient = criticalPatients.find((p: any) => p.id === selectedPatientId);

  // Estilo dinámico de telemetría según el status del enum
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CRITICAL': return 'text-[#FF1744]';
      case 'WARNING': return 'text-[#FBBF24]';
      default: return 'text-emerald-400';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'CRITICAL': return 'bg-[#FF1744]/10 border-[#FF1744]/30';
      case 'WARNING': return 'bg-[#FBBF24]/10 border-[#FBBF24]/30';
      default: return 'bg-emerald-500/5 border-emerald-500/15';
    }
  };

  const getSignalText = (dbm: number) => {
    if (dbm >= -60) return { text: 'Excelente', color: 'text-emerald-400' };
    if (dbm >= -75) return { text: 'Buena', color: 'text-yellow-400' };
    return { text: 'Deficiente', color: 'text-red-400' };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Zona Superior: Tarjetas de KPIs (Grid de 2 columnas) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Pacientes Financiados */}
        <div className="bg-[#1E2640] p-6 rounded-3xl border border-[#1E2640] hover:border-[#D4AF37]/35 transition-all flex flex-col justify-between h-40 group shadow-lg">
          <div className="flex justify-between items-start">
            <div className="h-12 w-12 bg-[#0B0F19] rounded-2xl flex items-center justify-center text-cyan-400 border border-cyan-500/25 group-hover:scale-110 transition-transform">
              <Users className="h-5 w-5" />
            </div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">FINANCIACIÓN</span>
          </div>
          <div className="my-2">
            <span className="text-4xl font-extrabold tracking-tight text-white block">
              {kpis.client_patients || kpis.funded_patients_count || 0}
            </span>
            <span className="text-xs font-semibold text-slate-300 block mt-0.5">
              Pacientes Financiados
            </span>
          </div>
        </div>

        {/* Pacientes Críticos Actuales */}
        <div className={`p-6 rounded-3xl border transition-all flex flex-col justify-between h-40 group shadow-lg ${
          (kpis.critical_patients_count || 0) > 0 
            ? 'border-[#FF1744]/40 bg-gradient-to-br from-[#FF1744]/10 to-transparent shadow-[0_0_20px_rgba(255,23,68,0.15)] hover:border-[#FF1744]/60' 
            : 'bg-[#1E2640] border-[#1E2640] hover:border-[#D4AF37]/35'
        }`}>
          <div className="flex justify-between items-start">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border ${
              (kpis.critical_patients_count || 0) > 0 
                ? 'bg-[#FF1744]/20 border-[#FF1744]/40 text-[#FF1744] group-hover:scale-110 transition-transform' 
                : 'bg-[#0B0F19] border-[#1E2640] text-slate-400 group-hover:scale-110 transition-transform'
            }`}>
              <ShieldAlert className={`h-5 w-5 ${(kpis.critical_patients_count || 0) > 0 ? 'animate-bounce' : ''}`} />
            </div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">ESTADO REAL</span>
          </div>
          <div className="my-2">
            <span className={`text-4xl font-extrabold tracking-tight block ${
              (kpis.critical_patients_count || 0) > 0 ? 'text-[#FF1744] text-glow-red animate-pulse' : 'text-white'
            }`}>
              {kpis.critical_patients_count || 0}
            </span>
            <span className="text-xs font-semibold text-slate-300 block mt-0.5">
              Pacientes Críticos Activos
            </span>
          </div>
        </div>

      </div>

      {/* 2. Área Central (Sección de Pacientes Críticos y su Dispositivo) */}
      {criticalPatients.length === 0 ? (
        <div className="bg-[#1E2640] p-12 rounded-3xl border border-[#1E2640] shadow-xl flex flex-col items-center justify-center text-center space-y-4">
          <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 border border-emerald-500/25">
            <ShieldCheck className="h-8 w-8 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Todos los Pacientes Estables</h3>
            <p className="text-sm text-slate-400 mt-2 max-w-md">
              Actualmente no se registran pacientes con alertas críticas activas dentro de su grupo financiero.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          
          {/* Panel Reducido de Telemetría (60% / 6 columnas) */}
          <div className="bg-[#1E2640] p-6 rounded-3xl border border-[#1E2640] lg:col-span-6 flex flex-col shadow-xl">
            <div className="mb-6">
              <span className="text-[10px] text-[#FF1744] tracking-[0.2em] font-bold uppercase block mb-1">MONITOREO DE ALERTA</span>
              <h3 className="text-lg font-bold text-white">Consola de Pacientes Críticos</h3>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[30rem] pr-2 custom-scrollbar">
              {criticalPatients.map((patient: any) => {
                const telemetry = patient.last_telemetry_cache || {};
                const isSelected = patient.id === selectedPatientId;
                
                return (
                  <div
                    key={patient.id}
                    onClick={() => setSelectedPatientId(patient.id)}
                    className={`p-4 rounded-2xl border cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all duration-200 hover:scale-[1.01] ${
                      isSelected 
                        ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_12px_rgba(212,175,55,0.08)]' 
                        : 'border-[#FF1744]/25 bg-[#FF1744]/5 hover:border-[#FF1744]/45'
                    }`}
                  >
                    {/* Ficha del Paciente */}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="h-2 w-2 rounded-full bg-[#FF1744] animate-ping" />
                        <h4 className="text-sm font-bold text-white uppercase tracking-wide">
                          {patient.first_name} {patient.last_name}
                        </h4>
                      </div>
                      <div className="flex items-center space-x-2 mt-1.5 text-xs text-slate-400">
                        <span>Ficha: <strong className="text-slate-300 font-mono">{patient.medical_record_id}</strong></span>
                        <span>•</span>
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/patients/${patient.id}`);
                          }}
                          className="text-[#D4AF37] hover:underline cursor-pointer font-semibold"
                        >
                          Ver Expediente Completo
                        </span>
                      </div>
                    </div>

                    {/* Lecturas en tiempo real */}
                    <div className="grid grid-cols-3 gap-3 w-full sm:w-auto">
                      
                      {/* Pulso */}
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
          </div>

          {/* Tarjeta de Datos Relevantes del Dispositivo IoT (40% / 4 columnas) */}
          <div className="lg:col-span-4 flex flex-col">
            {selectedPatient ? (
              <div className="bg-[#1E2640] p-6 rounded-3xl border border-[#D4AF37]/20 shadow-xl flex-grow flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#D4AF37] tracking-[0.2em] font-bold uppercase">HARDWARE IoT</span>
                    <Smartphone className="h-5 w-5 text-[#D4AF37] animate-pulse" />
                  </div>
                  <h3 className="text-base font-bold text-white mt-2">Dispositivo del Paciente</h3>
                </div>

                {selectedPatient.device_info ? (
                  <div className="space-y-5 flex-grow justify-center flex flex-col">
                    
                    {/* Serial y MAC */}
                    <div className="grid grid-cols-2 gap-4 bg-[#0B0F19]/40 p-4 rounded-2xl border border-[#0B0F19]">
                      <div>
                        <span className="text-[9px] font-mono font-bold text-slate-500 block uppercase">Nro. de Serie</span>
                        <span className="text-xs font-mono font-semibold text-slate-100">{selectedPatient.device_info.serial_number || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono font-bold text-slate-500 block uppercase">Dirección MAC</span>
                        <span className="text-xs font-mono font-semibold text-slate-100">{selectedPatient.device_info.mac_address || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Batería */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center space-x-1.5 text-slate-400">
                          <Battery className="h-4.5 w-4.5 text-emerald-400" />
                          <span>Autonomía de Batería</span>
                        </div>
                        <span className="font-mono font-bold text-white">{selectedPatient.device_info.battery_percent}%</span>
                      </div>
                      <div className="w-full bg-[#0B0F19] h-2.5 rounded-full overflow-hidden border border-[#1E2640]">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            selectedPatient.device_info.battery_percent > 40 
                              ? 'bg-emerald-500' 
                              : selectedPatient.device_info.battery_percent > 15 
                              ? 'bg-yellow-500' 
                              : 'bg-red-500 animate-pulse'
                          }`}
                          style={{ width: `${selectedPatient.device_info.battery_percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Calidad de Red */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center space-x-1.5 text-slate-400">
                          <Wifi className="h-4.5 w-4.5 text-cyan-400" />
                          <span>Potencia de Enlace Inalámbrico</span>
                        </div>
                        <span className="font-mono font-bold text-white">{selectedPatient.device_info.signal_strength_dbm} dBm</span>
                      </div>
                      <div className="flex items-center justify-between bg-[#0B0F19]/40 px-4 py-2.5 rounded-xl border border-[#0B0F19] text-xs">
                        <span className="text-slate-400">Calidad de Conexión:</span>
                        <strong className={`font-semibold ${getSignalText(selectedPatient.device_info.signal_strength_dbm).color}`}>
                          {getSignalText(selectedPatient.device_info.signal_strength_dbm).text}
                        </strong>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="bg-[#0B0F19]/40 p-8 rounded-2xl border border-[#0B0F19] border-dashed text-center flex-grow flex flex-col justify-center items-center space-y-2">
                    <Smartphone className="h-8 w-8 text-slate-600" />
                    <span className="text-xs font-semibold text-slate-400">Hardware No Vinculado</span>
                    <p className="text-[11px] text-slate-500">
                      Este paciente crítico no tiene un microcontrolador asignado actualmente.
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t border-[#0B0F19]/30">
                  <span className="text-[9px] text-slate-500 font-mono uppercase block text-center">
                    Módulo de Telemetría IoT • AURA v1.0
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-[#1E2640] p-6 rounded-3xl border border-[#1E2640] shadow-xl flex-grow flex flex-col items-center justify-center text-center text-slate-500 text-xs">
                <CheckCircle2 className="h-10 w-10 text-slate-600 mb-3" />
                Selecciona un paciente crítico de la lista para inspeccionar el diagnóstico técnico de su dispositivo.
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

export default ClientDashboard;
