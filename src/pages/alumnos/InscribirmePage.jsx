import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { SearchInput } from '../../components/SearchInput';
import { SegmentedControl } from '../../components/SegmentedControl';
import { Table } from '../../components/Table';
import { ConfirmModal } from '../../components/ConfirmModal';
import { listarInscripcionesPaginado, crearInscripcion, obtenerPrecios } from '../../services/inscripcionesService';
import { listarMateriasPaginado, listarExamenesPaginado } from '../../services/notasService';
import { getLoggedUser, mensajeDeError } from '../../services/api';

// Filas por página, igual que en los demás listados
const FILAS_POR_PAGINA = 8;

// Se cargan todos los datos de una vez para cruzarlos
const MAX_REGISTROS = 1000;

// Valor a mostrar cuando un campo viene vacío
const SIN_DATO = '—';

const SECCIONES = [
    { label: 'Materias', value: 'MATERIA' },
    { label: 'Exámenes', value: 'EXAMEN' },
];

// Mismos colores que los badges de Table
const BADGE_TIPO = { MATERIA: 'badge badge-info', EXAMEN: 'badge badge-purple' };

const ETIQUETA_DIA = {
    LUNES: 'Lunes', MARTES: 'Martes', MIERCOLES: 'Miércoles', JUEVES: 'Jueves',
    VIERNES: 'Viernes', SABADO: 'Sábado', DOMINGO: 'Domingo',
};
const formatearDia = (dia) => ETIQUETA_DIA[dia] || dia || SIN_DATO;

// "2026-11-20" -> "20/11/2026". Sin new Date(), que correría un día por la zona horaria.
const formatearFecha = (fecha) => {
    if (!fecha) return SIN_DATO;
    const [anio, mes, dia] = String(fecha).slice(0, 10).split('-');
    return anio && mes && dia ? `${dia}/${mes}/${anio}` : String(fecha);
};

const formatearHora = (hora) => (hora ? String(hora).slice(0, 5) : SIN_DATO); // "18:00:00" -> "18:00"

const formatearMonto = (monto) =>
    monto === undefined || monto === null ? SIN_DATO : `Gs. ${Number(monto).toLocaleString('es-PY')}`;

// Fecha local de hoy como "2026-11-25" (toISOString usaría la fecha UTC)
const fechaDeHoy = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
};

// Cada consulta es independiente: si falla una, lo que depende de las otras se muestra igual
const CONSULTAS = {
    // El backend devuelve solo las inscripciones del alumno logueado
    inscripciones: { nombre: 'tus inscripciones', pedir: () => listarInscripcionesPaginado({ page: 0, size: MAX_REGISTROS }) },
    materias: { nombre: 'las materias', pedir: () => listarMateriasPaginado({ page: 0, size: MAX_REGISTROS }) },
    examenes: { nombre: 'los exámenes', pedir: () => listarExamenesPaginado({ page: 0, size: MAX_REGISTROS }) },
    precios: { nombre: 'los precios', pedir: () => obtenerPrecios() },
};

// Ids de materias y exámenes en los que ya está inscripto (pagados o no)
const yaInscripto = (inscripciones) => {
    const materias = new Set();
    const examenes = new Set();
    inscripciones.forEach((i) => (i.detallesInscripcion || []).forEach((det) => {
        if (det.tipoInscripcion === 'MATERIA' && det.idMateria != null) materias.add(det.idMateria);
        if (det.tipoInscripcion === 'EXAMEN' && det.idExamen != null) examenes.add(det.idExamen);
    }));
    return { materias, examenes };
};

export const InscribirmePage = () => {
    const navigate = useNavigate();

    const [datos, setDatos] = useState({}); // resultado de cada consulta; si falló, no está
    const [loading, setLoading] = useState(true);
    const [seccion, setSeccion] = useState('MATERIA');
    const [busqueda, setBusqueda] = useState('');
    const [page, setPage] = useState(0); // 0-based
    const [seleccion, setSeleccion] = useState([]); // [{ tipo, id, nombre, detalle, idMateria }]
    const [confirmando, setConfirmando] = useState(false);
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        // Evita actualizar el estado si se sale de la página o por la doble ejecución de StrictMode
        let ignore = false;

        const cargar = async () => {
            const claves = Object.keys(CONSULTAS);
            const respuestas = await Promise.allSettled(claves.map((clave) => CONSULTAS[clave].pedir()));
            if (ignore) return;

            const cargados = {};
            const fallidos = [];
            respuestas.forEach((respuesta, i) => {
                if (respuesta.status === 'fulfilled') {
                    cargados[claves[i]] = claves[i] === 'precios' ? respuesta.value : respuesta.value.content;
                } else {
                    console.error(`Error al cargar ${CONSULTAS[claves[i]].nombre}:`, respuesta.reason);
                    fallidos.push(CONSULTAS[claves[i]].nombre);
                }
            });
            setDatos(cargados);
            setLoading(false);
            // Un solo aviso, aunque fallen varias
            if (fallidos.length > 0) toast.error(`No se pudieron cargar ${fallidos.join(', ')}.`);
        };
        cargar();

        return () => { ignore = true; };
    }, []);

    const { inscripciones, materias, examenes, precios } = datos;
    const previas = yaInscripto(inscripciones ?? []);
    const materiasPorId = Object.fromEntries((materias ?? []).map((m) => [m.idMateria, m]));
    const nombreMateria = (id) => materiasPorId[id]?.nombreMateria || `Materia #${id}`;
    const precio = (tipo) => (tipo === 'EXAMEN' ? precios?.examen : precios?.materia) ?? null;

    const enSeleccion = (tipo, id) => seleccion.some((s) => s.tipo === tipo && s.id === id);
    // Materias que cursa o que está agregando: solo se ofrecen exámenes de esas
    const materiasPropias = new Set([...previas.materias, ...seleccion.filter((s) => s.tipo === 'MATERIA').map((s) => s.id)]);

    // ------------------------------ DISPONIBLES ---------------------------------

    const hoy = fechaDeHoy();
    const texto = busqueda.trim().toLowerCase();

    const materiasDisponibles = (materias ?? [])
        .filter((m) => !previas.materias.has(m.idMateria) && !enSeleccion('MATERIA', m.idMateria))
        .filter((m) => `${m.nombreMateria} ${m.nombreProfesor ?? ''}`.toLowerCase().includes(texto))
        .sort((a, b) => (a.nombreMateria ?? '').localeCompare(b.nombreMateria ?? '', 'es'));

    const examenesDisponibles = (examenes ?? [])
        .filter((e) => e.fecha >= hoy && materiasPropias.has(e.idMateria))
        .filter((e) => !previas.examenes.has(e.idExamen) && !enSeleccion('EXAMEN', e.idExamen))
        .filter((e) => `${e.titulo} ${nombreMateria(e.idMateria)}`.toLowerCase().includes(texto))
        .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));

    const esMateria = seccion === 'MATERIA';

    // Sin inscripciones no se sabe qué tiene ya (se ofrecería algo repetido); sin la lista, no hay qué mostrar
    const errorLista = !inscripciones
        ? 'No se pudieron cargar tus inscripciones'
        : !(esMateria ? materias : examenes) ? `No se pudieron cargar ${esMateria ? 'las materias' : 'los exámenes'}` : null;

    const disponibles = errorLista ? [] : esMateria ? materiasDisponibles : examenesDisponibles;
    const totalPages = Math.max(1, Math.ceil(disponibles.length / FILAS_POR_PAGINA));
    // Al agregar el último de una página, la página queda vacía: se muestra la anterior
    const pagina = Math.min(page, totalPages - 1);
    const visibles = disponibles.slice(pagina * FILAS_POR_PAGINA, (pagina + 1) * FILAS_POR_PAGINA);

    // Mismo orden que visibles, así el índice identifica al ítem
    const filas = esMateria
        ? visibles.map((m) => [m.nombreMateria || SIN_DATO, m.nombreProfesor || SIN_DATO, formatearDia(m.dia)])
        : visibles.map((e) => [e.titulo || SIN_DATO, nombreMateria(e.idMateria), formatearFecha(e.fecha), formatearHora(e.hora)]);

    const headers = esMateria
        ? ['Materia', 'Profesor', 'Día', 'Acciones']
        : ['Examen', 'Materia', 'Fecha', 'Hora', 'Acciones'];

    const mensajeVacio = texto
        ? 'No se encontraron resultados'
        : esMateria
            ? 'No hay más materias disponibles'
            : 'No hay exámenes próximos de tus materias. Agregá una materia para ver los suyos.';

    // ------------------------------- SELECCIÓN ----------------------------------

    const agregar = (_, index) => {
        const item = visibles[index];
        setSeleccion((s) => [...s, esMateria
            ? { tipo: 'MATERIA', id: item.idMateria, nombre: item.nombreMateria, detalle: formatearDia(item.dia) }
            : { tipo: 'EXAMEN', id: item.idExamen, nombre: item.titulo, detalle: `${nombreMateria(item.idMateria)} · ${formatearFecha(item.fecha)}`, idMateria: item.idMateria }]);
    };

    const quitar = (item) => {
        // Si se quita una materia, también sus exámenes (salvo que ya la curse)
        const sinMateria = (s) => item.tipo === 'MATERIA' && s.tipo === 'EXAMEN' && s.idMateria === item.id && !previas.materias.has(item.id);
        const quedan = seleccion.filter((s) => !(s.tipo === item.tipo && s.id === item.id) && !sinMateria(s));
        if (quedan.length < seleccion.length - 1) toast.info(`También se quitaron los exámenes de ${item.nombre}.`);
        setSeleccion(quedan);
    };

    const preciosConocidos = seleccion.every((s) => precio(s.tipo) !== null);
    const total = seleccion.reduce((acc, s) => acc + (precio(s.tipo) ?? 0), 0);

    const confirmar = async () => {
        setEnviando(true);
        try {
            await crearInscripcion({
                idAlumno: getLoggedUser()?.id,
                detallesInscripcion: seleccion.map((s) => (s.tipo === 'MATERIA'
                    ? { tipoInscripcion: 'MATERIA', idMateria: s.id }
                    : { tipoInscripcion: 'EXAMEN', idExamen: s.id })),
            });
            toast.success('Inscripción creada. Queda pendiente de pago.');
            navigate('/alumno/facturacion');
        } catch (err) {
            console.error('Error al crear la inscripción:', err);
            toast.error(mensajeDeError(err, 'No se pudo crear la inscripción.'));
            setConfirmando(false);
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="container-page">
            <div className="flex flex-col mt-[24px]">
                <h1>Inscribirme</h1>
                <h2>Elegí materias y exámenes. La inscripción queda pendiente y se paga en secretaría.</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] gap-4 items-start">
                {/* ------------------------------ DISPONIBLES ------------------------------ */}
                <div className="flex flex-col gap-3 min-w-0">
                    <div className="flex flex-row flex-wrap items-center gap-4">
                        <SegmentedControl
                            options={SECCIONES}
                            value={seccion}
                            onChange={(v) => { setSeccion(v); setBusqueda(''); setPage(0); }}
                        />
                        <SearchInput
                            placeholder={esMateria ? 'Materia o profesor' : 'Examen o materia'}
                            value={busqueda}
                            onChange={(e) => { setBusqueda(e.target.value); setPage(0); }}
                        />
                        <span className="text-sm text-gray-500">
                            {esMateria ? 'Cada materia' : 'Cada examen'}: <b className="text-slate-700">{formatearMonto(precio(seccion))}</b>
                        </span>
                    </div>

                    {/* En pantallas angostas la tabla se desplaza dentro de su recuadro, no toda la página */}
                    <div className="overflow-x-auto rounded-md [&>table]:w-full">
                        <Table
                            headers={headers}
                            data={filas}
                            actions={[{ type: 'add', title: 'Agregar', onClick: agregar }]}
                            loading={loading}
                            emptyMessage={errorLista || mensajeVacio}
                            currentPage={pagina + 1}
                            totalPages={totalPages}
                            totalElements={disponibles.length}
                            onPrevPage={() => setPage(Math.max(0, pagina - 1))}
                            onNextPage={() => setPage(Math.min(totalPages - 1, pagina + 1))}
                        />
                    </div>
                </div>

                {/* ------------------------------- SELECCIÓN ------------------------------- */}
                <div className="card p-4 gap-3">
                    <h3>Tu inscripción</h3>
                    {seleccion.length === 0 ? (
                        <p className="text-sm text-gray-500 py-4 text-center">Agregá materias o exámenes con el botón +.</p>
                    ) : (
                        <ul className="divide-y divide-slate-100 border border-(--borderColor-input) rounded-xl bg-white max-h-72 overflow-y-auto">
                            {seleccion.map((s) => (
                                <li key={`${s.tipo}-${s.id}`} className="p-3 flex items-center gap-2 text-sm">
                                    <div className="flex flex-col min-w-0 flex-1 gap-1">
                                        <span className="font-medium text-slate-800 truncate" title={s.nombre}>{s.nombre}</span>
                                        <span className="flex items-center gap-2 text-xs text-gray-500 min-w-0">
                                            <span className={`${BADGE_TIPO[s.tipo]} !min-w-0 !text-[11px] shrink-0`}>{s.tipo}</span>
                                            <span className="truncate">{s.detalle}</span>
                                        </span>
                                    </div>
                                    <span className="font-semibold text-slate-700 shrink-0">{formatearMonto(precio(s.tipo))}</span>
                                    <button
                                        type="button"
                                        onClick={() => quitar(s)}
                                        title="Quitar"
                                        aria-label={`Quitar ${s.nombre}`}
                                        className="text-gray-400 hover:text-rose-600 cursor-pointer shrink-0"
                                    >
                                        <i className="icon-[heroicons--x-mark] text-lg"></i>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="flex justify-between items-center pt-3 border-t border-(--borderColor-input)">
                        <span className="font-bold text-slate-800">Total</span>
                        <span className="text-lg font-extrabold text-(--btnColor-primary)">
                            {preciosConocidos ? formatearMonto(total) : SIN_DATO}
                        </span>
                    </div>
                    {!preciosConocidos && (
                        <p className="text-xs text-gray-500">El total se calcula al confirmar.</p>
                    )}
                    <button
                        type="button"
                        className="btn-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={seleccion.length === 0}
                        onClick={() => setConfirmando(true)}
                    >
                        Confirmar inscripción
                    </button>
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmando}
                onClose={() => setConfirmando(false)}
                onConfirm={confirmar}
                loading={enviando}
                variant="primary"
                title="Confirmar inscripción"
                message={<>¿Confirmás la inscripción a <b>{seleccion.length} {seleccion.length === 1 ? 'ítem' : 'ítems'}</b> por <b>{preciosConocidos ? formatearMonto(total) : 'el total que se calcule'}</b>?</>}
                warning="Queda pendiente de pago: se paga en secretaría. Mientras esté pendiente, la podés cancelar desde Facturación."
                confirmText="Confirmar"
            />
        </div>
    );
};
