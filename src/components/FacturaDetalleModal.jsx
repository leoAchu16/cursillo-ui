import { Modal } from './Modal';
import { Table } from './Table';
import { codigoFactura } from './codigoFactura';

export const FacturaDetalleModal = ({ factura, onClose, guaranies, mapaConceptos }) => {
    if (!factura) return null;

    const nombreConcepto = (id) => mapaConceptos[id]?.nombre ?? 'Concepto no disponible';

    const detalles = factura.detallesFactura ?? [];
    const filasDetalle = detalles.map((d) => [
        nombreConcepto(d.idConcepto),
        d.cantidad,
        guaranies.format(d.subtotal ?? 0),
    ]);

    return (
        <Modal
            isOpen={Boolean(factura)}
            onClose={onClose}
            title={`Detalle de Factura ${codigoFactura(factura.idFactura)}`}
        >
            <div className="p-6 flex flex-col gap-4 text-sm">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-gray-50 p-4 rounded-xl text-xs">
                    <div>
                        <span className="text-gray-400 block font-semibold uppercase">Alumno</span>
                        <span className="font-semibold text-slate-800">
                            {factura.nombreAlumno ?? `N° ${factura.idAlumno}`}
                        </span>
                    </div>
                    <div>
                        <span className="text-gray-400 block font-semibold uppercase">Secretaría</span>
                        <span className="font-medium text-slate-700">
                            {factura.nombreSecretaria ?? '-'}
                        </span>
                    </div>
                    <div>
                        <span className="text-gray-400 block font-semibold uppercase">RUC</span>
                        <span className="font-medium text-slate-700">{factura.ruc}</span>
                    </div>
                    <div>
                        <span className="text-gray-400 block font-semibold uppercase">Método de pago</span>
                        <span className="font-medium text-slate-700">{factura.metodoPago}</span>
                    </div>
                    <div>
                        <span className="text-gray-400 block font-semibold uppercase">Fecha de emisión</span>
                        <span className="font-medium text-slate-700">{factura.fechaEmision}</span>
                    </div>
                </div>

                <div className="mt-2">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Conceptos Cobrados</h4>
                    {detalles.length === 0 ? (
                        <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-3">
                            Esta factura no tiene conceptos cargados.
                        </p>
                    ) : (
                        <Table
                            headers={['Concepto', 'Cantidad', 'Subtotal']}
                            data={filasDetalle}
                            showPagination={false}
                        />
                    )}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                    <span className="font-bold text-slate-700">Total Facturado:</span>
                    <span className="text-lg font-bold text-emerald-700">{guaranies.format(factura.total ?? 0)}</span>
                </div>
            </div>
        </Modal>
    );
};
