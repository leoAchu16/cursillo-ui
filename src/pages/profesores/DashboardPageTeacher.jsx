import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarMateriasProfesor } from '../../services/notasService';
import { getProfesorId, getLoggedUser, getStoredToken } from '../../services/api';
import { JwtTokenModal } from '../../components/JwtTokenModal';

export const DashboardPageTeacher = () => {
    const navigate = useNavigate();
    const [materias, setMaterias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);

    const user = getLoggedUser();
    const hasToken = Boolean(getStoredToken());

    const cargarDashboard = async () => {
        setLoading(true);
        setError(null);
        try {
            const idProfesor = getProfesorId();
            const data = await listarMateriasProfesor(idProfesor);
            const lista = Array.isArray(data) ? data : data?.content || data?.data || [];
            setMaterias(lista);
        } catch (err) {
            console.error('Error al cargar dashboard del profesor:', err);
            const status = err.response?.status;
            if (status === 401 || status === 403) {
                setError('Error de autorización (403/401): Tu sesión no tiene un token JWT válido o ha expirado.');
            } else if (err.message === 'Network Error') {
                setError('Error de conexión con el Gateway (http://localhost:8084). Verifica que los microservicios estén activos.');
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

    return (
        <div className="container-page">
            {/* Header del Dashboard */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Dashboard del Profesor</h1>
                    <h2 className="text-sm text-gray-500 mt-0.5">
                        Bienvenido de nuevo, <span className="text-slate-800 font-bold">{user?.nombre || 'Profesor'}</span>. Resumen general de tu actividad docente.
                    </h2>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsTokenModalOpen(true)}
                        className={`flex items-center text-xs font-semibold px-3 py-2 rounded-xl border transition-colors cursor-pointer ${
                            hasToken
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

            {/* Alerta de error si falla la conexión */}
            {error && (
                <div className="p-5 bg-red-50 border border-red-200 rounded-xl text-red-700 flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
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

            {/* Tarjetas de Métricas / KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-4">
                <div className="card !p-6 flex flex-row items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">MATERIAS ACTIVAS</p>
                        <p className="text-3xl font-extrabold text-slate-800 mt-1">{loading ? '...' : materias.length}</p>
                        <button
                            onClick={() => navigate('/materias/mis-materias')}
                            className="text-xs text-(--btnColor-primary) font-bold mt-2 hover:underline inline-flex items-center cursor-pointer"
                        >
                            Ver catálogo completo <i className="icon-[heroicons--arrow-right] ml-1"></i>
                        </button>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-teal-50 text-(--btnColor-primary) flex items-center justify-center shrink-0">
                        <i className="icon-[heroicons--book-open] text-3xl"></i>
                    </div>
                </div>

                <div className="card !p-6 flex flex-row items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">GESTIÓN EVALUACIONES</p>
                        <p className="text-3xl font-extrabold text-slate-800 mt-1">Exámenes</p>
                        <button
                            onClick={() => navigate('/materias/examenes')}
                            className="text-xs text-blue-600 font-bold mt-2 hover:underline inline-flex items-center cursor-pointer"
                        >
                            Administrar evaluaciones <i className="icon-[heroicons--arrow-right] ml-1"></i>
                        </button>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <i className="icon-[heroicons--clipboard-document-check] text-3xl"></i>
                    </div>
                </div>

                <div className="card !p-6 flex flex-row items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">CALIFICACIONES</p>
                        <p className="text-3xl font-extrabold text-slate-800 mt-1">Notas</p>
                        <button
                            onClick={() => navigate('/materias/examenes')}
                            className="text-xs text-purple-600 font-bold mt-2 hover:underline inline-flex items-center cursor-pointer"
                        >
                            Cargar o editar notas <i className="icon-[heroicons--arrow-right] ml-1"></i>
                        </button>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <i className="icon-[heroicons--academic-cap] text-3xl"></i>
                    </div>
                </div>
            </div>

            {/* Accesos Rápidos */}
            <div className="card !p-6 mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                    <i className="icon-[heroicons--bolt] text-lg text-amber-500"></i>
                    Accesos Rápidos
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div
                        onClick={() => navigate('/materias/mis-materias')}
                        className="p-4 rounded-xl border border-gray-200 hover:border-(--btnColor-primary) hover:bg-teal-50/30 transition-all cursor-pointer flex items-center gap-3"
                    >
                        <div className="w-10 h-10 rounded-xl bg-teal-100 text-(--btnColor-primary) flex items-center justify-center shrink-0">
                            <i className="icon-[heroicons--squares-2x2] text-xl"></i>
                        </div>
                        <div>
                            <p className="font-bold text-sm text-slate-800">Mis Materias</p>
                            <p className="text-xs text-gray-500">Ver listado de materias y alumnos inscritos</p>
                        </div>
                    </div>

                    <div
                        onClick={() => navigate('/materias/examenes')}
                        className="p-4 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50/30 transition-all cursor-pointer flex items-center gap-3"
                    >
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                            <i className="icon-[heroicons--clipboard-document-list] text-xl"></i>
                        </div>
                        <div>
                            <p className="font-bold text-sm text-slate-800">Exámenes y Calificaciones</p>
                            <p className="text-xs text-gray-500">Crear exámenes y cargar notas por alumno</p>
                        </div>
                    </div>

                    <div
                        onClick={() => setIsTokenModalOpen(true)}
                        className="p-4 rounded-xl border border-gray-200 hover:border-amber-500 hover:bg-amber-50/30 transition-all cursor-pointer flex items-center gap-3"
                    >
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                            <i className="icon-[heroicons--key] text-xl"></i>
                        </div>
                        <div>
                            <p className="font-bold text-sm text-slate-800">Token de Seguridad JWT</p>
                            <p className="text-xs text-gray-500">{hasToken ? 'Token configurado en el navegador' : 'Pegar token para autorizar peticiones'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Vista previa de Formaciones Activas */}
            <div className="card !p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <i className="icon-[heroicons--book-open] text-lg text-(--btnColor-primary)"></i>
                        Tus Formaciones Asignadas
                    </h3>
                    <button
                        onClick={() => navigate('/materias/mis-materias')}
                        className="text-xs text-(--btnColor-primary) font-bold hover:underline"
                    >
                        Ver todas
                    </button>
                </div>

                {loading ? (
                    <div className="p-8 text-center">
                        <div className="w-8 h-8 border-4 border-(--btnColor-primary) border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-xs text-gray-400 mt-2">Cargando...</p>
                    </div>
                ) : materias.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No tienes materias asignadas actualmente.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {materias.slice(0, 4).map((materia, idx) => {
                            const id = materia.id || materia.idMateria || idx + 1;
                            const nombre = materia.nombre || materia.nombreMateria || materia.titulo || 'Materia';
                            const anio = materia.anio || materia.anho || materia.periodo || new Date().getFullYear();

                            return (
                                <div
                                    key={id}
                                    onClick={() => navigate(`/materias/${id}`)}
                                    className="p-4 border border-gray-100 rounded-xl hover:shadow-md hover:border-(--btnColor-primary) transition-all cursor-pointer bg-gray-50/50"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="badge badge-info !text-[10px] py-0.5 px-2">Activo</span>
                                        <span className="text-[11px] text-gray-400 font-semibold">{anio}</span>
                                    </div>
                                    <p className="font-bold text-sm text-slate-800 uppercase tracking-wide truncate">{nombre}</p>
                                    <p className="text-xs text-(--btnColor-primary) font-semibold mt-3 flex items-center">
                                        Ver detalles <i className="icon-[heroicons--arrow-right] ml-1 text-xs"></i>
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <JwtTokenModal
                isOpen={isTokenModalOpen}
                onClose={() => setIsTokenModalOpen(false)}
                onTokenSaved={() => cargarDashboard()}
            />
        </div>
    );
};

// Mantener compatibilidad retrocompatible de export
export const MisMateriasPage = DashboardPageTeacher;