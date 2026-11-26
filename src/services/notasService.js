import api from './api';

/**
 * ==========================================
 * SERVICIOS DE MATERIAS
 * ==========================================
 */

/**
 * Obtiene las materias asignadas a un profesor.
 * Si falla la ruta específica /materias/profesor/{idProfesor}, intenta /materias.
 */
export const listarMateriasProfesor = async (idProfesor) => {
  try {
    if (idProfesor) {
      const response = await api.get(`/materias/profesor/${idProfesor}`);
      return response.data;
    }
  } catch (error) {
    console.warn(`No se pudo obtener materias para profesor ${idProfesor}, intentando /materias general...`, error?.message);
  }

  // Fallback general a todas las materias
  const generalResponse = await api.get('/materias');
  return generalResponse.data;
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

export const crearExamen = async (datosExamen) => {
  const response = await api.post('/examenes', datosExamen);
  return response.data;
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

export const buscarNotasPorExamen = async (idExamen) => {
  const response = await api.get(`/notas/buscar`, {
    params: { idExamen },
  });
  return response.data;
};

/**
 * Guarda o actualiza un lote de calificaciones vía batch
 * PUT /api/notas/batch
 */
export const guardarNotas = async (listaDeNotas) => {
  const response = await api.put('/notas/batch', listaDeNotas);
  return response.data;
};

/**
 * Actualiza una calificación individual
 * PUT /api/notas/{id}
 */
export const actualizarNota = async (id, datos) => {
  const response = await api.put(`/notas/${id}`, datos);
  return response.data;
};

/** ==========================================
 *  SERVICIOS DE INSCRIPCIONES (Workaround Frontend)
 *  ========================================== */

export const listarInscripcionesPorMateria = async (idMateria) => {
  try {
    const response = await api.get(`/inscripciones`);
    const todasLasInscripciones = response.data.content || response.data || [];

    // Filtramos buscando si AL MENOS UN detalle tiene el idMateria que buscamos
    const filtradas = todasLasInscripciones.filter(inscripcion => {
      // Verificamos que tenga detalles y buscamos dentro del array
      if (!inscripcion.detallesInscripcion) return false;
      return inscripcion.detallesInscripcion.some(
        detalle => detalle.idMateria === Number(idMateria)
      );
    });

    return filtradas;
  } catch (error) {
    console.warn(`Error al filtrar inscripciones por materia:`, error?.message);
    return [];
  }
};



// listarAlumnos y listarProfesores viven en usuariosService (consultan /usuarios)