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
    // Un solo intento limpio al endpoint esperado
    const response = await api.get('/alumnos');
    return response.data;
  } catch (error) {
    console.warn('El endpoint público de alumnos no está disponible en el backend aún.');
    return []; // Retorna array vacío para que el combobox de la UI no explote
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