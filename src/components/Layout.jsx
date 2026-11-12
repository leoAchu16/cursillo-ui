import { Sidebar } from "./Sidebar"
import { Outlet } from "react-router"
import { authService } from '../services/authService'

export const Layout = () => {
    const usuario = authService.getCurrentUser();
    if (!usuario)
        return <Navigate to="/login" replace />;


    return (
        <div className="flex flex-row h-screen">
            <Sidebar role={usuario.rol} />
            <main className="flex-1 bg-(--bgColor-main) relative overflow-y-auto">
                <Outlet />
            </main>
        </div>
    )
}