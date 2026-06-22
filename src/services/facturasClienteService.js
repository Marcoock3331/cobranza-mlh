import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { db } from "../config/firebase";
import { facturasConsultaService } from "./facturasConsultaService";
import { normalizarFacturaSnapshot } from "../utils/normalizarFactura";

const FACTURAS_COLLECTION = "facturas";
const LIMITE_RESUMEN_CLIENTE = 500;

const mapearFiltroExpediente = (filtro = "Historial") => {
  if (filtro === "Vencidas") return "Vencida";
  if (filtro === "Pagadas") return "Pagada";
  return "Todas";
};

const calcularResumenFacturas = (facturas = []) => {
  return facturas.reduce(
    (resumen, factura) => {
      const saldo = Number(factura.saldo_pendiente) || 0;
      const total = Number(factura.monto_total) || 0;
      const estatus = factura.estatus || "Pendiente";

      resumen.totalFacturas += 1;
      resumen.totalFacturado += total;
      resumen.saldoActual += Math.max(0, saldo);

      if (saldo <= 0 || estatus === "Pagada") {
        resumen.facturasPagadas += 1;
        return resumen;
      }

      if (estatus === "Vencida") {
        resumen.facturasVencidas += 1;
        resumen.saldoVencido += Math.max(0, saldo);
        return resumen;
      }

      resumen.facturasPendientes += 1;
      return resumen;
    },
    {
      totalFacturas: 0,
      facturasPagadas: 0,
      facturasPendientes: 0,
      facturasVencidas: 0,
      totalFacturado: 0,
      saldoActual: 0,
      saldoVencido: 0,
      resumenLimitado: false,
    },
  );
};

export const facturasClienteService = {
  consultarPaginaCliente: async ({
    clienteId,
    pageSize = 8,
    cursor = null,
    filtroFacturas = "Historial",
  } = {}) => {
    if (!clienteId) {
      return {
        success: true,
        facturas: [],
        cursorSiguiente: null,
        haySiguiente: false,
        mensaje: "No se identificó el cliente del expediente.",
      };
    }

    return facturasConsultaService.consultarPagina({
      pageSize,
      cursor,
      clienteId,
      filtroEstatus: mapearFiltroExpediente(filtroFacturas),
    });
  },

  consultarResumenCliente: async (clienteId) => {
    try {
      if (!clienteId) {
        return {
          success: true,
          resumen: calcularResumenFacturas([]),
        };
      }

      const consulta = query(
        collection(db, FACTURAS_COLLECTION),
        where("cliente_id", "==", clienteId),
        orderBy("emision", "desc"),
        limit(LIMITE_RESUMEN_CLIENTE),
      );

      const snapshot = await getDocs(consulta);
      const facturas = snapshot.docs.map(normalizarFacturaSnapshot);
      const resumen = calcularResumenFacturas(facturas);

      return {
        success: true,
        resumen: {
          ...resumen,
          resumenLimitado: snapshot.docs.length >= LIMITE_RESUMEN_CLIENTE,
        },
      };
    } catch (error) {
      console.error("Error consultando resumen del expediente:", error);

      return {
        success: false,
        resumen: calcularResumenFacturas([]),
        error:
          error?.code === "failed-precondition"
            ? "Firestore necesita el índice cliente_id + emision para calcular el resumen del expediente."
            : error?.message || "No se pudo calcular el resumen del expediente.",
      };
    }
  },
};
