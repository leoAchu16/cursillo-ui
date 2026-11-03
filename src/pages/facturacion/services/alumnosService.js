import api from '../../../services/api';

export const obtenerAlumnoPorId = async (idAlumno) => {
    try {
        // Axios arma /api/facturas/alumnos/{id} y el gateway lo envía a facturación
        const response = await api.get(`/facturas/alumnos/${idAlumno}`);
        const data = response.data;

        return {
            idAlumno,
            nombre: data.nombre || `Alumno N° ${idAlumno}`,
            ruc: ''
        };
    } catch (error) {
        // Si falla, no bloqueamos la tabla de facturas
        return {
            idAlumno,
            nombre: `Alumno N° ${idAlumno}`,
            ruc: ''
        };
    }
};