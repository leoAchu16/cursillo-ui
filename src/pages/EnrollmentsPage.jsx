import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { SearchInput } from "../components/SearchInput";
import { Table } from "../components/Table";
import { Modal } from "../components/Modal";
import { ConfirmModal } from "../components/ConfirmModal";
import { Spinner } from "../components/Spinner";
import { listarInscripcionesPaginado, eliminarInscripcion, listarDescuentos, aplicarDescuento } from "../services/inscripcionesService";
import { listarAlumnosPaginado } from "../services/usuariosService";
import { obtenerMateria, obtenerExamen } from "../services/notasService";
import { mensajeDeError } from "../services/api";

// Filas por página (= size enviado al backend), igual que en Alumnos y Materias
const INSCRIPCIONES_POR_PAGINA = 8;

// Se cargan todos los alumnos de una vez para traducir idAlumno -> nombre
const MAX_ALUMNOS = 1000;

// Valor a mostrar cuando un campo viene vacío
const SIN_DATO = '—';

const ESTADOS_PAGO = ['PENDIENTE', 'PAGADO'];

const LABEL_CLASS = "block text-xs font-bold text-gray-600 tracking-wider uppercase mb-2";

// Mismos colores que los badges de Table
const BADGE_ESTADO = { PAGADO: 'badge badge-success', PENDIENTE: 'badge badge-warning' };
const BADGE_TIPO = { MATERIA: 'badge badge-info', EXAMEN: 'badge badge-purple' };

/**
 * "2026-11-17" -> "17/11/2026".
 * Se arma a mano en vez de usar new Date(): new Date("2026-11-17") se interpreta
 * como medianoche UTC y en Paraguay (UTC-3) se mostraría el día anterior.
 */
const formatearFecha = (fecha) => {
    if (!fecha) return SIN_DATO;
    const [anio, mes, dia] = String(fecha).slice(0, 10).split('-');
    return anio && mes && dia ? `${dia}/${mes}/${anio}` : String(fecha);
};

const formatearMonto = (monto) =>
    monto === undefined || monto === null ? SIN_DATO : `Gs. ${Number(monto).toLocaleString("es-PY")}`;

// Clave para el diccionario de nombres de ítems del detalle
const claveItem = (det) =>
    det.tipoInscripcion === 'EXAMEN' ? `EXAMEN-${det.idExamen}` : `MATERIA-${det.idMateria}`;

const nombrePorDefecto = (det) =>
    det.tipoInscripcion === 'EXAMEN' ? `Examen #${det.idExamen}` : `Materia #${det.idMateria}`;

export const EnrollmentsPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Datos y paginación
    const [inscripciones, setInscripciones] = useState([]);
    const [alumnos, setAlumnos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0); // 0-based, como lo espera Spring
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);
    const [busqueda, setBusqueda] = useState("");   // lo que se escribe en el input
    const [filtro, setFiltro] = useState("");       // lo que se manda al backend (con debounce)
    // Con /inscripciones?estado=PENDIENTE se abre con ese filtro ya elegido
    const [estado, setEstado] = useState(() =>
        ESTADOS_PAGO.includes(searchParams.get("estado")) ? searchParams.get("estado") : "");
    const [recarga, setRecarga] = useState(0);      // incrementarlo vuelve a pedir la página actual

    // Modal de detalle
    const [inscripcionVer, setInscripcionVer] = useState(null);
    const [nombresItems, setNombresItems] = useState({});
    const [cargandoNombres, setCargandoNombres] = useState(false);
    const detalleRequestId = useRef(0); // descarta respuestas de un detalle que ya se cerró o cambió

    // Modal de descuento
    const [inscripcionDescuento, setInscripcionDescuento] = useState(null);
    const [descuentos, setDescuentos] = useState(null); // se piden al abrir el modal por primera vez
    const [idDescuentoElegido, setIdDescuentoElegido] = useState("");
    const [aplicando, setAplicando] = useState(false);

    // Modal de eliminación
    const [inscripcionEliminar, setInscripcionEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(false);

    const headers = ['Alumno', 'Fecha', 'Total', 'Estado', 'Acciones'];

    // Alumnos: una sola vez al entrar, para mostrar el nombre de cada inscripción.
    // Si fallan, la tabla se sigue mostrando con "Alumno #id".
    useEffect(() => {
        let ignore = false;
        listarAlumnosPaginado({ page: 0, size: MAX_ALUMNOS })
            .then((data) => { if (!ignore) setAlumnos(data.content); })
            .catch((err) => {
                if (ignore) return;
                console.error("Error al cargar alumnos:", err);
                toast.warning("No se pudieron cargar los nombres de los alumnos.");
            });
        return () => { ignore = true; };
    }, []);

    // La búsqueda espera un momento antes de consultar, para no pedir en cada tecla
    useEffect(() => {
        const espera = setTimeout(() => {
            setFiltro(busqueda);
            setPage(0);
        }, 400);
        return () => clearTimeout(espera);
    }, [busqueda]);

    // Inscripciones: se vuelven a pedir al cambiar de página, de filtro o al forzar una recarga
    useEffect(() => {
        // Evita actualizar el estado con una respuesta vieja (cambio rápido de página,
        // desmontaje del componente o doble ejecución de StrictMode)
        let ignore = false;

        const cargar = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await listarInscripcionesPaginado({ page, size: INSCRIPCIONES_POR_PAGINA, nombre: filtro, estado });
                if (ignore) return;
                setInscripciones(data.content);
                setTotalPages(Math.max(1, data.totalPages));
                setTotalElements(data.totalElements);
            } catch (err) {
                if (ignore) return;
                console.error("Error al cargar inscripciones:", err);
                const mensaje = err.response?.status === 403
                    ? "No tenés permisos para ver las inscripciones"
                    : "No se pudieron cargar las inscripciones";
                setInscripciones([]);
                setError(mensaje);
                toast.error(mensaje);
            } finally {
                if (!ignore) setLoading(false);
            }
        };
        cargar();

        return () => { ignore = true; };
    }, [page, filtro, estado, recarga]);

    // Diccionario idUsuario -> nombre del alumno
    const alumnosPorId = Object.fromEntries(alumnos.map(a => [a.idUsuario, a.nombre]));
    const nombreAlumno = (idAlumno) => alumnosPorId[idAlumno] || `Alumno #${idAlumno ?? SIN_DATO}`;

    // ---------------------------------- DETALLE ---------------------------------

    // Abre el detalle y resuelve en paralelo los nombres de sus materias y exámenes.
    // Si alguno falla, se muestra "Materia #id" / "Examen #id".
    const abrirDetalle = async (inscripcion) => {
        const requestId = ++detalleRequestId.current;
        setInscripcionVer(inscripcion);
        setNombresItems({});

        const detalles = inscripcion.detallesInscripcion || [];
        if (detalles.length === 0) return;

        setCargandoNombres(true);
        const resultados = await Promise.all(detalles.map(async (det) => {
            try {
                if (det.tipoInscripcion === 'EXAMEN' && det.idExamen) {
                    const examen = await obtenerExamen(det.idExamen);
                    return [claveItem(det), examen?.titulo];
                }
                if (det.idMateria) {
                    const materia = await obtenerMateria(det.idMateria);
                    return [claveItem(det), materia?.nombreMateria];
                }
            } catch (err) {
                console.warn("No se pudo obtener el nombre del ítem:", det, err);
            }
            return null;
        }));

        if (detalleRequestId.current !== requestId) return;
        setNombresItems(Object.fromEntries(resultados.filter(r => r && r[1])));
        setCargandoNombres(false);
    };

    const cerrarDetalle = () => {
        detalleRequestId.current++;
        setInscripcionVer(null);
        setCargandoNombres(false);
    };

    // --------------------------------- ELIMINAR ---------------------------------

    const pedirEliminar = (inscripcion) => {
        // El backend rechaza borrar inscripciones pagadas; avisamos antes de abrir el modal
        if (inscripcion.estadoPago === 'PAGADO') {
            toast.warning("No se puede eliminar una inscripción pagada.");
            return;
        }
        setInscripcionEliminar(inscripcion);
    };

    const handleEliminar = async () => {
        setEliminando(true);
        try {
            await eliminarInscripcion(inscripcionEliminar.idInscripcion);
            toast.success("Inscripción eliminada correctamente.");
            setInscripcionEliminar(null);
            // Si era la última de la página, volvemos a la anterior
            if (inscripciones.length === 1 && page > 0) {
                setPage(p => p - 1);
            } else {
                setRecarga(r => r + 1);
            }
        } catch (err) {
            console.error("Error al eliminar inscripción:", err);
            const mensaje = err.response?.status === 403
                ? "No tenés permisos para eliminar inscripciones."
                : mensajeDeError(err, "No se pudo eliminar la inscripción.");
            toast.error(mensaje);
        } finally {
            setEliminando(false);
        }
    };

    // -------------------------------- DESCUENTO ---------------------------------

    const abrirDescuento = async (inscripcion) => {
        setInscripcionDescuento(inscripcion);
        setIdDescuentoElegido(inscripcion.idDescuento != null ? String(inscripcion.idDescuento) : "");
        if (descuentos) return;
        try {
            setDescuentos(await listarDescuentos({ size: 1000 }));
        } catch (err) {
            console.error("Error al cargar descuentos:", err);
            toast.error("No se pudieron cargar los descuentos.");
            setInscripcionDescuento(null);
        }
    };

    const cerrarDescuento = () => {
        if (aplicando) return;
        setInscripcionDescuento(null);
    };

    // Los costos se guardan sin descuento: el descuento se aplica sobre su suma (igual que el backend)
    const subtotalDescuento = (inscripcionDescuento?.detallesInscripcion || []).reduce((acc, d) => acc + (d.costo ?? 0), 0);
    const descuentoElegido = (descuentos || []).find((d) => String(d.idDescuento) === idDescuentoElegido);
    // El que ya tenía puede haberse eliminado: sigue apareciendo, pero no se conoce su porcentaje
    const actualEliminado = inscripcionDescuento?.idDescuento != null
        && descuentos && !descuentos.some((d) => d.idDescuento === inscripcionDescuento.idDescuento);
    const sinCambios = idDescuentoElegido === (inscripcionDescuento?.idDescuento != null ? String(inscripcionDescuento.idDescuento) : "");
    const montoDescuento = descuentoElegido ? Math.floor((subtotalDescuento * descuentoElegido.porcentaje) / 100) : 0;
    const totalNuevo = sinCambios ? inscripcionDescuento?.total : Math.max(0, subtotalDescuento - montoDescuento);

    const guardarDescuento = async () => {
        setAplicando(true);
        try {
            await aplicarDescuento(inscripcionDescuento.idInscripcion, idDescuentoElegido ? Number(idDescuentoElegido) : null);
            toast.success(idDescuentoElegido ? "Descuento aplicado." : "Descuento quitado.");
            setInscripcionDescuento(null);
            setRecarga(r => r + 1);
        } catch (err) {
            console.error("Error al aplicar el descuento:", err);
            toast.error(mensajeDeError(err, "No se pudo aplicar el descuento."));
        } finally {
            setAplicando(false);
        }
    };

    // ---------------------------------- TABLA -----------------------------------

    // Filas para la tabla: mismo orden que inscripciones, así el índice identifica a la inscripción
    // InscripcionDTO: { idInscripcion, idAlumno, fechaInscripcion, total, estadoPago, detallesInscripcion[] }
    const filas = inscripciones.map(i => [
        nombreAlumno(i.idAlumno),
        formatearFecha(i.fechaInscripcion),
        formatearMonto(i.total),
        i.estadoPago || SIN_DATO
    ]);

    const tableActions = [
        { type: 'view', title: 'Ver', onClick: (_, index) => abrirDetalle(inscripciones[index]) },
        {
            type: 'invoice',
            title: 'Facturar',
            show: (_, index) => inscripciones[index].estadoPago === 'PENDIENTE',
            onClick: (_, index) => {
                const { idAlumno, idInscripcion } = inscripciones[index];
                navigate(`/facturas/nueva?alumno=${idAlumno}&inscripcion=${idInscripcion}`);
            }
        },
        {
            type: 'discount',
            title: 'Aplicar descuento',
            show: (_, index) => inscripciones[index].estadoPago === 'PENDIENTE',
            onClick: (_, index) => abrirDescuento(inscripciones[index])
        },
        { type: 'delete', title: 'Eliminar', onClick: (_, index) => pedirEliminar(inscripciones[index]) }
    ];

    const detalles = inscripcionVer?.detallesInscripcion || [];

    return (
        <div className="container-page">
            <div className="flex flex-col mt-[24px]">
                <h1>Inscripciones</h1>
                <h2>Gestión de inscripciones de alumnos a materias o exámenes</h2>
            </div>

            <div className="flex flex-row justify-between items-center gap-4">
                <div className="flex flex-row items-center gap-3">
                    <SearchInput
                        placeholder="Buscar por nombre del alumno"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                    <select
                        value={estado}
                        onChange={(e) => { setEstado(e.target.value); setPage(0); }}
                        aria-label="Filtrar por estado de pago"
                        className="px-3 py-2.5 rounded-xl border border-(--borderColor-input) bg-white text-sm text-gray-700 focus:outline-none focus:border-(--btnColor-primary) shadow-sm"
                    >
                        <option value="">Todos los estados</option>
                        {ESTADOS_PAGO.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>
                <button className="btn-primary cursor-pointer" onClick={() => navigate('/inscripciones/nueva')}>
                    <i className="icon-[heroicons--plus] text-white mr-2"></i>
                    Nueva inscripción
                </button>
            </div>

            <Table
                headers={headers}
                data={filas}
                actions={tableActions}
                loading={loading}
                emptyMessage={error || "No se encontraron inscripciones"}
                currentPage={page + 1}
                totalPages={totalPages}
                totalElements={totalElements}
                onPrevPage={() => setPage(p => Math.max(0, p - 1))}
                onNextPage={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            />

            {/* ------------------------------ DETALLE ---------------------------- */}
            <Modal
                isOpen={Boolean(inscripcionVer)}
                onClose={cerrarDetalle}
                title={`Inscripción #${inscripcionVer?.idInscripcion ?? ''}`}
                size="md"
                closeOnBackdrop
            >
                <div className="p-6 bg-(--bgColor-main) flex flex-col gap-5 text-sm">
                    <dl className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <dt className={LABEL_CLASS}>Alumno</dt>
                            <dd className="text-slate-800">{inscripcionVer && nombreAlumno(inscripcionVer.idAlumno)}</dd>
                        </div>
                        <div>
                            <dt className={LABEL_CLASS}>Fecha</dt>
                            <dd className="text-slate-800">{formatearFecha(inscripcionVer?.fechaInscripcion)}</dd>
                        </div>
                        <div>
                            <dt className={LABEL_CLASS}>Estado</dt>
                            <dd>
                                {inscripcionVer?.estadoPago
                                    ? <span className={BADGE_ESTADO[inscripcionVer.estadoPago] || 'badge'}>{inscripcionVer.estadoPago}</span>
                                    : SIN_DATO}
                            </dd>
                        </div>
                    </dl>

                    <div>
                        <span className={`${LABEL_CLASS} flex items-center gap-2`}>
                            Ítems inscriptos ({detalles.length})
                            {cargandoNombres && <Spinner className="h-3.5 w-3.5 text-(--btnColor-primary)" />}
                        </span>
                        {detalles.length > 0 ? (
                            <ul className="divide-y divide-slate-100 border border-(--borderColor-input) rounded-xl overflow-hidden max-h-48 overflow-y-auto bg-white">
                                {detalles.map((det, idx) => (
                                    <li key={det.idDetalleInscripcion ?? idx} className="p-3 flex justify-between items-center gap-3">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className={BADGE_TIPO[det.tipoInscripcion] || 'badge'}>
                                                {det.tipoInscripcion || SIN_DATO}
                                            </span>
                                            <span className="text-slate-800 truncate">
                                                {nombresItems[claveItem(det)] || nombrePorDefecto(det)}
                                            </span>
                                        </div>
                                        <span className="font-semibold text-slate-700 shrink-0">{formatearMonto(det.costo)}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-slate-500">La inscripción no tiene ítems.</p>
                        )}
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-(--borderColor-input)">
                        <span className="font-bold text-slate-800">Total</span>
                        <span className="text-lg font-extrabold text-(--btnColor-primary)">{formatearMonto(inscripcionVer?.total)}</span>
                    </div>
                </div>
                <div className="px-6 py-4 bg-white border-t border-(--borderColor-input) flex justify-end">
                    <button type="button" className="btn-primary cursor-pointer" onClick={cerrarDetalle}>
                        Cerrar
                    </button>
                </div>
            </Modal>

            {/* ----------------------------- DESCUENTO ---------------------------- */}
            <Modal
                isOpen={Boolean(inscripcionDescuento)}
                onClose={cerrarDescuento}
                title="Aplicar descuento"
                size="md"
            >
                <div className="p-6 bg-(--bgColor-main) flex flex-col gap-4 text-sm">
                    <p className="text-slate-700">
                        Inscripción <b>#{inscripcionDescuento?.idInscripcion}</b> de <b>{inscripcionDescuento && nombreAlumno(inscripcionDescuento.idAlumno)}</b>
                    </p>
                    <div>
                        <label htmlFor="descuentoAplicar" className={LABEL_CLASS}>Descuento</label>
                        <select
                            id="descuentoAplicar"
                            value={idDescuentoElegido}
                            onChange={(e) => setIdDescuentoElegido(e.target.value)}
                            disabled={!descuentos || aplicando}
                            className="w-full px-3 py-2 rounded-lg border border-(--borderColor-input) bg-white text-sm focus:outline-none focus:border-(--btnColor-primary)"
                        >
                            <option value="">Sin descuento</option>
                            {actualEliminado && (
                                <option value={inscripcionDescuento.idDescuento}>Descuento actual (ya eliminado)</option>
                            )}
                            {(descuentos || []).map((d) => (
                                <option key={d.idDescuento} value={d.idDescuento}>{d.nombre} ({d.porcentaje} %)</option>
                            ))}
                        </select>
                        {!descuentos && (
                            <p className="mt-1.5 text-xs text-gray-500 flex items-center gap-2">
                                <Spinner className="h-3.5 w-3.5 text-(--btnColor-primary)" /> Cargando descuentos...
                            </p>
                        )}
                    </div>
                    <div className="flex flex-col gap-1 pt-3 border-t border-(--borderColor-input)">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500">Subtotal</span>
                            <span className="font-semibold text-slate-700">{formatearMonto(subtotalDescuento)}</span>
                        </div>
                        {!sinCambios && descuentoElegido && (
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">{descuentoElegido.nombre} ({descuentoElegido.porcentaje} %)</span>
                                <span className="font-semibold text-slate-700">− {formatearMonto(montoDescuento)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-800">{sinCambios ? "Total actual" : "Nuevo total"}</span>
                            <span className="text-lg font-extrabold text-(--btnColor-primary)">{formatearMonto(totalNuevo)}</span>
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-white border-t border-(--borderColor-input) flex justify-end items-center gap-4">
                    <button
                        type="button"
                        onClick={cerrarDescuento}
                        disabled={aplicando}
                        className="text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors cursor-pointer disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={guardarDescuento}
                        disabled={!descuentos || sinCambios || aplicando}
                        className="btn-primary cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {aplicando && <Spinner className="h-4 w-4 text-white" />}
                        Guardar
                    </button>
                </div>
            </Modal>

            {/* ----------------------------- ELIMINAR ---------------------------- */}
            <ConfirmModal
                isOpen={Boolean(inscripcionEliminar)}
                onClose={() => setInscripcionEliminar(null)}
                onConfirm={handleEliminar}
                loading={eliminando}
                title="Eliminar inscripción"
                message={<>¿Seguro que querés eliminar la inscripción <b>#{inscripcionEliminar?.idInscripcion}</b> de <b>{inscripcionEliminar && nombreAlumno(inscripcionEliminar.idAlumno)}</b>?</>}
                warning="La inscripción dejará de aparecer en el listado."
                confirmText="Eliminar"
            />
        </div>
    );
};
