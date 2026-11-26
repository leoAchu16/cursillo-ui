import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { SearchInput } from '../../components/SearchInput';
import { Table } from '../../components/Table';
import { TarjetaResumen } from '../../components/TarjetaResumen';
import { listarAlumnosDeMateria } from '../../services/inscripcionesService';
import { obtenerMateria, obtenerExamen, listarNotasDeExamen } from '../../services/notasService';

const FILAS = 8;

// Valor a mostrar cuando un campo viene vacío
const SIN_DATO = '—';

// Resultado de quien todavía no tiene nota cargada (la tabla lo muestra como badge)
const SIN_NOTA = 'SIN NOTA';

const FILTROS = [
    { valor: '', texto: 'Todos los resultados' },
    { valor: 'APROBADO', texto: 'Aprobados' },
    { valor: 'REPROBADO', texto: 'Reprobados' },
    { valor: 'AUSENTE', texto: 'Ausentes' },
    { valor: SIN_NOTA, texto: 'Sin nota' },
];

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

// 3.4 -> "3,4"; 90 -> "90"
const numero = (n) => n.toLocaleString('es-AR', { maximumFractionDigits: 1 });

const resultadoDe = (nota) => nota?.estadoNota || SIN_NOTA;

export const ResultadosExamenPage = () => {
    const navigate = useNavigate();
    const { materiaId, examenId } = useParams();

    const [materia, setMateria] = useState(null);
    const [examen, setExamen] = useState(null);
    const [alumnos, setAlumnos] = useState([]);
    const [notas, setNotas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [noEncontrado, setNoEncontrado] = useState(false);

    const [busqueda, setBusqueda] = useState('');
    const [filtro, setFiltro] = useState('');
    const [pagina, setPagina] = useState(0);

    // Si el examen o la materia no son del profesor, el backend responde 404
    useEffect(() => {
        let ignore = false;

        const cargar = async () => {
            const [resExamen, resAlumnos, resNotas, resMateria] = await Promise.allSettled([
                obtenerExamen(examenId),
                listarAlumnosDeMateria(materiaId),
                listarNotasDeExamen(examenId),
                obtenerMateria(materiaId),
            ]);
            if (ignore) return;

            const es404 = (r) => r.status === 'rejected' && r.reason?.response?.status === 404;
            const examenCargado = resExamen.status === 'fulfilled' ? resExamen.value : null;
            if (es404(resExamen) || es404(resAlumnos) || es404(resNotas)
                || (examenCargado && String(examenCargado.idMateria) !== String(materiaId))) {
                setNoEncontrado(true);
            } else if ([resExamen, resAlumnos, resNotas].some((r) => r.status === 'rejected')) {
                console.error('Error al cargar los resultados:', [resExamen, resAlumnos, resNotas].find((r) => r.status === 'rejected').reason);
                setError('No se pudieron cargar los resultados del examen');
                toast.error('No se pudieron cargar los resultados del examen.');
                if (examenCargado) setExamen(examenCargado);
            } else {
                setExamen(examenCargado);
                setAlumnos(resAlumnos.value);
                setNotas(resNotas.value);
            }
            if (resMateria.status === 'fulfilled') setMateria(resMateria.value);
            setLoading(false);
        };
        cargar();

        return () => { ignore = true; };
    }, [materiaId, examenId]);

    // ---------------------------------- FILAS -----------------------------------

    const total = examen?.totalPuntos || 0;
    const notaDe = Object.fromEntries(notas.map((n) => [n.idAlumno, n]));
    const inscriptos = new Set(alumnos.map((a) => a.idAlumno));

    // Inscriptos (con o sin nota), más quienes tienen nota pero ya no figuran inscriptos
    const filas = [
        ...alumnos.map((a) => ({ ...a, inscripto: true })),
        ...notas.filter((n) => !inscriptos.has(n.idAlumno))
            .map((n) => ({ idAlumno: n.idAlumno, nombre: `Alumno #${n.idAlumno}`, inscripto: false })),
    ]
        .map((a) => ({ ...a, nota: notaDe[a.idAlumno], resultado: resultadoDe(notaDe[a.idAlumno]) }))
        .sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es'));

    const cuantos = (resultado) => filas.filter((f) => f.resultado === resultado).length;
    const aprobados = cuantos('APROBADO');
    const reprobados = cuantos('REPROBADO');
    const rindieron = filas.filter((f) => f.nota?.calificacion != null);
    const promedio = rindieron.length > 0
        ? rindieron.reduce((suma, f) => suma + f.nota.calificacion, 0) / rindieron.length
        : null;

    const texto = busqueda.trim().toLowerCase();
    const filtradas = filas.filter((f) =>
        (!filtro || f.resultado === filtro)
        && `${f.nombre ?? ''} ${f.email ?? ''}`.toLowerCase().includes(texto));
    const totalPaginas = Math.max(1, Math.ceil(filtradas.length / FILAS));
    const paginaActual = Math.min(pagina, totalPaginas - 1);
    const visibles = filtradas.slice(paginaActual * FILAS, (paginaActual + 1) * FILAS);

    const datosTabla = visibles.map((f) => {
        const puntos = f.nota?.puntosCorrectos;
        return [
            <span className="flex flex-col items-start text-left">
                <span className="font-semibold text-slate-800">{f.nombre || `Alumno #${f.idAlumno}`}</span>
                {!f.inscripto && <span className="text-xs text-gray-500">Ya no está inscripto</span>}
            </span>,
            f.email || SIN_DATO,
            puntos != null ? `${puntos} / ${total}` : SIN_DATO,
            puntos != null && total > 0 ? `${numero((puntos / total) * 100)} %` : SIN_DATO,
            f.nota?.calificacion != null ? <b className="text-slate-800">{f.nota.calificacion}</b> : SIN_DATO,
            f.resultado,
        ];
    });

    // -------------------------------- PANTALLA ---------------------------------

    const nombreMateria = materia?.nombreMateria || `Materia #${materiaId}`;
    const rutaCalificar = `/materias/examenes/${materiaId}/calificar?idExamen=${examenId}`;

    const volver = (
        <button
            type="button"
            onClick={() => navigate(`/materias/${materiaId}`)}
            className="flex items-center text-sm font-bold text-(--btnColor-primary) hover:underline w-fit mt-[24px] cursor-pointer"
        >
            <i className="icon-[heroicons--arrow-left] mr-1"></i> Volver a {nombreMateria}
        </button>
    );

    const futuro = examen && momentoDe(examen) > ahoraLocal();

    if (noEncontrado || (!loading && futuro)) {
        return (
            <div className="container-page">
                {volver}
                <div className="card items-center text-center py-10 gap-2">
                    <i className="icon-[heroicons--chart-bar] text-4xl text-gray-300"></i>
                    <h3>{noEncontrado ? 'Examen no encontrado' : 'El examen todavía no se tomó'}</h3>
                    <p className="text-sm text-gray-500">
                        {noEncontrado
                            ? 'No existe, no es de esta materia o no es una de las materias que dictás.'
                            : `Los resultados van a estar después del ${formatearFecha(examen.fecha)} a las ${formatearHora(examen.hora)}.`}
                    </p>
                </div>
            </div>
        );
    }

    const sinDatos = loading || Boolean(error);
    const tarjetas = [
        {
            titulo: 'Promedio', icono: 'icon-[heroicons--chart-bar]',
            valor: sinDatos || promedio === null ? SIN_DATO : numero(promedio),
            nota: rindieron.length === 1 ? 'De 1 alumno que rindió' : `De ${rindieron.length} alumnos que rindieron`,
        },
        {
            titulo: 'Aprobados', icono: 'icon-[heroicons--check-circle]',
            valor: sinDatos ? SIN_DATO : aprobados,
            nota: rindieron.length > 0 ? `${numero((aprobados / rindieron.length) * 100)} % de los que rindieron` : 'Nadie rindió todavía',
        },
        { titulo: 'Reprobados', icono: 'icon-[heroicons--x-circle]', valor: sinDatos ? SIN_DATO : reprobados, nota: 'Calificación 1' },
        { titulo: 'Ausentes', icono: 'icon-[heroicons--user-minus]', valor: sinDatos ? SIN_DATO : cuantos('AUSENTE'), nota: 'No se presentaron' },
        { titulo: 'Sin nota', icono: 'icon-[heroicons--clock]', valor: sinDatos ? SIN_DATO : cuantos(SIN_NOTA), nota: 'Falta calificar' },
    ];

    return (
        <div className="container-page">
            {volver}
            <div className="flex flex-row flex-wrap justify-between items-end gap-4">
                <div className="flex flex-col min-w-0">
                    <h1 className="truncate">{examen ? `Resultados: ${examen.titulo}` : 'Resultados del examen'}</h1>
                    <h2>
                        {examen
                            ? `${nombreMateria} · ${formatearFecha(examen.fecha)} ${formatearHora(examen.hora)} · ${total} puntos`
                            : nombreMateria}
                    </h2>
                </div>
                <button
                    type="button"
                    onClick={() => navigate(rutaCalificar)}
                    disabled={loading || !examen}
                    className="btn-primary cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <i className="icon-[heroicons--academic-cap] text-white"></i>
                    Editar calificaciones
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                {tarjetas.map((t) => <TarjetaResumen key={t.titulo} loading={loading} {...t} />)}
            </div>

            <div className="flex flex-row flex-wrap items-center gap-4">
                <SearchInput
                    placeholder="Buscar alumno"
                    value={busqueda}
                    onChange={(e) => { setBusqueda(e.target.value); setPagina(0); }}
                />
                <select
                    value={filtro}
                    onChange={(e) => { setFiltro(e.target.value); setPagina(0); }}
                    aria-label="Filtrar por resultado"
                    className="px-3 py-2.5 rounded-xl border border-(--borderColor-input) bg-white text-sm text-gray-700 focus:outline-none focus:border-(--btnColor-primary) shadow-sm"
                >
                    {FILTROS.map((f) => <option key={f.valor} value={f.valor}>{f.texto}</option>)}
                </select>
            </div>

            {/* En pantallas angostas la tabla se desplaza dentro de su recuadro, no toda la página */}
            <div className="overflow-x-auto rounded-md [&>table]:w-full">
                <Table
                    headers={['Alumno', 'Email', 'Puntos', 'Porcentaje', 'Calificación', 'Resultado']}
                    data={datosTabla}
                    loading={loading}
                    emptyMessage={error || (filas.length === 0 ? 'No hay alumnos inscriptos en la materia' : 'No se encontraron alumnos')}
                    currentPage={paginaActual + 1}
                    totalPages={totalPaginas}
                    totalElements={filtradas.length}
                    onPrevPage={() => setPagina(Math.max(0, paginaActual - 1))}
                    onNextPage={() => setPagina(Math.min(totalPaginas - 1, paginaActual + 1))}
                />
            </div>
        </div>
    );
};
