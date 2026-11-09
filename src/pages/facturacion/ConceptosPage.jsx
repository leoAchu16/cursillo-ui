import { useState, useEffect, useCallback } from 'react';
import {
    listarConceptos,
    crearConcepto,
    actualizarConcepto,
    eliminarConcepto,
    mensajeDeError,
} from './services/facturacionService';
import { JwtTokenModal } from '../../components/JwtTokenModal';
import { BotonToken } from '../../components/BotonToken';
import { SearchInput } from '../../components/SearchInput';
import { Modal } from '../../components/Modal';
import { Table } from '../../components/Table';

const TAMANO_PAGINA = 10;
const HEADERS = ['Código', 'Nombre', 'Monto base', 'Acciones'];

const guaranies = new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0,
});

const inputClase =
    'w-full mt-1 p-2.5 text-sm border border-(--borderColor-input) rounded-lg bg-gray-50 focus:bg-white focus:border-(--btnColor-primary) outline-none';

// El código que se muestra (CON-001) se arma a partir del id interno
const codigoConcepto = (id) => `CON-${String(id).padStart(3, '0')}`;

const formularioVacio = () => ({ id: null, nombre: '', montoBase: '' });

export const ConceptosPage = () => {
    const [conceptos, setConceptos] = useState([]);
    const [pagina, setPagina] = useState(0);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalElementos, setTotalElementos] = useState(0);
    const [busqueda, setBusqueda] = useState('');
    const [filtro, setFiltro] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [aviso, setAviso] = useState(null);

    const [formulario, setFormulario] = useState(null); // null = modal cerrado
    const [errorForm, setErrorForm] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [tokenModalAbierto, setTokenModalAbierto] = useState(false);

    const mostrarAviso = (tipo, texto) => {
        setAviso({ tipo, texto });
        setTimeout(() => setAviso(null), 3500);
    };

    // La búsqueda espera un momento antes de consultar, para no pedir en cada tecla
    useEffect(() => {
        const espera = setTimeout(() => {
            setFiltro(busqueda);
            setPagina(0);
        }, 400);
        return () => clearTimeout(espera);
    }, [busqueda]);

    const cargar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const resultado = await listarConceptos({ page: pagina, size: TAMANO_PAGINA, nombre: filtro });
            if (resultado.content.length === 0 && pagina > 0) {
                setPagina(pagina - 1); // se borró el último de la página: volver a la anterior
                return;
            }
            setConceptos(resultado.content);
            setTotalPaginas(resultado.totalPages);
            setTotalElementos(resultado.totalElements);
        } catch (err) {
            setConceptos([]);
            setError(mensajeDeError(err));
        } finally {
            setLoading(false);
        }
    }, [pagina, filtro]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const abrirNuevo = () => {
        setErrorForm(null);
        setFormulario(formularioVacio());
    };

    const abrirEdicion = (c) => {
        setErrorForm(null);
        setFormulario({ id: c.idConcepto, nombre: c.nombre ?? '', montoBase: c.montoBase ?? '' });
    };

    const cambiarCampo = (campo, valor) => setFormulario((prev) => ({ ...prev, [campo]: valor }));

    const guardar = async (e) => {
        e.preventDefault();
        const editando = Boolean(formulario.id);
        const nombre = formulario.nombre.trim();
        const monto = Number(formulario.montoBase);

        if (!nombre) return setErrorForm('Escribí el nombre del concepto.');
        if (formulario.montoBase === '' || Number.isNaN(monto) || monto < 0) {
            return setErrorForm('El monto base debe ser un número mayor o igual a 0.');
        }

        setGuardando(true);
        setErrorForm(null);
        try {
            const datos = { nombre, montoBase: Math.round(monto) };
            if (editando) await actualizarConcepto(formulario.id, datos);
            else await crearConcepto(datos);
            setFormulario(null);
            mostrarAviso('ok', editando ? 'Cambios guardados.' : 'Concepto guardado.');
            await cargar();
        } catch (err) {
            setErrorForm(mensajeDeError(err));
        } finally {
            setGuardando(false);
        }
    };

    const eliminar = async (c) => {
        const confirmado = window.confirm(
            `¿Eliminar el concepto "${c.nombre}"? Dejará de aparecer en las listas.`
        );
        if (!confirmado) return;
        try {
            await eliminarConcepto(c.idConcepto);
            mostrarAviso('ok', 'Concepto eliminado.');
            await cargar();
        } catch (err) {
            mostrarAviso('error', mensajeDeError(err));
        }
    };

    // Datos para el componente Table compartido
    const filas = conceptos.map((c) => [codigoConcepto(c.idConcepto), c.nombre, guaranies.format(c.montoBase ?? 0)]);

    // la primera celda de cada fila es el código del concepto
    const buscarConcepto = (fila) => conceptos.find((c) => codigoConcepto(c.idConcepto) === fila[0]);

    const acciones = [
        { type: 'edit', title: 'Editar', onClick: (fila) => abrirEdicion(buscarConcepto(fila)) },
        { type: 'delete', title: 'Eliminar', onClick: (fila) => eliminar(buscarConcepto(fila)) },
    ];

    return (
        <div className="container-page">
            <div className="flex flex-col mt-[24px]">
                <h1>Conceptos</h1>
                <h2>Catálogo de cuotas, matrículas y derechos que se pueden facturar</h2>
            </div>

            {aviso && (
                <div
                    role="status"
                    className={`px-4 py-3 rounded-xl text-sm font-medium border ${
                        aviso.tipo === 'ok'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : 'bg-rose-50 border-rose-300 text-rose-800'
                    }`}
                >
                    {aviso.texto}
                </div>
            )}

            {error && (
                <div className="bg-rose-50 border border-rose-300 text-rose-800 px-4 py-3 rounded-xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                        <i className="icon-[heroicons--exclamation-circle] text-rose-600 text-xl"></i>
                        <span className="text-sm">{error}</span>
                    </div>
                    <button
                        type="button"
                        onClick={cargar}
                        className="text-xs bg-rose-600 text-white px-2 py-1 rounded-md hover:bg-rose-700 font-semibold cursor-pointer"
                    >
                        Reintentar
                    </button>
                </div>
            )}

            <div className="flex flex-row justify-between items-center gap-4">
                <SearchInput
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por nombre..."
                />
                <div className="flex items-center gap-3 shrink-0">
                    <BotonToken onClick={() => setTokenModalAbierto(true)} />
                    <button
                        type="button"
                        onClick={abrirNuevo}
                        className="flex items-center bg-(--btnColor-primary) text-(--textColor-secondary) rounded-xl p-2 px-4 shadow-md hover:bg-(--btnColor-primary-hover) transition-colors cursor-pointer shrink-0"
                    >
                        <i className="icon-[heroicons--plus] text-white mr-2"></i>
                        Nuevo concepto
                    </button>
                </div>
            </div>

            {loading && (
                <div className="flex items-center gap-2 text-sm text-(--btnColor-primary)">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    <span>Cargando conceptos...</span>
                </div>
            )}

            <Table
                headers={HEADERS}
                data={filas}
                actions={acciones}
                currentPage={pagina + 1}
                totalPages={totalPaginas}
                totalElements={totalElementos}
                onPrevPage={() => setPagina((p) => Math.max(0, p - 1))}
                onNextPage={() => setPagina((p) => (p + 1 < totalPaginas ? p + 1 : p))}
            />

            <Modal
                isOpen={formulario !== null}
                onClose={() => setFormulario(null)}
                title={formulario?.id ? 'Editar concepto' : 'Nuevo concepto'}
            >
                {formulario && (
                    <form onSubmit={guardar} className="p-6 flex flex-col gap-4">
                        <div>
                            <label htmlFor="concepto-nombre" className="text-xs font-bold text-gray-500 uppercase">
                                Nombre
                            </label>
                            <input
                                id="concepto-nombre"
                                type="text"
                                value={formulario.nombre}
                                onChange={(e) => cambiarCampo('nombre', e.target.value)}
                                placeholder="Ej.: Cuota 1"
                                className={inputClase}
                            />
                        </div>
                        <div>
                            <label htmlFor="concepto-monto" className="text-xs font-bold text-gray-500 uppercase">
                                Monto base (Gs.)
                            </label>
                            <input
                                id="concepto-monto"
                                type="number"
                                min="0"
                                value={formulario.montoBase}
                                onChange={(e) => cambiarCampo('montoBase', e.target.value)}
                                placeholder="150000"
                                className={inputClase}
                            />
                        </div>

                        {errorForm && (
                            <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                                {errorForm}
                            </p>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setFormulario(null)}
                                className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-black cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button type="submit" disabled={guardando} className="btn-primary text-xs px-4 py-2">
                                {guardando ? 'Guardando...' : formulario.id ? 'Guardar cambios' : 'Guardar concepto'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            <JwtTokenModal
                isOpen={tokenModalAbierto}
                onClose={() => setTokenModalAbierto(false)}
                onTokenSaved={() => cargar()}
            />
        </div>
    );
};
