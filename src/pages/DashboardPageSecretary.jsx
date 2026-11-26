import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Table } from '../components/Table';
import { TarjetaResumen } from '../components/TarjetaResumen';
import { FacturaDetalleModal } from '../components/FacturaDetalleModal';
import { codigoFactura } from '../components/codigoFactura';
import { listarAlumnosPaginado } from '../services/usuariosService';
import { listarInscripcionesPaginado } from '../services/inscripcionesService';
import { listarFacturas, obtenerResumenMes } from './facturacion/services/facturacionService';

// Filas de cada tabla del panel
const FILAS = 5;

// Valor a mostrar cuando un dato viene vacío o no se pudo cargar
const SIN_DATO = '—';

// En pantallas angostas la tabla se desplaza dentro de su recuadro, no toda la página
const TABLA_CLASS = "overflow-x-auto rounded-md [&>table]:w-full";
const ENLACE_CLASS = "text-xs text-(--btnColor-primary) font-bold hover:underline cursor-pointer";

// "2026-11-20" -> "20/11/2026". Sin new Date(), que correría un día por la zona horaria.
const formatearFecha = (fecha) => {
    if (!fecha) return SIN_DATO;
    const [anio, mes, dia] = String(fecha).slice(0, 10).split('-');
    return anio && mes && dia ? `${dia}/${mes}/${anio}` : String(fecha);
};

const formatearMonto = (monto) =>
    monto === undefined || monto === null ? SIN_DATO : `Gs. ${Number(monto).toLocaleString('es-PY')}`;

// Cada consulta es independiente: si una falla, el resto del panel se muestra igual
const CONSULTAS = {
    alumnos: {
        nombre: 'los alumnos',
        pedir: () => listarAlumnosPaginado({ page: 0, size: 1 }),
    },
    pendientes: {
        nombre: 'las inscripciones pendientes',
        // Primero las más antiguas
        pedir: () => listarInscripcionesPaginado({
            page: 0, size: FILAS, estado: 'PENDIENTE', sort: 'fechaInscripcion,idInscripcion,asc',
        }),
    },
    facturas: {
        nombre: 'las facturas',
        pedir: () => listarFacturas({ page: 0, size: FILAS }),
    },
    mes: {
        nombre: 'lo facturado este mes',
        pedir: obtenerResumenMes,
    },
};

export const DashboardPageSecretary = () => {
    const navigate = useNavigate();

    const [datos, setDatos] = useState({}); // resultado de cada consulta; si falló, no está
    const [loading, setLoading] = useState(true);
    const [facturaVer, setFacturaVer] = useState(null); // factura abierta en el detalle

    useEffect(() => {
        // Evita actualizar el estado si se sale del panel o por la doble ejecución de StrictMode
        let ignore = false;

        const cargar = async () => {
            const claves = Object.keys(CONSULTAS);
            const resultados = await Promise.allSettled(claves.map((clave) => CONSULTAS[clave].pedir()));
            if (ignore) return;

            const cargados = {};
            const fallidos = [];
            resultados.forEach((resultado, i) => {
                if (resultado.status === 'fulfilled') {
                    cargados[claves[i]] = resultado.value;
                } else {
                    console.error(`Error al cargar ${CONSULTAS[claves[i]].nombre}:`, resultado.reason);
                    fallidos.push(CONSULTAS[claves[i]].nombre);
                }
            });
            setDatos(cargados);
            setLoading(false);
            // Un solo aviso, aunque fallen varias
            if (fallidos.length > 0) toast.error(`No se pudieron cargar ${fallidos.join(', ')}.`);
        };
        cargar();

        return () => { ignore = true; };
    }, []);

    // --------------------------------- TARJETAS ---------------------------------

    // "2026-11" -> "11/2026", como se escribe en el buscador de facturas
    const mesActual = datos.mes?.mes?.split('-').reverse().join('/');

    const tarjetas = [
        {
            titulo: 'Alumnos',
            valor: datos.alumnos?.totalElements ?? SIN_DATO,
            enlace: 'Ver alumnos',
            ruta: '/alumnos',
            icono: 'icon-[heroicons--academic-cap]',
        },
        {
            titulo: 'Pendientes de cobro',
            valor: datos.pendientes?.totalElements ?? SIN_DATO,
            enlace: 'Ver pendientes',
            ruta: '/inscripciones?estado=PENDIENTE',
            icono: 'icon-[heroicons--clock]',
        },
        {
            titulo: 'Facturas emitidas',
            valor: datos.facturas?.totalElements ?? SIN_DATO,
            enlace: 'Ver facturas',
            ruta: '/facturas',
            icono: 'icon-[heroicons--document-text]',
        },
        {
            titulo: 'Facturado este mes',
            valor: formatearMonto(datos.mes?.total),
            enlace: 'Ver detalle',
            ruta: mesActual ? `/facturas?q=${encodeURIComponent(mesActual)}` : '/facturas',
            icono: 'icon-[heroicons--banknotes]',
        },
    ];

    // ---------------------------------- TABLAS ----------------------------------

    // Mismo orden que las listas, así el índice identifica a cada fila
    const pendientes = datos.pendientes?.content ?? [];
    const filasPendientes = pendientes.map((i) => [
        i.nombreAlumno || `Alumno #${i.idAlumno}`,
        formatearFecha(i.fechaInscripcion),
        formatearMonto(i.total),
    ]);
    const accionesPendientes = [
        {
            type: 'invoice',
            title: 'Facturar',
            onClick: (_, index) => {
                const { idAlumno, idInscripcion } = pendientes[index];
                navigate(`/facturas/nueva?alumno=${idAlumno}&inscripcion=${idInscripcion}`);
            },
        },
    ];

    const facturas = datos.facturas?.content ?? [];
    const filasFacturas = facturas.map((f) => [
        codigoFactura(f.idFactura),
        f.nombreAlumno || `Alumno #${f.idAlumno}`,
        formatearMonto(f.total),
    ]);
    const accionesFacturas = [
        { type: 'view', title: 'Ver', onClick: (_, index) => setFacturaVer(facturas[index]) },
    ];

    return (
        <div className="container-page">
            <div className="flex flex-row justify-between items-end gap-4 mt-[24px]">
                <div className="flex flex-col">
                    <h1>Panel de Secretaría</h1>
                    <h2>Resumen general de alumnos, inscripciones y facturación</h2>
                </div>
                <div className="flex flex-row gap-3 shrink-0">
                    <button type="button" className="btn-primary" onClick={() => navigate('/inscripciones/nueva')}>
                        <i className="icon-[heroicons--plus] text-white mr-2"></i>
                        Nueva inscripción
                    </button>
                    <button type="button" className="btn-primary" onClick={() => navigate('/facturas/nueva')}>
                        <i className="icon-[heroicons--plus] text-white mr-2"></i>
                        Nueva factura
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {tarjetas.map((t) => <TarjetaResumen key={t.titulo} loading={loading} {...t} />)}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2 min-w-0">
                    <div className="flex items-center justify-between">
                        <h3>Pendientes de cobro</h3>
                        <button type="button" className={ENLACE_CLASS} onClick={() => navigate('/inscripciones?estado=PENDIENTE')}>
                            Ver todas
                        </button>
                    </div>
                    <div className={TABLA_CLASS}>
                        <Table
                            headers={['Alumno', 'Fecha', 'Total', 'Acciones']}
                            data={filasPendientes}
                            actions={accionesPendientes}
                            loading={loading}
                            emptyMessage={datos.pendientes ? 'No hay inscripciones pendientes de cobro' : 'No se pudieron cargar las inscripciones pendientes'}
                            showPagination={false}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-2 min-w-0">
                    <div className="flex items-center justify-between">
                        <h3>Últimas facturas</h3>
                        <button type="button" className={ENLACE_CLASS} onClick={() => navigate('/facturas')}>
                            Ver todas
                        </button>
                    </div>
                    <div className={TABLA_CLASS}>
                        <Table
                            headers={['Código', 'Alumno', 'Total', 'Acciones']}
                            data={filasFacturas}
                            actions={accionesFacturas}
                            loading={loading}
                            emptyMessage={datos.facturas ? 'Todavía no hay facturas' : 'No se pudieron cargar las facturas'}
                            showPagination={false}
                        />
                    </div>
                </div>
            </div>

            <FacturaDetalleModal
                factura={facturaVer}
                onClose={() => setFacturaVer(null)}
                formatearFecha={formatearFecha}
                formatearMonto={formatearMonto}
            />
        </div>
    );
};
