import { useEffect, useState } from 'react';

export const NodoBadge = () => {
    const [nodo, setNodo] = useState(null);

    useEffect(() => {
        let activo = true;

        const consultar = async () => {
            try {
                const res = await fetch('/nodo.jsp', { cache: 'no-store', credentials: 'same-origin' });
                const data = await res.json();
                if (activo) setNodo(data.nodo);
            } catch {
                if (activo) setNodo(null);
            }
        };

        consultar();
        const id = setInterval(consultar, 3000);
        return () => {
            activo = false;
            clearInterval(id);
        };
    }, []);

    if (!nodo) return null;

    return (
        <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-300">
            Servidor: <span className="font-semibold text-(--btnColor-primary)">Tomcat {nodo}</span>
        </div>
    );
};