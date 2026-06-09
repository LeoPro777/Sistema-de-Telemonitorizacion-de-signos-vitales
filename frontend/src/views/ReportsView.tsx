import React, { useState } from 'react';
import { 
  Calendar, User, ArrowRight, ArrowLeft, 
  Printer, Download, TrendingUp, Activity, 
  Cpu, AlertCircle, Check
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import toast from 'react-hot-toast';


interface MockPatient {
  id: string;
  name: string;
  rut: string;
  age: number;
  condition: string;
}

export const ReportsView: React.FC = () => {
  // Estado del Wizard: 1 = Selector de Tipo, 2 = Parámetros, 3 = Previsualización & Exportación
  const [step, setStep] = useState<number>(1);
  const [reportType, setReportType] = useState<'CLINICAL' | 'MANAGEMENT'>('CLINICAL');
  
  // Parámetros
  const [startDate, setStartDate] = useState<string>('2026-05-01');
  const [endDate, setEndDate] = useState<string>('2026-05-30');
  const [patientQuery, setPatientQuery] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<MockPatient | null>(null);
  const [showPatientSuggestions, setShowPatientSuggestions] = useState<boolean>(false);
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Lista de Pacientes Semilla para Autocompletado
  const mockPatients: MockPatient[] = [
    { id: "P001", name: "Juan Pérez Astudillo", rut: "V-15340281", age: 67, condition: "Insuficiencia Cardíaca Congestiva" },
    { id: "P002", name: "María Loreto González", rut: "V-9872104", age: 72, condition: "Hipertensión Arterial Severa" },
    { id: "P003", name: "Carlos Muñoz Troncoso", rut: "V-12443902", age: 58, condition: "Monitoreo Post-Operatorio" },
    { id: "P004", name: "Sofía Tapia Venegas", rut: "V-18239544", age: 64, condition: "EPOC e Hipoxia Crónica" },
    { id: "P005", name: "Diego Astudillo Valenzuela", rut: "V-14112563", age: 49, condition: "Diabetes Mellitus Tipo II" }
  ];

  const filteredPatients = mockPatients.filter(p => 
    p.name.toLowerCase().includes(patientQuery.toLowerCase()) ||
    p.rut.includes(patientQuery)
  );

  // Datos de Telemetría Biométrica Semilla para Recharts (Caso CLINICAL)
  const [clinicalData] = useState([
    { timestamp: '01 May', bpm: 72, spo2: 95, temp: 36.5 },
    { timestamp: '05 May', bpm: 78, spo2: 94, temp: 36.8 },
    { timestamp: '10 May', bpm: 85, spo2: 93, temp: 37.2 },
    { timestamp: '15 May', bpm: 96, spo2: 90, temp: 38.1 }, // Evento Crítico
    { timestamp: '20 May', bpm: 75, spo2: 96, temp: 36.6 },
    { timestamp: '25 May', bpm: 70, spo2: 97, temp: 36.4 },
    { timestamp: '30 May', bpm: 71, spo2: 96, temp: 36.5 }
  ]);

  // Datos de Infraestructura IoT Semilla (Caso MANAGEMENT)
  const [managementData] = useState([
    { date: 'Semana 1', packets: 42000, alerts: 14, latency: 110 },
    { date: 'Semana 2', packets: 51000, alerts: 8, latency: 98 },
    { date: 'Semana 3', packets: 68000, alerts: 25, latency: 125 }, // Alta carga
    { date: 'Semana 4', packets: 59000, alerts: 10, latency: 105 }
  ]);

  const handlePatientSelect = (p: MockPatient) => {
    setSelectedPatient(p);
    setPatientQuery(p.name);
    setShowPatientSuggestions(false);
    toast.success(`Paciente seleccionado: ${p.name}`);
  };

  const handleProcess = () => {
    if (reportType === 'CLINICAL' && !selectedPatient) {
      toast.error('Debe seleccionar un paciente para el Reporte Clínico.');
      return;
    }
    
    setIsProcessing(true);
    // Simular procesamiento asíncrono
    setTimeout(() => {
      setIsProcessing(false);
      setStep(3);
      toast.success('Reporte compilado y pre-calculado con éxito.');
    }, 1200);
  };

  const handleExportPDF = () => {
    toast.success('Descargando expediente PDF compilado por AURA Doc Generator...');
    // Simular descarga de PDF
    const link = document.createElement('a');
    link.href = '#';
    toast.success('Servicio de Almacenamiento en Nube: PDF descargado.');
  };

  const handleExportCSV = () => {
    toast.success('Generando archivo CSV estructurado...');
    let csvContent = "";
    
    if (reportType === 'CLINICAL') {
      csvContent = "Sello de Tiempo,Frecuencia Cardiaca (BPM),Saturacion Oxigeno (SpO2 %),Temperatura (C)\n" +
        clinicalData.map(d => `${d.timestamp},${d.bpm},${d.spo2},${d.temp}`).join("\n");
    } else {
      csvContent = "Periodo,Paquetes IoT Procesados,Alertas Registradas,Latencia Red (ms)\n" +
        managementData.map(d => `${d.date},${d.packets},${d.alerts},${d.latency}`).join("\n");
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute("download", `aura_reporte_${reportType.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('Archivo CSV descargado con éxito.');
  };

  return (
    <div className="space-y-6 font-mono relative max-w-5xl mx-auto">
      
      {/* Cabecera superior */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] text-[#D4AF37] tracking-[0.2em] font-bold uppercase block mb-1">
            MÓDULO 13: MOTOR DE REPORTES Y ANALÍTICA DE DATOS
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Consola de Reportes</h2>
          <p className="text-xs text-slate-400 mt-1">
            Asistente estructurado para la generación de reportes clínicos biométricos y auditoría de rendimiento de red.
          </p>
        </div>

        {/* Indicador visual de Pasos (Wizard Indicators) */}
        <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-500 uppercase self-start md:self-auto">
          <span className={`px-2 py-1 rounded border transition-all ${step === 1 ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5' : 'border-[#1E2640] text-slate-500'}`}>1. Tipo</span>
          <span className="text-slate-700">/</span>
          <span className={`px-2 py-1 rounded border transition-all ${step === 2 ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5' : 'border-[#1E2640] text-slate-500'}`}>2. Filtros</span>
          <span className="text-slate-700">/</span>
          <span className={`px-2 py-1 rounded border transition-all ${step === 3 ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5' : 'border-[#1E2640] text-slate-500'}`}>3. Lienzo</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PASO 1: SELECCIÓN DEL TIPO DE REPORTE */}
      {/* ======================================================== */}
      {step === 1 && (
        <div className="bg-glass rounded-3xl border border-[#1E2640] p-8 space-y-6 max-w-2xl mx-auto">
          <div className="text-center space-y-2">
            <h3 className="text-base font-extrabold text-slate-200 uppercase">Seleccione el Tipo de Reporte</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              AURA ofrece dos modalidades de análisis: clínico personalizado o gestión operativa de dispositivos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            
            {/* Opción 1: CLINICAL */}
            <div 
              onClick={() => setReportType('CLINICAL')}
              className={`p-6 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-4 hover:border-[#D4AF37]/60 group relative overflow-hidden ${
                reportType === 'CLINICAL' 
                  ? 'bg-[#1E2640]/40 border-[#D4AF37] shadow-lg shadow-[#D4AF37]/5' 
                  : 'bg-black/20 border-[#1E2640]'
              }`}
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#D4AF37]/5 rounded-full blur-xl pointer-events-none group-hover:bg-[#D4AF37]/10 transition-all" />
              <div className="space-y-2">
                <div className="h-10 w-10 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/25 rounded-xl flex items-center justify-center">
                  <Activity className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-200 group-hover:text-[#D4AF37] transition-colors">Reporte Clínico</h4>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Curvas continuas de pulso, SpO2 y temperatura corporal de pacientes específicos. Diseñado para cardiólogos y médicos tratantes.
                </p>
              </div>
              <div className="flex items-center text-[9px] font-bold text-[#D4AF37] pt-2">
                <span>SELECCIONAR</span>
                <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Opción 2: MANAGEMENT */}
            <div 
              onClick={() => setReportType('MANAGEMENT')}
              className={`p-6 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-4 hover:border-[#D4AF37]/60 group relative overflow-hidden ${
                reportType === 'MANAGEMENT' 
                  ? 'bg-[#1E2640]/40 border-[#D4AF37] shadow-lg shadow-[#D4AF37]/5' 
                  : 'bg-black/20 border-[#1E2640]'
              }`}
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#D4AF37]/5 rounded-full blur-xl pointer-events-none group-hover:bg-[#D4AF37]/10 transition-all" />
              <div className="space-y-2">
                <div className="h-10 w-10 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/25 rounded-xl flex items-center justify-center">
                  <Cpu className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-200 group-hover:text-[#D4AF37] transition-colors">Reporte de Gestión</h4>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Estadísticas de hardware, rendimiento de red, latencia promedio del ESP32, alertas críticas procesadas y volúmenes de telemetría.
                </p>
              </div>
              <div className="flex items-center text-[9px] font-bold text-[#D4AF37] pt-2">
                <span>SELECCIONAR</span>
                <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

          </div>

          <div className="flex justify-end pt-4 border-t border-[#1E2640]/50">
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-extrabold text-[10px] rounded-xl transition-all uppercase tracking-wider flex items-center space-x-2 shadow-md shadow-[#D4AF37]/10"
            >
              <span>Siguiente Paso</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PASO 2: CONFIGURACIÓN DE PARÁMETROS */}
      {/* ======================================================== */}
      {step === 2 && (
        <div className="bg-glass rounded-3xl border border-[#1E2640] p-8 space-y-6 max-w-2xl mx-auto relative">
          
          <div className="text-center space-y-2">
            <h3 className="text-base font-extrabold text-slate-200 uppercase">
              Configurar Filtros del Reporte ({reportType})
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Establezca la ventana temporal de auditoría y los sujetos de estudio enlazados.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            
            {/* Fechas de Muestreo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-bold uppercase block">Fecha Inicial</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl text-xs focus:border-[#D4AF37] outline-none text-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 font-bold uppercase block">Fecha Final</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl text-xs focus:border-[#D4AF37] outline-none text-slate-300"
                  />
                </div>
              </div>
            </div>

            {/* Input Autocompletado del Paciente (Solo para Clínico) */}
            {reportType === 'CLINICAL' && (
              <div className="space-y-1 relative">
                <label className="text-[9px] text-slate-500 font-bold uppercase block">Buscador de Pacientes (Type-ahead)</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={patientQuery}
                    onChange={(e) => {
                      setPatientQuery(e.target.value);
                      setShowPatientSuggestions(true);
                      if (selectedPatient && e.target.value !== selectedPatient.name) {
                        setSelectedPatient(null);
                      }
                    }}
                    onFocus={() => setShowPatientSuggestions(true)}
                    placeholder="Escriba nombre o Cédula del paciente..."
                    className={`w-full pl-10 pr-10 py-2.5 bg-[#0B0F19] border rounded-xl text-xs outline-none transition-all ${
                      selectedPatient 
                        ? 'border-emerald-500 focus:border-emerald-500 text-emerald-400' 
                        : 'border-[#1E2640] focus:border-[#D4AF37] text-slate-300'
                    }`}
                  />
                  {selectedPatient && (
                    <div className="absolute right-3.5 top-2.5 p-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>

                {/* Dropdown de Sugerencias */}
                {showPatientSuggestions && patientQuery.trim().length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-[#0F1420] border border-[#1E2640] rounded-2xl overflow-hidden z-40 max-h-56 overflow-y-auto shadow-2xl">
                    {filteredPatients.length === 0 ? (
                      <div className="p-4 text-center text-[10px] text-slate-600 uppercase font-bold">
                        Ningún paciente coincide
                      </div>
                    ) : (
                      filteredPatients.map(p => (
                        <div
                          key={p.id}
                          onClick={() => handlePatientSelect(p)}
                          className="p-3 hover:bg-[#1E2640]/55 cursor-pointer border-b border-[#1E2640]/30 transition-all text-left flex justify-between items-center"
                        >
                          <div>
                            <strong className="text-xs text-slate-200 block">{p.name}</strong>
                            <span className="text-[9px] text-slate-500">Cédula: {p.rut} — Edad: {p.age} años</span>
                          </div>
                          <span className="text-[9px] text-[#D4AF37] font-semibold bg-[#D4AF37]/5 px-2 py-0.5 rounded border border-[#D4AF37]/15">
                            {p.id}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Detalle del paciente seleccionado */}
            {reportType === 'CLINICAL' && selectedPatient && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl flex items-start space-x-3 text-xs leading-normal animate-in fade-in duration-200">
                <AlertCircle className="h-4.5 w-4.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <span className="text-[9px] text-emerald-400 font-bold uppercase block">Ficha Clínica Asignada</span>
                  <strong className="text-slate-200">{selectedPatient.name} ({selectedPatient.age} años)</strong>
                  <span className="text-slate-400 block font-sans">
                    Diagnóstico actual: {selectedPatient.condition}
                  </span>
                </div>
              </div>
            )}

            {/* Directiva de red en caso de gestión */}
            {reportType === 'MANAGEMENT' && (
              <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-2xl flex items-start space-x-3 text-xs leading-normal">
                <AlertCircle className="h-4.5 w-4.5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-1 font-sans">
                  <span className="text-[9px] text-blue-400 font-bold uppercase block font-mono">Infraestructura General</span>
                  <strong className="text-slate-200 font-mono">Consola Global de Equipos</strong>
                  <span className="text-slate-400 block">
                    Este reporte compila la actividad de los {mockPatients.length} pacientes activos y los {mockPatients.length} equipos AURA-ESP32 vinculados en la red clínica.
                  </span>
                </div>
              </div>
            )}

          </div>

          {/* Botones de Control */}
          <div className="flex items-center justify-between pt-6 border-t border-[#1E2640]/50">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2.5 bg-black/25 text-slate-400 hover:text-slate-200 border border-[#1E2640] font-extrabold text-[10px] rounded-xl transition-all uppercase tracking-wider flex items-center space-x-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Atrás</span>
            </button>

            <button
              onClick={handleProcess}
              disabled={isProcessing}
              className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-extrabold text-[10px] rounded-xl transition-all uppercase tracking-wider flex items-center space-x-2 shadow-md shadow-[#D4AF37]/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <span>Procesar Analítica</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* PASO 3: PREVISUALIZACIÓN DE REPORTE Y EXPORTACIÓN */}
      {/* ======================================================== */}
      {step === 3 && (
        <div className="space-y-6">
          
          {/* Controles Flotantes Superiores */}
          <div className="bg-[#0F1420] border border-[#1E2640] p-4 rounded-3xl flex flex-wrap gap-4 items-center justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2.5 bg-black/25 text-slate-400 hover:text-slate-200 border border-[#1E2640] font-extrabold text-[10px] rounded-xl transition-all uppercase tracking-wider flex items-center space-x-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Modificar Filtros</span>
            </button>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleExportCSV}
                className="px-4 py-2.5 bg-[#1E2640] hover:bg-[#D4AF37] hover:text-black text-[#D4AF37] border border-[#D4AF37]/25 font-extrabold text-[10px] rounded-xl transition-all uppercase tracking-wider flex items-center space-x-1.5"
              >
                <Download className="h-4 w-4" />
                <span>Exportar CSV</span>
              </button>

              <button
                onClick={handleExportPDF}
                className="px-4 py-2.5 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-extrabold text-[10px] rounded-xl transition-all uppercase tracking-wider flex items-center space-x-1.5 shadow-md shadow-[#D4AF37]/10"
              >
                <Printer className="h-4 w-4" />
                <span>Imprimir / PDF</span>
              </button>
            </div>
          </div>

          {/* LIENZO INTERACTIVO: HOJA FÍSICA ESTRUCTURADA DE PREVISUALIZACIÓN */}
          <div className="bg-[#0A0E17] border-2 border-[#1E2640] shadow-2xl rounded-3xl overflow-hidden p-6 md:p-10 relative">
            
            {/* Sello de agua premium AURA */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#D4AF37]/2 text-[10vw] font-black uppercase pointer-events-none select-none tracking-widest leading-none">
              AURA
            </div>

            {/* Cabecera del Documento Clínico */}
            <div className="border-b border-[#1E2640]/80 pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-1">
                <span className="text-[10px] text-[#D4AF37] font-bold tracking-widest block uppercase">
                  SISTEMA DE TELEMONITORIZACIÓN AURA
                </span>
                <h1 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-tight">
                  Expediente de Monitoreo Clínico
                </h1>
                <p className="text-[9px] text-slate-500 font-sans uppercase">
                  Generado automáticamente • {new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' })}
                </p>
              </div>

              {/* Timbres de Auditoría */}
              <div className="flex gap-3">
                <div className="border border-[#1E2640] p-2 rounded-xl text-center min-w-[70px] bg-black/25">
                  <span className="text-[7px] text-slate-600 block uppercase font-bold">Audit Code</span>
                  <span className="text-[9px] text-[#D4AF37] font-bold font-mono">AURA-2605</span>
                </div>
                <div className="border border-emerald-500/25 bg-emerald-500/5 p-2 rounded-xl text-center min-w-[70px] flex flex-col justify-center">
                  <span className="text-[7px] text-emerald-400 block uppercase font-bold">Status</span>
                  <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-wider">VERIFIED</span>
                </div>
              </div>
            </div>

            {/* Información Técnica y Metadatos de la Muestra */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/25 border border-[#1E2640]/55 p-6 rounded-2xl mb-8 text-xs leading-relaxed">
              
              <div className="space-y-1 font-sans">
                <span className="text-[9px] text-slate-500 font-bold uppercase font-mono block">Especificación de Muestra</span>
                {reportType === 'CLINICAL' && selectedPatient ? (
                  <>
                    <p className="text-slate-300 font-mono"><strong className="text-slate-100">Paciente:</strong> {selectedPatient.name}</p>
                    <p className="text-slate-300 font-mono"><strong className="text-slate-100">Cédula Identidad:</strong> {selectedPatient.rut}</p>
                    <p className="text-slate-300 font-mono"><strong className="text-slate-100">Fisiopatología:</strong> {selectedPatient.condition}</p>
                  </>
                ) : (
                  <>
                    <p className="text-slate-300 font-mono"><strong className="text-slate-100">Tipo de Muestra:</strong> Auditoría de Infraestructura y Redes</p>
                    <p className="text-slate-300 font-mono"><strong className="text-slate-100">Equipos Registrados:</strong> {mockPatients.length} Dispositivos AURA-ESP32</p>
                    <p className="text-slate-300 font-mono"><strong className="text-slate-100">Gobernanza Local:</strong> MongoDB Atlas & Redis Cache</p>
                  </>
                )}
              </div>

              <div className="space-y-1 font-sans">
                <span className="text-[9px] text-slate-500 font-bold uppercase font-mono block">Detalles de Operación</span>
                <p className="text-slate-300 font-mono"><strong className="text-slate-100">Rango Inicial:</strong> {startDate}</p>
                <p className="text-slate-300 font-mono"><strong className="text-slate-100">Rango Final:</strong> {endDate}</p>
                <p className="text-slate-300 font-mono"><strong className="text-slate-100">Operador:</strong> dr_lopez (Médico Coordinador)</p>
              </div>

            </div>

            {/* SECCIÓN ANALÍTICA: GRÁFICOS Y MÉTRICAS */}
            <div className="space-y-8">
              
              {reportType === 'CLINICAL' ? (
                <>
                  {/* Curvas Clínicas Multilínea con Recharts */}
                  <div className="space-y-3">
                    <h3 className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest flex items-center space-x-1.5">
                      <TrendingUp className="h-4 w-4" />
                      <span>Gráfica de Tendencia Biométrica Compilada</span>
                    </h3>
                    
                    {/* Gráfico Recharts con Estilo Premium */}
                    <div className="h-80 w-full bg-black/45 border border-[#1E2640] rounded-2xl p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={clinicalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1E2640" />
                          <XAxis dataKey="timestamp" stroke="#64748B" style={{ fontSize: 9, fontFamily: 'monospace' }} />
                          <YAxis stroke="#64748B" style={{ fontSize: 9, fontFamily: 'monospace' }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0F1420', border: '1px solid #1E2640', borderRadius: '12px' }}
                            labelStyle={{ fontSize: 10, color: '#D4AF37', fontWeight: 'bold' }}
                            itemStyle={{ fontSize: 10, color: '#E2E8F0' }}
                          />
                          <Legend wrapperStyle={{ fontSize: 9, paddingTop: 10 }} />
                          <Line 
                            name="Pulso (BPM)" 
                            type="monotone" 
                            dataKey="bpm" 
                            stroke="#FF1744" 
                            strokeWidth={2.5}
                            activeDot={{ r: 8 }} 
                          />
                          <Line 
                            name="SpO2 (%)" 
                            type="monotone" 
                            dataKey="spo2" 
                            stroke="#38BDF8" 
                            strokeWidth={2.5}
                          />
                          <Line 
                            name="Temperatura (°C)" 
                            type="monotone" 
                            dataKey="temp" 
                            stroke="#10B981" 
                            strokeWidth={2.5}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Tabla tabular estructurada */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest">
                      Detalle Tabular de Signos Vitales
                    </h3>
                    <div className="border border-[#1E2640] rounded-2xl overflow-hidden">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-[#0F1420] border-b border-[#1E2640] text-slate-400 font-bold uppercase">
                            <th className="py-2.5 px-4">Sello Temporal</th>
                            <th className="py-2.5 px-4 text-center">BPM</th>
                            <th className="py-2.5 px-4 text-center">SpO2 (%)</th>
                            <th className="py-2.5 px-4 text-center">Temperatura (°C)</th>
                            <th className="py-2.5 px-4 text-right">Diagnóstico Parcial</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1E2640]/40 text-slate-300">
                          {clinicalData.map((d, index) => (
                            <tr key={index} className="hover:bg-[#1E2640]/10">
                              <td className="py-2.5 px-4">{d.timestamp}</td>
                              <td className="py-2.5 px-4 text-center font-bold">{d.bpm}</td>
                              <td className={`py-2.5 px-4 text-center font-bold ${d.spo2 < 92 ? 'text-[#FF1744]' : 'text-slate-300'}`}>
                                {d.spo2}%
                              </td>
                              <td className="py-2.5 px-4 text-center font-bold">{d.temp}°C</td>
                              <td className="py-2.5 px-4 text-right">
                                {d.bpm > 95 || d.spo2 < 92 || d.temp > 38.0 ? (
                                  <span className="text-[9px] px-2 py-0.5 rounded bg-[#FF1744]/15 border border-[#FF1744]/25 text-[#FF1744] font-extrabold uppercase animate-pulse">
                                    ALERTA CRÍTICA
                                  </span>
                                ) : (
                                  <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold uppercase">
                                    Estable
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Métricas e Infraestructura con Recharts AreaChart */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    <div className="space-y-3">
                      <h3 className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest">
                        Volumen de Paquetes Procesados (Por semana)
                      </h3>
                      
                      <div className="h-64 w-full bg-black/45 border border-[#1E2640] rounded-2xl p-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={managementData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorPackets" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E2640" />
                            <XAxis dataKey="date" stroke="#64748B" style={{ fontSize: 9, fontFamily: 'monospace' }} />
                            <YAxis stroke="#64748B" style={{ fontSize: 9, fontFamily: 'monospace' }} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#0F1420', border: '1px solid #1E2640', borderRadius: '12px' }}
                              itemStyle={{ fontSize: 10, color: '#E2E8F0' }}
                            />
                            <Area 
                              name="Paquetes" 
                              type="monotone" 
                              dataKey="packets" 
                              stroke="#D4AF37" 
                              fillOpacity={1} 
                              fill="url(#colorPackets)" 
                              strokeWidth={2.5}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest">
                        Estadísticas de Alarmas Generadas
                      </h3>
                      
                      <div className="h-64 w-full bg-black/45 border border-[#1E2640] rounded-2xl p-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={managementData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E2640" />
                            <XAxis dataKey="date" stroke="#64748B" style={{ fontSize: 9, fontFamily: 'monospace' }} />
                            <YAxis stroke="#64748B" style={{ fontSize: 9, fontFamily: 'monospace' }} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#0F1420', border: '1px solid #1E2640', borderRadius: '12px' }}
                              itemStyle={{ fontSize: 10, color: '#E2E8F0' }}
                            />
                            <Line 
                              name="Alarmas" 
                              type="monotone" 
                              dataKey="alerts" 
                              stroke="#FF1744" 
                              strokeWidth={2.5}
                            />
                            <Line 
                              name="Latencia (ms)" 
                              type="monotone" 
                              dataKey="latency" 
                              stroke="#38BDF8" 
                              strokeWidth={2.5}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                  </div>

                  {/* KPI Grid para Gestión */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                    
                    <div className="bg-[#0F1420] border border-[#1E2640] p-4 rounded-2xl text-center space-y-1">
                      <span className="text-[8px] text-slate-500 block uppercase font-bold">Total de Equipos</span>
                      <strong className="text-base text-[#D4AF37] block font-mono">12 Activos</strong>
                    </div>

                    <div className="bg-[#0F1420] border border-[#1E2640] p-4 rounded-2xl text-center space-y-1">
                      <span className="text-[8px] text-slate-500 block uppercase font-bold">Puntos de Telemetría</span>
                      <strong className="text-base text-[#D4AF37] block font-mono">220,000 p/d</strong>
                    </div>

                    <div className="bg-[#0F1420] border border-[#1E2640] p-4 rounded-2xl text-center space-y-1">
                      <span className="text-[8px] text-slate-500 block uppercase font-bold">Latencia de Red Promedio</span>
                      <strong className="text-base text-emerald-400 block font-mono">107 ms</strong>
                    </div>

                    <div className="bg-[#0F1420] border border-[#1E2640] p-4 rounded-2xl text-center space-y-1">
                      <span className="text-[8px] text-slate-500 block uppercase font-bold">Alertas Sanitarias</span>
                      <strong className="text-base text-rose-500 block font-mono">57 Registros</strong>
                    </div>

                  </div>
                </>
              )}

            </div>

            {/* Timbre y Firma Digital al final de la Hoja Física */}
            <div className="border-t border-[#1E2640]/80 mt-10 pt-8 flex flex-col md:flex-row justify-between items-center text-[10px] text-slate-500 font-sans gap-6">
              
              <div className="text-center md:text-left space-y-0.5">
                <p className="uppercase font-bold text-[#D4AF37]/80 font-mono">Firma Digital Registrada</p>
                <p className="font-mono text-[9px] text-slate-600 select-all">SHA-256: 4e9c7a2b10e49c5faa4cE1922f7ab32e10e49c5f</p>
              </div>

              <div className="text-center md:text-right space-y-0.5">
                <p className="font-semibold text-slate-300 uppercase">Dr. Pedro Ramírez L.</p>
                <p className="text-[9px] text-slate-600">Director de Asistencia Médica, AURA</p>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default ReportsView;
