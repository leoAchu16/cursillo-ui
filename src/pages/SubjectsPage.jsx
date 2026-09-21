import { useState } from "react";
import { SearchInput } from "../components/SearchInput";
import { Table } from "../components/Table";
import { Modal } from "../components/Modal";

export const SubjectsPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Estado con los campos exactos del diseño
    const [formData, setFormData] = useState({
        subjectName: "",
        teacher: "",
        schedule: "",
        description: ""
    });

    // Lista de profesores para el menú desplegable
    const teachersList = [
        "Sebastian Leguizamon",
        "Juan Perez",
        "Maria Lopez",
        "Carlos Rodriguez"
    ];

    const headers = ['Materia', 'Profesor', 'Día', 'Acciones'];

    const data = [
        ['Matematica', 'Juan Perez', 'Lunes'],
        ['Fisica', 'Maria Lopez', 'Martes'],
        ['Quimica', 'Carlos Rodriguez', 'Miercoles'],
        ['Biologia', 'Ana Garcia', 'Jueves'],
        ['Informatica', 'Pedro Ramirez', 'Viernes'],
        ['Guarani', 'Miguel Sanchez', 'Sabado']
    ];

    const tableActions = [
        {
            type: 'view',
            onClick: (row) => console.log('Viendo materia: ', row[0])
        },
        {
            type: 'edit',
            onClick: (row) => console.log('Editando materia: ', row[0])
        },
        {
            type: 'delete',
            onClick: (row) => console.log('Eliminando materia: ', row[0])
        }
    ];

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("Nueva materia creada:", formData);

        // Reiniciamos formulario y cerramos modal
        setFormData({
            subjectName: "",
            teacher: "",
            schedule: "",
            description: ""
        });
        setIsModalOpen(false);
    };

    return (
        <div className="container-page">
            <div className="flex flex-col">
                <h1>Materias</h1>
                <h2>Gestión de materias del cursillo</h2>
            </div>

            <div className="flex flex-row justify-between items-center">
                <SearchInput placeholder="Buscar materia" />

                <button
                    className="btn-primary"
                    onClick={() => setIsModalOpen(true)}
                >
                    <i className="icon-[heroicons--plus] text-lg"></i>
                    Nueva materia
                </button>
            </div>

            <Table headers={headers} data={data} actions={tableActions} />

            {/* Modal de Crear Nueva Materia */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Crear Nueva Materia"
            >
                <form onSubmit={handleSubmit} className="flex flex-col">
                    {/* Cuerpo del Formulario con fondo gris/verde claro */}
                    <div className="p-6 bg-(--bgColor-main) flex flex-col gap-4">

                        {/* Nombre de la materia */}
                        <div>
                            <label className="block text-xs font-bold text-gray-600 tracking-wider uppercase mb-2">
                                NOMBRE DE LA MATERIA
                            </label>
                            <input
                                type="text"
                                name="subjectName"
                                value={formData.subjectName}
                                onChange={handleInputChange}
                                placeholder="Ej. Scrum Master Avanzado"
                                className="w-full px-3 py-2 rounded-lg border border-(--borderColor-input) bg-white text-sm focus:outline-none focus:border-(--btnColor-primary)"
                                required
                            />
                        </div>

                        {/* Profesor (Select) */}
                        <div>
                            <label className="block text-xs font-bold text-gray-600 tracking-wider uppercase mb-2">
                                PROFESOR
                            </label>
                            <select
                                name="teacher"
                                value={formData.teacher}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 rounded-lg border border-(--borderColor-input) bg-white text-sm text-gray-700 focus:outline-none focus:border-(--btnColor-primary)"
                                required
                            >
                                <option value="" disabled>Seleccione un profesor</option>
                                {teachersList.map((teacherName, index) => (
                                    <option key={index} value={teacherName}>
                                        {teacherName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Horario */}
                        <div>
                            <label className="block text-xs font-bold text-gray-600 tracking-wider uppercase mb-2">
                                HORARIO
                            </label>
                            <input
                                type="text"
                                name="schedule"
                                value={formData.schedule}
                                onChange={handleInputChange}
                                placeholder="Ej. Lunes y Miércoles 18:00 - 20:00"
                                className="w-full px-3 py-2 rounded-lg border border-(--borderColor-input) bg-white text-sm focus:outline-none focus:border-(--btnColor-primary)"
                                required
                            />
                        </div>

                        {/* Descripción */}
                        <div>
                            <label className="block text-xs font-bold text-gray-600 tracking-wider uppercase mb-2">
                                DESCRIPCIÓN
                            </label>
                            <textarea
                                name="description"
                                rows={3}
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder="Describe los objetivos del curso..."
                                className="w-full px-3 py-2 rounded-lg border border-(--borderColor-input) bg-white text-sm focus:outline-none focus:border-(--btnColor-primary) resize-none"
                            />
                        </div>
                    </div>

                    {/* Pie de página con fondo blanco y botones alineados */}
                    <div className="px-6 py-4 bg-white border-t border-(--borderColor-input) flex justify-end items-center gap-4">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                        >
                            Crear Nueva materia
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};