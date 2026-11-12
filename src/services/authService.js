import api, { setStoredToken, getLoggedUser } from './api';

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
     * verifica si hay sesion activa
     * @returns 
     */
    isAuthenticated: () => { return getLoggedUser() !== null; }
};