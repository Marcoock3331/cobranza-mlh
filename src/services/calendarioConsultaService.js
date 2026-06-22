import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";

import { db } from "../config/firebase";
import { normalizarFacturaSnapshot } from "../utils/normalizarFactura";

const FACTURAS_COLLECTION = "facturas";
const COMPROMISOS_COLLECTION = "compromisos";

const aTimestamp = (fecha) => Timestamp.fromDate(new Date(fecha));

const normalizarCompromiso = (documento) => ({
  id: documento.id,
  ...documento.data(),
});

export const calendarioConsultaService = {
  consultarFacturasRango: async ({ inicio, fin }) => {
    try {
      const consulta = query(
        collection(db, FACTURAS_COLLECTION),
        where("vencimiento", ">=", aTimestamp(inicio)),
        where("vencimiento", "<", aTimestamp(fin)),
        where("saldo_pendiente", ">", 0),
        orderBy("vencimiento", "asc"),
        orderBy("saldo_pendiente", "desc"),
      );

      const snapshot = await getDocs(consulta);

      return {
        success: true,
        facturas: snapshot.docs.map(normalizarFacturaSnapshot),
      };
    } catch (error) {
      console.error("Error consultando facturas del calendario:", error);

      return {
        success: false,
        facturas: [],
        error:
          error?.code === "failed-precondition"
            ? "Firestore necesita un índice para consultar los vencimientos del periodo."
            : error?.message || "No se pudieron consultar las facturas.",
      };
    }
  },

  escucharCompromisosRango: ({ inicio, fin, onData, onError }) => {
    const consulta = query(
      collection(db, COMPROMISOS_COLLECTION),
      where("fecha_compromiso", ">=", aTimestamp(inicio)),
      where("fecha_compromiso", "<", aTimestamp(fin)),
      orderBy("fecha_compromiso", "asc"),
    );

    return onSnapshot(
      consulta,
      (snapshot) => {
        onData(snapshot.docs.map(normalizarCompromiso));
      },
      (error) => {
        console.error("Error escuchando compromisos por rango:", error);
        onError?.(error);
      },
    );
  },

  consultarFacturasAbiertasCliente: async (clienteId) => {
    if (!clienteId) {
      return { success: true, facturas: [] };
    }

    try {
      const consulta = query(
        collection(db, FACTURAS_COLLECTION),
        where("cliente_id", "==", clienteId),
        orderBy("emision", "desc"),
      );

      const snapshot = await getDocs(consulta);
      const facturas = snapshot.docs
        .map(normalizarFacturaSnapshot)
        .filter((factura) => Number(factura.saldo_pendiente) > 0);

      return { success: true, facturas };
    } catch (error) {
      console.error("Error consultando facturas del cliente:", error);

      return {
        success: false,
        facturas: [],
        error:
          error?.code === "failed-precondition"
            ? "Firestore necesita el índice cliente_id + emision."
            : error?.message || "No se pudieron consultar las facturas del cliente.",
      };
    }
  },
};