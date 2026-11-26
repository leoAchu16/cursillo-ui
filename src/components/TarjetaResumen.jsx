import { useNavigate } from "react-router-dom";
import { Spinner } from "./Spinner";

/**
 * Tarjeta con un dato destacado, para los paneles de inicio.
 *
 * @param {string} titulo -> Nombre del dato
 * @param {string|number} valor -> Dato a mostrar (si no entra, se ve completo al pasar el mouse)
 * @param {string} icono -> Clase del ícono, ej. 'icon-[heroicons--clock]'
 * @param {boolean} loading -> Si es true, muestra un spinner en lugar del valor
 * @param {string} enlace -> Texto del enlace al pie (opcional)
 * @param {string} ruta -> A dónde lleva el enlace
 * @param {string} nota -> Texto al pie, cuando no hay enlace
 */
export const TarjetaResumen = ({ titulo, valor, icono, loading = false, enlace, ruta, nota }) => {
    const navigate = useNavigate();

    return (
        <div className="card gap-1 min-w-0">
            <div className="flex justify-between items-center gap-2 text-(--btnColor-primary)">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider truncate" title={titulo}>
                    {titulo}
                </span>
                <i className={`${icono} text-2xl shrink-0`}></i>
            </div>
            {/* Alto fijo, para que la tarjeta no cambie de tamaño al terminar de cargar */}
            <div className="h-9 flex items-center min-w-0">
                {loading ? (
                    <Spinner className="h-5 w-5 text-(--btnColor-primary)" />
                ) : (
                    <span className="text-xl font-extrabold text-slate-800 truncate" title={String(valor)}>
                        {valor}
                    </span>
                )}
            </div>
            {enlace ? (
                <button
                    type="button"
                    onClick={() => navigate(ruta)}
                    className="text-xs text-(--btnColor-primary) font-bold hover:underline cursor-pointer flex items-center gap-1 w-fit"
                >
                    {enlace}
                    <i className="icon-[heroicons--arrow-right]"></i>
                </button>
            ) : (
                <span className="text-xs text-gray-500 truncate min-h-4">{nota}</span>
            )}
        </div>
    );
};
