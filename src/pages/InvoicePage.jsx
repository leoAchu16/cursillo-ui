import { Table } from "../components/Table"
import { SearchInput } from "../components/SearchInput"

export const InvoicePage = () => {

    const headers = ['Nro. Factura', 'Alumno', 'Monto total', 'Fecha de emisión', 'RUC', 'Acciones'];

    const data = [
        ['123456', 'Ana Gomez', '123456', '2024-01-01', '123456'],
        ['123456', 'Fernando Medina', '123456', '2024-01-01', '123456'],
        ['123456', 'Maria Becerra', '123456', '2024-01-01', '123456'],
        ['123456', 'Juan Lezcano', '123456', '2024-01-01', '123456'],
        ['123456', 'Luisa Rojas', '123456', '2024-01-01', '123456'],
        ['123456', 'Carlos Rodriguez', '123456', '2024-01-01', '123456'],
        ['123456', 'Ana Chaparro', '123456', '2024-01-01', '123456']
    ];

    const tableActions = [
        {
            type: 'view',
            onClick: (fila) => console.log('Viendo factura de: ', fila[0])
        }
    ];

    return (
        <div className="container-page">
            <div className="flex flex-col">
                <h1>Facturas</h1>
                <h2>Gestión de facturas de alumnos</h2>
            </div>
            <div className="flex flex-row justify-between">
                <SearchInput placeholder="Buscar por alumno" />
                <button className="flex items-center bg-(--btnColor-primary) text-(--textColor-secondary) rounded-xl p-2 shadow-md hover:bg-(--btnColor-primary-hover) transition-colors cursor-pointer">
                    <i className="icon-[heroicons--plus] text-white mr-2"></i>
                    Nueva factura
                </button>
            </div>
            <Table headers={headers} data={data} actions={tableActions}></Table>
        </div>
    )
}