import api from '../../../services/api';

// Lista de alumnos (solo nombre) para el select del formulario de factura
export const listarAlumnos = async (q = '') => {
    const { data } = await api.get('/facturas/alumnos', { params: { q } });
    return Array.isArray(data) ? data : [];
};

// Inscripciones del alumno que todavía están pendientes de pago
export const listarInscripcionesPendientes = async (idAlumno) => {
    const { data } = await api.get(`/facturas/alumnos/${idAlumno}/inscripciones-pendientes`);
    return Array.isArray(data) ? data : [];
};
