import { create } from 'zustand';
import api from '../utils/api';

export type UserRole = 'ADMIN' | 'DOCTOR' | 'PATIENT' | 'CLIENT';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  two_factor: {
    enabled: boolean;
  };
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  twoFactorRequired: boolean;
  tempToken: string | null;
  
  // Flujo de Registro
  selectedRole: UserRole | null;
  
  // Acciones
  setSelectedRole: (role: UserRole | null) => void;
  login: (usernameOrEmail: string, password: String) => Promise<any>;
  verify2FA: (otpCode: string) => Promise<any>;
  registerApplicant: (data: any) => Promise<any>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('access_token'),
  isLoggedIn: false,
  isLoading: true,
  twoFactorRequired: false,
  tempToken: null,
  
  selectedRole: null,
  
  setSelectedRole: (role) => set({ selectedRole: role }),
  
  login: async (usernameOrEmail, password) => {
    set({ isLoading: true, twoFactorRequired: false, tempToken: null });
    try {
      const response = await api.post('/auth/login', {
        username_or_email: usernameOrEmail,
        password: password,
      });
      
      const { access_token, refresh_token, two_factor_required, temp_token, user } = response.data;
      
      if (two_factor_required) {
        set({
          twoFactorRequired: true,
          tempToken: temp_token,
          user: user,
          isLoading: false,
        });
        return { twoFactorRequired: true };
      }
      
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      
      set({
        user: user,
        token: access_token,
        isLoggedIn: true,
        isLoading: false,
      });
      return { success: true, user };
    } catch (error: any) {
      set({ isLoading: false });
      throw error.response?.data?.detail || 'Error al iniciar sesión';
    }
  },
  
  verify2FA: async (otpCode) => {
    const { tempToken } = get();
    if (!tempToken) throw 'Token temporal no válido';
    
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/verify-2fa', {
        temp_token: tempToken,
        otp_code: otpCode,
      });
      
      const { access_token, refresh_token, user } = response.data;
      
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      
      set({
        user: user,
        token: access_token,
        isLoggedIn: true,
        twoFactorRequired: false,
        tempToken: null,
        isLoading: false,
      });
      return { success: true, user };
    } catch (error: any) {
      set({ isLoading: false });
      throw error.response?.data?.detail || 'Código de verificación incorrecto';
    }
  },
  
  registerApplicant: async (data) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/register', data);
      set({ isLoading: false });
      return response.data;
    } catch (error: any) {
      set({ isLoading: false });
      throw error.response?.data?.detail || 'Error en el registro';
    }
  },
  
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({
      user: null,
      token: null,
      isLoggedIn: false,
      twoFactorRequired: false,
      tempToken: null,
    });
  },
  
  checkAuth: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      set({ isLoading: false, isLoggedIn: false });
      return;
    }
    
    try {
      const response = await api.get('/auth/me');
      set({
        user: response.data,
        isLoggedIn: true,
        isLoading: false,
      });
    } catch (error) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      set({
        user: null,
        token: null,
        isLoggedIn: false,
        isLoading: false,
      });
    }
  },
}));
export type { AuthState };
export default useAuthStore;
