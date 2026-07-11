import { create } from 'zustand';
import api from '../utils/api';

export type UserRole = 'ADMIN' | 'DOCTOR' | 'PATIENT' | 'CLIENT';
export type UserStatus = 'incomplete' | 'pending_approval' | 'approved' | 'rejected' | 'suspended';

export interface User {
  id: string;
  google_id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  role: UserRole | null;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  completed_tours?: string[];
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  
  // Flujo de Onboarding
  selectedRole: UserRole | null;
  setSelectedRole: (role: UserRole | null) => void;
  
  // Acciones
  googleLogin: (tokenOrCode: string, isCodeFlow?: boolean) => Promise<any>;
  bypassLogin: (email: string) => Promise<any>;
  onboarding: (role: UserRole, personalData: any, professionalMetadata: any) => Promise<any>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,
  isLoading: false,
  isInitialized: false,
  selectedRole: null,
  
  setSelectedRole: (role) => set({ selectedRole: role }),
  updateUser: (user) => set({ user }),
  
  googleLogin: async (tokenOrCode, isCodeFlow = false) => {
    set({ isLoading: true });
    try {
      const payload = isCodeFlow
        ? { code: tokenOrCode, redirect_uri: `${window.location.origin}/login` }
        : { token: tokenOrCode };
      const response = await api.post('/auth/google-login', payload);
      const { user } = response.data;
      
      // Guardar bandera en localStorage para recordar intención de sesión
      localStorage.setItem('aura_logged_in', 'true');
      
      set({
        user: user,
        isLoggedIn: true,
        isLoading: false,
        isInitialized: true,
      });
      return { success: true, user };
    } catch (error: any) {
      set({ isLoading: false, isLoggedIn: false, user: null, isInitialized: true });
      localStorage.removeItem('aura_logged_in');
      const detail = error?.response?.data?.detail;
      if (typeof detail === 'string') throw detail;
      throw error?.message || 'Error al iniciar sesión con Google';
    }
  },
  
  bypassLogin: async (email) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/bypass-login', { email });
      const { user } = response.data;
      
      localStorage.setItem('aura_logged_in', 'true');
      
      set({
        user: user,
        isLoggedIn: true,
        isLoading: false,
        isInitialized: true,
      });
      return { success: true, user };
    } catch (error: any) {
      set({ isLoading: false, isLoggedIn: false, user: null, isInitialized: true });
      localStorage.removeItem('aura_logged_in');
      const detail = error?.response?.data?.detail;
      if (typeof detail === 'string') throw detail;
      throw error?.message || 'Error en Bypass Login';
    }
  },
  
  onboarding: async (role, personalData, professionalMetadata) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/onboarding', {
        role,
        personal_data: personalData,
        professional_metadata: professionalMetadata,
      });
      
      const updatedUser = response.data;
      set({
        user: updatedUser,
        isLoading: false,
      });
      return updatedUser;
    } catch (error: any) {
      set({ isLoading: false });
      const detail = error?.response?.data?.detail;
      if (typeof detail === 'string') throw detail;
      throw error?.message || 'Error al completar el registro de onboarding';
    }
  },
  
  logout: async () => {
    set({ isLoading: true });
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Error al solicitar logout al servidor:', error);
    } finally {
      localStorage.removeItem('aura_logged_in');
      set({
        user: null,
        isLoggedIn: false,
        isLoading: false,
        isInitialized: true,
        selectedRole: null,
      });
    }
  },
  
  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/auth/me');
      localStorage.setItem('aura_logged_in', 'true');
      set({
        user: response.data,
        isLoggedIn: true,
        isLoading: false,
        isInitialized: true,
      });
    } catch (error) {
      localStorage.removeItem('aura_logged_in');
      set({
        user: null,
        isLoggedIn: false,
        isLoading: false,
        isInitialized: true,
      });
    }
  },
}));

export type { AuthState };
export default useAuthStore;

