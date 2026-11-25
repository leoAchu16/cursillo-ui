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

// Datos y reglas que comparten las pantallas de facturas
export const METODOS_PAGO = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'];
export const RUC_REGEX = /^\d{5,8}-\d$/;

// Se cobran solo a través de una inscripción y el backend los busca por su nombre:
// no se pueden renombrar, eliminar ni agregar a mano a una factura.
const CONCEPTOS_DE_INSCRIPCION = ['materia', 'examen'];
export const esConceptoDeInscripcion = (nombre) =>
    CONCEPTOS_DE_INSCRIPCION.includes((nombre ?? '').trim().toLowerCase());

// Fecha local de hoy como "2026-11-25" (toISOString usaría la fecha UTC)
export const fechaDeHoy = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
};

/* ==========================================
 * CONCEPTOS  ->  /api/conceptos
 * ========================================== */

// Siempre por nombre: sin un orden fijo, al editar un concepto puede cambiar de página
export const listarConceptos = async ({ page = 0, size = 10, nombre = '' } = {}) => {
    const params = { page, size, sort: 'nombre,idConcepto,asc' };
    const texto = nombre.trim();
    if (texto) {
        const { data } = await api.get('/conceptos/search', { params: { ...params, nombre: texto } });
        return leerPagina(data);
    }
    const { data } = await api.get('/conceptos', { params });
    return leerPagina(data);
};

/**
 * Devuelve el montoBase del concepto cuyo nombre coincide exactamente (sin distinguir
 * mayúsculas) con `nombre`, o null si no existe. Es el mismo criterio que usa
 * ms-inscripciones para obtener el costo por defecto ("materia" / "examen").
 */
export const obtenerPrecioConcepto = async (nombre) => {
    const { content } = await listarConceptos({ page: 0, size: 50, nombre });
    const concepto = content.find(c => c.nombre?.trim().toLowerCase() === nombre.toLowerCase());
    return concepto ? concepto.montoBase : null;
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

// Una factura emitida no se edita ni se elimina: solo se lista y se crea.
// q busca en: nombre del alumno, RUC, N° de factura, fecha y total
export const listarFacturas = async ({ page = 0, size = 10, q = '', metodoPago = '' } = {}) => {
    const params = { page, size };
    const texto = q.trim();
    if (texto) params.q = texto;
    if (metodoPago) params.metodoPago = metodoPago;
    const { data } = await api.get('/facturas/search', { params });
    return leerPagina(data);
};

// Lo facturado en el mes actual: { mes: "2026-11", cantidad, total }
export const obtenerResumenMes = async () => {
    const { data } = await api.get('/facturas/resumen-mes');
    return data;
};

export const crearFactura = async (datos) => {
    const { data } = await api.post('/facturas', datos);
    return data;
};
