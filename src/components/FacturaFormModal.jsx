import { Modal } from './Modal';
import { codigoFactura } from './codigoFactura';

const METODOS_PAGO = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'];
const inputClase = 'w-full mt-1 p-2.5 text-sm border border-(--borderColor-input) rounded-lg bg-gray-50 focus:bg-white focus:border-(--btnColor-primary) outline-none';
const etiquetaClase = 'text-xs font-bold text-gray-500 uppercase';

export const FacturaFormModal = ({
    formulario,
    setFormulario,
    lineas,
    conceptos,
    errorConceptos,
    errorForm,
    guardando,
    guaranies,
    totalLineas,
    onGuardar,
    onCambiarCampo,
    alumnos = [],
    inscripciones = [],
    cargandoInscripciones = false,
    etiquetaInscripcion = () => '',
    onElegirAlumno,
    onCambiarLinea,
    onAgregarLinea,
    onQuitarLinea,
    onClose,
}) => {
    if (!formulario) return null;

    const editando = Boolean(formulario.id);

    return (
        <Modal
            isOpen={Boolean(formulario)}
            onClose={onClose}
            title={editando ? `Editar factura ${codigoFactura(formulario.id)}` : 'Emitir Nueva Factura'}
        >
            <form onSubmit={onGuardar} className="p-6 flex flex-col gap-4">
                {editando ? (
                    <div>
                        <span className={etiquetaClase}>Alumno</span>
                        <p className="mt-1 p-2.5 text-sm rounded-lg bg-gray-100 text-slate-700">
                            {formulario.nombreAlumno ?? 'Alumno'}
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="f-alumno" className={etiquetaClase}>Alumno</label>
                                <select
                                    id="f-alumno"
                                    value={formulario.idAlumno}
                                    onChange={(e) => onElegirAlumno(e.target.value)}
                                    className={inputClase}
                                >
                                    <option value="">Elegí un alumno</option>
                                    {alumnos.map((a) => (
                                        <option key={a.idAlumno} value={a.idAlumno}>{a.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="f-inscripcion" className={etiquetaClase}>Inscripción a cobrar</label>
                                <select
                                    id="f-inscripcion"
                                    value={formulario.idInscripcion}
                                    onChange={(e) => onCambiarCampo('idInscripcion', e.target.value)}
                                    disabled={!formulario.idAlumno || cargandoInscripciones}
                                    className={`${inputClase} disabled:opacity-60`}
                                >
                                    <option value="">
                                        {cargandoInscripciones ? 'Cargando...' : 'Elegí una inscripción'}
                                    </option>
                                    {inscripciones.map((i) => (
                                        <option key={i.idInscripcion} value={i.idInscripcion}>
                                            {etiquetaInscripcion(i)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {formulario.idAlumno && !cargandoInscripciones && inscripciones.length === 0 && (
                            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                Este alumno no tiene inscripciones pendientes de pago.
                            </p>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label htmlFor="f-ruc" className={etiquetaClase}>RUC</label>
                        <input
                            id="f-ruc"
                            type="text"
                            maxLength={10}
                            value={formulario.ruc}
                            onChange={(e) => onCambiarCampo('ruc', e.target.value)}
                            placeholder="1234567-8"
                            className={inputClase}
                        />
                    </div>
                    <div>
                        <label htmlFor="f-metodo" className={etiquetaClase}>Método de pago</label>
                        <select
                            id="f-metodo"
                            value={formulario.metodoPago}
                            onChange={(e) => onCambiarCampo('metodoPago', e.target.value)}
                            className={inputClase}
                        >
                            {METODOS_PAGO.map((m) => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="f-fecha" className={etiquetaClase}>Fecha de emisión</label>
                        <input
                            id="f-fecha"
                            type="date"
                            value={formulario.fechaEmision}
                            onChange={(e) => onCambiarCampo('fechaEmision', e.target.value)}
                            className={inputClase}
                        />
                    </div>
                </div>

                {editando ? (
                    <>
                        <div className="sm:w-1/3">
                            <label htmlFor="f-total" className={etiquetaClase}>Total (Gs.)</label>
                            <input
                                id="f-total"
                                type="number"
                                min="0"
                                value={formulario.total}
                                onChange={(e) => onCambiarCampo('total', e.target.value)}
                                className={inputClase}
                            />
                        </div>
                        <p className="text-xs text-gray-500">
                            Al editar se modifican los datos generales. Los conceptos no se editan desde aquí.
                        </p>
                    </>
                ) : (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <span className={etiquetaClase}>Conceptos a cobrar</span>
                            <button
                                type="button"
                                onClick={onAgregarLinea}
                                className="text-xs font-semibold text-(--btnColor-primary) hover:underline cursor-pointer"
                            >
                                + Agregar concepto
                            </button>
                        </div>

                        {errorConceptos && (
                            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                No se pudo cargar la lista de conceptos: {errorConceptos}
                            </p>
                        )}

                        {lineas.map((linea, i) => (
                            <div key={i} className="flex flex-wrap items-end gap-2">
                                <div className="flex-1 min-w-40">
                                    <select
                                        value={linea.idConcepto}
                                        onChange={(e) => onCambiarLinea(i, 'idConcepto', e.target.value)}
                                        aria-label={`Concepto de la línea ${i + 1}`}
                                        className={inputClase}
                                    >
                                        <option value="">Elegí un concepto</option>
                                        {conceptos.map((c) => (
                                            <option key={c.idConcepto} value={c.idConcepto}>
                                                {c.nombre} ({guaranies.format(c.montoBase ?? 0)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-20">
                                    <input
                                        type="number"
                                        min="1"
                                        value={linea.cantidad}
                                        onChange={(e) => onCambiarLinea(i, 'cantidad', e.target.value)}
                                        aria-label={`Cantidad de la línea ${i + 1}`}
                                        className={inputClase}
                                    />
                                </div>
                                <div className="w-32">
                                    <input
                                        type="number"
                                        min="0"
                                        value={linea.subtotal}
                                        onChange={(e) => onCambiarLinea(i, 'subtotal', e.target.value)}
                                        aria-label={`Subtotal de la línea ${i + 1}`}
                                        className={inputClase}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onQuitarLinea(i)}
                                    title="Quitar concepto"
                                    className="p-2 rounded-lg hover:bg-red-50 cursor-pointer"
                                >
                                    <i className="icon-[heroicons--x-mark] text-lg text-red-600"></i>
                                </button>
                            </div>
                        ))}

                        <p className="text-sm font-bold text-slate-800 text-right mt-1">
                            Total Calculado: <span className="text-emerald-700">{guaranies.format(totalLineas)}</span>
                        </p>
                    </div>
                )}

                {errorForm && (
                    <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                        {errorForm}
                    </p>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-black cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button type="submit" disabled={guardando} className="btn-primary text-xs px-4 py-2">
                        {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Emitir factura'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
