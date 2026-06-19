import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  Timestamp,
  where,
} from "firebase/firestore";

import { db } from "../config/firebase";
import { normalizarFacturaSnapshot } from "../utils/normalizarFactura";

const FACTURAS_COLLECTION = "facturas";
const TAMANO_LOTE_LOCAL = 50;
const MAX_DOCUMENTOS_ESCANEADOS = 300;

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

const inicioHoyTimestamp = () => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(hoy);
};

const normalizarFolioBusqueda = (valor = "") =>
  valor.toString().replace(/\s+/g, " ").trim().toUpperCase();

const coincideFiltrosLocales = (
  factura,
  { filtroEstatus, fechaInicio, fechaFin },
) => {
  if (filtroEstatus !== "Todas" && factura.estatus !== filtroEstatus) {
    return false;
  }

  if (fechaInicio && factura.emision < fechaInicio) {
    return false;
  }

  if (fechaFin && factura.emision > fechaFin) {
    return false;
  }

  return true;
};

const crearRestriccionesLocales = ({
  clienteId,
  prefijoFolio,
  fechaInicio,
  fechaFin,
  cursor,
  limiteLote,
}) => {
  const restricciones = [];

  if (clienteId) {
    restricciones.push(where("cliente_id", "==", clienteId));
    restricciones.push(orderBy("emision", "desc"));
  } else if (prefijoFolio) {
    restricciones.push(where("folio", ">=", prefijoFolio));
    restricciones.push(where("folio", "<=", `${prefijoFolio}\uf8ff`));
    restricciones.push(orderBy("folio", "asc"));
  } else {
    const desde = fechaInicioTimestamp(fechaInicio);
    const hasta = fechaFinTimestamp(fechaFin);

    if (desde) {
      restricciones.push(where("emision", ">=", desde));
    }

    if (hasta) {
      restricciones.push(where("emision", "<=", hasta));
    }

    restricciones.push(orderBy("emision", "desc"));
  }

  if (cursor) {
    restricciones.push(startAfter(cursor));
  }

  restricciones.push(limit(limiteLote));
  return restricciones;
};

const consultarConFiltroLocal = async ({
  pageSize,
  cursor,
  clienteId,
  prefijoFolio,
  filtroEstatus,
  fechaInicio,
  fechaFin,
}) => {
  const resultados = [];
  let cursorLote = cursor;
  let cursorSiguiente = null;
  let documentosEscaneados = 0;
  let quedanDocumentos = true;
  let limiteAlcanzado = false;

  while (
    quedanDocumentos &&
    resultados.length <= pageSize &&
    documentosEscaneados < MAX_DOCUMENTOS_ESCANEADOS
  ) {
    const restricciones = crearRestriccionesLocales({
      clienteId,
      prefijoFolio,
      fechaInicio,
      fechaFin,
      cursor: cursorLote,
      limiteLote: TAMANO_LOTE_LOCAL,
    });

    const consulta = query(
      collection(db, FACTURAS_COLLECTION),
      ...restricciones,
    );

    const snapshot = await getDocs(consulta);

    if (snapshot.empty) {
      break;
    }

    for (const documento of snapshot.docs) {
      documentosEscaneados += 1;
      cursorLote = documento;

      const factura = normalizarFacturaSnapshot(documento);
      const coincide = coincideFiltrosLocales(factura, {
        filtroEstatus,
        fechaInicio,
        fechaFin,
      });

      if (coincide) {
        resultados.push({ factura, documento });

        if (resultados.length === pageSize) {
          cursorSiguiente = documento;
        }

        if (resultados.length > pageSize) {
          break;
        }
      }

      if (documentosEscaneados >= MAX_DOCUMENTOS_ESCANEADOS) {
        limiteAlcanzado = true;
        break;
      }
    }

    if (resultados.length > pageSize) {
      break;
    }

    if (snapshot.docs.length < TAMANO_LOTE_LOCAL) {
      quedanDocumentos = false;
    }
  }

  const haySiguiente =
    resultados.length > pageSize ||
    (limiteAlcanzado && Boolean(cursorLote));

  if (!cursorSiguiente && haySiguiente) {
    cursorSiguiente = cursorLote;
  }

  const facturas = resultados
    .slice(0, pageSize)
    .map((resultado) => resultado.factura);

  let mensaje = "";

  if (prefijoFolio) {
    mensaje = facturas.length
      ? `Mostrando folios que comienzan con “${prefijoFolio}”.`
      : `No se encontraron folios que comiencen con “${prefijoFolio}”.`;
  } else if (clienteId) {
    mensaje = facturas.length
      ? "Mostrando las facturas del cliente seleccionado."
      : "El cliente seleccionado no tiene facturas con estos filtros.";
  }

  if (limiteAlcanzado) {
    mensaje = `${mensaje ? `${mensaje} ` : ""}La búsqueda es muy amplia; escribe más caracteres para reducir resultados.`;
  }

  return {
    facturas,
    cursorSiguiente,
    haySiguiente,
    mensaje,
  };
};

const crearRestriccionesEstado = ({
  filtroEstatus,
  fechaInicio,
  fechaFin,
  cursor,
  pageSize,
}) => {
  const restricciones = [];
  const hoy = inicioHoyTimestamp();
  const desde = fechaInicioTimestamp(fechaInicio);
  const hasta = fechaFinTimestamp(fechaFin);
  const usaRangoEmision = Boolean(desde || hasta);

  if (desde) {
    restricciones.push(where("emision", ">=", desde));
  }

  if (hasta) {
    restricciones.push(where("emision", "<=", hasta));
  }

  if (filtroEstatus === "Vencida") {
    restricciones.push(where("vencimiento", "<", hoy));
    restricciones.push(where("saldo_pendiente", ">", 0));

    if (usaRangoEmision) {
      restricciones.push(orderBy("emision", "desc"));
    }

    restricciones.push(orderBy("vencimiento", "desc"));
    restricciones.push(orderBy("saldo_pendiente", "desc"));
  } else if (filtroEstatus === "Pendiente") {
    restricciones.push(where("vencimiento", ">=", hoy));
    restricciones.push(where("saldo_pendiente", ">", 0));

    if (usaRangoEmision) {
      restricciones.push(orderBy("emision", "desc"));
    }

    restricciones.push(orderBy("vencimiento", "asc"));
    restricciones.push(orderBy("saldo_pendiente", "desc"));
  } else if (filtroEstatus === "Pagada") {
    restricciones.push(where("saldo_pendiente", "==", 0));
    restricciones.push(orderBy("emision", "desc"));
  } else {
    restricciones.push(orderBy("emision", "desc"));
  }

  if (cursor) {
    restricciones.push(startAfter(cursor));
  }

  restricciones.push(limit(pageSize + 1));
  return restricciones;
};

const consultarEstadoGlobal = async ({
  pageSize,
  cursor,
  filtroEstatus,
  fechaInicio,
  fechaFin,
}) => {
  const restricciones = crearRestriccionesEstado({
    filtroEstatus,
    fechaInicio,
    fechaFin,
    cursor,
    pageSize,
  });

  const consulta = query(
    collection(db, FACTURAS_COLLECTION),
    ...restricciones,
  );

  const snapshot = await getDocs(consulta);
  const documentosVisibles = snapshot.docs.slice(0, pageSize);

  return {
    facturas: documentosVisibles.map(normalizarFacturaSnapshot),
    cursorSiguiente:
      documentosVisibles[documentosVisibles.length - 1] || null,
    haySiguiente: snapshot.docs.length > pageSize,
    mensaje: "",
  };
};

export const facturasConsultaService = {
  consultarPagina: async ({
    pageSize = 25,
    cursor = null,
    busqueda = "",
    clienteId = "",
    filtroEstatus = "Todas",
    fechaInicio = "",
    fechaFin = "",
  } = {}) => {
    try {
      const prefijoFolio = clienteId
        ? ""
        : normalizarFolioBusqueda(busqueda);

      const requiereFiltroLocal = Boolean(clienteId || prefijoFolio);

      const resultado = requiereFiltroLocal
        ? await consultarConFiltroLocal({
            pageSize,
            cursor,
            clienteId,
            prefijoFolio,
            filtroEstatus,
            fechaInicio,
            fechaFin,
          })
        : await consultarEstadoGlobal({
            pageSize,
            cursor,
            filtroEstatus,
            fechaInicio,
            fechaFin,
          });

      return {
        success: true,
        ...resultado,
      };
    } catch (error) {
      console.error("Error consultando facturas paginadas:", error);

      return {
        success: false,
        facturas: [],
        cursorSiguiente: null,
        haySiguiente: false,
        mensaje: "",
        error:
          error?.code === "failed-precondition"
            ? "Firestore necesita un índice para esta combinación. Publica los índices nuevos de la Fase 4A.1 o abre el enlace de creación mostrado en la consola."
            : error?.message || "No se pudieron consultar las facturas.",
      };
    }
  },
};