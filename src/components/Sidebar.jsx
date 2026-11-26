import imgLogo from '../assets/soloLogo.png';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';
import { useEffect, useState } from 'react';
import { NodoBadge } from './NodoBadge';
import { PerfilModal } from './PerfilModal';
import { iniciales } from './perfilUtils';
import { obtenerPerfil } from '../services/usuariosService';
import { getLoggedUser } from '../services/api';

export const Sidebar = ({ role }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const [perfilAbierto, setPerfilAbierto] = useState(false);
    // El token solo trae el email: el nombre se pide una vez al montar
    const [nombre, setNombre] = useState(null);
    const nombreVisible = nombre || getLoggedUser()?.email || "Mi perfil";

    useEffect(() => {
        let activo = true;
        obtenerPerfil()
            .then((perfil) => { if (activo) setNombre(perfil.nombre); })
            .catch(() => { /* sin nombre se muestra el email */ });
        return () => { activo = false; };
    }, []);

    const opcionesPorRol = {
        SECRETARIA: [
            { label: "Dashboard", value: "dashboard", icon: "icon-[heroicons--squares-2x2]", path: "/" },
            { label: "Materias", value: "materias", icon: "icon-[heroicons--book-open]", path: "/materias" },
            { label: "Alumnos", value: "alumnos", icon: "icon-[heroicons--users]", path: "/alumnos" },
            { label: "Inscripciones", value: "inscripciones", icon: "icon-[heroicons--clipboard-document-list]", path: "/inscripciones" },
            { label: "Descuentos", value: "descuentos", icon: "icon-[heroicons--receipt-percent]", path: "/descuentos" },
            { label: "Facturas", value: "facturas", icon: "icon-[heroicons--document-text]", path: "/facturas" },
            { label: "Conceptos", value: "conceptos", icon: "icon-[heroicons--tag]", path: "/conceptos" },
        ],

        PROFESOR: [
            { label: "Dashboard", value: "dashboard", icon: "icon-[heroicons--squares-2x2]", path: "/profesor/dashboard" },
            // activo: también queda marcado en la pantalla de cada materia y en calificar / resultados
            { label: "Materias y Exámenes", value: "materias", icon: "icon-[heroicons--book-open]", path: "/materias/mis-materias", activo: "/materias" }
        ],

        ALUMNO: [
            { label: "Tablero", value: "tablero", icon: "icon-[heroicons--squares-2x2]", path: "/alumno/tablero" },
            { label: "Mis Materias", value: "mis-materias", icon: "icon-[heroicons--book-open]", path: "/alumno/mis-materias" },
            { label: "Mis Exámenes", value: "mis-examenes", icon: "icon-[heroicons--clipboard-document-check]", path: "/alumno/mis-examenes" },
            { label: "Inscribirme", value: "inscribirme", icon: "icon-[heroicons--plus-circle]", path: "/alumno/inscribirme" },
            { label: "Facturación", value: "facturacion", icon: "icon-[heroicons--document-text]", path: "/alumno/facturacion" }
        ]
    }

    const opciones = opcionesPorRol[role] || [];

    const isSelected = (optionPath) => {
        const currentPath = location.pathname;
        return currentPath === optionPath || (optionPath !== "/" && currentPath.startsWith(optionPath));
    };

    const handleLogout = () => {
        authService.logout();
        navigate("/login");
    };

    return (
        <aside className="h-screen w-72 flex flex-col bg-(--bgColor-main) border-r-2 border-gray-300">
            <div className="flex border-b-2 border-gray-300 my-5 pb-5 px-4 items-center gap-2">
                <img src={imgLogo} className="max-h-20 object-contain" alt="Logo" />
                <div className="flex flex-col my-auto ml-2">
                    <h1 className="text-(--btnColor-primary) text-[25px]">CursilloPy</h1>
                    <label className="text-gray-400 capitalize">{role ? role.toLowerCase() : ''}</label>
                </div>
            </div>

            <nav className="ml-0.5">
                <ul>
                    {opciones.map((option) => {
                        const active = isSelected(option.activo || option.path);
                        return (
                            <li
                                key={option.value}
                                className={`flex items-center p-3 cursor-pointer transition-all duration-200
                                    ${active ? 'border-l-4 border-sm border-(--btnColor-primary) text-(--btnColor-primary) bg-(--btnColor-sidebar-hover)'
                                        : 'hover:bg-(--btnColor-sidebar-hover) hover:text-(--textColor)'}`}
                                onClick={() => navigate(option.path)}
                            >
                                {/* 5. Ahora el ícono también se pinta con el color primario si está activo */}
                                <i className={`${option.icon} text-2xl mr-3 ${active ? 'text-(--btnColor-primary)' : 'text-slate-700'}`}></i>
                                <span className="w-full h-full text-sm">{option.label}</span>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="w-full mt-auto flex flex-col border-t-2 border-gray-300">
                <NodoBadge />
                <button
                    type="button"
                    className="w-full flex items-center gap-3 p-3 cursor-pointer text-left hover:bg-(--btnColor-sidebar-hover) hover:text-(--textColor)"
                    onClick={() => setPerfilAbierto(true)}
                    title="Ver mi perfil"
                >
                    <span className="h-9 w-9 shrink-0 rounded-full bg-(--btnColor-primary) text-white flex items-center justify-center text-sm font-bold">
                        {iniciales(nombreVisible)}
                    </span>
                    <span className="min-w-0 flex flex-col">
                        <span className="text-sm font-medium text-slate-800 truncate">{nombreVisible}</span>
                        <span className="text-xs text-gray-500">Ver perfil</span>
                    </span>
                </button>
                <button
                    type="button"
                    className="w-full flex items-center p-3 cursor-pointer text-sm hover:bg-(--btnColor-sidebar-hover) hover:text-(--textColor)"
                    onClick={handleLogout}
                >
                    <i className="icon-[heroicons--arrow-left-start-on-rectangle] text-2xl text-slate-700 mr-3"></i>
                    Cerrar sesión
                </button>
            </div>

            {perfilAbierto && (
                <PerfilModal
                    onClose={() => setPerfilAbierto(false)}
                    onPerfilActualizado={(perfil) => setNombre(perfil.nombre)}
                />
            )}
        </aside>
    );
};