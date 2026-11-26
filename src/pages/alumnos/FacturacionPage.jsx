import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { SearchInput } from '../../components/SearchInput';
import { Table } from '../../components/Table';
import { Modal } from '../../components/Modal';
import { Spinner } from '../../components/Spinner';
import { ConfirmModal } from '../../components/ConfirmModal';
import { FacturaDetalleModal } from '../../components/FacturaDetalleModal';
import { codigoFactura, normalizarBusqueda } from '../../components/codigoFactura';
import { listarFacturas, METODOS_PAGO } from '../facturacion/services/facturacionService';
import { listarInscripcionesPaginado, eliminarInscripcion } from '../../services/inscripcionesService';
import { mensajeDeError } from '../../services/api';
import { listarMateriasPaginado, listarExamenesPaginado } from '../../services/notasService';

// Filas por página (= size enviado al backend), igual que en los demás listados
const FACTURAS_POR_PAGINA = 8;

// Inscripciones pendientes, materias y exámenes se cargan de una vez
const MAX_REGISTROS = 1000;

// Valor a mostrar cuando un campo viene vacío
const SIN_DATO = '—';

const BADGE_METODO = {
    EFECTIVO: 'badge badge-success',
    TARJETA: 'badge badge-info',
    TRANSFERENCIA: 'badge badge-purple',
};
const BADGE_TIPO = { MATERIA: 'badge badge-info', EXAMEN: 'badge badge-purple' };

// "2026-11-20" -> "20/11/2026". Sin new Date(), que correría un día por la zona horaria.
const formatearFecha = (fecha) => {
    if (!fecha) return SIN_DATO;
    const [anio, mes, dia] = String(fecha).slice(0, 10).split('-');
    return anio && mes && dia ? `${dia}/${mes}/${anio}` : String(fecha);
};

const formatearMonto = (monto) =>
    monto === undefined || monto === null ? SIN_DATO : `Gs. ${Number(monto).toLocaleString('es-PY')}`;

// Los costos se guardan sin descuento: el descuento es la diferencia con el total
const descuentoDe = (inscripcion) => {
    const costos = (inscripcion.detallesInscripcion || []).reduce((acc, det) => acc + (det.costo ?? 0), 0);
    return inscripcion.total == null ? 0 : Math.max(0, costos - inscripcion.total);
};

export const FacturacionPage = () => {
    const [busqueda, setBusqueda] = useState('');   // lo que se escribe en el input
    const [filtro, setFiltro] = useState('');       // lo que se manda al backend (con debounce)
    const [metodo, setMetodo] = useState('');
    const [facturas, setFacturas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0); // 0-based, como lo espera Spring
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);
    const [facturaVer, setFacturaVer] = useState(null);

    const [pendientes, setPendientes] = useState([]); // inscripciones sin pagar
    const [pendientesAbierto, setPendientesAbierto] = useState(false);
    const [nombres, setNombres] = useState(null); // "MATERIA-1" -> nombre; se piden al abrir el detalle
    const [cargandoNombres, setCargandoNombres] = useState(false);
    const [inscripcionCancelar, setInscripcionCancelar] = useState(null);
    const [cancelando, setCancelando] = useState(false);

    const headers = ['Código', 'RUC', 'Fecha', 'Método', 'Total', 'Acciones'];

    // La búsqueda espera un momento antes de consultar, para no pedir en cada tecla
    useEffect(() => {
        const espera = setTimeout(() => {
            setFiltro(busqueda);
            setPage(0);
        }, 400);
        return () => clearTimeout(espera);
    }, [busqueda]);

    // Facturas: se vuelven a pedir al cambiar de página o de filtros
    useEffect(() => {
        // Evita actualizar el estado con una respuesta vieja (cambio rápido de página,
        // desmontaje del componente o doble ejecución de StrictMode)
        let ignore = false;

        const cargar = async () => {
            setLoading(true);
            setError(null);
            try {
                // El backend devuelve solo las facturas del alumno logueado
                const data = await listarFacturas({
                    page,
                    size: FACTURAS_POR_PAGINA,
                    q: normalizarBusqueda(filtro),
                    metodoPago: metodo,
                });
                if (ignore) return;
                setFacturas(data.content);
                setTotalPages(Math.max(1, data.totalPages));
                setTotalElements(data.totalElements);
            } catch (err) {
                if (ignore) return;
                console.error('Error al cargar las facturas:', err);
                setFacturas([]);
                setError('No se pudieron cargar tus facturas');
                toast.error('No se pudieron cargar tus facturas.');
            } finally {
                if (!ignore) setLoading(false);
            }
        };
        cargar();

        return () => { ignore = true; };
    }, [page, filtro, metodo]);

    // Pagos pendientes: una sola vez al entrar. Si fallan, las facturas se siguen mostrando.
    useEffect(() => {
        let ignore = false;
        listarInscripcionesPaginado({
            page: 0, size: MAX_REGISTROS, estado: 'PENDIENTE', sort: 'fechaInscripcion,idInscripcion,asc',
        })
            .then((data) => { if (!ignore) setPendientes(data.content); })
            .catch((err) => {
                if (ignore) return;
                console.error('Error al cargar los pagos pendientes:', err);
                toast.warning('No se pudieron cargar tus pagos pendientes.');
            });
        return () => { ignore = true; };
    }, []);

    // ---------------------------- PAGOS PENDIENTES ------------------------------

    const totalPendiente = pendientes.reduce((acc, i) => acc + (i.total ?? 0), 0);

    const abrirPendientes = async () => {
        setPendientesAbierto(true);
        if (nombres || cargandoNombres) return;

        setCargandoNombres(true);
        const [materias, examenes] = await Promise.allSettled([
            listarMateriasPaginado({ page: 0, size: MAX_REGISTROS }),
            listarExamenesPaginado({ page: 0, size: MAX_REGISTROS }),
        ]);
        const cargados = {};
        (materias.value?.content ?? []).forEach((m) => { cargados[`MATERIA-${m.idMateria}`] = m.nombreMateria; });
        (examenes.value?.content ?? []).forEach((e) => { cargados[`EXAMEN-${e.idExamen}`] = e.titulo; });

        const fallo = [materias, examenes].some((r) => r.status === 'rejected');
        if (fallo) {
            console.error('Error al cargar los nombres:', materias.reason, examenes.reason);
            toast.warning('No se pudieron cargar los nombres de las materias y exámenes.', { id: 'nombres' });
        }
        // Si falló, no se guardan: al volver a abrir se reintenta
        setNombres(fallo ? null : cargados);
        setCargandoNombres(false);
    };

    // El detalle se cierra mientras se confirma (Escape cerraría los dos modales a la vez)
    const pedirCancelar = (inscripcion) => {
        setPendientesAbierto(false);
        setInscripcionCancelar(inscripcion);
    };

    const cerrarCancelar = () => {
        if (cancelando) return;
        setInscripcionCancelar(null);
        setPendientesAbierto(true);
    };

    const cancelarInscripcion = async () => {
        setCancelando(true);
        try {
            await eliminarInscripcion(inscripcionCancelar.idInscripcion);
            const quedan = pendientes.filter((i) => i.idInscripcion !== inscripcionCancelar.idInscripcion);
            setPendientes(quedan);
            setInscripcionCancelar(null);
            setPendientesAbierto(quedan.length > 0);
            toast.success('Inscripción cancelada.');
        } catch (err) {
            console.error('Error al cancelar la inscripción:', err);
            toast.error(mensajeDeError(err, 'No se pudo cancelar la inscripción.'));
        } finally {
            setCancelando(false);
        }
    };

    const nombreItem = (det) => {
        const esExamen = det.tipoInscripcion === 'EXAMEN';
        const id = esExamen ? det.idExamen : det.idMateria;
        return nombres?.[`${det.tipoInscripcion}-${id}`] || `${esExamen ? 'Examen' : 'Materia'} #${id}`;
    };

    // ---------------------------------- TABLA -----------------------------------

    // Mismo orden que facturas, así el índice identifica a la factura
    const filas = facturas.map((f) => [
        codigoFactura(f.idFactura),
        f.ruc || SIN_DATO,
        formatearFecha(f.fechaEmision),
        <span className={BADGE_METODO[f.metodoPago] || 'badge'}>{f.metodoPago || SIN_DATO}</span>,
        formatearMonto(f.total),
    ]);

    const tableActions = [
        { type: 'view', title: 'Ver', onClick: (_, index) => setFacturaVer(facturas[index]) },
    ];

    const mensajeVacio = filtro.trim() || metodo ? 'No se encontraron facturas' : 'Todavía no tenés facturas';

    return (
        <div className="container-page">
            <div className="flex flex-col mt-[24px]">
                <h1>Facturación</h1>
                <h2>Tus facturas y pagos pendientes</h2>
            </div>

            <div className="flex flex-row flex-wrap justify-between items-center gap-4">
                <div className="flex flex-row flex-wrap items-center gap-4">
                    <SearchInput
                        placeholder="Código, RUC, fecha o total"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                    <select
                        value={metodo}
                        onChange={(e) => { setMetodo(e.target.value); setPage(0); }}
                        aria-label="Filtrar por método de pago"
                        className="px-3 py-2.5 rounded-xl border border-(--borderColor-input) bg-white text-sm text-gray-700 focus:outline-none focus:border-(--btnColor-primary) shadow-sm"
                    >
                        <option value="">Todos los métodos</option>
                        {METODOS_PAGO.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>

                {pendientes.length > 0 && (
                    <div className="flex flex-row items-center gap-3 px-3 py-2.5 rounded-xl border border-yellow-400 bg-yellow-50 text-sm text-yellow-800">
                        <i className="icon-[heroicons--exclamation-triangle] text-lg shrink-0"></i>
                        <span>Pendiente de pago: <b>{formatearMonto(totalPendiente)}</b></span>
                        <button
                            type="button"
                            onClick={abrirPendientes}
                            className="font-bold text-(--btnColor-primary) hover:underline cursor-pointer whitespace-nowrap"
                        >
                            Ver detalle
                        </button>
                    </div>
                )}
            </div>

            {/* En pantallas angostas la tabla se desplaza dentro de su recuadro, no toda la página */}
            <div className="overflow-x-auto rounded-md [&>table]:w-full">
                <Table
                    headers={headers}
                    data={filas}
                    actions={tableActions}
                    loading={loading}
                    emptyMessage={error || mensajeVacio}
                    currentPage={page + 1}
                    totalPages={totalPages}
                    totalElements={totalElements}
                    onPrevPage={() => setPage((p) => Math.max(0, p - 1))}
                    onNextPage={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                />
            </div>

            <FacturaDetalleModal
                factura={facturaVer}
                onClose={() => setFacturaVer(null)}
                formatearFecha={formatearFecha}
                formatearMonto={formatearMonto}
                mostrarAlumno={false}
            />

            {/* ------------------------ PAGOS PENDIENTES ------------------------- */}
            <Modal
                isOpen={pendientesAbierto}
                onClose={() => setPendientesAbierto(false)}
                title="Pagos pendientes"
                size="md"
                closeOnBackdrop
            >
                <div className="p-6 bg-(--bgColor-main) flex flex-col gap-4 text-sm max-h-[60vh] overflow-y-auto">
                    {pendientes.map((i) => (
                        <div key={i.idInscripcion} className="border border-(--borderColor-input) rounded-xl bg-white shrink-0">
                            <div className="p-3 flex justify-between items-center border-b border-(--borderColor-input)">
                                <span className="font-bold text-slate-800 flex items-center gap-2">
                                    Inscripción #{i.idInscripcion}
                                    {cargandoNombres && <Spinner className="h-3.5 w-3.5 text-(--btnColor-primary)" />}
                                </span>
                                <span className="text-gray-500">{formatearFecha(i.fechaInscripcion)}</span>
                            </div>
                            <ul className="divide-y divide-slate-100">
                                {(i.detallesInscripcion || []).map((det, idx) => (
                                    <li key={det.idDetalleInscripcion ?? idx} className="p-3 flex justify-between items-center gap-3">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className={BADGE_TIPO[det.tipoInscripcion] || 'badge'}>{det.tipoInscripcion || SIN_DATO}</span>
                                            <span className="text-slate-800 truncate" title={nombreItem(det)}>{nombreItem(det)}</span>
                                        </div>
                                        <span className="font-semibold text-slate-700 shrink-0">{formatearMonto(det.costo)}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="p-3 flex flex-col gap-1 border-t border-(--borderColor-input)">
                                {descuentoDe(i) > 0 && (
                                    <div className="flex justify-between items-center gap-3">
                                        <span className="text-gray-500 truncate">
                                            {i.nombreDescuento ? `Descuento: ${i.nombreDescuento} (${i.porcentajeDescuento} %)` : 'Descuento'}
                                        </span>
                                        <span className="font-semibold text-slate-700 shrink-0">− {formatearMonto(descuentoDe(i))}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-slate-800">Total</span>
                                    <span className="font-bold text-slate-800">{formatearMonto(i.total)}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => pedirCancelar(i)}
                                    className="self-end mt-1 text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                                >
                                    Cancelar inscripción
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="px-6 py-4 bg-white border-t border-(--borderColor-input) flex justify-between items-center gap-3">
                    <span className="text-sm text-gray-500">Se paga en secretaría</span>
                    <span className="text-lg font-extrabold text-(--btnColor-primary)">{formatearMonto(totalPendiente)}</span>
                </div>
            </Modal>

            <ConfirmModal
                isOpen={Boolean(inscripcionCancelar)}
                onClose={cerrarCancelar}
                onConfirm={cancelarInscripcion}
                loading={cancelando}
                title="Cancelar inscripción"
                message={<>¿Cancelar la inscripción <b>#{inscripcionCancelar?.idInscripcion}</b> por <b>{formatearMonto(inscripcionCancelar?.total)}</b>?</>}
                warning="Se dan de baja todas sus materias y exámenes. Si te arrepentís, tenés que volver a inscribirte."
                confirmText="Cancelar inscripción"
                cancelText="Volver"
            />
        </div>
    );
};
