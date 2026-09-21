import { useState } from 'react'

/**
 * 
 * @param {*} options -> Array de objetos con las opciones [{label: 'option1', value: 'option1'}, {label: 'option2', value: 'option2'}]
 * @param {*} value -> Valor actual del segmento de control (segmented control)
 * @param {*} onChange -> Funcion para actualizar el valor del segmento de control (segmented control)
 * @returns 
 */
export const SegmentedControl = ({ options, value, onChange }) => {
    return (
        <div className='inline-flex w-fit mx-auto p-1 bg-(--bgColor-main) border border-(--borderColor-input) rounded-lg gap-1'>
            {options.map((option) => {
                const isSelected = value === option.value
                return (
                    <button
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all duration-200 cursor-pointer
                            ${isSelected
                                ? 'bg-white text-(--btnColor-primary) shadow-sm'
                                : 'text-gray-700 hover:text-black hover:bg-white/40'}`}>
                        {option.label}</button>
                )
            })}
        </div>
    )
}