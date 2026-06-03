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
  DoctorDetailView,
  ClientsView,
  ClientDetailView,
  ApplicantsView,
  ApplicantDetailView,
  HelpCenterView,
  ArticleDetailView,
  ProfileView,
  ProfileEditView,
  SettingsView,
  AuditLogsView,
  ReportsView
} from './views'
import { useAuthStore } from './store/authStore'
import './index.css'

// Guardián para proteger rutas autenticadas
const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isLoggedIn, user, isLoading, isInitialized, checkAuth } = useAuthStore()

  useEffect(() => {
    if (!isInitialized && !isLoading) {
      checkAuth()
    }
  }, [isInitialized, isLoading, checkAuth])

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  if (user?.status === 'incomplete' && !window.location.pathname.includes('/register-select') && !window.location.pathname.includes('/register-form')) {
    return <Navigate to="/register-select" replace />
  }

  if (user?.status === 'pending_approval' && !window.location.pathname.includes('/waiting-approval')) {
    return <Navigate to="/waiting-approval" replace />
  }

  if (user?.status === 'rejected' || user?.status === 'suspended') {
    return <Navigate to="/login" replace />
  }

  return children
}

// Rutas de administración y analítica



const App: React.FC = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>

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

          {/* Rutas reales del Módulo 7 */}
          <Route path="clients" element={<ClientsView />} />
          <Route path="clients/:id" element={<ClientDetailView />} />

          {/* Rutas reales del Módulo 8 */}
          <Route path="applicants" element={<ApplicantsView />} />
          <Route path="applicants/:email" element={<ApplicantDetailView />} />

          <Route path="audits" element={<AuditLogsView />} />
          <Route path="reports" element={<ReportsView />} />
          <Route path="settings" element={<SettingsView />} />
          {/* Rutas reales del Módulo 9 */}
          <Route path="help" element={<HelpCenterView />} />
          <Route path="support/articles/:slug" element={<ArticleDetailView />} />

          {/* Rutas reales del Módulo 10 */}
          <Route path="profile" element={<ProfileView />} />
          <Route path="profile/edit" element={<ProfileEditView />} />
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

