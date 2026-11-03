import { useState, useEffect } from "react";
import { SearchInput } from "../components/SearchInput";
import { Table } from "../components/Table";
import { Modal } from "../components/Modal";
import { listarMaterias, crearMateria, listarProfesores } from "../services/notasService";

export const SubjectsPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [materias, setMaterias] = useState([]);
    const [profesores, setProfesores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const DIAS_SEMANA = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

    const [formData, setFormData] = useState({
        nombreMateria: "",
        idProfesor: "",
        dia: "", // Guardamos un solo string en lugar de un array
        descripcion: ""
    });

    const headers = ['Materia', 'Profesor', 'Día', 'Acciones'];

    const cargarDatos = async () => {
        setLoading(true);
        setError(null);
        try {
            const [matData, profData] = await Promise.all([
                listarMaterias(),
                listarProfesores().catch(() => [])
            ]);

            const listaMat = Array.isArray(matData) ? matData : matData?.content || matData?.data || [];
            const listaProf = Array.isArray(profData) ? profData : profData?.content || profData?.data || [];

            setMaterias(listaMat);
            setProfesores(listaProf);
        } catch (err) {
            console.error("Error al cargar datos:", err);
            setError(err.response?.data?.message || err.message || "Error al conectar con el servidor.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    const tableActions = [
        { type: 'view', onClick: (row) => console.log('Viendo materia ID: ', row._id) },
        { type: 'edit', onClick: (row) => console.log('Editando materia ID: ', row._id) },
        { type: 'delete', onClick: (row) => console.log('Eliminando materia ID: ', row._id) }
    ];

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    // Ahora solo selecciona un día, reemplazando el anterior
    const handleDiaToggle = (diaSeleccionado) => {
        setFormData({ ...formData, dia: diaSeleccionado });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.dia) {
            alert("Por favor, selecciona un día de la semana.");
            return;
        }

        try {
            await crearMateria({
                nombreMateria: formData.nombreMateria,
                idProfesor: Number(formData.idProfesor),
                dia: formData.dia, // Enviamos el string simple (ej: "LUNES")
                descripcion: formData.descripcion
            });

            setFormData({ nombreMateria: "", idProfesor: "", dia: "", descripcion: "" });
            setIsModalOpen(false);
            await cargarDatos();

        } catch (err) {
            console.error("Error al crear la materia:", err.response?.data || err);
            const backendMsg = err.response?.data?.mensaje || err.response?.data?.message || JSON.stringify(err.response?.data) || err.message;
            alert(`No se pudo crear la materia: ${backendMsg}`);
        }
    };

    const dataTable = materias.map((m) => {
        const id = m.id || m.idMateria;
        const nombre = m.nombre || m.nombreMateria || "Sin nombre";
        const profesorObj = m.profesor || m.usuarioProfesor;
        const profesor = typeof profesorObj === 'object' ? `${profesorObj.nombre || ''} ${profesorObj.apellido || ''}`.trim() : (profesorObj || m.nombreProfesor || "Sin asignar");
        const horario = m.dia || m.horario || "No especificado";

        const row = [nombre, profesor, horario];
        row._id = id;
        return row;
    });

    return (
        <div className="container-page">
            <div className="flex flex-col mt-[24px]">
                <h1>Materias</h1>
                <h2>Gestión de materias del cursillo</h2>
            </div>

            <div className="flex flex-row justify-between items-center my-4">
                <SearchInput placeholder="Buscar materia" />
                <button className="btn-primary cursor-pointer" onClick={() => setIsModalOpen(true)}>
                    <i className="icon-[heroicons--plus] text-white mr-2"></i>
                    Nueva materia
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="w-10 h-10 border-4 border-(--btnColor-primary) border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-500 mt-4 font-medium">Cargando materias...</p>
                </div>
            ) : error ? (
                <div className="p-5 bg-red-50 border border-red-200 rounded-xl text-red-700">
                    <p className="font-bold text-sm">Error al cargar materias</p>
                    <p className="text-xs text-red-600">{error}</p>
                </div>
            ) : (
                <Table headers={headers} data={dataTable} actions={tableActions} />
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Nueva Materia">
                <form onSubmit={handleSubmit} className="flex flex-col">
                    <div className="p-6 bg-(--bgColor-main) flex flex-col gap-5">

                        <div>
                            <label className="block text-xs font-bold text-gray-600 tracking-wider uppercase mb-2">
                                NOMBRE DE LA MATERIA
                            </label>
                            <input
                                type="text"
                                name="nombreMateria"
                                value={formData.nombreMateria}
                                onChange={handleInputChange}
                                placeholder="Ej. Scrum Master Avanzado"
                                className="w-full px-3 py-2 rounded-lg border border-(--borderColor-input) bg-white text-sm focus:outline-none focus:border-(--btnColor-primary)"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-600 tracking-wider uppercase mb-2">
                                PROFESOR
                            </label>
                            <select
                                name="idProfesor"
                                value={formData.idProfesor}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 rounded-lg border border-(--borderColor-input) bg-white text-sm text-gray-700 focus:outline-none focus:border-(--btnColor-primary)"
                                required
                            >
                                <option value="" disabled>Seleccione un profesor</option>
                                {profesores.map((prof) => {
                                    const profId = prof.id || prof.idUsuario || prof.idProfesor;
                                    const profNombre = `${prof.nombre || ''} ${prof.apellido || ''}`.trim() || `Profesor #${profId}`;
                                    return (
                                        <option key={profId} value={profId}>{profNombre}</option>
                                    );
                                })}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-600 tracking-wider uppercase mb-2">
                                DÍA DE CLASE (SELECCIONA UNO)
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {DIAS_SEMANA.map((dia) => {
                                    const isSelected = formData.dia === dia;
                                    return (
                                        <button
                                            type="button"
                                            key={dia}
                                            onClick={() => handleDiaToggle(dia)}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${isSelected
                                                ? 'bg-(--btnColor-primary) text-white border-(--btnColor-primary)'
                                                : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            {dia}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-600 tracking-wider uppercase mb-2">
                                DESCRIPCIÓN
                            </label>
                            <textarea
                                name="descripcion"
                                rows={3}
                                value={formData.descripcion}
                                onChange={handleInputChange}
                                placeholder="Describe los objetivos del curso..."
                                className="w-full px-3 py-2 rounded-lg border border-(--borderColor-input) bg-white text-sm focus:outline-none focus:border-(--btnColor-primary) resize-none"
                                required
                            />
                        </div>
                    </div>

                    <div className="px-6 py-4 bg-white border-t border-(--borderColor-input) flex justify-end items-center gap-4">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary cursor-pointer">
                            Crear Nueva materia
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};