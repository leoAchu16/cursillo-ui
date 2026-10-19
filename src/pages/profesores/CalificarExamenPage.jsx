import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SearchInput } from '../../components/SearchInput';
import { Combobox } from '../../components/Combobox';

export const CalificarExamenPage = () => {
    const navigate = useNavigate();
    const { materiaId } = useParams();

    // Estados
    const [busqueda, setBusqueda] = useState('');
    const [totalPuntos, setTotalPuntos] = useState(20); // Ahora es un estado modificable
    const [materiaSeleccionada, setMateriaSeleccionada] = useState('algebra-lineal');

    // Opciones para el Combobox de Materias
    const opcionesMaterias = [
        { label: 'Álgebra Lineal', value: 'algebra-lineal' },
        { label: 'Matemáticas', value: 'matematicas' },
        { label: 'Física', value: 'fisica' },
        { label: 'Historia', value: 'historia' },
        { label: 'Literatura', value: 'literatura' }
    ];

    const [alumnos, setAlumnos] = useState([
        { id: 1, nombre: 'Ana Sofía Martínez', matId: 'MAT-2023-001', puntos: 18, ausente: false },
        { id: 2, nombre: 'Carlos Mendoza Ruiz', matId: 'MAT-2023-042', puntos: 12, ausente: false },
        { id: 3, nombre: 'Lucía Ramírez', matId: 'MAT-2023-018', puntos: 0, ausente: true },
    ]);

    // Cálculo automático de porcentaje y nota (Escala 1 a 5) en base al estado "totalPuntos"
    const calcularNota = (puntos, ausente) => {
        if (ausente) {
            return {
                porcentaje: 0,
                calificacion: 'Sin Calificar',
                estadoBadge: { label: 'Ausente', className: 'badge-danger' },
            };
        }

        const pts = parseFloat(puntos) || 0;
        const total = totalPuntos > 0 ? totalPuntos : 1; // Prevenir división por cero
        const porcentaje = Math.round((pts / total) * 100);

        let calificacion = '1 (Insuficiente)';
        if (porcentaje >= 90) calificacion = '5 (Excelente)';
        else if (porcentaje >= 80) calificacion = '4 (Distinguido)';
        else if (porcentaje >= 70) calificacion = '3 (Bueno)';
        else if (porcentaje >= 60) calificacion = '2 (Aprobado)';

        return {
            porcentaje,
            calificacion,
            estadoBadge: { label: 'Rendido', className: 'badge-success' },
        };
    };

    const handlePuntosChange = (id, valor) => {
        setAlumnos((prev) =>
            prev.map((a) => {
                if (a.id === id) {
                    // Limita el puntaje máximo ingresado al total de puntos definidos
                    const num = Math.max(0, Number(valor));
                    const limiteAjustado = Math.min(totalPuntos, num);
                    return { ...a, puntos: isNaN(limiteAjustado) ? 0 : limiteAjustado, ausente: false };
                }
                return a;
            })
        );
    };

    const handleGuardar = () => {
        alert('Calificaciones guardadas correctamente');
        navigate(-1);
    };

    const alumnosFiltrados = alumnos.filter(
        (a) =>
            a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
            a.matId.toLowerCase().includes(busqueda.toLowerCase())
    );

    // Obtener nombre de la materia seleccionada para el título
    const materiaActiva = opcionesMaterias.find(m => m.value === materiaSeleccionada)?.label || 'Materia';

    return (
        <div className="container-page">
            {/* Botón Volver */}
            <button
                onClick={() => navigate(-1)}
                className="flex items-center text-sm font-bold text-(--btnColor-primary) hover:underline mb-1 cursor-pointer w-fit"
            >
                <i className="icon-[heroicons--arrow-left] mr-1"></i> Volver
            </button>

            {/* Cabecera */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                <div>
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Exámenes</span>
                    <h1>
                        Exámenes / <span className="text-gray-500">{materiaActiva}</span>
                    </h1>
                </div>
                <button
                    type="button"
                    className="flex items-center border border-(--borderColor-input) bg-white text-slate-700 font-bold px-4 py-2 rounded-xl shadow-sm hover:bg-gray-50 text-sm cursor-pointer"
                >
                    <i className="icon-[heroicons--document-arrow-down] text-lg mr-2"></i>
                    Descargar Planilla
                </button>
            </div>

            {/* Tarjeta Informativa del Examen */}
            <div className="card !p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">

                    {/* Materia - Ahora con Combobox (Buscador incluido) */}
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-teal-50 text-(--btnColor-primary) rounded-xl shrink-0">
                            <i className="icon-[heroicons--book-open] text-2xl"></i>
                        </div>
                        <div className="w-full">
                            <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase mb-1">MATERIA</p>
                            <Combobox
                                options={opcionesMaterias}
                                value={materiaSeleccionada}
                                onChange={setMateriaSeleccionada}
                                placeholder="Buscar materia..."
                                className="w-full min-w-[150px]"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 sm:pl-6 pt-4 sm:pt-0">
                        <div className="p-3 bg-teal-50 text-(--btnColor-primary) rounded-xl shrink-0">
                            <i className="icon-[heroicons--calendar] text-2xl"></i>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">FECHA DEL EXAMEN</p>
                            <p className="font-bold text-slate-800 text-sm">15 Oct, 2026</p>
                            <p className="text-xs text-gray-500">Horario: 08:00 - 10:00 AM</p>
                        </div>
                    </div>

                    {/* Total Puntos - Ahora es un Input modificable */}
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

                    <div className="flex items-center gap-3 sm:pl-6 pt-4 sm:pt-0">
                        <div className="p-3 bg-teal-50 text-(--btnColor-primary) rounded-xl shrink-0">
                            <i className="icon-[heroicons--clipboard-document-check] text-2xl"></i>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">ESTADO DEL EXAMEN</p>
                            <span className="badge badge-warning !text-xs mt-1 !w-fit px-2 py-0.5">● En Calificación</span>
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

                {/* Tabla */}
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

                                        {/* Total (Dinámico según el input superior) */}
                                        <td className="py-3 px-4 text-center text-gray-400 font-medium">
                                            / {totalPuntos}
                                        </td>

                                        {/* Porcentaje */}
                                        <td className="py-3 px-4 text-center font-bold">
                                            <span
                                                className={`px-2 py-1 rounded-md text-xs font-bold ${alumno.ausente
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

                                        {/* Estado */}
                                        <td className="py-3 px-4 text-center">
                                            <span className={`badge ${estadoBadge.className} !text-xs py-1`}>
                                                ● {estadoBadge.label}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

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
                        onClick={handleGuardar}
                        className="btn-primary !px-6"
                    >
                        <i className="icon-[heroicons--check] mr-2 text-lg"></i>
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};