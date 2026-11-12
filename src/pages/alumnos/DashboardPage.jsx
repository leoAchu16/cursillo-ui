import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLoggedUser, getStoredToken } from '../../services/api';
import { listarInscripciones } from '../../services/inscripcionesService';
import { JwtTokenModal } from '../../components/JwtTokenModal';
import { SearchInput } from '../../components/SearchInput';

export const DashboardPageAlumno = () => {
    const navigate = useNavigate();
    const [materias, setMaterias] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);

    const user = getLoggedUser();
    const hasToken = Boolean(getStoredToken());

    const cargarDashboard = async () => {
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
                            anio: inscripcion.anio || inscripcion.anho || new Date().getFullYear(),
                            dias: detalle.dias || detalle.horario || 'Días a convenir',
                            fechaInscripcion: inscripcion.fechaInscripcion || inscripcion.fecha || null,
                            idInscripcion: inscripcion.id || inscripcion.idInscripcion,
                        });
                    });
                }
            });

            setMaterias(materiasExtraidas);
        } catch (err) {
            console.error('Error al cargar dashboard del alumno:', err);
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
        cargarDashboard();
    }, []);

    const materiasFiltradas = materias.filter((m) => {
        const nombre = (m.nombre || '').toLowerCase();
        return nombre.includes(busqueda.toLowerCase());
    });

    return (
        <div className="container-page">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                <div>
                    <h1>Tablero</h1>
                    <h2>Resumen de tus formaciones activas y progreso de estudiantes.</h2>
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

            {/* Separador */}
            <hr className="border-gray-200" />

            {/* Alerta de error */}
            {error && (
                <div className="p-5 bg-red-50 border border-red-200 rounded-xl text-red-700 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <i className="icon-[heroicons--exclamation-triangle] text-2xl text-red-600 shrink-0"></i>
                        <div>
                            <p className="font-bold text-sm">Error de autenticación o conexión</p>
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
                            onClick={cargarDashboard}
                            className="btn-primary !bg-red-600 hover:!bg-red-700 text-xs px-3 py-2"
                        >
                            <i className="icon-[heroicons--arrow-path] mr-1 text-sm"></i>
                            Reintentar
                        </button>
                    </div>
                </div>
            )}

            {/* Contenido principal */}
            {loading ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="w-10 h-10 border-4 border-(--btnColor-primary) border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-500 mt-4 font-medium">Cargando tus materias...</p>
                </div>
            ) : !error && (
                <>
                    {/* Búsqueda */}
                    <div className="w-full md:w-80 mb-2">
                        <SearchInput
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar materia..."
                            variant="default"
                        />
                    </div>

                    {materiasFiltradas.length === 0 ? (
                        <div className="card text-center py-12 items-center justify-center">
                            <i className="icon-[heroicons--book-open] text-5xl text-gray-300 mb-2"></i>
                            <h3 className="text-base text-gray-600 font-semibold">No se encontraron materias</h3>
                            <p className="text-xs text-gray-400 mt-1">
                                {busqueda ? 'No hay materias que coincidan con la búsqueda.' : 'Actualmente no tienes materias inscritas en el sistema.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {materiasFiltradas.map((materia, index) => (
                                <div
                                    key={materia.id || index}
                                    className="card cursor-pointer hover:border-(--btnColor-primary) hover:shadow-lg transition-all items-center text-center py-12 group"
                                >
                                    <div className="w-12 h-12 rounded-full bg-teal-50 group-hover:bg-(--btnColor-primary) text-(--btnColor-primary) group-hover:text-white flex items-center justify-center transition-colors mb-3">
                                        <i className="icon-[heroicons--academic-cap] text-2xl"></i>
                                    </div>
                                    <h3 className="text-sm tracking-widest text-slate-700 font-bold uppercase group-hover:text-(--btnColor-primary) transition-colors">
                                        {materia.nombre}
                                    </h3>
                                    <div className="text-xs text-gray-500 mt-3 space-y-1">
                                        <p>Año: <span className="font-semibold text-slate-700">{materia.anio}</span></p>
                                        <p>Días: <span className="font-semibold text-slate-700">{materia.dias}</span></p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            <JwtTokenModal
                isOpen={isTokenModalOpen}
                onClose={() => setIsTokenModalOpen(false)}
                onTokenSaved={() => cargarDashboard()}
            />
        </div>
    );
};

