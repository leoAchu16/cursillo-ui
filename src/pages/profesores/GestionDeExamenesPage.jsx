import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Modal } from "../../components/Modal";

export const GestionExamenesPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();
    const { materiaId } = useParams(); // Extrae el ID de la materia de la URL

    return (
        <div className="container-page">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center text-sm font-bold text-(--btnColor-primary) hover:text-(--btnColor-primary-hover) w-fit mb-4 cursor-pointer"
            >
                <i className="icon-[heroicons--arrow-left] mr-1"></i> Volver
            </button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1>Exámenes / <span className="text-gray-500">Matemáticas</span></h1>

                <div className="flex gap-3">
                    <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
                        <i className="icon-[heroicons--plus-circle] text-lg mr-2"></i>
                        Crear Nuevo Examen
                    </button>
                    <button
                        className="flex items-center bg-[#2563EB] text-white rounded-xl px-4 py-2 shadow-md hover:bg-blue-700 transition-colors cursor-pointer"
                        onClick={() => navigate(`/materias/examenes/${materiaId}/calificar`)}
                    >
                        <i className="icon-[heroicons--plus] text-lg mr-2"></i>
                        Calificar
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Tarjeta de Examen - Calificado */}
                <div className="card !p-6">
                    <span className="badge badge-success !w-fit !text-[10px] mb-2 px-2 py-0.5">CALIFICADO</span>
                    <h3 className="text-lg text-slate-800">Parcial 1: Álgebra</h3>
                    <div className="flex flex-col gap-2 mt-4 text-xs text-gray-500">
                        <span className="flex items-center"><i className="icon-[heroicons--calendar] mr-2 text-lg"></i> 15 Oct 2023, 10:00 AM</span>
                        <span className="flex items-center"><i className="icon-[heroicons--users] mr-2 text-lg"></i> 45/45 Estudiantes Evaluados</span>
                    </div>
                    <button
                        onClick={() => navigate(`/materias/examenes/${materiaId}/resultados/1`)}
                        className="text-(--btnColor-primary) text-xs font-bold mt-4 flex items-center hover:underline w-fit cursor-pointer"
                    >
                        Ver Resultados <i className="icon-[heroicons--arrow-right] ml-1"></i>
                    </button>
                </div>

                {/* Tarjeta de Examen - En Progreso */}
                <div className="card !p-6 border-t-4 border-t-yellow-400">
                    <span className="badge badge-warning !w-fit !text-[10px] mb-2 px-2 py-0.5">EN PROGRESO</span>
                    <h3 className="text-lg text-slate-800">Quiz: Funciones Lineales</h3>
                    <div className="flex flex-col gap-2 mt-4 text-xs text-gray-500">
                        <span className="flex items-center"><i className="icon-[heroicons--calendar] mr-2 text-lg"></i> Hoy, 09:00 AM</span>
                        <span className="flex items-center"><i className="icon-[heroicons--users] mr-2 text-lg"></i> 20/45 Estudiantes Entregados</span>
                    </div>
                    <button
                        onClick={() => navigate(`/materias/examenes/${materiaId}/resultados/2`)}
                        className="text-(--btnColor-primary) text-xs font-bold mt-4 flex items-center hover:underline w-fit cursor-pointer"
                    >
                        Ver Resultados <i className="icon-[heroicons--arrow-right] ml-1"></i>
                    </button>
                </div>

                {/* Tarjeta de Examen - Pendiente */}
                <div className="card !p-6">
                    <span className="badge !bg-gray-100 !text-gray-500 border-none !w-fit !text-[10px] mb-2 px-2 py-0.5">PENDIENTE</span>
                    <h3 className="text-lg text-slate-800">Final de Semestre</h3>
                    <div className="flex flex-col gap-2 mt-4 text-xs text-gray-500">
                        <span className="flex items-center"><i className="icon-[heroicons--calendar] mr-2 text-lg"></i> 20 Dic 2023, 08:00 AM</span>
                        <span className="flex items-center"><i className="icon-[heroicons--users] mr-2 text-lg"></i> 0/45 Estudiantes</span>
                    </div>
                    <button
                        onClick={() => navigate(`/materias/examenes/${materiaId}/resultados/3`)}
                        className="text-(--btnColor-primary) text-xs font-bold mt-4 flex items-center hover:underline w-fit cursor-pointer"
                    >
                        Ver Resultados <i className="icon-[heroicons--arrow-right] ml-1"></i>
                    </button>
                </div>
            </div>

            {/* Modal para Crear Examen */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Nuevo Examen">
                <form className="p-6 flex flex-col gap-5">
                    <div>
                        <label className="text-xs text-gray-500">Nombre del Examen <span className="text-red-500">*</span></label>
                        <input type="text" className="w-full !bg-gray-50 !border-transparent focus:!border-(--borderColor-input)" placeholder="Ej. Parcial 2: Ecuaciones" />
                    </div>

                    <div className="flex flex-row gap-4">
                        <div className="w-1/2">
                            <label className="text-xs text-gray-500">Fecha del Examen</label>
                            <div className="relative">
                                <input type="date" className="w-full !bg-gray-50 !border-transparent" />
                            </div>
                        </div>
                        <div className="w-1/2">
                            <label className="text-xs text-gray-500">Hora del Examen</label>
                            <input type="time" className="w-full !bg-gray-50 !border-transparent" />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-gray-500">Total de Puntos <span className="text-red-500">*</span></label>
                        <input type="number" min="0" className="w-full !bg-gray-50 !border-transparent focus:!border-(--borderColor-input)" placeholder="Ej. 100" />
                    </div>

                    <div className="flex justify-end items-center gap-4 mt-6">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="text-sm font-bold text-(--btnColor-primary) hover:underline cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button type="button" className="btn-primary !px-5" onClick={() => setIsModalOpen(false)}>
                            Crear Examen <i className="icon-[heroicons--arrow-right] ml-2 text-lg"></i>
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};