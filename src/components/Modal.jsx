import { useEffect } from "react";

/**
 * Contenedor genérico de modales.
 *
 * @param {boolean} isOpen -> Muestra u oculta el modal
 * @param {function} onClose -> Se llama al presionar ✕, Escape o (opcional) al hacer clic fuera
 * @param {string} title -> Título de la cabecera
 * @param {'sm'|'md'|'lg'|'xl'} size -> Ancho máximo del modal (por defecto 'lg')
 * @param {boolean} closeOnBackdrop -> Si es true, cierra al hacer clic fuera del cuadro.
 *                                    Desactivado por defecto para no perder lo escrito en formularios.
 */
const SIZES = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
};

export const Modal = ({ isOpen, onClose, title, children, size = "lg", closeOnBackdrop = false }) => {
    // Cerrar con la tecla Escape mientras el modal está abierto
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose?.();
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
            onClick={closeOnBackdrop ? onClose : undefined}
        >
            {/* Contenedor principal con bordes redondeados y sombra */}
            <div
                role="dialog"
                aria-modal="true"
                className={`bg-white rounded-2xl shadow-2xl w-full ${SIZES[size] || SIZES.lg} overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200`}
                onClick={(e) => e.stopPropagation()}
            >

                {/* Cabecera del Modal */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-(--borderColor-input) bg-white">
                    <h3 className="text-xl font-bold text-slate-800">{title}</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                        type="button"
                        aria-label="Cerrar"
                    >
                        <i className="icon-[heroicons--x-mark] text-2xl"></i>
                    </button>
                </div>

                {/* Contenido inyectado (Formulario) */}
                {children}
            </div>
        </div>
    );
};
