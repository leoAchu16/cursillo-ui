import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table } from '../components/Table';
import { Spinner } from '../components/Spinner';
import { codigoFactura } from '../components/codigoFactura';
import { cargarResumenSecretaria } from '../services/dashboardService';

const guaranies = new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0,
});

const HEADERS = ['Código', 'Alumno', 'Fecha', 'Método', 'Total'];

const BADGE_METODO = {
    EFECTIVO: 'badge badge-success',
    TARJETA: 'badge badge-info',
    TRANSFERENCIA: 'badge badge-warning',
};

const formatearFecha = (iso) => {
    if (!iso) return '-';
    const [anio, mes, dia] = String(iso).slice(0, 10).split('-');
    return `${dia}/${mes}/${anio}`;
};

export const DashboardPageSecretary = () => {
    const navigate = useNavigate();
    const [resumen, setResumen] = useState(null);
    const [loading, setLoading] = useState(true);

    const cargar = useCallback(async () => {
        setLoading(true);
        const datos = await cargarResumenSecretaria();
        setResumen(datos);
        setLoading(false);
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const mostrar = (valor) => (valor === null || valor === undefined ? '-' : valor);

    const tarjetas = [
        {
            titulo: 'Alumnos',
            valor: mostrar(resumen?.totalAlumnos),
            enlace: 'Ver alumnos',
            ruta: '/alumnos',
            icono: 'icon-[heroicons--academic-cap]',
        },
        {
            titulo: 'Inscripciones',
            valor: mostrar(resumen?.totalInscripciones),
            enlace: 'Ver inscripciones',
            ruta: '/inscripciones',
            icono: 'icon-[heroicons--clipboard-document-list]',
        },
        {
            titulo: 'Facturas emitidas',
            valor: mostrar(resumen?.totalFacturas),
            enlace: 'Ver facturas',
            ruta: '/facturas',
            icono: 'icon-[heroicons--document-text]',
        },
        {
            titulo: 'Facturado este mes',
            valor: resumen?.facturadoMes == null ? '-' : guaranies.format(resumen.facturadoMes),
            enlace: 'Ver detalle',
            ruta: '/facturas',
            icono: 'icon-[heroicons--banknotes]',
        },
    ];

    const filas = (resumen?.ultimasFacturas ?? []).map((f) => [
        codigoFactura(f.idFactura),
        f.nombreAlumno ?? resumen.nombresAlumnos[f.idAlumno] ?? `Alumno N° ${f.idAlumno}`,
        formatearFecha(f.fechaEmision),
        <span className={BADGE_METODO[f.metodoPago] || 'badge'}>{f.metodoPago}</span>,
        guaranies.format(f.total ?? 0),
    ]);

    return (
        <div className="container-page">
            <div className="flex flex-col mt-[24px]">
                <h1 className="text-2xl font-bold">Panel de Secretaría</h1>
                <h2 className="text-sm text-gray-500">Resumen general de alumnos, inscripciones y facturación</h2>
            </div>

            {loading && (
                <div className="flex items-center gap-2 text-sm text-(--btnColor-primary)">
                    <Spinner className="h-4 w-4 text-(--btnColor-primary)" />
                    <span>Cargando resumen...</span>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {tarjetas.map((t) => (
                    <div key={t.titulo} className="card !p-6 flex flex-row items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.titulo}</span>
                            <span className="text-3xl font-extrabold text-slate-800 mt-1">{t.valor}</span>
                            <button
                                type="button"
                                onClick={() => navigate(t.ruta)}
                                className="flex items-center gap-1 text-xs text-(--btnColor-primary) font-bold mt-2 hover:underline cursor-pointer w-fit"
                            >
                                {t.enlace}
                                <i className="icon-[heroicons--arrow-right]"></i>
                            </button>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-teal-50 text-(--btnColor-primary) flex items-center justify-center">
                            <i className={`${t.icono} text-3xl`}></i>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">Últimas facturas</h3>
                    <button
                        type="button"
                        onClick={() => navigate('/facturas')}
                        className="text-xs text-(--btnColor-primary) font-bold hover:underline cursor-pointer"
                    >
                        Ver todas
                    </button>
                </div>

                {resumen?.errorUltimas && (
                    <div className="bg-rose-50 border border-rose-300 text-rose-800 px-4 py-3 rounded-xl flex items-center justify-between shadow-sm">
                        <span className="text-sm">No se pudieron cargar las facturas recientes.</span>
                        <button
                            type="button"
                            onClick={cargar}
                            className="text-xs bg-rose-600 text-white px-2 py-1 rounded-md hover:bg-rose-700 font-semibold cursor-pointer"
                        >
                            Reintentar
                        </button>
                    </div>
                )}

                <Table headers={HEADERS} data={filas} showPagination={false} />
            </div>
        </div>
    );
};
