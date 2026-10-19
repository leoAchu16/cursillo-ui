import { useState } from 'react';
import { SearchInput } from "../../components/SearchInput";
import { Combobox } from "../../components/Combobox";
import { Table } from "../../components/Table";
export const DetalleMateriaPage = () => {
    const [busqueda, setBusqueda] = useState("");
    const [filtroEstado, setFiltroEstado] = useState(null);

    const headers = ["ALUMNO", "EMAIL", "INSCRIPCIÓN", "ESTADO"];

    const data = [
        [
            <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                    <img src="https://ui-avatars.com/api/?name=Ana+Sofia&background=random" alt="avatar" />
                </div>
                <div>
                    <p className="font-bold text-sm text-slate-800">Ana Sofía Martínez</p>
                    <p className="text-xs text-gray-500">ID: MAT-2023-001</p>
                </div>
            </div>,
            "ana.martinez@ejemplo.com",
            "12 Ago, 2023",
            <span className="badge badge-success !text-xs py-1">Activo</span>
        ],
        [
            <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                    <img src="https://ui-avatars.com/api/?name=Carlos+Mendoza&background=random" alt="avatar" />
                </div>
                <div>
                    <p className="font-bold text-sm text-slate-800">Carlos Mendoza Ruíz</p>
                    <p className="text-xs text-gray-500">ID: MAT-2023-042</p>
                </div>
            </div>,
            "carlos.mendoza@ejemplo.com",
            "14 Ago, 2023",
            <span className="badge badge-success !text-xs py-1">Activo</span>
        ],
        [
            <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 text-xs">LR</div>
                <div>
                    <p className="font-bold text-sm text-slate-800">Lucía Ramírez</p>
                    <p className="text-xs text-gray-500">ID: MAT-2023-018</p>
                </div>
            </div>,
            "l.ramirez.99@ejemplo.com",
            "05 Sep, 2023",
            <span className="badge !bg-gray-200 !text-gray-600 !text-xs py-1">Inactivo</span>
        ]
    ];

    return (
        <div className="container-page">
            <div className="mb-6">
                <h1>Mis Materias / <span className="text-gray-500">Matemáticas</span></h1>
                <h2>Resumen de tus formaciones activas y progreso de estudiantes.</h2>
            </div>

            <div className="card">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-2">
                    <div className="w-full md:w-1/2">
                        <SearchInput
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar por nombre o email..."
                            variant="default"
                        />
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                        <Combobox
                            options={[{ label: 'Activo', value: 'activo' }, { label: 'Inactivo', value: 'inactivo' }]}
                            value={filtroEstado}
                            onChange={setFiltroEstado}
                            placeholder="Estado: Todos"
                            className="w-40"
                        />
                        <button className="px-4 py-2 text-sm border border-(--borderColor-input) rounded-md bg-white hover:bg-gray-50 text-slate-700 font-medium">
                            Fecha: Más recientes <i className="icon-[heroicons--chevron-down] ml-1"></i>
                        </button>
                    </div>
                </div>

                <Table headers={headers} data={data} />
            </div>
        </div>
    );
};