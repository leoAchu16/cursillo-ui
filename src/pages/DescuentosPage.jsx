import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    listarDescuentosPaginado,
    crearDescuento,
    actualizarDescuento,
    eliminarDescuento,
} from '../services/inscripcionesService';
import { SearchInput } from '../components/SearchInput';
import { Table } from '../components/Table';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { Spinner } from '../components/Spinner';
import { mensajeDeError } from '../services/api';

// Filas por página (= size enviado al backend), igual que en las otras páginas
const DESCUENTOS_POR_PAGINA = 8;

// Límites de la base de datos: nombre varchar(50), descripcion varchar(100)
const LARGO_MAXIMO_NOMBRE = 50;
const LARGO_MAXIMO_DESCRIPCION = 100;

// Valor a mostrar cuando un campo viene vacío
const SIN_DATO = '—';

const FORM_VACIO = { nombre: '', porcentaje: '', descripcion: '' };

const INPUT_CLASS = "w-full px-3 py-2 rounded-lg border border-(--borderColor-input) bg-white text-sm focus:outline-none focus:border-(--btnColor-primary)";
const LABEL_CLASS = "block text-xs font-bold text-gray-600 tracking-wider uppercase mb-2";

export const DescuentosPage = () => {
    const [busqueda, setBusqueda] = useState('');   // lo que se escribe en el input
    const [filtro, setFiltro] = useState('');       // lo que se manda al backend (con debounce)
    const [descuentos, setDescuentos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0); // 0-based, como lo espera Spring
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);
    const [recarga, setRecarga] = useState(0);      // incrementarlo vuelve a pedir la página actual

    // Modales
    const [formAbierto, setFormAbierto] = useState(false);
    const [descuentoEditar, setDescuentoEditar] = useState(null); // null = crear, objeto = editar
    const [form, setForm] = useState(FORM_VACIO);
    const [guardando, setGuardando] = useState(false);
    const [descuentoEliminar, setDescuentoEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(false);

    const headers = ['Nombre', 'Porcentaje', 'Descripción', 'Acciones'];

    // La búsqueda espera un momento antes de consultar, para no pedir en cada tecla
    useEffect(() => {
        const espera = setTimeout(() => {
            setFiltro(busqueda);
            setPage(0);
        }, 400);
        return () => clearTimeout(espera);
    }, [busqueda]);

    // Descuentos: se vuelven a pedir al cambiar de página, de filtro o al forzar una recarga
    useEffect(() => {
        // Evita actualizar el estado con una respuesta vieja (cambio rápido de página,
        // desmontaje del componente o doble ejecución de StrictMode)
        let ignore = false;

        const cargar = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await listarDescuentosPaginado({ page, size: DESCUENTOS_POR_PAGINA, nombre: filtro });
                if (ignore) return;
                setDescuentos(data.content);
                setTotalPages(Math.max(1, data.totalPages));
                setTotalElements(data.totalElements);
            } catch (err) {
                if (ignore) return;
                console.error('Error al cargar descuentos:', err);
                const mensaje = err.response?.status === 403
                    ? 'No tenés permisos para ver los descuentos'
                    : 'No se pudieron cargar los descuentos';
                setDescuentos([]);
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

    const abrirCrear = () => {
        setDescuentoEditar(null);
        setForm(FORM_VACIO);
        setFormAbierto(true);
    };

    const abrirEditar = (descuento) => {
        setDescuentoEditar(descuento);
        setForm({
            nombre: descuento.nombre || '',
            porcentaje: descuento.porcentaje != null ? String(descuento.porcentaje) : '',
            descripcion: descuento.descripcion || '',
        });
        setFormAbierto(true);
    };

    const cerrarFormulario = () => {
        if (guardando) return;
        setFormAbierto(false);
        setDescuentoEditar(null);
        setForm(FORM_VACIO);
    };

    const handleInputChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleGuardar = async (e) => {
        e.preventDefault();

        const nombre = form.nombre.trim();
        const descripcion = form.descripcion.trim();
        const porcentaje = Number(form.porcentaje);

        if (!nombre) {
            toast.warning('El nombre del descuento es obligatorio.');
            return;
        }
        if (form.porcentaje === '' || !Number.isInteger(porcentaje) || porcentaje < 1 || porcentaje > 100) {
            toast.warning('El porcentaje debe ser un número entero entre 1 y 100.');
            return;
        }

        const dto = { nombre, porcentaje, descripcion: descripcion || null };

        setGuardando(true);
        try {
            // El backend rechaza los nombres repetidos
            if (descuentoEditar) {
                await actualizarDescuento(descuentoEditar.idDescuento, dto);
                toast.success('Descuento actualizado correctamente.');
            } else {
                await crearDescuento(dto);
                toast.success('Descuento creado correctamente.');
                // El descuento nuevo puede quedar en cualquier página: volvemos a la primera
                setPage(0);
            }
            setRecarga(r => r + 1);
            setFormAbierto(false);
            setDescuentoEditar(null);
            setForm(FORM_VACIO);
        } catch (err) {
            console.error('Error al guardar el descuento:', err);
            const mensaje = err.response?.status === 403
                ? 'No tenés permisos para guardar descuentos.'
                : mensajeDeError(err, 'No se pudo guardar el descuento.');
            toast.error(mensaje);
        } finally {
            setGuardando(false);
        }
    };

    // --------------------------------- ELIMINAR ---------------------------------

    const handleEliminar = async () => {
        setEliminando(true);
        try {
            await eliminarDescuento(descuentoEliminar.idDescuento);
            toast.success('Descuento eliminado correctamente.');
            setDescuentoEliminar(null);
            // Si era el último de la página, volvemos a la anterior
            if (descuentos.length === 1 && page > 0) {
                setPage(p => p - 1);
            } else {
                setRecarga(r => r + 1);
            }
        } catch (err) {
            console.error('Error al eliminar el descuento:', err);
            const mensaje = err.response?.status === 403
                ? 'No tenés permisos para eliminar descuentos.'
                : mensajeDeError(err, 'No se pudo eliminar el descuento.');
            toast.error(mensaje);
        } finally {
            setEliminando(false);
        }
    };

    // ---------------------------------- TABLA -----------------------------------

    // Filas para la tabla: mismo orden que descuentos, así el índice identifica al descuento
    const filas = descuentos.map((d) => [
        d.nombre || SIN_DATO,
        d.porcentaje != null ? `${d.porcentaje} %` : SIN_DATO,
        <span className="block max-w-xs mx-auto truncate" title={d.descripcion || ''}>{d.descripcion || SIN_DATO}</span>,
    ]);

    const tableActions = [
        { type: 'edit', title: 'Editar', onClick: (_, index) => abrirEditar(descuentos[index]) },
        { type: 'delete', title: 'Eliminar', onClick: (_, index) => setDescuentoEliminar(descuentos[index]) },
    ];

    return (
        <div className="container-page">
            <div className="flex flex-col mt-[24px]">
                <h1>Descuentos</h1>
                <h2>Descuentos que se pueden aplicar a las inscripciones</h2>
            </div>

            <div className="flex flex-row justify-between items-center gap-4">
                <SearchInput
                    placeholder="Buscar por nombre"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                />
                <button className="btn-primary cursor-pointer" onClick={abrirCrear}>
                    <i className="icon-[heroicons--plus] text-white mr-2"></i>
                    Nuevo descuento
                </button>
            </div>

            <Table
                headers={headers}
                data={filas}
                actions={tableActions}
                loading={loading}
                emptyMessage={error || 'No se encontraron descuentos'}
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
                title={descuentoEditar ? 'Editar descuento' : 'Nuevo descuento'}
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
                                placeholder="Ej. Hermanos"
                                className={INPUT_CLASS}
                                disabled={guardando}
                            />
                        </div>
                        <div>
                            <label htmlFor="porcentaje" className={LABEL_CLASS}>Porcentaje (%)</label>
                            <input
                                id="porcentaje"
                                type="number"
                                name="porcentaje"
                                min="1"
                                max="100"
                                step="1"
                                value={form.porcentaje}
                                onChange={handleInputChange}
                                placeholder="10"
                                className={INPUT_CLASS}
                                disabled={guardando}
                            />
                            {descuentoEditar && (
                                <p className="mt-1.5 text-xs text-gray-500">
                                    Las inscripciones que ya tienen este descuento conservan su total.
                                </p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="descripcion" className={LABEL_CLASS}>Descripción (opcional)</label>
                            <textarea
                                id="descripcion"
                                name="descripcion"
                                rows={2}
                                maxLength={LARGO_MAXIMO_DESCRIPCION}
                                value={form.descripcion}
                                onChange={handleInputChange}
                                placeholder="Ej. Para el segundo hermano inscripto"
                                className={`${INPUT_CLASS} resize-none`}
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
                            {descuentoEditar ? 'Guardar cambios' : 'Crear descuento'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ----------------------------- ELIMINAR ---------------------------- */}
            <ConfirmModal
                isOpen={Boolean(descuentoEliminar)}
                onClose={() => setDescuentoEliminar(null)}
                onConfirm={handleEliminar}
                loading={eliminando}
                title="Eliminar descuento"
                message={<>¿Seguro que querés eliminar el descuento <b>{descuentoEliminar?.nombre}</b>?</>}
                warning="Ya no se va a poder aplicar. Las inscripciones que lo tienen conservan su total."
                confirmText="Eliminar"
            />
        </div>
    );
};
