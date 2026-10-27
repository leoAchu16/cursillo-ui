import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { getStoredToken, setStoredToken } from '../services/api';

export const JwtTokenModal = ({ isOpen, onClose, onTokenSaved }) => {
    const [token, setToken] = useState('');

    useEffect(() => {
        if (isOpen) {
            setToken(getStoredToken() || '');
        }
    }, [isOpen]);

    const handleSave = (e) => {
        e.preventDefault();
        setStoredToken(token);
        if (onTokenSaved) {
            onTokenSaved(token);
        }
        onClose();
    };

    const handleClear = () => {
        setStoredToken('');
        setToken('');
        if (onTokenSaved) {
            onTokenSaved('');
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Configuración de Token JWT">
            <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
                <p className="text-xs text-gray-600">
                    El backend Spring Security del <strong>MS Notas</strong> requiere autenticación con JWT.
                    Pega aquí el token (obtenido de Swagger UI o Login) para que tus peticiones se autoricen correctamente:
                </p>

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Token JWT (Bearer)</label>
                    <textarea
                        rows={4}
                        required
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        className="w-full mt-1 p-2.5 text-xs font-mono border border-(--borderColor-input) rounded-lg bg-gray-50 focus:bg-white focus:border-(--btnColor-primary) outline-none resize-none"
                    />
                </div>

                <div className="flex justify-between items-center mt-2 pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={handleClear}
                        className="text-xs text-red-600 hover:underline font-semibold"
                    >
                        Borrar Token
                    </button>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-black"
                        >
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary text-xs px-4 py-2">
                            <i className="icon-[heroicons--key] mr-1.5 text-base"></i>
                            Guardar Token
                        </button>
                    </div>
                </div>
            </form>
        </Modal>
    );
};
