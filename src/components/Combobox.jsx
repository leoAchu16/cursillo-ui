import { useState, useRef, useEffect } from "react"

/**
 * COMO IMPLEMENTAR:
 * <Combobox options={options} value={value} onChange={onChange} placeholder="Seleccionar..." />
 *
 * @param {Array}    options     -> Array de { label, value }
 * @param {*}        value       -> Valor seleccionado actualmente
 * @param {Function} onChange    -> Función que recibe el value seleccionado
 * @param {string}   placeholder -> Texto de placeholder
 */

export const Combobox = ({ options = [], value, onChange, placeholder = "Seleccionar..." }) => {

    const [query, setQuery] = useState("")
    const [open, setOpen] = useState(false)
    const containerRef = useRef(null)

    const selectedLabel = options.find(o => o.value === value)?.label ?? ""

    const filtered = query === ""
        ? options
        : options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))

    function handleSelect(option) {
        onChange(option.value)
        setQuery("")
        setOpen(false)
    }

    function handleInputChange(e) {
        setQuery(e.target.value)
        if (!open) setOpen(true)
        if (e.target.value === "") onChange(null)
    }

    // Cerrar al hacer click fuera
    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false)
                setQuery("")
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    return (
        <div ref={containerRef} className="relative w-full">
            {/* Input visible */}
            <div className="relative">
                <input
                    type="text"
                    className="w-full pr-8"
                    placeholder={open ? "Buscar..." : placeholder}
                    value={open ? query : selectedLabel}
                    onChange={handleInputChange}
                    onFocus={() => setOpen(true)}
                />
                <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setOpen(prev => !prev)}
                    className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                    <i className={`icon-[heroicons--chevron-down] text-base transition-transform duration-200 ${open ? "rotate-180" : ""}`}></i>
                </button>
            </div>

            {/* Dropdown */}
            {open && (
                <ul className="absolute z-50 mt-1 w-full bg-white border border-(--borderColor-input) rounded-md shadow-lg max-h-52 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-gray-400">Sin resultados</li>
                    ) : (
                        filtered.map(option => (
                            <li
                                key={option.value}
                                onClick={() => handleSelect(option)}
                                className={`px-3 py-2 text-sm cursor-pointer transition-colors
                                    ${option.value === value
                                        ? "bg-(--btnColor-primary) text-white"
                                        : "hover:bg-(--btnColor-sidebar-hover) text-(--textColor)"
                                    }`}
                            >
                                {option.label}
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    )
}
