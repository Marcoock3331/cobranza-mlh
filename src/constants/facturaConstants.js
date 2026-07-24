// ================================
// Estados de Facturas
// ================================

export const ESTADOS_FACTURA = Object.freeze({
  PENDIENTE: "Pendiente",
  VENCIDA: "Vencida",
  PAGADA: "Pagada",
  CANCELADA: "Cancelada",
  REPROGRAMADA: "Reprogramada",
});

// ================================
// Estados de Línea de Crédito
// ================================

export const ESTADOS_LINEA = Object.freeze({
  SIN_LINEA: "Sin línea",
  ACTIVA: "Activa",
  EXCEDIDA: "Excedida",
});

// ================================
// Tipos de Movimiento de Línea
// ================================

export const TIPOS_MOVIMIENTO_LINEA = Object.freeze({
  ALTA_INICIAL: "ALTA_INICIAL",
  AUMENTO: "AUMENTO",
  DISMINUCION: "DISMINUCION",
  CORRECCION: "CORRECCION",
});