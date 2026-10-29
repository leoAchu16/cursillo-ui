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

export const Table = ({ 
    headers, 
    data = [], 
    actions, 
    currentPage = 1, 
    totalPages = 1, 
    totalElements,
    onPrevPage, 
    onNextPage,
    showPagination = true 
}) => {

    const iconActions = {
        "edit": "icon-[heroicons--pencil]",
        "delete": "icon-[heroicons--trash]",
        "view": "icon-[heroicons--eye]",
        "save": "icon-[heroicons--check]"
    }

    //Agreguen aca los estados que necesiten para que se muestren en la tabla como badges
    const statusBadge = {
        PAGADO: { label: 'PAGADO', className: 'badge badge-success' },
        PENDIENTE: { label: 'PENDIENTE', className: 'badge badge-warning' },
        MATERIA: { label: 'MATERIA', className: 'badge badge-info' },
        EXAMEN: { label: 'EXAMEN', className: 'badge badge-success' },
        ACTIVO: { label: 'ACTIVO', className: 'badge badge-success' },
        INACTIVO: { label: 'INACTIVO', className: 'badge badge-error' },
        ANULADO: { label: 'ANULADO', className: 'badge badge-error' },
        CANCELADO: { label: 'CANCELADO', className: 'badge badge-error' }
    }

    const renderBadge = (value) => {
        if (typeof value !== 'string') return value;
        const status = statusBadge[value.toUpperCase()];
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
                {data.length === 0 ? (
                    <tr>
                        <td colSpan={headers.length} className="text-center py-8 text-gray-500 font-medium">
                            No se encontraron registros
                        </td>
                    </tr>
                ) : (
                    data.map((item, index) => (
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
                                                type="button"
                                                onClick={() => action.onClick(item)}
                                                className="text-slate-700 hover:text-(--btnColor-primary) transition-colors cursor-pointer"
                                                title={action.title || action.type}
                                            >
                                                <i className={`${iconActions[action.type] || 'icon-[heroicons--ellipsis-horizontal]'} text-xl`}></i>
                                            </button>
                                        ))}
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))
                )}
            </tbody>
            {showPagination && (
                <tfoot>
                    <tr>
                        <td className="border-t-2 border-(--borderColor-input)" colSpan={headers.length}>
                            <div className="flex flex-row justify-between items-center py-1">
                                <p className="text-sm text-gray-600">
                                    Página <span className="font-semibold text-slate-800">{currentPage}</span> de <span className="font-semibold text-slate-800">{Math.max(1, totalPages)}</span>
                                    {totalElements !== undefined && totalElements !== null && (
                                        <span className="ml-2 text-xs text-gray-500">({totalElements} {totalElements === 1 ? 'resultado' : 'resultados'})</span>
                                    )}
                                </p>
                                <div className="flex flex-row gap-2">
                                    <button
                                        type="button"
                                        disabled={currentPage <= 1 || !onPrevPage}
                                        onClick={onPrevPage}
                                        className={`flex w-8 h-8 items-center justify-center border-2 border-(--borderColor-input) rounded-l-xl bg-(--bgColor-main) text-slate-700 transition-colors ${
                                            currentPage <= 1 || !onPrevPage
                                                ? 'opacity-40 cursor-not-allowed'
                                                : 'hover:bg-(--btnColor-sidebar-hover) cursor-pointer'
                                        }`}
                                        title="Anterior">
                                        <i className="icon-[heroicons--chevron-left] text-xl"></i>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={currentPage >= totalPages || !onNextPage}
                                        onClick={onNextPage}
                                        className={`flex w-8 h-8 items-center justify-center border-2 border-(--borderColor-input) rounded-r-xl bg-(--bgColor-main) text-slate-700 transition-colors ${
                                            currentPage >= totalPages || !onNextPage
                                                ? 'opacity-40 cursor-not-allowed'
                                                : 'hover:bg-(--btnColor-sidebar-hover) cursor-pointer'
                                        }`}
                                        title="Siguiente">
                                        <i className="icon-[heroicons--chevron-right] text-xl"></i>
                                    </button>
                                </div>
                            </div>
                        </td>
                    </tr>
                </tfoot>
            )}
        </table>
    )
}