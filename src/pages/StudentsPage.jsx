import { useState, useEffect } from "react";
import { toast } from "sonner";
import { SearchInput } from "../components/SearchInput";
import { Table } from "../components/Table";
import { Modal } from "../components/Modal";
import { ConfirmModal } from "../components/ConfirmModal";
import { Spinner } from "../components/Spinner";
import {
    listarAlumnosPaginado,
    actualizarUsuario,
    eliminarUsuario,
    armarUsuarioRequest
} from "../services/usuariosService";
import { mensajeDeError } from "../services/api";

// Filas por página 
const ALUMNOS_POR_PAGINA = 8;

// Valor a mostrar cuando un campo viene vacío
const SIN_DATO = '—';
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+$/;
// Teléfono: solo dígitos, con un "+" opcional al inicio (ej. 0983123456 o +595983123456)
const TELEFONO_REGEX = /^\+?\d+$/;

const FORM_VACIO = { nombre: "", email: "", telefono: "" };

const INPUT_CLASS = "w-full px-3 py-2 rounded-lg border border-(--borderColor-input) bg-white text-sm focus:outline-none focus:border-(--btnColor-primary)";
const LABEL_CLASS = "block text-xs font-bold text-gray-600 tracking-wider uppercase mb-2";

export const StudentsPage = () => {
    const [busqueda, setBusqueda] = useState("");   // lo que se escribe en el input
    const [filtro, setFiltro] = useState("");       // lo que se manda al backend (con debounce)
    const [alumnos, setAlumnos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);
    const [recarga, setRecarga] = useState(0);      // incrementarlo vuelve a pedir la página actual

    // Modales
    const [alumnoVer, setAlumnoVer] = useState(null);
    const [alumnoEditar, setAlumnoEditar] = useState(null);
    const [form, setForm] = useState(FORM_VACIO);
    const [guardando, setGuardando] = useState(false);
    const [alumnoEliminar, setAlumnoEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(false);

    // En la BD solo existe "nombre": ahí se guardan nombre y apellido juntos
    const headers = ['Nombre', 'Email', 'Teléfono', 'Acciones'];

    // La búsqueda espera un momento antes de consultar, para no pedir en cada tecla
    useEffect(() => {
        const espera = setTimeout(() => {
            setFiltro(busqueda);
            setPage(0);
        }, 400);
        return () => clearTimeout(espera);
    }, [busqueda]);

    useEffect(() => {
        // Evita actualizar el estado con una respuesta vieja (cambio rápido de página,
        // desmontaje del componente o doble ejecución de StrictMode)
        let ignore = false;

        const cargar = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await listarAlumnosPaginado({ page, size: ALUMNOS_POR_PAGINA, nombre: filtro });
                if (ignore) return;
                // Guardamos los objetos completos (con su id) y armamos las filas al renderizar
                setAlumnos(data.content);
                setTotalPages(Math.max(1, data.totalPages));
                setTotalElements(data.totalElements);
            } catch (err) {
                if (ignore) return;
                console.error("Error al cargar alumnos:", err);
                const mensaje = err.response?.status === 403
                    ? "No tenés permisos para ver los alumnos"
                    : "No se pudieron cargar los alumnos";
                setAlumnos([]);
                setError(mensaje);
                toast.error(mensaje);
            } finally {
                if (!ignore) setLoading(false);
            }
        };
        cargar();

        return () => { ignore = true; };
    }, [page, filtro, recarga]);

    // ---------------------------------- EDITAR ----------------------------------

    const abrirEditar = (alumno) => {
        setAlumnoEditar(alumno);
        setForm({
            nombre: alumno.nombre || "",
            email: alumno.email || "",
            telefono: alumno.telefono || ""
        });
    };

    const cerrarEditar = () => {
        if (guardando) return;
        setAlumnoEditar(null);
        setForm(FORM_VACIO);
    };

    const handleInputChange = (e) => {
        const { name } = e.target;
        let { value } = e.target;
        // En el teléfono solo se aceptan dígitos y un "+" al inicio
        if (name === "telefono") {
            value = value.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
        }
        setForm({ ...form, [name]: value });
    };

    const handleGuardar = async (e) => {
        e.preventDefault();

        if (!form.nombre.trim()) {
            toast.warning("El nombre es obligatorio.");
            return;
        }
        if (!EMAIL_REGEX.test(form.email.trim())) {
            toast.warning("Ingresá un email válido.");
            return;
        }
        if (!TELEFONO_REGEX.test(form.telefono.trim())) {
            toast.warning("El teléfono solo puede contener números (y un + al inicio).");
            return;
        }

        setGuardando(true);
        try {
            await actualizarUsuario(alumnoEditar.idUsuario, armarUsuarioRequest(alumnoEditar, form));
            toast.success("Alumno actualizado correctamente.");
            setAlumnoEditar(null);
            setForm(FORM_VACIO);
            setRecarga(r => r + 1);
        } catch (err) {
            console.error("Error al actualizar alumno:", err);
            toast.error(mensajeDeError(err, "No se pudo actualizar el alumno."));
        } finally {
            setGuardando(false);
        }
    };

    // --------------------------------- ELIMINAR ---------------------------------

    const handleEliminar = async () => {
        setEliminando(true);
        try {
            await eliminarUsuario(alumnoEliminar.idUsuario);
            toast.success("Alumno eliminado correctamente.");
            setAlumnoEliminar(null);
            // Si era el último de la página, volvemos a la anterior
            if (alumnos.length === 1 && page > 0) {
                setPage(p => p - 1);
            } else {
                setRecarga(r => r + 1);
            }
        } catch (err) {
            console.error("Error al eliminar alumno:", err);
            const mensaje = err.response?.status === 403
                ? "No tenés permisos para eliminar alumnos."
                : mensajeDeError(err, "No se pudo eliminar el alumno.");
            toast.error(mensaje);
        } finally {
            setEliminando(false);
        }
    };

    // ---------------------------------- TABLA -----------------------------------

    // Filas para la tabla
    const filas = alumnos.map(a => [
        a.nombre || SIN_DATO,
        a.email || SIN_DATO,
        a.telefono || SIN_DATO
    ]);

    const tableActions = [
        { type: 'view', title: 'Ver', onClick: (_, index) => setAlumnoVer(alumnos[index]) },
        { type: 'edit', title: 'Editar', onClick: (_, index) => abrirEditar(alumnos[index]) },
        { type: 'delete', title: 'Eliminar', onClick: (_, index) => setAlumnoEliminar(alumnos[index]) }
    ];

    return (
        <div className="container-page">
            <div className="flex flex-col mt-[24px]">
                <h1>Alumnos</h1>
                <h2>Gestión de alumnos del cursillo</h2>
            </div>
            <div className="flex flex-row justify-between items-center gap-4">
                <SearchInput
                    placeholder="Buscar por nombre"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                />
            </div>
            <Table
                headers={headers}
                data={filas}
                actions={tableActions}
                loading={loading}
                emptyMessage={error || "No se encontraron alumnos"}
                currentPage={page + 1}
                totalPages={totalPages}
                totalElements={totalElements}
                onPrevPage={() => setPage(p => Math.max(0, p - 1))}
                onNextPage={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            />

            {/* ------------------------------- VER ------------------------------- */}
            <Modal
                isOpen={Boolean(alumnoVer)}
                onClose={() => setAlumnoVer(null)}
                title="Datos del alumno"
                size="md"
                closeOnBackdrop
            >
                <dl className="p-6 bg-(--bgColor-main) flex flex-col gap-4 text-sm">
                    {[
                        ['Nombre', alumnoVer?.nombre],
                        ['Email', alumnoVer?.email],
                        ['Teléfono', alumnoVer?.telefono],
                    ].map(([label, valor]) => (
                        <div key={label}>
                            <dt className={LABEL_CLASS}>{label}</dt>
                            <dd className="text-slate-800">{valor || SIN_DATO}</dd>
                        </div>
                    ))}
                </dl>
                <div className="px-6 py-4 bg-white border-t border-(--borderColor-input) flex justify-end">
                    <button type="button" className="btn-primary cursor-pointer" onClick={() => { setAlumnoVer(null); abrirEditar(alumnoVer); }}>
                        Editar
                    </button>
                </div>
            </Modal>

            {/* ------------------------------ EDITAR ----------------------------- */}
            <Modal isOpen={Boolean(alumnoEditar)} onClose={cerrarEditar} title="Editar alumno">
                <form onSubmit={handleGuardar} className="flex flex-col">
                    <div className="p-6 bg-(--bgColor-main) flex flex-col gap-5">
                        <div>
                            <label htmlFor="nombre" className={LABEL_CLASS}>Nombre y apellido</label>
                            <input id="nombre" name="nombre" type="text" value={form.nombre}
                                onChange={handleInputChange} className={INPUT_CLASS} disabled={guardando} />
                        </div>
                        <div>
                            <label htmlFor="email" className={LABEL_CLASS}>Email</label>
                            <input id="email" name="email" type="email" value={form.email}
                                onChange={handleInputChange} className={INPUT_CLASS} disabled={guardando} />
                        </div>
                        <div>
                            <label htmlFor="telefono" className={LABEL_CLASS}>Teléfono</label>
                            <input id="telefono" name="telefono" type="tel" inputMode="numeric" value={form.telefono}
                                onChange={handleInputChange} className={INPUT_CLASS} disabled={guardando}
                                placeholder="Ej. 0983123456" />
                        </div>
                    </div>

                    <div className="px-6 py-4 bg-white border-t border-(--borderColor-input) flex justify-end items-center gap-4">
                        <button
                            type="button"
                            onClick={cerrarEditar}
                            disabled={guardando}
                            className="text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors cursor-pointer disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button type="submit" disabled={guardando} className="btn-primary cursor-pointer flex items-center gap-2 disabled:opacity-60">
                            {guardando && <Spinner className="h-4 w-4 text-white" />}
                            Guardar cambios
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ----------------------------- ELIMINAR ---------------------------- */}
            <ConfirmModal
                isOpen={Boolean(alumnoEliminar)}
                onClose={() => setAlumnoEliminar(null)}
                onConfirm={handleEliminar}
                loading={eliminando}
                title="Eliminar alumno"
                message={<>¿Seguro que querés eliminar a <b>{alumnoEliminar?.nombre}</b>?</>}
                warning="El alumno dejará de aparecer en el listado y no podrá volver a iniciar sesión. Sus inscripciones, notas y facturas no se modifican."
                confirmText="Eliminar"
            />
        </div>
    );
};
