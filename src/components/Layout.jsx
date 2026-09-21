import { Sidebar } from "./Sidebar"
import { Outlet } from "react-router"

export const Layout = () => {
    return (
        <div className="flex flex-row h-screen">
            <Sidebar />
            <main className="flex-1 bg-(--bgColor-main)">
                <Outlet />
            </main>
        </div>
    )
}