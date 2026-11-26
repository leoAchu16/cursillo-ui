import api from './api';

// Propaga los errores: cada página decide cómo informarlos al usuario
export const listarAlumnos = async () => {
  const response = await api.get('/usuarios', { params: { rol: 'ALUMNO' } });
  return response.data?.content || [];
};


export const listarAlumnosPaginado = async ({ page = 0, size = 20, nombre = '' } = {}) => {
  const params = { rol: 'ALUMNO', page, size };
  if (nombre && nombre.trim() !== '') {
    params.nombre = nombre.trim();
  }
  const { data } = await api.get('/usuarios', { params });
  const content = Array.isArray(data?.content) ? data.content : [];
  return {
    content,
    totalPages: data?.page?.totalPages ?? data?.totalPages ?? 1,
    totalElements: data?.page?.totalElements ?? data?.totalElements ?? content.length,
  };
};

// Lista profesores activos. Propaga los errores.
// Usar un `size` grande cuando se necesitan todos (ej. para un select o para traducir id -> nombre).
export const listarProfesores = async ({ size = 20 } = {}) => {
  const response = await api.get('/usuarios', { params: { rol: 'PROFESOR', page: 0, size } });
  return Array.isArray(response.data?.content) ? response.data.content : [];
};

/**
 * Actualiza un usuario (PUT /usuarios/{id}).
 * El backend REEMPLAZA todo: si falta `telefono` queda en null y si falta
 * `rolesAdicionales` se borran. Usar `armarUsuarioRequest` para no perder datos.
 */
export const actualizarUsuario = async (idUsuario, dto) => {
  const response = await api.put(`/usuarios/${idUsuario}`, dto);
  return response.data;
};

// Borrado lógico (DELETE /usuarios/{id}). Solo SECRETARIA. El usuario ya no puede iniciar sesión.
export const eliminarUsuario = async (idUsuario) => {
  await api.delete(`/usuarios/${idUsuario}`);
};

/**
 * Arma el UsuarioRequestDTO a partir del usuario actual (UsuarioResponseDTO) y los cambios.
 * Conserva el rol y los roles adicionales, que el backend exige / reemplaza.
 * No envía `contrasenha`: el backend la deja sin cambios cuando no viene.
 */
export const armarUsuarioRequest = (usuarioActual, { nombre, email, telefono }) => ({
  nombre: nombre.trim(),
  email: email.trim(),
  telefono: telefono.trim(),
  rol: usuarioActual.rol,
  // La respuesta trae `roles` = rol principal + adicionales
  rolesAdicionales: (usuarioActual.roles || []).filter((r) => r !== usuarioActual.rol),
});

// ---------- Perfil del usuario logueado (cualquier rol) ----------

// GET /usuarios/me: los datos del usuario del token
export const obtenerPerfil = async () => {
  const { data } = await api.get('/usuarios/me');
  return data;
};

// PUT /usuarios/me: solo nombre y teléfono. El email y el rol no se pueden cambiar.
export const actualizarPerfil = async ({ nombre, telefono }) => {
  const { data } = await api.put('/usuarios/me', { nombre: nombre.trim(), telefono: telefono.trim() });
  return data;
};

// PUT /usuarios/me/contrasenha: el backend exige la contraseña actual
export const cambiarContrasenha = async ({ contrasenhaActual, contrasenhaNueva }) => {
  await api.put('/usuarios/me/contrasenha', { contrasenhaActual, contrasenhaNueva });
};

export default {
  listarAlumnos,
  listarAlumnosPaginado,
  listarProfesores,
  actualizarUsuario,
  eliminarUsuario,
  armarUsuarioRequest,
};
