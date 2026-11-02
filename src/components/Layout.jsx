import { Sidebar } from "./Sidebar"
import { Outlet } from "react-router"
import { getLoggedUser } from "../services/api"
import { useState, useEffect } from "react"

export const Layout = () => {
    const [rolActual, setRolActual] = useState("profesor");

    useEffect(() => {
        const actualizarRol = () => {
            const usuario = getLoggedUser();
            setRolActual(usuario?.rol?.toLowerCase() || "profesor");
        };

        actualizarRol();
        window.addEventListener("storage", actualizarRol);
        window.addEventListener("tokenChanged", actualizarRol);

        return () => {
            window.removeEventListener("storage", actualizarRol);
            window.removeEventListener("tokenChanged", actualizarRol);
        };
    }, []);

    // Función para alternar manualmente el rol
    const toggleRol = () => {
        setRolActual((rolAnterior) =>
            rolAnterior === "profesor" ? "secretaria" : "profesor"
        );
    };

    return (
        <div className="flex flex-row h-screen">
            <Sidebar role={rolActual} />
            <main className="flex-1 bg-(--bgColor-main) relative overflow-y-auto">

                {/* Botón flotante de prueba */}
                <button
                    onClick={toggleRol}
                    className="absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg shadow-lg hover:bg-slate-700 transition-colors"
                >
                    <i className="icon-[heroicons--arrow-path] text-base"></i>
                    Ver como {rolActual === "profesor" ? "Secretaria" : "Profesor"}
                </button>

                <Outlet />
            </main>
        </div>
    )
}