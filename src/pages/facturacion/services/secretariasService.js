import api from '../../../services/api';

// Devuelve el nombre de la secretaria, o null si no se pudo obtener
export const obtenerSecretariaPorId = async (idSecretaria) => {
    try {
        const response = await api.get(`/facturas/secretarias/${idSecretaria}`);
        return response.data?.nombre ?? null;
    } catch (error) {
        return null;
    }
};
