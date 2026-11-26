import { useState } from 'react'

const INPUT_CLASS = "w-full px-3 py-2 rounded-lg border border-(--borderColor-input) bg-white text-sm focus:outline-none focus:border-(--btnColor-primary)"
const LABEL_CLASS = "block text-xs font-bold text-gray-600 tracking-wider uppercase mb-1"

// Campo de contraseña con un botón para mostrarla
export const CampoContrasenha = ({ id, label, ...props }) => {
    const [visible, setVisible] = useState(false)
    return (
        <div>
            <label htmlFor={id} className={LABEL_CLASS}>{label}</label>
            <div className="relative">
                <input
                    id={id}
                    name={id}
                    type={visible ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={`${INPUT_CLASS} pr-10`}
                    {...props}
                />
                <button
                    type="button"
                    onClick={() => setVisible(v => !v)}
                    aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-(--btnColor-primary) cursor-pointer"
                >
                    <i className={`${visible ? 'icon-[heroicons--eye-slash]' : 'icon-[heroicons--eye]'} text-lg`}></i>
                </button>
            </div>
        </div>
    )
}
