import axios from 'axios';

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
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.warn(`Respuesta de seguridad (${error.response.status}) del Gateway / Microservicio.`);
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
    const userStr = localStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
  } catch (e) {
    console.error('Error parseando usuario de localStorage:', e);
  }
  return { id: 1, idProfesor: 1, nombre: 'Profesor Titular', rol: 'profesor' };
};

// Helper para obtener el ID del profesor actual
export const getProfesorId = () => {
  const user = getLoggedUser();
  return user?.idProfesor || user?.id || 1;
};

export default api;
