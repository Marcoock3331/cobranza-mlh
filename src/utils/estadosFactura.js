import { ESTADOS_FACTURA } from "../constants/facturaConstants";

/**
 * Obtiene el estado normalizado.
 */
export const obtenerEstadoFactura = (factura) =>
  factura?.estatus || ESTADOS_FACTURA.PENDIENTE;

/**
 * Factura operativa.
 * Puede recibir operaciones financieras.
 */
export const esFacturaOperativa = (factura) => {
  const estado = obtenerEstadoFactura(factura);

  return (
    estado !== ESTADOS_FACTURA.CANCELADA &&
    estado !== ESTADOS_FACTURA.PAGADA
  );
};

/**
 * Visible en consultas generales.
 */
export const esFacturaVisible = (factura) => {
  return obtenerEstadoFactura(factura) !== ESTADOS_FACTURA.CANCELADA;
};

/**
 * Consume línea de crédito.
 */
export const consumeLineaCredito = (factura) => {
  return esFacturaOperativa(factura);
};

/**
 * Tiene saldo pendiente.
 */
export const tieneSaldoPendiente = (factura) => {
  return (Number(factura?.saldo_pendiente) || 0) > 0;
};

/**
 * Genera recordatorios.
 */
export const generaRecordatorio = (factura) => {
  return (
    esFacturaOperativa(factura) &&
    tieneSaldoPendiente(factura)
  );
};

/**
 * Puede registrar abonos.
 */
export const puedeRegistrarAbono = (factura) => {
  return (
    esFacturaOperativa(factura) &&
    tieneSaldoPendiente(factura)
  );
};

/**
 * Puede editarse.
 */
export const puedeEditarFactura = (factura) => {
  return obtenerEstadoFactura(factura) !== ESTADOS_FACTURA.CANCELADA;
};

/**
 * Puede cancelarse.
 */
export const puedeCancelarFactura = (factura) => {
  return obtenerEstadoFactura(factura) !== ESTADOS_FACTURA.CANCELADA;
};

/**
 * Aparece en Dashboard.
 */
export const apareceEnDashboard = (factura) => {
  return esFacturaVisible(factura);
};

/**
 * Aparece en resumen del cliente.
 */
export const apareceEnResumen = (factura) => {
  return esFacturaVisible(factura);
};

/**
 * Siempre aparece en historial.
 */
export const apareceEnHistorial = () => true;

/**
 * Es factura pagada.
 */
export const esFacturaPagada = (factura) => {
  return obtenerEstadoFactura(factura) === ESTADOS_FACTURA.PAGADA;
};

/**
 * Es factura vencida.
 */
export const esFacturaVencida = (factura) => {
  return obtenerEstadoFactura(factura) === ESTADOS_FACTURA.VENCIDA;
};

/**
 * Es factura pendiente.
 */
export const esFacturaPendiente = (factura) => {
  return obtenerEstadoFactura(factura) === ESTADOS_FACTURA.PENDIENTE;
};

/**
 * Es factura cancelada.
 */
export const esFacturaCancelada = (factura) => {
  return obtenerEstadoFactura(factura) === ESTADOS_FACTURA.CANCELADA;
};

/**
 * Calcula el estado que debe tener una factura
 * después de cualquier operación financiera.
 */
export const calcularEstadoFactura = ({
  saldoPendiente = 0,
  estadoAnterior,
}) => {
  const saldo = Number(saldoPendiente) || 0;

  if (saldo <= 0) {
    return ESTADOS_FACTURA.PAGADA;
  }

  if (estadoAnterior === ESTADOS_FACTURA.VENCIDA) {
    return ESTADOS_FACTURA.VENCIDA;
  }

  return ESTADOS_FACTURA.PENDIENTE;
};

/**
 * Determina si un cambio de estado es válido.
 * (Preparado para futuras reglas.)
 */
export const puedeCambiarEstado = (
  estadoActual,
  estadoNuevo,
) => {
  if (estadoActual === ESTADOS_FACTURA.CANCELADA) {
    return false;
  }

  return estadoActual !== estadoNuevo;
};

/**
 * Indica si una factura puede volver a tener saldo.
 * Útil para eliminar abonos o cancelar notas de crédito.
 */
export const puedeRecuperarSaldo = (factura) => {
  return !esFacturaCancelada(factura);
};

/**
 * Indica si la factura puede afectar métricas financieras.
 */
export const afectaMetricas = (factura) => {
  return !esFacturaCancelada(factura);
};