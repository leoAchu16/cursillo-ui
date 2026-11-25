import api from '../../../services/api';

// Inscripciones del alumno que todavía están pendientes de pago, con sus ítems y su descuento
export const listarInscripcionesPendientes = async (idAlumno) => {
    const { data } = await api.get(`/facturas/alumnos/${idAlumno}/inscripciones-pendientes`);
    return Array.isArray(data) ? data : [];
};
