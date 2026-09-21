
/**
 * USEN ESTE COMPONENTE EN TODAS LAS PAGINAS QUE INCLUYAN UNA TABLA
 * 
 * COMO IMPLEMENTAR:
 * <Table headers={ArrayEncabezados} data={ArrayDeArraysDeDatos}></Table>
 * 
 * @param {[]} headers -> Array de strings con los encabezados de la tabla
 * @param {[]} data -> Array de arrays con los datos de la tabla
 * @returns <table>
 */

export const Table = ({ headers, data, actions }) => {

    const iconActions = {
        "edit": "icon-[heroicons--pencil]",
        "delete": "icon-[heroicons--trash]",
        "view": "icon-[heroicons--eye]",
        "save": "icon-[heroicons--check]"
    }

    //Agreguen aca los estados que necesiten para que se muestren en la tabla como badges
    const statusBadge = {
        PAGADO: { label: 'PAGADO', className: 'badge badge-success' },
        PENDIENTE: { label: 'PENDIENTE', className: 'badge badge-warning' }
    }

    const renderBadge = (value) => {
        const status = statusBadge[value];
        if (!status) return value;
        return <span className={status.className}>{status.label}</span>
    };

    return (
        <table>
            <thead>
                <tr>
                    {headers.map((header, index) => (
                        <th key={index}>{header}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {data.map((item, index) => (
                    <tr key={index}>
                        {item.map((cell, cellIndex) => (
                            <td key={cellIndex}>{renderBadge(cell)}</td>
                        ))}

                        {/* Celda de acciones (solo se renderiza si se pasa el prop `actions`) */}
                        {actions && actions.length > 0 && (
                            <td>
                                <div className="flex flex-row gap-3 justify-center">
                                    {actions.map((action, actionIndex) => (
                                        <button
                                            key={actionIndex}
                                            onClick={() => action.onClick(item)}
                                            className="text-slate-700 hover:text-(--btnColor-primary) transition-colors cursor-pointer"
                                            title={action.type}
                                        >
                                            <i className={`${iconActions[action.type]} text-xl`}></i>
                                        </button>
                                    ))}
                                </div>
                            </td>
                        )}
                    </tr>
                ))}
            </tbody>
            <tfoot>
                <tr>
                    <td className="border-t-2 border-(--borderColor-input)" colSpan={headers.length}>
                        <div className="flex flex-row justify-between items-center">
                            <p>Página 1 de 10</p>
                            <div className="flex flex-row gap-3">
                                <button
                                    className="flex w-8 h-8 items-center justify-center border-2 border-(--borderColor-input) rounded-l-xl bg-(--bgColor-main) text-slate-700 hover:bg-(--btnColor-sidebar-hover) transition-colors cursor-pointer"
                                    title="anterior">
                                    <i className="icon-[heroicons--chevron-left] text-xl"></i>
                                </button>
                                <button
                                    className="flex w-8 h-8 items-center justify-center border-2 border-(--borderColor-input) rounded-r-xl bg-(--bgColor-main) text-slate-700 hover:bg-(--btnColor-sidebar-hover) transition-colors cursor-pointer"
                                    title="siguiente">
                                    <i className="icon-[heroicons--chevron-right] text-xl"></i>
                                </button>
                            </div>
                        </div>
                    </td>
                </tr>
            </tfoot>
        </table>
    )
}