import React, { useState, useEffect } from 'react';
import { useNavigate, NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  Heart, Menu, X, Bell, Search, LogOut, 
  LayoutDashboard, Users, Smartphone, ShieldCheck, 
  HelpCircle, UserCog, FileBarChart, Award, Building2, UserCheck,
  Settings
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
    if (user.status === 'PENDING') {
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
        setCriticalAlertCount(kpis.critical_alerts_count || kpis.active_alerts || kpis.critical_alerts || 0);
      } catch (err) {
        // Fallback silencioso ante modo offline / exploración libre
        setCriticalAlertCount(2);
      }
    };
    fetchKpis();
    const interval = setInterval(fetchKpis, 10000); // Actualizar alertas cada 10 segundos
    return () => clearInterval(interval);
  }, [user, navigate]);

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
      { path: '/devices', label: 'Dispositivos IoT (M5)', icon: Smartphone, roles: ['ADMIN', 'DOCTOR', 'CLIENT'] },
      { path: '/doctors', label: 'Médicos (M6)', icon: Award, roles: ['ADMIN', 'DOCTOR'] },
      { path: '/clients', label: 'Clientes (M7)', icon: Building2, roles: ['ADMIN'] },
      { path: '/applicants', label: 'Aspirantes (M8)', icon: UserCheck, roles: ['ADMIN'] },
      { path: '/audits', label: 'Auditoría Forense (M12)', icon: ShieldCheck, roles: ['ADMIN'] },
      { path: '/reports', label: 'Reportes Analíticos (M13)', icon: FileBarChart, roles: ['ADMIN', 'DOCTOR'] },
    ];

    return allLinks.filter(link => link.roles.includes(user.role));
  };

  const sidebarLinks = getSidebarLinks();

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex overflow-hidden">
      
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
            <div className="flex items-center space-x-3 overflow-hidden">
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
          <nav className="p-4 space-y-2">
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
      <div className="flex-grow flex flex-col min-w-0 overflow-y-auto">
        
        {/* TOPBAR SUPERIOR */}
        <header className="h-16 bg-[#0F1420] border-b border-[#1E2640] flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-20">
          
          {/* Lado Izquierdo: Buscador o botón menú en móvil */}
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-slate-400 hover:text-slate-200 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Buscador Semántico */}
            <div className="relative hidden sm:block w-64 md:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                placeholder="Buscador semántico global..."
                className="w-full pl-9 pr-4 py-1.5 bg-[#0B0F19] border border-[#1E2640] rounded-xl text-xs focus:border-[#D4AF37] outline-none transition-all placeholder:text-slate-600"
              />
            </div>
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
                className={`p-2 rounded-xl border border-[#1E2640] bg-[#0A0D15]/40 text-slate-400 hover:text-slate-200 transition-all ${
                  criticalAlertCount > 0 ? 'border-[#FF1744]/40 text-[#FF1744] bg-[#FF1744]/5' : ''
                }`}
                title={`${criticalAlertCount} alertas vigentes`}
              >
                <Bell className={`h-4.5 w-4.5 ${criticalAlertCount > 0 ? 'animate-bounce' : ''}`} />
              </button>
              {criticalAlertCount > 0 && (
                <span className="absolute top-0 right-0 h-4 w-4 bg-[#FF1744] rounded-full text-[9px] text-black font-extrabold flex items-center justify-center animate-pulse border border-[#0B0F19]">
                  {criticalAlertCount}
                </span>
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
        <main className="flex-grow p-6 md:p-8">
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
