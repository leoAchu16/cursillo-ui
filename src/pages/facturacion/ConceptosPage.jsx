import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    listarConceptos,
    crearConcepto,
    actualizarConcepto,
    eliminarConcepto,
    esConceptoDeInscripcion,
} from './services/facturacionService';
import { SearchInput } from '../../components/SearchInput';
import { Table } from '../../components/Table';
import { Modal } from '../../components/Modal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Spinner } from '../../components/Spinner';
import { mensajeDeError } from '../../services/api';

// Filas por página (= size enviado al backend), igual que en las otras páginas
const CONCEPTOS_POR_PAGINA = 8;

// Límites de la base de datos: varchar(100) e int
const LARGO_MAXIMO_NOMBRE = 100;
const MONTO_MAXIMO = 2147483647;

// Valor a mostrar cuando un campo viene vacío
const SIN_DATO = '—';

const FORM_VACIO = { nombre: '', montoBase: '' };

const INPUT_CLASS = "w-full px-3 py-2 rounded-lg border border-(--borderColor-input) bg-white text-sm focus:outline-none focus:border-(--btnColor-primary) disabled:bg-gray-100! disabled:text-gray-600 disabled:cursor-not-allowed";
const LABEL_CLASS = "block text-xs font-bold text-gray-600 tracking-wider uppercase mb-2";

// El código que se muestra (CON-001) se arma a partir del id interno
const codigoConcepto = (id) => `CON-${String(id).padStart(3, '0')}`;

const formatearMonto = (monto) =>
    monto === undefined || monto === null ? SIN_DATO : `Gs. ${Number(monto).toLocaleString('es-PY')}`;

export const ConceptosPage = () => {
    const [busqueda, setBusqueda] = useState('');   // lo que se escribe en el input
    const [filtro, setFiltro] = useState('');       // lo que se manda al backend (con debounce)
    const [conceptos, setConceptos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0); // 0-based, como lo espera Spring
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);
    const [recarga, setRecarga] = useState(0);      // incrementarlo vuelve a pedir la página actual

    // Modales
    const [formAbierto, setFormAbierto] = useState(false);
    const [conceptoEditar, setConceptoEditar] = useState(null); // null = crear, objeto = editar
    const [form, setForm] = useState(FORM_VACIO);
    const [guardando, setGuardando] = useState(false);
    const [conceptoEliminar, setConceptoEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(false);

    const headers = ['Código', 'Nombre', 'Monto base', 'Acciones'];

    // La búsqueda espera un momento antes de consultar, para no pedir en cada tecla
    useEffect(() => {
        const espera = setTimeout(() => {
            setFiltro(busqueda);
            setPage(0);
        }, 400);
        return () => clearTimeout(espera);
    }, [busqueda]);

    // Conceptos: se vuelven a pedir al cambiar de página, de filtro o al forzar una recarga
    useEffect(() => {
        // Evita actualizar el estado con una respuesta vieja (cambio rápido de página,
        // desmontaje del componente o doble ejecución de StrictMode)
        let ignore = false;

        const cargar = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await listarConceptos({ page, size: CONCEPTOS_POR_PAGINA, nombre: filtro });
                if (ignore) return;
                setConceptos(data.content);
                setTotalPages(Math.max(1, data.totalPages));
                setTotalElements(data.totalElements);
            } catch (err) {
                if (ignore) return;
                console.error('Error al cargar conceptos:', err);
                const mensaje = err.response?.status === 403
                    ? 'No tenés permisos para ver los conceptos'
                    : 'No se pudieron cargar los conceptos';
                setConceptos([]);
                setError(mensaje);
                toast.error(mensaje);
            } finally {
                if (!ignore) setLoading(false);
            }
        };
        cargar();

        return () => { ignore = true; };
    }, [page, filtro, recarga]);

    // ------------------------------ CREAR / EDITAR ------------------------------

    // "Materia" y "Examen" se buscan por su nombre: solo se les puede cambiar el monto
    const nombreFijo = esConceptoDeInscripcion(conceptoEditar?.nombre);

    const abrirCrear = () => {
        setConceptoEditar(null);
        setForm(FORM_VACIO);
        setFormAbierto(true);
    };

    const abrirEditar = (concepto) => {
        setConceptoEditar(concepto);
        setForm({
            nombre: concepto.nombre || '',
            montoBase: concepto.montoBase != null ? String(concepto.montoBase) : '',
        });
        setFormAbierto(true);
    };

    const cerrarFormulario = () => {
        if (guardando) return;
        setFormAbierto(false);
        setConceptoEditar(null);
        setForm(FORM_VACIO);
    };

    const handleInputChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleGuardar = async (e) => {
        e.preventDefault();

        const nombre = form.nombre.trim();
        const montoBase = Number(form.montoBase);

        if (!nombre) {
            toast.warning('El nombre del concepto es obligatorio.');
            return;
        }
        if (form.montoBase === '' || !Number.isInteger(montoBase) || montoBase < 0) {
            toast.warning('El monto base debe ser un número entero mayor o igual a 0.');
            return;
        }
        if (montoBase > MONTO_MAXIMO) {
            toast.warning(`El monto base no puede superar ${formatearMonto(MONTO_MAXIMO)}.`);
            return;
        }

        setGuardando(true);
        try {
            // El backend rechaza los nombres repetidos
            if (conceptoEditar) {
                await actualizarConcepto(conceptoEditar.idConcepto, { nombre, montoBase });
                toast.success('Concepto actualizado correctamente.');
            } else {
                await crearConcepto({ nombre, montoBase });
                toast.success('Concepto creado correctamente.');
                // El concepto nuevo puede quedar en cualquier página: volvemos a la primera
                setPage(0);
            }
            setRecarga(r => r + 1);
            setFormAbierto(false);
            setConceptoEditar(null);
            setForm(FORM_VACIO);
        } catch (err) {
            console.error('Error al guardar el concepto:', err);
            const mensaje = err.response?.status === 403
                ? 'No tenés permisos para guardar conceptos.'
                : mensajeDeError(err, 'No se pudo guardar el concepto.');
            toast.error(mensaje);
        } finally {
            setGuardando(false);
        }
    };

    // --------------------------------- ELIMINAR ---------------------------------

    const handleEliminar = async () => {
        setEliminando(true);
        try {
            await eliminarConcepto(conceptoEliminar.idConcepto);
            toast.success('Concepto eliminado correctamente.');
            setConceptoEliminar(null);
            // Si era el último de la página, volvemos a la anterior
            if (conceptos.length === 1 && page > 0) {
                setPage(p => p - 1);
            } else {
                setRecarga(r => r + 1);
            }
        } catch (err) {
            console.error('Error al eliminar el concepto:', err);
            const mensaje = err.response?.status === 403
                ? 'No tenés permisos para eliminar conceptos.'
                : mensajeDeError(err, 'No se pudo eliminar el concepto.');
            toast.error(mensaje);
        } finally {
            setEliminando(false);
        }
    };

    // ---------------------------------- TABLA -----------------------------------

    // Filas para la tabla: mismo orden que conceptos, así el índice identifica al concepto
    const filas = conceptos.map((c) => [
        codigoConcepto(c.idConcepto),
        c.nombre || SIN_DATO,
        formatearMonto(c.montoBase),
    ]);

    const tableActions = [
        { type: 'edit', title: 'Editar', onClick: (_, index) => abrirEditar(conceptos[index]) },
        {
            type: 'delete',
            title: 'Eliminar',
            show: (_, index) => !esConceptoDeInscripcion(conceptos[index]?.nombre),
            onClick: (_, index) => setConceptoEliminar(conceptos[index]),
        },
    ];

    const notaNombre = () => {
        if (nombreFijo) return 'Las inscripciones usan este concepto: solo se puede cambiar su monto.';
        if (conceptoEditar) return 'El nombre también cambia en las facturas ya emitidas. Los montos cobrados no.';
        return null;
    };

    return (
        <div className="container-page">
            <div className="flex flex-col mt-[24px]">
                <h1>Conceptos</h1>
                <h2>Catálogo de cuotas, matrículas y derechos que se pueden facturar</h2>
            </div>

            <div className="flex flex-row justify-between items-center gap-4">
                <SearchInput
                    placeholder="Buscar por nombre"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                />
                <button className="btn-primary cursor-pointer" onClick={abrirCrear}>
                    <i className="icon-[heroicons--plus] text-white mr-2"></i>
                    Nuevo concepto
                </button>
            </div>

            <Table
                headers={headers}
                data={filas}
                actions={tableActions}
                loading={loading}
                emptyMessage={error || 'No se encontraron conceptos'}
                currentPage={page + 1}
                totalPages={totalPages}
                totalElements={totalElements}
                onPrevPage={() => setPage(p => Math.max(0, p - 1))}
                onNextPage={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            />

            {/* -------------------------- CREAR / EDITAR ------------------------- */}
            <Modal
                isOpen={formAbierto}
                onClose={cerrarFormulario}
                title={conceptoEditar ? 'Editar concepto' : 'Nuevo concepto'}
            >
                <form onSubmit={handleGuardar} className="flex flex-col" noValidate>
                    <div className="p-6 bg-(--bgColor-main) flex flex-col gap-5">
                        <div>
                            <label htmlFor="nombre" className={LABEL_CLASS}>Nombre</label>
                            <input
                                id="nombre"
                                type="text"
                                name="nombre"
                                maxLength={LARGO_MAXIMO_NOMBRE}
                                value={form.nombre}
                                onChange={handleInputChange}
                                placeholder="Ej. Cuota 1"
                                className={INPUT_CLASS}
                                disabled={guardando || nombreFijo}
                            />
                            {notaNombre() && <p className="mt-1.5 text-xs text-gray-500">{notaNombre()}</p>}
                        </div>
                        <div>
                            <label htmlFor="montoBase" className={LABEL_CLASS}>Monto base (Gs.)</label>
                            <input
                                id="montoBase"
                                type="number"
                                name="montoBase"
                                min="0"
                                step="1"
                                value={form.montoBase}
                                onChange={handleInputChange}
                                placeholder="150000"
                                className={INPUT_CLASS}
                                disabled={guardando}
                            />
                        </div>
                    </div>

                    <div className="px-6 py-4 bg-white border-t border-(--borderColor-input) flex justify-end items-center gap-4">
                        <button
                            type="button"
                            onClick={cerrarFormulario}
                            disabled={guardando}
                            className="text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors cursor-pointer disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button type="submit" disabled={guardando} className="btn-primary cursor-pointer flex items-center gap-2 disabled:opacity-60">
                            {guardando && <Spinner className="h-4 w-4 text-white" />}
                            {conceptoEditar ? 'Guardar cambios' : 'Crear concepto'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ----------------------------- ELIMINAR ---------------------------- */}
            <ConfirmModal
                isOpen={Boolean(conceptoEliminar)}
                onClose={() => setConceptoEliminar(null)}
                onConfirm={handleEliminar}
                loading={eliminando}
                title="Eliminar concepto"
                message={<>¿Seguro que querés eliminar el concepto <b>{conceptoEliminar?.nombre}</b>?</>}
                warning="Ya no se va a poder elegir al crear facturas. Las facturas ya emitidas no se modifican."
                confirmText="Eliminar"
            />
        </div>
    );
};
