import api from './api';

/**
 * ============================================================================
 * SERVICIO DE INSCRIPCIONES
 * Conexión con cursillo-ms-inscripciones (puerto 8081)
 * a través de API Gateway en http://localhost:8084/api/inscripciones
 * ============================================================================
 */

/**
 * Listar inscripciones con paginación y filtro opcional por nombre de alumno.
 * GET /inscripciones?page={page}&size={size}&nombreAlumno={nombreAlumno}
 * 
 * @param {number} page - Índice de la página (0-indexed para Spring Data)
 * @param {number} size - Cantidad de registros por página
 * @param {string} nombreAlumno - Nombre de alumno para filtrar (opcional)
 * @returns {Promise<Object>} Page<InscripcionDTO> con { content, totalPages, totalElements, number, size }
 */
export const listarInscripciones = async (page = 0, size = 10, nombreAlumno = '') => {
  const params = {
    page,
    size,
  };

  if (nombreAlumno && nombreAlumno.trim() !== '') {
    params.nombreAlumno = nombreAlumno.trim();
  }

  const response = await api.get('/inscripciones', { params });
  return response.data;
};

/**
 * Obtener una inscripción específica por su ID.
 * GET /inscripciones/{id}
 * 
 * @param {number|string} id - ID de la inscripción
 * @returns {Promise<Object>} InscripcionDTO
 */
export const obtenerInscripcion = async (id) => {
  const response = await api.get(`/inscripciones/${id}`);
  return response.data;
};

/**
 * Crear una nueva inscripción en el sistema.
 * POST /inscripciones
 * 
 * @param {Object} dto - InscripcionDTO:
 * {
 *   idAlumno: number,
 *   idSecretaria?: number,
 *   detallesInscripcion: [
 *     { idMateria?: number, idExamen?: number, tipo: 'MATERIA' | 'EXAMEN', costo?: number }
 *   ]
 * }
 * @returns {Promise<Object>} InscripcionDTO creada
 */
export const crearInscripcion = async (dto) => {
  const response = await api.post('/inscripciones', dto);
  return response.data;
};

/**
 * Actualizar una inscripción existente.
 * PUT /inscripciones/{id}
 * 
 * @param {number|string} id - ID de la inscripción
 * @param {Object} dto - InscripcionDTO actualizado
 * @returns {Promise<Object>} InscripcionDTO actualizada
 */
export const actualizarInscripcion = async (id, dto) => {
  const response = await api.put(`/inscripciones/${id}`, dto);
  return response.data;
};

/**
 * Borrado lógico de una inscripción.
 * DELETE /inscripciones/{id}
 * 
 * @param {number|string} id - ID de la inscripción a eliminar
 * @returns {Promise<any>}
 */
export const eliminarInscripcion = async (id) => {
  const response = await api.delete(`/inscripciones/${id}`);
  return response.data;
};

/**
 * Intento de listar alumnos desde endpoints disponibles en Gateway / Microservicios.
 * Si aún no está implementado en backend, retorna null.
 */
export const listarAlumnos = async () => {
  try {
    const response = await api.get('/alumnos');
    return response.data;
  } catch (e1) {
    try {
      const response2 = await api.get('/inscripciones/alumnos');
      return response2.data;
    } catch (e2) {
      console.warn('Endpoint público de alumnos no disponible aún en backend.', e2?.message);
      return null;
    }
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
