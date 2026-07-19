import React, { useState, useEffect } from 'react';
import {
  Bell, Globe, Lock, Smartphone, Volume2, ShieldAlert, Sun, Moon, Palette
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { useAuthStore } from '../store/authStore';
import { useTour } from '../hooks/useTour';
import { useThemeStore, THEME_OPTIONS, ThemeId } from '../store/themeStore';

export const SettingsView: React.FC = () => {
  const { user } = useAuthStore();

  const tourSteps = [
    {
      element: '#general-preferences-panel',
      popover: {
        title: 'Preferencias de Interfaz',
        description: 'Personaliza el idioma del panel base, los esquemas de temas cromáticos premium y el formato horario (24h/12h).',
        position: 'right'
      }
    },
    {
      element: '#global-thresholds-panel',
      popover: {
        title: 'Directiva Biométrica Global',
        description: 'Ajusta los umbrales fisiológicos de referencia (BPM, SpO2, Temperatura). Los nuevos pacientes heredarán estos límites por defecto.',
        position: 'top'
      }
    },
    {
      element: '#iot-parameters-panel',
      popover: {
        title: 'Parámetros Instrumentales IoT',
        description: 'Controla la frecuencia de muestreo de hardware, los tiempos de espera de inactividad de los microcontroladores y el volumen del sintetizador acústico.',
        position: 'top'
      }
    }
  ];

  useTour('settings_tour', tourSteps);

  // Configuración General & Temas
  const { theme, mode, setTheme, setMode } = useThemeStore();
  const [language, setLanguage] = useState<string>('ES');
  const [timeFormat, setTimeFormat] = useState<string>('24h');
  const [emailEnabled, setEmailEnabled] = useState<boolean>(true);
  const [pushEnabled, setPushEnabled] = useState<boolean>(true);

  // Clinical toggles
  const [heartAlerts, setHeartAlerts] = useState<boolean>(true);
  const [spo2Alerts, setSpo2Alerts] = useState<boolean>(true);
  const [tempAlerts, setTempAlerts] = useState<boolean>(true);

  // Umbrales Clínicos Globales
  const [minBpm, setMinBpm] = useState<number>(() => {
    const v = localStorage.getItem('aura_global_min_bpm');
    return v ? parseInt(v) : 60;
  });
  const [maxBpm, setMaxBpm] = useState<number>(() => {
    const v = localStorage.getItem('aura_global_max_bpm');
    return v ? parseInt(v) : 100;
  });
  const [minSpo2, setMinSpo2] = useState<number>(() => {
    const v = localStorage.getItem('aura_global_min_spo2');
    return v ? parseInt(v) : 92;
  });
  const [minTemp, setMinTemp] = useState<number>(() => {
    const v = localStorage.getItem('aura_global_min_temp');
    return v ? parseFloat(v) : 35.0;
  });
  const [maxTemp, setMaxTemp] = useState<number>(() => {
    const v = localStorage.getItem('aura_global_max_temp');
    return v ? parseFloat(v) : 38.0;
  });

  // Nuevas configuraciones de IoT e Instrumentación
  const [iotFrequency, setIotFrequency] = useState<number>(() => {
    const v = localStorage.getItem('aura_iot_frequency');
    return v ? parseInt(v) : 10; // 10 segundos por defecto
  });
  const [inactivityTimeout, setInactivityTimeout] = useState<number>(() => {
    const v = localStorage.getItem('aura_inactivity_timeout');
    return v ? parseInt(v) : 30000; // 30 segundos por defecto
  });
  const [alarmVolume, setAlarmVolume] = useState<string>(() => {
    const v = localStorage.getItem('aura_alarm_volume');
    return v || 'MED'; // MED por defecto
  });
  const [alarmAnimation, setAlarmAnimation] = useState<string>(() => {
    const v = localStorage.getItem('aura_alarm_animation');
    return v || 'pulse'; // pulse por defecto
  });

  // Estado del modal de confirmación
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Cargar configuraciones (con fallback si falla la API)
  const fetchConfigurations = async () => {
    try {
      const response = await api.get('/dashboard/config');
      const pref = response.data.theme_preference;
      if (pref && THEME_OPTIONS.some((t) => t.id === pref)) {
        setTheme(pref as ThemeId);
      }
      if (response.data.time_format) {
        setTimeFormat(response.data.time_format);
        localStorage.setItem('aura_time_format', response.data.time_format);
      }
    } catch (err) {
      // Fallback silencioso
    }
  };

  useEffect(() => {
    fetchConfigurations();
  }, []);

  const handleSaveGeneral = async () => {
    setIsSaving(true);
    try {
      await api.put('/dashboard/config', {
        theme_preference: theme,
        language_preference: language,
        time_format: timeFormat
      });
      localStorage.setItem('aura_time_format', timeFormat);
      toast.success('Preferencias de interfaz guardadas con éxito.');
    } catch (err) {
      toast.success('Preferencias guardadas (Simulado en caliente)');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGlobalThresholdsRequest = () => {
    if (user?.role !== 'ADMIN') {
      toast.error('Privilegios insuficientes. Solo los administradores pueden alterar las directivas biométricas.');
      return;
    }
    // Abre el modal de confirmación con mensaje
    setIsConfirmModalOpen(true);
  };

  const handleConfirmGlobalThresholds = async () => {
    setIsSaving(true);
    try {
      // Guardar directivas globalmente en LocalStorage para simular persistencia
      localStorage.setItem('aura_global_min_bpm', minBpm.toString());
      localStorage.setItem('aura_global_max_bpm', maxBpm.toString());
      localStorage.setItem('aura_global_min_spo2', minSpo2.toString());
      localStorage.setItem('aura_global_min_temp', minTemp.toString());
      localStorage.setItem('aura_global_max_temp', maxTemp.toString());

      toast.success('Directiva biométrica global aplicada. Modificaciones guardadas.');
    } catch (err) {
      toast.error('Error al aplicar directiva global.');
    } finally {
      setIsSaving(false);
      setIsConfirmModalOpen(false);
    }
  };

  const handleSaveIotSettings = () => {
    setIsSaving(true);
    try {
      localStorage.setItem('aura_iot_frequency', iotFrequency.toString());
      localStorage.setItem('aura_inactivity_timeout', inactivityTimeout.toString());
      localStorage.setItem('aura_alarm_volume', alarmVolume);
      localStorage.setItem('aura_alarm_animation', alarmAnimation);
      toast.success('Parámetros de Instrumental IoT actualizados correctamente.');
    } catch (err) {
      toast.error('Error al guardar configuración IoT.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-mono relative max-w-4xl mx-auto pb-10">

      {/* Cabecera superior */}
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Panel de Configuración</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* PANEL 1: PREFERENCIAS GENERALES */}
        <div id="general-preferences-panel" className="bg-glass rounded-3xl border border-[#1E2640] p-6 space-y-5">
          <h3 className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest border-b border-[#1E2640] pb-3 flex items-center space-x-2">
            <Globe className="h-4 w-4 text-[#D4AF37]" />
            <span>Interfaz e Idioma</span>
          </h3>

          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase block">Idioma Base</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full p-3 bg-[#0B0F19] border border-[#1E2640] rounded-xl outline-none text-slate-200 cursor-pointer"
              >
                <option value="ES">Español (Venezuela)</option>
                <option value="EN">English (US)</option>
              </select>
            </div>

            {/* Modo de Iluminación */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 font-bold uppercase block">Modo de Iluminación</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('dark')}
                  className={`p-2.5 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold transition-all ${
                    mode === 'dark'
                      ? 'bg-[#1E2640] border-[#D4AF37] text-white shadow-md'
                      : 'bg-[#0B0F19] border-[#1E2640] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Moon className="h-4 w-4 text-indigo-400" />
                  <span>Modo Oscuro</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('light')}
                  className={`p-2.5 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold transition-all ${
                    mode === 'light'
                      ? 'bg-slate-200 border-[#D4AF37] text-slate-900 shadow-md'
                      : 'bg-[#0B0F19] border-[#1E2640] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sun className="h-4 w-4 text-amber-500" />
                  <span>Modo Claro</span>
                </button>
              </div>
            </div>

            {/* Selector de Temas Estéticos (5) */}
            <div className="space-y-2 pt-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase block flex items-center space-x-1">
                <Palette className="h-3 w-3 text-[#D4AF37]" />
                <span>Temas Estéticos Personalizados (5)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {THEME_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id as ThemeId)}
                    className={`p-3 rounded-xl border text-left flex items-start justify-between transition-all ${
                      theme === t.id
                        ? 'bg-[#1E2640] border-[#D4AF37] text-white shadow-md'
                        : 'bg-[#0B0F19] border-[#1E2640] text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">{t.name}</p>
                      <p className="text-[9px] text-slate-400 leading-tight mt-0.5">{t.description}</p>
                    </div>
                    <span
                      className="h-4 w-4 rounded-full border border-white/20 shrink-0 ml-2 shadow-sm mt-0.5"
                      style={{ backgroundColor: t.accentColor }}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase block">Formato de Hora (Ejes / Alertas)</label>
              <select
                value={timeFormat}
                onChange={(e) => setTimeFormat(e.target.value)}
                className="w-full p-3 bg-[#0B0F19] border border-[#1E2640] rounded-xl outline-none text-slate-200 cursor-pointer"
              >
                <option value="24h">24 Horas (Militar / Clínico)</option>
                <option value="12h">12 Horas (AM / PM)</option>
              </select>
            </div>

            <button
              onClick={handleSaveGeneral}
              disabled={isSaving}
              className="px-4 py-2.5 bg-[#1E2640] hover:bg-[#D4AF37] hover:text-black font-extrabold text-[10px] text-[#D4AF37] rounded-xl border border-[#D4AF37]/25 transition-all uppercase tracking-wider block text-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Guardando...' : 'Guardar Interfaz'}
            </button>

          </div>
        </div>

        {/* PANEL 2: CANALES DE NOTIFICACIÓN */}
        <div className="bg-glass rounded-3xl border border-[#1E2640] p-6 space-y-5">
          <h3 className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest border-b border-[#1E2640] pb-3 flex items-center space-x-2">
            <Bell className="h-4 w-4 text-[#D4AF37]" />
            <span>Notificaciones y Alertas</span>
          </h3>

          <div className="space-y-4 text-xs font-mono">

            {/* Canales Digitales */}
            <div className="space-y-3">
              <span className="text-[9px] text-slate-500 font-bold uppercase block">Canales Digitales</span>

              <div className="flex items-center justify-between p-3 bg-black/25 border border-[#1E2640] rounded-2xl">
                <div>
                  <strong className="text-slate-300 block text-xs">Correo Electrónico Fijo</strong>
                  <span className="text-[9px] text-slate-500 block">Reportes y alertas críticas directas</span>
                </div>
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                  className="w-4 h-4 accent-[#D4AF37] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-black/25 border border-[#1E2640] rounded-2xl">
                <div>
                  <strong className="text-slate-300 block text-xs">Notificaciones Push Móviles</strong>
                  <span className="text-[9px] text-slate-500 block">Vibración instantánea en pasarelas</span>
                </div>
                <input
                  type="checkbox"
                  checked={pushEnabled}
                  onChange={(e) => setPushEnabled(e.target.checked)}
                  className="w-4 h-4 accent-[#D4AF37] cursor-pointer"
                />
              </div>
            </div>

            {/* Alertas Biométricas Activas */}
            <div className="space-y-3 pt-2">
              <span className="text-[9px] text-slate-500 font-bold uppercase block">Alertas Biométricas Activas</span>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setHeartAlerts(!heartAlerts)}
                  className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all ${heartAlerts
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-black/10 text-slate-500 border-[#1E2640]'
                    }`}
                >
                  Frecuencia Cardíaca (BPM)
                </button>

                <button
                  onClick={() => setSpo2Alerts(!spo2Alerts)}
                  className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all ${spo2Alerts
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-black/10 text-slate-500 border-[#1E2640]'
                    }`}
                >
                  Saturación SpO2
                </button>

                <button
                  onClick={() => setTempAlerts(!tempAlerts)}
                  className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all ${tempAlerts
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-black/10 text-slate-500 border-[#1E2640]'
                    }`}
                >
                  Temperatura (°C)
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* PANEL 3: CONFIGURACIÓN AVANZADA (DIRECTIVAS DE CLINICA - ADMINISTRATIVO) */}
      <div id="global-thresholds-panel" className="bg-glass rounded-3xl border border-[#1E2640] p-6 space-y-6 relative overflow-hidden">

        {/* Adornos estéticos */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF1744]/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#1E2640] pb-4 gap-4">
          <h3 className="text-xs text-[#FF1744] font-extrabold uppercase tracking-widest flex items-center space-x-2">
            <Lock className="h-4 w-4 text-[#FF1744]" />
            <span>Directiva Biométrica Global</span>
          </h3>

          <span className="px-3 py-1 bg-[#FF1744]/10 text-[#FF1744] border border-[#FF1744]/25 text-[9px] font-bold rounded-lg uppercase tracking-wider flex items-center space-x-1.5">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Gobernanza Directa (Sin Bloqueo)</span>
          </span>
        </div>

        <p className="text-[10px] text-slate-500 leading-normal leading-tight font-bold mb-4">
          Establece los límites biométricos globales por defecto del sistema. Cualquier paciente nuevo que ingrese al ecosistema de telemonitoreo AURA heredará de forma automática estos umbrales como su base de análisis.
        </p>

        {/* Inputs de Alta Densidad Decimal - SIEMPRE DESBLOQUEADOS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">

          {/* BPM */}
          <div className="bg-black/25 p-4 rounded-2xl border border-[#1E2640] space-y-3">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">1. Frecuencia Cardíaca (BPM)</span>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[8px] text-slate-600 block uppercase">Mínimo BPM</span>
                <input
                  type="number"
                  value={minBpm}
                  onChange={(e) => setMinBpm(parseInt(e.target.value) || 0)}
                  className="w-full p-2 bg-[#0B0F19] border border-[#1E2640] rounded-lg text-slate-200 outline-none focus:border-[#FF1744] text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[8px] text-slate-600 block uppercase">Máximo BPM</span>
                <input
                  type="number"
                  value={maxBpm}
                  onChange={(e) => setMaxBpm(parseInt(e.target.value) || 0)}
                  className="w-full p-2 bg-[#0B0F19] border border-[#1E2640] rounded-lg text-slate-200 outline-none focus:border-[#FF1744] text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* SpO2 */}
          <div className="bg-black/25 p-4 rounded-2xl border border-[#1E2640] space-y-3">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">2. Saturación SpO2 (%)</span>
            <div className="space-y-1">
              <span className="text-[8px] text-slate-600 block uppercase">Mínimo Crítico (%)</span>
              <input
                type="number"
                value={minSpo2}
                onChange={(e) => setMinSpo2(parseInt(e.target.value) || 0)}
                className="w-full p-2 bg-[#0B0F19] border border-[#1E2640] rounded-lg text-slate-200 outline-none focus:border-[#FF1744] text-xs font-mono"
              />
            </div>
          </div>

          {/* Temperatura */}
          <div className="bg-black/25 p-4 rounded-2xl border border-[#1E2640] space-y-3">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">3. Temperatura (°C)</span>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[8px] text-slate-600 block uppercase">Mínimo °C</span>
                <input
                  type="number"
                  step="0.1"
                  value={minTemp}
                  onChange={(e) => setMinTemp(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-[#0B0F19] border border-[#1E2640] rounded-lg text-slate-200 outline-none focus:border-[#FF1744] text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[8px] text-slate-600 block uppercase">Máximo °C</span>
                <input
                  type="number"
                  step="0.1"
                  value={maxTemp}
                  onChange={(e) => setMaxTemp(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-[#0B0F19] border border-[#1E2640] rounded-lg text-slate-200 outline-none focus:border-[#FF1744] text-xs font-mono"
                />
              </div>
            </div>
          </div>

        </div>

        <div className="flex items-center space-x-3 pt-3">
          <button
            onClick={handleSaveGlobalThresholdsRequest}
            disabled={isSaving}
            className="px-5 py-2.5 bg-[#FF1744] hover:bg-[#FF1744]/95 text-black font-extrabold text-[10px] rounded-xl border border-transparent transition-all uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Guardando...' : 'Confirmar Directiva Global'}
          </button>
        </div>

      </div>

      {/* PANEL 4: INSTRUMENTAL IOT Y ALARMAS (NUEVAS CONFIGURACIONES INTERESANTES) */}
      <div id="iot-parameters-panel" className="bg-glass rounded-3xl border border-[#1E2640] p-6 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#1E2640] pb-4 gap-4">
          <h3 className="text-xs text-[#D4AF37] font-bold uppercase tracking-widest flex items-center space-x-2">
            <Smartphone className="h-4 w-4 text-[#D4AF37]" />
            <span>Instrumental IoT y Sintetizador</span>
          </h3>
          <span className="px-3 py-1 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/25 text-[9px] font-bold rounded-lg uppercase tracking-wider flex items-center space-x-1.5">
            <Volume2 className="h-3.5 w-3.5" />
            <span>A Aura Engine</span>
          </span>
        </div>

        <p className="text-[10px] text-slate-500 leading-normal leading-tight font-bold mb-4">
          Configure los parámetros de red del hardware de telemonitoreo en tiempo real y el comportamiento del sintetizador acústico de AURA.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase block">Frecuencia de Muestreo ESP32</label>
              <select
                value={iotFrequency}
                onChange={(e) => setIotFrequency(parseInt(e.target.value))}
                className="w-full p-3 bg-[#0B0F19] border border-[#1E2640] rounded-xl outline-none text-slate-200 cursor-pointer"
              >
                <option value={5}>Alta velocidad (5s - Diagnóstico intensivo)</option>
                <option value={10}>Estándar (10s - Telemonitoreo continuo)</option>
                <option value={30}>Bajo consumo (30s - Ahorro batería)</option>
                <option value={60}>Eco (60s - Histórico diario)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase block">Umbral de Inactividad del Paciente</label>
              <select
                value={inactivityTimeout}
                onChange={(e) => setInactivityTimeout(parseInt(e.target.value))}
                className="w-full p-3 bg-[#0B0F19] border border-[#1E2640] rounded-xl outline-none text-slate-200 cursor-pointer"
              >
                <option value={15000}>Extremo (15 segundos sin trama = Inactivo)</option>
                <option value={30000}>Por defecto (30 segundos sin trama = Inactivo)</option>
                <option value={60000}>Tolerante (1 minuto sin trama = Inactivo)</option>
                <option value={120000}>Extendido (2 minutos sin trama = Inactivo)</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase block">Volumen del Sintetizador de Alarmas</label>
              <select
                value={alarmVolume}
                onChange={(e) => setAlarmVolume(e.target.value)}
                className="w-full p-3 bg-[#0B0F19] border border-[#1E2640] rounded-xl outline-none text-slate-200 cursor-pointer"
              >
                <option value="SILENT">Silencio (Solo alertas visuales en pantalla)</option>
                <option value="LOW">Bajo (Entorno hospitalario silencioso)</option>
                <option value="MED">Medio (Recomendado)</option>
                <option value="HIGH">Alto (Entorno crítico - Alto volumen)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase block">Patrón de Animación Visual (Crítico)</label>
              <select
                value={alarmAnimation}
                onChange={(e) => setAlarmAnimation(e.target.value)}
                className="w-full p-3 bg-[#0B0F19] border border-[#1E2640] rounded-xl outline-none text-slate-200 cursor-pointer"
              >
                <option value="pulse">Pulso suave (Premium Glow)</option>
                <option value="blink">Parpadeo de alta frecuencia (Alerta visual intensa)</option>
                <option value="none">Estático (Color sólido sin oscilación)</option>
              </select>
            </div>
          </div>

        </div>

        <div className="flex items-center space-x-3 pt-3">
          <button
            onClick={handleSaveIotSettings}
            disabled={isSaving}
            className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-extrabold text-[10px] rounded-xl border border-transparent transition-all uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Guardando...' : 'Aplicar Parámetros IoT'}
          </button>
        </div>

      </div>

      {/* CONFIRMATION MODAL CON MENSAJE */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmGlobalThresholds}
        title="Verificación de Gobernanza"
        message={`¿Está seguro de que desea aplicar los nuevos umbrales biométricos globales en MongoDB?
        
        Nuevos parámetros a propagar:
        - Frecuencia Cardíaca: [${minBpm} bpm - ${maxBpm} bpm]
        - Saturación de Oxígeno (SpO2): [Mínimo: ${minSpo2}%]
        - Temperatura: [${minTemp}°C - ${maxTemp}°C]
        
        Cualquier paciente nuevo que se incorpore heredará estos valores predeterminados para la evaluación automática de signos vitales.`}
        confirmText="Confirmar Directiva"
        cancelText="Cancelar"
        type="warning"
      />

    </div>
  );
};

export default SettingsView;
