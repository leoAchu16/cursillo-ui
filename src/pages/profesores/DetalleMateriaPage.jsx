import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { SearchInput } from '../../components/SearchInput';
import { Table } from '../../components/Table';
import { Modal } from '../../components/Modal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Spinner } from '../../components/Spinner';
import { TarjetaResumen } from '../../components/TarjetaResumen';
import { mensajeDeError } from '../../services/api';
import { listarAlumnosDeMateria } from '../../services/inscripcionesService';
import {
    obtenerMateria,
    listarExamenesDeMateria,
    listarNotasPaginado,
    crearExamen,
    actualizarExamen,
    eliminarExamen,
} from '../../services/notasService';

// Filas de cada tabla: entran las dos lado a lado sin scroll a 1366×650
const FILAS = 4;

// Se cargan todos los datos de una vez para cruzarlos
const MAX_REGISTROS = 1000;

// Valor a mostrar cuando un campo viene vacío o no se pudo cargar
const SIN_DATO = '—';

// Límites del backend
const LARGO_MAXIMO_TITULO = 100;
const PUNTOS_MAXIMOS = 1000;

const FORM_VACIO = { titulo: '', fecha: '', hora: '', totalPuntos: '' };

const INPUT_CLASS = "w-full px-3 py-2 rounded-lg border border-(--borderColor-input) bg-white text-sm focus:outline-none focus:border-(--btnColor-primary) disabled:bg-gray-100! disabled:text-gray-600 disabled:cursor-not-allowed";
const LABEL_CLASS = "block text-xs font-bold text-gray-600 tracking-wider uppercase mb-2";
// En pantallas angostas la tabla se desplaza dentro de su recuadro, no toda la página
const TABLA_CLASS = "overflow-x-auto rounded-md [&>table]:w-full";

const ETIQUETA_DIA = {
    LUNES: 'Lunes', MARTES: 'Martes', MIERCOLES: 'Miércoles', JUEVES: 'Jueves',
    VIERNES: 'Viernes', SABADO: 'Sábado', DOMINGO: 'Domingo',
};

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

// El backend no marca el examen como CALIFICADO: el estado se deduce de la fecha y de las notas
const PROXIMO = 'PRÓXIMO';
const POR_CALIFICAR = 'POR CALIFICAR';
const CALIFICADO = 'CALIFICADO';

export const DetalleMateriaPage = () => {
    const { materiaId } = useParams();
    const navigate = useNavigate();

    const [materia, setMateria] = useState(null);
    const [alumnos, setAlumnos] = useState([]);
    const [examenes, setExamenes] = useState(null); // null: no se pudieron cargar
    const [notas, setNotas] = useState(null);       // null: no se pudieron cargar
    const [loading, setLoading] = useState(true);
    const [cargandoExamenes, setCargandoExamenes] = useState(true); // solo la primera vez
    const [errorAlumnos, setErrorAlumnos] = useState(null);
    const [noEncontrada, setNoEncontrada] = useState(false);
    const [recarga, setRecarga] = useState(0);      // incrementarlo vuelve a pedir los exámenes y las notas

    const [busqueda, setBusqueda] = useState('');
    const [pageAlumnos, setPageAlumnos] = useState(0);
    const [pageExamenes, setPageExamenes] = useState(0);
    const [alumnoVer, setAlumnoVer] = useState(null);

    // Crear / editar / eliminar examen
    const [formAbierto, setFormAbierto] = useState(false);
    const [examenEditar, setExamenEditar] = useState(null); // null = crear
    const [form, setForm] = useState(FORM_VACIO);
    const [guardando, setGuardando] = useState(false);
    const [examenEliminar, setExamenEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(false);

    // Materia y alumnos: al entrar. El backend solo devuelve los alumnos si la materia es del profesor (si no, 404)
    useEffect(() => {
        let ignore = false;

        const cargar = async () => {
            const [resAlumnos, resMateria] = await Promise.allSettled([
                listarAlumnosDeMateria(materiaId),
                obtenerMateria(materiaId),
            ]);
            if (ignore) return;

            if (resAlumnos.status === 'fulfilled') {
                setAlumnos([...resAlumnos.value].sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es')));
            } else if (resAlumnos.reason?.response?.status === 404) {
                setNoEncontrada(true);
            } else {
                console.error('Error al cargar los alumnos:', resAlumnos.reason);
                setErrorAlumnos('No se pudieron cargar los alumnos');
                toast.error('No se pudieron cargar los alumnos de la materia.');
            }

            if (resMateria.status === 'fulfilled') {
                setMateria(resMateria.value);
            } else if (resAlumnos.status === 'fulfilled') {
                console.error('Error al cargar la materia:', resMateria.reason);
                toast.warning('No se pudieron cargar los datos de la materia.');
            }
            setLoading(false);
        };
        cargar();

        return () => { ignore = true; };
    }, [materiaId]);

    // Exámenes y notas: al entrar y después de crear, editar o eliminar un examen
    useEffect(() => {
        let ignore = false;

        const cargar = async () => {
            const [resExamenes, resNotas] = await Promise.allSettled([
                listarExamenesDeMateria({ idMateria: materiaId, size: MAX_REGISTROS }),
                listarNotasPaginado({ page: 0, size: MAX_REGISTROS }),
            ]);
            if (ignore) return;

            const fallidos = [];
            if (resExamenes.status === 'fulfilled') setExamenes(resExamenes.value.content);
            else { console.error('Error al cargar los exámenes:', resExamenes.reason); fallidos.push('los exámenes'); }
            if (resNotas.status === 'fulfilled') setNotas(resNotas.value.content);
            else { console.error('Error al cargar las notas:', resNotas.reason); fallidos.push('las notas'); }
            setCargandoExamenes(false);
            if (fallidos.length > 0) toast.error(`No se pudieron cargar ${fallidos.join(' y ')}.`, { id: 'examenes-materia' });
        };
        cargar();

        return () => { ignore = true; };
    }, [materiaId, recarga]);

    // --------------------------------- EXÁMENES ---------------------------------

    const ahora = ahoraLocal();
    const conNotas = new Set((notas ?? []).map((n) => n.idExamen));
    const estadoDe = (e) => {
        if (momentoDe(e) > ahora) return PROXIMO;
        if (!notas) return SIN_DATO;
        return conNotas.has(e.idExamen) ? CALIFICADO : POR_CALIFICAR;
    };

    // Los más recientes o próximos primero
    const listaExamenes = [...(examenes ?? [])].sort((a, b) => momentoDe(b).localeCompare(momentoDe(a)));
    const proximos = listaExamenes.filter((e) => estadoDe(e) === PROXIMO).reverse();
    const porCalificar = listaExamenes.filter((e) => estadoDe(e) === POR_CALIFICAR);

    const totalPagesExamenes = Math.max(1, Math.ceil(listaExamenes.length / FILAS));
    const paginaExamenes = Math.min(pageExamenes, totalPagesExamenes - 1);
    const visiblesExamenes = listaExamenes.slice(paginaExamenes * FILAS, (paginaExamenes + 1) * FILAS);

    const filasExamenes = visiblesExamenes.map((e) => [
        e.titulo || SIN_DATO,
        `${formatearFecha(e.fecha)} ${formatearHora(e.hora)}`,
        estadoDe(e),
    ]);

    const accionesExamenes = [
        {
            type: 'grade', title: 'Calificar',
            show: (_, i) => estadoDe(visiblesExamenes[i]) !== PROXIMO,
            onClick: (_, i) => navigate(`/materias/examenes/${materiaId}/calificar?idExamen=${visiblesExamenes[i].idExamen}`),
        },
        {
            type: 'results', title: 'Resultados',
            show: (_, i) => estadoDe(visiblesExamenes[i]) === CALIFICADO,
            onClick: (_, i) => navigate(`/materias/examenes/${materiaId}/resultados/${visiblesExamenes[i].idExamen}`),
        },
        { type: 'edit', title: 'Editar', onClick: (_, i) => abrirEditar(visiblesExamenes[i]) },
        {
            // Con notas el backend no lo deja eliminar; sin saber si tiene, no se ofrece
            type: 'delete', title: 'Eliminar',
            show: (_, i) => Boolean(notas) && !conNotas.has(visiblesExamenes[i].idExamen),
            onClick: (_, i) => setExamenEliminar(visiblesExamenes[i]),
        },
    ];

    // ---------------------------------- ALUMNOS ---------------------------------

    const texto = busqueda.trim().toLowerCase();
    const alumnosFiltrados = alumnos.filter((a) => `${a.nombre ?? ''} ${a.email ?? ''}`.toLowerCase().includes(texto));
    const totalPagesAlumnos = Math.max(1, Math.ceil(alumnosFiltrados.length / FILAS));
    const visiblesAlumnos = alumnosFiltrados.slice(pageAlumnos * FILAS, (pageAlumnos + 1) * FILAS);
    const filasAlumnos = visiblesAlumnos.map((a) => [a.nombre || `Alumno #${a.idAlumno}`, a.email || SIN_DATO]);

    // ----------------------------- CREAR / EDITAR --------------------------------

    const tieneNotas = Boolean(examenEditar) && conNotas.has(examenEditar.idExamen);

    const abrirCrear = () => {
        setExamenEditar(null);
        setForm(FORM_VACIO);
        setFormAbierto(true);
    };

    const abrirEditar = (examen) => {
        setExamenEditar(examen);
        setForm({
            titulo: examen.titulo || '',
            fecha: examen.fecha || '',
            hora: examen.hora ? String(examen.hora).slice(0, 5) : '',
            totalPuntos: examen.totalPuntos != null ? String(examen.totalPuntos) : '',
        });
        setFormAbierto(true);
    };

    const cerrarFormulario = () => {
        if (guardando) return;
        setFormAbierto(false);
        setExamenEditar(null);
        setForm(FORM_VACIO);
    };

    const handleInputChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleGuardar = async (e) => {
        e.preventDefault();
        const titulo = form.titulo.trim();
        const totalPuntos = Number(form.totalPuntos);

        if (!titulo) { toast.warning('El título del examen es obligatorio.'); return; }
        if (!form.fecha || !form.hora) { toast.warning('Completá la fecha y la hora del examen.'); return; }
        // Al editar se puede corregir la fecha de un examen que ya pasó
        if (!examenEditar && `${form.fecha} ${form.hora}` <= ahoraLocal()) {
            toast.warning('La fecha y hora del examen no pueden ser pasadas.');
            return;
        }
        if (form.totalPuntos === '' || !Number.isInteger(totalPuntos) || totalPuntos < 1 || totalPuntos > PUNTOS_MAXIMOS) {
            toast.warning(`Los puntos totales deben ser un número entero entre 1 y ${PUNTOS_MAXIMOS}.`);
            return;
        }

        const dto = { idMateria: Number(materiaId), titulo, fecha: form.fecha, hora: `${form.hora}:00`, totalPuntos };
        setGuardando(true);
        try {
            if (examenEditar) {
                await actualizarExamen(examenEditar.idExamen, dto);
                toast.success('Examen actualizado correctamente.');
            } else {
                await crearExamen(dto);
                toast.success('Examen creado correctamente.');
                setPageExamenes(0);
            }
            setFormAbierto(false);
            setExamenEditar(null);
            setForm(FORM_VACIO);
            setRecarga((r) => r + 1);
        } catch (err) {
            console.error('Error al guardar el examen:', err);
            toast.error(mensajeDeError(err, 'No se pudo guardar el examen.'));
        } finally {
            setGuardando(false);
        }
    };

    const handleEliminar = async () => {
        setEliminando(true);
        try {
            await eliminarExamen(examenEliminar.idExamen);
            toast.success('Examen eliminado correctamente.');
            setExamenEliminar(null);
            setRecarga((r) => r + 1);
        } catch (err) {
            console.error('Error al eliminar el examen:', err);
            toast.error(mensajeDeError(err, 'No se pudo eliminar el examen.'));
        } finally {
            setEliminando(false);
        }
    };

    // --------------------------------- PANTALLA ---------------------------------

    const volver = (
        <button
            type="button"
            onClick={() => navigate('/materias/mis-materias')}
            className="flex items-center text-sm font-bold text-(--btnColor-primary) hover:underline w-fit mt-[24px] cursor-pointer"
        >
            <i className="icon-[heroicons--arrow-left] mr-1"></i> Volver a Mis Materias
        </button>
    );

    if (noEncontrada) {
        return (
            <div className="container-page">
                {volver}
                <div className="card items-center text-center py-10 gap-2">
                    <i className="icon-[heroicons--book-open] text-4xl text-gray-300"></i>
                    <h3>Materia no encontrada</h3>
                    <p className="text-sm text-gray-500">No existe o no es una de las materias que dictás.</p>
                </div>
            </div>
        );
    }

    const proximo = proximos[0];
    const tarjetas = [
        { titulo: 'Alumnos', valor: errorAlumnos ? SIN_DATO : alumnos.length, icono: 'icon-[heroicons--users]', nota: 'Inscriptos en la materia' },
        { titulo: 'Exámenes', valor: examenes ? examenes.length : SIN_DATO, icono: 'icon-[heroicons--clipboard-document-list]', nota: 'De esta materia' },
        {
            titulo: 'Próximo examen',
            valor: !examenes ? SIN_DATO : proximo ? `${formatearFecha(proximo.fecha)} ${formatearHora(proximo.hora)}` : 'Ninguno',
            icono: 'icon-[heroicons--calendar-days]',
            nota: proximo?.titulo || (examenes ? 'No hay exámenes próximos' : ''),
        },
        { titulo: 'Por calificar', valor: examenes && notas ? porCalificar.length : SIN_DATO, icono: 'icon-[heroicons--pencil-square]', nota: 'Ya rendidos y sin notas' },
    ];

    return (
        <div className="container-page">
            {volver}
            <div className="flex flex-col">
                <h1>{materia?.nombreMateria || (loading ? 'Cargando...' : `Materia #${materiaId}`)}</h1>
                <h2>{materia?.dia ? (ETIQUETA_DIA[materia.dia] || materia.dia) : 'Alumnos y exámenes de la materia'}</h2>
                {materia?.descripcion && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-1" title={materia.descripcion}>{materia.descripcion}</p>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {tarjetas.map((t) => <TarjetaResumen key={t.titulo} loading={loading || cargandoExamenes} {...t} />)}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                {/* --------------------------------- ALUMNOS --------------------------------- */}
                <div className="flex flex-col gap-2 min-w-0">
                    <div className="flex flex-row flex-wrap items-center justify-between gap-3">
                        <h3>Alumnos</h3>
                        <SearchInput
                            placeholder="Buscar por nombre o email"
                            value={busqueda}
                            onChange={(e) => { setBusqueda(e.target.value); setPageAlumnos(0); }}
                        />
                    </div>
                    <div className={TABLA_CLASS}>
                        <Table
                            headers={['Alumno', 'Email', 'Acciones']}
                            data={filasAlumnos}
                            actions={[{ type: 'view', title: 'Ver', onClick: (_, i) => setAlumnoVer(visiblesAlumnos[i]) }]}
                            loading={loading}
                            emptyMessage={errorAlumnos || (alumnos.length === 0 ? 'Todavía no hay alumnos inscriptos' : 'No se encontraron alumnos')}
                            currentPage={pageAlumnos + 1}
                            totalPages={totalPagesAlumnos}
                            totalElements={alumnosFiltrados.length}
                            onPrevPage={() => setPageAlumnos((p) => Math.max(0, p - 1))}
                            onNextPage={() => setPageAlumnos((p) => Math.min(totalPagesAlumnos - 1, p + 1))}
                        />
                    </div>
                </div>

                {/* --------------------------------- EXÁMENES -------------------------------- */}
                <div className="flex flex-col gap-2 min-w-0">
                    <div className="flex flex-row flex-wrap items-center justify-between gap-3">
                        <h3>Exámenes</h3>
                        <button className="btn-primary cursor-pointer" onClick={abrirCrear}>
                            <i className="icon-[heroicons--plus] text-white mr-2"></i>
                            Nuevo examen
                        </button>
                    </div>
                    <div className={TABLA_CLASS}>
                        <Table
                            headers={['Examen', 'Fecha', 'Estado', 'Acciones']}
                            data={filasExamenes}
                            actions={accionesExamenes}
                            loading={loading || cargandoExamenes}
                            emptyMessage={examenes ? 'Todavía no hay exámenes' : 'No se pudieron cargar los exámenes'}
                            currentPage={paginaExamenes + 1}
                            totalPages={totalPagesExamenes}
                            totalElements={listaExamenes.length}
                            onPrevPage={() => setPageExamenes(Math.max(0, paginaExamenes - 1))}
                            onNextPage={() => setPageExamenes(Math.min(totalPagesExamenes - 1, paginaExamenes + 1))}
                        />
                    </div>
                </div>
            </div>

            {/* ------------------------------ VER ALUMNO ------------------------------ */}
            <Modal isOpen={Boolean(alumnoVer)} onClose={() => setAlumnoVer(null)} title="Datos del alumno" size="md" closeOnBackdrop>
                <dl className="p-6 bg-(--bgColor-main) grid grid-cols-2 gap-4 text-sm">
                    {[
                        ['Alumno', alumnoVer?.nombre, true],
                        ['Email', alumnoVer?.email, true],
                        ['Teléfono', alumnoVer?.telefono],
                        ['Inscripción', alumnoVer && formatearFecha(alumnoVer.fechaInscripcion)],
                    ].map(([label, valor, ancho]) => (
                        <div key={label} className={`min-w-0 ${ancho ? 'col-span-2' : ''}`}>
                            <dt className={LABEL_CLASS}>{label}</dt>
                            <dd className="text-slate-800 break-words">{valor || SIN_DATO}</dd>
                        </div>
                    ))}
                </dl>
            </Modal>

            {/* --------------------------- CREAR / EDITAR EXAMEN --------------------------- */}
            <Modal isOpen={formAbierto} onClose={cerrarFormulario} title={examenEditar ? 'Editar examen' : 'Nuevo examen'}>
                <form onSubmit={handleGuardar} className="flex flex-col" noValidate>
                    <div className="p-6 bg-(--bgColor-main) flex flex-col gap-5">
                        <div>
                            <label htmlFor="titulo" className={LABEL_CLASS}>Título</label>
                            <input id="titulo" type="text" name="titulo" maxLength={LARGO_MAXIMO_TITULO} value={form.titulo}
                                onChange={handleInputChange} placeholder="Ej. Primer parcial" className={INPUT_CLASS} disabled={guardando} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="fecha" className={LABEL_CLASS}>Fecha</label>
                                <input id="fecha" type="date" name="fecha" value={form.fecha} onChange={handleInputChange} className={INPUT_CLASS} disabled={guardando} />
                            </div>
                            <div>
                                <label htmlFor="hora" className={LABEL_CLASS}>Hora</label>
                                <input id="hora" type="time" name="hora" value={form.hora} onChange={handleInputChange} className={INPUT_CLASS} disabled={guardando} />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="totalPuntos" className={LABEL_CLASS}>Puntos totales</label>
                            <input id="totalPuntos" type="number" name="totalPuntos" min="1" max={PUNTOS_MAXIMOS} step="1" value={form.totalPuntos}
                                onChange={handleInputChange} placeholder="Ej. 50" className={INPUT_CLASS} disabled={guardando || tieneNotas} />
                            {tieneNotas && (
                                <p className="mt-1.5 text-xs text-gray-500">Ya tiene notas cargadas: los puntos totales no se pueden cambiar.</p>
                            )}
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-white border-t border-(--borderColor-input) flex justify-end items-center gap-4">
                        <button type="button" onClick={cerrarFormulario} disabled={guardando}
                            className="text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors cursor-pointer disabled:opacity-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={guardando} className="btn-primary cursor-pointer flex items-center gap-2 disabled:opacity-60">
                            {guardando && <Spinner className="h-4 w-4 text-white" />}
                            {examenEditar ? 'Guardar cambios' : 'Crear examen'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ------------------------------ ELIMINAR EXAMEN ------------------------------ */}
            <ConfirmModal
                isOpen={Boolean(examenEliminar)}
                onClose={() => setExamenEliminar(null)}
                onConfirm={handleEliminar}
                loading={eliminando}
                title="Eliminar examen"
                message={<>¿Seguro que querés eliminar el examen <b>{examenEliminar?.titulo}</b>?</>}
                warning="Solo se pueden eliminar exámenes sin notas. Las inscripciones al examen no se modifican."
                confirmText="Eliminar"
            />
        </div>
    );
};
