import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";

import { db } from "../config/firebase";
import { normalizarFacturaSnapshot } from "../utils/normalizarFactura";
import {
  esFacturaCancelada,
  esFacturaVencida,
} from "../utils/estadosFactura";

const CLIENTES_COLLECTION = "clientes";
const FACTURAS_COLLECTION = "facturas";

const crearTimestampInicio = (fecha) => {
  if (!fecha) return null;
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return Timestamp.fromDate(new Date(anio, mes - 1, dia, 0, 0, 0, 0));
};

const crearTimestampFin = (fecha) => {
  if (!fecha) return null;
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return Timestamp.fromDate(new Date(anio, mes - 1, dia, 23, 59, 59, 999));
};

const aplicarFiltroGrupo = (clientes, grupo) => {
  if (!grupo || grupo === "TODOS") {
    return clientes;
  }
  return clientes.filter((cliente) => cliente.grupo === grupo);
};

const normalizarFecha = (fechaRaw) => {
  if (!fechaRaw) return null;
  if (fechaRaw?.toDate && typeof fechaRaw.toDate === "function") {
    return fechaRaw.toDate();
  }
  if (typeof fechaRaw?.seconds === "number") {
    return new Date(fechaRaw.seconds * 1000);
  }
  if (fechaRaw instanceof Date) {
    return isNaN(fechaRaw.getTime()) ? null : fechaRaw;
  }
  if (typeof fechaRaw === "string") {
    const fecha = new Date(fechaRaw);
    return isNaN(fecha.getTime()) ? null : fecha;
  }
  return null;
};

// ==========================================
// FUNCIONES AUXILIARES PRIVADAS
// ==========================================

const _ordenarPorFechaDesc = (a, b) => {
  const fechaA = normalizarFecha(a.fecha) || new Date(0);
  const fechaB = normalizarFecha(b.fecha) || new Date(0);
  return fechaB.getTime() - fechaA.getTime();
};

const _generarEstatusVisual = (saldo, vencimientoStr) => {
  if (saldo <= 0) return "PAGADA";
  
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  const fechaVenc = vencimientoStr ? new Date(vencimientoStr) : null;
  
  if (fechaVenc instanceof Date && !isNaN(fechaVenc)) {
    fechaVenc.setHours(0, 0, 0, 0);
    const dias = Math.floor((hoy - fechaVenc) / (1000 * 60 * 60 * 24));
    
    if (dias > 0) return `VENCIDA (${dias}d)`;
    if (dias === 0) return "VENCE HOY";
  }
  
  return "PENDIENTE";
};

const _procesarHistorialesFactura = (factura, ctx) => {
  if (Array.isArray(factura.abonos)) {
    factura.abonos.forEach((abono) => {
      ctx.montoRecuperado += Number(abono.monto ?? 0);
      ctx.historialAbonos.push({ ...abono, factura: factura.folio });
    });
  }

  if (Array.isArray(factura.notas_credito)) {
    factura.notas_credito.forEach((nota) => {
      if (nota.cancelada !== true) {
        ctx.numNotasCredito++;
        ctx.montoTotalNotas += Number(nota.monto || 0);
        ctx.historialNotas.push({ ...nota, factura: factura.folio });
      }
    });
  }
};

const _procesarColeccionFacturas = (facturasCliente) => {
  const ctx = {
    deudaActual: 0, saldoVencido: 0, totalFacturado: 0, montoRecuperado: 0,
    facturasVencidasCount: 0, numNotasCredito: 0, montoTotalNotas: 0,
    historialAbonos: [], historialNotas: [], facturasProcesadas: []
  };

  facturasCliente.forEach((factura) => {
    const saldo = Number(factura.saldo_pendiente ?? 0);
    const total = Number(factura.monto_total ?? 0);
    const pagado = Number(factura.monto_pagado ?? total - saldo);

    ctx.deudaActual += saldo;
    ctx.totalFacturado += total;

    if (esFacturaVencida(factura)) {
      ctx.saldoVencido += saldo;
      ctx.facturasVencidasCount++;
    }

    _procesarHistorialesFactura(factura, ctx);

    ctx.facturasProcesadas.push({
      folio: factura.folio,
      emision: normalizarFecha(factura.emision),
      vencimiento: normalizarFecha(factura.vencimiento),
      monto: total,
      pagado,
      saldoPendiente: saldo,
      estado: factura.estatus || "Pendiente",
      estadoVisual: _generarEstatusVisual(saldo, factura.vencimiento),
    });
  });

  return ctx;
};

// ==========================================
// SERVICIO EXPORTADO
// ==========================================

export const reportesService = {
  async obtenerClientes(grupo = "TODOS") {
    const snapshot = await getDocs(collection(db, CLIENTES_COLLECTION));
    const clientes = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((cliente) => cliente.activo !== false && cliente.estatus !== "Inactivo");
    return aplicarFiltroGrupo(clientes, grupo);
  },

  async obtenerTodosLosClientes(grupo = "TODOS") {
    const snapshot = await getDocs(collection(db, CLIENTES_COLLECTION));
    const clientes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return aplicarFiltroGrupo(clientes, grupo);
  },

  async obtenerClientesReporte(grupo = "TODOS") {
    return this.obtenerTodosLosClientes(grupo);
  },

  async obtenerFacturas({ fechaInicio = "", fechaFin = "" } = {}) {
    const restricciones = [];
    const inicio = crearTimestampInicio(fechaInicio);
    const fin = crearTimestampFin(fechaFin);

    if (inicio) restricciones.push(where("emision", ">=", inicio));
    if (fin) restricciones.push(where("emision", "<=", fin));

    const consulta = query(collection(db, FACTURAS_COLLECTION), ...restricciones);
    const snapshot = await getDocs(consulta);

    return snapshot.docs
      .map(normalizarFacturaSnapshot)
      .filter((factura) => !esFacturaCancelada(factura));
  },

  async obtenerResumenClientes({ fechaInicio = "", fechaFin = "", grupo = "TODOS" } = {}) {
    const clientes = await this.obtenerClientes(grupo);
    const facturas = await this.obtenerFacturas({ fechaInicio, fechaFin });

    return clientes.map((cliente) => {
      const facturasCliente = facturas.filter((f) => f.cliente_id === cliente.id);
      let montoVigente = 0;
      let montoVencido = 0;
      let montoRecuperado = 0;

      facturasCliente.forEach((factura) => {
        const saldo = Number(factura.saldo_pendiente ?? 0);
        const total = Number(factura.monto_total ?? 0);
        const pagado = Number(factura.monto_pagado ?? total - saldo);
        montoRecuperado += pagado;

        if (esFacturaVencida(factura)) montoVencido += saldo;
        else montoVigente += saldo;
      });

      return {
        numeroCliente: cliente.numero_cliente || "",
        nombre: cliente.nombre || "",
        grupo: cliente.grupo || "",
        montoVigente,
        montoVencido,
        montoRecuperado,
        ultimaFechaPago: cliente.fecha_ultimo_pago || "",
        montoUltimoPago: Number(cliente.monto_ultimo_pago || 0),
      };
    });
  },

  async obtenerExpedienteFinancieroCliente({ cliente = {}, fechaInicio = "", fechaFin = "" } = {}) {
    if (!cliente || !cliente.id) throw new Error("Cliente inválido o no proporcionado.");

    const facturas = await this.obtenerFacturas({ fechaInicio, fechaFin });
    const facturasCliente = facturas.filter((f) => f.cliente_id === cliente.id);

    const ctx = _procesarColeccionFacturas(facturasCliente);

    const limiteCredito = Number(cliente.limite_credito ?? 0);
    const deudaVigente = Math.max(0, ctx.deudaActual - ctx.saldoVencido);
    const creditoDisponible = limiteCredito > 0 ? Math.max(0, limiteCredito - ctx.deudaActual) : 0;

    ctx.historialAbonos.sort(_ordenarPorFechaDesc);
    ctx.historialNotas.sort(_ordenarPorFechaDesc);

    const ultimoPagoRaw = ctx.historialAbonos.length > 0 ? ctx.historialAbonos[0] : null;

    return {
      cliente: {
        numeroCliente: cliente.numero_cliente || "",
        nombre: cliente.nombre || "",
        grupo: cliente.grupo || "",
        rfc: cliente.rfc || "",
        correo: cliente.correo || "",
        telefono: cliente.telefono || "",
        direccion: cliente.direccion || "",
        estado: cliente.estatus || "Activo",
        segmentacion: cliente.segmentacion || "Nuevo",
        comentariosInternos: cliente.notas_internas || "",
      },
      indicadores: {
        deudaActual: ctx.deudaActual,
        deudaVigente,
        saldoVencido: ctx.saldoVencido,
        limiteCredito,
        creditoDisponible,
        totalFacturado: ctx.totalFacturado,
        totalLiquidado: ctx.montoRecuperado,
        montoRecuperado: ctx.montoRecuperado,
        numeroFacturas: facturasCliente.length,
        facturasVencidas: ctx.facturasVencidasCount,
        numeroNotasCredito: ctx.numNotasCredito,
        totalNotasCredito: ctx.montoTotalNotas,
      },
      ultimoPago: ultimoPagoRaw
        ? {
            fecha: normalizarFecha(ultimoPagoRaw.fecha),
            monto: Number(ultimoPagoRaw.monto || 0),
            metodo: ultimoPagoRaw.metodo || "",
            factura: ultimoPagoRaw.factura,
          }
        : null,
      facturas: ctx.facturasProcesadas,
      historialAbonos: ctx.historialAbonos.map(a => ({
        fecha: normalizarFecha(a.fecha),
        factura: a.factura,
        metodo: a.metodo,
        monto: Number(a.monto || 0),
        saldoRestante: Number(a.saldo_restante || 0),
        registradoPor: a.registrado_por || a.creado_por || "Sistema",
      })),
      historialNotas: ctx.historialNotas.map(n => ({
        fecha: normalizarFecha(n.fecha),
        factura: n.factura,
        monto: Number(n.monto || 0),
        motivo: n.motivo || n.concepto || "",
        estado: n.estatus || "Aplicada",
      })),
    };
  },

  async obtenerDetalleFacturas({ fechaInicio = "", fechaFin = "", grupo = "TODOS" } = {}) {
    const clientes = await this.obtenerTodosLosClientes(grupo);
    const mapaClientes = new Map();
    clientes.forEach((cliente) => mapaClientes.set(cliente.id, cliente));

    const facturas = await this.obtenerFacturas({ fechaInicio, fechaFin });

    const detalleFacturas = facturas
      .filter((factura) => mapaClientes.has(factura.cliente_id))
      .map((factura) => {
        const cliente = mapaClientes.get(factura.cliente_id);
        const saldo = Number(factura.saldo_pendiente ?? 0);
        const total = Number(factura.monto_total ?? 0);
        const pagado = Number(factura.monto_pagado ?? total - saldo);
        const ultimoAbono = Array.isArray(factura.abonos) && factura.abonos.length > 0
            ? factura.abonos[factura.abonos.length - 1] : null;
        const notasActivas = Array.isArray(factura.notas_credito)
          ? factura.notas_credito.filter((nota) => nota.cancelada !== true) : [];
        const ultimaNotaCredito = notasActivas.length > 0 ? notasActivas[notasActivas.length - 1] : null;

        return {
          numeroCliente: cliente?.numero_cliente || "",
          cliente: cliente?.nombre || "",
          grupo: cliente?.grupo || "",
          folio: factura.folio || "",
          emision: factura.emision,
          vencimiento: factura.vencimiento,
          montoTotal: total,
          pagado,
          saldoPendiente: saldo,
          ultimoPago: ultimoAbono ? normalizarFecha(ultimoAbono.fecha) : "Sin pagos registrados",
          montoUltimoPago: ultimoAbono ? Number(ultimoAbono.monto || 0) : null,
          fechaNotaCredito: ultimaNotaCredito ? ultimaNotaCredito.fecha : "Sin nota de crédito",
          montoNotaCredito: ultimaNotaCredito ? Number(ultimaNotaCredito.monto || 0) : null,
          estatus: factura.estatus || "Pendiente",
          estatusVisual: _generarEstatusVisual(saldo, factura.vencimiento),
          notas_internas: cliente?.notas_internas || "",
        };
      });

    detalleFacturas.sort((a, b) => {
      const compCliente = a.cliente.localeCompare(b.cliente, "es", { sensitivity: "base" });
      if (compCliente !== 0) return compCliente;
      return String(a.folio).localeCompare(String(b.folio), "es", { numeric: true, sensitivity: "base" });
    });

    return detalleFacturas;
  },

  async obtenerGrupos() {
    const clientes = await this.obtenerClientes("TODOS");
    const grupos = [
      ...new Set(
        clientes.map((c) => c.grupo).filter((g) => typeof g === "string" && g.trim() !== ""),
      ),
    ];
    return grupos.sort((a, b) => a.localeCompare(b));
  },

  async obtenerReporteGeneralClientes({ fechaInicio = "", fechaFin = "", grupo = "TODOS" } = {}) {
    const clientes = await this.obtenerClientesReporte(grupo);
    const facturas = await this.obtenerFacturas();
    const idsClientesValidos = new Set(clientes.map((c) => c.id));

    let inicioFiltro = null;
    let finFiltro = null;

    if (fechaInicio) {
      const [anio, mes, dia] = fechaInicio.split("-").map(Number);
      inicioFiltro = new Date(anio, mes - 1, dia, 0, 0, 0, 0);
    }
    
    if (fechaFin) {
      const [anio, mes, dia] = fechaFin.split("-").map(Number);
      finFiltro = new Date(anio, mes - 1, dia, 23, 59, 59, 999);
    }

    const facturasPorCliente = new Map();
    facturas.forEach((factura) => {
      const id = factura.cliente_id;
      if (idsClientesValidos.has(id)) {
        if (!facturasPorCliente.has(id)) facturasPorCliente.set(id, []);
        facturasPorCliente.get(id).push(factura);
      }
    });

    const resultado = clientes.map((cliente) => {
      const facturasCliente = facturasPorCliente.get(cliente.id) || [];
      const deudaActual = facturasCliente.reduce((sum, f) => sum + Number(f.saldo_pendiente ?? 0), 0);
      const saldoVencido = facturasCliente
        .filter((f) => esFacturaVencida(f))
        .reduce((sum, f) => sum + Number(f.saldo_pendiente ?? 0), 0);

      const limiteCredito = Number(cliente.limite_credito ?? 0);
      let creditoDisponible = 0;
      if (limiteCredito > 0) creditoDisponible = limiteCredito - deudaActual;

      let ultimoPagoFecha = null;
      let montoUltimoPago = 0;
      let totalFacturas = 0;
      let facturasVencidas = 0;
      let montoRecuperado = 0;
      let numNotasCredito = 0;
      let montoNotasCredito = 0;

      facturasCliente.forEach((factura) => {
        let entraEnPeriodoFactura = true;
        const fechaEmision = normalizarFecha(factura.emision);

        if (inicioFiltro && finFiltro) {
          if (!fechaEmision || fechaEmision < inicioFiltro || fechaEmision > finFiltro) entraEnPeriodoFactura = false;
        }

        if (entraEnPeriodoFactura) {
          totalFacturas++;
          if (esFacturaVencida(factura)) facturasVencidas++;
        }

        if (Array.isArray(factura.abonos)) {
          factura.abonos.forEach((abono) => {
            const fechaAbono = normalizarFecha(abono.fecha);
            if (fechaAbono && (!ultimoPagoFecha || fechaAbono > ultimoPagoFecha)) {
              ultimoPagoFecha = fechaAbono;
              montoUltimoPago = Number(abono.monto || 0);
            }
            let entraEnPeriodoAbono = true;
            if (inicioFiltro && finFiltro) {
              if (!fechaAbono || fechaAbono < inicioFiltro || fechaAbono > finFiltro) entraEnPeriodoAbono = false;
            }
            if (entraEnPeriodoAbono) montoRecuperado += Number(abono.monto ?? 0);
          });
        }

        if (Array.isArray(factura.notas_credito)) {
          factura.notas_credito.forEach((nota) => {
            if (nota.cancelada !== true) {
              const fechaNota = normalizarFecha(nota.fecha);
              let entraEnPeriodoNota = true;
              if (inicioFiltro && finFiltro) {
                if (!fechaNota || fechaNota < inicioFiltro || fechaNota > finFiltro) entraEnPeriodoNota = false;
              }
              if (entraEnPeriodoNota) {
                numNotasCredito++;
                montoNotasCredito += Number(nota.monto || 0);
              }
            }
          });
        }
      });

      return {
        numeroCliente: cliente.numero_cliente || "",
        cliente: cliente.nombre || "",
        grupo: cliente.grupo || "",
        estado: cliente.estatus || "Activo",
        limiteCredito: limiteCredito || "",
        creditoDisponible,
        montoRecuperado,
        deudaActual,
        saldoVencido,
        totalFacturas,
        facturasVencidas,
        numNotasCredito,
        montoNotasCredito,
        ultimoPagoFecha,
        montoUltimoPago,
        comentariosCliente: cliente.notas_internas?.trim() ? cliente.notas_internas : "Sin comentarios registrados",
      };
    });

    resultado.sort((a, b) => a.cliente.localeCompare(b.cliente, "es", { sensitivity: "base" }));
    return resultado;
  },
};