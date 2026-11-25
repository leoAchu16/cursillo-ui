import { Modal } from "./Modal";
import { Spinner } from "./Spinner";

/**
 * USEN ESTE COMPONENTE PARA CONFIRMAR ACCIONES DESTRUCTIVAS (eliminar, anular, etc.)
 * o que no se pueden deshacer (con variant="primary")
 * en lugar de window.confirm o de armar el modal a mano.
 *
 * COMO IMPLEMENTAR:
 * <ConfirmModal
 *     isOpen={Boolean(itemAEliminar)}
 *     onClose={() => setItemAEliminar(null)}
 *     onConfirm={handleEliminar}
 *     loading={eliminando}
 *     title="Eliminar alumno"
 *     message={<>¿Eliminar a <b>{itemAEliminar?.nombre}</b>?</>}
 *     warning="El alumno no podrá volver a iniciar sesión."
 *     confirmText="Eliminar"
 * />
 *
 * @param {boolean} isOpen -> Muestra u oculta el modal
 * @param {function} onClose -> Cancelar / cerrar (se ignora mientras loading es true)
 * @param {function} onConfirm -> Acción a ejecutar al confirmar
 * @param {boolean} loading -> Deshabilita los botones y muestra un spinner
 * @param {string} title -> Título del modal
 * @param {ReactNode} message -> Pregunta principal
 * @param {ReactNode} warning -> Aviso opcional destacado en rojo
 * @param {string} confirmText -> Texto del botón de confirmar (por defecto "Confirmar")
 * @param {string} cancelText -> Texto del botón de cancelar (por defecto "Cancelar")
 * @param {'danger'|'primary'} variant -> Color del botón de confirmar (por defecto 'danger', rojo)
 */
const VARIANTES = {
    danger: "bg-rose-600 hover:bg-rose-700",
    primary: "bg-(--btnColor-primary) hover:opacity-90",
};

export const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    loading = false,
    title = "Confirmar acción",
    message,
    warning,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    variant = "danger",
}) => {
    const handleClose = () => {
        if (!loading) onClose?.();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={title} size="md">
            <div className="p-6 flex flex-col gap-4">
                {message && <div className="text-sm text-slate-700">{message}</div>}
                {warning && (
                    <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-200">
                        {warning}
                    </p>
                )}

                <div className="flex gap-3 justify-end mt-2">
                    <button
                        type="button"
                        disabled={loading}
                        onClick={handleClose}
                        className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-100 font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        disabled={loading}
                        onClick={onConfirm}
                        className={`px-4 py-2 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${VARIANTES[variant] || VARIANTES.danger}`}
                    >
                        {loading && <Spinner className="h-4 w-4 text-white" />}
                        {confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
