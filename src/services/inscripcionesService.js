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

/**
 * Lista inscripciones activas paginadas. Devuelve { content, totalPages, totalElements }.
 * `nombre` filtra en el backend por nombre del alumno (contiene, sin distinguir mayúsculas)
 * y `estado` por estado de pago (PENDIENTE o PAGADO).
 * ms-inscripciones usa PageSerializationMode.VIA_DTO: los totales vienen dentro de `page`
 * ({ content, page: { size, number, totalElements, totalPages } }), no en la raíz.
 */
export const listarInscripcionesPaginado = async ({ page = 0, size = 20, nombre = '', estado = '', sort = '' } = {}) => {
  const params = { page, size };
  if (estado) params.estadoPago = estado;
  if (sort) params.sort = sort;
  if (nombre && nombre.trim() !== '') {
    params.nombreAlumno = nombre.trim();
  }
  const { data } = await api.get('/inscripciones', { params });
  const content = Array.isArray(data?.content) ? data.content : [];
  return {
    content,
    totalPages: data?.page?.totalPages ?? data?.totalPages ?? 1,
    totalElements: data?.page?.totalElements ?? data?.totalElements ?? content.length,
  };
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

/**
 * Lista descuentos (GET /descuentos, solo SECRETARIA). Devuelve el array de DescuentoDTO
 * { idDescuento, nombre, porcentaje, descripcion }.
 */
export const listarDescuentos = async ({ size = 100 } = {}) => {
  const { data } = await api.get('/descuentos', { params: { page: 0, size } });
  return Array.isArray(data?.content) ? data.content : [];
};

export default {
  listarInscripciones,
  listarDescuentos,
  listarInscripcionesPaginado,
  obtenerInscripcion,
  crearInscripcion,
  actualizarInscripcion,
  eliminarInscripcion,
};