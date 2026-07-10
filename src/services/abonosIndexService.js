import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "../config/firebase";

const FACTURAS_COLLECTION = "facturas";
const ABONOS_INDEX_COLLECTION = "abonos_index";
const STATS_COLLECTION = "metricas_globales";
const STATS_DOC = "stats_actuales";
const TAMANO_BATCH = 400;
const ABONOS_POR_PAGINA = 10;

const redondearMoneda = (valor) =>
  Math.round((Number(valor) || 0) * 100) / 100;

const fechaInicioTimestamp = (fecha) => {
  if (!fecha) return null;
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return Timestamp.fromDate(new Date(anio, mes - 1, dia, 0, 0, 0, 0));
};

const fechaFinTimestamp = (fecha) => {
  if (!fecha) return null;
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return Timestamp.fromDate(new Date(anio, mes - 1, dia, 23, 59, 59, 999));
};

const obtenerDateSeguro = (valor) => {
  if (!valor) return null;
  if (valor?.toDate && typeof valor.toDate === "function") return valor.toDate();
  if (valor instanceof Date) return valor;
  if (typeof valor?.seconds === "number") return new Date(valor.seconds * 1000);

  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

const obtenerTimestampSeguro = (...valores) => {
  for (const valor of valores) {
    if (valor?.toDate && typeof valor.toDate === "function") return valor;
    const fecha = obtenerDateSeguro(valor);
    if (fecha) return Timestamp.fromDate(fecha);
  }

  return Timestamp.now();
};


const esMismoMes = (fechaValor, hoy = new Date()) => {
  const fecha = obtenerDateSeguro(fechaValor);
  return Boolean(
    fecha &&
      fecha.getMonth() === hoy.getMonth() &&
      fecha.getFullYear() === hoy.getFullYear(),
  );
};

const obtenerSemana = (fecha) => {
  const copia = new Date(fecha.getTime());
  copia.setHours(0, 0, 0, 0);
  copia.setDate(copia.getDate() + 4 - (copia.getDay() || 7));
  const inicioAnio = new Date(copia.getFullYear(), 0, 1);
  return Math.ceil(((copia - inicioAnio) / 86400000 + 1) / 7);
};

const esMismaSemana = (fechaValor, hoy = new Date()) => {
  const fecha = obtenerDateSeguro(fechaValor);
  return Boolean(
    fecha &&
      fecha.getFullYear() === hoy.getFullYear() &&
      obtenerSemana(fecha) === obtenerSemana(hoy),
  );
};

const esFacturaVencida = (factura = {}) => {
  const saldo = redondearMoneda(factura.saldo_pendiente);
  if (saldo <= 0) return false;

  const vencimiento = obtenerDateSeguro(factura.vencimiento);
  if (!vencimiento) return factura.estatus === "Vencida";

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  vencimiento.setHours(0, 0, 0, 0);
  return vencimiento < hoy;
};

export const construirAbonoIndexId = (facturaId, idAbono) => {
  const facturaSegura = String(facturaId || "sin_factura").replaceAll("/", "_");
  const abonoSeguro = String(idAbono || "sin_abono").replaceAll("/", "_");
  return `${facturaSegura}_${abonoSeguro}`;
};

export const construirAbonoIndexPayload = ({
  factura = {},
  abono = {},
  actorUid = "",
  userName = "Sistema",
  estado = "ACTIVO",
  activo = true,
  origen = "facturas.abonos",
} = {}) => {
  const facturaId = factura.id || factura.factura_id || "";
  const idAbono = abono.id_abono || `abn-sin-id-${facturaId}`;
  const fecha = obtenerTimestampSeguro(
    abono.fecha,
    abono.createdAt,
    factura.updatedAt,
    factura.createdAt,
    factura.emision,
  );
  const monto = redondearMoneda(abono.monto);
  const registradoPor = String(
    abono.registrado_por || userName || "Usuario",
  );
  const esRegistroMigrado =
    /(migraci[oó]n|importaci[oó]n).*sql/i.test(registradoPor) ||
    String(abono.origen || "").toLowerCase() === "migracion_sql";
  const origenNormalizado = esRegistroMigrado ? "migracion_sql" : origen;
  const registradoPorUid = esRegistroMigrado
    ? ""
    : String(abono.registrado_por_uid || actorUid || "");

  return {
    id: construirAbonoIndexId(facturaId, idAbono),
    id_abono: idAbono,
    factura_id: facturaId,
    folio: String(factura.folio || "S/F"),
    cliente_id: String(factura.cliente_id || ""),
    cliente: String(factura.cliente || "S/N"),
    fecha,
    monto,
    metodo: String(abono.metodo || "No especificado"),
    registrado_por: registradoPor,
    registrado_por_uid: registradoPorUid,
    estado,
    activo,
    origen: origenNormalizado,
    saldo_anterior: redondearMoneda(abono.saldo_anterior),
    saldo_restante: redondearMoneda(abono.saldo_restante),
    indexado_por_uid: String(actorUid || ""),
    updatedAt: serverTimestamp(),
  };
};

const normalizarAbonoIndexSnapshot = (documento) => ({
  id: documento.id,
  ...documento.data(),
});

const coincideBusqueda = (abono = {}, busqueda = "") => {
  const texto = String(busqueda || "").trim().toLowerCase();
  if (!texto) return true;

  return [
    abono.cliente,
    abono.folio,
    abono.factura_id,
    abono.id_abono,
    abono.metodo,
    abono.registrado_por,
  ]
    .join(" ")
    .toLowerCase()
    .includes(texto);
};

const coincideFiltrosLocales = (abono = {}, filtros = {}) => {
  const estado = String(filtros.estado || "TODOS").toUpperCase();
  const metodo = String(filtros.metodo || "TODOS").toLowerCase();
  const registradoPor = String(filtros.registradoPor || "").trim().toLowerCase();

  if (estado !== "TODOS" && String(abono.estado || "ACTIVO").toUpperCase() !== estado) {
    return false;
  }

  if (metodo !== "todos" && String(abono.metodo || "").toLowerCase() !== metodo) {
    return false;
  }

  if (
    registradoPor &&
    !String(abono.registrado_por || "").toLowerCase().includes(registradoPor)
  ) {
    return false;
  }

  return coincideBusqueda(abono, filtros.busqueda);
};

const crearConsultaAbonos = ({ fechaInicio, fechaFin, cursor, limiteConsulta }) => {
  const restricciones = [];
  const inicio = fechaInicioTimestamp(fechaInicio);
  const fin = fechaFinTimestamp(fechaFin);

  if (inicio) restricciones.push(where("fecha", ">=", inicio));
  if (fin) restricciones.push(where("fecha", "<=", fin));

  restricciones.push(orderBy("fecha", "desc"));

  if (cursor) restricciones.push(startAfter(cursor));
  restricciones.push(limit(limiteConsulta));

  return query(collection(db, ABONOS_INDEX_COLLECTION), ...restricciones);
};

const asegurarBatchDisponible = async (estadoBatch) => {
  if (estadoBatch.operaciones < TAMANO_BATCH) return estadoBatch;
  await estadoBatch.batch.commit();
  return {
    batch: writeBatch(db),
    operaciones: 0,
    commits: estadoBatch.commits + 1,
  };
};

export const abonosIndexService = {
  consultarAbonos: async ({
    fechaInicio = "",
    fechaFin = "",
    estado = "TODOS",
    busqueda = "",
    metodo = "TODOS",
    registradoPor = "",
    cursor = null,
    pageSize = ABONOS_POR_PAGINA,
  } = {}) => {
    try {
      const limiteConsulta = Math.min(Math.max(pageSize * 4, pageSize + 1), 250);
      const consulta = crearConsultaAbonos({
        fechaInicio,
        fechaFin,
        cursor,
        limiteConsulta,
      });
      const snapshot = await getDocs(consulta);
      const abonosFiltrados = [];
      let ultimoDocumento = null;
      let documentosProcesados = 0;

      for (const documento of snapshot.docs) {
        documentosProcesados += 1;
        ultimoDocumento = documento;
        const abono = normalizarAbonoIndexSnapshot(documento);

        if (
          coincideFiltrosLocales(abono, {
            estado,
            busqueda,
            metodo,
            registradoPor,
          })
        ) {
          abonosFiltrados.push(abono);
        }

        if (abonosFiltrados.length >= pageSize) break;
      }

      const quedanDocumentosEnLote =
        documentosProcesados < snapshot.docs.length;
      const loteCompleto = snapshot.docs.length === limiteConsulta;

      return {
        success: true,
        data: abonosFiltrados,
        cursorSiguiente: ultimoDocumento,
        haySiguiente: Boolean(
          ultimoDocumento && (quedanDocumentosEnLote || loteCompleto),
        ),
      };
    } catch (error) {
      console.error("Error consultando abonos_index:", error);
      return {
        success: false,
        error: error?.message || "No se pudo consultar el reporte de abonos.",
        data: [],
        cursorSiguiente: null,
        haySiguiente: false,
      };
    }
  },

  reconstruirDesdeFacturas: async ({ actor_uid, userName = "SU" } = {}) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    try {
      const facturasSnap = await getDocs(collection(db, FACTURAS_COLLECTION));
      let estadoBatch = {
        batch: writeBatch(db),
        operaciones: 0,
        commits: 0,
      };

      const hoy = new Date();
      const metricas = {
        cartera_total: 0,
        cartera_vencida: 0,
        ingresos_mes: 0,
        ingresos_semana: 0,
        facturas_vencidas: 0,
        facturas_pendientes: 0,
        facturas_pagadas: 0,
        facturas_total: 0,
        total_facturado: 0,
        total_liquidado: 0,
        cobrado_historico: 0,
        abonos_registrados: 0,
        total_notas_credito: 0,
        monto_recuperado: 0,
      };

      let abonosIndexados = 0;
      let facturasConAbonos = 0;

      for (const documento of facturasSnap.docs) {
        const factura = {
          id: documento.id,
          ...documento.data(),
        };

        const montoTotal = redondearMoneda(factura.monto_total);
        const saldoPendiente = redondearMoneda(factura.saldo_pendiente);
        const totalNotasCredito = redondearMoneda(factura.total_notas_credito);
        const abonos = Array.isArray(factura.abonos) ? factura.abonos : [];
        const pagada = saldoPendiente === 0;
        const vencida = esFacturaVencida(factura);

        metricas.facturas_total += 1;
        metricas.total_facturado += montoTotal;
        metricas.cartera_total += saldoPendiente;
        metricas.total_notas_credito += totalNotasCredito;

        if (pagada) {
          metricas.facturas_pagadas += 1;
          metricas.total_liquidado += montoTotal;
        } else {
          metricas.facturas_pendientes += 1;
        }

        if (vencida) {
          metricas.facturas_vencidas += 1;
          metricas.cartera_vencida += saldoPendiente;
        }

        if (abonos.length > 0) facturasConAbonos += 1;

        for (const abono of abonos) {
          const idAbono = abono.id_abono || `abn-${documento.id}-${abonosIndexados}`;
          const monto = redondearMoneda(abono.monto);
          const payload = construirAbonoIndexPayload({
            factura,
            abono: {
              ...abono,
              id_abono: idAbono,
            },
            actorUid: actor_uid,
            userName,
            estado: "ACTIVO",
            activo: true,
          });

          const ref = doc(
            db,
            ABONOS_INDEX_COLLECTION,
            construirAbonoIndexId(documento.id, idAbono),
          );

          estadoBatch.batch.set(ref, payload, { merge: true });
          estadoBatch.operaciones += 1;
          abonosIndexados += 1;

          metricas.monto_recuperado += monto;
          metricas.cobrado_historico += monto;
          metricas.abonos_registrados += monto;

          if (esMismoMes(payload.fecha, hoy)) metricas.ingresos_mes += monto;
          if (esMismaSemana(payload.fecha, hoy)) metricas.ingresos_semana += monto;

          estadoBatch = await asegurarBatchDisponible(estadoBatch);
        }
      }

      const statsRef = doc(db, STATS_COLLECTION, STATS_DOC);
      const statsPayload = Object.fromEntries(
        Object.entries(metricas).map(([campo, valor]) => [campo, redondearMoneda(valor)]),
      );

      estadoBatch.batch.set(
        statsRef,
        {
          ...statsPayload,
          ultima_actualizacion: serverTimestamp(),
        },
        { merge: true },
      );
      estadoBatch.operaciones += 1;

      if (estadoBatch.operaciones > 0) {
        await estadoBatch.batch.commit();
        estadoBatch.commits += 1;
      }

      return {
        success: true,
        data: {
          facturasRevisadas: facturasSnap.size,
          facturasConAbonos,
          abonosIndexados,
          montoRecuperado: redondearMoneda(metricas.monto_recuperado),
          commits: estadoBatch.commits,
        },
      };
    } catch (error) {
      console.error("Error reconstruyendo abonos_index:", error);
      return {
        success: false,
        error: error?.message || "No se pudo reconstruir el índice de abonos.",
      };
    }
  },
};
