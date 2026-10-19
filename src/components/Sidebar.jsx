import imgLogo from '../assets/soloLogo.png' // Ajusta esta ruta si es necesario
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'


export const Sidebar = ({ role = "profesor" }) => {
    const [selected, setSelected] = useState("dashboard")
    const navigate = useNavigate()


    const opcionesSecretaria = [
        { label: "Dashboard", value: "dashboard", icon: "icon-[heroicons--squares-2x2]", path: "/" },
        { label: "Materias", value: "materias", icon: "icon-[heroicons--book-open]", path: "/materias" },
        { label: "Alumnos", value: "alumnos", icon: "icon-[heroicons--users]", path: "/alumnos" },
        { label: "Inscripciones", value: "inscripciones", icon: "icon-[heroicons--clipboard-document-list]", path: "/inscripciones" },
        { label: "Facturación", value: "facturacion", icon: "icon-[heroicons--banknotes]", path: "/facturacion" }
    ]

    const opcionesProfesor = [
        { label: "Dashboard", value: "dashboard", icon: "icon-[heroicons--squares-2x2]", path: "/materias/mis-materias" },
        { label: "Materias", value: "materias", icon: "icon-[heroicons--book-open]", path: "/materias/mis-materias" },
        { label: "Exámenes", value: "examenes", icon: "icon-[heroicons--clipboard-document-check]", path: "/materias/examenes" }
    ]

    //Elegimos el arreglo dependiendo del rol
    const opcions = role === "profesor" ? opcionesProfesor : opcionesSecretaria;

    function isSelected(value) {
        if (value === selected) return ('border-l-4 border-sm border-(--btnColor-primary) text-(--btnColor-primary) bg-(--btnColor-sidebar-hover)')
        return ('hover:bg-(--btnColor-sidebar-hover) hover:text-(--textColor)')
    }

    function handleNav(option) {
        setSelected(option.value)
        navigate(option.path)
    }

    return (
        <aside className="h-screen w-60 flex flex-col bg-(--bgColor-main) border-r-2 border-gray-300">
            <div className="flex flex-inline border-b-2 border-gray-300 my-8 pb-8 px-4">
                <img src={imgLogo} className="max-h-20 object-contain" alt="Logo" />
                <div className="flex flex-col my-auto ml-2">
                    <h1 className="text-(--btnColor-primary) text-[25px]">CursilloPy</h1>
                    {/* El rol cambia dinámicamente debajo del logo */}
                    <label className="text-gray-400 capitalize">{role}</label>
                </div>
            </div>

            <nav className="ml-0.5">
                <ul>
                    {opcions.map(option => (
                        <li
                            key={option.value}
                            className={`flex items-center p-3 cursor-pointer transition-all duration-200 ${isSelected(option.value)}`}
                            onClick={() => handleNav(option)}
                        >
                            <i className={`${option.icon} text-2xl text-slate-700 mr-3`}></i>
                            <span className="w-full h-full text-sm">{option.label}</span>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Botones inferiores (Ajustes y Salir) */}
            <div className="w-full mt-auto flex flex-col border-t-2 border-gray-300">
                {/* Solo mostramos Ajustes si es profesor, basándome en tu diseño */}
                {role === "profesor" && (
                    <button
                        type="button"
                        className="w-full flex items-center p-3 cursor-pointer text-sm hover:bg-(--btnColor-sidebar-hover) hover:text-(--textColor)"
                        onClick={() => navigate("/ajustes")}
                    >
                        <i className="icon-[heroicons--cog-6-tooth] text-2xl text-slate-700 mr-3"></i>
                        Ajustes
                    </button>
                )}
                <button
                    type="button"
                    className="w-full flex items-center p-3 cursor-pointer text-sm hover:bg-(--btnColor-sidebar-hover) hover:text-(--textColor)"
                    onClick={() => navigate("/login")}
                >
                    <i className="icon-[heroicons--arrow-left-start-on-rectangle] text-2xl text-slate-700 mr-3"></i>
                    Salir
                </button>
            </div>
        </aside>
    )
}