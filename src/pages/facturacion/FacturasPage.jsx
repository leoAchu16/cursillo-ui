import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    listarFacturas,
    crearFactura,
    actualizarFactura,
    eliminarFactura,
    listarConceptos,
    mensajeDeError,
} from './services/facturacionService';
import { obtenerAlumnoPorId } from './services/alumnosService';
import { JwtTokenModal } from '../../components/JwtTokenModal';
import { BotonToken } from '../../components/BotonToken';
import { SearchInput } from '../../components/SearchInput';
import { Table } from '../../components/Table';
import { FacturaDetalleModal } from '../../components/FacturaDetalleModal';
import { FacturaFormModal } from '../../components/FacturaFormModal';

const TAMANO_PAGINA = 10;
const METODOS_PAGO = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'];
const HEADERS = ['N°', 'Alumno', 'RUC', 'Fecha', 'Método', 'Total', 'Acciones'];
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

const formularioVacio = () => ({
    id: null,
    idAlumno: '',
    idSecretaria: '1',
    idInscripcion: '1',
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
                q: filtro,
                metodoPago: metodo,
            });

            if (resultado.content.length === 0 && pagina > 0) {
                setPagina(pagina - 1);
                return;
            }

            // Se completa cada factura con el nombre real del alumno
            const facturasConAlumnos = await Promise.all(
                resultado.content.map(async (f) => {
                    if (f.nombreAlumno) return f;
                    const alumnoReal = await obtenerAlumnoPorId(f.idAlumno);
                    return { ...f, nombreAlumno: alumnoReal.nombre };
                })
            );

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

    const abrirNueva = () => {
        setErrorForm(null);
        setFormulario(formularioVacio());
        setLineas([lineaVacia()]);
    };

    const abrirEdicion = (f) => {
        setErrorForm(null);
        setFormulario({
            id: f.idFactura,
            idAlumno: f.idAlumno,
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

        if (!formulario.idAlumno) return setErrorForm('Escribí un ID de alumno.');
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
        if (!window.confirm(`¿Eliminar la factura N° ${f.idFactura}?`)) return;
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
        f.idFactura,
        f.nombreAlumno ?? `Alumno N° ${f.idAlumno}`,
        f.ruc,
        formatearFecha(f.fechaEmision),
        <span className={BADGE_METODO[f.metodoPago] || 'badge'}>{f.metodoPago}</span>,
        guaranies.format(f.total ?? 0),
    ]);

    // la primera celda de cada fila es el id de la factura
    const buscarFactura = (fila) => facturas.find((f) => f.idFactura === fila[0]);

    const acciones = [
        { type: 'view', title: 'Ver detalle', onClick: (fila) => setFacturaVista(buscarFactura(fila)) },
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
