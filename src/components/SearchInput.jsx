

/**
 * COMO IMPLEMENTAR:
 * <SearchInput value={value} onChange={onChange} placeholder={placeholder}></SearchInput>
 * 
 * @param {*} value -> Valor del input
 * @param {*} onChange -> Función que se ejecuta cuando cambia el input
 * @param {*} placeholder -> Placeholder del input
 * @returns <input>
 */

export const SearchInput = ({ value, onChange, placeholder }) => {

    return (
        <div className="relative w-70">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <i className="icon-[heroicons--magnifying-glass] text-gray-400 text-xl"></i>
            </div>
            <input
                className="w-full input-search pl-10"
                type="search" placeholder={placeholder}
                value={value}
                onChange={onChange}
            />
        </div>
    )
}