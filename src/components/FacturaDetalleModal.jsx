import { Modal } from './Modal';
import { codigoFactura } from './codigoFactura';

const SIN_DATO = '—';
const LABEL_CLASS = "block text-xs font-bold text-gray-600 tracking-wider uppercase mb-1";

// mostrarAlumno: false cuando las facturas son todas del mismo alumno (el logueado)
export const FacturaDetalleModal = ({ factura, onClose, formatearFecha, formatearMonto, mostrarAlumno = true }) => {
    const detalles = factura?.detallesFactura ?? [];

    // Las líneas se guardan sin descuento: el descuento de la inscripción es la diferencia con el total
    const sumaLineas = detalles.reduce((acc, d) => acc + (d.subtotal ?? 0), 0);
    const descuento = factura?.idInscripcion ? Math.max(0, sumaLineas - (factura.total ?? 0)) : 0;

    return (
        <Modal
            isOpen={Boolean(factura)}
            onClose={onClose}
            title={`Factura ${factura ? codigoFactura(factura.idFactura) : ''}`}
            size="md"
            closeOnBackdrop
        >
            <div className="p-6 bg-(--bgColor-main) flex flex-col gap-5 text-sm">
                <dl className="grid grid-cols-2 gap-4">
                    {[
                        ...(mostrarAlumno ? [['Alumno', factura?.nombreAlumno]] : []),
                        ['RUC', factura?.ruc],
                        ['Método de pago', factura?.metodoPago],
                        ['Fecha de emisión', formatearFecha(factura?.fechaEmision)],
                        ['Emitida por', factura?.nombreSecretaria],
                        ['Inscripción', factura?.idInscripcion && `#${factura.idInscripcion}`],
                    ].map(([label, valor]) => (
                        <div key={label}>
                            <dt className={LABEL_CLASS}>{label}</dt>
                            <dd className="text-slate-800">{valor || SIN_DATO}</dd>
                        </div>
                    ))}
                </dl>

                <div>
                    <span className={LABEL_CLASS}>Conceptos cobrados ({detalles.length})</span>
                    {detalles.length > 0 ? (
                        <ul className="divide-y divide-slate-100 border border-(--borderColor-input) rounded-xl overflow-hidden max-h-40 overflow-y-auto bg-white">
                            {detalles.map((d) => (
                                <li key={d.idDetalleFactura} className="p-3 flex justify-between items-center gap-3">
                                    <span className="text-slate-800 truncate">
                                        {d.nombreConcepto || `Concepto #${d.idConcepto}`}
                                        <span className="text-gray-500"> × {d.cantidad}</span>
                                    </span>
                                    <span className="font-semibold text-slate-700 shrink-0">{formatearMonto(d.subtotal)}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-slate-500">La factura no tiene conceptos cargados.</p>
                    )}
                </div>

                <div className="flex flex-col gap-1 pt-3 border-t border-(--borderColor-input)">
                    {descuento > 0 && (
                        <div className="flex justify-between items-center gap-3">
                            <span className="text-gray-500 truncate">
                                {factura?.nombreDescuento
                                    ? `Descuento: ${factura.nombreDescuento} (${factura.porcentajeDescuento} %)`
                                    : 'Descuento de la inscripción'}
                            </span>
                            <span className="font-semibold text-slate-700 shrink-0">− {formatearMonto(descuento)}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">Total</span>
                        <span className="text-lg font-extrabold text-(--btnColor-primary)">{formatearMonto(factura?.total)}</span>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
