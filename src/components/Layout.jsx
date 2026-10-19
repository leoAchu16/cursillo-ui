import { Sidebar } from "./Sidebar"
import { Outlet } from "react-router"

export const Layout = () => {
    return (
        <div className="flex flex-row h-screen">
            {/* Puedes cambiar a role="secretaria" cuando quieras ver el otro menú */}
            <Sidebar role="profesor" />
            <main className="flex-1 bg-(--bgColor-main)">
                <Outlet />
            </main>
        </div>
    )
}