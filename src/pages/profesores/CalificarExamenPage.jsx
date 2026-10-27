import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { SearchInput } from '../../components/SearchInput';
import { Combobox } from '../../components/Combobox';
import {
    buscarNotasPorExamen,
    guardarNotas,
    listarExamenesPorMateria,
    obtenerMateria,
    listarInscripcionesPorMateria
} from '../../services/notasService';

export const CalificarExamenPage = () => {
    const navigate = useNavigate();
    const { materiaId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const examenIdFromUrl = searchParams.get('idExamen');

    // Estados de UI y datos
    const [busqueda, setBusqueda] = useState('');
    const [totalPuntos, setTotalPuntos] = useState(20);
    const [materia, setMateria] = useState(null);
    const [examenes, setExamenes] = useState([]);
    const [examenSeleccionadoId, setExamenSeleccionadoId] = useState(examenIdFromUrl || '');
    const [alumnos, setAlumnos] = useState([]);

    const [loading, setLoading] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState(null);
    const [mensajeExito, setMensajeExito] = useState(null);

    // Cargar Materia y lista de exámenes al montar
    useEffect(() => {
        const cargarMateriaYExamenes = async () => {
            try {
                if (materiaId) {
                    try {
                        const mData = await obtenerMateria(materiaId);
                        setMateria(mData);
                    } catch (e) {
                        console.warn('No se pudo obtener materia:', e);
                    }

                    const exData = await listarExamenesPorMateria(materiaId);
                    const listaEx = Array.isArray(exData) ? exData : exData?.content || exData?.data || [];
                    setExamenes(listaEx);

                    // Si no había examen seleccionado o el seleccionado no existe, seleccionar el primero
                    if (listaEx.length > 0) {
                        const idInicial = examenIdFromUrl || String(listaEx[0].id || listaEx[0].idExamen);
                        setExamenSeleccionadoId(String(idInicial));
                    }
                }
            } catch (err) {
                console.error('Error cargando materias o exámenes:', err);
                setError('Error al cargar la información del examen.');
            }
        };

        cargarMateriaYExamenes();
    }, [materiaId]);

    // Sincronizar el examen seleccionado con la URL
    const handleSeleccionarExamen = (nuevoIdExamen) => {
        setExamenSeleccionadoId(nuevoIdExamen);
        setSearchParams({ idExamen: nuevoIdExamen });
    };

    // Cargar notas cuando cambia el examen seleccionado
    useEffect(() => {
        if (!examenSeleccionadoId) {
            setLoading(false);
            return;
        }

        const cargarNotas = async () => {
            setLoading(true);
            setError(null);
            setMensajeExito(null);
            try {
                // Obtener datos del examen actual para el puntaje total
                const examenActual = examenes.find(
                    (ex) => String(ex.id || ex.idExamen) === String(examenSeleccionadoId)
                );
                if (examenActual?.puntajeTotal || examenActual?.totalPuntos) {
                    setTotalPuntos(Number(examenActual.puntajeTotal || examenActual.totalPuntos));
                }

                // Buscar notas existentes
                const notasData = await buscarNotasPorExamen(examenSeleccionadoId);
                const notasList = Array.isArray(notasData) ? notasData : notasData?.content || notasData?.data || [];

                if (notasList.length > 0) {
                    // Mapear notas existentes
                    const mapped = notasList.map((nota, idx) => {
                        const nombre = nota.nombreAlumno || (nota.alumno ? `${nota.alumno.nombre} ${nota.alumno.apellido || ''}`.trim() : null) || `Alumno #${idx + 1}`;
                        const matId = nota.matricula || nota.alumno?.matricula || (nota.idAlumno ? `ALU-${nota.idAlumno}` : `MAT-${idx + 1}`);
                        const puntos = nota.puntosObtenidos ?? nota.puntos ?? 0;
                        const ausente = Boolean(nota.ausente);

                        return {
                            id: nota.idAlumno || nota.id || idx + 1,
                            notaId: nota.id || null,
                            idAlumno: nota.idAlumno || (nota.alumno ? nota.alumno.id : null) || idx + 1,
                            nombre,
                            matId,
                            puntos,
                            ausente,
                        };
                    });
                    setAlumnos(mapped);
                } else {
                    // Si aún no existen notas para este examen, intentamos traer los alumnos inscritos
                    try {
                        const inscritosData = await listarInscripcionesPorMateria(materiaId);
                        const inscritosList = Array.isArray(inscritosData) ? inscritosData : inscritosData?.content || inscritosData?.data || [];

                        if (inscritosList.length > 0) {
                            const initialized = inscritosList.map((ins, idx) => {
                                const nombre = ins.alumno?.nombre ? `${ins.alumno.nombre} ${ins.alumno.apellido || ''}`.trim() : ins.nombreAlumno || `Alumno #${idx + 1}`;
                                const matId = ins.alumno?.matricula || ins.alumno?.id || ins.idAlumno || `MAT-${idx + 1}`;
                                return {
                                    id: ins.alumno?.id || ins.idAlumno || idx + 1,
                                    notaId: null,
                                    idAlumno: ins.alumno?.id || ins.idAlumno || idx + 1,
                                    nombre,
                                    matId,
                                    puntos: 0,
                                    ausente: false,
                                };
                            });
                            setAlumnos(initialized);
                        } else {
                            setAlumnos([]);
                        }
                    } catch (insErr) {
                        console.warn('No se pudieron obtener inscripciones:', insErr);
                        setAlumnos([]);
                    }
                }
            } catch (err) {
                console.error('Error al cargar notas del examen:', err);
                setError(err.response?.data?.message || err.message || 'Error al obtener calificaciones.');
            } finally {
                setLoading(false);
            }
        };

        cargarNotas();
    }, [examenSeleccionadoId, examenes, materiaId]);

    // Cálculo de calificación según escala académica
    const calcularNota = (puntos, ausente) => {
        if (ausente) {
            return {
                porcentaje: 0,
                calificacion: 'Sin Calificar',
                calificacionNumero: 1,
                estadoBadge: { label: 'Ausente', className: 'badge-danger' },
            };
        }

        const pts = parseFloat(puntos) || 0;
        const total = totalPuntos > 0 ? totalPuntos : 1;
        const porcentaje = Math.round((pts / total) * 100);

        let calificacion = '1 (Insuficiente)';
        let calificacionNumero = 1;

        if (porcentaje >= 90) {
            calificacion = '5 (Excelente)';
            calificacionNumero = 5;
        } else if (porcentaje >= 80) {
            calificacion = '4 (Distinguido)';
            calificacionNumero = 4;
        } else if (porcentaje >= 70) {
            calificacion = '3 (Bueno)';
            calificacionNumero = 3;
        } else if (porcentaje >= 60) {
            calificacion = '2 (Aprobado)';
            calificacionNumero = 2;
        }

        return {
            porcentaje,
            calificacion,
            calificacionNumero,
            estadoBadge: { label: 'Rendido', className: 'badge-success' },
        };
    };

    const handlePuntosChange = (id, valor) => {
        setAlumnos((prev) =>
            prev.map((a) => {
                if (a.id === id) {
                    const num = Math.max(0, Number(valor));
                    const limiteAjustado = Math.min(totalPuntos, num);
                    return { ...a, puntos: isNaN(limiteAjustado) ? 0 : limiteAjustado, ausente: false };
                }
                return a;
            })
        );
    };

    const handleAusenteToggle = (id) => {
        setAlumnos((prev) =>
            prev.map((a) => {
                if (a.id === id) {
                    return { ...a, ausente: !a.ausente, puntos: !a.ausente ? 0 : a.puntos };
                }
                return a;
            })
        );
    };

    const handleGuardar = async () => {
        if (!examenSeleccionadoId) {
            alert('Por favor selecciona un examen para calificar.');
            return;
        }

        setGuardando(true);
        setError(null);
        setMensajeExito(null);

        try {
            // Construir payload para PUT /api/notas/batch
            const payload = alumnos.map((alumno) => {
                const { calificacionNumero } = calcularNota(alumno.puntos, alumno.ausente);
                const item = {
                    idExamen: Number(examenSeleccionadoId),
                    idAlumno: alumno.idAlumno || alumno.id,
                    puntosObtenidos: alumno.ausente ? 0 : Number(alumno.puntos),
                    puntos: alumno.ausente ? 0 : Number(alumno.puntos),
                    totalPuntos: Number(totalPuntos),
                    calificacion: calificacionNumero,
                    ausente: Boolean(alumno.ausente)
                };

                if (alumno.notaId) {
                    item.id = alumno.notaId;
                }
                return item;
            });

            await guardarNotas(payload);
            setMensajeExito('¡Calificaciones guardadas exitosamente en el servidor!');
            setTimeout(() => {
                navigate(`/materias/examenes/${materiaId}/resultados/${examenSeleccionadoId}`);
            }, 1200);
        } catch (err) {
            console.error('Error al guardar notas:', err);
            setError(err.response?.data?.message || err.message || 'Error al guardar calificaciones.');
        } finally {
            setGuardando(false);
        }
    };

    const alumnosFiltrados = alumnos.filter(
        (a) =>
            a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
            a.matId.toLowerCase().includes(busqueda.toLowerCase())
    );

    const opcionesExamenes = examenes.map((ex) => ({
        label: ex.nombre || ex.nombreExamen || `Examen #${ex.id || ex.idExamen}`,
        value: String(ex.id || ex.idExamen)
    }));

    const nombreMateria = materia?.nombre || materia?.nombreMateria || `Materia #${materiaId}`;

    return (
        <div className="container-page">
            {/* Botón Volver */}
            <button
                onClick={() => navigate(`/materias/examenes/${materiaId}`)}
                className="flex items-center text-sm font-bold text-(--btnColor-primary) hover:underline mb-1 cursor-pointer w-fit"
            >
                <i className="icon-[heroicons--arrow-left] mr-1"></i> Volver a Exámenes
            </button>

            {/* Cabecera */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                <div>
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Calificación de Evaluaciones</span>
                    <h1>
                        Exámenes / <span className="text-gray-500">{nombreMateria}</span>
                    </h1>
                </div>
            </div>

            {/* Alertas de Éxito o Error */}
            {mensajeExito && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-3">
                    <i className="icon-[heroicons--check-circle] text-2xl text-emerald-600"></i>
                    <p className="text-sm font-semibold">{mensajeExito}</p>
                </div>
            )}

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3">
                    <i className="icon-[heroicons--exclamation-triangle] text-2xl text-red-600"></i>
                    <div>
                        <p className="text-sm font-bold">Ocurrió un error</p>
                        <p className="text-xs text-red-600">{error}</p>
                    </div>
                </div>
            )}

            {/* Tarjeta Informativa del Examen */}
            <div className="card !p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
                    {/* Selector de Examen */}
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-teal-50 text-(--btnColor-primary) rounded-xl shrink-0">
                            <i className="icon-[heroicons--clipboard-document-check] text-2xl"></i>
                        </div>
                        <div className="w-full">
                            <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase mb-1">EXAMEN A CALIFICAR</p>
                            {opcionesExamenes.length > 0 ? (
                                <Combobox
                                    options={opcionesExamenes}
                                    value={examenSeleccionadoId}
                                    onChange={handleSeleccionarExamen}
                                    placeholder="Selecciona examen..."
                                    className="w-full min-w-[150px]"
                                />
                            ) : (
                                <p className="text-sm text-gray-500 italic">No hay exámenes disponibles</p>
                            )}
                        </div>
                    </div>

                    {/* Total Puntos */}
                    <div className="flex items-center gap-3 sm:pl-6 pt-4 sm:pt-0">
                        <div className="p-3 bg-teal-50 text-(--btnColor-primary) rounded-xl shrink-0">
                            <i className="icon-[heroicons--star] text-2xl"></i>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase mb-1">TOTAL PUNTOS EXAMEN</p>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    value={totalPuntos}
                                    onChange={(e) => setTotalPuntos(Number(e.target.value) || 1)}
                                    className="w-20 px-2 py-1 text-sm font-bold text-slate-800 border border-(--borderColor-input) rounded-md bg-white focus:border-(--btnColor-primary) outline-none"
                                />
                                <span className="text-xs text-gray-500">pts</span>
                            </div>
                        </div>
                    </div>

                    {/* Estado */}
                    <div className="flex items-center gap-3 sm:pl-6 pt-4 sm:pt-0">
                        <div className="p-3 bg-teal-50 text-(--btnColor-primary) rounded-xl shrink-0">
                            <i className="icon-[heroicons--users] text-2xl"></i>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">ALUMNOS A EVALUAR</p>
                            <p className="font-bold text-slate-800 text-sm mt-1">{alumnos.length} Registrados</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tarjeta de Carga de Calificaciones */}
            <div className="card">
                <div className="flex flex-col md:flex-row justify-between items-center pb-4 border-b border-gray-200 gap-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <i className="icon-[heroicons--clipboard-document-list] text-lg text-(--btnColor-primary)"></i>
                        CARGA DE CALIFICACIONES POR ALUMNO
                    </h3>
                    <SearchInput
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar por nombre..."
                        variant="default"
                    />
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-12">
                        <div className="w-10 h-10 border-4 border-(--btnColor-primary) border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm text-gray-500 mt-4 font-medium">Cargando notas de alumnos...</p>
                    </div>
                ) : alumnosFiltrados.length === 0 ? (
                    <div className="text-center py-10">
                        <i className="icon-[heroicons--user-group] text-4xl text-gray-300 mb-2"></i>
                        <p className="text-sm text-gray-500 font-medium">No se encontraron alumnos para este examen.</p>
                        <p className="text-xs text-gray-400 mt-1">Asegúrate de que existan alumnos inscritos en esta materia.</p>
                    </div>
                ) : (
                    /* Tabla de Calificación */
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-separate border-spacing-0">
                            <thead>
                                <tr className="bg-(--bgColor-main) text-gray-500 text-xs uppercase tracking-wider">
                                    <th className="py-3 px-4 text-left">ALUMNO</th>
                                    <th className="py-3 px-4 text-center">PUNTOS OBTENIDOS</th>
                                    <th className="py-3 px-4 text-center">TOTAL</th>
                                    <th className="py-3 px-4 text-center">PORCENTAJE</th>
                                    <th className="py-3 px-4 text-center">CALIFICACIÓN</th>
                                    <th className="py-3 px-4 text-center">ESTADO</th>
                                </tr>
                            </thead>
                            <tbody>
                                {alumnosFiltrados.map((alumno) => {
                                    const { porcentaje, calificacion, estadoBadge } = calcularNota(
                                        alumno.puntos,
                                        alumno.ausente
                                    );
                                    return (
                                        <tr
                                            key={alumno.id}
                                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                        >
                                            {/* Alumno */}
                                            <td className="py-3 px-4 text-left">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                                        {alumno.nombre
                                                            .split(' ')
                                                            .map((n) => n[0])
                                                            .slice(0, 2)
                                                            .join('')}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-sm">{alumno.nombre}</p>
                                                        <p className="text-xs text-gray-400">{alumno.matId}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Input Puntos */}
                                            <td className="py-3 px-4 text-center">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={totalPuntos}
                                                    value={alumno.ausente ? '' : alumno.puntos}
                                                    disabled={alumno.ausente}
                                                    onChange={(e) => handlePuntosChange(alumno.id, e.target.value)}
                                                    className="w-20 text-center px-2 py-1.5 rounded-lg border border-(--borderColor-input) bg-white font-bold text-slate-800 focus:border-(--btnColor-primary) outline-none disabled:bg-gray-100 disabled:text-gray-400"
                                                />
                                            </td>

                                            {/* Total */}
                                            <td className="py-3 px-4 text-center text-gray-400 font-medium">
                                                / {totalPuntos}
                                            </td>

                                            {/* Porcentaje */}
                                            <td className="py-3 px-4 text-center font-bold">
                                                <span
                                                    className={`px-2 py-1 rounded-md text-xs font-bold ${
                                                        alumno.ausente
                                                            ? 'text-red-500 bg-red-50'
                                                            : porcentaje >= 60
                                                            ? 'text-emerald-600 bg-emerald-50'
                                                            : 'text-red-600 bg-red-50'
                                                    }`}
                                                >
                                                    {alumno.ausente ? '0%' : `${porcentaje}%`}
                                                </span>
                                            </td>

                                            {/* Calificación Automática */}
                                            <td className="py-3 px-4 text-center font-semibold text-slate-700">
                                                {calificacion}
                                            </td>

                                            {/* Estado con botón toggle ausente */}
                                            <td className="py-3 px-4 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleAusenteToggle(alumno.id)}
                                                    title="Clic para cambiar entre Presente / Ausente"
                                                    className={`badge ${estadoBadge.className} !text-xs py-1 cursor-pointer hover:opacity-80 transition-opacity`}
                                                >
                                                    ● {estadoBadge.label}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Acciones del Formulario */}
                <div className="flex justify-end items-center gap-3 pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="px-5 py-2 text-sm font-bold text-gray-600 hover:text-black border border-(--borderColor-input) rounded-xl bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        disabled={guardando || alumnos.length === 0}
                        onClick={handleGuardar}
                        className="btn-primary !px-6 disabled:opacity-50"
                    >
                        {guardando ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                Guardando...
                            </>
                        ) : (
                            <>
                                <i className="icon-[heroicons--check] mr-2 text-lg"></i>
                                Guardar Calificaciones
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};