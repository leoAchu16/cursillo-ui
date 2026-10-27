import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SearchInput } from '../../components/SearchInput';
import { buscarNotasPorExamen, obtenerExamen } from '../../services/notasService';

export const ResultadosExamenPage = () => {
    const navigate = useNavigate();
    const { materiaId, examenId } = useParams();
    const [busqueda, setBusqueda] = useState('');
    const [alumnos, setAlumnos] = useState([]);
    const [examen, setExamen] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const cargarResultados = async () => {
        setLoading(true);
        setError(null);
        try {
            // Cargar info del examen
            try {
                const exData = await obtenerExamen(examenId);
                setExamen(exData);
            } catch (e) {
                console.warn('No se pudo obtener información del examen:', e);
            }

            // Cargar notas
            const data = await buscarNotasPorExamen(examenId);
            const notasList = Array.isArray(data) ? data : data?.content || data?.data || [];
            setAlumnos(notasList);
        } catch (err) {
            console.error('Error al cargar resultados de notas:', err);
            setError(err.response?.data?.message || err.message || 'Error al conectar con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (examenId) {
            cargarResultados();
        }
    }, [examenId]);

    const getNotaEstilo = (nota, ausente) => {
        if (ausente) return 'bg-red-100 text-red-700';
        const num = Number(nota);
        if (num >= 4) return 'bg-teal-100 text-teal-700 font-bold';
        if (num === 3) return 'bg-yellow-100 text-yellow-700 font-bold';
        return 'bg-red-100 text-red-700 font-bold';
    };

    const alumnosFiltrados = alumnos.filter((item) => {
        const nombre = (item.nombreAlumno || (item.alumno ? `${item.alumno.nombre} ${item.alumno.apellido || ''}` : '') || '').toLowerCase();
        const email = (item.emailAlumno || item.alumno?.email || '').toLowerCase();
        const search = busqueda.toLowerCase();
        return nombre.includes(search) || email.includes(search);
    });

    const nombreExamen = examen?.nombre || examen?.nombreExamen || `Examen #${examenId}`;

    return (
        <div className="container-page">
            <button
                onClick={() => navigate(`/materias/examenes/${materiaId}`)}
                className="flex items-center text-sm font-bold text-(--btnColor-primary) hover:underline mb-2 cursor-pointer w-fit"
            >
                <i className="icon-[heroicons--arrow-left] mr-1"></i> Volver a Exámenes
            </button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="uppercase tracking-wide text-2xl font-bold">
                        EXÁMENES / <span className="text-gray-500 capitalize">{nombreExamen}</span>
                    </h1>
                    <h2 className="text-xs text-gray-400 mt-1">Calificaciones consolidadas y rendimiento por alumno.</h2>
                </div>

                <button
                    onClick={() => navigate(`/materias/examenes/${materiaId}/calificar?idExamen=${examenId}`)}
                    className="btn-primary text-sm px-4 py-2"
                >
                    <i className="icon-[heroicons--pencil-square] text-lg mr-2"></i>
                    Editar Calificaciones
                </button>
            </div>

            {loading && (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="w-10 h-10 border-4 border-(--btnColor-primary) border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-500 mt-4 font-medium">Cargando resultados del examen...</p>
                </div>
            )}

            {!loading && error && (
                <div className="p-5 bg-red-50 border border-red-200 rounded-xl text-red-700 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <i className="icon-[heroicons--exclamation-triangle] text-2xl text-red-600 shrink-0"></i>
                        <div>
                            <p className="font-bold text-sm">No se pudieron cargar los resultados</p>
                            <p className="text-xs text-red-600">{error}</p>
                        </div>
                    </div>
                    <button
                        onClick={cargarResultados}
                        className="btn-primary !bg-red-600 hover:!bg-red-700 text-xs px-4 py-2 shrink-0"
                    >
                        <i className="icon-[heroicons--arrow-path] mr-1.5 text-sm"></i>
                        Reintentar
                    </button>
                </div>
            )}

            {!loading && !error && (
                <div className="card !p-0 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <SearchInput
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar por nombre o email..."
                            variant="default"
                        />
                        <div className="text-xs font-semibold text-gray-500">
                            Total Evaluados: <span className="text-slate-800 font-bold">{alumnos.length}</span>
                        </div>
                    </div>

                    {alumnosFiltrados.length === 0 ? (
                        <div className="text-center py-12">
                            <i className="icon-[heroicons--document-text] text-4xl text-gray-300 mb-2"></i>
                            <p className="text-sm text-gray-500 font-medium">No hay calificaciones registradas para este examen.</p>
                            <button
                                onClick={() => navigate(`/materias/examenes/${materiaId}/calificar?idExamen=${examenId}`)}
                                className="btn-primary mx-auto mt-4 text-xs px-4 py-2"
                            >
                                <i className="icon-[heroicons--plus] mr-1.5"></i>
                                Cargar Primeras Calificaciones
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-separate border-spacing-0">
                                <thead>
                                    <tr className="bg-[#F8FAFC] text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                                        <th className="py-4 px-6 text-left">ALUMNO</th>
                                        <th className="py-4 px-6 text-left">EMAIL</th>
                                        <th className="py-4 px-6 text-center">PUNTOS</th>
                                        <th className="py-4 px-6 text-center">NOTA (1-5)</th>
                                        <th className="py-4 px-6 text-center">ESTADO</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alumnosFiltrados.map((item, idx) => {
                                        const id = item.id || idx + 1;
                                        const nombre = item.nombreAlumno || (item.alumno ? `${item.alumno.nombre} ${item.alumno.apellido || ''}`.trim() : null) || `Alumno #${idx + 1}`;
                                        const email = item.emailAlumno || item.alumno?.email || 'Sin correo registrado';
                                        const puntos = item.puntosObtenidos ?? item.puntos ?? 0;
                                        const totalPts = item.totalPuntos || examen?.puntajeTotal || 20;
                                        const nota = item.calificacion ?? (item.ausente ? '-' : Math.max(1, Math.round((puntos / totalPts) * 5)));
                                        const ausente = Boolean(item.ausente);

                                        return (
                                            <tr key={id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                <td className="py-4 px-6 text-left">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase shadow-sm shrink-0">
                                                            {nombre
                                                                .split(' ')
                                                                .map((n) => n[0])
                                                                .slice(0, 2)
                                                                .join('')}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800 text-sm">{nombre}</p>
                                                            <p className="text-xs text-gray-400">ID: {item.idAlumno || item.matricula || `MAT-${idx + 1}`}</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="py-4 px-6 text-left text-slate-600">
                                                    {email}
                                                </td>

                                                <td className="py-4 px-6 text-center text-slate-700 font-medium">
                                                    {ausente ? '-' : `${puntos} / ${totalPts}`}
                                                </td>

                                                <td className="py-4 px-6 text-center">
                                                    <div className="flex justify-center">
                                                        <span className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold ${getNotaEstilo(nota, ausente)}`}>
                                                            {ausente ? 'A' : nota}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="py-4 px-6 text-center">
                                                    <span className={`badge !text-xs py-1 ${ausente ? 'badge-danger' : 'badge-success'}`}>
                                                        {ausente ? 'Ausente' : 'Rendido'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-between items-center p-5 border-t border-gray-100 bg-white">
                        <p className="text-xs text-gray-500 mb-4 sm:mb-0">
                            Mostrando {alumnosFiltrados.length} de {alumnos.length} alumnos evaluados
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};