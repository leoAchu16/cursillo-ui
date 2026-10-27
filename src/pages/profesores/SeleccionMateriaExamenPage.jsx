import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarMateriasProfesor } from '../../services/notasService';
import { getProfesorId } from '../../services/api';

export const SeleccionMateriaExamenPage = () => {
    const navigate = useNavigate();
    const [materias, setMaterias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const cargarMaterias = async () => {
        setLoading(true);
        setError(null);
        try {
            const idProfesor = getProfesorId();
            const data = await listarMateriasProfesor(idProfesor);
            const lista = Array.isArray(data) ? data : data?.content || data?.data || [];
            setMaterias(lista);
        } catch (err) {
            console.error('Error al cargar materias para exámenes:', err);
            setError(err.response?.data?.message || err.message || 'Error al conectar con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarMaterias();
    }, []);

    return (
        <div className="container-page">
            <div className="mb-6">
                <h1>Gestión de Exámenes</h1>
                <h2>Selecciona una materia para administrar sus evaluaciones y calificaciones.</h2>
            </div>

            {loading && (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="w-10 h-10 border-4 border-(--btnColor-primary) border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-500 mt-4 font-medium">Cargando materias...</p>
                </div>
            )}

            {!loading && error && (
                <div className="p-5 bg-red-50 border border-red-200 rounded-xl text-red-700 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <i className="icon-[heroicons--exclamation-triangle] text-2xl text-red-600 shrink-0"></i>
                        <div>
                            <p className="font-bold text-sm">No se pudieron cargar las materias</p>
                            <p className="text-xs text-red-600">{error}</p>
                        </div>
                    </div>
                    <button
                        onClick={cargarMaterias}
                        className="btn-primary !bg-red-600 hover:!bg-red-700 text-xs px-4 py-2 shrink-0"
                    >
                        <i className="icon-[heroicons--arrow-path] mr-1.5 text-sm"></i>
                        Reintentar
                    </button>
                </div>
            )}

            {!loading && !error && materias.length === 0 && (
                <div className="card text-center py-12 items-center justify-center">
                    <i className="icon-[heroicons--clipboard-document-check] text-5xl text-gray-300 mb-2"></i>
                    <h3 className="text-base text-gray-600 font-semibold">No se encontraron materias</h3>
                    <p className="text-xs text-gray-400 mt-1">No hay materias disponibles para gestionar exámenes.</p>
                </div>
            )}

            {!loading && !error && materias.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {materias.map((materia, index) => {
                        const id = materia.id || materia.idMateria || index + 1;
                        const nombre = materia.nombre || materia.nombreMateria || materia.titulo || 'Materia';
                        const anio = materia.anio || materia.anho || materia.periodo || new Date().getFullYear();
                        const dias = materia.dias || materia.horario || materia.schedule || 'Días a convenir';

                        return (
                            <div
                                key={id}
                                onClick={() => navigate(`/materias/examenes/${id}`)}
                                className="card cursor-pointer hover:border-(--btnColor-primary) hover:shadow-lg transition-all flex flex-col items-center justify-center text-center py-10 group"
                            >
                                <div className="w-12 h-12 rounded-full bg-teal-50 group-hover:bg-(--btnColor-primary) text-(--btnColor-primary) group-hover:text-white flex items-center justify-center transition-colors mb-3">
                                    <i className="icon-[heroicons--clipboard-document-list] text-2xl"></i>
                                </div>
                                <h3 className="text-sm tracking-widest text-slate-700 font-bold uppercase group-hover:text-(--btnColor-primary) transition-colors">
                                    {nombre}
                                </h3>
                                <div className="text-xs text-gray-500 mt-3 space-y-1">
                                    <p>Año: <span className="font-semibold text-slate-700">{anio}</span></p>
                                    <p>Días: <span className="font-semibold text-slate-700">{dias}</span></p>
                                </div>
                                <span className="text-xs font-bold text-(--btnColor-primary) mt-4 inline-flex items-center group-hover:translate-x-1 transition-transform">
                                    Administrar Exámenes <i className="icon-[heroicons--arrow-right] ml-1"></i>
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};