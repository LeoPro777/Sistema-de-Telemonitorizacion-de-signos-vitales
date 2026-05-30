import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { 
  LoginView, 
  ApplicantTypeView, 
  RegistrationStepperView, 
  WaitingApprovalView, 
  DashboardLayout, 
  DashboardHubView,
  PatientView,
  PatientsView,
  PatientDetailView,
  DevicesView,
  DeviceDetailView,
  DeviceProvisionView,
  DoctorsView,
  DoctorDetailView
} from './views'
import { useAuthStore } from './store/authStore'
import './index.css'

// Guardián para proteger rutas autenticadas
const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isLoggedIn, user, isLoading, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  if (user?.status === 'PENDING' && !window.location.pathname.includes('/waiting-approval')) {
    return <Navigate to="/waiting-approval" replace />
  }

  return children
}

// Componentes Placeholder simples para que no fallen los links de la Sidebar

const AuditsPlaceholder = () => (
  <div className="bg-glass p-8 rounded-3xl border border-[#1E2640] text-center max-w-xl mx-auto mt-12">
    <h3 className="text-xl font-bold text-slate-100">Auditoría Forense (Módulo 12)</h3>
    <p className="text-sm text-slate-400 mt-2">Este módulo estará disponible en la siguiente fase de desarrollo.</p>
  </div>
)

const ReportsPlaceholder = () => (
  <div className="bg-glass p-8 rounded-3xl border border-[#1E2640] text-center max-w-xl mx-auto mt-12">
    <h3 className="text-xl font-bold text-slate-100">Reportes Analíticos (Módulo 13)</h3>
    <p className="text-sm text-slate-400 mt-2">Este módulo estará disponible en la siguiente fase de desarrollo.</p>
  </div>
)

const HelpPlaceholder = () => (
  <div className="bg-glass p-8 rounded-3xl border border-[#1E2640] text-center max-w-xl mx-auto mt-12">
    <h3 className="text-xl font-bold text-slate-100">Centro de Ayuda (Módulo 9)</h3>
    <p className="text-sm text-slate-400 mt-2">Este módulo estará disponible en la siguiente fase de desarrollo.</p>
  </div>
)

const ProfilePlaceholder = () => (
  <div className="bg-glass p-8 rounded-3xl border border-[#1E2640] text-center max-w-xl mx-auto mt-12">
    <h3 className="text-xl font-bold text-slate-100">Mi Perfil y Configuración (Módulo 10)</h3>
    <p className="text-sm text-slate-400 mt-2">Este módulo estará disponible en la siguiente fase de desarrollo.</p>
  </div>
)

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#0F1420',
          color: '#E2E8F0',
          border: '1px solid #1E2640',
          borderRadius: '12px'
        }
      }} />
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/login" element={<LoginView />} />
        <Route path="/register-select" element={<ApplicantTypeView />} />
        <Route path="/register-form" element={<RegistrationStepperView />} />
        
        {/* Rutas del Onboarding (Espera) */}
        <Route path="/waiting-approval" element={
          <PrivateRoute>
            <WaitingApprovalView />
          </PrivateRoute>
        } />

        {/* Ruta Paciente */}
        <Route path="/patient-view" element={
          <PrivateRoute>
            <PatientView />
          </PrivateRoute>
        } />

        {/* Rutas Privadas del Dashboard */}
        <Route path="/" element={
          <PrivateRoute>
            <DashboardLayout />
          </PrivateRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardHubView />} />
          
          {/* Rutas reales del Módulo 4 */}
          <Route path="patients" element={<PatientsView />} />
          <Route path="patients/:id" element={<PatientDetailView />} />
          
          {/* Rutas reales del Módulo 5 */}
          <Route path="devices" element={<DevicesView />} />
          <Route path="devices/:id" element={<DeviceDetailView />} />
          <Route path="devices/provision" element={<DeviceProvisionView />} />

          {/* Rutas reales del Módulo 6 */}
          <Route path="doctors" element={<DoctorsView />} />
          <Route path="doctors/:id" element={<DoctorDetailView />} />

          <Route path="audits" element={<AuditsPlaceholder />} />
          <Route path="reports" element={<ReportsPlaceholder />} />
          <Route path="help" element={<HelpPlaceholder />} />
          <Route path="profile" element={<ProfilePlaceholder />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

