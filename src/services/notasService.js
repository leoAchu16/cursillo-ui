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

export const obtenerMateria = async (idMateria) => {
  const response = await api.get(`/materias/${idMateria}`);
  return response.data;
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

/**
 * ==========================================
 * SERVICIOS DE INSCRIPCIONES / ALUMNOS
 * ==========================================
 */

export const listarInscripcionesPorMateria = async (idMateria) => {
  try {
    const response = await api.get(`/inscripciones/materia/${idMateria}`);
    return response.data;
  } catch (error) {
    console.warn(`No se pudo obtener inscripciones para materia ${idMateria}:`, error?.message);
    throw error;
  }
};
