import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SearchInput } from '../../components/SearchInput';

export const ResultadosExamenPage = () => {
    const navigate = useNavigate();
    const { materiaId, examenId } = useParams();
    const [busqueda, setBusqueda] = useState('');

    const alumnos = [
        { id: 1, nombre: 'Ana Sofía Martínez', email: 'ana.martinez@ejemplo.com', inscripcion: '12 Ago, 2023', nota: 1 },
        { id: 2, nombre: 'Carlos Mendoza Ruiz', email: 'carlos.mendoza@ejemplo.com', inscripcion: '14 Ago, 2023', nota: 4 },
        { id: 3, nombre: 'Lucía Ramírez', email: 'l.ramirez.99@ejemplo.com', inscripcion: '05 Sep, 2023', nota: 3 },
    ];

    const getNotaEstilo = (nota) => {
        if (nota >= 4) return 'bg-teal-100 text-teal-700';
        if (nota === 3) return 'bg-yellow-100 text-yellow-700';
        return 'bg-red-100 text-red-700';
    };

    const alumnosFiltrados = alumnos.filter(
        (a) =>
            a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
            a.email.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div className="container-page">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center text-sm font-bold text-(--btnColor-primary) hover:underline mb-2 cursor-pointer w-fit"
            >
                <i className="icon-[heroicons--arrow-left] mr-1"></i> Volver
            </button>

            <div className="mb-6">
                <h1 className="uppercase tracking-wide text-2xl">
                    EXÁMENES / <span className="text-gray-500 capitalize">Parcial 1</span>
                </h1>
            </div>

            <div className="card !p-0 overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                    <SearchInput
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar por nombre o email..."
                        variant="default"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-[#F8FAFC] text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                                <th className="py-4 px-6 text-left">ALUMNO</th>
                                <th className="py-4 px-6 text-left">EMAIL</th>
                                <th className="py-4 px-6 text-left">INSCRIPCIÓN</th>
                                <th className="py-4 px-6 text-center">NOTA</th>
                                <th className="py-4 px-6 text-center">ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {alumnosFiltrados.map((alumno) => (
                                <tr key={alumno.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="py-4 px-6 text-left">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                                                {alumno.nombre
                                                    .split(' ')
                                                    .map((n) => n[0])
                                                    .slice(0, 2)
                                                    .join('')}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{alumno.nombre}</p>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="py-4 px-6 text-left text-slate-600">
                                        {alumno.email}
                                    </td>

                                    <td className="py-4 px-6 text-left text-slate-600">
                                        {alumno.inscripcion}
                                    </td>

                                    <td className="py-4 px-6 text-center">
                                        <div className="flex justify-center">
                                            <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${getNotaEstilo(alumno.nota)}`}>
                                                {alumno.nota}
                                            </span>
                                        </div>
                                    </td>

                                    <td className="py-4 px-6 text-center">
                                        <button className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer p-2 rounded-full hover:bg-gray-200">
                                            <i className="icon-[heroicons--ellipsis-vertical] text-xl"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center p-5 border-t border-gray-100 bg-white">
                    <p className="text-xs text-gray-500 mb-4 sm:mb-0">
                        Mostrando 1 a 3 de 24 alumnos
                    </p>
                    <div className="flex items-center gap-1">
                        <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-slate-700 cursor-pointer disabled:opacity-50">
                            <i className="icon-[heroicons--chevron-left] text-sm"></i>
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center rounded-md bg-(--btnColor-primary) text-white font-bold text-xs cursor-pointer">
                            1
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-slate-600 font-bold text-xs cursor-pointer">
                            2
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-slate-600 font-bold text-xs cursor-pointer">
                            3
                        </button>
                        <span className="text-gray-400 px-1">...</span>
                        <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-slate-700 cursor-pointer">
                            <i className="icon-[heroicons--chevron-right] text-sm"></i>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};