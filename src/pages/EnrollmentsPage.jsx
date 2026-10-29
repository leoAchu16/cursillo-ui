import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SearchInput } from "../components/SearchInput";
import { Table } from "../components/Table";
import { Modal } from "../components/Modal";
import { listarInscripciones, eliminarInscripcion } from "../services/inscripcionesService";

export const EnrollmentsPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Estados de datos y paginación
    const [inscripciones, setInscripciones] = useState([]);
    const [page, setPage] = useState(0); // 0-indexed para Spring Data
    const [size] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);
    const [nombreAlumno, setNombreAlumno] = useState("");

    // Estados de interfaz y feedback
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Capturar mensaje de éxito proveniente de navegación (ej. NewEnrollmentPage)
    useEffect(() => {
        if (location.state?.mensajeExito) {
            setSuccessMessage(location.state.mensajeExito);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Modal de detalles
    const [selectedInscripcion, setSelectedInscripcion] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Modal de confirmación de borrado
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Encabezados de la tabla
    const headers = ['Alumno', 'Fecha', 'Total', 'Estado', 'Acciones'];

    // Cargar inscripciones desde el backend
    const cargarInscripciones = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listarInscripciones(page, size, nombreAlumno);

            // Maneja respuesta de Spring Page o array simple
            if (data && Array.isArray(data.content)) {
                setInscripciones(data.content);
                setTotalPages(data.totalPages || 1);
                setTotalElements(data.totalElements ?? data.content.length);
            } else if (Array.isArray(data)) {
                setInscripciones(data);
                setTotalPages(1);
                setTotalElements(data.length);
            } else {
                setInscripciones([]);
                setTotalPages(1);
                setTotalElements(0);
            }
        } catch (err) {
            console.error("Error al obtener inscripciones:", err);
            const msg = err.response?.data?.message || err.message;
            if (err.message === "Network Error") {
                setError("No se pudo conectar con el Gateway (http://localhost:8084). Verifica que cursillo-api-gateway y cursillo-ms-inscripciones estén activos.");
            } else {
                setError(msg || "Error al cargar las inscripciones.");
            }
        } finally {
            setLoading(false);
        }
    }, [page, size, nombreAlumno]);

    // Debounce para la búsqueda de alumnos
    useEffect(() => {
        const timer = setTimeout(() => {
            cargarInscripciones();
        }, 300);

        return () => clearTimeout(timer);
    }, [cargarInscripciones]);

    // Limpiar mensaje de éxito después de 4 segundos
    useEffect(() => {
        if (successMessage) {
            const t = setTimeout(() => setSuccessMessage(null), 4000);
            return () => clearTimeout(t);
        }
    }, [successMessage]);

    // Helpers de formateo
    const formatFecha = (fecha) => {
        if (!fecha) return "Sin fecha";
        try {
            const d = new Date(fecha);
            if (isNaN(d.getTime())) return String(fecha);
            return d.toLocaleDateString("es-PY", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            });
        } catch {
            return String(fecha);
        }
    };

    const formatMonto = (monto) => {
        if (monto === undefined || monto === null) return "Gs. 0";
        return `Gs. ${Number(monto).toLocaleString("es-PY")}`;
    };

    // Confirmar y ejecutar eliminación
    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            const id = itemToDelete.id || itemToDelete.idInscripcion;
            await eliminarInscripcion(id);
            setSuccessMessage(`Inscripción #${id} eliminada con éxito.`);
            setItemToDelete(null);
            // Recargar la lista
            cargarInscripciones();
        } catch (err) {
            console.error("Error al eliminar inscripción:", err);
            setError(err.response?.data?.message || err.message || "Error al eliminar la inscripción.");
        } finally {
            setIsDeleting(false);
        }
    };

    // Construcción de filas para la tabla
    const tablaData = inscripciones.map((item, index) => {
        const nombre =
            item.nombreAlumno ||
            (item.alumno?.nombre ? `${item.alumno.nombre} ${item.alumno.apellido || ""}`.trim() : null) ||
            item.alumno ||
            `Alumno #${item.idAlumno || item.id || index + 1}`;

        const idAlumno = item.idAlumno || item.alumno?.id || "N/A";
        const fecha = formatFecha(item.fechaInscripcion || item.fecha || item.fechaCreacion);

        const montoTotal =
            item.montoTotal ??
            item.total ??
            item.costoTotal ??
            (Array.isArray(item.detallesInscripcion)
                ? item.detallesInscripcion.reduce((acc, d) => acc + (d.costo || d.monto || 0), 0)
                : 0);

        const estado = (item.estado || item.estadoInscripcion || "PENDIENTE").toUpperCase();

        const celdaAlumno = (
            <div key={`alumno-${item.id || index}`} className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-teal-100 text-(--btnColor-primary) flex items-center justify-center font-bold text-xs uppercase overflow-hidden shrink-0">
                    {String(nombre).slice(0, 2)}
                </div>
                <div>
                    <p className="font-semibold text-sm text-slate-800">{nombre}</p>
                    <p className="text-xs text-gray-500">ID Alumno: {idAlumno}</p>
                </div>
            </div>
        );

        const row = [celdaAlumno, fecha, formatMonto(montoTotal), estado];
        row._raw = item;
        row._nombre = nombre;
        return row;
    });

    // Acciones disponibles por cada fila
    const tableActions = [
        {
            type: "view",
            title: "Ver detalles",
            onClick: (fila) => {
                const raw = fila._raw;
                if (raw) {
                    setSelectedInscripcion(raw);
                    setIsDetailModalOpen(true);
                }
            }
        },
        {
            type: "delete",
            title: "Eliminar inscripción",
            onClick: (fila) => {
                const raw = fila._raw;
                if (raw) {
                    setItemToDelete(raw);
                }
            }
        }
    ];

    return (
        <div className="container-page">
            <div className="flex flex-col mt-[24px]">
                <h1>Inscripciones</h1>
                <h2>Gestión de inscripciones de alumnos a materias o exámenes</h2>
            </div>

            {/* Mensajes de feedback */}
            {successMessage && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                        <i className="icon-[heroicons--check-circle] text-emerald-600 text-xl"></i>
                        <span className="text-sm font-medium">{successMessage}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setSuccessMessage(null)}
                        className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                    >
                        <i className="icon-[heroicons--x-mark] text-lg"></i>
                    </button>
                </div>
            )}

            {error && (
                <div className="bg-rose-50 border border-rose-300 text-rose-800 px-4 py-3 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                        <i className="icon-[heroicons--exclamation-circle] text-rose-600 text-xl"></i>
                        <span className="text-sm">{error}</span>
                    </div>
                    <button
                        type="button"
                        onClick={cargarInscripciones}
                        className="text-xs bg-rose-600 text-white px-2 py-1 rounded-md hover:bg-rose-700 font-semibold cursor-pointer"
                    >
                        Reintentar
                    </button>
                </div>
            )}

            {/* Barra superior de búsqueda y acción */}
            <div className="flex flex-row justify-between items-center gap-4">
                <SearchInput
                    placeholder="Buscar por alumno..."
                    value={nombreAlumno}
                    onChange={(e) => {
                        setNombreAlumno(e.target.value);
                        setPage(0); // Reiniciar a primera página al buscar
                    }}
                />

                <button
                    onClick={() => navigate('/inscripciones/nueva')}
                    className="flex items-center bg-(--btnColor-primary) text-(--textColor-secondary) rounded-xl p-2 px-4 shadow-md hover:bg-(--btnColor-primary-hover) transition-colors cursor-pointer shrink-0"
                >
                    <i className="icon-[heroicons--plus] text-white mr-2"></i>
                    Nueva inscripción
                </button>
            </div>

            {/* Indicador de carga sutil */}
            {loading && (
                <div className="flex items-center gap-2 text-sm text-(--btnColor-primary)">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    <span>Cargando inscripciones...</span>
                </div>
            )}

            {/* Tabla con paginación integrada */}
            <Table
                headers={headers}
                data={tablaData}
                actions={tableActions}
                currentPage={page + 1}
                totalPages={totalPages}
                totalElements={totalElements}
                onPrevPage={() => setPage((prev) => Math.max(0, prev - 1))}
                onNextPage={() => setPage((prev) => (prev + 1 < totalPages ? prev + 1 : prev))}
            />

            {/* Modal de Detalle de Inscripción */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setSelectedInscripcion(null);
                }}
                title={`Detalles de Inscripción #${selectedInscripcion?.id || selectedInscripcion?.idInscripcion || ""}`}
            >
                {selectedInscripcion && (
                    <div className="p-6 flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
                            <div>
                                <span className="text-gray-500 block text-xs">Alumno</span>
                                <span className="font-semibold text-slate-800">
                                    {selectedInscripcion.nombreAlumno ||
                                        (selectedInscripcion.alumno?.nombre
                                            ? `${selectedInscripcion.alumno.nombre} ${selectedInscripcion.alumno.apellido || ""}`
                                            : null) ||
                                        `ID: ${selectedInscripcion.idAlumno}`}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs">ID Alumno</span>
                                <span className="font-semibold text-slate-800">
                                    {selectedInscripcion.idAlumno || "N/A"}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs">Fecha</span>
                                <span className="font-semibold text-slate-800">
                                    {formatFecha(selectedInscripcion.fechaInscripcion || selectedInscripcion.fecha)}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs">Estado</span>
                                <span className="inline-block mt-0.5">
                                    <span className="badge badge-success text-xs font-semibold">
                                        {(selectedInscripcion.estado || "ACTIVO").toUpperCase()}
                                    </span>
                                </span>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-semibold text-sm text-slate-700 mb-2">
                                Ítems Inscriptos ({selectedInscripcion.detallesInscripcion?.length || 0})
                            </h4>

                            {Array.isArray(selectedInscripcion.detallesInscripcion) &&
                            selectedInscripcion.detallesInscripcion.length > 0 ? (
                                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                                    {selectedInscripcion.detallesInscripcion.map((det, idx) => (
                                        <div key={idx} className="p-3 flex justify-between items-center text-sm bg-white">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`badge text-xs ${
                                                        det.tipo === "EXAMEN" ? "badge-warning" : "badge-info"
                                                    }`}
                                                >
                                                    {det.tipo || (det.idExamen ? "EXAMEN" : "MATERIA")}
                                                </span>
                                                <span className="font-medium text-slate-800">
                                                    {det.nombreMateria ||
                                                        det.nombreExamen ||
                                                        det.nombre ||
                                                        (det.idMateria ? `Materia #${det.idMateria}` : `Examen #${det.idExamen}`)}
                                                </span>
                                            </div>
                                            <span className="font-semibold text-slate-700">
                                                {formatMonto(det.costo || det.monto || det.precio)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-500 italic">No hay detalles desglosados disponibles.</p>
                            )}
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                            <span className="text-base font-bold text-slate-800">Total</span>
                            <span className="text-lg font-extrabold text-(--btnColor-primary)">
                                {formatMonto(
                                    selectedInscripcion.montoTotal ??
                                        selectedInscripcion.total ??
                                        (Array.isArray(selectedInscripcion.detallesInscripcion)
                                            ? selectedInscripcion.detallesInscripcion.reduce(
                                                  (acc, d) => acc + (d.costo || d.monto || 0),
                                                  0
                                              )
                                            : 0)
                                )}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsDetailModalOpen(false)}
                            className="mt-2 w-full py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                            Cerrar
                        </button>
                    </div>
                )}
            </Modal>

            {/* Modal de confirmación para eliminar */}
            <Modal
                isOpen={Boolean(itemToDelete)}
                onClose={() => setItemToDelete(null)}
                title="Confirmar eliminación"
            >
                <div className="p-6 flex flex-col gap-4">
                    <p className="text-sm text-slate-700">
                        ¿Estás seguro de que deseas eliminar la inscripción{" "}
                        <span className="font-bold">
                            #{itemToDelete?.id || itemToDelete?.idInscripcion}
                        </span>
                        {itemToDelete?.nombreAlumno ? ` del alumno ${itemToDelete.nombreAlumno}` : ""}?
                    </p>
                    <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-200">
                        Esta acción realizará un borrado lógico en el sistema de inscripciones.
                    </p>

                    <div className="flex gap-3 justify-end mt-2">
                        <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => setItemToDelete(null)}
                            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-100 font-medium transition-colors cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            disabled={isDeleting}
                            onClick={handleConfirmDelete}
                            className="px-4 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 font-semibold transition-colors flex items-center gap-2 cursor-pointer"
                        >
                            {isDeleting && (
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            )}
                            Eliminar
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};