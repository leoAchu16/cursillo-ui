import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Table } from '../../components/Table';
import { TarjetaResumen } from '../../components/TarjetaResumen';
import { listarInscripcionesPaginado } from '../../services/inscripcionesService';
import { listarMateriasPaginado, listarExamenesPaginado, listarMisNotas } from '../../services/notasService';

// Filas de cada tabla del tablero
const FILAS = 5;

// Se cargan todos los datos de una vez para cruzarlos (ids -> nombres)
const MAX_REGISTROS = 1000;

// Valor a mostrar cuando un dato viene vacío o no se pudo cargar
const SIN_DATO = '—';

// En pantallas angostas la tabla se desplaza dentro de su recuadro, no toda la página
const TABLA_CLASS = "overflow-x-auto rounded-md [&>table]:w-full";
const ENLACE_CLASS = "text-xs text-(--btnColor-primary) font-bold hover:underline cursor-pointer";

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

const formatearMonto = (monto) =>
    monto === undefined || monto === null ? SIN_DATO : `Gs. ${Number(monto).toLocaleString('es-PY')}`;

// Fecha local de hoy como "2026-11-25" (toISOString usaría la fecha UTC)
const fechaDeHoy = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
};

// Cada consulta es independiente: si una falla, el resto del tablero se muestra igual
const CONSULTAS = {
    // El backend devuelve solo las inscripciones del alumno logueado
    inscripciones: {
        nombre: 'tus inscripciones',
        pedir: () => listarInscripcionesPaginado({ page: 0, size: MAX_REGISTROS }),
    },
    materias: {
        nombre: 'las materias',
        pedir: () => listarMateriasPaginado({ page: 0, size: MAX_REGISTROS }),
    },
    examenes: {
        nombre: 'los exámenes',
        pedir: () => listarExamenesPaginado({ page: 0, size: MAX_REGISTROS }),
    },
    notas: {
        nombre: 'tus notas',
        // Solo la última que se cargó o corrigió
        pedir: () => listarMisNotas({ page: 0, size: 1, sort: 'actualizacion,desc' }),
    },
};

/**
 * Ítems inscriptos de un tipo, sin repetir: Map id -> estado de pago.
 * Si un ítem está en varias inscripciones, alcanza con que una esté pagada.
 */
const itemsInscriptos = (inscripciones, tipo, campoId) => {
    const items = new Map();
    inscripciones.forEach((i) => (i.detallesInscripcion || []).forEach((det) => {
        if (det.tipoInscripcion !== tipo || det[campoId] == null) return;
        if (items.get(det[campoId]) !== 'PAGADO') items.set(det[campoId], i.estadoPago);
    }));
    return items;
};

export const DashboardPageAlumno = () => {
    const navigate = useNavigate();

    const [datos, setDatos] = useState({}); // resultado de cada consulta; si falló, no está
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Evita actualizar el estado si se sale del tablero o por la doble ejecución de StrictMode
        let ignore = false;

        const cargar = async () => {
            const claves = Object.keys(CONSULTAS);
            const resultados = await Promise.allSettled(claves.map((clave) => CONSULTAS[clave].pedir()));
            if (ignore) return;

            const cargados = {};
            const fallidos = [];
            resultados.forEach((resultado, i) => {
                if (resultado.status === 'fulfilled') {
                    cargados[claves[i]] = resultado.value.content;
                } else {
                    console.error(`Error al cargar ${CONSULTAS[claves[i]].nombre}:`, resultado.reason);
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

    const { inscripciones, materias, examenes, notas } = datos;
    const materiasPorId = Object.fromEntries((materias ?? []).map((m) => [m.idMateria, m]));
    const examenesPorId = Object.fromEntries((examenes ?? []).map((e) => [e.idExamen, e]));
    const nombreMateria = (id) => materiasPorId[id]?.nombreMateria || `Materia #${id ?? SIN_DATO}`;

    // ---------------------------------- DATOS -----------------------------------

    const misMaterias = [...itemsInscriptos(inscripciones ?? [], 'MATERIA', 'idMateria')];

    // Exámenes en los que está inscripto, de hoy en adelante y por fecha
    const hoy = fechaDeHoy();
    const proximos = [...itemsInscriptos(inscripciones ?? [], 'EXAMEN', 'idExamen').keys()]
        .map((id) => examenesPorId[id])
        .filter((e) => e?.fecha >= hoy)
        .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));
    // Hacen falta las dos consultas para saber cuáles son
    const hayExamenes = Boolean(inscripciones && examenes);

    const pendientes = (inscripciones ?? []).filter((i) => i.estadoPago === 'PENDIENTE');
    const totalPendiente = pendientes.reduce((acc, i) => acc + (i.total ?? 0), 0);

    const ultimaNota = notas?.[0];
    const valorUltimaNota = () => {
        if (!notas) return SIN_DATO;
        if (!ultimaNota) return 'Sin notas';
        const calificacion = ultimaNota.estadoNota === 'AUSENTE' ? 'Ausente' : ultimaNota.calificacion ?? SIN_DATO;
        return `${calificacion} · ${examenesPorId[ultimaNota.idExamen]?.titulo || `Examen #${ultimaNota.idExamen}`}`;
    };

    const tarjetas = [
        {
            titulo: 'Mis materias',
            valor: inscripciones ? misMaterias.length : SIN_DATO,
            icono: 'icon-[heroicons--book-open]',
            enlace: 'Ver materias',
            ruta: '/alumno/mis-materias',
        },
        {
            titulo: 'Próximos exámenes',
            valor: hayExamenes ? proximos.length : SIN_DATO,
            icono: 'icon-[heroicons--calendar-days]',
            enlace: 'Ver exámenes',
            ruta: '/alumno/mis-examenes',
        },
        {
            titulo: 'Última nota',
            valor: valorUltimaNota(),
            icono: 'icon-[heroicons--academic-cap]',
            enlace: 'Ver notas',
            ruta: '/alumno/mis-examenes',
        },
        {
            titulo: 'Pendiente de pago',
            valor: inscripciones ? formatearMonto(totalPendiente) : SIN_DATO,
            icono: 'icon-[heroicons--banknotes]',
            enlace: 'Ver facturación',
            ruta: '/alumno/facturacion',
        },
    ];

    // ---------------------------------- TABLAS ----------------------------------

    const filasExamenes = proximos.slice(0, FILAS).map((e) => [
        e.titulo || SIN_DATO,
        nombreMateria(e.idMateria),
        formatearFecha(e.fecha),
        formatearHora(e.hora),
    ]);

    const filasMaterias = misMaterias.slice(0, FILAS).map(([id, estado]) => [
        nombreMateria(id),
        ETIQUETA_DIA[materiasPorId[id]?.dia] || SIN_DATO,
        estado || SIN_DATO,
    ]);

    return (
        <div className="container-page">
            <div className="flex flex-col mt-[24px]">
                <h1>Tablero</h1>
                <h2>Resumen de tus materias, exámenes y pagos</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {tarjetas.map((t) => <TarjetaResumen key={t.titulo} loading={loading} {...t} />)}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2 min-w-0">
                    <div className="flex items-center justify-between">
                        <h3>Próximos exámenes</h3>
                        <button type="button" className={ENLACE_CLASS} onClick={() => navigate('/alumno/mis-examenes')}>
                            Ver todos
                        </button>
                    </div>
                    <div className={TABLA_CLASS}>
                        <Table
                            headers={['Examen', 'Materia', 'Fecha', 'Hora']}
                            data={filasExamenes}
                            loading={loading}
                            emptyMessage={hayExamenes ? 'No tenés exámenes próximos' : 'No se pudieron cargar tus exámenes'}
                            showPagination={false}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-2 min-w-0">
                    <div className="flex items-center justify-between">
                        <h3>Mis materias</h3>
                        <button type="button" className={ENLACE_CLASS} onClick={() => navigate('/alumno/mis-materias')}>
                            Ver todas
                        </button>
                    </div>
                    <div className={TABLA_CLASS}>
                        <Table
                            headers={['Materia', 'Día', 'Estado de pago']}
                            data={filasMaterias}
                            loading={loading}
                            emptyMessage={inscripciones ? 'No estás inscripto en ninguna materia' : 'No se pudieron cargar tus materias'}
                            showPagination={false}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
