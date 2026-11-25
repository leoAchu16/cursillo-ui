import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
    listarFacturas,
    METODOS_PAGO,
} from './services/facturacionService';
import { SearchInput } from '../../components/SearchInput';
import { Table } from '../../components/Table';
import { FacturaDetalleModal } from '../../components/FacturaDetalleModal';
import { codigoFactura, normalizarBusqueda } from '../../components/codigoFactura';

// Filas por página (= size enviado al backend), igual que en las otras páginas
const FACTURAS_POR_PAGINA = 8;

// Valor a mostrar cuando un campo viene vacío
const SIN_DATO = '—';

const BADGE_METODO = {
    EFECTIVO: 'badge badge-success',
    TARJETA: 'badge badge-info',
    TRANSFERENCIA: 'badge badge-warning',
};

// "2026-11-20" -> "20/11/2026". Sin new Date(), que correría un día por la zona horaria.
const formatearFecha = (fecha) => {
    if (!fecha) return SIN_DATO;
    const [anio, mes, dia] = String(fecha).slice(0, 10).split('-');
    return anio && mes && dia ? `${dia}/${mes}/${anio}` : String(fecha);
};

const formatearMonto = (monto) =>
    monto === undefined || monto === null ? SIN_DATO : `Gs. ${Number(monto).toLocaleString('es-PY')}`;

export const FacturasPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Con /facturas?q=11/2026 se abre con esa búsqueda ya hecha
    const [busqueda, setBusqueda] = useState(() => searchParams.get('q') || '');  // lo que se escribe en el input
    const [filtro, setFiltro] = useState(busqueda); // lo que se manda al backend (con debounce)
    const [metodo, setMetodo] = useState('');
    const [facturas, setFacturas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0); // 0-based, como lo espera Spring
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);

    const [facturaVer, setFacturaVer] = useState(null); // factura abierta en el detalle

    const headers = ['Código', 'Alumno', 'RUC', 'Fecha', 'Método', 'Total', 'Acciones'];

    // La búsqueda espera un momento antes de consultar, para no pedir en cada tecla
    useEffect(() => {
        const espera = setTimeout(() => {
            setFiltro(busqueda);
            setPage(0);
        }, 400);
        return () => clearTimeout(espera);
    }, [busqueda]);

    // Facturas: se vuelven a pedir al cambiar de página o de filtros
    useEffect(() => {
        // Evita actualizar el estado con una respuesta vieja (cambio rápido de página,
        // desmontaje del componente o doble ejecución de StrictMode)
        let ignore = false;

        const cargar = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await listarFacturas({
                    page,
                    size: FACTURAS_POR_PAGINA,
                    q: normalizarBusqueda(filtro),
                    metodoPago: metodo,
                });
                if (ignore) return;
                setFacturas(data.content);
                setTotalPages(Math.max(1, data.totalPages));
                setTotalElements(data.totalElements);
            } catch (err) {
                if (ignore) return;
                console.error('Error al cargar facturas:', err);
                const mensaje = err.response?.status === 403
                    ? 'No tenés permisos para ver las facturas'
                    : 'No se pudieron cargar las facturas';
                setFacturas([]);
                setError(mensaje);
                toast.error(mensaje);
            } finally {
                if (!ignore) setLoading(false);
            }
        };
        cargar();

        return () => { ignore = true; };
    }, [page, filtro, metodo]);

    // Filas para la tabla: mismo orden que facturas, así el índice identifica a la factura
    const filas = facturas.map((f) => [
        codigoFactura(f.idFactura),
        f.nombreAlumno || `Alumno #${f.idAlumno}`,
        f.ruc || SIN_DATO,
        formatearFecha(f.fechaEmision),
        <span className={BADGE_METODO[f.metodoPago] || 'badge'}>{f.metodoPago || SIN_DATO}</span>,
        formatearMonto(f.total),
    ]);

    // Una factura emitida es un comprobante: solo se puede ver
    const tableActions = [
        { type: 'view', title: 'Ver', onClick: (_, index) => setFacturaVer(facturas[index]) },
    ];

    return (
        <div className="container-page">
            <div className="flex flex-col mt-[24px]">
                <h1>Facturas</h1>
                <h2>Emisión y consulta de comprobantes a estudiantes</h2>
            </div>

            <div className="flex flex-row justify-between items-center gap-4">
                <div className="flex flex-row items-center gap-3">
                    <SearchInput
                        placeholder="Alumno, RUC, fecha o total"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                    <select
                        value={metodo}
                        onChange={(e) => { setMetodo(e.target.value); setPage(0); }}
                        aria-label="Filtrar por método de pago"
                        className="px-3 py-2.5 rounded-xl border border-(--borderColor-input) bg-white text-sm text-gray-700 focus:outline-none focus:border-(--btnColor-primary) shadow-sm"
                    >
                        <option value="">Todos los métodos</option>
                        {METODOS_PAGO.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <button className="btn-primary cursor-pointer" onClick={() => navigate('/facturas/nueva')}>
                    <i className="icon-[heroicons--plus] text-white mr-2"></i>
                    Nueva factura
                </button>
            </div>

            <Table
                headers={headers}
                data={filas}
                actions={tableActions}
                loading={loading}
                emptyMessage={error || 'No se encontraron facturas'}
                currentPage={page + 1}
                totalPages={totalPages}
                totalElements={totalElements}
                onPrevPage={() => setPage(p => Math.max(0, p - 1))}
                onNextPage={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            />

            <FacturaDetalleModal
                factura={facturaVer}
                onClose={() => setFacturaVer(null)}
                formatearFecha={formatearFecha}
                formatearMonto={formatearMonto}
            />
        </div>
    );
};
