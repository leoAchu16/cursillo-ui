import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";

export const NotFoundPage = () => {
    const navigate = useNavigate();

    return (
        <div className="container-page">
            <div className="flex flex-col mt-[24px]">
                <h1>Página no encontrada</h1>
                <h2>La dirección no existe o la página todavía no está disponible</h2>
            </div>
            <button
                type="button"
                className="btn-primary w-fit px-4"
                onClick={() => navigate(authService.getRutaInicio(), { replace: true })}
            >
                Volver al inicio
            </button>
        </div>
    );
};
