import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

// Base URL: prioriza '/api' para usar siempre el proxy de Vite en desarrollo
// y evitar problemas de CORS con el API Gateway
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de Peticiones: agrega Bearer token desde localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token.trim()}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de Respuestas: maneja errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // Si es 403 (Forbidden): El usuario SÍ está autenticado pero no tiene permisos para este recurso específico.
    // NUNCA se debe borrar el token ni redirigir a login en un 403.
    if (status === 403) {
      console.warn('Acceso denegado a este endpoint (403 Forbidden).');
      return Promise.reject(error);
    }

    // Si es 401 (Unauthorized): Verificar si el token realmente expiró antes de desloguear
    if (status === 401) {
      const token = localStorage.getItem('token');
      let expired = true;
      if (token) {
        try {
          const payload = jwtDecode(token);
          // Si el token aún no ha alcanzado su timestamp de expiración (exp)
          if (payload.exp && Date.now() < payload.exp * 1000) {
            expired = false;
          }
        } catch {
          expired = true;
        }
      }

      if (expired && window.location.pathname !== '/login') {
        console.warn('Sesión expirada (401 Unauthorized). Redirigiendo a login...');
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Helpers para token
export const getStoredToken = () => {
  return localStorage.getItem('token');
};

export const setStoredToken = (token) => {
  if (token) {
    localStorage.setItem('token', token.trim());
  } else {
    localStorage.removeItem('token');
  }
};

// Helper para obtener el usuario autenticado
export const getLoggedUser = () => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      const payloadData = jwtDecode(token);

      return {
        id: payloadData.id,
        email: payloadData.sub,
        rol: payloadData.roles ? payloadData.roles[0] : null
      };
    }
  } catch (e) {
    console.error('Error extrayendo usuario del token JWT:', e);
  }

  // Fallback de seguridad en caso de que no haya token o sea inválido
  return null;
};

// Helper para obtener el ID del profesor actual
export const getProfesorId = () => {
  const user = getLoggedUser();
  return user?.idProfesor || user?.id || null;
};

export default api;
