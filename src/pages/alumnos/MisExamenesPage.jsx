import { useState, useEffect } from 'react';
import { getLoggedUser, getStoredToken } from '../../services/api';
import { listarInscripciones } from '../../services/inscripcionesService';
import { buscarNotasPorExamen, listarExamenesPorMateria } from '../../services/notasService';
import { JwtTokenModal } from '../../components/JwtTokenModal';
import { SearchInput } from '../../components/SearchInput';
import { Modal } from '../../components/Modal';
import { Table } from '../../components/Table';

export const MisExamenesPage = () => {
    const [examenes, setExamenes] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 3;

    // Filtros
    const [filtros, setFiltros] = useState({
        materia: '',
        fechaDesde: '',
        fechaHasta: '',
        calificacionMin: '',
        calificacionMax: '',
    });

    // Filtros temporales (dentro del modal antes de aplicar)
    const [filtrosTemp, setFiltrosTemp] = useState({ ...filtros });

    const user = getLoggedUser();
    const hasToken = Boolean(getStoredToken());

    const cargarExamenes = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listarInscripciones(0, 100);
            const inscripciones = Array.isArray(data) ? data : data?.content || data?.data || [];

            // Extraer materias de las inscripciones del alumno
            const materiasIds = [];
            const materiasMap = {};
            inscripciones.forEach(inscripcion => {
                if (inscripcion.detallesInscripcion) {
                    inscripcion.detallesInscripcion.forEach(detalle => {
                        const idMateria = detalle.idMateria || detalle.id;
                        if (idMateria && !materiasMap[idMateria]) {
                            materiasMap[idMateria] = {
                                nombre: detalle.nombreMateria || detalle.materia || 'Materia',
                                fechaInscripcion: inscripcion.fechaInscripcion || inscripcion.fecha || null,
                            };
                            materiasIds.push(idMateria);
                        }
                    });
                }
            });

            // Obtener exámenes por cada materia
            const todosExamenes = [];
            for (const idMateria of materiasIds) {
                try {
                    const examenesData = await listarExamenesPorMateria(idMateria);
                    const listaExamenes = Array.isArray(examenesData) ? examenesData : examenesData?.content || examenesData?.data || [];

                    for (const examen of listaExamenes) {
                        const idExamen = examen.id || examen.idExamen;
                        let calificacion = null;
                        let nota = null;

                        // Intentar obtener la nota del alumno para este examen
                        try {
                            const notas = await buscarNotasPorExamen(idExamen);
                            const notasLista = Array.isArray(notas) ? notas : notas?.content || notas?.data || [];
                            // Buscar la nota de este alumno
                            nota = notasLista.find(n =>
                                n.idAlumno === user?.id || n.alumnoId === user?.id
                            );
                            if (nota) {
                                calificacion = nota.calificacion || nota.nota || nota.puntaje;
                            }
                        } catch (e) {
                            // Si no se puede obtener notas, dejar calificación como null
                        }

                        todosExamenes.push({
                            id: idExamen,
                            materia: materiasMap[idMateria].nombre,
                            idMateria,
                            fechaExamen: examen.fecha || examen.fechaExamen || '-',
                            fechaInscripcion: materiasMap[idMateria].fechaInscripcion,
                            instancia: examen.titulo || examen.nombre || examen.tipo || 'Final',
                            calificacion: calificacion,
                            calificacionTexto: nota?.ausente ? 'Ausente' : (calificacion !== null && calificacion !== undefined ? `${calificacion}` : '-'),
                            ausente: nota?.ausente || false,
                            fechaAtendimiento: examen.fechaAtendimiento || examen.fechaRendido || null,
                            periodoRevision: examen.periodoRevision || null,
                            totalPuntos: examen.totalPuntos || examen.puntajeTotal || 20,
                        });
                    }
                } catch (e) {
                    console.warn(`No se pudieron cargar exámenes de materia ${idMateria}:`, e?.message);
                }
            }

            setExamenes(todosExamenes);
        } catch (err) {
            console.error('Error al cargar exámenes del alumno:', err);
            const status = err.response?.status;
            if (status === 401 || status === 403) {
                setError('Error de autorización (403/401): Tu sesión no tiene un token JWT válido o ha expirado.');
            } else if (err.message === 'Network Error') {
                setError('Error de conexión con el servidor. Verifica que los microservicios estén activos.');
            } else {
                setError(err.response?.data?.message || err.message || 'Error al conectar con el servidor.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarExamenes();
    }, []);

    // Formatear fecha
    const formatearFecha = (fecha) => {
        if (!fecha) return '-';
        try {
            const d = new Date(fecha);
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;
        } catch {
            return fecha;
        }
    };

    const formatearFechaHora = (fecha) => {
        if (!fecha) return '-';
        try {
            const d = new Date(fecha);
            const fechaStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;
            const horaStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            return `${fechaStr}, ${horaStr}`;
        } catch {
            return fecha;
        }
    };

    // Aplicar filtros
    const examenesFiltrados = examenes.filter((ex) => {
        // Filtro por búsqueda general
        const nombre = (ex.materia || '').toLowerCase();
        if (busqueda && !nombre.includes(busqueda.toLowerCase())) return false;

        // Filtro por materia (del modal)
        if (filtros.materia && !nombre.includes(filtros.materia.toLowerCase())) return false;

        // Filtro por rango de fechas
        if (filtros.fechaDesde && ex.fechaExamen) {
            try {
                const fechaExamen = new Date(ex.fechaExamen);
                const desde = new Date(filtros.fechaDesde);
                if (fechaExamen < desde) return false;
            } catch { /* ignorar */ }
        }
        if (filtros.fechaHasta && ex.fechaExamen) {
            try {
                const fechaExamen = new Date(ex.fechaExamen);
                const hasta = new Date(filtros.fechaHasta);
                if (fechaExamen > hasta) return false;
            } catch { /* ignorar */ }
        }

        // Filtro por calificación
        if (filtros.calificacionMin !== '' && ex.calificacion !== null && ex.calificacion !== undefined) {
            if (Number(ex.calificacion) < Number(filtros.calificacionMin)) return false;
        }
        if (filtros.calificacionMax !== '' && ex.calificacion !== null && ex.calificacion !== undefined) {
            if (Number(ex.calificacion) > Number(filtros.calificacionMax)) return false;
        }

        return true;
    });

    // Paginación
    const totalPages = Math.max(1, Math.ceil(examenesFiltrados.length / pageSize));
    const startIdx = (currentPage - 1) * pageSize;
    const examenesPagina = examenesFiltrados.slice(startIdx, startIdx + pageSize);

    // Handlers del modal de filtros
    const abrirFiltros = () => {
        setFiltrosTemp({ ...filtros });
        setIsFilterModalOpen(true);
    };

    const aplicarFiltros = () => {
        setFiltros({ ...filtrosTemp });
        setCurrentPage(1);
        setIsFilterModalOpen(false);
    };

    const limpiarFiltros = () => {
        const vacio = { materia: '', fechaDesde: '', fechaHasta: '', calificacionMin: '', calificacionMax: '' };
        setFiltrosTemp(vacio);
        setFiltros(vacio);
        setCurrentPage(1);
        setIsFilterModalOpen(false);
    };

    const hayFiltrosActivos = filtros.materia || filtros.fechaDesde || filtros.fechaHasta || filtros.calificacionMin !== '' || filtros.calificacionMax !== '';

    // Preparar datos para la tabla
    const headers = ['Materia', 'Fecha Examen', 'Inscripción', 'Instancia', 'Calificación', 'Fecha de Atendimiento', 'Periodo Revisión', 'Acción'];

    const tableData = examenesPagina.map((ex) => [
        ex.materia,
        formatearFecha(ex.fechaExamen),
        formatearFecha(ex.fechaInscripcion),
        ex.instancia,
        ex.calificacionTexto,
        formatearFechaHora(ex.fechaAtendimiento),
        ex.periodoRevision || '-',
        ex.ausente ? '' : 'VER',
    ]);

    return (
        <div className="container-page">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                <div>
                    <h1>Mis Exámenes</h1>
                    <h2>Consulta tus evaluaciones y calificaciones</h2>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsTokenModalOpen(true)}
                        className={`flex items-center text-xs font-semibold px-3 py-2 rounded-xl border transition-colors cursor-pointer ${hasToken
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                            }`}
                        title="Configurar Token JWT"
                    >
                        <i className="icon-[heroicons--key] mr-1.5 text-base"></i>
                        {hasToken ? 'Token JWT Activo' : 'Configurar Token JWT'}
                    </button>
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="w-10 h-10 border-4 border-(--btnColor-primary) border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-500 mt-4 font-medium">Cargando tus exámenes...</p>
                </div>
            )}

            {/* Error */}
            {!loading && error && (
                <div className="p-5 bg-red-50 border border-red-200 rounded-xl text-red-700 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <i className="icon-[heroicons--exclamation-triangle] text-2xl text-red-600 shrink-0"></i>
                        <div>
                            <p className="font-bold text-sm">No se pudieron cargar los exámenes</p>
                            <p className="text-xs text-red-600 mt-0.5">{error}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button
                            onClick={() => setIsTokenModalOpen(true)}
                            className="btn-primary !bg-amber-600 hover:!bg-amber-700 text-xs px-3 py-2"
                        >
                            <i className="icon-[heroicons--key] mr-1 text-sm"></i>
                            Configurar Token
                        </button>
                        <button
                            onClick={cargarExamenes}
                            className="btn-primary !bg-red-600 hover:!bg-red-700 text-xs px-3 py-2"
                        >
                            <i className="icon-[heroicons--arrow-path] mr-1 text-sm"></i>
                            Reintentar
                        </button>
                    </div>
                </div>
            )}

            {/* Contenido */}
            {!loading && !error && (
                <>
                    {/* Barra de búsqueda y filtros */}
                    <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                        <div className="w-full md:w-96">
                            <SearchInput
                                value={busqueda}
                                onChange={(e) => {
                                    setBusqueda(e.target.value);
                                    setCurrentPage(1);
                                }}
                                placeholder="Buscar por materia..."
                                variant="default"
                            />
                        </div>
                        <button
                            onClick={abrirFiltros}
                            className={`flex items-center text-sm font-semibold px-4 py-2 rounded-xl border transition-colors cursor-pointer ${
                                hayFiltrosActivos
                                    ? 'border-(--btnColor-primary) bg-teal-50 text-(--btnColor-primary) hover:bg-teal-100'
                                    : 'border-(--borderColor-input) bg-white text-slate-700 hover:bg-gray-50'
                            }`}
                        >
                            <i className="icon-[heroicons--funnel] mr-2 text-base"></i>
                            Filtros
                            {hayFiltrosActivos && (
                                <span className="ml-2 w-5 h-5 rounded-full bg-(--btnColor-primary) text-white text-[10px] flex items-center justify-center font-bold">
                                    ✓
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Tabla de exámenes */}
                    {examenesFiltrados.length === 0 ? (
                        <div className="card text-center py-12 items-center justify-center">
                            <i className="icon-[heroicons--clipboard-document-check] text-5xl text-gray-300 mb-2"></i>
                            <h3 className="text-base text-gray-600 font-semibold">No se encontraron exámenes</h3>
                            <p className="text-xs text-gray-400 mt-1">
                                {busqueda || hayFiltrosActivos ? 'No hay exámenes que coincidan con los filtros.' : 'Actualmente no tienes exámenes registrados.'}
                            </p>
                        </div>
                    ) : (
                        <div className="w-full overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr>
                                        {headers.map((header, index) => (
                                            <th key={index} className="text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {examenesPagina.length === 0 ? (
                                        <tr>
                                            <td colSpan={headers.length} className="text-center py-8 text-gray-500 font-medium">
                                                No se encontraron registros
                                            </td>
                                        </tr>
                                    ) : (
                                        examenesPagina.map((ex, index) => (
                                            <tr key={ex.id || index}>
                                                {/* Materia */}
                                                <td className="text-left">
                                                    <div className="flex items-center gap-2">
                                                        {ex.calificacion !== null && ex.calificacion !== undefined && !ex.ausente && (
                                                            <span className="w-2 h-2 rounded-full bg-(--btnColor-primary) shrink-0"></span>
                                                        )}
                                                        <span className="text-sm font-medium text-slate-800">{ex.materia}</span>
                                                    </div>
                                                </td>
                                                {/* Fecha Examen */}
                                                <td className="text-sm text-gray-600 whitespace-nowrap">
                                                    {formatearFecha(ex.fechaExamen)}
                                                </td>
                                                {/* Inscripción */}
                                                <td className="text-sm text-gray-600 whitespace-nowrap">
                                                    {formatearFecha(ex.fechaInscripcion)}
                                                </td>
                                                {/* Instancia */}
                                                <td>
                                                    <span className="badge badge-info !text-xs">
                                                        {ex.instancia}
                                                    </span>
                                                </td>
                                                {/* Calificación */}
                                                <td>
                                                    {ex.ausente ? (
                                                        <span className="text-sm font-semibold text-red-500">Ausente</span>
                                                    ) : ex.calificacion !== null && ex.calificacion !== undefined ? (
                                                        <span className="text-sm font-bold text-slate-800">{ex.calificacionTexto}</span>
                                                    ) : (
                                                        <span className="text-sm text-gray-400">-</span>
                                                    )}
                                                </td>
                                                {/* Fecha de Atendimiento */}
                                                <td className="text-sm text-gray-600 whitespace-nowrap">
                                                    {formatearFechaHora(ex.fechaAtendimiento)}
                                                </td>
                                                {/* Periodo Revisión */}
                                                <td className="text-sm text-gray-600 whitespace-nowrap">
                                                    {ex.periodoRevision || '-'}
                                                </td>
                                                {/* Acción */}
                                                <td>
                                                    {!ex.ausente && ex.calificacion !== null && ex.calificacion !== undefined ? (
                                                        <button
                                                            className="flex items-center gap-1 text-(--btnColor-primary) text-sm font-semibold hover:underline cursor-pointer"
                                                            title="Ver detalles"
                                                        >
                                                            <i className="icon-[heroicons--eye] text-base"></i>
                                                            Ver
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-300">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td className="border-t-2 border-(--borderColor-input)" colSpan={headers.length}>
                                            <div className="flex flex-row justify-between items-center py-1">
                                                <p className="text-sm text-gray-600">
                                                    Mostrando <span className="font-semibold text-slate-800">{startIdx + 1}</span> a <span className="font-semibold text-slate-800">{Math.min(startIdx + pageSize, examenesFiltrados.length)}</span> de <span className="font-semibold text-slate-800">{examenesFiltrados.length}</span> registros
                                                </p>
                                                <div className="flex flex-row gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={currentPage <= 1}
                                                        onClick={() => setCurrentPage(p => p - 1)}
                                                        className={`flex w-8 h-8 items-center justify-center border-2 border-(--borderColor-input) rounded-l-xl bg-(--bgColor-main) text-slate-700 transition-colors ${
                                                            currentPage <= 1
                                                                ? 'opacity-40 cursor-not-allowed'
                                                                : 'hover:bg-(--btnColor-sidebar-hover) cursor-pointer'
                                                        }`}
                                                        title="Anterior"
                                                    >
                                                        <i className="icon-[heroicons--chevron-left] text-xl"></i>
                                                    </button>
                                                    {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map(page => (
                                                        <button
                                                            key={page}
                                                            type="button"
                                                            onClick={() => setCurrentPage(page)}
                                                            className={`flex w-8 h-8 items-center justify-center rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                                                                currentPage === page
                                                                    ? 'bg-(--btnColor-primary) text-white'
                                                                    : 'text-slate-700 hover:bg-(--btnColor-sidebar-hover)'
                                                            }`}
                                                        >
                                                            {page}
                                                        </button>
                                                    ))}
                                                    {totalPages > 3 && (
                                                        <span className="flex w-8 h-8 items-center justify-center text-gray-400">...</span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        disabled={currentPage >= totalPages}
                                                        onClick={() => setCurrentPage(p => p + 1)}
                                                        className={`flex w-8 h-8 items-center justify-center border-2 border-(--borderColor-input) rounded-r-xl bg-(--bgColor-main) text-slate-700 transition-colors ${
                                                            currentPage >= totalPages
                                                                ? 'opacity-40 cursor-not-allowed'
                                                                : 'hover:bg-(--btnColor-sidebar-hover) cursor-pointer'
                                                        }`}
                                                        title="Siguiente"
                                                    >
                                                        <i className="icon-[heroicons--chevron-right] text-xl"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Modal de Filtros */}
            <Modal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} title="Filtros de Exámenes">
                <div className="p-6 flex flex-col gap-5">
                    {/* Filtro por Materia */}
                    <div>
                        <label className="text-sm font-semibold text-slate-800">Materia</label>
                        <SearchInput
                            value={filtrosTemp.materia}
                            onChange={(e) => setFiltrosTemp({ ...filtrosTemp, materia: e.target.value })}
                            placeholder="Buscar materia..."
                            variant="default"
                        />
                    </div>

                    {/* Rango de Fechas */}
                    <div>
                        <label className="text-sm font-semibold text-slate-800">Rango de Fechas</label>
                        <div className="flex flex-row gap-4">
                            <div className="w-1/2">
                                <label className="text-xs text-gray-500">Desde</label>
                                <input
                                    type="date"
                                    value={filtrosTemp.fechaDesde}
                                    onChange={(e) => setFiltrosTemp({ ...filtrosTemp, fechaDesde: e.target.value })}
                                    className="w-full"
                                />
                            </div>
                            <div className="w-1/2">
                                <label className="text-xs text-gray-500">Hasta</label>
                                <input
                                    type="date"
                                    value={filtrosTemp.fechaHasta}
                                    onChange={(e) => setFiltrosTemp({ ...filtrosTemp, fechaHasta: e.target.value })}
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Calificación */}
                    <div>
                        <label className="text-sm font-semibold text-slate-800">Calificación</label>
                        <div className="flex flex-row gap-4">
                            <div className="w-1/2">
                                <input
                                    type="number"
                                    min="0"
                                    value={filtrosTemp.calificacionMin}
                                    onChange={(e) => setFiltrosTemp({ ...filtrosTemp, calificacionMin: e.target.value })}
                                    className="w-full"
                                    placeholder="Min"
                                />
                            </div>
                            <div className="w-1/2">
                                <input
                                    type="number"
                                    min="0"
                                    value={filtrosTemp.calificacionMax}
                                    onChange={(e) => setFiltrosTemp({ ...filtrosTemp, calificacionMax: e.target.value })}
                                    className="w-full"
                                    placeholder="Max"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Botones */}
                    <div className="flex justify-end items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={limpiarFiltros}
                            className="text-sm font-bold text-(--btnColor-primary) hover:underline cursor-pointer"
                        >
                            Limpiar Filtros
                        </button>
                        <button
                            type="button"
                            onClick={aplicarFiltros}
                            className="btn-primary !px-5"
                        >
                            Aplicar Filtros
                        </button>
                    </div>
                </div>
            </Modal>

            <JwtTokenModal
                isOpen={isTokenModalOpen}
                onClose={() => setIsTokenModalOpen(false)}
                onTokenSaved={() => cargarExamenes()}
            />
        </div>
    );
};

