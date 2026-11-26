import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { toast } from "sonner";
import { authService } from "../services/authService";

/**
 * Agrupa rutas que solo puede ver un rol. Si el usuario no lo tiene, vuelve a su página de inicio.
 * Es solo para la navegación: los permisos reales los controla el backend.
 *
 * COMO IMPLEMENTAR:
 * <Route element={<RutaPorRol rol="SECRETARIA" />}>
 *     <Route path="alumnos" element={<StudentsPage />} />
 * </Route>
 *
 * @param {'SECRETARIA'|'PROFESOR'|'ALUMNO'} rol -> Rol necesario (sirve el principal o uno adicional)
 */
export const RutaPorRol = ({ rol }) => {
    const usuario = authService.getCurrentUser();
    const permitido = Boolean(usuario?.roles.includes(rol));
    const denegado = Boolean(usuario) && !permitido;

    useEffect(() => {
        // El id evita que el aviso se repita (StrictMode ejecuta los efectos dos veces)
        if (denegado) toast.error("No tenés permisos para ver esa página.", { id: "ruta-sin-permiso" });
    }, [denegado]);

    // Sin sesión, getRutaInicio devuelve /login
    return permitido ? <Outlet /> : <Navigate to={authService.getRutaInicio()} replace />;
};
