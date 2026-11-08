import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    listarFacturas,
    crearFactura,
    actualizarFactura,
    eliminarFactura,
    listarConceptos,
    mensajeDeError,
} from './services/facturacionService';
import { obtenerAlumnoPorId } from './services/alumnosService';
import { obtenerSecretariaPorId } from './services/secretariasService';
import { listarAlumnos, listarInscripcionesPendientes } from './services/opcionesFacturaService';
import { JwtTokenModal } from '../../components/JwtTokenModal';
import { BotonToken } from '../../components/BotonToken';
import { SearchInput } from '../../components/SearchInput';
import { Table } from '../../components/Table';
import { FacturaDetalleModal } from '../../components/FacturaDetalleModal';
import { FacturaFormModal } from '../../components/FacturaFormModal';
import { codigoFactura, normalizarBusqueda } from '../../components/codigoFactura';

const TAMANO_PAGINA = 10;
const METODOS_PAGO = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'];
const HEADERS = ['Código', 'Alumno', 'RUC', 'Fecha', 'Método', 'Total', 'Acciones'];
const BADGE_METODO = {
    EFECTIVO: 'badge badge-success',
    TARJETA: 'badge badge-info',
    TRANSFERENCIA: 'badge badge-warning',
};

const guaranies = new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 });

const hoy = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
};

const formatearFecha = (fecha) => {
    if (!fecha) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : fecha;
};

// El id de la secretaria sale del token de la sesión (claim "id"), no se pide en el formulario
const idSecretariaLogueada = () => {
    try {
        const token = localStorage.getItem('token');
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        return payload.id ? String(payload.id) : '';
    } catch {
        return '';
    }
};

const formularioVacio = () => ({
    id: null,
    idAlumno: '',
    idSecretaria: idSecretariaLogueada(),
    idInscripcion: '',
    ruc: '',
    metodoPago: 'EFECTIVO',
    fechaEmision: hoy(),
    total: '',
});

const lineaVacia = () => ({ idConcepto: '', cantidad: 1, subtotal: 0 });

export const FacturasPage = () => {
    const [facturas, setFacturas] = useState([]);
    const [pagina, setPagina] = useState(0);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalElementos, setTotalElementos] = useState(0);

    const [busqueda, setBusqueda] = useState('');
    const [filtro, setFiltro] = useState('');
    const [metodo, setMetodo] = useState('');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [aviso, setAviso] = useState(null);

    const [conceptos, setConceptos] = useState([]);
    const [errorConceptos, setErrorConceptos] = useState(null);

    const [formulario, setFormulario] = useState(null);
    const [lineas, setLineas] = useState([lineaVacia()]);
    const [errorForm, setErrorForm] = useState(null);
    const [guardando, setGuardando] = useState(false);

    const [facturaVista, setFacturaVista] = useState(null);
    const [tokenModalAbierto, setTokenModalAbierto] = useState(false);

    // nombres de alumnos ya consultados (evita repetir la misma llamada)
    const cacheAlumnos = useRef({});
    const cacheSecretarias = useRef({});

    const [alumnos, setAlumnos] = useState([]);
    const [inscripciones, setInscripciones] = useState([]);
    const [cargandoInscripciones, setCargandoInscripciones] = useState(false);

    const mapaConceptos = useMemo(
        () => Object.fromEntries(conceptos.map((c) => [c.idConcepto, c])),
        [conceptos]
    );

    const totalLineas = lineas.reduce((suma, l) => suma + (Number(l.subtotal) || 0), 0);

    const mostrarAviso = (tipo, texto) => {
        setAviso({ tipo, texto });
        setTimeout(() => setAviso(null), 3500);
    };

    // La búsqueda espera un momento antes de consultar, para no pedir en cada tecla
    useEffect(() => {
        const espera = setTimeout(() => {
            setFiltro(busqueda);
            setPagina(0);
        }, 400);
        return () => clearTimeout(espera);
    }, [busqueda]);

    const cargarConceptos = useCallback(async () => {
        try {
            const resultado = await listarConceptos({ page: 0, size: 100 });
            setConceptos(resultado.content);
        } catch (err) {
            setErrorConceptos(mensajeDeError(err));
        }
    }, []);

    const cargar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const resultado = await listarFacturas({
                page: pagina,
                size: TAMANO_PAGINA,
                q: normalizarBusqueda(filtro),
                metodoPago: metodo,
            });

            if (resultado.content.length === 0 && pagina > 0) {
                setPagina(pagina - 1);
                return;
            }

            // Se pide cada alumno una sola vez, aunque tenga varias facturas
            const idsUnicos = [...new Set(resultado.content.map((f) => f.idAlumno))];
            await Promise.all(
                idsUnicos.map(async (id) => {
                    if (cacheAlumnos.current[id]) return;
                    const alumno = await obtenerAlumnoPorId(id);
                    // si falló la consulta no se guarda, para reintentar la próxima vez
                    if (!alumno.nombre.startsWith('Alumno N°')) {
                        cacheAlumnos.current[id] = alumno.nombre;
                    }
                })
            );
            const facturasConAlumnos = resultado.content.map((f) => ({
                ...f,
                nombreAlumno: cacheAlumnos.current[f.idAlumno] ?? `Alumno N° ${f.idAlumno}`,
            }));

            setFacturas(facturasConAlumnos);
            setTotalPaginas(resultado.totalPages);
            setTotalElementos(resultado.totalElements);
        } catch (err) {
            setFacturas([]);
            setError(mensajeDeError(err));
        } finally {
            setLoading(false);
        }
    }, [pagina, filtro, metodo]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    useEffect(() => {
        cargarConceptos();
    }, [cargarConceptos]);

    const cambiarCampo = (campo, valor) => setFormulario((prev) => ({ ...prev, [campo]: valor }));

    const cambiarLinea = (indice, campo, valor) => {
        setLineas((prev) =>
            prev.map((linea, i) => {
                if (i !== indice) return linea;
                const nueva = { ...linea, [campo]: valor };
                if (campo === 'idConcepto' || campo === 'cantidad') {
                    const concepto = mapaConceptos[nueva.idConcepto];
                    nueva.subtotal = (concepto?.montoBase ?? 0) * (Number(nueva.cantidad) || 0);
                }
                return nueva;
            })
        );
    };

    const cargarAlumnos = async () => {
        try {
            setAlumnos(await listarAlumnos());
        } catch (err) {
            setErrorForm(mensajeDeError(err));
        }
    };

    const abrirNueva = () => {
        setErrorForm(null);
        setFormulario(formularioVacio());
        setLineas([lineaVacia()]);
        setInscripciones([]);
        cargarAlumnos();
    };

    // Al elegir el alumno se traen solo sus inscripciones pendientes de pago
    const elegirAlumno = async (idAlumno) => {
        setFormulario((prev) => ({ ...prev, idAlumno, idInscripcion: '' }));
        setInscripciones([]);
        if (!idAlumno) return;
        setCargandoInscripciones(true);
        try {
            const pendientes = await listarInscripcionesPendientes(idAlumno);
            setInscripciones(pendientes);
            // si tiene una sola, queda elegida
            if (pendientes.length === 1) {
                setFormulario((prev) => ({ ...prev, idInscripcion: String(pendientes[0].idInscripcion) }));
            }
        } catch (err) {
            setErrorForm(mensajeDeError(err));
        } finally {
            setCargandoInscripciones(false);
        }
    };

    const etiquetaInscripcion = (i) => {
        const conceptos = (i.conceptos ?? []).join(', ');
        return `${formatearFecha(i.fechaInscripcion)} – ${conceptos || 'Inscripción'} – ${guaranies.format(i.total ?? 0)}`;
    };

    const abrirEdicion = (f) => {
        setErrorForm(null);
        setFormulario({
            id: f.idFactura,
            idAlumno: f.idAlumno,
            nombreAlumno: f.nombreAlumno,
            idSecretaria: f.idSecretaria,
            idInscripcion: f.idInscripcion ?? '',
            ruc: f.ruc ?? '',
            metodoPago: f.metodoPago ?? 'EFECTIVO',
            fechaEmision: f.fechaEmision ?? hoy(),
            total: f.total ?? '',
        });
    };

    const guardar = async (e) => {
        e.preventDefault();
        const editando = Boolean(formulario.id);
        const ruc = formulario.ruc.trim();

        if (!formulario.idAlumno) return setErrorForm('Elegí un alumno.');
        if (!editando && !formulario.idInscripcion) return setErrorForm('Elegí la inscripción que se está cobrando.');
        if (!editando && !formulario.idSecretaria) return setErrorForm('No se pudo identificar a la secretaria. Volvé a iniciar sesión.');
        if (!editando && lineas.some((l) => !l.idConcepto)) return setErrorForm('Elegí un concepto en cada línea.');
        if (!ruc) return setErrorForm('Escribí el RUC.');

        let datos;
        if (editando) {
            datos = {
                idAlumno: Number(formulario.idAlumno),
                idSecretaria: Number(formulario.idSecretaria),
                idInscripcion: Number(formulario.idInscripcion),
                ruc,
                total: Math.round(Number(formulario.total) || 0),
                metodoPago: formulario.metodoPago,
                fechaEmision: formulario.fechaEmision,
            };
        } else {
            datos = {
                idAlumno: Number(formulario.idAlumno),
                idSecretaria: Number(formulario.idSecretaria),
                idInscripcion: Number(formulario.idInscripcion),
                ruc,
                total: totalLineas,
                metodoPago: formulario.metodoPago,
                fechaEmision: formulario.fechaEmision,
                detallesFactura: lineas.map((l) => ({
                    idConcepto: Number(l.idConcepto),
                    cantidad: Number(l.cantidad),
                    subtotal: Math.round(Number(l.subtotal) || 0),
                })),
            };
        }

        setGuardando(true);
        try {
            if (editando) await actualizarFactura(formulario.id, datos);
            else await crearFactura(datos);
            setFormulario(null);
            mostrarAviso('ok', editando ? 'Cambios guardados.' : 'Factura emitida correctamente.');
            await cargar();
        } catch (err) {
            setErrorForm(mensajeDeError(err));
        } finally {
            setGuardando(false);
        }
    };

    const eliminar = async (f) => {
        if (!window.confirm(`¿Eliminar la factura ${codigoFactura(f.idFactura)}?`)) return;
        try {
            await eliminarFactura(f.idFactura);
            mostrarAviso('ok', 'Factura eliminada.');
            await cargar();
        } catch (err) {
            mostrarAviso('error', mensajeDeError(err));
        }
    };

    // Datos para el componente Table compartido
    const filas = facturas.map((f) => [
        codigoFactura(f.idFactura),
        f.nombreAlumno ?? `Alumno N° ${f.idAlumno}`,
        f.ruc,
        formatearFecha(f.fechaEmision),
        <span className={BADGE_METODO[f.metodoPago] || 'badge'}>{f.metodoPago}</span>,
        guaranies.format(f.total ?? 0),
    ]);

    // la primera celda de cada fila es el código de la factura
    const buscarFactura = (fila) => facturas.find((f) => codigoFactura(f.idFactura) === fila[0]);

    // Al abrir el detalle se busca el nombre de la secretaria (una sola vez por secretaria)
    const verDetalle = async (f) => {
        let nombre = cacheSecretarias.current[f.idSecretaria];
        if (!nombre) {
            nombre = await obtenerSecretariaPorId(f.idSecretaria);
            if (nombre) cacheSecretarias.current[f.idSecretaria] = nombre;
        }
        setFacturaVista({ ...f, nombreSecretaria: nombre });
    };

    const acciones = [
        { type: 'view', title: 'Ver detalle', onClick: (fila) => verDetalle(buscarFactura(fila)) },
        { type: 'edit', title: 'Editar', onClick: (fila) => abrirEdicion(buscarFactura(fila)) },
        { type: 'delete', title: 'Eliminar', onClick: (fila) => eliminar(buscarFactura(fila)) },
    ];

    return (
        <div className="container-page">
            <div className="flex flex-col mt-[24px]">
                <h1>Facturas</h1>
                <h2>Gestión y emisión de comprobantes a estudiantes</h2>
            </div>

            {aviso && (
                <div
                    role="status"
                    className={`px-4 py-3 rounded-xl text-sm font-medium border ${
                        aviso.tipo === 'ok'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : 'bg-rose-50 border-rose-300 text-rose-800'
                    }`}
                >
                    {aviso.texto}
                </div>
            )}

            {error && (
                <div className="bg-rose-50 border border-rose-300 text-rose-800 px-4 py-3 rounded-xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                        <i className="icon-[heroicons--exclamation-circle] text-rose-600 text-xl"></i>
                        <span className="text-sm">{error}</span>
                    </div>
                    <button
                        type="button"
                        onClick={cargar}
                        className="text-xs bg-rose-600 text-white px-2 py-1 rounded-md hover:bg-rose-700 font-semibold cursor-pointer"
                    >
                        Reintentar
                    </button>
                </div>
            )}

            <div className="flex flex-row justify-between items-center gap-4">
                <div className="flex flex-row items-center gap-3">
                    <SearchInput
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar por alumno, RUC, fecha o total..."
                    />
                    <select
                        value={metodo}
                        onChange={(e) => { setMetodo(e.target.value); setPagina(0); }}
                        aria-label="Filtrar por método de pago"
                        className="p-2.5 text-sm border border-(--borderColor-input) rounded-xl bg-white outline-none focus:border-(--btnColor-primary)"
                    >
                        <option value="">Todos los métodos</option>
                        {METODOS_PAGO.map((m) => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <BotonToken onClick={() => setTokenModalAbierto(true)} />
                    <button
                        type="button"
                        onClick={abrirNueva}
                        className="flex items-center bg-(--btnColor-primary) text-(--textColor-secondary) rounded-xl p-2 px-4 shadow-md hover:bg-(--btnColor-primary-hover) transition-colors cursor-pointer shrink-0"
                    >
                        <i className="icon-[heroicons--plus] text-white mr-2"></i>
                        Nueva factura
                    </button>
                </div>
            </div>

            {loading && (
                <div className="flex items-center gap-2 text-sm text-(--btnColor-primary)">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    <span>Cargando facturas...</span>
                </div>
            )}

            <Table
                headers={HEADERS}
                data={filas}
                actions={acciones}
                currentPage={pagina + 1}
                totalPages={totalPaginas}
                totalElements={totalElementos}
                onPrevPage={() => setPagina((p) => Math.max(0, p - 1))}
                onNextPage={() => setPagina((p) => (p + 1 < totalPaginas ? p + 1 : p))}
            />

            <FacturaDetalleModal
                factura={facturaVista}
                onClose={() => setFacturaVista(null)}
                guaranies={guaranies}
                mapaConceptos={mapaConceptos}
            />

            <FacturaFormModal
                formulario={formulario}
                setFormulario={setFormulario}
                lineas={lineas}
                conceptos={conceptos}
                errorConceptos={errorConceptos}
                errorForm={errorForm}
                guardando={guardando}
                guaranies={guaranies}
                totalLineas={totalLineas}
                onGuardar={guardar}
                onCambiarCampo={cambiarCampo}
                alumnos={alumnos}
                inscripciones={inscripciones}
                cargandoInscripciones={cargandoInscripciones}
                etiquetaInscripcion={etiquetaInscripcion}
                onElegirAlumno={elegirAlumno}
                onCambiarLinea={cambiarLinea}
                onAgregarLinea={() => setLineas((prev) => [...prev, lineaVacia()])}
                onQuitarLinea={(i) => setLineas((prev) => prev.filter((_, idx) => idx !== i))}
                onClose={() => setFormulario(null)}
            />

            <JwtTokenModal
                isOpen={tokenModalAbierto}
                onClose={() => setTokenModalAbierto(false)}
                onTokenSaved={() => { cargar(); cargarConceptos(); }}
            />
        </div>
    );
};