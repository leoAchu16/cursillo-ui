import api from './api';

/**
 * Servicio del dashboard de Secretaría.
 * Junta datos resumidos de varios microservicios, siempre a través del API Gateway.
 * Cada consulta es independiente: si una falla, las demás siguen funcionando.
 */

// Spring devuelve el total en la raíz (Page clásico) o dentro de "page" (PagedModel)
const totalDe = (data) => data?.totalElements ?? data?.page?.totalElements ?? data?.content?.length ?? 0;

const contenidoDe = (data) => (Array.isArray(data) ? data : data?.content ?? []);

// Convierte una promesa en { ok, valor } para no cortar el resto si una consulta falla
const seguro = async (promesa) => {
    try {
        return { ok: true, valor: await promesa };
    } catch {
        return { ok: false, valor: null };
    }
};

const mesActual = () => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
};

const cargarTotalAlumnos = async () => {
    const { data } = await api.get('/usuarios', { params: { rol: 'ALUMNO', size: 1 } });
    return totalDe(data);
};

const cargarTotalInscripciones = async () => {
    const { data } = await api.get('/inscripciones', { params: { page: 0, size: 1 } });
    return totalDe(data);
};

const cargarTotalFacturas = async () => {
    const { data } = await api.get('/facturas/search', { params: { page: 0, size: 1 } });
    return totalDe(data);
};

// Suma el total de las facturas emitidas este mes (la búsqueda por "YYYY-MM" coincide con la fecha)
const cargarFacturadoMes = async () => {
    const { data } = await api.get('/facturas/search', { params: { page: 0, size: 100, q: mesActual() } });
    return contenidoDe(data).reduce((suma, f) => suma + Number(f.total ?? 0), 0);
};

const cargarUltimasFacturas = async () => {
    const { data } = await api.get('/facturas/search', { params: { page: 0, size: 5 } });
    return contenidoDe(data);
};

// Mapa idAlumno -> "Nombre Apellido" para mostrar nombres y no IDs
const cargarNombresAlumnos = async () => {
    const { data } = await api.get('/usuarios', { params: { rol: 'ALUMNO', size: 200 } });
    const mapa = {};
    contenidoDe(data).forEach((a) => {
        const id = a.id ?? a.idUsuario ?? a.idAlumno;
        mapa[id] = `${a.nombre || ''} ${a.apellido || ''}`.trim();
    });
    return mapa;
};

/**
 * Devuelve todo lo que necesita el dashboard.
 * Los valores que no se pudieron obtener vienen en null (la pantalla muestra "-").
 */
export const cargarResumenSecretaria = async () => {
    const [alumnos, inscripciones, facturas, facturado, ultimas, nombres] = await Promise.all([
        seguro(cargarTotalAlumnos()),
        seguro(cargarTotalInscripciones()),
        seguro(cargarTotalFacturas()),
        seguro(cargarFacturadoMes()),
        seguro(cargarUltimasFacturas()),
        seguro(cargarNombresAlumnos()),
    ]);

    return {
        totalAlumnos: alumnos.valor,
        totalInscripciones: inscripciones.valor,
        totalFacturas: facturas.valor,
        facturadoMes: facturado.valor,
        ultimasFacturas: ultimas.valor ?? [],
        errorUltimas: !ultimas.ok,
        nombresAlumnos: nombres.valor ?? {},
    };
};
