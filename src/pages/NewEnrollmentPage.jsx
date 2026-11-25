import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SegmentedControl } from "../components/SegmentedControl";
import { Combobox } from "../components/Combobox";
import { Table } from "../components/Table";
import { Spinner } from "../components/Spinner";
import { listarMateriasPaginado, listarExamenesPaginado } from "../services/notasService";
import { crearInscripcion, listarDescuentos } from "../services/inscripcionesService";
import { listarAlumnosPaginado } from "../services/usuariosService";
import { obtenerPrecioConcepto } from "./facturacion/services/facturacionService";
import { mensajeDeError } from "../services/api";

// Se cargan todas las opciones de una vez para los combos
const MAX_OPCIONES = 1000;

// Valor a mostrar cuando un campo viene vacío
const SIN_DATO = '—';

const INPUT_CLASS = "w-full px-3 py-2 rounded-lg border border-(--borderColor-input) bg-white text-sm focus:outline-none focus:border-(--btnColor-primary)";
// Versión compacta (mb-1) para que la página entre en pantalla sin scroll
const LABEL_CLASS = "block text-xs font-bold text-gray-600 tracking-wider uppercase mb-1";

// .card trae h-fit: con h-auto las dos tarjetas de la grilla se estiran a la misma altura
const CARD_CLASS = "card h-auto p-4 gap-3";

// La tabla hace scroll dentro de este contenedor, que lleva el borde (así no se corta al desplazar).
// El encabezado queda fijo: para eso la tabla no puede tener su propio overflow-hidden.
const TABLA_SCROLL_CLASS = "min-h-0 max-h-48 lg:max-h-none overflow-auto border-2 border-(--borderColor-input) rounded-md shadow-md "
    + "[&>table]:w-full [&>table]:border-0 [&>table]:rounded-none [&>table]:shadow-none [&>table]:overflow-visible "
    + "[&_th]:sticky [&_th]:top-0 [&_th]:z-10";

const ETIQUETA_DIA = {
    LUNES: 'Lunes', MARTES: 'Martes', MIERCOLES: 'Miércoles', JUEVES: 'Jueves',
    VIERNES: 'Viernes', SABADO: 'Sábado', DOMINGO: 'Domingo',
};
const formatearDia = (dia) => ETIQUETA_DIA[dia] || dia || SIN_DATO;

/**
 * "2026-11-20" -> "20/11/2026". Sin new Date(): se interpretaría como UTC
 * y en Paraguay (UTC-3) se mostraría el día anterior.
 */
const formatearFecha = (fecha) => {
    if (!fecha) return SIN_DATO;
    const [anio, mes, dia] = String(fecha).slice(0, 10).split('-');
    return anio && mes && dia ? `${dia}/${mes}/${anio}` : String(fecha);
};

// "18:00:00" -> "18:00"
const formatearHora = (hora) => (hora ? String(hora).slice(0, 5) : "");

const formatearMonto = (monto) =>
    monto === undefined || monto === null ? SIN_DATO : `Gs. ${Number(monto).toLocaleString("es-PY")}`;

const SECCIONES = [
    { label: "Materia", value: "MATERIA" },
    { label: "Examen", value: "EXAMEN" }
];

export const NewEnrollmentPage = () => {
    const navigate = useNavigate();

    // Datos cargados del backend
    const [alumnos, setAlumnos] = useState([]);
    const [materias, setMaterias] = useState([]);
    const [examenes, setExamenes] = useState([]);
    const [descuentos, setDescuentos] = useState([]);
    const [precios, setPrecios] = useState({ MATERIA: null, EXAMEN: null }); // montoBase de cada concepto
    const [loadingData, setLoadingData] = useState(true);

    // Formulario
    const [idAlumno, setIdAlumno] = useState(null);
    const [seccion, setSeccion] = useState("MATERIA");
    const [idItemSeleccionado, setIdItemSeleccionado] = useState(null); // idMateria o idExamen
    const [itemCosto, setItemCosto] = useState("");
    const [idDescuento, setIdDescuento] = useState("");
    const [items, setItems] = useState([]); // { tipo, idMateria|idExamen, nombre, cuando, costo }
    const [submitting, setSubmitting] = useState(false);

    // Carga inicial en paralelo: si una lista falla, las demás se muestran igual
    useEffect(() => {
        let ignore = false;

        const cargar = async () => {
            const [resAlumnos, resMaterias, resExamenes, resDescuentos, resPrecioMateria, resPrecioExamen] =
                await Promise.allSettled([
                    listarAlumnosPaginado({ page: 0, size: MAX_OPCIONES }),
                    listarMateriasPaginado({ page: 0, size: MAX_OPCIONES }),
                    listarExamenesPaginado({ page: 0, size: MAX_OPCIONES }),
                    listarDescuentos({ size: MAX_OPCIONES }),
                    obtenerPrecioConcepto("materia"),
                    obtenerPrecioConcepto("examen"),
                ]);
            if (ignore) return;

            const avisar = (resultado, mensaje) => {
                if (resultado.status === "rejected") {
                    console.error(mensaje, resultado.reason);
                    toast.warning(mensaje);
                    return false;
                }
                return true;
            };

            if (avisar(resAlumnos, "No se pudieron cargar los alumnos.")) setAlumnos(resAlumnos.value.content);
            if (avisar(resMaterias, "No se pudieron cargar las materias.")) setMaterias(resMaterias.value.content);
            if (avisar(resExamenes, "No se pudieron cargar los exámenes.")) setExamenes(resExamenes.value.content);
            if (avisar(resDescuentos, "No se pudieron cargar los descuentos.")) setDescuentos(resDescuentos.value);

            const okMateria = avisar(resPrecioMateria, "No se pudo obtener el precio de las materias.");
            const okExamen = avisar(resPrecioExamen, "No se pudo obtener el precio de los exámenes.");
            const precioMateria = okMateria ? resPrecioMateria.value : null;
            const precioExamen = okExamen ? resPrecioExamen.value : null;
            // Sin estos conceptos el backend rechaza la inscripción si el costo no viene cargado
            if (okMateria && precioMateria === null)
                toast.warning("No está configurado el precio de materia; cargalo en Conceptos.");
            if (okExamen && precioExamen === null)
                toast.warning("No está configurado el precio de examen; cargalo en Conceptos.");
            setPrecios({ MATERIA: precioMateria, EXAMEN: precioExamen });

            setLoadingData(false);
        };
        cargar();

        return () => { ignore = true; };
    }, []);

    // ------------------------------ OPCIONES DE COMBOS ------------------------------

    const materiasPorId = Object.fromEntries(materias.map(m => [m.idMateria, m]));
    const alumnoSeleccionado = alumnos.find(a => a.idUsuario === idAlumno);
    const descuentoSeleccionado = descuentos.find(d => String(d.idDescuento) === idDescuento);

    const opcionesAlumnos = alumnos.map(a => ({
        value: a.idUsuario,
        label: a.nombre || `Alumno #${a.idUsuario}`,
    }));

    const opcionesMaterias = materias.map(m => ({
        value: m.idMateria,
        label: `${m.nombreMateria} — ${formatearDia(m.dia)}`,
    }));

    const describirExamen = (e) =>
        [formatearFecha(e.fecha), formatearHora(e.hora)].filter(Boolean).join(" ");

    const opcionesExamenes = examenes.map(e => ({
        value: e.idExamen,
        label: [e.titulo, materiasPorId[e.idMateria]?.nombreMateria, describirExamen(e)].filter(Boolean).join(" — "),
    }));

    // ------------------------------------ ÍTEMS -------------------------------------

    const cambiarSeccion = (valor) => {
        setSeccion(valor);
        setIdItemSeleccionado(null);
        setItemCosto("");
    };

    // Al elegir una materia o un examen, el costo se completa con el precio del concepto
    const seleccionarItem = (id) => {
        setIdItemSeleccionado(id);
        const precio = precios[seccion];
        setItemCosto(id != null && precio != null ? String(precio) : "");
    };

    const handleAgregarItem = () => {
        if (idItemSeleccionado == null) {
            toast.warning(seccion === "MATERIA" ? "Seleccioná una materia." : "Seleccioná un examen.");
            return;
        }
        // Se permite 0 (ej. beca); solo enteros no negativos
        const costo = Number(itemCosto);
        if (itemCosto === "" || !Number.isInteger(costo) || costo < 0) {
            toast.warning("El costo debe ser un número entero mayor o igual a 0.");
            return;
        }

        const campoId = seccion === "MATERIA" ? "idMateria" : "idExamen";
        if (items.some(it => it.tipo === seccion && it[campoId] === idItemSeleccionado)) {
            toast.warning(seccion === "MATERIA" ? "Esa materia ya está en la lista." : "Ese examen ya está en la lista.");
            return;
        }

        let nuevoItem;
        if (seccion === "MATERIA") {
            const m = materiasPorId[idItemSeleccionado];
            nuevoItem = { tipo: "MATERIA", idMateria: m.idMateria, nombre: m.nombreMateria, cuando: formatearDia(m.dia), costo };
        } else {
            const e = examenes.find(ex => ex.idExamen === idItemSeleccionado);
            const materia = materiasPorId[e.idMateria]?.nombreMateria;
            nuevoItem = {
                tipo: "EXAMEN",
                idExamen: e.idExamen,
                nombre: materia ? `${e.titulo} (${materia})` : e.titulo,
                cuando: describirExamen(e) || SIN_DATO,
                costo
            };
        }

        setItems(prev => [...prev, nuevoItem]);
        setIdItemSeleccionado(null);
        setItemCosto("");
    };

    const quitarItem = (index) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    // Misma cuenta que el backend (InscripcionService.calcularTotal): división entera
    const subtotal = items.reduce((acc, it) => acc + it.costo, 0);
    const porcentaje = descuentoSeleccionado?.porcentaje || 0;
    const montoDescuento = Math.floor((subtotal * porcentaje) / 100);
    const total = Math.max(0, subtotal - montoDescuento);

    // ---------------------------------- CONFIRMAR -----------------------------------

    const handleConfirmar = async () => {
        if (idAlumno == null) {
            toast.warning("Seleccioná un alumno.");
            return;
        }
        if (items.length === 0) {
            toast.warning("Agregá al menos una materia o examen.");
            return;
        }

        const dto = {
            idAlumno,
            ...(descuentoSeleccionado ? { idDescuento: descuentoSeleccionado.idDescuento } : {}),
            detallesInscripcion: items.map(it => ({
                tipoInscripcion: it.tipo,
                costo: it.costo,
                ...(it.tipo === "MATERIA" ? { idMateria: it.idMateria } : { idExamen: it.idExamen })
            }))
        };

        setSubmitting(true);
        try {
            const creada = await crearInscripcion(dto);
            // El Toaster es global (App.jsx): el toast sigue visible después de navegar
            toast.success("Inscripción registrada correctamente. Ahora podés facturarla.");
            // Queda PENDIENTE: la secretaria se registra recién al emitir la factura
            navigate(`/facturas/nueva?alumno=${idAlumno}&inscripcion=${creada.idInscripcion}`);
        } catch (err) {
            console.error("Error al registrar la inscripción:", err);
            const mensaje = err.response?.status === 403
                ? "No tenés permisos para registrar inscripciones."
                : mensajeDeError(err, "No se pudo registrar la inscripción.");
            toast.error(mensaje);
        } finally {
            setSubmitting(false);
        }
    };

    // ----------------------------------- TABLA --------------------------------------

    const headersTable = ["Tipo", "Materia / Examen", "Día / Fecha", "Costo", "Acciones"];
    const filas = items.map(it => [it.tipo, it.nombre, it.cuando, formatearMonto(it.costo)]);
    const tableActions = [
        { type: "delete", title: "Quitar de la lista", onClick: (_, index) => quitarItem(index) }
    ];

    return (
        <div className="container-page lg:h-full">
            <div className="flex flex-col shrink-0">
                <button
                    type="button"
                    onClick={() => navigate("/inscripciones")}
                    className="self-start w-auto transition-colors cursor-pointer hover:text-(--btnColor-primary) flex items-center text-sm font-semibold mb-1"
                >
                    <i className="icon-[heroicons--arrow-left] mr-1.5 text-base"></i>
                    Volver a Inscripciones
                </button>
                <h1>Inscripciones / <span className="text-[18px] text-gray-700">Nueva inscripción</span></h1>
                <h2>Gestión de inscripciones de alumnos a materias o exámenes</h2>
            </div>

            {loadingData ? (
                <div className="flex items-center justify-center gap-2 p-12 text-sm text-gray-500 font-medium">
                    <Spinner className="h-5 w-5 text-(--btnColor-primary)" />
                    Cargando datos...
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
                        {/* TARJETA 1: ALUMNO (3 filas, igual que "Agregar ítem") */}
                        <div className={CARD_CLASS}>
                            <div className="flex items-center min-h-10">
                                <h3>Alumno</h3>
                            </div>
                            <div>
                                <label className={LABEL_CLASS}>Seleccionar alumno</label>
                                <Combobox
                                    options={opcionesAlumnos}
                                    value={idAlumno}
                                    onChange={setIdAlumno}
                                    placeholder="Buscar alumno por nombre..."
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <label htmlFor="emailAlumno" className={LABEL_CLASS}>Email</label>
                                <input
                                    id="emailAlumno"
                                    className={`${INPUT_CLASS} bg-gray-100! text-gray-600 cursor-not-allowed`}
                                    type="email"
                                    value={alumnoSeleccionado?.email || ""}
                                    placeholder="Se completa al seleccionar el alumno"
                                    disabled
                                />
                            </div>
                        </div>

                        {/* TARJETA 2: AGREGAR ÍTEM (3 filas: título, combo, costo + botón) */}
                        <div className={CARD_CLASS}>
                            <div className="flex justify-between items-center min-h-10">
                                <h3>Agregar ítem</h3>
                                <SegmentedControl value={seccion} onChange={cambiarSeccion} options={SECCIONES} />
                            </div>

                            <div>
                                <label className={LABEL_CLASS}>
                                    {seccion === "MATERIA" ? "Materia a inscribir" : "Examen a inscribir"}
                                </label>
                                <Combobox
                                    options={seccion === "MATERIA" ? opcionesMaterias : opcionesExamenes}
                                    value={idItemSeleccionado}
                                    onChange={seleccionarItem}
                                    placeholder={seccion === "MATERIA" ? "Seleccionar materia..." : "Seleccionar examen..."}
                                    className="w-full"
                                />
                            </div>

                            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                                <div>
                                    <label
                                        htmlFor="itemCosto"
                                        className={LABEL_CLASS}
                                        title="Se completa con el precio del concepto. Podés modificarlo (ej. becas)."
                                    >
                                        Costo (Gs.)
                                    </label>
                                    <input
                                        id="itemCosto"
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={itemCosto}
                                        onChange={(e) => setItemCosto(e.target.value)}
                                        placeholder={precios[seccion] != null ? String(precios[seccion]) : "Ej. 100000"}
                                        title="Se completa con el precio del concepto. Podés modificarlo (ej. becas)."
                                        className={INPUT_CLASS}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAgregarItem}
                                    className="btn-primary cursor-pointer px-3 whitespace-nowrap"
                                    title="Agregar a la lista"
                                >
                                    <i className="icon-[heroicons--plus] text-white mr-1"></i>
                                    Agregar
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* TARJETA 3: ÍTEMS Y CONFIRMACIÓN
                        Izquierda: título y tabla. Derecha: descuento, totales y confirmación, desde la altura del título.
                        En lg la tarjeta se achica hasta el alto libre de la ventana (la tabla hace scroll), pero nunca
                        menos que el panel. En pantallas angostas el panel baja y la línea pasa a ser horizontal. */}
                    <div className={`${CARD_CLASS} lg:min-h-[14.5rem]`}>
                        <div className="flex flex-col lg:flex-row gap-4 min-h-0">
                            <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-3">
                                <div className="flex items-baseline gap-2 shrink-0">
                                    <h3>Ítems de la inscripción</h3>
                                    <span className="text-xs text-gray-500">
                                        ({items.length} {items.length === 1 ? "ítem" : "ítems"})
                                    </span>
                                </div>
                                <div className={TABLA_SCROLL_CLASS}>
                                    <Table
                                        headers={headersTable}
                                        data={filas}
                                        actions={tableActions}
                                        emptyMessage="Todavía no agregaste materias ni exámenes"
                                        showPagination={false}
                                    />
                                </div>
                            </div>

                            <div className="lg:w-64 shrink-0 flex flex-col gap-2 text-sm border-(--borderColor-input) border-t pt-3 lg:border-t-0 lg:pt-0 lg:border-l lg:pl-4">
                                <div>
                                    <label htmlFor="descuento" className={LABEL_CLASS}>Descuento</label>
                                    <select
                                        id="descuento"
                                        value={idDescuento}
                                        onChange={(e) => setIdDescuento(e.target.value)}
                                        className={`${INPUT_CLASS} text-gray-700`}
                                        title="Se aplica al total de la inscripción"
                                    >
                                        <option value="">Sin descuento</option>
                                        {descuentos.map(d => (
                                            <option key={d.idDescuento} value={d.idDescuento}>
                                                {d.nombre} ({d.porcentaje}%)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex justify-between items-baseline gap-2">
                                    <span className="text-gray-500">Subtotal</span>
                                    <span className="font-semibold text-slate-700">{formatearMonto(subtotal)}</span>
                                </div>
                                {/* Siempre visible, para que el panel no cambie de alto al elegir un descuento */}
                                <div className="flex justify-between items-baseline gap-2">
                                    <span className="text-gray-500">Descuento ({porcentaje}%)</span>
                                    <span className="font-semibold text-slate-700">− {formatearMonto(montoDescuento)}</span>
                                </div>
                                <div className="flex justify-between items-baseline gap-2">
                                    <span className="text-xs text-gray-500 uppercase font-semibold">Total</span>
                                    <span className="text-xl font-extrabold text-(--btnColor-primary)">{formatearMonto(total)}</span>
                                </div>
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={handleConfirmar}
                                    className="btn-primary w-full mt-auto gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {submitting && <Spinner className="h-4 w-4 text-white" />}
                                    Confirmar inscripción
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
