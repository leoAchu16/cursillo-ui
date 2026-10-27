import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Modal } from "../../components/Modal";
import { listarExamenesPorMateria, obtenerMateria, crearExamen } from '../../services/notasService';

export const GestionExamenesPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [examenes, setExamenes] = useState([]);
    const [materia, setMateria] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [creando, setCreando] = useState(false);

    // Formulario de creación
    const [nuevoExamen, setNuevoExamen] = useState({
        nombre: '',
        fecha: '',
        hora: '',
        puntajeTotal: 20
    });

    const navigate = useNavigate();
    const { materiaId } = useParams();

    const cargarDatos = async () => {
        setLoading(true);
        setError(null);
        try {
            // Intentar cargar info de la materia
            try {
                const matData = await obtenerMateria(materiaId);
                setMateria(matData);
            } catch (e) {
                console.warn('No se pudo obtener información de la materia:', e);
            }

            // Cargar exámenes
            const data = await listarExamenesPorMateria(materiaId);
            const lista = Array.isArray(data) ? data : data?.content || data?.data || [];
            setExamenes(lista);
        } catch (err) {
            console.error('Error al cargar exámenes:', err);
            setError(err.response?.data?.message || err.message || 'Error al conectar con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (materiaId) {
            cargarDatos();
        }
    }, [materiaId]);

    const handleCrearExamen = async (e) => {
        e.preventDefault();
        if (!nuevoExamen.nombre.trim()) return;

        setCreando(true);
        try {
            await crearExamen({
                idMateria: Number(materiaId),
                materiaId: Number(materiaId),
                nombre: nuevoExamen.nombre,
                fecha: nuevoExamen.fecha || new Date().toISOString().split('T')[0],
                hora: nuevoExamen.hora || '08:00',
                puntajeTotal: Number(nuevoExamen.puntajeTotal) || 20
            });
            setIsModalOpen(false);
            setNuevoExamen({ nombre: '', fecha: '', hora: '', puntajeTotal: 20 });
            await cargarDatos();
        } catch (err) {
            console.error('Error al crear examen:', err);
            alert('No se pudo crear el examen: ' + (err.response?.data?.message || err.message));
        } finally {
            setCreando(false);
        }
    };

    const nombreMateria = materia?.nombre || materia?.nombreMateria || `Materia #${materiaId}`;

    return (
        <div className="container-page">
            <button
                onClick={() => navigate('/materias/examenes')}
                className="flex items-center text-sm font-bold text-(--btnColor-primary) hover:underline w-fit mb-4 cursor-pointer"
            >
                <i className="icon-[heroicons--arrow-left] mr-1"></i> Volver a Selección de Materia
            </button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold">
                        Exámenes / <span className="text-gray-500">{nombreMateria}</span>
                    </h1>
                    <h2 className="text-xs text-gray-400 mt-1">Administra las evaluaciones y calificaciones de este curso.</h2>
                </div>

                <div className="flex gap-3">
                    <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
                        <i className="icon-[heroicons--plus-circle] text-lg mr-2"></i>
                        Crear Nuevo Examen
                    </button>
                    {examenes.length > 0 && (
                        <button
                            className="flex items-center bg-[#2563EB] text-white rounded-xl px-4 py-2 shadow-md hover:bg-blue-700 transition-colors cursor-pointer text-sm font-semibold"
                            onClick={() => navigate(`/materias/examenes/${materiaId}/calificar?idExamen=${examenes[0]?.id || examenes[0]?.idExamen}`)}
                        >
                            <i className="icon-[heroicons--pencil-square] text-lg mr-2"></i>
                            Calificar
                        </button>
                    )}
                </div>
            </div>

            {loading && (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="w-10 h-10 border-4 border-(--btnColor-primary) border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-500 mt-4 font-medium">Cargando exámenes...</p>
                </div>
            )}

            {!loading && error && (
                <div className="p-5 bg-red-50 border border-red-200 rounded-xl text-red-700 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <i className="icon-[heroicons--exclamation-triangle] text-2xl text-red-600 shrink-0"></i>
                        <div>
                            <p className="font-bold text-sm">No se pudieron cargar los exámenes</p>
                            <p className="text-xs text-red-600">{error}</p>
                        </div>
                    </div>
                    <button
                        onClick={cargarDatos}
                        className="btn-primary !bg-red-600 hover:!bg-red-700 text-xs px-4 py-2 shrink-0"
                    >
                        <i className="icon-[heroicons--arrow-path] mr-1.5 text-sm"></i>
                        Reintentar
                    </button>
                </div>
            )}

            {!loading && !error && examenes.length === 0 && (
                <div className="card text-center py-12 items-center justify-center">
                    <i className="icon-[heroicons--document-magnifying-glass] text-5xl text-gray-300 mb-2"></i>
                    <h3 className="text-base text-gray-600 font-semibold">No hay exámenes registrados</h3>
                    <p className="text-xs text-gray-400 mt-1 mb-4">Aún no se han creado exámenes para esta materia.</p>
                    <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
                        <i className="icon-[heroicons--plus] mr-2"></i>
                        Crear Primer Examen
                    </button>
                </div>
            )}

            {!loading && !error && examenes.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {examenes.map((examen, idx) => {
                        const id = examen.id || examen.idExamen || idx + 1;
                        const nombre = examen.nombre || examen.nombreExamen || examen.titulo || `Examen #${id}`;
                        const fecha = examen.fecha || examen.fechaExamen || 'Fecha no definida';
                        const hora = examen.hora || examen.horario || '';
                        const estado = (examen.estado || (examen.calificado ? 'CALIFICADO' : 'PENDIENTE')).toUpperCase();
                        const puntos = examen.puntajeTotal || examen.totalPuntos || examen.puntosMaximos || 20;

                        const isCalificado = estado === 'CALIFICADO';
                        const isEnProgreso = estado === 'EN PROGRESO' || estado === 'EN_PROGRESO';

                        return (
                            <div
                                key={id}
                                className={`card !p-6 transition-all hover:shadow-md ${isEnProgreso ? 'border-t-4 border-t-yellow-400' : isCalificado ? 'border-t-4 border-t-emerald-500' : ''}`}
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <span
                                        className={`badge !w-fit !text-[10px] px-2 py-0.5 ${
                                            isCalificado
                                                ? 'badge-success'
                                                : isEnProgreso
                                                ? 'badge-warning'
                                                : '!bg-gray-100 !text-gray-500 border-none'
                                        }`}
                                    >
                                        {estado}
                                    </span>
                                    <span className="text-xs font-semibold text-gray-400">
                                        {puntos} pts
                                    </span>
                                </div>

                                <h3 className="text-lg text-slate-800 font-bold">{nombre}</h3>

                                <div className="flex flex-col gap-2 mt-4 text-xs text-gray-500">
                                    <span className="flex items-center">
                                        <i className="icon-[heroicons--calendar] mr-2 text-lg text-gray-400"></i>
                                        {fecha} {hora && `, ${hora}`}
                                    </span>
                                    <span className="flex items-center">
                                        <i className="icon-[heroicons--academic-cap] mr-2 text-lg text-gray-400"></i>
                                        Puntaje Total: {puntos} puntos
                                    </span>
                                </div>

                                <div className="flex items-center justify-between mt-6 pt-3 border-t border-gray-100">
                                    <button
                                        onClick={() => navigate(`/materias/examenes/${materiaId}/resultados/${id}`)}
                                        className="text-(--btnColor-primary) text-xs font-bold flex items-center hover:underline cursor-pointer"
                                    >
                                        Ver Resultados <i className="icon-[heroicons--arrow-right] ml-1"></i>
                                    </button>
                                    <button
                                        onClick={() => navigate(`/materias/examenes/${materiaId}/calificar?idExamen=${id}`)}
                                        className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center hover:underline cursor-pointer"
                                    >
                                        <i className="icon-[heroicons--pencil-square] mr-1"></i>
                                        Calificar
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal para Crear Examen */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Nuevo Examen">
                <form onSubmit={handleCrearExamen} className="p-6 flex flex-col gap-5">
                    <div>
                        <label className="text-xs text-gray-500">Nombre del Examen <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            required
                            value={nuevoExamen.nombre}
                            onChange={(e) => setNuevoExamen({ ...nuevoExamen, nombre: e.target.value })}
                            className="w-full !bg-gray-50 !border-transparent focus:!border-(--borderColor-input)"
                            placeholder="Ej. Parcial 2: Ecuaciones"
                        />
                    </div>

                    <div className="flex flex-row gap-4">
                        <div className="w-1/2">
                            <label className="text-xs text-gray-500">Fecha del Examen</label>
                            <input
                                type="date"
                                value={nuevoExamen.fecha}
                                onChange={(e) => setNuevoExamen({ ...nuevoExamen, fecha: e.target.value })}
                                className="w-full !bg-gray-50 !border-transparent"
                            />
                        </div>
                        <div className="w-1/2">
                            <label className="text-xs text-gray-500">Hora del Examen</label>
                            <input
                                type="time"
                                value={nuevoExamen.hora}
                                onChange={(e) => setNuevoExamen({ ...nuevoExamen, hora: e.target.value })}
                                className="w-full !bg-gray-50 !border-transparent"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-gray-500">Total de Puntos <span className="text-red-500">*</span></label>
                        <input
                            type="number"
                            min="1"
                            required
                            value={nuevoExamen.puntajeTotal}
                            onChange={(e) => setNuevoExamen({ ...nuevoExamen, puntajeTotal: e.target.value })}
                            className="w-full !bg-gray-50 !border-transparent focus:!border-(--borderColor-input)"
                            placeholder="Ej. 20"
                        />
                    </div>

                    <div className="flex justify-end items-center gap-4 mt-6">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="text-sm font-bold text-gray-500 hover:underline cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button type="submit" disabled={creando} className="btn-primary !px-5">
                            {creando ? 'Creando...' : 'Crear Examen'}
                            <i className="icon-[heroicons--arrow-right] ml-2 text-lg"></i>
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};