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
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  
  // Flujo de Onboarding
  selectedRole: UserRole | null;
  setSelectedRole: (role: UserRole | null) => void;
  
  // Acciones
  googleLogin: (token: string) => Promise<any>;
  onboarding: (role: UserRole, personalData: any, professionalMetadata: any) => Promise<any>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoggedIn: false,
  isLoading: false,
  selectedRole: null,
  
  setSelectedRole: (role) => set({ selectedRole: role }),
  
  googleLogin: async (token) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/google-login', { token });
      const { user } = response.data;
      
      // Guardar bandera en localStorage para recordar intención de sesión
      localStorage.setItem('aura_logged_in', 'true');
      
      set({
        user: user,
        isLoggedIn: true,
        isLoading: false,
      });
      return { success: true, user };
    } catch (error: any) {
      set({ isLoading: false, isLoggedIn: false, user: null });
      localStorage.removeItem('aura_logged_in');
      const detail = error?.response?.data?.detail;
      if (typeof detail === 'string') throw detail;
      throw error?.message || 'Error al iniciar sesión con Google';
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
        selectedRole: null,
      });
    }
  },
  
  checkAuth: async () => {
    // Si no hay bandera local, evitamos llamada innecesaria al servidor
    const auraLoggedIn = localStorage.getItem('aura_logged_in');
    if (!auraLoggedIn) {
      set({ user: null, isLoggedIn: false, isLoading: false });
      return;
    }
    
    set({ isLoading: true });
    try {
      const response = await api.get('/auth/me');
      set({
        user: response.data,
        isLoggedIn: true,
        isLoading: false,
      });
    } catch (error) {
      localStorage.removeItem('aura_logged_in');
      set({
        user: null,
        isLoggedIn: false,
        isLoading: false,
      });
    }
  },
}));

export type { AuthState };
export default useAuthStore;

