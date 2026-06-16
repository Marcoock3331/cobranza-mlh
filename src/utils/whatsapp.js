export const normalizarTelefonoMX = (telefono) => {
  let numero = (telefono || "").replace(/\D/g, "");

  // Corrige formato viejo tipo +52 1 4431234567
  if (numero.startsWith("521") && numero.length === 13) {
    numero = `52${numero.slice(3)}`;
  }

  // Si ya viene con lada 52 y son 12 dígitos, lo respetamos
  if (numero.startsWith("52") && numero.length === 12) {
    return numero;
  }

  // Si viene como número mexicano normal de 10 dígitos
  if (numero.length === 10) {
    return `52${numero}`;
  }

  return numero;
};

export const generarMensajeWA = (plantilla, factura = {}) => {
  const cliente = factura.cliente || "cliente";
  const folio = factura.folio || "S/F";
  const vencimiento = factura.vencimiento || "los próximos días";

  const saldoNumero = Number(factura.saldo_pendiente || factura.monto || 0);
  const saldo = saldoNumero.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const templates = {
    atrasado: `Hola ${cliente},

Te contactamos para recordarte que tu factura *${folio}* presenta un saldo vencido de *$${saldo} MXN*.

Te invitamos a regularizar tu cuenta lo antes posible para mantener tu historial al corriente.

Quedamos a tus órdenes para cualquier duda.`,

    proximo: `Hola ${cliente},

Este es un recordatorio amigable de que tu factura *${folio}* por el saldo de *$${saldo} MXN* está próxima a vencer el día *${vencimiento}*.

Agradecemos de antemano tu pago puntual.`,

    manual: `Hola ${cliente},

Te contactamos para dar seguimiento a tu cuenta.

Quedamos atentos a cualquier duda o comentario.`,
  };

  return templates[plantilla] || templates.manual;
};