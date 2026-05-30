import axios from 'axios';

const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Manejador de respuestas mock de alta fidelidad para el modo libre (Bypass)
const handleMockRequest = (config: any): Promise<any> => {
  const url = config.url || '';
  const method = (config.method || 'get').toLowerCase();

  let data: any = {};
  const status = 200;

  // Enrutador de simulaciones locales
  if (url.includes('/dashboard/config')) {
    if (method === 'get') {
      data = { theme_preference: 'premium_dark', language_preference: 'ES' };
    } else {
      data = { success: true };
    }
  } else if (url.includes('/dashboard/kpis')) {
    data = {
      cached_metrics: {
        critical_alerts_count: 2,
        active_alerts: 2,
        critical_alerts: 2,
        total_patients: 5,
        active_devices: 4,
        average_latency: 104
      }
    };
  } else if (url.includes('/profile')) {
    if (method === 'get') {
      data = {
        google_avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=dr_lopez',
        personal_data: {
          full_name: 'Dr. Pedro Ramírez',
          email: 'admin@aura.com',
          phone: '+56 9 8765 4321',
          rut: '12.345.678-9'
        },
        role_specific_data: {
          specialty: 'Cardiología',
          license_number: '123456',
          box_office: 'Consulta 402'
        }
      };
    } else {
      data = { success: true };
    }
  } else if (url.includes('/patients')) {
    if (method === 'get') {
      data = [
        { _id: "P001", personal_data: { first_name: "Juan", last_name: "Pérez Astudillo" }, rut: "15.340.281-K", current_condition: "Estable" },
        { _id: "P002", personal_data: { first_name: "María", last_name: "Loreto González" }, rut: "9.872.104-5", current_condition: "Estable" }
      ];
    } else {
      data = { success: true };
    }
  } else if (url.includes('/devices')) {
    if (method === 'get') {
      data = [
        { _id: "D001", serial_number: "AURA-ESP32-9021", operational_status: "AVAILABLE", approval_status: "APPROVED" }
      ];
    } else {
      data = { success: true };
    }
  } else if (url.includes('/doctors')) {
    if (method === 'get') {
      data = [
        { _id: "Doc001", username: "dr_lopez", specialty: "Cardiología", is_active: true }
      ];
    } else {
      data = { success: true };
    }
  } else if (url.includes('/clients')) {
    data = [
      { _id: "C001", client_type: "CLINICA", business_name: "Clínica AURA Norte" }
    ];
  } else if (url.includes('/applicants')) {
    data = [
      { email: "aspirante@email.com", first_name: "Sofía", last_name: "Tapia", role_requested: "DOCTOR" }
    ];
  } else if (url.includes('/support/articles')) {
    data = [
      { _id: "art1", title: "Configuración del Hardware ESP32 AURA", slug: "configuracion-esp32-aura", content: "# Configuración\nSiga estos pasos..." }
    ];
  } else {
    data = { success: true, message: 'Simulado en Bypass Mode' };
  }

  return Promise.resolve({
    data,
    status,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    config,
    request: {}
  });
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Configurar el adaptador in-memory condicional
api.defaults.adapter = function (config) {
  const token = localStorage.getItem('access_token') || 'bypass_token'; // Bypass por defecto en exploración
  if (token === 'bypass_token') {
    return handleMockRequest(config);
  }
  
  const defaultAdapter = axios.defaults.adapter;
  if (typeof defaultAdapter === 'function') {
    return defaultAdapter(config);
  }
  return Promise.reject(new Error('Adaptador por defecto de Axios no disponible'));
};

// Interceptor para inyectar el token JWT en las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token') || 'bypass_token';
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores globales (ej: 401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;
    
    if (status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
export { API_BASE_URL };

