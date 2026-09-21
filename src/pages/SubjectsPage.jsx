import { SearchInput } from "../components/SearchInput"
import { Table } from "../components/Table"




export const SubjectsPage = () => {

    const headers = ['Materia', 'Profesor', 'Día', 'Acciones'];

    const data = [
        ['Matematica', 'Juan Perez', 'Lunes'],
        ['Fisica', 'Maria Lopez', 'Martes'],
        ['Quimica', 'Carlos Rodriguez', 'Miercoles'],
        ['Biologia', 'Ana Garcia', 'Jueves'],
        ['Informatica', 'Pedro Ramirez', 'Viernes'],
        ['Guarani', 'Miguel Sanchez', 'Sabado']
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
                <h1>Materias</h1>
                <h2>Gestión de materias del cursillo</h2>
            </div>
            <div className="flex flex-row justify-between">
                <SearchInput placeholder="Buscar materia" />
                <button className="flex items-center bg-(--btnColor-primary) text-(--textColor-secondary) rounded-xl p-2 shadow-md hover:bg-(--btnColor-primary-hover) transition-colors cursor-pointer">
                    <i className="icon-[heroicons--plus] text-white mr-2"></i>
                    Nueva materia
                </button>
            </div>
            <Table headers={headers} data={data} actions={tableActions}></Table>
        </div>
    )
}