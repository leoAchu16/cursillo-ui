import { useState, useEffect } from 'react';
import { getLoggedUser, getStoredToken } from '../../services/api';
import { listarInscripciones } from '../../services/inscripcionesService';
import { JwtTokenModal } from '../../components/JwtTokenModal';
import { SearchInput } from '../../components/SearchInput';
import { Table } from '../../components/Table';

export const MisMateriasAlumnoPage = () => {
    const [materias, setMaterias] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 4;

    const user = getLoggedUser();
    const hasToken = Boolean(getStoredToken());

    const cargarMaterias = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listarInscripciones(0, 100);
            const inscripciones = Array.isArray(data) ? data : data?.content || data?.data || [];

            // Extraer materias de las inscripciones del alumno
            const materiasExtraidas = [];
            inscripciones.forEach(inscripcion => {
                if (inscripcion.detallesInscripcion) {
                    inscripcion.detallesInscripcion.forEach(detalle => {
                        materiasExtraidas.push({
                            id: detalle.idMateria || detalle.id,
                            nombre: detalle.nombreMateria || detalle.materia || 'Materia',
                            idCodigo: detalle.codigoMateria || `MAT-${inscripcion.anio || new Date().getFullYear()}-${String(detalle.idMateria || '001').padStart(3, '0')}`,
                            anio: inscripcion.anio || inscripcion.anho || new Date().getFullYear(),
                            fechaInscripcion: inscripcion.fechaInscripcion || inscripcion.fecha || null,
                        });
                    });
                }
            });

            setMaterias(materiasExtraidas);
        } catch (err) {
            console.error('Error al cargar materias del alumno:', err);
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
        cargarMaterias();
    }, []);

    // Filtro por búsqueda
    const materiasFiltradas = materias.filter((m) => {
        const nombre = (m.nombre || '').toLowerCase();
        return nombre.includes(busqueda.toLowerCase());
    });

    // Paginación
    const totalPages = Math.max(1, Math.ceil(materiasFiltradas.length / pageSize));
    const startIdx = (currentPage - 1) * pageSize;
    const materiasPagina = materiasFiltradas.slice(startIdx, startIdx + pageSize);

    // Formatear fecha
    const formatearFecha = (fecha) => {
        if (!fecha) return '-';
        try {
            const d = new Date(fecha);
            const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            return `${String(d.getDate()).padStart(2, '0')} ${meses[d.getMonth()]}, ${d.getFullYear()}`;
        } catch {
            return fecha;
        }
    };

    // Preparar datos para la tabla
    const headers = ['⭐', 'MATERIA', 'AÑO', 'FECHA DE INSCRIPCIÓN'];
    const tableData = materiasPagina.map((materia) => [
        '', // placeholder para favorito
        materia.nombre + (materia.idCodigo ? `\nID: ${materia.idCodigo}` : ''),
        String(materia.anio),
        formatearFecha(materia.fechaInscripcion),
    ]);

    const actions = [
        {
            type: 'view',
            title: 'Ver detalles',
            onClick: (row) => {
                console.log('Ver materia:', row);
            }
        }
    ];

    return (
        <div className="container-page">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1>Mis Materias</h1>
                    <h2>Listado de materias en las que estás inscrito.</h2>
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
                    <p className="text-sm text-gray-500 mt-4 font-medium">Cargando tus materias...</p>
                </div>
            )}

            {/* Error */}
            {!loading && error && (
                <div className="p-5 bg-red-50 border border-red-200 rounded-xl text-red-700 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <i className="icon-[heroicons--exclamation-triangle] text-2xl text-red-600 shrink-0"></i>
                        <div>
                            <p className="font-bold text-sm">No se pudieron cargar las materias</p>
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
                            onClick={cargarMaterias}
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
                    {/* Filtros */}
                    <div className="card !p-4">
                        <div className="flex flex-col md:flex-row gap-3 items-center">
                            <div className="flex-1 w-full">
                                <SearchInput
                                    value={busqueda}
                                    onChange={(e) => {
                                        setBusqueda(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    placeholder="Buscar por nombre de materia"
                                    variant="default"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Tabla */}
                    {materiasFiltradas.length === 0 ? (
                        <div className="card text-center py-12 items-center justify-center">
                            <i className="icon-[heroicons--book-open] text-5xl text-gray-300 mb-2"></i>
                            <h3 className="text-base text-gray-600 font-semibold">No se encontraron materias</h3>
                            <p className="text-xs text-gray-400 mt-1">
                                {busqueda ? 'No hay materias que coincidan con la búsqueda.' : 'Actualmente no tienes materias inscritas.'}
                            </p>
                        </div>
                    ) : (
                        <Table
                            headers={headers}
                            data={tableData}
                            actions={actions}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalElements={materiasFiltradas.length}
                            onPrevPage={currentPage > 1 ? () => setCurrentPage(p => p - 1) : null}
                            onNextPage={currentPage < totalPages ? () => setCurrentPage(p => p + 1) : null}
                            showPagination={true}
                        />
                    )}
                </>
            )}

            <JwtTokenModal
                isOpen={isTokenModalOpen}
                onClose={() => setIsTokenModalOpen(false)}
                onTokenSaved={() => cargarMaterias()}
            />
        </div>
    );
};

