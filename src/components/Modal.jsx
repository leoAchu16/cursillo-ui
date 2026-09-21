export const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            {/* Contenedor principal con bordes redondeados y sombra */}
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">

                {/* Cabecera del Modal */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-(--borderColor-input) bg-white">
                    <h3 className="text-xl font-bold text-slate-800">{title}</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                        type="button"
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