import api from './api';

/** ============================================================================
 *  SERVICIO DE INSCRIPCIONES
 *  ============================================================================ */

export const listarInscripciones = async (page = 0, size = 10, nombreAlumno = '') => {
  const params = { page, size };
  if (nombreAlumno && nombreAlumno.trim() !== '') {
    params.nombreAlumno = nombreAlumno.trim();
  }
  const response = await api.get('/inscripciones', { params });
  return response.data;
};

export const obtenerInscripcion = async (id) => {
  const response = await api.get(`/inscripciones/${id}`);
  return response.data;
};

export const crearInscripcion = async (dto) => {
  const response = await api.post('/inscripciones', dto);
  return response.data;
};

export const actualizarInscripcion = async (id, dto) => {
  const response = await api.put(`/inscripciones/${id}`, dto);
  return response.data;
};

export const eliminarInscripcion = async (id) => {
  const response = await api.delete(`/inscripciones/${id}`);
  return response.data;
};

/** ============================================================================
 *  SERVICIO DE ALUMNOS (Pendiente de Microservicio de Usuarios)
 *  ============================================================================ */

export const listarAlumnos = async () => {
  try {
    // Usamos la URL absoluta al puerto 8082 para saltarnos el API Gateway
    // que actualmente nos bloquea con un 404.
    const response = await api.get('http://localhost:8082/api/alumnos');
    return response.data;
  } catch (error) {
    console.error("Error al cargar alumnos:", error);
    return [];
  }
};

export default {
  listarInscripciones,
  obtenerInscripcion,
  crearInscripcion,
  actualizarInscripcion,
  eliminarInscripcion,
  listarAlumnos,
};