
import { SearchInput } from "../components/SearchInput"
import { Table } from "../components/Table"


export const EnrollmentsPage = () => {

    //Los encabezados de la tabla
    const headers = ['Alumno', 'Fecha', 'Total', 'Estado', 'Acciones']

    //Los datos de la tabla (tiene que ser un array de arrays)
    const data = [
        ['Pepe Domiguez', '10/10/2022', 100000, 'PAGADO'],
        ['Maria Becerra', '10/10/2022', 100000, 'PENDIENTE'],
        ['Juan Lezcano', '10/10/2022', 100000, 'PAGADO'],
        ['Luisa Rojas', '10/10/2022', 100000, 'PAGADO'],
        ['Carlos Rodriguez', '10/10/2022', 100000, 'PENDIENTE'],
        ['Ana Chaparro', '10/10/2022', 100000, 'PAGADO'],
        ['Fernando Medina', '10/10/2022', 100000, 'PENDIENTE'],
    ]

    //Para los botones de las filas de la tabla. Solo pueden tener estos tipos: edit, delete, view, save
    const tableActions = [
        {
            type: 'edit',
            onClick: (fila) => console.log('Editando a: ', fila[0])
        },
        {
            type: 'view',
            onClick: (fila) => console.log('Viendo a: ', fila[0])
        }
    ];

    return (
        <div className="container-page">
            <div className="flex flex-col">
                <h1>Inscripciones</h1>
                <h2>Gestión de inscripciones de alumnos a materias o exámenes</h2>
            </div>
            <div className="flex flex-row justify-between">
                <SearchInput placeholder="Buscar por alumno"></SearchInput>
                <button className="flex items-center bg-(--btnColor-primary) text-(--textColor-secondary) rounded-xl p-2 shadow-md hover:bg-(--btnColor-primary-hover) transition-colors cursor-pointer">
                    <i className="icon-[heroicons--plus] text-white mr-2"></i>
                    Nueva inscripción
                </button>
            </div>
            <Table headers={headers} data={data} actions={tableActions}></Table>
        </div>
    )
}