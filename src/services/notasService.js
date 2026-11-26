import api from './api';

/**
 * ==========================================
 * SERVICIOS DE MATERIAS
 * ==========================================
 */

/**
 * Obtiene las materias asignadas a un profesor (todas, en una página). Devuelve la página tal cual.
 * Si falla, el error llega a quien llama: antes se pedía /materias como alternativa
 * y el profesor terminaba viendo como propias las materias de todos.
 */
export const listarMateriasProfesor = async (idProfesor) => {
  if (!idProfesor) throw new Error('No se pudo identificar al profesor');
  const response = await api.get(`/materias/profesor/${idProfesor}`, { params: { page: 0, size: 1000 } });
  return response.data;
};

/**
 * Materias de un profesor paginadas, por nombre. Devuelve { content, totalPages, totalElements }.
 */
export const listarMateriasDeProfesor = async ({ idProfesor, page = 0, size = 20 } = {}) => {
  if (!idProfesor) throw new Error('No se pudo identificar al profesor');
  const { data } = await api.get(`/materias/profesor/${idProfesor}`, { params: { page, size, sort: 'nombreMateria,idMateria,asc' } });
  const content = Array.isArray(data?.content) ? data.content : [];
  return {
    content,
    totalPages: data?.page?.totalPages ?? data?.totalPages ?? 1,
    totalElements: data?.page?.totalElements ?? data?.totalElements ?? content.length,
  };
};

export const listarMaterias = async () => {
  const response = await api.get('/materias');
  return response.data;
};

/**
 * Lista materias activas paginadas. Devuelve { content, totalPages, totalElements }.
 * Sin `nombre` usa GET /materias; con `nombre` usa GET /materias/buscar (contiene, sin distinguir mayúsculas).
 * Acepta los dos formatos de Page de Spring: totales en la raíz o dentro de `page` (VIA_DTO).
 */
export const listarMateriasPaginado = async ({ page = 0, size = 20, nombre = '' } = {}) => {
  const filtro = nombre?.trim() || '';
  const url = filtro ? '/materias/buscar' : '/materias';
  const params = filtro ? { page, size, nombre: filtro } : { page, size };

  const { data } = await api.get(url, { params });
  const content = Array.isArray(data?.content) ? data.content : [];
  return {
    content,
    totalPages: data?.page?.totalPages ?? data?.totalPages ?? 1,
    totalElements: data?.page?.totalElements ?? data?.totalElements ?? content.length,
  };
};

export const obtenerMateria = async (idMateria) => {
  const response = await api.get(`/materias/${idMateria}`);
  return response.data;
};


export const crearMateria = async (materiaData) => {
  const response = await api.post('/materias', materiaData);
  return response.data;
};

/**
 * Actualiza una materia (PUT /materias/{id}). Solo SECRETARIA.
 * El backend copia el DTO con MapStruct: los campos que no se envían quedan en null,
 * así que siempre mandar { nombreMateria, idProfesor, dia, descripcion } completos.
 */
export const actualizarMateria = async (idMateria, materiaData) => {
  const response = await api.put(`/materias/${idMateria}`, materiaData);
  return response.data;
};

// Borrado lógico (DELETE /materias/{id}). Solo SECRETARIA.
export const eliminarMateria = async (idMateria) => {
  await api.delete(`/materias/${idMateria}`);
};

/**
 * ==========================================
 * SERVICIOS DE EXÁMENES
 * ==========================================
 */

export const listarExamenesPorMateria = async (idMateria) => {
  const response = await api.get(`/examenes/materia/${idMateria}`);
  return response.data;
};

/**
 * Lista exámenes activos paginados. Devuelve { content, totalPages, totalElements }.
 * Acepta los dos formatos de Page de Spring: totales en la raíz o dentro de `page` (VIA_DTO).
 */
export const listarExamenesPaginado = async ({ page = 0, size = 20 } = {}) => {
  const { data } = await api.get('/examenes', { params: { page, size } });
  const content = Array.isArray(data?.content) ? data.content : [];
  return {
    content,
    totalPages: data?.page?.totalPages ?? data?.totalPages ?? 1,
    totalElements: data?.page?.totalElements ?? data?.totalElements ?? content.length,
  };
};

export const obtenerExamen = async (idExamen) => {
  const response = await api.get(`/examenes/${idExamen}`);
  return response.data;
};

/**
 * Exámenes activos de una materia paginados. Devuelve { content, totalPages, totalElements }.
 */
export const listarExamenesDeMateria = async ({ idMateria, page = 0, size = 20 } = {}) => {
  const { data } = await api.get(`/examenes/materia/${idMateria}`, { params: { page, size } });
  const content = Array.isArray(data?.content) ? data.content : [];
  return {
    content,
    totalPages: data?.page?.totalPages ?? data?.totalPages ?? 1,
    totalElements: data?.page?.totalElements ?? data?.totalElements ?? content.length,
  };
};

/**
 * Crea un examen: { idMateria, titulo, fecha, hora: "18:00:00", totalPuntos }.
 * El profesor y el estado los define el backend; un profesor solo crea en sus materias.
 */
export const crearExamen = async (datosExamen) => {
  const response = await api.post('/examenes', datosExamen);
  return response.data;
};

/**
 * Edita título, fecha, hora y puntos. Con notas cargadas el backend no deja cambiar los puntos.
 */
export const actualizarExamen = async (idExamen, datosExamen) => {
  const response = await api.put(`/examenes/${idExamen}`, datosExamen);
  return response.data;
};

// Borrado lógico. Un profesor solo elimina exámenes de sus materias y sin notas
export const eliminarExamen = async (idExamen) => {
  await api.delete(`/examenes/${idExamen}`);
};

/**
 * ==========================================
 * SERVICIOS DE NOTAS / CALIFICACIONES
 * ==========================================
 */

/**
 * Lista las notas del alumno logueado (GET /notas/mias, solo ALUMNO).
 * Devuelve { content, totalPages, totalElements }.
 */
export const listarMisNotas = async ({ page = 0, size = 20, sort = '' } = {}) => {
  const params = { page, size };
  if (sort) params.sort = sort;
  const { data } = await api.get('/notas/mias', { params });
  const content = Array.isArray(data?.content) ? data.content : [];
  return {
    content,
    totalPages: data?.page?.totalPages ?? data?.totalPages ?? 1,
    totalElements: data?.page?.totalElements ?? data?.totalElements ?? content.length,
  };
};

/**
 * Notas activas paginadas (GET /notas). Un profesor o secretaria ve todas; un alumno, las suyas.
 * Devuelve { content, totalPages, totalElements }.
 */
export const listarNotasPaginado = async ({ page = 0, size = 20 } = {}) => {
  const { data } = await api.get('/notas', { params: { page, size } });
  const content = Array.isArray(data?.content) ? data.content : [];
  return {
    content,
    totalPages: data?.page?.totalPages ?? data?.totalPages ?? 1,
    totalElements: data?.page?.totalElements ?? data?.totalElements ?? content.length,
  };
};

/**
 * Todas las notas activas de un examen (GET /notas/buscar). Devuelve el array de NotaDTO.
 */
export const listarNotasDeExamen = async (idExamen) => {
  const { data } = await api.get('/notas/buscar', { params: { idExamen, page: 0, size: 1000 } });
  return Array.isArray(data?.content) ? data.content : [];
};

/**
 * Guarda las notas de un examen, todo o nada (PUT /examenes/{id}/notas).
 * cargas: [{ idAlumno, puntosCorrectos, ausente }]; un ausente va sin puntos.
 * El backend crea las que faltan, actualiza las existentes y calcula calificación y estado.
 */
export const cargarNotasDeExamen = async (idExamen, cargas) => {
  const { data } = await api.put(`/examenes/${idExamen}/notas`, cargas);
  return data;
};

// listarAlumnos y listarProfesores viven en usuariosService (consultan /usuarios)