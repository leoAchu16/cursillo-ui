import api from '../../../services/api';

// Devuelve el nombre de la secretaria, o null si no se pudo obtener
export const obtenerSecretariaPorId = async (idSecretaria) => {
    try {
        const response = await api.get(`/usuarios/${idSecretaria}`);
        const nombre = `${response.data?.nombre ?? ''} ${response.data?.apellido ?? ''}`.trim();
        return nombre || null;
    } catch (error) {
        return null;
    }
};
