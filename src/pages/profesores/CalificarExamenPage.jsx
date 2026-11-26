import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { SearchInput } from '../../components/SearchInput';
import { Table } from '../../components/Table';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Spinner } from '../../components/Spinner';
import { TarjetaResumen } from '../../components/TarjetaResumen';
import { mensajeDeError } from '../../services/api';
import { listarAlumnosDeMateria } from '../../services/inscripcionesService';
import {
    obtenerMateria,
    listarExamenesDeMateria,
    listarNotasDeExamen,
    cargarNotasDeExamen,
} from '../../services/notasService';

// Se cargan todos los exámenes de la materia de una vez
const MAX_REGISTROS = 1000;

// Valor a mostrar cuando un campo viene vacío
const SIN_DATO = '—';

const INPUT_PUNTOS = "w-20 text-center px-2 py-1.5 rounded-lg border bg-white font-bold text-slate-800 focus:outline-none focus:border-(--btnColor-primary) disabled:bg-gray-100 disabled:text-gray-400";

// "2026-11-20" -> "20/11/2026". Sin new Date(), que correría un día por la zona horaria.
const formatearFecha = (fecha) => {
    if (!fecha) return SIN_DATO;
    const [anio, mes, dia] = String(fecha).slice(0, 10).split('-');
    return anio && mes && dia ? `${dia}/${mes}/${anio}` : String(fecha);
};

const formatearHora = (hora) => (hora ? String(hora).slice(0, 5) : SIN_DATO); // "18:00:00" -> "18:00"

// Fecha y hora local de ahora como "2026-11-25 18:30", para comparar con fecha + hora del examen
const ahoraLocal = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16).replace('T', ' ');
};
const momentoDe = (examen) => `${examen.fecha ?? ''} ${formatearHora(examen.hora)}`;

/**
 * Misma regla que el backend (NotaService): porcentaje exacto, sin redondear.
 * 90 % o más: 5 · 80: 4 · 70: 3 · 60: 2 · menos: 1 (reprobado).
 */
const calificar = (puntos, total) => {
    const porcentaje = (puntos / total) * 100;
    const calificacion = porcentaje >= 90 ? 5 : porcentaje >= 80 ? 4 : porcentaje >= 70 ? 3 : porcentaje >= 60 ? 2 : 1;
    return { calificacion, estado: calificacion === 1 ? 'REPROBADO' : 'APROBADO' };
};

// Puntos escritos: '' (sin nota), un entero válido, o un error
const leerPuntos = (texto, total) => {
    if (texto === '' || texto === null || texto === undefined) return { vacio: true };
    const n = Number(texto);
    if (!Number.isInteger(n) || n < 0 || n > total) return { error: `Entre 0 y ${total}, sin decimales` };
    return { valor: n };
};

export const CalificarExamenPage = () => {
    const { materiaId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const idExamenUrl = searchParams.get('idExamen');

    const [materia, setMateria] = useState(null);
    const [examenes, setExamenes] = useState([]);
    const [alumnos, setAlumnos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [noEncontrada, setNoEncontrada] = useState(false);

    // Notas del examen elegido: guardadas (como vienen del backend) y lo que se está editando
    const [guardadas, setGuardadas] = useState({});   // idAlumno -> NotaDTO
    const [edicion, setEdicion] = useState({});       // idAlumno -> { puntos: '45', ausente: false }
    const [cargandoNotas, setCargandoNotas] = useState(false);
    const [errorNotas, setErrorNotas] = useState(null);
    const [recarga, setRecarga] = useState(0);

    const [busqueda, setBusqueda] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [salida, setSalida] = useState(null); // acción pendiente si hay cambios sin guardar

    // Materia, exámenes y alumnos: al entrar. Si la materia no es del profesor, el backend responde 404
    useEffect(() => {
        let ignore = false;

        const cargar = async () => {
            const [resAlumnos, resExamenes, resMateria] = await Promise.allSettled([
                listarAlumnosDeMateria(materiaId),
                listarExamenesDeMateria({ idMateria: materiaId, size: MAX_REGISTROS }),
                obtenerMateria(materiaId),
            ]);
            if (ignore) return;

            if (resAlumnos.status === 'rejected' && resAlumnos.reason?.response?.status === 404) {
                setNoEncontrada(true);
            } else if (resAlumnos.status === 'rejected' || resExamenes.status === 'rejected') {
                console.error('Error al cargar la materia:', resAlumnos.reason || resExamenes.reason);
                setError('No se pudieron cargar los alumnos o los exámenes');
                toast.error('No se pudieron cargar los alumnos o los exámenes de la materia.');
            } else {
                setAlumnos([...resAlumnos.value].sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es')));
                setExamenes(resExamenes.value.content);
            }
            if (resMateria.status === 'fulfilled') setMateria(resMateria.value);
            setLoading(false);
        };
        cargar();

        return () => { ignore = true; };
    }, [materiaId]);

    // Solo se califican los exámenes que ya se tomaron; el más reciente primero
    const ahora = ahoraLocal();
    const tomados = examenes
        .filter((e) => momentoDe(e) <= ahora)
        .sort((a, b) => momentoDe(b).localeCompare(momentoDe(a)));
    const examenUrl = examenes.find((e) => String(e.idExamen) === idExamenUrl);
    const examen = examenUrl && momentoDe(examenUrl) <= ahora ? examenUrl : (!idExamenUrl ? tomados[0] : null);
    const idExamen = examen?.idExamen;
    const total = examen?.totalPuntos || 0;

    // Notas del examen elegido: al elegirlo y después de guardar
    useEffect(() => {
        if (!idExamen) return;
        let ignore = false;

        const cargar = async () => {
            setCargandoNotas(true);
            setErrorNotas(null);
            try {
                const notas = await listarNotasDeExamen(idExamen);
                if (ignore) return;
                const porAlumno = Object.fromEntries(notas.map((n) => [n.idAlumno, n]));
                setGuardadas(porAlumno);
                setEdicion(Object.fromEntries(notas.map((n) => [n.idAlumno, {
                    puntos: n.estadoNota === 'AUSENTE' || n.puntosCorrectos == null ? '' : String(n.puntosCorrectos),
                    ausente: n.estadoNota === 'AUSENTE',
                }])));
            } catch (err) {
                if (ignore) return;
                console.error('Error al cargar las notas:', err);
                setErrorNotas('No se pudieron cargar las notas del examen');
                toast.error('No se pudieron cargar las notas del examen.');
            } finally {
                if (!ignore) setCargandoNotas(false);
            }
        };
        cargar();

        return () => { ignore = true; };
    }, [idExamen, recarga]);

    // ------------------------------ FILAS Y CAMBIOS -------------------------------

    // Inscriptos, más quienes tienen nota pero ya no figuran inscriptos (solo se muestran)
    const inscriptos = new Set(alumnos.map((a) => a.idAlumno));
    const filasBase = [
        ...alumnos.map((a) => ({ ...a, inscripto: true })),
        ...Object.keys(guardadas).map(Number).filter((id) => !inscriptos.has(id))
            .map((id) => ({ idAlumno: id, nombre: `Alumno #${id}`, inscripto: false })),
    ];

    const estadoDe = (idAlumno) => {
        const guardada = guardadas[idAlumno];
        const ed = edicion[idAlumno] ?? { puntos: '', ausente: false };
        const original = guardada
            ? { puntos: guardada.estadoNota === 'AUSENTE' || guardada.puntosCorrectos == null ? '' : String(guardada.puntosCorrectos), ausente: guardada.estadoNota === 'AUSENTE' }
            : { puntos: '', ausente: false };
        const cambio = ed.puntos !== original.puntos || ed.ausente !== original.ausente;
        const leido = ed.ausente ? {} : leerPuntos(ed.puntos, total);
        let errorFila = leido.error;
        // Una nota ya cargada no se puede dejar vacía: se cambia el valor o se marca ausente
        if (!errorFila && cambio && !ed.ausente && leido.vacio && guardada) errorFila = 'Ya tiene nota: no se puede vaciar';
        return { ed, guardada, cambio, leido, errorFila };
    };

    const filas = filasBase.map((a) => ({ ...a, ...estadoDe(a.idAlumno) }));
    const cambios = filas.filter((f) => f.inscripto && f.cambio);
    const conError = cambios.filter((f) => f.errorFila);
    // Las que quedaron vacías y no tenían nota no se mandan
    const aGuardar = cambios.filter((f) => !f.errorFila && (f.ed.ausente || !f.leido.vacio));
    const hayCambios = cambios.length > 0;

    const editar = (idAlumno, cambio) =>
        setEdicion((prev) => ({ ...prev, [idAlumno]: { ...(prev[idAlumno] ?? { puntos: '', ausente: false }), ...cambio } }));

    // Pide confirmación antes de perder cambios sin guardar
    const conConfirmacion = (accion) => (hayCambios ? setSalida(() => accion) : accion());

    // Cerrar o recargar la pestaña con cambios sin guardar: lo avisa el navegador
    useEffect(() => {
        if (!hayCambios) return;
        const avisar = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', avisar);
        return () => window.removeEventListener('beforeunload', avisar);
    }, [hayCambios]);

    const guardar = async () => {
        if (conError.length > 0) {
            toast.warning('Corregí los puntos marcados en rojo antes de guardar.');
            return;
        }
        if (aGuardar.length === 0) return;
        setGuardando(true);
        try {
            await cargarNotasDeExamen(idExamen, aGuardar.map((f) => ({
                idAlumno: f.idAlumno,
                puntosCorrectos: f.ed.ausente ? null : f.leido.valor,
                ausente: f.ed.ausente,
            })));
            toast.success(`${aGuardar.length === 1 ? 'Nota guardada' : `${aGuardar.length} notas guardadas`} correctamente.`);
            setRecarga((r) => r + 1);
        } catch (err) {
            console.error('Error al guardar las notas:', err);
            toast.error(mensajeDeError(err, 'No se pudieron guardar las notas. No se guardó ninguna.'));
        } finally {
            setGuardando(false);
        }
    };

    // ---------------------------------- TABLA -----------------------------------

    const texto = busqueda.trim().toLowerCase();
    const visibles = filas.filter((f) => `${f.nombre ?? ''} ${f.email ?? ''}`.toLowerCase().includes(texto));

    const celdaCalificacion = (f) => {
        if (f.ed.ausente) return <span className="badge badge-orange">AUSENTE</span>;
        if (f.leido.error || f.leido.vacio) return <span className="text-gray-400">Sin nota</span>;
        const { calificacion, estado } = calificar(f.leido.valor, total);
        return (
            <span className="inline-flex items-center gap-2">
                <b className="text-slate-800">{calificacion}</b>
                <span className={estado === 'APROBADO' ? 'badge badge-success' : 'badge badge-danger'}>{estado}</span>
            </span>
        );
    };

    // Sin las notas guardadas no se sabe qué tiene cada uno: no se muestra nada para no sobrescribir sin querer
    const datosTabla = errorNotas ? [] : visibles.map((f) => [
        <span className="flex flex-col items-start text-left">
            <span className="font-semibold text-slate-800">{f.nombre || `Alumno #${f.idAlumno}`}</span>
            {!f.inscripto && <span className="text-xs text-gray-500">Ya no está inscripto: no se puede editar</span>}
            {f.cambio && f.inscripto && <span className="text-xs text-(--btnColor-primary) font-semibold">Sin guardar</span>}
        </span>,
        <span className="inline-flex flex-col items-center gap-1">
            <input
                type="number"
                min="0"
                max={total}
                step="1"
                inputMode="numeric"
                aria-label={`Puntos de ${f.nombre}`}
                value={f.ed.ausente ? '' : f.ed.puntos}
                disabled={f.ed.ausente || !f.inscripto || guardando}
                onChange={(e) => editar(f.idAlumno, { puntos: e.target.value })}
                className={`${INPUT_PUNTOS} ${f.errorFila ? 'border-rose-500' : 'border-(--borderColor-input)'}`}
            />
            {f.errorFila && <span className="text-[11px] text-rose-600">{f.errorFila}</span>}
        </span>,
        <input
            type="checkbox"
            aria-label={`${f.nombre} ausente`}
            checked={f.ed.ausente}
            disabled={!f.inscripto || guardando}
            onChange={(e) => editar(f.idAlumno, { ausente: e.target.checked })}
            className="w-4 h-4 accent-(--btnColor-primary) cursor-pointer"
        />,
        celdaCalificacion(f),
    ]);

    // -------------------------------- PANTALLA ---------------------------------

    const volverAMateria = () => navigate(`/materias/${materiaId}`);
    const nombreMateria = materia?.nombreMateria || `Materia #${materiaId}`;

    const volver = (
        <button
            type="button"
            onClick={() => conConfirmacion(volverAMateria)}
            className="flex items-center text-sm font-bold text-(--btnColor-primary) hover:underline w-fit mt-[24px] cursor-pointer"
        >
            <i className="icon-[heroicons--arrow-left] mr-1"></i> Volver a {nombreMateria}
        </button>
    );

    if (noEncontrada || (!loading && !error && idExamenUrl && !examen)) {
        const futuro = examenUrl && momentoDe(examenUrl) > ahora;
        return (
            <div className="container-page">
                {volver}
                <div className="card items-center text-center py-10 gap-2">
                    <i className="icon-[heroicons--clipboard-document-check] text-4xl text-gray-300"></i>
                    <h3>{noEncontrada ? 'Materia no encontrada' : futuro ? 'El examen todavía no se tomó' : 'Examen no encontrado'}</h3>
                    <p className="text-sm text-gray-500">
                        {noEncontrada ? 'No existe o no es una de las materias que dictás.'
                            : futuro ? `Se puede calificar a partir del ${formatearFecha(examenUrl.fecha)} a las ${formatearHora(examenUrl.hora)}.`
                                : 'No existe o no es de esta materia.'}
                    </p>
                </div>
            </div>
        );
    }

    const conNota = filas.filter((f) => f.inscripto && !f.ed.ausente && f.leido.valor !== undefined).length;
    const ausentes = filas.filter((f) => f.inscripto && f.ed.ausente).length;
    const tarjetas = [
        { titulo: 'Alumnos', valor: alumnos.length, icono: 'icon-[heroicons--users]', nota: 'Inscriptos en la materia' },
        { titulo: 'Con nota', valor: conNota, icono: 'icon-[heroicons--check-circle]', nota: 'Incluye cambios sin guardar' },
        { titulo: 'Ausentes', valor: ausentes, icono: 'icon-[heroicons--user-minus]', nota: 'No se presentaron' },
        { titulo: 'Sin nota', valor: Math.max(0, alumnos.length - conNota - ausentes), icono: 'icon-[heroicons--clock]', nota: 'Falta calificar' },
    ];

    return (
        <div className="container-page">
            {volver}
            <div className="flex flex-row flex-wrap justify-between items-end gap-4">
                <div className="flex flex-col min-w-0">
                    <h1 className="truncate">{examen ? `Calificar: ${examen.titulo}` : 'Calificar examen'}</h1>
                    <h2>
                        {examen
                            ? `${nombreMateria} · ${formatearFecha(examen.fecha)} ${formatearHora(examen.hora)} · ${total} puntos`
                            : nombreMateria}
                    </h2>
                </div>
                {tomados.length > 1 && (
                    <select
                        value={idExamen ?? ''}
                        onChange={(e) => {
                            const id = e.target.value;
                            conConfirmacion(() => { setEdicion({}); setGuardadas({}); setSearchParams({ idExamen: id }); });
                        }}
                        aria-label="Examen a calificar"
                        className="px-3 py-2.5 rounded-xl border border-(--borderColor-input) bg-white text-sm text-gray-700 focus:outline-none focus:border-(--btnColor-primary) shadow-sm max-w-xs"
                    >
                        {tomados.map((e) => (
                            <option key={e.idExamen} value={e.idExamen}>{e.titulo} · {formatearFecha(e.fecha)}</option>
                        ))}
                    </select>
                )}
            </div>

            {!loading && !error && !examen ? (
                <div className="card items-center text-center py-10 gap-2">
                    <i className="icon-[heroicons--clipboard-document-check] text-4xl text-gray-300"></i>
                    <h3>No hay exámenes para calificar</h3>
                    <p className="text-sm text-gray-500">Los exámenes se califican después de su fecha y hora.</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        {tarjetas.map((t) => <TarjetaResumen key={t.titulo} loading={loading || cargandoNotas} {...t} />)}
                    </div>

                    <div className="flex flex-row flex-wrap justify-between items-center gap-4">
                        <SearchInput placeholder="Buscar alumno" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                        <div className="flex flex-row items-center gap-3">
                            <button
                                type="button"
                                onClick={() => conConfirmacion(() => navigate(`/materias/examenes/${materiaId}/resultados/${idExamen}`))}
                                disabled={!idExamen}
                                className="px-4 py-2.5 rounded-xl border border-(--borderColor-input) bg-white text-sm font-semibold text-slate-700 hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                            >
                                Ver resultados
                            </button>
                            <button
                                type="button"
                                onClick={guardar}
                                disabled={guardando || Boolean(errorNotas) || (aGuardar.length === 0 && conError.length === 0)}
                                className="btn-primary cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {guardando ? <Spinner className="h-4 w-4 text-white" /> : <i className="icon-[heroicons--check] text-white"></i>}
                                Guardar cambios{aGuardar.length > 0 ? ` (${aGuardar.length})` : ''}
                            </button>
                        </div>
                    </div>

                    {/* En pantallas angostas la tabla se desplaza dentro de su recuadro, no toda la página */}
                    <div className="overflow-x-auto rounded-md [&>table]:w-full">
                        <Table
                            headers={['Alumno', `Puntos (de ${total || SIN_DATO})`, 'Ausente', 'Calificación']}
                            data={datosTabla}
                            loading={loading || cargandoNotas}
                            emptyMessage={error || errorNotas || (filas.length === 0 ? 'No hay alumnos inscriptos en la materia' : 'No se encontraron alumnos')}
                            showPagination={false}
                        />
                    </div>
                </>
            )}

            <ConfirmModal
                isOpen={Boolean(salida)}
                onClose={() => setSalida(null)}
                onConfirm={() => { const accion = salida; setSalida(null); accion(); }}
                title="Cambios sin guardar"
                message={<>Tenés <b>{cambios.length}</b> {cambios.length === 1 ? 'nota modificada' : 'notas modificadas'} sin guardar.</>}
                warning="Si continuás, se pierden los cambios."
                confirmText="Descartar cambios"
                cancelText="Seguir editando"
            />
        </div>
    );
};
