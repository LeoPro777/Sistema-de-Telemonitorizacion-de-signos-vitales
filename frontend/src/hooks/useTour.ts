import { useEffect, useRef } from 'react';
import { driver, DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';

/**
 * Hook personalizado para manejar product tours interactivos con driver.js y persistencia en MongoDB.
 * 
 * @param tourId Identificador único del tour (ej. 'dashboard_tour')
 * @param steps Lista de pasos del tour
 * @param autoStart Booleano que determina si el tour se lanza automáticamente al cargar la vista
 */
export const useTour = (tourId: string, steps: DriveStep[], autoStart = true) => {
  const { user, updateUser } = useAuthStore();
  const driverRef = useRef<any>(null);

  const startTour = (force = false) => {
    if (!user) return;
    
    // Si el tour ya ha sido completado por este usuario y no está forzado, no lo inicia
    if (user.completed_tours?.includes(tourId) && !force) {
      return;
    }

    const driverObj = driver({
      showProgress: true,
      allowClose: true,
      doneBtnText: 'Entendido',
      nextBtnText: 'Siguiente',
      prevBtnText: 'Anterior',
      steps: steps,
      onDestroyed: async () => {
        // Al cerrar, omitir o completar, guardamos el estado en el backend si no estaba ya completado
        if (!user.completed_tours?.includes(tourId)) {
          try {
            const response = await api.patch('/users/me/preferences', {
              completed_tour: tourId
            });
            // Actualizamos la información local del usuario
            updateUser(response.data);
          } catch (err) {
            console.error(`[useTour] Error al persistir tour completado ${tourId}:`, err);
          }
        }
      }
    });

    driverRef.current = driverObj;
    driverObj.drive();
  };

  useEffect(() => {
    // Verificar si se solicitó forzar el inicio de este tour desde otra vista
    const forceTourId = localStorage.getItem('aura_force_tour');
    if (forceTourId === tourId) {
      localStorage.removeItem('aura_force_tour');
      const timer = setTimeout(() => {
        startTour(true);
      }, 1000);
      return () => clearTimeout(timer);
    }

    // Autostart si el usuario está autenticado y no ha hecho el tour antes
    if (autoStart && user && !user.completed_tours?.includes(tourId)) {
      const timer = setTimeout(() => {
        startTour(false);
      }, 1000); // 1 segundo de retraso para garantizar carga del DOM y transiciones
      return () => clearTimeout(timer);
    }
  }, [tourId, autoStart, user]);

  return { startTour };
};

export default useTour;
