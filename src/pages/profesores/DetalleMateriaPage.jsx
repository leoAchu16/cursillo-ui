import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SearchInput } from "../../components/SearchInput";
import { Combobox } from "../../components/Combobox";
import { Table } from "../../components/Table";
import { listarInscripcionesPorMateria, obtenerMateria } from '../../services/notasService';

export const DetalleMateriaPage = () => {
    const { materiaId } = useParams();
    const navigate = useNavigate();

    const [materia, setMateria] = useState(null);
    const [alumnos, setAlumnos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [busqueda, setBusqueda] = useState("");
    const [filtroEstado, setFiltroEstado] = useState(null);

    const cargarDatos = async () => {
        setLoading(true);
        setError(null);
        try {
            // Cargar datos de la materia
            try {
                const materiaData = await obtenerMateria(materiaId);
                setMateria(materiaData);
            } catch (err) {
                console.warn('No se pudo obtener información detallada de la materia:', err);
            }

            // Cargar inscripciones / alumnos
            const inscripcionesData = await listarInscripcionesPorMateria(materiaId);
            const lista = Array.isArray(inscripcionesData)
                ? inscripcionesData
                : inscripcionesData?.content || inscripcionesData?.data || [];
            setAlumnos(lista);
        } catch (err) {
            console.error('Error al cargar datos de DetalleMateria:', err);
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

    const headers = ["ALUMNO", "EMAIL", "INSCRIPCIÓN", "ESTADO"];

    // Filtrar alumnos según texto y estado
    const alumnosFiltrados = alumnos.filter((item) => {
        const nombre = (item.alumno?.nombre ? `${item.alumno.nombre} ${item.alumno.apellido || ''}` : item.nombreAlumno || item.alumno || item.nombre || '').toLowerCase();
        const email = (item.alumno?.email || item.emailAlumno || item.email || '').toLowerCase();
        const search = busqueda.toLowerCase();
        const matchText = nombre.includes(search) || email.includes(search);

        if (!matchText) return false;

        if (filtroEstado) {
            const estadoActual = (item.estado || 'activo').toLowerCase();
            return estadoActual === filtroEstado.toLowerCase();
        }

        return true;
    });

    const tablaData = alumnosFiltrados.map((item, index) => {
        const nombre = item.alumno?.nombre ? `${item.alumno.nombre} ${item.alumno.apellido || ''}`.trim() : item.nombreAlumno || item.alumno || item.nombre || `Alumno #${index + 1}`;
        const email = item.alumno?.email || item.emailAlumno || item.email || 'correo@ejemplo.com';
        const matricula = item.alumno?.matricula || item.alumno?.id || item.idAlumno || item.matricula || `MAT-${item.id || index + 1}`;
        const fecha = item.fechaInscripcion || item.fecha || 'Reciente';
        const estado = item.estado || 'Activo';
        const isActivo = estado.toLowerCase().includes('activ') || estado.toLowerCase().includes('paga');

        return [
            <div key={`alumno-${index}`} className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-teal-100 text-(--btnColor-primary) flex items-center justify-center font-bold text-xs uppercase overflow-hidden shrink-0">
                    {nombre.slice(0, 2)}
                </div>
                <div>
                    <p className="font-bold text-sm text-slate-800">{nombre}</p>
                    <p className="text-xs text-gray-500">ID: {matricula}</p>
                </div>
            </div>,
            email,
            fecha,
            <span
                key={`badge-${index}`}
                className={`badge !text-xs py-1 ${isActivo ? 'badge-success' : '!bg-gray-200 !text-gray-600'}`}
            >
                {estado}
            </span>
        ];
    });

    const nombreMateria = materia?.nombre || materia?.nombreMateria || `Materia #${materiaId}`;

    return (
        <div className="container-page">
            <button
                onClick={() => navigate('/materias/mis-materias')}
                className="flex items-center text-sm font-bold text-(--btnColor-primary) hover:underline w-fit mb-2 cursor-pointer"
            >
                <i className="icon-[heroicons--arrow-left] mr-1"></i> Volver a Mis Materias
            </button>

            <div className="mb-6">
                <h1>Mis Materias / <span className="text-gray-500">{nombreMateria}</span></h1>
                <h2>Resumen de tus formaciones activas y progreso de estudiantes.</h2>
            </div>

            {loading && (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="w-10 h-10 border-4 border-(--btnColor-primary) border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-500 mt-4 font-medium">Cargando alumnos de la materia...</p>
                </div>
            )}

            {!loading && error && (
                <div className="p-5 bg-red-50 border border-red-200 rounded-xl text-red-700 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <i className="icon-[heroicons--exclamation-triangle] text-2xl text-red-600 shrink-0"></i>
                        <div>
                            <p className="font-bold text-sm">No se pudieron cargar los alumnos</p>
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

            {!loading && !error && (
                <div className="card">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-2">
                        <div className="w-full md:w-1/2">
                            <SearchInput
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Buscar por nombre o email..."
                                variant="default"
                            />
                        </div>
                        <div className="flex gap-4 w-full md:w-auto">
                            <Combobox
                                options={[
                                    { label: 'Todos', value: '' },
                                    { label: 'Activo', value: 'activo' },
                                    { label: 'Inactivo', value: 'inactivo' }
                                ]}
                                value={filtroEstado}
                                onChange={setFiltroEstado}
                                placeholder="Estado: Todos"
                                className="w-40"
                            />
                        </div>
                    </div>

                    {tablaData.length === 0 ? (
                        <div className="text-center py-10">
                            <i className="icon-[heroicons--users] text-4xl text-gray-300 mb-2"></i>
                            <p className="text-sm text-gray-500 font-medium">No se encontraron alumnos para esta materia.</p>
                            {busqueda && <p className="text-xs text-gray-400 mt-1">Prueba con otro término de búsqueda.</p>}
                        </div>
                    ) : (
                        <Table headers={headers} data={tablaData} />
                    )}
                </div>
            )}
        </div>
    );
};