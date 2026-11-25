import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Combobox } from "../../components/Combobox";
import { Table } from "../../components/Table";
import { ConfirmModal } from "../../components/ConfirmModal";
import { Spinner } from "../../components/Spinner";
import { codigoFactura } from "../../components/codigoFactura";
import { listarAlumnosPaginado } from "../../services/usuariosService";
import { mensajeDeError } from "../../services/api";
import { crearFactura, listarConceptos, esConceptoDeInscripcion, METODOS_PAGO, RUC_REGEX, fechaDeHoy } from "./services/facturacionService";
import { listarInscripcionesPendientes } from "./services/opcionesFacturaService";

// Se cargan todas las opciones de una vez para los combos
const MAX_OPCIONES = 1000;

// Valor a mostrar cuando un campo viene vacío
const SIN_DATO = '—';

const INPUT_CLASS = "w-full px-3 py-2 rounded-lg border border-(--borderColor-input) bg-white text-sm focus:outline-none focus:border-(--btnColor-primary) disabled:bg-gray-100! disabled:text-gray-600 disabled:cursor-not-allowed";
const LABEL_CLASS = "block text-xs font-bold text-gray-600 tracking-wider uppercase mb-1";

// Mismo diseño que NewEnrollmentPage: tarjetas de igual altura y tabla con encabezado fijo
const CARD_CLASS = "card h-auto p-4 gap-3";
const TABLA_SCROLL_CLASS = "min-h-0 max-h-48 lg:max-h-none overflow-auto border-2 border-(--borderColor-input) rounded-md shadow-md "
    + "[&>table]:w-full [&>table]:border-0 [&>table]:rounded-none [&>table]:shadow-none [&>table]:overflow-visible "
    + "[&_th]:sticky [&_th]:top-0 [&_th]:z-10";

// "2026-11-20" -> "20/11/2026". Sin new Date(), que correría un día por la zona horaria.
const formatearFecha = (fecha) => {
    if (!fecha) return SIN_DATO;
    const [anio, mes, dia] = String(fecha).slice(0, 10).split('-');
    return anio && mes && dia ? `${dia}/${mes}/${anio}` : String(fecha);
};

const formatearMonto = (monto) =>
    monto === undefined || monto === null ? SIN_DATO : `Gs. ${Number(monto).toLocaleString("es-PY")}`;

const describirInscripcion = (i) =>
    [formatearFecha(i.fechaInscripcion), (i.conceptos || []).join(", "), formatearMonto(i.total)].filter(Boolean).join(" — ");

/**
 * Emite una factura que cobra una inscripción pendiente, otros conceptos, o ambas cosas.
 * Con /facturas/nueva?alumno=7&inscripcion=12 se abre con esos datos ya elegidos.
 * El backend arma las líneas de la inscripción y calcula el total: acá solo se muestran.
 */
export const NuevaFacturaPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Datos cargados del backend
    const [alumnos, setAlumnos] = useState([]);
    const [conceptos, setConceptos] = useState([]);
    const [pendientes, setPendientes] = useState([]); // inscripciones pendientes del alumno elegido
    const [loadingData, setLoadingData] = useState(true);
    const [loadingPendientes, setLoadingPendientes] = useState(false);

    // Formulario
    const [idAlumno, setIdAlumno] = useState(() => Number(searchParams.get("alumno")) || null);
    const [idInscripcion, setIdInscripcion] = useState("");
    const [ruc, setRuc] = useState("");
    const [metodoPago, setMetodoPago] = useState(METODOS_PAGO[0]);
    const [fechaEmision, setFechaEmision] = useState(fechaDeHoy);
    const [idConcepto, setIdConcepto] = useState(null);
    const [cantidad, setCantidad] = useState("1");
    const [otros, setOtros] = useState([]); // { idConcepto, nombre, precio, cantidad }
    const [confirmando, setConfirmando] = useState(false); // modal de confirmación abierto
    const [submitting, setSubmitting] = useState(false);

    // Inscripción pedida por la URL: se elige una sola vez, al cargar las pendientes del alumno
    const inscripcionPedida = useRef(Number(searchParams.get("inscripcion")) || null);

    // Alumnos y conceptos en paralelo: si una lista falla, la otra se muestra igual
    useEffect(() => {
        let ignore = false;

        const cargar = async () => {
            const [resAlumnos, resConceptos] = await Promise.allSettled([
                listarAlumnosPaginado({ page: 0, size: MAX_OPCIONES }),
                listarConceptos({ page: 0, size: MAX_OPCIONES }),
            ]);
            if (ignore) return;

            if (resAlumnos.status === "fulfilled") {
                setAlumnos(resAlumnos.value.content);
            } else {
                console.error("Error al cargar alumnos:", resAlumnos.reason);
                toast.warning("No se pudieron cargar los alumnos.");
            }
            if (resConceptos.status === "fulfilled") {
                setConceptos(resConceptos.value.content.filter(c => !esConceptoDeInscripcion(c.nombre)));
            } else {
                console.error("Error al cargar conceptos:", resConceptos.reason);
                toast.warning("No se pudieron cargar los conceptos.");
            }
            setLoadingData(false);
        };
        cargar();

        return () => { ignore = true; };
    }, []);

    // Inscripciones pendientes del alumno elegido
    useEffect(() => {
        if (idAlumno == null) return;
        // Si se cambia rápido de alumno, se descarta la respuesta del anterior
        let ignore = false;

        const cargar = async () => {
            setLoadingPendientes(true);
            try {
                const lista = await listarInscripcionesPendientes(idAlumno);
                if (ignore) return;
                setPendientes(lista);

                const pedida = inscripcionPedida.current;
                inscripcionPedida.current = null;
                if (pedida && lista.some(i => i.idInscripcion === pedida)) {
                    setIdInscripcion(String(pedida));
                } else if (pedida) {
                    toast.warning(`La inscripción #${pedida} ya no está pendiente de pago.`);
                } else if (lista.length === 1) {
                    // Si tiene una sola, queda elegida
                    setIdInscripcion(String(lista[0].idInscripcion));
                }
            } catch (err) {
                if (ignore) return;
                console.error("Error al cargar las inscripciones pendientes:", err);
                toast.error(mensajeDeError(err, "No se pudieron cargar las inscripciones pendientes."));
            } finally {
                if (!ignore) setLoadingPendientes(false);
            }
        };
        cargar();

        return () => { ignore = true; };
    }, [idAlumno]);

    // ----------------------------------- ALUMNO -------------------------------------

    const elegirAlumno = (id) => {
        if (id === idAlumno) return;
        inscripcionPedida.current = null;
        setIdAlumno(id);
        setIdInscripcion("");
        setPendientes([]);
        setLoadingPendientes(false);
    };

    const inscripcion = pendientes.find(i => String(i.idInscripcion) === idInscripcion);

    const textoSinInscripcion = () => {
        if (idAlumno == null) return "Elegí primero un alumno";
        if (loadingPendientes) return "Cargando...";
        return pendientes.length === 0 ? "Sin inscripciones pendientes" : "Sin inscripción";
    };

    // ------------------------------- OTROS CONCEPTOS --------------------------------

    const conceptoElegido = conceptos.find(c => c.idConcepto === idConcepto);

    const handleAgregar = () => {
        if (!conceptoElegido) {
            toast.warning("Seleccioná un concepto.");
            return;
        }
        const cant = Number(cantidad);
        if (!Number.isInteger(cant) || cant < 1) {
            toast.warning("La cantidad debe ser un número entero mayor o igual a 1.");
            return;
        }
        // Si el concepto ya está en la lista, se suma la cantidad
        setOtros(prev => prev.some(o => o.idConcepto === idConcepto)
            ? prev.map(o => o.idConcepto === idConcepto ? { ...o, cantidad: o.cantidad + cant } : o)
            : [...prev, { idConcepto, nombre: conceptoElegido.nombre, precio: conceptoElegido.montoBase ?? 0, cantidad: cant }]);
        setIdConcepto(null);
        setCantidad("1");
    };

    // ----------------------------------- TOTALES ------------------------------------

    // El descuento es solo de la inscripción: la diferencia entre sus costos y su total
    const subtotalInscripcion = inscripcion?.subtotal ?? 0;
    const montoDescuento = subtotalInscripcion - (inscripcion?.total ?? 0);
    const subtotalOtros = otros.reduce((acc, o) => acc + o.precio * o.cantidad, 0);
    const total = subtotalInscripcion - montoDescuento + subtotalOtros;

    // ----------------------------------- EMITIR -------------------------------------

    // Valida los datos y pide confirmación: una factura emitida no se puede modificar
    const handleRevisar = () => {
        if (idAlumno == null) {
            toast.warning("Seleccioná un alumno.");
            return;
        }
        if (!inscripcion && otros.length === 0) {
            toast.warning("Elegí una inscripción o agregá al menos un concepto.");
            return;
        }
        if (!RUC_REGEX.test(ruc.trim())) {
            toast.warning("Ingresá un RUC válido, por ejemplo 1234567-8.");
            return;
        }
        if (!fechaEmision || fechaEmision > fechaDeHoy()) {
            toast.warning("La fecha de emisión no puede estar vacía ni ser futura.");
            return;
        }
        setConfirmando(true);
    };

    const handleEmitir = async () => {
        setSubmitting(true);
        try {
            const creada = await crearFactura({
                idAlumno,
                ...(inscripcion ? { idInscripcion: inscripcion.idInscripcion } : {}),
                ruc: ruc.trim(),
                metodoPago,
                fechaEmision,
                detallesFactura: otros.map(o => ({ idConcepto: o.idConcepto, cantidad: o.cantidad })),
            });
            toast.success(`Factura ${codigoFactura(creada.idFactura)} emitida correctamente.`);
            navigate("/facturas");
        } catch (err) {
            console.error("Error al emitir la factura:", err);
            const mensaje = err.response?.status === 403
                ? "No tenés permisos para emitir facturas."
                : mensajeDeError(err, "No se pudo emitir la factura.");
            toast.error(mensaje);
            setConfirmando(false); // se vuelve al formulario, con los datos cargados
        } finally {
            setSubmitting(false);
        }
    };

    // Lo que se muestra en la confirmación
    const resumen = [
        ["Alumno", alumnos.find(a => a.idUsuario === idAlumno)?.nombre || `Alumno #${idAlumno}`],
        ["RUC", ruc.trim()],
        ["Método de pago", metodoPago],
        ["Fecha de emisión", formatearFecha(fechaEmision)],
        ["Inscripción", inscripcion ? `#${inscripcion.idInscripcion}` : SIN_DATO],
        ["Total", formatearMonto(total)],
    ];

    // ----------------------------------- TABLA --------------------------------------

    // Primero las líneas de la inscripción (no se pueden quitar) y después los otros conceptos
    const headers = ["Concepto", "Cantidad", "Precio", "Subtotal", "Acciones"];
    const lineasInscripcion = inscripcion?.detalles ?? [];
    const filas = [
        ...lineasInscripcion.map(d => [d.descripcion, 1, formatearMonto(d.costo), formatearMonto(d.costo)]),
        ...otros.map(o => [o.nombre, o.cantidad, formatearMonto(o.precio), formatearMonto(o.precio * o.cantidad)]),
    ];
    const tableActions = [
        {
            type: "delete",
            title: "Quitar de la factura",
            show: (_, index) => index >= lineasInscripcion.length,
            onClick: (_, index) => setOtros(prev => prev.filter((_o, i) => i !== index - lineasInscripcion.length)),
        }
    ];

    return (
        <div className="container-page lg:h-full">
            <div className="flex flex-col shrink-0">
                <button
                    type="button"
                    onClick={() => navigate("/facturas")}
                    className="self-start w-auto transition-colors cursor-pointer hover:text-(--btnColor-primary) flex items-center text-sm font-semibold mb-1"
                >
                    <i className="icon-[heroicons--arrow-left] mr-1.5 text-base"></i>
                    Volver a Facturas
                </button>
                <h1>Facturas / <span className="text-[18px] text-gray-700">Nueva factura</span></h1>
                <h2>Cobro de inscripciones y otros conceptos</h2>
            </div>

            {loadingData ? (
                <div className="flex items-center justify-center gap-2 p-12 text-sm text-gray-500 font-medium">
                    <Spinner className="h-5 w-5 text-(--btnColor-primary)" />
                    Cargando datos...
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
                        {/* TARJETA 1: DATOS DE LA FACTURA */}
                        <div className={CARD_CLASS}>
                            <div className="flex items-center min-h-10">
                                <h3>Datos de la factura</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="min-w-0">
                                    <label className={LABEL_CLASS}>Alumno</label>
                                    <Combobox
                                        options={alumnos.map(a => ({ value: a.idUsuario, label: a.nombre || `Alumno #${a.idUsuario}` }))}
                                        value={idAlumno}
                                        onChange={elegirAlumno}
                                        placeholder="Buscar alumno..."
                                        className="w-full"
                                    />
                                </div>
                                <div className="min-w-0">
                                    <label htmlFor="inscripcion" className={LABEL_CLASS}>Inscripción a cobrar</label>
                                    <select
                                        id="inscripcion"
                                        value={idInscripcion}
                                        onChange={(e) => setIdInscripcion(e.target.value)}
                                        disabled={pendientes.length === 0}
                                        className={`${INPUT_CLASS} text-gray-700`}
                                    >
                                        <option value="">{textoSinInscripcion()}</option>
                                        {pendientes.map(i => (
                                            <option key={i.idInscripcion} value={i.idInscripcion}>
                                                #{i.idInscripcion} — {describirInscripcion(i)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="min-w-0">
                                    <label htmlFor="ruc" className={LABEL_CLASS}>RUC</label>
                                    <input
                                        id="ruc"
                                        type="text"
                                        maxLength={10}
                                        value={ruc}
                                        onChange={(e) => setRuc(e.target.value.replace(/[^\d-]/g, ""))}
                                        placeholder="1234567-8"
                                        className={INPUT_CLASS}
                                    />
                                </div>
                                <div className="min-w-0">
                                    <label htmlFor="metodoPago" className={LABEL_CLASS}>Método</label>
                                    <select
                                        id="metodoPago"
                                        value={metodoPago}
                                        onChange={(e) => setMetodoPago(e.target.value)}
                                        className={`${INPUT_CLASS} text-gray-700`}
                                    >
                                        {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="min-w-0">
                                    <label htmlFor="fechaEmision" className={LABEL_CLASS}>Fecha</label>
                                    <input
                                        id="fechaEmision"
                                        type="date"
                                        max={fechaDeHoy()}
                                        value={fechaEmision}
                                        onChange={(e) => setFechaEmision(e.target.value)}
                                        className={INPUT_CLASS}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* TARJETA 2: AGREGAR OTROS CONCEPTOS */}
                        <div className={CARD_CLASS}>
                            <div className="flex items-center min-h-10">
                                <h3>Agregar concepto</h3>
                            </div>
                            <div>
                                <label className={LABEL_CLASS}>Concepto</label>
                                <Combobox
                                    options={conceptos.map(c => ({ value: c.idConcepto, label: c.nombre }))}
                                    value={idConcepto}
                                    onChange={setIdConcepto}
                                    placeholder="Seleccionar concepto..."
                                    className="w-full"
                                />
                            </div>
                            <div className="grid grid-cols-[1fr_1.4fr_auto] gap-2 items-end">
                                <div className="min-w-0">
                                    <label htmlFor="cantidad" className={LABEL_CLASS}>Cantidad</label>
                                    <input
                                        id="cantidad"
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={cantidad}
                                        onChange={(e) => setCantidad(e.target.value)}
                                        className={INPUT_CLASS}
                                    />
                                </div>
                                <div className="min-w-0">
                                    <label htmlFor="precio" className={LABEL_CLASS}>Precio</label>
                                    <input
                                        id="precio"
                                        type="text"
                                        value={conceptoElegido ? formatearMonto(conceptoElegido.montoBase) : ""}
                                        placeholder={SIN_DATO}
                                        className={INPUT_CLASS}
                                        disabled
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAgregar}
                                    className="btn-primary cursor-pointer px-3 whitespace-nowrap"
                                    title="Agregar a la factura"
                                >
                                    <i className="icon-[heroicons--plus] text-white mr-1"></i>
                                    Agregar
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* TARJETA 3: CONCEPTOS Y TOTALES (en lg se achica hasta el alto libre de la ventana) */}
                    <div className={`${CARD_CLASS} lg:min-h-[14.5rem]`}>
                        <div className="flex flex-col lg:flex-row gap-4 min-h-0 flex-1">
                            <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-3">
                                <div className="flex items-baseline gap-2 shrink-0">
                                    <h3>Conceptos a facturar</h3>
                                    <span className="text-xs text-gray-500">({filas.length})</span>
                                </div>
                                <div className={TABLA_SCROLL_CLASS}>
                                    <Table
                                        headers={headers}
                                        data={filas}
                                        actions={tableActions}
                                        emptyMessage="Elegí una inscripción o agregá otros conceptos"
                                        showPagination={false}
                                    />
                                </div>
                            </div>

                            <div className="lg:w-64 shrink-0 flex flex-col gap-2 text-sm border-(--borderColor-input) border-t pt-3 lg:border-t-0 lg:pt-0 lg:border-l lg:pl-4">
                                <div className="flex justify-between items-baseline gap-2">
                                    <span className="text-gray-500">Inscripción</span>
                                    <span className="font-semibold text-slate-700">{formatearMonto(subtotalInscripcion)}</span>
                                </div>
                                {/* Siempre visible, para que el panel no cambie de alto */}
                                <div className="flex justify-between items-baseline gap-2" title="Se aplica solo a la inscripción">
                                    <span className="text-gray-500 truncate">
                                        {inscripcion?.nombreDescuento
                                            ? `${inscripcion.nombreDescuento} (${inscripcion.porcentajeDescuento}%)`
                                            : "Descuento (0%)"}
                                    </span>
                                    <span className="font-semibold text-slate-700 shrink-0">− {formatearMonto(montoDescuento)}</span>
                                </div>
                                <div className="flex justify-between items-baseline gap-2">
                                    <span className="text-gray-500">Otros conceptos</span>
                                    <span className="font-semibold text-slate-700">{formatearMonto(subtotalOtros)}</span>
                                </div>
                                <div className="flex justify-between items-baseline gap-2 pt-2 border-t border-(--borderColor-input)">
                                    <span className="text-xs text-gray-500 uppercase font-semibold">Total</span>
                                    <span className="text-xl font-extrabold text-(--btnColor-primary)">{formatearMonto(total)}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleRevisar}
                                    className="btn-primary w-full mt-auto cursor-pointer"
                                >
                                    Emitir factura
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <ConfirmModal
                isOpen={confirmando}
                onClose={() => setConfirmando(false)}
                onConfirm={handleEmitir}
                loading={submitting}
                title="Emitir factura"
                message={
                    <dl className="grid grid-cols-2 gap-4">
                        {resumen.map(([label, valor]) => (
                            <div key={label}>
                                <dt className={LABEL_CLASS}>{label}</dt>
                                <dd className={label === "Total" ? "font-extrabold text-(--btnColor-primary)" : "text-slate-800"}>{valor}</dd>
                            </div>
                        ))}
                    </dl>
                }
                warning="Revisá los datos: una vez emitida, la factura no se puede modificar ni eliminar."
                confirmText="Emitir"
                variant="primary"
            />
        </div>
    );
};
