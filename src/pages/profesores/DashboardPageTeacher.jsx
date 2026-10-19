import { useNavigate } from 'react-router-dom';

export const MisMateriasPage = () => {
    const navigate = useNavigate();

    const materias = [
        { id: 1, nombre: "MATEMÁTICAS", anio: "2024", dias: "Lun, Mié, Vie" },
        { id: 2, nombre: "FÍSICA", anio: "2024", dias: "Mar, Jue" },
        { id: 3, nombre: "LITERATURA", anio: "2023", dias: "Mié, Vie" },
        { id: 4, nombre: "HISTORIA", anio: "2024", dias: "Lun, Jue" }
    ];

    return (
        <div className="container-page">
            <div className="mb-6">
                <h1>Mis Materias</h1>
                <h2>Resumen de tus formaciones activas y progreso de estudiantes.</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {materias.map((materia) => (
                    <div
                        key={materia.id}
                        onClick={() => navigate(`/materias/${materia.id}`)}
                        className="card cursor-pointer hover:border-(--btnColor-primary) transition-all items-center text-center py-12"
                    >
                        <h3 className="text-sm tracking-widest text-slate-700">{materia.nombre}</h3>
                        <div className="text-xs text-gray-500 mt-3 space-y-1">
                            <p>Año: {materia.anio}</p>
                            <p>Días: {materia.dias}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};