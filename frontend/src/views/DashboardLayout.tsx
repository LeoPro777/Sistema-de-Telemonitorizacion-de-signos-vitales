import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  Heart, Menu, X, Bell, LogOut, 
  LayoutDashboard, Users, Smartphone, ShieldCheck, 
  HelpCircle, UserCog, FileBarChart, Award, Building2, UserCheck,
  Settings, FlaskConical, ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

export const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [criticalAlertCount, setCriticalAlertCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  
  // Estados para sistema de alertas y campana
  const [isBellDropdownOpen, setIsBellDropdownOpen] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const prevAlertCount = useRef<number>(0);

  // Cargar alertas recientes del usuario
  const fetchRecentAlerts = async () => {
    if (!user) return;
    try {
      const response = await api.get('/patients/alerts/recent?status_filter=ACTIVE');
      setRecentAlerts(response.data || []);
    } catch (err) {
      console.error("Error al cargar alertas recientes:", err);
    }
  };

  // Reproducir sonido de alarma médica (AudioContext)
  const playAlarmSound = () => {
    try {
      const storedVol = localStorage.getItem('aura_alarm_volume');
      if (storedVol === 'SILENT') return;

      let vol = 0.5; // default MED
      if (storedVol === 'LOW') vol = 0.15;
      if (storedVol === 'HIGH') vol = 0.95;

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      
      const audioCtx = new AudioCtxClass();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const now = audioCtx.currentTime;
      
      // Pitido 1
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); // Tono médico de 880 Hz
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(vol, now + 0.05);
      gain1.gain.setValueAtTime(vol, now + 0.25);
      gain1.gain.linearRampToValueAtTime(0, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);
      
      // Pitido 2 (400ms después)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.4);
      gain2.gain.setValueAtTime(0, now + 0.4);
      gain2.gain.linearRampToValueAtTime(vol, now + 0.45);
      gain2.gain.setValueAtTime(vol, now + 0.65);
      gain2.gain.linearRampToValueAtTime(0, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.4);
      osc2.stop(now + 0.75);
    } catch (error) {
      console.warn("No se pudo reproducir el sonido de la alarma:", error);
    }
  };

  // Resolver una alerta directamente desde el dropdown
  const handleResolveAlert = async (patientId: string, alertId: string) => {
    try {
      await api.post(`/patients/${patientId}/alerts/${alertId}/resolve`);
      toast.success("Alerta resuelta con éxito");
      
      // Actualizar alertas e indicadores inmediatamente
      fetchRecentAlerts();
      const response = await api.get('/dashboard/kpis');
      const kpis = response.data.cached_metrics;
      const count = kpis.critical_alerts_count || kpis.active_alerts || kpis.critical_alerts || 0;
      setCriticalAlertCount(count);
      prevAlertCount.current = count;
      window.dispatchEvent(new Event('kpis-updated'));
    } catch (err: any) {
      toast.error("Error al resolver la alerta: " + (err.response?.data?.detail || err.message));
    }
  };

  const displayName = user 
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Usuario'
    : 'Usuario';
    
  const initials = user 
    ? ((user.first_name || '').slice(0, 2) || (user.email || '').slice(0, 2) || 'US').toUpperCase() 
    : 'US';

  // Auto-colapsar menú en pantallas pequeñas
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Redirigir a login si no está logueado o si está PENDING
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.status === 'pending_approval') {
      navigate('/waiting-approval');
      return;
    }
    if (user.role === 'PATIENT') {
      navigate('/patient-view');
      return;
    }
    
    // Cargar número de alertas críticas reales (si las hay en el KPI cache)
    const fetchKpis = async () => {
      try {
        const response = await api.get('/dashboard/kpis');
        const kpis = response.data.cached_metrics;
        const count = kpis.critical_alerts_count || kpis.active_alerts || kpis.critical_alerts || 0;
        
        // Si hay una nueva alerta crítica (el contador sube), des-mutear automáticamente
        if (count > prevAlertCount.current) {
          setIsMuted(false);
        }
        prevAlertCount.current = count;
        setCriticalAlertCount(count);
        
        // Cargar alertas recientes en el mismo intervalo
        fetchRecentAlerts();
      } catch (err) {
        // Fallback silencioso ante modo offline / exploración libre
        setCriticalAlertCount(2);
      }
    };
    fetchKpis();
    const interval = setInterval(fetchKpis, 10000); // Actualizar alertas de respaldo cada 10 segundos

    // WebSockets globales para alertas en tiempo real
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const baseHost = (import.meta as any).env.VITE_WS_BASE_URL 
      ? (import.meta as any).env.VITE_WS_BASE_URL.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '')
      : window.location.host;
    const wsUrl = `${wsProtocol}//${baseHost}/ws/global-alerts`;

    let globalWs: WebSocket;
    let keepAlive: any;
    try {
      globalWs = new WebSocket(wsUrl);
      globalWs.onmessage = (event) => {
        if (event.data === 'pong') return;
        // Alerta cambiada, recargar inmediatamente
        fetchKpis();
        window.dispatchEvent(new Event('kpis-updated'));
      };
      keepAlive = setInterval(() => {
        if (globalWs && globalWs.readyState === WebSocket.OPEN) {
          globalWs.send('ping');
        }
      }, 30000);
    } catch(err) {
      console.warn("Global alerts WS failed", err);
    }

    return () => {
      clearInterval(interval);
      if (keepAlive) clearInterval(keepAlive);
      if (globalWs) globalWs.close();
    };
  }, [user, navigate]);

  // Bucle de audio de alarma
  useEffect(() => {
    if (criticalAlertCount > 0 && !isMuted) {
      playAlarmSound();
      const soundInterval = setInterval(() => {
        playAlarmSound();
      }, 4000);
      return () => clearInterval(soundInterval);
    }
  }, [criticalAlertCount, isMuted]);

  const handleLogout = () => {
    logout();
    toast.success('Sesión cerrada correctamente');
    navigate('/login');
  };

  // Filtrar accesos del menú lateral por roles (removidos Mi Perfil, Configuración y Centro de Ayuda del Sidebar)
  const getSidebarLinks = () => {
    if (!user) return [];

    const allLinks = [
      { path: '/dashboard', label: 'Dashboard Hub', icon: LayoutDashboard, roles: ['ADMIN', 'DOCTOR', 'CLIENT'] },
      { path: '/patients', label: 'Pacientes (M4)', icon: Users, roles: ['ADMIN', 'DOCTOR', 'CLIENT'] },
      { path: '/devices', label: 'Dispositivos IoT (M5)', icon: Smartphone, roles: ['ADMIN'] },
      { path: '/doctors', label: 'Médicos (M6)', icon: Award, roles: ['ADMIN'] },
      { path: '/clients', label: 'Clientes (M7)', icon: Building2, roles: ['ADMIN'] },
      { path: '/applicants', label: 'Aspirantes (M8)', icon: UserCheck, roles: ['ADMIN'] },
      { path: '/audits', label: 'Auditoría Forense (M12)', icon: ShieldCheck, roles: ['ADMIN'] },
      { path: '/reports', label: 'Reportes Analíticos (M13)', icon: FileBarChart, roles: ['ADMIN', 'DOCTOR'] },
      { path: '/sandbox', label: 'Laboratorio (M14)', icon: FlaskConical, roles: ['ADMIN'] },
    ];

    return allLinks.filter(link => user.role && link.roles.includes(user.role));
  };

  const sidebarLinks = getSidebarLinks();

  return (
    <div className="h-screen w-full bg-[#0B0F19] text-slate-100 flex overflow-hidden">
      
      {/* Backdrop de móvil */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden transition-all duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* SIDEBAR LATERAL IZQUIERDA */}
      <aside 
        className={`bg-[#0F1420] border-r border-[#1E2640] transition-all duration-300 flex flex-col justify-between flex-shrink-0 z-40
          fixed md:relative top-0 bottom-0 left-0 h-full
          ${isSidebarOpen 
            ? 'translate-x-0 w-64 shadow-2xl md:shadow-none' 
            : '-translate-x-full md:translate-x-0 md:w-20'
          }`}
      >
        <div>
          {/* Logo superior */}
          <div className="h-16 flex items-center px-5 border-b border-[#1E2640] justify-between">
            <div id="sidebar-logo" className="flex items-center space-x-3 overflow-hidden">
              <div className="h-9 w-9 bg-gradient-to-br from-[#D4AF37] to-[#AA820A] rounded-xl flex items-center justify-center border border-[#D4AF37]/25 flex-shrink-0 shadow-md">
                <Heart className="h-4.5 w-4.5 text-black stroke-[2.5]" />
              </div>
              {isSidebarOpen && (
                <div className="transition-opacity duration-300">
                  <span className="font-extrabold tracking-wider text-sm text-slate-100 uppercase">AURA</span>
                  <span className="text-[9px] text-[#D4AF37] tracking-widest font-bold uppercase block -mt-1">MONITOR</span>
                </div>
              )}
            </div>

            {isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Lista de Navegación */}
          <nav id="sidebar-nav" className="p-4 space-y-2">
            {sidebarLinks.map((link, idx) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={idx}
                  to={link.path}
                  end={link.path === '/dashboard'}
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      setIsSidebarOpen(false);
                    }
                  }}
                  className={({ isActive }) => `
                    flex items-center space-x-3.5 px-4 py-3 rounded-xl transition-all group ${
                      isActive 
                        ? 'bg-gradient-to-r from-[#1E2640] to-[#151B2E] text-[#D4AF37] border-l-2 border-[#D4AF37] shadow-md' 
                        : 'text-slate-400 hover:bg-[#1E2640]/30 hover:text-slate-200'
                    }
                  `}
                >
                  <Icon className="h-5 w-5 flex-shrink-0 transition-colors" />
                  {isSidebarOpen && (
                    <span className="text-xs md:text-sm font-semibold truncate transition-opacity duration-300">
                      {link.label}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bloque inferior del perfil en Sidebar */}
        <div className="p-4 border-t border-[#1E2640] bg-[#0A0D15]/40">
          {isSidebarOpen ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5 overflow-hidden">
                {/* Avatar simulado */}
                <div className="h-9 w-9 bg-[#1E2640] rounded-xl flex items-center justify-center border border-[#D4AF37]/25 text-[#D4AF37] font-bold flex-shrink-0 text-xs shadow-md">
                  {initials}
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-xs font-bold text-slate-200 truncate">{displayName}</h4>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase truncate">{user?.role}</p>
                </div>
              </div>
              
              <button 
                onClick={handleLogout}
                className="text-slate-500 hover:text-[#FF1744] p-1.5 rounded-lg hover:bg-[#FF1744]/15 transition-all"
                title="Cerrar sesión"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="w-full flex justify-center text-slate-500 hover:text-[#D4AF37] py-2"
              title="Expandir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
        </div>
      </aside>

      {/* PANEL DE CONTENIDO PRINCIPAL */}
      <div className="flex-grow flex flex-col min-w-0 h-full">
        
        {/* Banner de Alarma Crítica */}
        {criticalAlertCount > 0 && (
          <div className={`bg-[#FF1744]/10 border-b border-[#FF1744]/30 px-6 py-2 flex items-center justify-between z-10 flex-shrink-0 ${
            localStorage.getItem('aura_alarm_animation') === 'blink' 
              ? 'animate-pulse border-b-[#FF1744]/60 bg-[#FF1744]/15' 
              : localStorage.getItem('aura_alarm_animation') === 'none' 
              ? '' 
              : 'animate-pulse'
          }`}>
            <div className="flex items-center space-x-2">
              <ShieldAlert className="h-4 w-4 text-[#FF1744] animate-bounce" />
              <span className="text-xs font-bold text-slate-200 font-mono tracking-wider">
                PROTOCOLO DE EMERGENCIA - {criticalAlertCount} PACIENTE(S) EN ESTADO CRÍTICO
              </span>
            </div>
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="px-3 py-1 bg-[#FF1744]/20 hover:bg-[#FF1744]/35 text-[#FF1744] border border-[#FF1744]/40 text-[9px] font-extrabold uppercase rounded-lg tracking-wider transition-all"
            >
              {isMuted ? "Activar Sonido" : "Silenciar Alarma"}
            </button>
          </div>
        )}

        {/* TOPBAR SUPERIOR */}
        <header className="h-16 bg-[#0F1420] border-b border-[#1E2640] flex items-center justify-between px-6 flex-shrink-0 z-20">
          
          {/* Lado Izquierdo: Buscador o botón menú en móvil */}
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-slate-400 hover:text-slate-200 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

          </div>

          {/* Lado Derecho: Alertas, Perfil, Info del Rol */}
          <div className="flex items-center space-x-5">
            
            {/* Indicador de Rol actual en píldora dorada */}
            <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 uppercase">
              {user?.role} MODE
            </span>

            {/* Contador de alertas críticas globales */}
            <div className="relative">
              <button 
                id="bell-notifications"
                onClick={() => {
                  setIsBellDropdownOpen(!isBellDropdownOpen);
                  if (!isBellDropdownOpen) {
                    fetchRecentAlerts();
                  }
                }}
                className={`p-2 rounded-xl border border-[#1E2640] bg-[#0A0D15]/40 text-slate-400 hover:text-slate-200 transition-all outline-none ${
                  criticalAlertCount > 0 ? 'border-[#FF1744]/40 text-[#FF1744] bg-[#FF1744]/5' : ''
                }`}
                title={`${criticalAlertCount} alertas vigentes`}
              >
                <Bell className={`h-4.5 w-4.5 ${criticalAlertCount > 0 ? 'animate-bounce text-[#FF1744]' : ''}`} />
              </button>
              {criticalAlertCount > 0 && (
                <span className="absolute top-0 right-0 h-4 w-4 bg-[#FF1744] rounded-full text-[9px] text-black font-extrabold flex items-center justify-center animate-pulse border border-[#0B0F19]">
                  {criticalAlertCount}
                </span>
              )}

              {/* Dropdown de Alertas Recientes */}
              {isBellDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsBellDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-3 w-80 bg-[#0F1420] border border-[#1E2640] rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col overflow-hidden max-h-[420px]">
                    <div className="px-4 py-3 bg-[#0A0D15]/60 border-b border-[#1E2640] flex items-center justify-between">
                      <span className="font-extrabold text-xs uppercase tracking-wider text-[#D4AF37] font-mono">Panel de Alertas</span>
                      <div className="flex items-center space-x-2">
                        {criticalAlertCount > 0 && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} 
                            className="px-2 py-0.5 bg-[#FF1744]/15 hover:bg-[#FF1744]/25 rounded-full border border-[#FF1744]/35 text-[9px] font-extrabold transition-all uppercase tracking-wider font-mono text-[#FF1744]"
                          >
                            {isMuted ? "🔊 ALARMA OFF" : "🔇 ALARMA ON"}
                          </button>
                        )}
                        {criticalAlertCount > 0 && (
                          <span className="px-2 py-0.5 bg-[#FF1744]/15 border border-[#FF1744]/30 rounded-full text-[9px] text-[#FF1744] font-bold uppercase animate-pulse font-mono">
                            {criticalAlertCount} Críticas
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="overflow-y-auto divide-y divide-[#1E2640]/50 flex-grow scrollbar-thin max-h-[350px]">
                      {recentAlerts.length === 0 ? (
                        <div className="px-4 py-8 text-center text-slate-500 font-sans text-xs">
                          No hay alertas registradas
                        </div>
                      ) : (
                        recentAlerts.map((alert) => (
                          <div key={alert._id} className="p-4 hover:bg-[#1E2640]/15 transition-all flex flex-col space-y-2 text-left">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-200 truncate max-w-[150px]">
                                {alert.patient_name}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                                alert.status === 'ACTIVE'
                                  ? 'bg-[#FF1744]/10 border-[#FF1744]/30 text-[#FF1744]'
                                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              }`}>
                                {alert.status === 'ACTIVE' ? 'Activa' : 'Resuelta'}
                              </span>
                            </div>
                            
                            <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                              {alert.description}
                            </p>
                            
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[9px] text-slate-500 font-mono">
                                {new Date(alert.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                              
                              {alert.status === 'ACTIVE' && (user?.role === 'ADMIN' || user?.role === 'DOCTOR') && (
                                <button
                                  onClick={() => handleResolveAlert(alert.patient_id, alert._id)}
                                  className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-[9px] rounded-lg transition-all uppercase tracking-wider"
                                >
                                  Resolver
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="h-8 w-[1px] bg-[#1E2640]" />

            {/* Perfil directo link */}
            <button 
              onClick={() => navigate('/profile')}
              className="flex items-center space-x-2.5 hover:opacity-85 transition-opacity text-left outline-none"
            >
              <div className="h-8 w-8 bg-[#1E2640] rounded-lg border border-[#D4AF37]/20 text-[#D4AF37] font-bold flex items-center justify-center text-[10px] shadow-sm">
                {initials}
              </div>
              <div className="hidden lg:block">
                <p className="text-xs font-bold text-slate-300">{displayName}</p>
                <p className="text-[9px] text-slate-500 font-semibold">{user?.email}</p>
              </div>
            </button>

            {/* Tuerca de Configuración y Menú Desplegable */}
            <div className="relative">
              <button 
                id="settings-dropdown-btn"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="p-2 rounded-xl border border-[#1E2640] bg-[#0A0D15]/40 text-slate-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/25 transition-all outline-none"
                title="Configuración y Ayuda"
              >
                <Settings className={`h-4.5 w-4.5 transition-transform duration-300 ${isDropdownOpen ? 'rotate-90 text-[#D4AF37]' : ''}`} />
              </button>

              {/* Menú Desplegable Dropdown */}
              {isDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-[#0F1420] border border-[#1E2640] rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 font-mono text-xs">
                    <button
                      onClick={() => { navigate('/profile'); setIsDropdownOpen(false); }}
                      className="w-full px-4 py-2.5 hover:bg-[#1E2640]/55 hover:text-[#D4AF37] text-left text-slate-300 font-semibold transition-all flex items-center space-x-2"
                    >
                      <UserCog className="h-4 w-4 text-[#D4AF37]" />
                      <span>Mi Perfil (M10)</span>
                    </button>
                    <button
                      onClick={() => { navigate('/settings'); setIsDropdownOpen(false); }}
                      className="w-full px-4 py-2.5 hover:bg-[#1E2640]/55 hover:text-[#D4AF37] text-left text-slate-300 font-semibold transition-all flex items-center space-x-2"
                    >
                      <Settings className="h-4 w-4 text-[#D4AF37]" />
                      <span>Configuración (M11)</span>
                    </button>
                    <button
                      onClick={() => { navigate('/help'); setIsDropdownOpen(false); }}
                      className="w-full px-4 py-2.5 hover:bg-[#1E2640]/55 hover:text-[#D4AF37] text-left text-slate-300 font-semibold transition-all flex items-center space-x-2"
                    >
                      <HelpCircle className="h-4 w-4 text-[#D4AF37]" />
                      <span>Centro de Ayuda (M9)</span>
                    </button>
                    <div className="h-[1px] bg-[#1E2640] my-1" />
                    <button
                      onClick={() => { setIsLogoutModalOpen(true); setIsDropdownOpen(false); }}
                      className="w-full px-4 py-2.5 hover:bg-[#FF1744]/10 hover:text-[#FF1744] text-left text-slate-400 font-semibold transition-all flex items-center space-x-2"
                    >
                      <LogOut className="h-4 w-4 text-[#FF1744]" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        </header>



        {/* SUBVISTAS DINÁMICAS (OUTLET) */}
        <main className="flex-grow p-6 md:p-8 overflow-y-auto relative">
          <Outlet />
        </main>
      </div>

      {/* MODAL VERIFICACIÓN CERRAR SESIÓN (Y/N) */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-[#0B0F19]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F1420] border border-[#1E2640] rounded-3xl p-6 w-full max-w-sm text-xs flex flex-col justify-between shadow-2xl relative font-mono animate-in fade-in zoom-in-95 duration-200">
            
            <div className="border-b border-[#1E2640]/60 pb-3 mb-5 text-center">
              <LogOut className="h-7 w-7 text-[#FF1744] mx-auto mb-2" />
              <strong className="text-base text-slate-200 font-extrabold block">
                ¿Cerrar Sesión?
              </strong>
              <span className="text-[9px] text-[#FF1744] font-bold uppercase tracking-wider block mt-1">
                Verificación de Seguridad
              </span>
            </div>

            <div className="space-y-6 text-center">
              <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                ¿Está seguro de que desea salir del sistema de telemonitoreo AURA? Perderá acceso inmediato a los paneles en tiempo real.
              </p>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleLogout}
                  className="flex-1 py-2.5 bg-[#FF1744] hover:bg-[#FF1744]/90 text-black font-extrabold text-xs rounded-xl transition-all uppercase tracking-wider text-center"
                >
                  Sí (Confirmar)
                </button>
                <button
                  onClick={() => setIsLogoutModalOpen(false)}
                  className="flex-1 py-2.5 bg-black/25 text-slate-400 border border-[#1E2640] hover:text-slate-200 font-extrabold text-xs rounded-xl transition-all uppercase tracking-wider text-center"
                >
                  No (Cancelar)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default DashboardLayout;
