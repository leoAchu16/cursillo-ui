import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { SearchInput } from '../../components/SearchInput';
import { Table } from '../../components/Table';
import { Modal } from '../../components/Modal';
import { listarInscripcionesPaginado } from '../../services/inscripcionesService';
import { listarMateriasPaginado } from '../../services/notasService';

// Filas por página, igual que en los demás listados
const MATERIAS_POR_PAGINA = 8;

// Se cargan todos los datos de una vez para cruzarlos; la búsqueda y las páginas se resuelven acá
const MAX_REGISTROS = 1000;

// Valor a mostrar cuando un campo viene vacío
const SIN_DATO = '—';

const ESTADOS_PAGO = ['PENDIENTE', 'PAGADO'];

// Mismos colores que los badges de Table
const BADGE_ESTADO = { PAGADO: 'badge badge-success', PENDIENTE: 'badge badge-warning' };

const LABEL_CLASS = "block text-xs font-bold text-gray-600 tracking-wider uppercase mb-2";

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

/**
 * Materias en las que está inscripto, sin repetir y por nombre.
 * Si una materia está en varias inscripciones, queda la primera pagada (o la primera, si no hay pagadas).
 */
const armarMisMaterias = (inscripciones, materias) => {
    const inscripcionPorMateria = new Map();
    inscripciones.forEach((i) => (i.detallesInscripcion || []).forEach((det) => {
        if (det.tipoInscripcion !== 'MATERIA' || det.idMateria == null) return;
        const anterior = inscripcionPorMateria.get(det.idMateria);
        if (!anterior || (anterior.estadoPago !== 'PAGADO' && i.estadoPago === 'PAGADO')) {
            inscripcionPorMateria.set(det.idMateria, i);
        }
    }));

    const materiasPorId = Object.fromEntries(materias.map((m) => [m.idMateria, m]));
    return [...inscripcionPorMateria]
        .map(([id, inscripcion]) => ({
            // Una materia eliminada ya no viene en el listado
            nombre: materiasPorId[id]?.nombreMateria || `Materia #${id}`,
            profesor: materiasPorId[id]?.nombreProfesor,
            dia: materiasPorId[id]?.dia,
            descripcion: materiasPorId[id]?.descripcion,
            fecha: inscripcion.fechaInscripcion,
            estado: inscripcion.estadoPago,
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
};

export const MisMateriasAlumnoPage = () => {
    const navigate = useNavigate();
    const [misMaterias, setMisMaterias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [estado, setEstado] = useState('');
    const [page, setPage] = useState(0); // 0-based
    const [materiaVer, setMateriaVer] = useState(null);

    const headers = ['Materia', 'Profesor', 'Día', 'Fecha de inscripción', 'Estado de pago', 'Acciones'];

    useEffect(() => {
        // Evita actualizar el estado si se sale de la página o por la doble ejecución de StrictMode
        let ignore = false;

        const cargar = async () => {
            const [inscripciones, materias] = await Promise.allSettled([
                // El backend devuelve solo las inscripciones del alumno logueado
                listarInscripcionesPaginado({ page: 0, size: MAX_REGISTROS, sort: 'fechaInscripcion,idInscripcion,asc' }),
                listarMateriasPaginado({ page: 0, size: MAX_REGISTROS }),
            ]);
            if (ignore) return;

            if (inscripciones.status === 'rejected') {
                console.error('Error al cargar las inscripciones:', inscripciones.reason);
                setError('No se pudieron cargar tus materias');
                toast.error('No se pudieron cargar tus materias.');
            } else {
                // Sin los datos de las materias, el listado se muestra igual
                if (materias.status === 'rejected') {
                    console.error('Error al cargar las materias:', materias.reason);
                    toast.warning('No se pudieron cargar los datos de las materias.');
                }
                setMisMaterias(armarMisMaterias(inscripciones.value.content, materias.value?.content ?? []));
            }
            setLoading(false);
        };
        cargar();

        return () => { ignore = true; };
    }, []);

    // ---------------------------------- TABLA -----------------------------------

    const texto = busqueda.trim().toLowerCase();
    const filtradas = misMaterias.filter((m) =>
        m.nombre.toLowerCase().includes(texto) && (!estado || m.estado === estado));

    const totalPages = Math.max(1, Math.ceil(filtradas.length / MATERIAS_POR_PAGINA));
    const visibles = filtradas.slice(page * MATERIAS_POR_PAGINA, (page + 1) * MATERIAS_POR_PAGINA);

    // Mismo orden que visibles, así el índice identifica a la materia
    const filas = visibles.map((m) => [
        m.nombre,
        m.profesor || SIN_DATO,
        formatearDia(m.dia),
        formatearFecha(m.fecha),
        m.estado || SIN_DATO,
    ]);

    const tableActions = [
        { type: 'view', title: 'Ver', onClick: (_, index) => setMateriaVer(visibles[index]) },
    ];

    const mensajeVacio = misMaterias.length === 0
        ? 'No estás inscripto en ninguna materia'
        : 'No se encontraron materias';

    return (
        <div className="container-page">
            <div className="flex flex-col mt-[24px]">
                <h1>Mis Materias</h1>
                <h2>Materias en las que estás inscripto</h2>
            </div>

            <div className="flex flex-row flex-wrap justify-between items-center gap-4">
                <div className="flex flex-row flex-wrap items-center gap-4">
                    <SearchInput
                        placeholder="Buscar por nombre"
                        value={busqueda}
                        onChange={(e) => { setBusqueda(e.target.value); setPage(0); }}
                    />
                    <select
                        value={estado}
                        onChange={(e) => { setEstado(e.target.value); setPage(0); }}
                        aria-label="Filtrar por estado de pago"
                        className="px-3 py-2.5 rounded-xl border border-(--borderColor-input) bg-white text-sm text-gray-700 focus:outline-none focus:border-(--btnColor-primary) shadow-sm"
                    >
                        <option value="">Todos los estados</option>
                        {ESTADOS_PAGO.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>
                <button className="btn-primary cursor-pointer" onClick={() => navigate('/alumno/inscribirme')}>
                    <i className="icon-[heroicons--plus] text-white mr-2"></i>
                    Inscribirme
                </button>
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
                    totalElements={filtradas.length}
                    onPrevPage={() => setPage((p) => Math.max(0, p - 1))}
                    onNextPage={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                />
            </div>

            {/* ------------------------------- VER ------------------------------- */}
            <Modal
                isOpen={Boolean(materiaVer)}
                onClose={() => setMateriaVer(null)}
                title="Datos de la materia"
                size="md"
                closeOnBackdrop
            >
                <dl className="p-6 bg-(--bgColor-main) flex flex-col gap-4 text-sm max-h-[70vh] overflow-y-auto">
                    {[
                        ['Materia', materiaVer?.nombre],
                        ['Profesor', materiaVer?.profesor],
                        ['Día', formatearDia(materiaVer?.dia)],
                        ['Descripción', materiaVer?.descripcion],
                        ['Fecha de inscripción', formatearFecha(materiaVer?.fecha)],
                    ].map(([label, valor]) => (
                        <div key={label}>
                            <dt className={LABEL_CLASS}>{label}</dt>
                            <dd className="text-slate-800 whitespace-pre-line break-words">{valor || SIN_DATO}</dd>
                        </div>
                    ))}
                    <div>
                        <dt className={LABEL_CLASS}>Estado de pago</dt>
                        <dd className="flex flex-wrap items-center gap-2">
                            <span className={BADGE_ESTADO[materiaVer?.estado]}>{materiaVer?.estado || SIN_DATO}</span>
                            {materiaVer?.estado === 'PENDIENTE' && (
                                <span className="text-xs text-gray-500">Se paga en secretaría</span>
                            )}
                        </dd>
                    </div>
                </dl>
            </Modal>
        </div>
    );
};
