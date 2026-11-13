import api from '../../../services/api';

// Arma "Nombre Apellido" a partir de la respuesta de /usuarios/{id}
const nombreCompleto = (u) => `${u?.nombre ?? ''} ${u?.apellido ?? ''}`.trim();

export const obtenerAlumnoPorId = async (idAlumno) => {
    try {
        // Axios arma /api/usuarios/{id} y el gateway lo envía al microservicio de usuarios
        const response = await api.get(`/usuarios/${idAlumno}`);
        const nombre = nombreCompleto(response.data);

        return {
            idAlumno,
            nombre: nombre || `Alumno N° ${idAlumno}`,
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
