import { useState, useEffect } from "react";
import { toast } from "sonner";
import { SearchInput } from "../components/SearchInput";
import { Table } from "../components/Table";
import { Modal } from "../components/Modal";
import { ConfirmModal } from "../components/ConfirmModal";
import { Spinner } from "../components/Spinner";
import {
    listarMateriasPaginado,
    crearMateria,
    actualizarMateria,
    eliminarMateria
} from "../services/notasService";
import { listarProfesores } from "../services/usuariosService";
import { mensajeDeError } from "../services/api";

// Filas por página (= size enviado al backend), igual que en Alumnos
const MATERIAS_POR_PAGINA = 8;

// Se cargan todos los profesores de una vez: alimentan el select y la traducción id -> nombre
const MAX_PROFESORES = 1000;

// Valor a mostrar cuando un campo viene vacío
const SIN_DATO = '—';

// Días que se pueden elegir en el formulario (value = enum DiasSemana del backend)
const DIAS_SEMANA = [
    { value: 'LUNES', label: 'Lunes' },
    { value: 'MARTES', label: 'Martes' },
    { value: 'MIERCOLES', label: 'Miércoles' },
    { value: 'JUEVES', label: 'Jueves' },
    { value: 'VIERNES', label: 'Viernes' },
    { value: 'SABADO', label: 'Sábado' },
];

// Etiqueta legible de cualquier valor del enum (incluye DOMINGO, que el backend acepta)
const ETIQUETA_DIA = {
    ...Object.fromEntries(DIAS_SEMANA.map(d => [d.value, d.label])),
    DOMINGO: 'Domingo',
};
const formatearDia = (dia) => ETIQUETA_DIA[dia] || dia || SIN_DATO;

const FORM_VACIO = { nombreMateria: "", idProfesor: "", dia: "", descripcion: "" };

const INPUT_CLASS = "w-full px-3 py-2 rounded-lg border border-(--borderColor-input) bg-white text-sm focus:outline-none focus:border-(--btnColor-primary)";
const LABEL_CLASS = "block text-xs font-bold text-gray-600 tracking-wider uppercase mb-2";

export const SubjectsPage = () => {
    const [busqueda, setBusqueda] = useState("");   // lo que se escribe en el input
    const [filtro, setFiltro] = useState("");       // lo que se manda al backend (con debounce)
    const [materias, setMaterias] = useState([]);
    const [profesores, setProfesores] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0); // 0-based, como lo espera Spring
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);
    const [recarga, setRecarga] = useState(0);      // incrementarlo vuelve a pedir la página actual

    // Modales
    const [materiaVer, setMateriaVer] = useState(null);
    const [formAbierto, setFormAbierto] = useState(false);
    const [materiaEditar, setMateriaEditar] = useState(null); // null = crear, objeto = editar
    const [form, setForm] = useState(FORM_VACIO);
    const [guardando, setGuardando] = useState(false);
    const [materiaEliminar, setMateriaEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(false);

    const headers = ['Materia', 'Profesor', 'Día', 'Acciones'];

    // Profesores: una sola vez al entrar. Si fallan, la tabla de materias se sigue mostrando.
    useEffect(() => {
        let ignore = false;
        listarProfesores({ size: MAX_PROFESORES })
            .then((lista) => { if (!ignore) setProfesores(lista); })
            .catch((err) => {
                if (ignore) return;
                console.error("Error al cargar profesores:", err);
                toast.warning("No se pudieron cargar los profesores.");
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

    // Materias: se vuelven a pedir al cambiar de página, de filtro o al forzar una recarga
    useEffect(() => {
        // Evita actualizar el estado con una respuesta vieja (cambio rápido de página,
        // desmontaje del componente o doble ejecución de StrictMode)
        let ignore = false;

        const cargar = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await listarMateriasPaginado({ page, size: MATERIAS_POR_PAGINA, nombre: filtro });
                if (ignore) return;
                setMaterias(data.content);
                setTotalPages(Math.max(1, data.totalPages));
                setTotalElements(data.totalElements);
            } catch (err) {
                if (ignore) return;
                console.error("Error al cargar materias:", err);
                const mensaje = err.response?.status === 403
                    ? "No tenés permisos para ver las materias"
                    : "No se pudieron cargar las materias";
                setMaterias([]);
                setError(mensaje);
                toast.error(mensaje);
            } finally {
                if (!ignore) setLoading(false);
            }
        };
        cargar();

        return () => { ignore = true; };
    }, [page, filtro, recarga]);

    // Diccionario idUsuario -> nombre para mostrar el profesor de cada materia
    const profesoresPorId = Object.fromEntries(profesores.map(p => [p.idUsuario, p.nombre]));
    const nombreProfesor = (idProfesor) => profesoresPorId[idProfesor] || SIN_DATO;

    // ------------------------------ CREAR / EDITAR ------------------------------

    const abrirCrear = () => {
        setMateriaEditar(null);
        setForm(FORM_VACIO);
        setFormAbierto(true);
    };

    const abrirEditar = (materia) => {
        setMateriaEditar(materia);
        setForm({
            nombreMateria: materia.nombreMateria || "",
            idProfesor: materia.idProfesor != null ? String(materia.idProfesor) : "",
            dia: materia.dia || "",
            descripcion: materia.descripcion || ""
        });
        setFormAbierto(true);
    };

    const cerrarFormulario = () => {
        if (guardando) return;
        setFormAbierto(false);
        setMateriaEditar(null);
        setForm(FORM_VACIO);
    };

    const handleInputChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleGuardar = async (e) => {
        e.preventDefault();

        if (!form.nombreMateria.trim()) {
            toast.warning("El nombre de la materia es obligatorio.");
            return;
        }
        if (!form.idProfesor) {
            toast.warning("Seleccioná un profesor.");
            return;
        }
        if (!form.dia) {
            toast.warning("Seleccioná un día de la semana.");
            return;
        }
        if (!form.descripcion.trim()) {
            toast.warning("La descripción es obligatoria.");
            return;
        }

        // Siempre completo: en el PUT, el backend deja en null lo que no se envía
        const dto = {
            nombreMateria: form.nombreMateria.trim(),
            idProfesor: Number(form.idProfesor),
            dia: form.dia,
            descripcion: form.descripcion.trim()
        };

        setGuardando(true);
        try {
            if (materiaEditar) {
                await actualizarMateria(materiaEditar.idMateria, dto);
                toast.success("Materia actualizada correctamente.");
                setRecarga(r => r + 1);
            } else {
                await crearMateria(dto);
                toast.success("Materia creada correctamente.");
                // La materia nueva puede quedar en cualquier página: volvemos a la primera
                setPage(0);
                setRecarga(r => r + 1);
            }
            setFormAbierto(false);
            setMateriaEditar(null);
            setForm(FORM_VACIO);
        } catch (err) {
            console.error("Error al guardar la materia:", err);
            const mensaje = err.response?.status === 403
                ? "No tenés permisos para guardar materias."
                : mensajeDeError(err, "No se pudo guardar la materia.");
            toast.error(mensaje);
        } finally {
            setGuardando(false);
        }
    };

    // --------------------------------- ELIMINAR ---------------------------------

    const handleEliminar = async () => {
        setEliminando(true);
        try {
            await eliminarMateria(materiaEliminar.idMateria);
            toast.success("Materia eliminada correctamente.");
            setMateriaEliminar(null);
            // Si era la última de la página, volvemos a la anterior
            if (materias.length === 1 && page > 0) {
                setPage(p => p - 1);
            } else {
                setRecarga(r => r + 1);
            }
        } catch (err) {
            console.error("Error al eliminar la materia:", err);
            const mensaje = err.response?.status === 403
                ? "No tenés permisos para eliminar materias."
                : mensajeDeError(err, "No se pudo eliminar la materia.");
            toast.error(mensaje);
        } finally {
            setEliminando(false);
        }
    };

    // ---------------------------------- TABLA -----------------------------------

    // Filas para la tabla: mismo orden que materias, así el índice identifica a la materia
    const filas = materias.map(m => [
        m.nombreMateria || SIN_DATO,
        nombreProfesor(m.idProfesor),
        formatearDia(m.dia)
    ]);

    const tableActions = [
        { type: 'view', title: 'Ver', onClick: (_, index) => setMateriaVer(materias[index]) },
        { type: 'edit', title: 'Editar', onClick: (_, index) => abrirEditar(materias[index]) },
        { type: 'delete', title: 'Eliminar', onClick: (_, index) => setMateriaEliminar(materias[index]) }
    ];

    return (
        <div className="container-page">
            <div className="flex flex-col mt-[24px]">
                <h1>Materias</h1>
                <h2>Gestión de materias del cursillo</h2>
            </div>

            <div className="flex flex-row justify-between items-center gap-4">
                <SearchInput
                    placeholder="Buscar por nombre"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                />
                <button className="btn-primary cursor-pointer" onClick={abrirCrear}>
                    <i className="icon-[heroicons--plus] text-white mr-2"></i>
                    Nueva materia
                </button>
            </div>

            <Table
                headers={headers}
                data={filas}
                actions={tableActions}
                loading={loading}
                emptyMessage={error || "No se encontraron materias"}
                currentPage={page + 1}
                totalPages={totalPages}
                totalElements={totalElements}
                onPrevPage={() => setPage(p => Math.max(0, p - 1))}
                onNextPage={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            />

            {/* ------------------------------- VER ------------------------------- */}
            <Modal
                isOpen={Boolean(materiaVer)}
                onClose={() => setMateriaVer(null)}
                title="Datos de la materia"
                size="md"
                closeOnBackdrop
            >
                <dl className="p-6 bg-(--bgColor-main) flex flex-col gap-4 text-sm">
                    {[
                        ['Materia', materiaVer?.nombreMateria],
                        ['Profesor', materiaVer && nombreProfesor(materiaVer.idProfesor)],
                        ['Día', materiaVer && formatearDia(materiaVer.dia)],
                        ['Descripción', materiaVer?.descripcion],
                    ].map(([label, valor]) => (
                        <div key={label}>
                            <dt className={LABEL_CLASS}>{label}</dt>
                            <dd className="text-slate-800 whitespace-pre-line">{valor || SIN_DATO}</dd>
                        </div>
                    ))}
                </dl>
                <div className="px-6 py-4 bg-white border-t border-(--borderColor-input) flex justify-end">
                    <button type="button" className="btn-primary cursor-pointer" onClick={() => { setMateriaVer(null); abrirEditar(materiaVer); }}>
                        Editar
                    </button>
                </div>
            </Modal>

            {/* -------------------------- CREAR / EDITAR ------------------------- */}
            <Modal
                isOpen={formAbierto}
                onClose={cerrarFormulario}
                title={materiaEditar ? "Editar materia" : "Nueva materia"}
            >
                <form onSubmit={handleGuardar} className="flex flex-col">
                    <div className="p-6 bg-(--bgColor-main) flex flex-col gap-5">

                        <div>
                            <label htmlFor="nombreMateria" className={LABEL_CLASS}>Nombre de la materia</label>
                            <input
                                id="nombreMateria"
                                type="text"
                                name="nombreMateria"
                                value={form.nombreMateria}
                                onChange={handleInputChange}
                                placeholder="Ej. Matemática I"
                                className={INPUT_CLASS}
                                disabled={guardando}
                            />
                        </div>

                        <div>
                            <label htmlFor="idProfesor" className={LABEL_CLASS}>Profesor</label>
                            <select
                                id="idProfesor"
                                name="idProfesor"
                                value={form.idProfesor}
                                onChange={handleInputChange}
                                className={`${INPUT_CLASS} text-gray-700`}
                                disabled={guardando}
                            >
                                <option value="" disabled>Seleccione un profesor</option>
                                {profesores.map((prof) => (
                                    <option key={prof.idUsuario} value={prof.idUsuario}>
                                        {prof.nombre || `Profesor #${prof.idUsuario}`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <span className={LABEL_CLASS}>Día de clase</span>
                            <div className="flex flex-wrap gap-2">
                                {DIAS_SEMANA.map(({ value, label }) => {
                                    const isSelected = form.dia === value;
                                    return (
                                        <button
                                            type="button"
                                            key={value}
                                            disabled={guardando}
                                            onClick={() => setForm({ ...form, dia: value })}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${isSelected
                                                ? 'bg-(--btnColor-primary) text-white border-(--btnColor-primary)'
                                                : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="descripcion" className={LABEL_CLASS}>Descripción</label>
                            <textarea
                                id="descripcion"
                                name="descripcion"
                                rows={3}
                                value={form.descripcion}
                                onChange={handleInputChange}
                                placeholder="Describe los objetivos del curso..."
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
                            {materiaEditar ? "Guardar cambios" : "Crear materia"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ----------------------------- ELIMINAR ---------------------------- */}
            <ConfirmModal
                isOpen={Boolean(materiaEliminar)}
                onClose={() => setMateriaEliminar(null)}
                onConfirm={handleEliminar}
                loading={eliminando}
                title="Eliminar materia"
                message={<>¿Seguro que querés eliminar la materia <b>{materiaEliminar?.nombreMateria}</b>?</>}
                warning="La materia dejará de aparecer en el listado. Sus exámenes, notas e inscripciones no se modifican."
                confirmText="Eliminar"
            />
        </div>
    );
};
