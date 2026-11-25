import api, { setStoredToken, getLoggedUser } from './api';

// Página de inicio de cada rol
const INICIO_POR_ROL = {
    SECRETARIA: '/',
    PROFESOR: '/profesor/dashboard',
    ALUMNO: '/alumno/tablero',
};

export const authService = {


    /**
     * registra un nuevo alumno
     * @param {*} normalizarBusqueda 
     * @param {*} email 
     * @param {*} contrasenha 
     * @param {*} telefono 
     * @returns 
     */
    register: async (nombre, email, contrasenha, telefono = '') => {
        const response = await api.post('/auth/register', {
            nombre,
            email,
            contrasenha,
            telefono
        });
        return response.data;
    },

    /**
     * Envia credenciales al backend y guarda el token si es exitoso
     * @param {*} email 
     * @param {*} contrasenha 
     * @returns 
     */
    login: async (email, contrasenha) => {
        const response = await api.post('/auth/login', { email, contrasenha });
        const { accessToken } = response.data;
        setStoredToken(accessToken);
        return getLoggedUser();
    },

    /**
     * Elimina el token almacenado, simulando el cierre de sesion
     */
    logout: () => { setStoredToken(null); },

    /**
     * retorna el usuario actual
     * @returns 
     */
    getCurrentUser: () => { return getLoggedUser(); },

    /**
     * retorna la ruta de inicio del usuario actual, o /login si no tiene un rol conocido
     * @returns
     */
    getRutaInicio: () => { return INICIO_POR_ROL[getLoggedUser()?.rol] || '/login'; },

    /**
     * verifica si hay sesion activa
     * @returns 
     */
    isAuthenticated: () => { return getLoggedUser() !== null; }
};