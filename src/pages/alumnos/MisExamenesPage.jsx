import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { SearchInput } from '../../components/SearchInput';
import { Table } from '../../components/Table';
import { Modal } from '../../components/Modal';
import { listarInscripcionesPaginado } from '../../services/inscripcionesService';
import { listarMateriasPaginado, listarExamenesPaginado, listarMisNotas } from '../../services/notasService';

// Filas por página, igual que en los demás listados
const EXAMENES_POR_PAGINA = 8;

// Se cargan todos los datos de una vez para cruzarlos; la búsqueda y las páginas se resuelven acá
const MAX_REGISTROS = 1000;

// Valor a mostrar cuando un campo viene vacío
const SIN_DATO = '—';

// Opciones del filtro: los valores del enum EstadoNota, más los exámenes sin nota
const SIN_NOTA = 'SIN_NOTA';
const RESULTADOS = [
    { value: SIN_NOTA, label: 'Sin nota' },
    { value: 'APROBADO', label: 'Aprobado' },
    { value: 'REPROBADO', label: 'Reprobado' },
    { value: 'AUSENTE', label: 'Ausente' },
];

// Mismos colores que los badges de Table
const BADGE = {
    APROBADO: 'badge badge-success', REPROBADO: 'badge badge-danger', AUSENTE: 'badge badge-orange',
    PAGADO: 'badge badge-success', PENDIENTE: 'badge badge-warning',
};

const LABEL_CLASS = "block text-xs font-bold text-gray-600 tracking-wider uppercase mb-2";

// "2026-11-20" -> "20/11/2026". Sin new Date(), que correría un día por la zona horaria.
const formatearFecha = (fecha) => {
    if (!fecha) return SIN_DATO;
    const [anio, mes, dia] = String(fecha).slice(0, 10).split('-');
    return anio && mes && dia ? `${dia}/${mes}/${anio}` : String(fecha);
};

const formatearHora = (hora) => (hora ? String(hora).slice(0, 5) : SIN_DATO); // "18:00:00" -> "18:00"

// "40 de 50"; sin nota, solo el total
const formatearPuntos = ({ puntos, totalPuntos }) => {
    if (puntos == null) return totalPuntos == null ? SIN_DATO : `${SIN_DATO} de ${totalPuntos}`;
    return totalPuntos == null ? String(puntos) : `${puntos} de ${totalPuntos}`;
};

// Cada consulta es independiente: si falla una que no es la de inscripciones, el listado se muestra igual
const CONSULTAS = {
    // El backend devuelve solo las inscripciones del alumno logueado
    inscripciones: {
        nombre: 'tus inscripciones',
        pedir: () => listarInscripcionesPaginado({ page: 0, size: MAX_REGISTROS }),
    },
    notas: {
        nombre: 'tus notas',
        pedir: () => listarMisNotas({ page: 0, size: MAX_REGISTROS, sort: 'actualizacion,desc' }),
    },
    examenes: {
        nombre: 'los datos de los exámenes',
        pedir: () => listarExamenesPaginado({ page: 0, size: MAX_REGISTROS }),
    },
    materias: {
        nombre: 'las materias',
        pedir: () => listarMateriasPaginado({ page: 0, size: MAX_REGISTROS }),
    },
};

/**
 * Exámenes del alumno, sin repetir y por fecha (primero el más reciente o próximo): los que tienen
 * inscripción, más los que tienen nota (el profesor califica a todos los inscriptos en la materia).
 */
const armarMisExamenes = ({ inscripciones, notas = [], examenes = [], materias = [] }) => {
    // Si un examen está en varias inscripciones, alcanza con que una esté pagada
    const pagoPorExamen = new Map();
    inscripciones.forEach((i) => (i.detallesInscripcion || []).forEach((det) => {
        if (det.tipoInscripcion !== 'EXAMEN' || det.idExamen == null) return;
        if (pagoPorExamen.get(det.idExamen) !== 'PAGADO') pagoPorExamen.set(det.idExamen, i.estadoPago);
    }));

    // Vienen de la más nueva a la más vieja: si hubiera dos notas del mismo examen, queda la última
    const notaPorExamen = new Map();
    notas.forEach((n) => { if (!notaPorExamen.has(n.idExamen)) notaPorExamen.set(n.idExamen, n); });

    const examenesPorId = Object.fromEntries(examenes.map((e) => [e.idExamen, e]));
    const materiasPorId = Object.fromEntries(materias.map((m) => [m.idMateria, m]));
    const nombreMateria = (id) => (id == null ? SIN_DATO : materiasPorId[id]?.nombreMateria || `Materia #${id}`);

    const ids = new Set([...pagoPorExamen.keys(), ...notaPorExamen.keys()]);
    return [...ids]
        .map((id) => {
            // Un examen eliminado ya no viene en el listado
            const examen = examenesPorId[id];
            const nota = notaPorExamen.get(id);
            return {
                titulo: examen?.titulo || `Examen #${id}`,
                materia: nombreMateria(examen?.idMateria),
                fecha: examen?.fecha,
                hora: examen?.hora,
                totalPuntos: examen?.totalPuntos,
                puntos: nota?.puntosCorrectos,
                calificacion: nota?.calificacion,
                resultado: nota?.estadoNota,
                pago: pagoPorExamen.get(id),
            };
        })
        .sort((a, b) => `${b.fecha ?? ''} ${b.hora ?? ''}`.localeCompare(`${a.fecha ?? ''} ${a.hora ?? ''}`));
};

export const MisExamenesPage = () => {
    const [misExamenes, setMisExamenes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [resultado, setResultado] = useState('');
    const [page, setPage] = useState(0); // 0-based
    const [examenVer, setExamenVer] = useState(null);

    const headers = ['Examen', 'Materia', 'Fecha', 'Hora', 'Calificación', 'Resultado', 'Acciones'];

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
                    cargados[claves[i]] = respuesta.value.content;
                } else {
                    console.error(`Error al cargar ${CONSULTAS[claves[i]].nombre}:`, respuesta.reason);
                    fallidos.push(CONSULTAS[claves[i]].nombre);
                }
            });

            if (!cargados.inscripciones) {
                // Sin las inscripciones no se sabe cuáles son sus exámenes
                setError('No se pudieron cargar tus exámenes');
                toast.error('No se pudieron cargar tus exámenes.');
            } else {
                setMisExamenes(armarMisExamenes(cargados));
                // Un solo aviso, aunque fallen varias
                if (fallidos.length > 0) toast.warning(`No se pudieron cargar ${fallidos.join(', ')}.`);
            }
            setLoading(false);
        };
        cargar();

        return () => { ignore = true; };
    }, []);

    // ---------------------------------- TABLA -----------------------------------

    const texto = busqueda.trim().toLowerCase();
    const filtrados = misExamenes.filter((e) =>
        (e.titulo.toLowerCase().includes(texto) || e.materia.toLowerCase().includes(texto))
        && (!resultado || (e.resultado ?? SIN_NOTA) === resultado));

    const totalPages = Math.max(1, Math.ceil(filtrados.length / EXAMENES_POR_PAGINA));
    const visibles = filtrados.slice(page * EXAMENES_POR_PAGINA, (page + 1) * EXAMENES_POR_PAGINA);

    // Mismo orden que visibles, así el índice identifica al examen
    const filas = visibles.map((e) => [
        e.titulo,
        e.materia,
        formatearFecha(e.fecha),
        formatearHora(e.hora),
        e.calificacion ?? SIN_DATO,
        e.resultado || SIN_DATO,
    ]);

    const tableActions = [
        { type: 'view', title: 'Ver', onClick: (_, index) => setExamenVer(visibles[index]) },
    ];

    const mensajeVacio = misExamenes.length === 0
        ? 'No tenés exámenes'
        : 'No se encontraron exámenes';

    return (
        <div className="container-page">
            <div className="flex flex-col mt-[24px]">
                <h1>Mis Exámenes</h1>
                <h2>Tus exámenes y calificaciones</h2>
            </div>

            <div className="flex flex-row flex-wrap items-center gap-4">
                <SearchInput
                    placeholder="Buscar por examen o materia"
                    value={busqueda}
                    onChange={(e) => { setBusqueda(e.target.value); setPage(0); }}
                />
                <select
                    value={resultado}
                    onChange={(e) => { setResultado(e.target.value); setPage(0); }}
                    aria-label="Filtrar por resultado"
                    className="px-3 py-2.5 rounded-xl border border-(--borderColor-input) bg-white text-sm text-gray-700 focus:outline-none focus:border-(--btnColor-primary) shadow-sm"
                >
                    <option value="">Todos los resultados</option>
                    {RESULTADOS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </select>
            </div>

            {/* En pantallas angostas la tabla se desplaza dentro de su recuadro, no toda la página */}
            <div className="overflow-x-auto rounded-md [&>table]:w-full">
                <Table
                    headers={headers}
                    data={filas}
                    actions={tableActions}
                    loading={loading}
                    emptyMessage={error || mensajeVacio}
                    currentPage={page + 1}
                    totalPages={totalPages}
                    totalElements={filtrados.length}
                    onPrevPage={() => setPage((p) => Math.max(0, p - 1))}
                    onNextPage={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                />
            </div>

            {/* ------------------------------- VER ------------------------------- */}
            <Modal
                isOpen={Boolean(examenVer)}
                onClose={() => setExamenVer(null)}
                title="Datos del examen"
                size="md"
                closeOnBackdrop
            >
                {examenVer && (
                    <dl className="p-6 bg-(--bgColor-main) grid grid-cols-2 gap-4 text-sm max-h-[70vh] overflow-y-auto">
                        {[
                            ['Examen', examenVer.titulo],
                            ['Materia', examenVer.materia],
                            ['Fecha', formatearFecha(examenVer.fecha)],
                            ['Hora', formatearHora(examenVer.hora)],
                            ['Puntos', formatearPuntos(examenVer)],
                            ['Calificación', examenVer.calificacion ?? SIN_DATO],
                        ].map(([label, valor]) => (
                            <div key={label} className="min-w-0">
                                <dt className={LABEL_CLASS}>{label}</dt>
                                <dd className="text-slate-800 break-words">{valor}</dd>
                            </div>
                        ))}
                        <div>
                            <dt className={LABEL_CLASS}>Resultado</dt>
                            <dd><span className={BADGE[examenVer.resultado]}>{examenVer.resultado || SIN_DATO}</span></dd>
                        </div>
                        <div>
                            <dt className={LABEL_CLASS}>Estado de pago</dt>
                            <dd className="flex flex-col items-start gap-1">
                                <span className={BADGE[examenVer.pago]}>{examenVer.pago || SIN_DATO}</span>
                                {examenVer.pago === 'PENDIENTE' && (
                                    <span className="text-xs text-gray-500">Se paga en secretaría</span>
                                )}
                            </dd>
                        </div>
                    </dl>
                )}
            </Modal>
        </div>
    );
};
