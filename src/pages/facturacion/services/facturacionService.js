import api from '../../../services/api';

/**
 * Servicios del microservicio de facturación (cursillo-ms-facturas).
 * Todas las rutas salen por el API Gateway: /api/conceptos, /api/facturas, etc.
 */

// Spring devuelve las páginas con el formato clásico (totalPages en la raíz)
// o con el formato PagedModel (dentro de "page"). Se aceptan los dos.
const leerPagina = (data) => {
    const content = Array.isArray(data) ? data : data?.content ?? [];
    return {
        content,
        totalPages: data?.totalPages ?? data?.page?.totalPages ?? 1,
        totalElements: data?.totalElements ?? data?.page?.totalElements ?? content.length,
    };
};

/**
 * Convierte un error de axios en un mensaje que explica qué pasó y cómo seguir.
 */
export const mensajeDeError = (err) => {
    const status = err?.response?.status;
    if (status === 401) {
        return 'Falta un token válido o ya venció. Configurá un token JWT con el botón de arriba.';
    }
    if (status === 403) {
        return 'Tu rol no tiene permiso para esta acción. Probá con un token de secretaría.';
    }
    if (err?.message === 'Network Error') {
        return 'No se pudo conectar con el gateway (puerto 8084). Verificá que Eureka, el microservicio y el gateway estén corriendo.';
    }
    return err?.response?.data?.message || err?.message || 'Ocurrió un error inesperado.';
};

/* ==========================================
 * CONCEPTOS  ->  /api/conceptos
 * ========================================== */

export const listarConceptos = async ({ page = 0, size = 10, nombre = '' } = {}) => {
    const texto = nombre.trim();
    if (texto) {
        const { data } = await api.get('/conceptos/search', { params: { page, size, nombre: texto } });
        return leerPagina(data);
    }
    const { data } = await api.get('/conceptos', { params: { page, size } });
    return leerPagina(data);
};

export const crearConcepto = async (datos) => {
    const { data } = await api.post('/conceptos', datos);
    return data;
};

export const actualizarConcepto = async (id, datos) => {
    const { data } = await api.put(`/conceptos/${id}`, datos);
    return data;
};

export const eliminarConcepto = async (id) => {
    await api.delete(`/conceptos/${id}`);
};

/* ==========================================
 * FACTURAS  ->  /api/facturas
 * ========================================== */

// q busca en: nombre del alumno, RUC, N° de factura, fecha y total
export const listarFacturas = async ({ page = 0, size = 10, q = '', metodoPago = '' } = {}) => {
    const params = { page, size };
    const texto = q.trim();
    if (texto) params.q = texto;
    if (metodoPago) params.metodoPago = metodoPago;
    const { data } = await api.get('/facturas/search', { params });
    return leerPagina(data);
};

export const crearFactura = async (datos) => {
    const { data } = await api.post('/facturas', datos);
    return data;
};

export const actualizarFactura = async (id, datos) => {
    const { data } = await api.put(`/facturas/${id}`, datos);
    return data;
};

export const eliminarFactura = async (id) => {
    await api.delete(`/facturas/${id}`);
};