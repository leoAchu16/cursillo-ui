import { getStoredToken } from '../services/api';

export const BotonToken = ({ onClick }) => {
    const hayToken = Boolean(getStoredToken());

    return (
        <button
            type="button"
            onClick={onClick}
            title="Configurar token JWT"
            className={`flex items-center text-xs font-semibold px-3 py-2 rounded-xl border transition-colors cursor-pointer ${
                hayToken
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
        >
            <i className="icon-[heroicons--key] mr-1.5 text-base"></i>
            {hayToken ? 'Token JWT activo' : 'Configurar token JWT'}
        </button>
    );
};
