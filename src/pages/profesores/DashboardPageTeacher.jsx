import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Table } from '../../components/Table';
import { TarjetaResumen } from '../../components/TarjetaResumen';
import { getLoggedUser } from '../../services/api';
import { listarInscripcionesPaginado } from '../../services/inscripcionesService';
import { listarMateriasDeProfesor, listarExamenesPaginado, listarNotasPaginado } from '../../services/notasService';

// Filas de cada tabla del panel
const FILAS = 5;

// Se cargan todos los datos de una vez para cruzarlos (ids -> nombres)
const MAX_REGISTROS = 1000;

// Valor a mostrar cuando un dato viene vacío o no se pudo cargar
const SIN_DATO = '—';

// En pantallas angostas la tabla se desplaza dentro de su recuadro, no toda la página
const TABLA_CLASS = "overflow-x-auto rounded-md [&>table]:w-full";
const ENLACE_CLASS = "text-xs text-(--btnColor-primary) font-bold hover:underline cursor-pointer";

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

// Cada consulta es independiente: si una falla, el resto del panel se muestra igual
const CONSULTAS = {
    materias: {
        nombre: 'tus materias',
        pedir: () => listarMateriasDeProfesor({ idProfesor: getLoggedUser()?.id, size: MAX_REGISTROS }),
    },
    examenes: {
        nombre: 'los exámenes',
        pedir: () => listarExamenesPaginado({ page: 0, size: MAX_REGISTROS }),
    },
    notas: {
        nombre: 'las notas',
        pedir: () => listarNotasPaginado({ page: 0, size: MAX_REGISTROS }),
    },
    inscripciones: {
        nombre: 'las inscripciones',
        pedir: () => listarInscripcionesPaginado({ page: 0, size: MAX_REGISTROS }),
    },
};

export const DashboardPageTeacher = () => {
    const navigate = useNavigate();

    const [datos, setDatos] = useState({}); // resultado de cada consulta ({ content, totalElements }); si falló, no está
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Evita actualizar el estado si se sale del panel o por la doble ejecución de StrictMode
        let ignore = false;

        const cargar = async () => {
            const claves = Object.keys(CONSULTAS);
            const resultados = await Promise.allSettled(claves.map((clave) => CONSULTAS[clave].pedir()));
            if (ignore) return;

            const cargados = {};
            const fallidos = [];
            resultados.forEach((resultado, i) => {
                if (resultado.status === 'fulfilled') {
                    cargados[claves[i]] = resultado.value;
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

    // ---------------------------------- DATOS -----------------------------------

    const materias = datos.materias?.content;
    const examenes = datos.examenes?.content;
    const notas = datos.notas?.content;
    const inscripciones = datos.inscripciones?.content;

    const misMaterias = new Set((materias ?? []).map((m) => m.idMateria));
    const nombreMateria = (id) => (materias ?? []).find((m) => m.idMateria === id)?.nombreMateria || `Materia #${id}`;

    // Exámenes de sus materias, separados por si ya pasaron (fecha y hora)
    const ahora = ahoraLocal();
    const examenesPropios = (examenes ?? []).filter((e) => misMaterias.has(e.idMateria));
    const proximos = examenesPropios
        .filter((e) => momentoDe(e) > ahora)
        .sort((a, b) => momentoDe(a).localeCompare(momentoDe(b)));

    // Ya rendidos y sin ninguna nota cargada (el backend no marca el examen como CALIFICADO)
    const conNotas = new Set((notas ?? []).map((n) => n.idExamen));
    const porCalificar = examenesPropios
        .filter((e) => momentoDe(e) <= ahora && !conNotas.has(e.idExamen))
        .sort((a, b) => momentoDe(a).localeCompare(momentoDe(b)));

    // Alumnos distintos inscriptos a alguna de sus materias
    const alumnos = new Set();
    (inscripciones ?? []).forEach((i) => (i.detallesInscripcion || []).forEach((det) => {
        if (det.tipoInscripcion === 'MATERIA' && misMaterias.has(det.idMateria)) alumnos.add(i.idAlumno);
    }));

    // Cada número necesita las consultas de las que depende
    const hayExamenes = Boolean(materias && examenes);

    const tarjetas = [
        {
            titulo: 'Mis materias',
            valor: materias ? datos.materias.totalElements : SIN_DATO,
            icono: 'icon-[heroicons--book-open]',
            enlace: 'Ver materias',
            ruta: '/materias/mis-materias',
        },
        {
            titulo: 'Alumnos',
            valor: materias && inscripciones ? alumnos.size : SIN_DATO,
            icono: 'icon-[heroicons--users]',
            nota: 'Inscriptos en tus materias',
        },
        {
            titulo: 'Próximos exámenes',
            valor: hayExamenes ? proximos.length : SIN_DATO,
            icono: 'icon-[heroicons--calendar-days]',
            enlace: 'Ver materias',
            ruta: '/materias/mis-materias',
        },
        {
            titulo: 'Por calificar',
            valor: hayExamenes && notas ? porCalificar.length : SIN_DATO,
            icono: 'icon-[heroicons--pencil-square]',
            enlace: 'Ver materias',
            ruta: '/materias/mis-materias',
        },
    ];

    // ---------------------------------- TABLAS ----------------------------------

    // Mismo orden que las filas, así el índice identifica al examen
    const visiblesProximos = proximos.slice(0, FILAS);
    const filasProximos = visiblesProximos.map((e) => [
        e.titulo || SIN_DATO,
        nombreMateria(e.idMateria),
        formatearFecha(e.fecha),
        formatearHora(e.hora),
    ]);

    // Mismo orden que las filas, así el índice identifica al examen.
    // Sin las notas no se sabe cuáles faltan calificar: no se lista ninguno
    const visiblesPorCalificar = notas ? porCalificar.slice(0, FILAS) : [];
    const filasPorCalificar = visiblesPorCalificar.map((e) => [
        e.titulo || SIN_DATO,
        nombreMateria(e.idMateria),
        formatearFecha(e.fecha),
    ]);

    const verMateria = (examen) => navigate(`/materias/${examen.idMateria}`);
    const accionesProximos = [{ type: 'view', title: 'Ver materia', onClick: (_, index) => verMateria(visiblesProximos[index]) }];

    const accionesPorCalificar = [{
        type: 'grade',
        title: 'Calificar',
        onClick: (_, index) => {
            const { idMateria, idExamen } = visiblesPorCalificar[index];
            navigate(`/materias/examenes/${idMateria}/calificar?idExamen=${idExamen}`);
        },
    }, { type: 'view', title: 'Ver materia', onClick: (_, index) => verMateria(visiblesPorCalificar[index]) }];

    return (
        <div className="container-page">
            <div className="flex flex-col mt-[24px]">
                <h1>Panel del Profesor</h1>
                <h2>Resumen de tus materias, exámenes y calificaciones</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {tarjetas.map((t) => <TarjetaResumen key={t.titulo} loading={loading} {...t} nota={materias ? t.nota : ''} />)}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2 min-w-0">
                    <div className="flex items-center justify-between">
                        <h3>Próximos exámenes</h3>
                        <button type="button" className={ENLACE_CLASS} onClick={() => navigate('/materias/mis-materias')}>
                            Ver materias
                        </button>
                    </div>
                    <div className={TABLA_CLASS}>
                        <Table
                            headers={['Examen', 'Materia', 'Fecha', 'Hora', 'Acciones']}
                            data={filasProximos}
                            actions={accionesProximos}
                            loading={loading}
                            emptyMessage={hayExamenes ? 'No tenés exámenes próximos' : 'No se pudieron cargar los exámenes'}
                            showPagination={false}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-2 min-w-0">
                    <div className="flex items-center justify-between">
                        <h3>Por calificar</h3>
                        <button type="button" className={ENLACE_CLASS} onClick={() => navigate('/materias/mis-materias')}>
                            Ver materias
                        </button>
                    </div>
                    <div className={TABLA_CLASS}>
                        <Table
                            headers={['Examen', 'Materia', 'Fecha', 'Acciones']}
                            data={filasPorCalificar}
                            actions={accionesPorCalificar}
                            loading={loading}
                            emptyMessage={hayExamenes && notas ? 'No tenés exámenes por calificar' : 'No se pudieron cargar los exámenes o las notas'}
                            showPagination={false}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
