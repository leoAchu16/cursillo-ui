import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { SearchInput } from '../../components/SearchInput';
import { Spinner } from '../../components/Spinner';
import { getLoggedUser } from '../../services/api';
import { listarInscripcionesPaginado } from '../../services/inscripcionesService';
import { listarMateriasDeProfesor, listarExamenesPaginado } from '../../services/notasService';

// Se cargan todos los datos de una vez para cruzarlos; la búsqueda se resuelve acá
const MAX_REGISTROS = 1000;

// Valor a mostrar cuando un campo viene vacío o no se pudo cargar
const SIN_DATO = '—';

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

// Fecha y hora local de ahora como "2026-11-25 18:30", para comparar con fecha + hora del examen
const ahoraLocal = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16).replace('T', ' ');
};
const momentoDe = (examen) => `${examen.fecha ?? ''} ${formatearHora(examen.hora)}`;

// Cada consulta es independiente: si falla una que no es la de materias, la tabla se muestra igual
const CONSULTAS = {
    materias: {
        nombre: 'tus materias',
        pedir: () => listarMateriasDeProfesor({ idProfesor: getLoggedUser()?.id, size: MAX_REGISTROS }),
    },
    examenes: {
        nombre: 'los exámenes',
        pedir: () => listarExamenesPaginado({ page: 0, size: MAX_REGISTROS }),
    },
    inscripciones: {
        nombre: 'las inscripciones',
        pedir: () => listarInscripcionesPaginado({ page: 0, size: MAX_REGISTROS }),
    },
};

/**
 * Sus materias por nombre, con la cantidad de alumnos inscriptos y el próximo examen de cada una.
 * Si faltan exámenes o inscripciones, esos datos quedan en null.
 */
const armarMaterias = ({ materias, examenes, inscripciones }) => {
    const alumnosPorMateria = new Map();
    (inscripciones ?? []).forEach((i) => (i.detallesInscripcion || []).forEach((det) => {
        if (det.tipoInscripcion !== 'MATERIA' || det.idMateria == null) return;
        if (!alumnosPorMateria.has(det.idMateria)) alumnosPorMateria.set(det.idMateria, new Set());
        alumnosPorMateria.get(det.idMateria).add(i.idAlumno);
    }));

    const ahora = ahoraLocal();
    const proximoPorMateria = new Map();
    (examenes ?? [])
        .filter((e) => momentoDe(e) > ahora)
        .sort((a, b) => momentoDe(a).localeCompare(momentoDe(b)))
        .forEach((e) => { if (!proximoPorMateria.has(e.idMateria)) proximoPorMateria.set(e.idMateria, e); });

    return materias
        .map((m) => ({
            ...m,
            alumnos: inscripciones ? (alumnosPorMateria.get(m.idMateria)?.size ?? 0) : null,
            // undefined: no se pudo saber; null: no tiene
            proximo: examenes ? (proximoPorMateria.get(m.idMateria) ?? null) : undefined,
        }))
        .sort((a, b) => (a.nombreMateria ?? '').localeCompare(b.nombreMateria ?? '', 'es'));
};

const textoProximo = (proximo) => {
    if (proximo === undefined) return SIN_DATO;
    if (proximo === null) return 'Sin exámenes próximos';
    return `${proximo.titulo || 'Examen'} · ${formatearFecha(proximo.fecha)}`;
};

export const MisMateriasPage = () => {
    const navigate = useNavigate();

    const [materias, setMaterias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busqueda, setBusqueda] = useState('');

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

            if (!cargados.materias) {
                setError('No se pudieron cargar tus materias');
                toast.error('No se pudieron cargar tus materias.');
            } else {
                setMaterias(armarMaterias(cargados));
                // Un solo aviso, aunque fallen varias
                if (fallidos.length > 0) toast.warning(`No se pudieron cargar ${fallidos.join(', ')}.`);
            }
            setLoading(false);
        };
        cargar();

        return () => { ignore = true; };
    }, []);

    // --------------------------------- TARJETAS ---------------------------------

    const texto = busqueda.trim().toLowerCase();
    const filtradas = materias.filter((m) => (m.nombreMateria ?? '').toLowerCase().includes(texto));

    const mensajeVacio = error || (materias.length === 0 ? 'No tenés materias asignadas' : 'No se encontraron materias');

    return (
        <div className="container-page">
            <div className="flex flex-col mt-[24px]">
                <h1>Mis Materias</h1>
                <h2>Materias que dictás. Elegí una para ver sus alumnos y exámenes.</h2>
            </div>

            <div className="flex flex-row flex-wrap items-center gap-4">
                <SearchInput
                    placeholder="Buscar por nombre"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="card items-center justify-center py-10 text-sm text-gray-500 flex-row gap-2">
                    <Spinner className="h-4 w-4 text-(--btnColor-primary)" /> Cargando...
                </div>
            ) : filtradas.length === 0 ? (
                <div className="card items-center text-center py-10 gap-2">
                    <i className="icon-[heroicons--book-open] text-4xl text-gray-300"></i>
                    <p className="text-sm text-gray-500 font-medium">{mensajeVacio}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtradas.map((m) => (
                        // Toda la tarjeta es un botón: se puede abrir con el mouse o con el teclado
                        <button
                            key={m.idMateria}
                            type="button"
                            onClick={() => navigate(`/materias/${m.idMateria}`)}
                            className="card h-full text-left gap-3 cursor-pointer hover:border-(--btnColor-primary) hover:shadow-lg transition-all group"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-11 h-11 rounded-full bg-teal-50 group-hover:bg-(--btnColor-primary) text-(--btnColor-primary) group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                                    <i className="icon-[heroicons--academic-cap] text-2xl"></i>
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-bold text-slate-800 group-hover:text-(--btnColor-primary) transition-colors truncate" title={m.nombreMateria}>
                                        {m.nombreMateria || SIN_DATO}
                                    </span>
                                    <span className="text-xs text-gray-500">{formatearDia(m.dia)}</span>
                                </div>
                            </div>

                            <dl className="flex flex-col gap-1.5 text-xs text-gray-600">
                                <div className="flex items-center gap-2">
                                    <i className="icon-[heroicons--users] text-base text-gray-400 shrink-0"></i>
                                    <dt className="sr-only">Alumnos</dt>
                                    <dd>
                                        {m.alumnos == null ? SIN_DATO : <><b className="text-slate-700">{m.alumnos}</b> {m.alumnos === 1 ? 'alumno inscripto' : 'alumnos inscriptos'}</>}
                                    </dd>
                                </div>
                                <div className="flex items-center gap-2 min-w-0">
                                    <i className="icon-[heroicons--calendar-days] text-base text-gray-400 shrink-0"></i>
                                    <dt className="sr-only">Próximo examen</dt>
                                    <dd className="truncate" title={textoProximo(m.proximo)}>{textoProximo(m.proximo)}</dd>
                                </div>
                            </dl>

                            <span className="text-xs font-bold text-(--btnColor-primary) mt-auto inline-flex items-center group-hover:translate-x-1 transition-transform">
                                Ver alumnos y exámenes <i className="icon-[heroicons--arrow-right] ml-1"></i>
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
