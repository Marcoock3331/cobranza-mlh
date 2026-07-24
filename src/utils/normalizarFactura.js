const completarDosDigitos = (valor) => String(valor).padStart(2, "0");

export const fechaAISO = (fecha) => {
  if (!fecha) return "";

  if (fecha?.toDate && typeof fecha.toDate === "function") {
    const valor = fecha.toDate();
    return `${valor.getFullYear()}-${completarDosDigitos(valor.getMonth() + 1)}-${completarDosDigitos(valor.getDate())}`;
  }

  if (fecha instanceof Date) {
    return `${fecha.getFullYear()}-${completarDosDigitos(fecha.getMonth() + 1)}-${completarDosDigitos(fecha.getDate())}`;
  }

  const texto = String(fecha).trim().split(" ")[0];

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return texto;
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(texto)) {
    const [dia, mes, anio] = texto.split("/");
    return `${anio}-${completarDosDigitos(mes)}-${completarDosDigitos(dia)}`;
  }

  return "";
};

const fechaComparable = (fecha) => {
  const iso = fechaAISO(fecha);
  if (!iso) return null;

  const [anio, mes, dia] = iso.split("-").map(Number);
  const valor = new Date(anio, mes - 1, dia);
  valor.setHours(0, 0, 0, 0);
  return valor;
};

export const calcularEstatusVisibleFactura = (factura = {}) => {
  if (
  factura.cancelada === true ||
  factura.estatus === "Cancelada"
) {
  return "Cancelada";
}

  const saldoPendiente = Number(factura.saldo_pendiente) || 0;

  if (saldoPendiente <= 0) {
    return "Pagada";
  }

  const vencimiento = fechaComparable(factura.vencimiento);

  if (!vencimiento) {
    return factura.estatus || "Pendiente";
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return vencimiento < hoy ? "Vencida" : "Pendiente";
};

const normalizarAbono = (abono = {}) => ({
  ...abono,
  fecha: abono.fecha,
});

export const normalizarFacturaData = (id, data = {}) => {
  const abonosRaw = Array.isArray(data.abonos) ? data.abonos : [];

  return {
    id,
    ...data,
    estatus: calcularEstatusVisibleFactura(data),
    emision: fechaAISO(data.emision),
    vencimiento: fechaAISO(data.vencimiento),
    _abonos_raw: abonosRaw,
    abonos: abonosRaw.map(normalizarAbono),
  };
};

export const normalizarFacturaSnapshot = (documento) =>
  normalizarFacturaData(documento.id, documento.data());