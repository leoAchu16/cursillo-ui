import { SearchInput } from "../components/SearchInput"
import { Table } from "../components/Table";

export const StudentsPage = () => {

    const headers = ['Nombre', 'Apellido', 'Email', 'Telefono', 'Acciones'];

    const data = [
        ['Ana', 'Gomez', 'ana@gmail.com', '0983123456'],
        ['Fernando', 'Medina', 'fernando@gmail.com', '0983123456'],
        ['Maria', 'Becerra', 'maria@gmail.com', '0983123456'],
        ['Juan', 'Lezcano', 'juan@gmail.com', '0983123456'],
        ['Luisa', 'Rojas', 'luisa@gmail.com', '0983123456'],
        ['Carlos', 'Rodriguez', 'carlos@gmail.com', '0983123456'],
        ['Ana', 'Chaparro', 'ana@gmail.com', '0983123456']
    ]

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
    ]

    return (
        <div className="container-page">
            <div className="flex flex-col">
                <h1>Alumnos</h1>
                <h2>Gestión de alumnos del cursillo</h2>
            </div>
            <div className="flex flex-row justify-between">
                <SearchInput placeholder="Buscar por nombre o apellido" />
                <button className="flex items-center bg-(--btnColor-primary) text-(--textColor-secondary) rounded-xl p-2 shadow-md hover:bg-(--btnColor-primary-hover) transition-colors cursor-pointer">
                    <i className="icon-[heroicons--plus] text-white mr-2"></i>
                    Nuevo Alumno
                </button>
            </div>
            <Table headers={headers} data={data} actions={tableActions}></Table>
        </div>
    )
}