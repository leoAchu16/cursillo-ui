/**
 * COMO IMPLEMENTAR:
 * <SearchInput value={value} onChange={onChange} placeholder={placeholder}>
 * 
 * @param {*} value -> Valor del input
 * @param {*} onChange -> Función que se ejecuta cuando cambia el input
 * @param {*} placeholder -> Placeholder del input
 * @param {*} variant -> "search" (por defecto) | "default" (mismo estilo que inputs del card)
 * @returns <input>
 */

export const SearchInput = ({ value, onChange, placeholder, variant = "search" }) => {

    const wrapperClass = variant === "default" ? "relative w-full" : "relative w-70"
    const inputClass = variant === "default" ? "w-full pl-10" : "w-full input-search pl-10"

    return (
        <div className={wrapperClass}>
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <i className="icon-[heroicons--magnifying-glass] text-gray-400 text-xl"></i>
            </div>
            <input
                className={inputClass}
                type="search" placeholder={placeholder}
                value={value}
                onChange={onChange}
            />
        </div>
    )
}