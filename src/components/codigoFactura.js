// El número que se muestra de una factura (FAC-001) se arma a partir de su id interno.
export const codigoFactura = (id) => `FAC-${String(id).padStart(3, '0')}`;

// Si lo que se escribe en el buscador es un código (FAC-007, fac007, 007...), se convierte
// al número interno para que el backend lo encuentre. Cualquier otro texto queda igual.
export const normalizarBusqueda = (texto) => {
    const m = /^\s*fac-?\s*0*(\d+)\s*$/i.exec(texto ?? '');
    return m ? m[1] : texto;
};
