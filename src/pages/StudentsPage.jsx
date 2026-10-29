import { useState, useEffect } from "react";
import { SearchInput } from "../components/SearchInput";
import { Table } from "../components/Table";
import { listarAlumnos } from "../services/inscripcionesService";

export const StudentsPage = () => {
    const [busqueda, setBusqueda] = useState("");
    const [alumnos, setAlumnos] = useState([]);
    const [loading, setLoading] = useState(false);

    const headers = ['Nombre', 'Apellido', 'Email', 'Telefono', 'Acciones'];

    const defaultStudents = [
        ['Ana', 'Gomez', 'ana@gmail.com', '0983123456'],
        ['Fernando', 'Medina', 'fernando@gmail.com', '0983123456'],
        ['Maria', 'Becerra', 'maria@gmail.com', '0983123456'],
        ['Juan', 'Lezcano', 'juan@gmail.com', '0983123456'],
        ['Luisa', 'Rojas', 'luisa@gmail.com', '0983123456'],
        ['Carlos', 'Rodriguez', 'carlos@gmail.com', '0983123456'],
        ['Ana', 'Chaparro', 'ana@gmail.com', '0983123456']
    ];

    useEffect(() => {
        const cargar = async () => {
            setLoading(true);
            try {
                const data = await listarAlumnos();
                if (Array.isArray(data) && data.length > 0) {
                    const mapped = data.map(a => [
                        a.nombre || 'Sin nombre',
                        a.apellido || '',
                        a.email || a.correo || 'N/A',
                        a.telefono || a.celular || 'N/A'
                    ]);
                    setAlumnos(mapped);
                } else {
                    setAlumnos(defaultStudents);
                }
            } catch {
                setAlumnos(defaultStudents);
            } finally {
                setLoading(false);
            }
        };
        cargar();
    }, []);

    const tableActions = [
        {
            type: 'view',
            onClick: (fila) => console.log('Viendo a: ', fila[0])
        },
        {
            type: 'delete',
            onClick: (fila) => console.log('Eliminando a: ', fila[0])
        },
        {
            type: 'edit',
            onClick: (fila) => console.log('Editando a: ', fila[0])
        }
    ];

    const datosFiltrados = alumnos.filter(fila => {
        const nombre = String(fila[0] || '').toLowerCase();
        const apellido = String(fila[1] || '').toLowerCase();
        const search = busqueda.toLowerCase();
        return nombre.includes(search) || apellido.includes(search);
    });

    return (
        <div className="container-page">
            <div className="flex flex-col mt-[24px]">
                <h1>Alumnos</h1>
                <h2>Gestión de alumnos del cursillo</h2>
            </div>
            <div className="flex flex-row justify-between items-center gap-4">
                <SearchInput
                    placeholder="Buscar por nombre o apellido"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                />
                <button className="flex items-center bg-(--btnColor-primary) text-(--textColor-secondary) rounded-xl p-2 shadow-md hover:bg-(--btnColor-primary-hover) transition-colors cursor-pointer">
                    <i className="icon-[heroicons--plus] text-white mr-2"></i>
                    Nuevo Alumno
                </button>
            </div>
            {loading && (
                <div className="text-xs text-slate-500 flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-(--btnColor-primary) border-t-transparent rounded-full animate-spin"></div>
                    Cargando alumnos...
                </div>
            )}
            <Table headers={headers} data={datosFiltrados} actions={tableActions}></Table>
        </div>
    );
};