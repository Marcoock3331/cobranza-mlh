import { auth, db } from "../config/firebase";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  increment,
  runTransaction,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from "firebase/firestore";

import {
  construirAbonoIndexId,
  construirAbonoIndexPayload,
} from "./abonosIndexService";

const FACTURAS_COLLECTION = "facturas";
const CLIENTES_COLLECTION = "clientes";
const STATS_COLLECTION = "metricas_globales";
const STATS_DOC = "stats_actuales";
const ACTIVIDAD_COLLECTION = "actividad";
const ABONOS_INDEX_COLLECTION = "abonos_index";
const SOLICITUDES_NOTAS_CREDITO_COLLECTION = "solicitudes_notas_credito";

const redondearMoneda = (valor) =>
  Math.round((Number(valor) || 0) * 100) / 100;

const obtenerActorUidSeguro = (actor_uid) => {
  const uidSesion = auth.currentUser?.uid || "";
  const uidRecibido = String(actor_uid || "").trim();

  if (!uidSesion) {
    throw new Error("No hay una sesión activa de Firebase Authentication.");
  }

  if (uidRecibido && uidRecibido !== uidSesion) {
    console.warn("actor_uid distinto al UID autenticado. Se usará el UID real de Firebase Auth.", {
      actor_uid_recibido: uidRecibido,
      uid_auth_real: uidSesion,
    });
  }

  return uidSesion;
};

const obtenerResumenPagoCliente = (cliente = {}) => ({
  monto_ultimo_pago: cliente.monto_ultimo_pago ?? null,
  fecha_ultimo_pago: cliente.fecha_ultimo_pago ?? null,
  metodo_ultimo_pago: cliente.metodo_ultimo_pago ?? null,
  ultimo_deposito_monto: cliente.ultimo_deposito_monto ?? null,
  ultimo_deposito_fecha: cliente.ultimo_deposito_fecha ?? null,
  ultimo_deposito_metodo: cliente.ultimo_deposito_metodo ?? null,
  ultimo_abono_id: cliente.ultimo_abono_id ?? null,
  ultimo_abono_factura_id: cliente.ultimo_abono_factura_id ?? null,
});

const aplicarResumenPagoCliente = (payload, resumen = {}) => {
  payload.monto_ultimo_pago = resumen?.monto_ultimo_pago ?? null;
  payload.fecha_ultimo_pago = resumen?.fecha_ultimo_pago ?? null;
  payload.metodo_ultimo_pago = resumen?.metodo_ultimo_pago ?? null;
  payload.ultimo_deposito_monto = resumen?.ultimo_deposito_monto ?? null;
  payload.ultimo_deposito_fecha = resumen?.ultimo_deposito_fecha ?? null;
  payload.ultimo_deposito_metodo = resumen?.ultimo_deposito_metodo ?? null;
  payload.ultimo_abono_id = resumen?.ultimo_abono_id ?? null;
  payload.ultimo_abono_factura_id = resumen?.ultimo_abono_factura_id ?? null;

  return payload;
};

const abonoCoincideConResumenClienteLegacy = (cliente = {}, abono = {}) => {
  const clienteSinPunteroAbono =
    !cliente.ultimo_abono_id &&
    !cliente.ultimo_abono_factura_id;

  if (!clienteSinPunteroAbono) {
    return false;
  }

  const montoAbono = redondearMoneda(abono.monto);
  const mismoMonto =
    redondearMoneda(cliente.monto_ultimo_pago) === montoAbono ||
    redondearMoneda(cliente.ultimo_deposito_monto) === montoAbono;

  const mismoMetodo =
    !cliente.metodo_ultimo_pago ||
    !abono.metodo ||
    String(cliente.metodo_ultimo_pago) === String(abono.metodo);

  return mismoMonto && mismoMetodo;
};

const mapearErrorFirestore = (error) => {
  if (error?.code === "resource-exhausted") {
    return "La cuota diaria de Firestore fue agotada. La operación no pudo completarse. Espera al restablecimiento de la cuota o utiliza el emulador local.";
  }

  if (error?.code === "permission-denied") {
    return "Firestore rechazó la operación por permisos. Verifica que las reglas publicadas coincidan con el archivo firestore.rules del proyecto.";
  }

  if (error?.code === "unavailable") {
    return "Firestore no está disponible en este momento. Revisa tu conexión e intenta nuevamente.";
  }

  return error?.message || "No se pudo completar la operación de facturación.";
};

const convertirFechaFormulario = (fecha) => {
  if (!fecha || typeof fecha !== "string") {
    throw new Error("Las fechas de emisión y vencimiento son obligatorias.");
  }

  const [anio, mes, dia] = fecha.split("-").map(Number);
  const fechaConvertida = new Date(anio, mes - 1, dia);

  if (
    !anio ||
    !mes ||
    !dia ||
    Number.isNaN(fechaConvertida.getTime())
  ) {
    throw new Error("La fecha indicada no es válida.");
  }

  return fechaConvertida;
};

const convertirFechaAString = (fecha) => {
  if (!fecha) return "";

  if (fecha?.toDate && typeof fecha.toDate === "function") {
    const valor = fecha.toDate();
    return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, "0")}-${String(valor.getDate()).padStart(2, "0")}`;
  }

  if (fecha instanceof Date) {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
  }

  const texto = String(fecha).split(" ")[0];

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return texto;
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(texto)) {
    const [dia, mes, anio] = texto.split("/");
    return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  }

  return "";
};

const calcularEstatusFinanciero = ({ saldo, vencimiento }) => {
  if (redondearMoneda(saldo) === 0) return "Pagada";

  const fecha = vencimiento?.toDate
    ? vencimiento.toDate()
    : vencimiento instanceof Date
      ? new Date(vencimiento)
      : convertirFechaFormulario(convertirFechaAString(vencimiento));

  fecha.setHours(0, 0, 0, 0);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return fecha < hoy ? "Vencida" : "Pendiente";
};

const valoresIguales = (anterior, nuevo) => {
  if (typeof anterior === "number" || typeof nuevo === "number") {
    return redondearMoneda(anterior) === redondearMoneda(nuevo);
  }

  return String(anterior ?? "") === String(nuevo ?? "");
};

const ETIQUETAS_EDICION = {
  cliente_id: "Cliente",
  grupo: "Grupo",
  folio: "Folio",
  monto_total: "Monto total",
  emision: "Emisión",
  vencimiento: "Vencimiento",
  observaciones: "Observaciones",
};

const formatearValorAuditoria = (campo, valor) => {
  if (campo === "monto_total" || campo === "saldo_pendiente" || campo === "monto_pagado") {
    return `$${redondearMoneda(valor).toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  if (campo === "emision" || campo === "vencimiento") {
    const fecha = convertirFechaAString(valor);
    if (!fecha) return "Sin fecha";
    const [anio, mes, dia] = fecha.split("-");
    return `${dia}/${mes}/${anio}`;
  }

  return String(valor ?? "").trim() || "Sin datos";
};

const esFacturaVencida = (factura) => {
  if (factura.estatus === "Vencida") return true;
  if (!factura.vencimiento) return false;

  let fechaVencimiento;

  if (factura.vencimiento?.toDate) {
    fechaVencimiento = factura.vencimiento.toDate();
  } else {
    const fechaParte = factura.vencimiento.toString().split(" ")[0];

    if (fechaParte.includes("-")) {
      const [anio, mes, dia] = fechaParte.split("-").map(Number);
      fechaVencimiento = new Date(anio, mes - 1, dia);
    } else if (fechaParte.includes("/")) {
      const [dia, mes, anio] = fechaParte.split("/").map(Number);
      fechaVencimiento = new Date(anio, mes - 1, dia);
    } else {
      return false;
    }
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  fechaVencimiento.setHours(0, 0, 0, 0);

  return fechaVencimiento < hoy;
};

const esMismoMes = (fechaTarget) => {
  if (!fechaTarget) return false;

  const fecha = fechaTarget.toDate
    ? fechaTarget.toDate()
    : new Date(fechaTarget);

  const hoy = new Date();

  return (
    fecha.getMonth() === hoy.getMonth() &&
    fecha.getFullYear() === hoy.getFullYear()
  );
};

const esMismaSemana = (fechaTarget) => {
  if (!fechaTarget) return false;

  const fecha = fechaTarget.toDate
    ? fechaTarget.toDate()
    : new Date(fechaTarget);

  const hoy = new Date();

  const obtenerSemana = (date) => {
    const fechaUTC = new Date(
      Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      ),
    );

    const numeroDia = fechaUTC.getUTCDay() || 7;
    fechaUTC.setUTCDate(fechaUTC.getUTCDate() + 4 - numeroDia);

    const inicioAnio = new Date(
      Date.UTC(fechaUTC.getUTCFullYear(), 0, 1),
    );

    return Math.ceil(
      (((fechaUTC - inicioAnio) / 86400000) + 1) / 7,
    );
  };

  return (
    fecha.getFullYear() === hoy.getFullYear() &&
    obtenerSemana(fecha) === obtenerSemana(hoy)
  );
};

export const facturasService = {
  crearFactura: async ({
    formData,
    clientes,
    userName,
    actor_uid,
  }) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    try {
      const actorUid = obtenerActorUidSeguro(actor_uid);
      const clienteBD = clientes.find(
        (cliente) => cliente.id === formData.cliente_id,
      );

      if (!clienteBD) {
        throw new Error(
          "El cliente seleccionado no está enlazado correctamente mediante cliente_id.",
        );
      }

      if (
        clienteBD.activo === false ||
        clienteBD.estatus === "Inactivo"
      ) {
        throw new Error(
          "No se pueden crear facturas para un cliente inactivo.",
        );
      }

      const montoTotal = redondearMoneda(formData.monto_total);

      if (montoTotal <= 0) {
        throw new Error(
          "El monto total de la factura debe ser mayor a cero.",
        );
      }

      const limiteCredito =
        Number(clienteBD.limite_credito) || 0;

      const deudaActual =
        Number(clienteBD.deuda_actual) || 0;

      const creditoDisponibleGuardado = Number(
        clienteBD.credito_disponible,
      );

      const creditoDisponible = Number.isFinite(
        creditoDisponibleGuardado,
      )
        ? creditoDisponibleGuardado
        : Math.max(0, limiteCredito - deudaActual);

      if (limiteCredito <= 0) {
        throw new Error(
          "El cliente no tiene una línea de crédito asignada.",
        );
      }

      if (montoTotal > creditoDisponible) {
        throw new Error(
          `El cliente solo dispone de $${Math.max(
            0,
            creditoDisponible,
          ).toLocaleString("es-MX")} de crédito.`,
        );
      }

      const fechaEmision = convertirFechaFormulario(
        formData.emision,
      );

      const fechaVencimiento = convertirFechaFormulario(
        formData.vencimiento,
      );

      if (fechaVencimiento < fechaEmision) {
        throw new Error(
          "La fecha de vencimiento no puede ser anterior a la fecha de emisión.",
        );
      }

      const batch = writeBatch(db);
      const facturaRef = doc(
        collection(db, FACTURAS_COLLECTION),
      );

      const payload = {
        id: facturaRef.id,
        cliente_id: clienteBD.id,
        cliente: clienteBD.nombre || formData.cliente || "S/N",
        grupo: String(
          formData.grupo || clienteBD.grupo || "General",
        ),
        folio: String(formData.folio || "").trim(),
        monto_total: montoTotal,
        monto_pagado: 0,
        saldo_pendiente: montoTotal,
        moneda: "MXN",
        emision: Timestamp.fromDate(fechaEmision),
        vencimiento: Timestamp.fromDate(fechaVencimiento),
        observaciones: String(
          formData.observaciones || "",
        ).trim(),
        estatus: "Pendiente",
        abonos: [],
        notas_credito: [],
        total_notas_credito: 0,
        createdAt: serverTimestamp(),
      };

      if (!payload.folio) {
        throw new Error(
          "El número o folio de la factura es obligatorio.",
        );
      }

      batch.set(facturaRef, payload);

      const clienteRef = doc(
        db,
        CLIENTES_COLLECTION,
        clienteBD.id,
      );

      batch.update(clienteRef, {
        deuda_actual: increment(montoTotal),
        credito_disponible: increment(-montoTotal),
        updatedAt: serverTimestamp(),
      });

      const naceVencida = esFacturaVencida(payload);

      const statsPayload = {
        facturas_total: increment(1),
        facturas_pendientes: increment(1),
        cartera_total: increment(montoTotal),
        total_facturado: increment(montoTotal),
        ultima_actualizacion: serverTimestamp(),
      };

      if (naceVencida) {
        statsPayload.facturas_vencidas = increment(1);
        statsPayload.cartera_vencida = increment(montoTotal);
      }

      const statsRef = doc(
        db,
        STATS_COLLECTION,
        STATS_DOC,
      );

      batch.set(statsRef, statsPayload, { merge: true });

      const auditRef = doc(
        collection(db, ACTIVIDAD_COLLECTION),
      );

      batch.set(auditRef, {
        actor_uid: actorUid,
        usuario: userName || "Usuario",
        modulo: "Facturación",
        tipo: "Creación",
        cliente: payload.cliente,
        detalle: `Se generó la factura ${payload.folio} por $${montoTotal.toLocaleString("es-MX")}.`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return {
        success: true,
        data: {
          ...payload,
          id: facturaRef.id,
        },
      };
    } catch (error) {
      console.error(
        "Error crítico al emitir factura:",
        error,
      );

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  registrarAbono: async ({
    factura,
    montoAbonado,
    metodoPago,
    clientes,
    userName,
    actor_uid,
  }) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    try {
      const actorUid = obtenerActorUidSeguro(actor_uid);
      const saldoActual = Number(factura.saldo_pendiente) || 0;
      const montoTotal = Number(factura.monto_total) || 0;
      const monto = redondearMoneda(montoAbonado);

      if (monto <= 0) {
        throw new Error("El monto del abono debe ser mayor a cero.");
      }

      if (monto > saldoActual) {
        throw new Error(
          `El abono no puede superar el saldo pendiente de $${saldoActual.toLocaleString("es-MX")}.`,
        );
      }

      const clienteBD = clientes.find(
        (cliente) => cliente.id === factura.cliente_id,
      );

      if (!clienteBD) {
        throw new Error("No se encontró el cliente enlazado mediante cliente_id.");
      }

      const nuevoSaldo = redondearMoneda(saldoActual - monto);

      const montoPagadoActual = Number.isFinite(Number(factura.monto_pagado))
        ? Number(factura.monto_pagado)
        : Math.max(0, montoTotal - saldoActual);

      const nuevoMontoPagado = redondearMoneda(montoPagadoActual + monto);

      const nuevoEstatus =
        nuevoSaldo === 0
          ? "Pagada"
          : factura.estatus === "Vencida"
            ? "Vencida"
            : factura.estatus === "Reprogramado"
              ? "Reprogramado"
              : esFacturaVencida(factura)
                ? "Vencida"
                : "Pendiente";

      const fechaAbono = Timestamp.now();
      const resumenPagoAnteriorCliente = obtenerResumenPagoCliente(clienteBD);

      const nuevoAbono = {
        id_abono: `abn-${Date.now()}`,
        fecha: fechaAbono,
        monto,
        metodo: metodoPago,
        registrado_por: userName || "Usuario",
        registrado_por_uid: actorUid,
        saldo_anterior: saldoActual,
        saldo_restante: nuevoSaldo,
        resumen_pago_anterior_cliente: resumenPagoAnteriorCliente,
      };

      const limiteCredito = redondearMoneda(clienteBD.limite_credito);
      const creditoDisponibleActual = redondearMoneda(clienteBD.credito_disponible);
      const nuevoCreditoDisponible =
        limiteCredito > 0
          ? Math.min(
              limiteCredito,
              Math.max(0, redondearMoneda(creditoDisponibleActual + monto)),
            )
          : 0;

      const batch = writeBatch(db);
      const auditRef = doc(collection(db, ACTIVIDAD_COLLECTION));

      batch.set(auditRef, {
        actor_uid: actorUid,
        usuario: userName || "Usuario",
        modulo: "Facturación",
        tipo: "Registro de Abono",
        factura_id: factura.id,
        folio: factura.folio || "S/F",
        cliente: factura.cliente || clienteBD.nombre,
        cliente_id: factura.cliente_id,
        campos_modificados: ["saldo_pendiente", "monto_pagado", "estatus"],
        valores_anteriores: {
          saldo_pendiente: saldoActual,
          monto_pagado: montoPagadoActual,
          estatus: factura.estatus,
        },
        valores_nuevos: {
          saldo_pendiente: nuevoSaldo,
          monto_pagado: nuevoMontoPagado,
          estatus: nuevoEstatus,
        },
        detalle: `Abono de $${monto.toLocaleString("es-MX")} registrado vía ${metodoPago} a la factura ${factura.folio}.`,
        serverTime: serverTimestamp(),
      });

      const facturaRef = doc(db, FACTURAS_COLLECTION, factura.id);

      batch.update(facturaRef, {
        saldo_pendiente: nuevoSaldo,
        monto_pagado: nuevoMontoPagado,
        estatus: nuevoEstatus,
        abonos: arrayUnion(nuevoAbono),
        ultima_edicion_audit_id: auditRef.id,
        ultima_edicion_actor_uid: actorUid,
        ultima_edicion_at: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const abonoIndexRef = doc(
        db,
        ABONOS_INDEX_COLLECTION,
        construirAbonoIndexId(factura.id, nuevoAbono.id_abono),
      );

      batch.set(
        abonoIndexRef,
        {
          ...construirAbonoIndexPayload({
            factura,
            abono: nuevoAbono,
            actorUid,
            userName: userName || "Usuario",
            estado: "ACTIVO",
            activo: true,
          }),
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );

      const clienteRef = doc(db, CLIENTES_COLLECTION, clienteBD.id);

      batch.update(clienteRef, {
        deuda_actual: increment(-monto),
        credito_disponible: nuevoCreditoDisponible,
        monto_ultimo_pago: monto,
        fecha_ultimo_pago: fechaAbono,
        metodo_ultimo_pago: metodoPago,
        ultimo_deposito_monto: monto,
        ultimo_deposito_fecha: fechaAbono,
        ultimo_deposito_metodo: metodoPago,
        ultimo_abono_id: nuevoAbono.id_abono,
        ultimo_abono_factura_id: factura.id,
        updatedAt: serverTimestamp(),
      });

      const statsPayload = {
        cartera_total: increment(-monto),
        ingresos_mes: increment(monto),
        ingresos_semana: increment(monto),
        cobrado_historico: increment(monto),
        abonos_registrados: increment(monto),
        monto_recuperado: increment(monto),
        ultima_actualizacion: serverTimestamp(),
      };

      const estabaVencida = esFacturaVencida(factura);

      if (estabaVencida) {
        statsPayload.cartera_vencida = increment(-monto);
      }

      if (nuevoSaldo === 0) {
        statsPayload.facturas_pagadas = increment(1);
        statsPayload.facturas_pendientes = increment(-1);
        statsPayload.total_liquidado = increment(montoTotal);

        if (estabaVencida) {
          statsPayload.facturas_vencidas = increment(-1);
        }
      }

      const statsRef = doc(db, STATS_COLLECTION, STATS_DOC);
      batch.set(statsRef, statsPayload, { merge: true });

      await batch.commit();

      return {
        success: true,
        data: nuevoAbono,
      };
    } catch (error) {
      console.error("Error al registrar el abono:", error);

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },
  eliminarAbono: async ({
    idFactura,
    idAbono,
    userName,
    actor_uid,
  }) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    try {
      const actorUid = obtenerActorUidSeguro(actor_uid);
      const facturaRef = doc(db, FACTURAS_COLLECTION, idFactura);
      const facturaSnapshot = await getDoc(facturaRef);

      if (!facturaSnapshot.exists()) {
        throw new Error("La factura no fue encontrada.");
      }

      const factura = {
        id: facturaSnapshot.id,
        ...facturaSnapshot.data(),
      };

      const abonosFactura = Array.isArray(factura.abonos) ? factura.abonos : [];

      const abonoTarget = abonosFactura.find((abono) => abono.id_abono === idAbono);

      if (!abonoTarget) {
        throw new Error("El abono no fue encontrado.");
      }

      if (!factura.cliente_id) {
        throw new Error("La factura no contiene un cliente_id válido.");
      }

      const clienteRef = doc(db, CLIENTES_COLLECTION, factura.cliente_id);
      const clienteSnapshot = await getDoc(clienteRef);

      if (!clienteSnapshot.exists()) {
        throw new Error("No se encontró el cliente enlazado mediante cliente_id.");
      }

      const clienteBD = {
        id: clienteSnapshot.id,
        ...clienteSnapshot.data(),
      };

      const montoAbono = Number(abonoTarget.monto) || 0;

      if (montoAbono <= 0) {
        throw new Error("El abono seleccionado contiene un monto inválido.");
      }

      const saldoActual = Number(factura.saldo_pendiente) || 0;
      const montoTotal = Number(factura.monto_total) || 0;

      const nuevoSaldo = redondearMoneda(saldoActual + montoAbono);

      if (nuevoSaldo > montoTotal) {
        throw new Error("La reversión produciría un saldo superior al monto total de la factura.");
      }

      const montoPagadoActual = Number.isFinite(Number(factura.monto_pagado))
        ? Number(factura.monto_pagado)
        : Math.max(0, montoTotal - saldoActual);

      const nuevoMontoPagado = redondearMoneda(Math.max(0, montoPagadoActual - montoAbono));

      const totalNotasCredito = Number(factura.total_notas_credito) || 0;
      const validacionFinanciera = redondearMoneda(
        nuevoSaldo + nuevoMontoPagado + totalNotasCredito,
      ) === redondearMoneda(montoTotal);

      if (!validacionFinanciera) {
        throw new Error(
          "La anulación dejaría la factura descuadrada: saldo + pagado + notas no coincide con el total.",
        );
      }

      const pasaAVencida = nuevoSaldo > 0 && esFacturaVencida(factura);

      const nuevoEstatus = pasaAVencida
        ? "Vencida"
        : nuevoSaldo > 0
          ? "Pendiente"
          : "Pagada";

      const limiteCredito = redondearMoneda(clienteBD.limite_credito);
      const creditoDisponibleActual = redondearMoneda(clienteBD.credito_disponible);
      const nuevoCreditoDisponible =
        limiteCredito > 0
          ? Math.min(
              limiteCredito,
              Math.max(0, redondearMoneda(creditoDisponibleActual - montoAbono)),
            )
          : 0;

      const resumenAnterior = abonoTarget.resumen_pago_anterior_cliente || null;

      const esUltimoAbonoDelCliente =
        clienteBD.ultimo_abono_id === idAbono &&
        clienteBD.ultimo_abono_factura_id === idFactura;

      const esAbonoLegacyQuePareceResumenActual =
        abonoCoincideConResumenClienteLegacy(clienteBD, abonoTarget);

      const debeRestaurarResumenPago =
        esUltimoAbonoDelCliente || esAbonoLegacyQuePareceResumenActual;

      const batch = writeBatch(db);
      const auditRef = doc(collection(db, ACTIVIDAD_COLLECTION));

      batch.set(auditRef, {
        actor_uid: actorUid,
        usuario: userName || "SU",
        modulo: "Facturación",
        tipo: "Anulación de Abono",
        factura_id: idFactura,
        folio: factura.folio || "S/F",
        cliente: factura.cliente || clienteBD.nombre,
        cliente_id: factura.cliente_id,
        campos_modificados: ["saldo_pendiente", "monto_pagado", "estatus"],
        valores_anteriores: {
          saldo_pendiente: saldoActual,
          monto_pagado: montoPagadoActual,
          estatus: factura.estatus,
        },
        valores_nuevos: {
          saldo_pendiente: nuevoSaldo,
          monto_pagado: nuevoMontoPagado,
          estatus: nuevoEstatus,
        },
        detalle: `Se canceló un pago de $${montoAbono.toLocaleString("es-MX")} aplicado a la factura ${factura.folio}. Ese monto volvió a quedar como saldo pendiente del cliente.`,
        serverTime: serverTimestamp(),
      });

      batch.update(facturaRef, {
        saldo_pendiente: nuevoSaldo,
        monto_pagado: nuevoMontoPagado,
        estatus: nuevoEstatus,
        abonos: arrayRemove(abonoTarget),
        ultima_edicion_audit_id: auditRef.id,
        ultima_edicion_actor_uid: actorUid,
        ultima_edicion_at: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const abonoIndexRef = doc(
        db,
        ABONOS_INDEX_COLLECTION,
        construirAbonoIndexId(idFactura, idAbono),
      );

      batch.set(
        abonoIndexRef,
        {
          ...construirAbonoIndexPayload({
            factura,
            abono: abonoTarget,
            actorUid,
            userName: userName || "SU",
            estado: "CANCELADO",
            activo: false,
          }),
          estado: "CANCELADO",
          activo: false,
          cancelado_at: serverTimestamp(),
          cancelado_por_uid: actorUid,
          cancelado_por: userName || "SU",
        },
        { merge: true },
      );

      const clienteUpdatePayload = {
        deuda_actual: increment(montoAbono),
        credito_disponible: nuevoCreditoDisponible,
        updatedAt: serverTimestamp(),
      };

      if (debeRestaurarResumenPago) {
        aplicarResumenPagoCliente(clienteUpdatePayload, resumenAnterior);
      }

      batch.update(clienteRef, clienteUpdatePayload);

      const statsPayload = {
        cartera_total: increment(montoAbono),
        cobrado_historico: increment(-montoAbono),
        abonos_registrados: increment(-montoAbono),
        monto_recuperado: increment(-montoAbono),
        ultima_actualizacion: serverTimestamp(),
      };

      if (esMismoMes(abonoTarget.fecha)) {
        statsPayload.ingresos_mes = increment(-montoAbono);
      }

      if (esMismaSemana(abonoTarget.fecha)) {
        statsPayload.ingresos_semana = increment(-montoAbono);
      }

      if (pasaAVencida) {
        statsPayload.cartera_vencida = increment(montoAbono);
      }

      if (factura.estatus === "Pagada" && nuevoSaldo > 0) {
        statsPayload.facturas_pagadas = increment(-1);
        statsPayload.facturas_pendientes = increment(1);
        statsPayload.total_liquidado = increment(-montoTotal);

        if (pasaAVencida) {
          statsPayload.facturas_vencidas = increment(1);
        }
      }

      const statsRef = doc(db, STATS_COLLECTION, STATS_DOC);
      batch.set(statsRef, statsPayload, { merge: true });

      await batch.commit();

      return { success: true };
    } catch (error) {
      console.error("Error al eliminar el abono:", error);

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },
  modificarFactura: async ({
    idFactura,
    formData,
    userName,
    actor_uid,
  }) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    if (!idFactura) {
      return {
        success: false,
        error: "No se identificó la factura que será modificada.",
      };
    }

    try {
      const actorUid = obtenerActorUidSeguro(actor_uid);
      const facturaRef = doc(db, FACTURAS_COLLECTION, idFactura);
      const statsRef = doc(db, STATS_COLLECTION, STATS_DOC);
      const auditRef = doc(collection(db, ACTIVIDAD_COLLECTION));

      const resultado = await runTransaction(db, async (transaction) => {
        const facturaSnap = await transaction.get(facturaRef);

        if (!facturaSnap.exists()) {
          throw new Error("La factura ya no existe en Firestore.");
        }

        const facturaAnterior = facturaSnap.data();

        if (facturaAnterior.estatus === "Cancelada") {
          throw new Error(
            "Las facturas canceladas no pueden editarse desde este formulario.",
          );
        }

        const clienteAnteriorId = facturaAnterior.cliente_id;
        const clienteNuevoId = String(formData?.cliente_id || "").trim();

        if (!clienteAnteriorId || !clienteNuevoId) {
          throw new Error(
            "La factura debe conservar un cliente enlazado mediante cliente_id.",
          );
        }

        const clienteAnteriorRef = doc(
          db,
          CLIENTES_COLLECTION,
          clienteAnteriorId,
        );
        const clienteNuevoRef = doc(
          db,
          CLIENTES_COLLECTION,
          clienteNuevoId,
        );

        const clienteAnteriorSnap = await transaction.get(clienteAnteriorRef);
        const clienteNuevoSnap =
          clienteNuevoId === clienteAnteriorId
            ? clienteAnteriorSnap
            : await transaction.get(clienteNuevoRef);

        if (!clienteAnteriorSnap.exists()) {
          throw new Error(
            "No se encontró el cliente original enlazado a la factura.",
          );
        }

        if (!clienteNuevoSnap.exists()) {
          throw new Error("El nuevo cliente seleccionado no existe.");
        }

        const clienteAnterior = clienteAnteriorSnap.data();
        const clienteNuevo = clienteNuevoSnap.data();
        const cambiaCliente = clienteAnteriorId !== clienteNuevoId;

        if (
          clienteNuevo.activo === false ||
          clienteNuevo.estatus === "Inactivo"
        ) {
          throw new Error(
            "No se puede asignar la factura a un cliente inactivo.",
          );
        }

        const montoAnterior = redondearMoneda(
          facturaAnterior.monto_total,
        );
        const saldoAnterior = redondearMoneda(
          facturaAnterior.saldo_pendiente,
        );
        const montoPagado = redondearMoneda(
          Number.isFinite(Number(facturaAnterior.monto_pagado))
            ? facturaAnterior.monto_pagado
            : montoAnterior - saldoAnterior,
        );
        const abonos = Array.isArray(facturaAnterior.abonos)
          ? facturaAnterior.abonos
          : [];

        if (cambiaCliente && (montoPagado > 0 || abonos.length > 0)) {
          throw new Error(
            "No se puede cambiar el cliente de una factura que ya tiene abonos. Corrige los demás datos o revierte primero sus pagos.",
          );
        }

        const montoNuevo = redondearMoneda(formData?.monto_total);

        if (montoNuevo <= 0) {
          throw new Error(
            "El monto total de la factura debe ser mayor a cero.",
          );
        }

        if (montoNuevo < montoPagado) {
          throw new Error(
            `El nuevo monto no puede ser menor a los $${montoPagado.toLocaleString("es-MX")} que ya fueron pagados.`,
          );
        }

        const fechaEmision = convertirFechaFormulario(formData?.emision);
        const fechaVencimiento = convertirFechaFormulario(
          formData?.vencimiento,
        );

        if (fechaVencimiento < fechaEmision) {
          throw new Error(
            "La fecha de vencimiento no puede ser anterior a la fecha de emisión.",
          );
        }

        const folioNuevo = String(formData?.folio || "").trim();

        if (!folioNuevo) {
          throw new Error("El folio de la factura es obligatorio.");
        }

        const saldoNuevo = redondearMoneda(montoNuevo - montoPagado);
        const estatusAnteriorReal = calcularEstatusFinanciero({
          saldo: saldoAnterior,
          vencimiento: facturaAnterior.vencimiento,
        });
        const estatusNuevo = calcularEstatusFinanciero({
          saldo: saldoNuevo,
          vencimiento: fechaVencimiento,
        });

        const limiteAnterior = redondearMoneda(
          clienteAnterior.limite_credito,
        );
        const deudaAnteriorGuardada = redondearMoneda(
          clienteAnterior.deuda_actual,
        );
        const disponibleAnteriorGuardado = redondearMoneda(
          clienteAnterior.credito_disponible,
        );

        if (!cambiaCliente) {
          const diferenciaSaldo = redondearMoneda(
            saldoNuevo - saldoAnterior,
          );
          const nuevaDeuda = redondearMoneda(
            deudaAnteriorGuardada + diferenciaSaldo,
          );
          const nuevoDisponible = redondearMoneda(
            disponibleAnteriorGuardado - diferenciaSaldo,
          );

          if (nuevaDeuda < 0) {
            throw new Error(
              "La edición produciría una deuda negativa en el cliente.",
            );
          }

          if (
            nuevoDisponible < 0 ||
            nuevoDisponible > limiteAnterior
          ) {
            throw new Error(
              `El cliente no cuenta con crédito suficiente. Disponible actual: $${disponibleAnteriorGuardado.toLocaleString("es-MX")}.`,
            );
          }

          if (diferenciaSaldo !== 0) {
            transaction.update(clienteAnteriorRef, {
              deuda_actual: nuevaDeuda,
              credito_disponible: nuevoDisponible,
              updatedAt: serverTimestamp(),
            });
          }
        } else {
          const limiteNuevoCliente = redondearMoneda(
            clienteNuevo.limite_credito,
          );
          const deudaNuevoCliente = redondearMoneda(
            clienteNuevo.deuda_actual,
          );
          const disponibleNuevoCliente = redondearMoneda(
            clienteNuevo.credito_disponible,
          );

          const deudaRestauradaAnterior = redondearMoneda(
            deudaAnteriorGuardada - saldoAnterior,
          );
          const disponibleRestauradoAnterior = redondearMoneda(
            disponibleAnteriorGuardado + saldoAnterior,
          );
          const deudaAplicadaNuevo = redondearMoneda(
            deudaNuevoCliente + saldoNuevo,
          );
          const disponibleAplicadoNuevo = redondearMoneda(
            disponibleNuevoCliente - saldoNuevo,
          );

          if (
            deudaRestauradaAnterior < 0 ||
            disponibleRestauradoAnterior > limiteAnterior
          ) {
            throw new Error(
              "Los datos financieros del cliente original no permiten mover la factura de forma segura.",
            );
          }

          if (
            limiteNuevoCliente <= 0 ||
            disponibleAplicadoNuevo < 0 ||
            disponibleAplicadoNuevo > limiteNuevoCliente
          ) {
            throw new Error(
              `El nuevo cliente no tiene crédito suficiente para recibir un saldo de $${saldoNuevo.toLocaleString("es-MX")}.`,
            );
          }

          transaction.update(clienteAnteriorRef, {
            deuda_actual: deudaRestauradaAnterior,
            credito_disponible: disponibleRestauradoAnterior,
            updatedAt: serverTimestamp(),
          });

          transaction.update(clienteNuevoRef, {
            deuda_actual: deudaAplicadaNuevo,
            credito_disponible: disponibleAplicadoNuevo,
            updatedAt: serverTimestamp(),
          });
        }

        const valoresAnteriores = {
          cliente_id: clienteAnteriorId,
          cliente: facturaAnterior.cliente || clienteAnterior.nombre || "S/N",
          grupo: String(facturaAnterior.grupo || "General"),
          folio: String(facturaAnterior.folio || ""),
          monto_total: montoAnterior,
          emision: convertirFechaAString(facturaAnterior.emision),
          vencimiento: convertirFechaAString(
            facturaAnterior.vencimiento,
          ),
          observaciones: String(facturaAnterior.observaciones || ""),
        };

        const valoresNuevos = {
          cliente_id: clienteNuevoId,
          cliente: clienteNuevo.nombre || "S/N",
          grupo: String(formData?.grupo || clienteNuevo.grupo || "General"),
          folio: folioNuevo,
          monto_total: montoNuevo,
          emision: convertirFechaAString(fechaEmision),
          vencimiento: convertirFechaAString(fechaVencimiento),
          observaciones: String(formData?.observaciones || "").trim(),
        };

        const camposComparables = [
          "cliente_id",
          "grupo",
          "folio",
          "monto_total",
          "emision",
          "vencimiento",
          "observaciones",
        ];

        const camposModificados = camposComparables.filter((campo) => {
          if (campo === "cliente_id") {
            return valoresAnteriores.cliente_id !== valoresNuevos.cliente_id;
          }

          return !valoresIguales(
            valoresAnteriores[campo],
            valoresNuevos[campo],
          );
        });

        if (camposModificados.length === 0) {
          return {
            sinCambios: true,
            factura: facturaAnterior,
          };
        }

        const detalleCambios = camposModificados.map((campo) => {
          const valorAnterior =
            campo === "cliente_id"
              ? valoresAnteriores.cliente
              : valoresAnteriores[campo];
          const valorNuevo =
            campo === "cliente_id"
              ? valoresNuevos.cliente
              : valoresNuevos[campo];

          return `${ETIQUETAS_EDICION[campo]}: ${formatearValorAuditoria(
            campo,
            valorAnterior,
          )} → ${formatearValorAuditoria(campo, valorNuevo)}`;
        });

        const facturaUpdate = {
          cliente_id: clienteNuevoId,
          cliente: valoresNuevos.cliente,
          grupo: valoresNuevos.grupo,
          folio: valoresNuevos.folio,
          monto_total: montoNuevo,
          moneda: "MXN",
          emision: Timestamp.fromDate(fechaEmision),
          vencimiento: Timestamp.fromDate(fechaVencimiento),
          observaciones: valoresNuevos.observaciones,
          monto_pagado: montoPagado,
          saldo_pendiente: saldoNuevo,
          estatus: estatusNuevo,
          ultima_edicion_audit_id: auditRef.id,
          ultima_edicion_actor_uid: actorUid,
          ultima_edicion_at: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        transaction.update(facturaRef, facturaUpdate);

        const estabaVencida = estatusAnteriorReal === "Vencida";
        const quedaVencida = estatusNuevo === "Vencida";
        const estabaPagada = saldoAnterior === 0;
        const quedaPagada = saldoNuevo === 0;
        const estabaPendiente = saldoAnterior > 0;
        const quedaPendiente = saldoNuevo > 0;

        const diferenciaCartera = redondearMoneda(
          saldoNuevo - saldoAnterior,
        );
        const diferenciaTotalFacturado = redondearMoneda(
          montoNuevo - montoAnterior,
        );
        const diferenciaCarteraVencida = redondearMoneda(
          (quedaVencida ? saldoNuevo : 0) -
            (estabaVencida ? saldoAnterior : 0),
        );
        const diferenciaPendientes =
          Number(quedaPendiente) - Number(estabaPendiente);
        const diferenciaPagadas =
          Number(quedaPagada) - Number(estabaPagada);
        const diferenciaVencidas =
          Number(quedaVencida) - Number(estabaVencida);
        const diferenciaLiquidado = redondearMoneda(
          (quedaPagada ? montoNuevo : 0) -
            (estabaPagada ? montoAnterior : 0),
        );

        const statsUpdate = {
          ultima_actualizacion: serverTimestamp(),
        };

        if (diferenciaCartera !== 0) {
          statsUpdate.cartera_total = increment(diferenciaCartera);
        }
        if (diferenciaTotalFacturado !== 0) {
          statsUpdate.total_facturado = increment(
            diferenciaTotalFacturado,
          );
        }
        if (diferenciaCarteraVencida !== 0) {
          statsUpdate.cartera_vencida = increment(
            diferenciaCarteraVencida,
          );
        }
        if (diferenciaPendientes !== 0) {
          statsUpdate.facturas_pendientes = increment(
            diferenciaPendientes,
          );
        }
        if (diferenciaPagadas !== 0) {
          statsUpdate.facturas_pagadas = increment(diferenciaPagadas);
        }
        if (diferenciaVencidas !== 0) {
          statsUpdate.facturas_vencidas = increment(
            diferenciaVencidas,
          );
        }
        if (diferenciaLiquidado !== 0) {
          statsUpdate.total_liquidado = increment(
            diferenciaLiquidado,
          );
        }

        transaction.set(statsRef, statsUpdate, { merge: true });

        const anterioresAudit = {};
        const nuevosAudit = {};

        camposModificados.forEach((campo) => {
          if (campo === "cliente_id") {
            anterioresAudit.cliente_id = valoresAnteriores.cliente_id;
            anterioresAudit.cliente = valoresAnteriores.cliente;
            nuevosAudit.cliente_id = valoresNuevos.cliente_id;
            nuevosAudit.cliente = valoresNuevos.cliente;
          } else {
            anterioresAudit[campo] = valoresAnteriores[campo];
            nuevosAudit[campo] = valoresNuevos[campo];
          }
        });

        transaction.set(auditRef, {
          actor_uid: actorUid,
          usuario: userName || "Usuario",
          modulo: "Facturación",
          tipo: "Edición de Factura",
          factura_id: idFactura,
          folio: valoresNuevos.folio,
          cliente: valoresNuevos.cliente,
          cliente_anterior_id: valoresAnteriores.cliente_id,
          cliente_nuevo_id: valoresNuevos.cliente_id,
          campos_modificados: camposModificados,
          valores_anteriores: anterioresAudit,
          valores_nuevos: nuevosAudit,
          detalle: detalleCambios.join(" | "),
          serverTime: serverTimestamp(),
        });

        return {
          sinCambios: false,
          camposModificados,
          factura: {
            id: idFactura,
            ...facturaAnterior,
            ...facturaUpdate,
          },
        };
      });

      return {
        success: true,
        ...resultado,
      };
    } catch (error) {
      console.error("Error al modificar la factura:", error);

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  aplicarNotaCredito: async ({
    factura,
    montoNota,
    motivo,
    observaciones,
    userName,
    actor_uid,
    solicitudNotaId = "",
  }) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    if (!factura?.id) {
      return {
        success: false,
        error: "No se identificó la factura para aplicar la nota de crédito.",
      };
    }

    try {
      const actorUid = obtenerActorUidSeguro(actor_uid);
      const monto = redondearMoneda(montoNota);

      if (monto <= 0) {
        throw new Error("La nota de crédito debe ser mayor a cero.");
      }

      if (!String(motivo || "").trim()) {
        throw new Error("El motivo de la nota de crédito es obligatorio.");
      }

      const facturaRef = doc(db, FACTURAS_COLLECTION, factura.id);
      const statsRef = doc(db, STATS_COLLECTION, STATS_DOC);
      const auditRef = doc(collection(db, ACTIVIDAD_COLLECTION));
      const solicitudNotaRef = solicitudNotaId
        ? doc(db, SOLICITUDES_NOTAS_CREDITO_COLLECTION, solicitudNotaId)
        : null;

      const resultado = await runTransaction(db, async (transaction) => {
        let solicitudNota = null;

        if (solicitudNotaRef) {
          const solicitudSnap = await transaction.get(solicitudNotaRef);

          if (!solicitudSnap.exists()) {
            throw new Error("La solicitud de nota de crédito ya no existe.");
          }

          solicitudNota = {
            id: solicitudSnap.id,
            ...solicitudSnap.data(),
          };

          if (solicitudNota.estatus !== "Pendiente") {
            throw new Error(
              `La solicitud ya fue resuelta como ${solicitudNota.estatus}.`,
            );
          }
        }

        const facturaSnap = await transaction.get(facturaRef);

        if (!facturaSnap.exists()) {
          throw new Error("La factura ya no existe en Firestore.");
        }

        const facturaActual = {
          id: facturaSnap.id,
          ...facturaSnap.data(),
        };

        if (!facturaActual.cliente_id) {
          throw new Error(
            "La factura no tiene cliente_id y no puede ajustarse de forma segura.",
          );
        }

        const clienteRef = doc(
          db,
          CLIENTES_COLLECTION,
          facturaActual.cliente_id,
        );

        const clienteSnap = await transaction.get(clienteRef);

        if (!clienteSnap.exists()) {
          throw new Error("No se encontró el cliente enlazado a la factura.");
        }

        const cliente = clienteSnap.data();
        const saldoAnterior = redondearMoneda(facturaActual.saldo_pendiente);

        if (saldoAnterior <= 0) {
          throw new Error("No se puede aplicar nota de crédito a una factura liquidada.");
        }

        if (monto > saldoAnterior) {
          throw new Error(
            `La nota de crédito no puede superar el saldo pendiente de $${saldoAnterior.toLocaleString("es-MX")}.`,
          );
        }

        if (solicitudNota) {
          const montoSolicitud = redondearMoneda(solicitudNota.monto_nota);
          if (solicitudNota.factura_id !== facturaActual.id) {
            throw new Error("La solicitud no pertenece a esta factura.");
          }

          if (montoSolicitud !== monto) {
            throw new Error("El monto solicitado no coincide con el monto autorizado.");
          }
        }

        const saldoRestante = redondearMoneda(saldoAnterior - monto);
        const montoPagado = redondearMoneda(facturaActual.monto_pagado);
        const totalNotasActual = redondearMoneda(
          facturaActual.total_notas_credito || 0,
        );
        const totalNotasNuevo = redondearMoneda(totalNotasActual + monto);

        const nuevoEstatus =
          saldoRestante === 0
            ? "Pagada"
            : esFacturaVencida(facturaActual)
              ? "Vencida"
              : "Pendiente";

        const nuevaNota = {
          id_nota: `nc-${Date.now()}`,
          fecha: Timestamp.now(),
          monto,
          motivo: String(motivo || "").trim(),
          observaciones: String(observaciones || "").trim(),
          aplicado_por_uid: actorUid,
          aplicado_por: userName || "SU",
          origen: solicitudNota ? "Solicitud ADMIN autorizada" : "Aplicación directa SU",
          solicitud_nota_id: solicitudNota?.id || "",
          saldo_anterior: saldoAnterior,
          saldo_restante: saldoRestante,
          cancelada: false,
          estado: "Activa",
        };

        transaction.update(facturaRef, {
          saldo_pendiente: saldoRestante,
          estatus: nuevoEstatus,
          notas_credito: arrayUnion(nuevaNota),
          total_notas_credito: totalNotasNuevo,
          ultima_accion: {
            tipo: "Nota de crédito",
            monto,
            fecha: Timestamp.now(),
            usuario: userName || "SU",
          },
          updatedAt: serverTimestamp(),
        });

        const limiteCredito = redondearMoneda(cliente.limite_credito);
        const deudaActual = redondearMoneda(cliente.deuda_actual);
        const creditoDisponible = redondearMoneda(cliente.credito_disponible);

        transaction.update(clienteRef, {
          deuda_actual: Math.max(0, redondearMoneda(deudaActual - monto)),
          credito_disponible:
            limiteCredito > 0
              ? Math.min(
                  limiteCredito,
                  Math.max(0, redondearMoneda(creditoDisponible + monto)),
                )
              : 0,
          updatedAt: serverTimestamp(),
        });

        const estabaVencida =
          saldoAnterior > 0 && esFacturaVencida(facturaActual);

        const statsUpdate = {
          cartera_total: increment(-monto),
          total_notas_credito: increment(monto),
          ultima_actualizacion: serverTimestamp(),
        };

        if (estabaVencida) {
          statsUpdate.cartera_vencida = increment(-monto);
        }

        if (saldoRestante === 0) {
          statsUpdate.facturas_pagadas = increment(1);
          statsUpdate.facturas_pendientes = increment(-1);

          if (estabaVencida) {
            statsUpdate.facturas_vencidas = increment(-1);
          }
        }

        transaction.set(statsRef, statsUpdate, { merge: true });

        if (solicitudNotaRef && solicitudNota) {
          transaction.update(solicitudNotaRef, {
            estatus: "Autorizado",
            resolvedAt: serverTimestamp(),
            resolvedBy: userName || "SU",
            resolvedByUid: actorUid,
            nota_credito_id: nuevaNota.id_nota,
            saldo_restante: saldoRestante,
          });
        }

        transaction.set(auditRef, {
          actor_uid: actorUid,
          usuario: userName || "SU",
          modulo: "Facturación",
          tipo: "Nota de Crédito",
          factura_id: facturaActual.id,
          folio: facturaActual.folio || "S/F",
          cliente: facturaActual.cliente || cliente.nombre || "S/N",
          cliente_id: facturaActual.cliente_id,
          detalle: `El SU aplicó una nota de crédito por $${monto.toLocaleString("es-MX")} a la factura ${facturaActual.folio || "S/F"}. Motivo: ${String(motivo || "").trim()}.`,
          serverTime: serverTimestamp(),
        });

        return {
          nota: nuevaNota,
          factura: {
            ...facturaActual,
            saldo_pendiente: saldoRestante,
            estatus: nuevoEstatus,
            total_notas_credito: totalNotasNuevo,
            monto_pagado: montoPagado,
          },
        };
      });

      return {
        success: true,
        data: resultado,
      };
    } catch (error) {
      console.error("Error al aplicar nota de crédito:", error);

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  cancelarNotaCredito: async ({
    factura,
    idNota,
    motivoCancelacion = "",
    userName,
    actor_uid,
  }) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    if (!factura?.id || !idNota) {
      return {
        success: false,
        error: "No se identificó la factura o la nota de crédito.",
      };
    }

    try {
      const actorUid = obtenerActorUidSeguro(actor_uid);
      const facturaRef = doc(db, FACTURAS_COLLECTION, factura.id);
      const statsRef = doc(db, STATS_COLLECTION, STATS_DOC);
      const auditRef = doc(collection(db, ACTIVIDAD_COLLECTION));

      const resultado = await runTransaction(db, async (transaction) => {
        const facturaSnap = await transaction.get(facturaRef);

        if (!facturaSnap.exists()) {
          throw new Error("La factura ya no existe en Firestore.");
        }

        const facturaActual = {
          id: facturaSnap.id,
          ...facturaSnap.data(),
        };

        if (!facturaActual.cliente_id) {
          throw new Error(
            "La factura no tiene cliente_id y no puede ajustarse de forma segura.",
          );
        }

        const notasCredito = Array.isArray(facturaActual.notas_credito)
          ? facturaActual.notas_credito
          : [];

        const notaObjetivo = notasCredito.find(
          (nota) => nota.id_nota === idNota,
        );

        if (!notaObjetivo) {
          throw new Error("No se encontró la nota de crédito seleccionada.");
        }

        const montoNota = redondearMoneda(notaObjetivo.monto);

        if (montoNota <= 0) {
          throw new Error("La nota de crédito contiene un monto inválido.");
        }

        if (notaObjetivo.cancelada === true || ["Anulada", "Cancelada"].includes(notaObjetivo.estado)) {
          throw new Error("La nota de crédito ya está anulada.");
        }

        const solicitudNotaRef = notaObjetivo.solicitud_nota_id
          ? doc(db, SOLICITUDES_NOTAS_CREDITO_COLLECTION, notaObjetivo.solicitud_nota_id)
          : null;

        const solicitudNotaSnap = solicitudNotaRef
          ? await transaction.get(solicitudNotaRef)
          : null;

        const clienteRef = doc(
          db,
          CLIENTES_COLLECTION,
          facturaActual.cliente_id,
        );

        const clienteSnap = await transaction.get(clienteRef);

        if (!clienteSnap.exists()) {
          throw new Error("No se encontró el cliente enlazado a la factura.");
        }

        const cliente = clienteSnap.data();

        const montoTotal = redondearMoneda(facturaActual.monto_total);
        const montoPagado = redondearMoneda(facturaActual.monto_pagado);
        const saldoActual = redondearMoneda(facturaActual.saldo_pendiente);
        const totalNotasActual = redondearMoneda(
          facturaActual.total_notas_credito || 0,
        );
        const totalNotasNuevo = Math.max(
          0,
          redondearMoneda(totalNotasActual - montoNota),
        );

        const saldoNuevo = Math.max(
          0,
          redondearMoneda(montoTotal - montoPagado - totalNotasNuevo),
        );

        if (saldoNuevo < saldoActual) {
          throw new Error("La eliminación calculó un saldo inválido.");
        }

        const nuevoEstatus =
          saldoNuevo === 0
            ? "Pagada"
            : esFacturaVencida(facturaActual)
              ? "Vencida"
              : "Pendiente";

        const fechaAnulacion = Timestamp.now();
        const motivoAnulacion = String(motivoCancelacion || "").trim();

        const notasActualizadas = notasCredito.map((nota) =>
          nota.id_nota === idNota
            ? {
                ...nota,
                cancelada: true,
                estado: "Anulada",
                fecha_anulacion: fechaAnulacion,
                anulada_por: userName || "SU",
                anulada_por_uid: actorUid,
                motivo_cancelacion: motivoAnulacion,
                saldo_revertido: saldoNuevo,
              }
            : nota,
        );

        transaction.update(facturaRef, {
          saldo_pendiente: saldoNuevo,
          estatus: nuevoEstatus,
          notas_credito: notasActualizadas,
          total_notas_credito: totalNotasNuevo,
          ultima_accion: {
            tipo: "Eliminación de nota de crédito",
            monto: montoNota,
            fecha: Timestamp.now(),
            usuario: userName || "SU",
          },
          updatedAt: serverTimestamp(),
        });

        const limiteCredito = redondearMoneda(cliente.limite_credito);
        const deudaActual = redondearMoneda(cliente.deuda_actual);
        const creditoDisponible = redondearMoneda(cliente.credito_disponible);

        transaction.update(clienteRef, {
          deuda_actual: redondearMoneda(deudaActual + montoNota),
          credito_disponible:
            limiteCredito > 0
              ? Math.max(0, redondearMoneda(creditoDisponible - montoNota))
              : 0,
          updatedAt: serverTimestamp(),
        });

        const quedaVencida = saldoNuevo > 0 && esFacturaVencida(facturaActual);
        const estabaPagada = saldoActual === 0;

        const statsUpdate = {
          cartera_total: increment(montoNota),
          total_notas_credito: increment(-montoNota),
          ultima_actualizacion: serverTimestamp(),
        };

        if (quedaVencida) {
          statsUpdate.cartera_vencida = increment(montoNota);
        }

        if (estabaPagada && saldoNuevo > 0) {
          statsUpdate.facturas_pagadas = increment(-1);

          if (quedaVencida) {
            statsUpdate.facturas_vencidas = increment(1);
          } else {
            statsUpdate.facturas_pendientes = increment(1);
          }
        }

        transaction.set(statsRef, statsUpdate, { merge: true });

        if (solicitudNotaRef && solicitudNotaSnap?.exists()) {
          transaction.update(solicitudNotaRef, {
            estatus: "Anulada",
            nota_anulada: true,
            anuladaAt: serverTimestamp(),
            anuladaBy: userName || "SU",
            anuladaByUid: actorUid,
            motivo_anulacion: String(motivoCancelacion || "").trim(),
          });
        }

        transaction.set(auditRef, {
          actor_uid: actorUid,
          usuario: userName || "SU",
          modulo: "Facturación",
          tipo: "Anulación de Nota de Crédito",
          factura_id: facturaActual.id,
          folio: facturaActual.folio || "S/F",
          cliente: facturaActual.cliente || cliente.nombre || "S/N",
          cliente_id: facturaActual.cliente_id,
          monto: montoNota,
          motivo: notaObjetivo.motivo || "Sin motivo",
          motivo_cancelacion: String(motivoCancelacion || "").trim(),
          detalle: `El SU anuló/revirtió una nota de crédito por $${montoNota.toLocaleString("es-MX")} de la factura ${facturaActual.folio || "S/F"}. La nota quedó visible como ANULADA en el historial.`,
          serverTime: serverTimestamp(),
        });

        return {
          factura: {
            ...facturaActual,
            saldo_pendiente: saldoNuevo,
            estatus: nuevoEstatus,
            total_notas_credito: totalNotasNuevo,
            notas_credito: notasActualizadas,
          },
        };
      });

      return {
        success: true,
        data: resultado,
      };
    } catch (error) {
      console.error("Error al eliminar nota de crédito:", error);

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  eliminarFactura: async ({
    idFactura,
    userName,
    actor_uid,
  }) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    if (!idFactura) {
      return {
        success: false,
        error: "No se identificó la factura que será eliminada.",
      };
    }

    try {
      const actorUid = obtenerActorUidSeguro(actor_uid);
      const facturaRef = doc(db, FACTURAS_COLLECTION, idFactura);
      const statsRef = doc(db, STATS_COLLECTION, STATS_DOC);
      const auditRef = doc(collection(db, ACTIVIDAD_COLLECTION));

      const resultado = await runTransaction(db, async (transaction) => {
        const facturaSnap = await transaction.get(facturaRef);

        if (!facturaSnap.exists()) {
          throw new Error("La factura ya no existe en Firestore.");
        }

        const factura = {
          id: facturaSnap.id,
          ...facturaSnap.data(),
        };

        if (!factura.cliente_id) {
          throw new Error(
            "La factura no tiene cliente_id y no puede eliminarse de forma segura.",
          );
        }

        const clienteRef = doc(
          db,
          CLIENTES_COLLECTION,
          factura.cliente_id,
        );

        const clienteSnap = await transaction.get(clienteRef);

        if (!clienteSnap.exists()) {
          throw new Error(
            "No se encontró el cliente enlazado a la factura.",
          );
        }

        const cliente = clienteSnap.data();

        const montoTotal = redondearMoneda(factura.monto_total);
        const saldoPendiente = redondearMoneda(
          factura.saldo_pendiente,
        );
        const montoPagado = redondearMoneda(
          Number.isFinite(Number(factura.monto_pagado))
            ? factura.monto_pagado
            : Math.max(0, montoTotal - saldoPendiente),
        );

        const abonos = Array.isArray(factura.abonos)
          ? factura.abonos
          : [];

        const totalAbonosRegistrados = redondearMoneda(
          abonos.reduce(
            (total, abono) => total + (Number(abono.monto) || 0),
            0,
          ),
        );

        const abonosMes = redondearMoneda(
          abonos.reduce(
            (total, abono) =>
              total +
              (esMismoMes(abono.fecha) ? Number(abono.monto) || 0 : 0),
            0,
          ),
        );

        const abonosSemana = redondearMoneda(
          abonos.reduce(
            (total, abono) =>
              total +
              (esMismaSemana(abono.fecha)
                ? Number(abono.monto) || 0
                : 0),
            0,
          ),
        );

        const estabaVencida =
          saldoPendiente > 0 && esFacturaVencida(factura);
        const estabaPagada = saldoPendiente === 0;
        const estabaPendiente = saldoPendiente > 0;

        const limiteCredito = redondearMoneda(cliente.limite_credito);
        const deudaActual = redondearMoneda(cliente.deuda_actual);
        const creditoDisponible = redondearMoneda(
          cliente.credito_disponible,
        );

        const nuevaDeuda = Math.max(
          0,
          redondearMoneda(deudaActual - saldoPendiente),
        );

        const nuevoCreditoDisponible =
          limiteCredito > 0
            ? Math.min(
                limiteCredito,
                Math.max(
                  0,
                  redondearMoneda(
                    creditoDisponible + saldoPendiente,
                  ),
                ),
              )
            : 0;

        transaction.update(clienteRef, {
          deuda_actual: nuevaDeuda,
          credito_disponible: nuevoCreditoDisponible,
          updatedAt: serverTimestamp(),
        });

        const statsUpdate = {
          facturas_total: increment(-1),
          total_facturado: increment(-montoTotal),
          ultima_actualizacion: serverTimestamp(),
        };

        if (saldoPendiente > 0) {
          statsUpdate.cartera_total = increment(-saldoPendiente);
        }

        if (estabaPendiente) {
          statsUpdate.facturas_pendientes = increment(-1);
        }

        if (estabaPagada) {
          statsUpdate.facturas_pagadas = increment(-1);
          statsUpdate.total_liquidado = increment(-montoTotal);
        }

        if (estabaVencida) {
          statsUpdate.facturas_vencidas = increment(-1);
          statsUpdate.cartera_vencida = increment(-saldoPendiente);
        }

        if (montoPagado > 0) {
          statsUpdate.cobrado_historico = increment(-montoPagado);
        }

        const totalAbonosARevertir =
          totalAbonosRegistrados > 0
            ? totalAbonosRegistrados
            : montoPagado;

        if (totalAbonosARevertir > 0) {
          statsUpdate.abonos_registrados = increment(
            -totalAbonosARevertir,
          );
        }

        if (abonosMes > 0) {
          statsUpdate.ingresos_mes = increment(-abonosMes);
        }

        if (abonosSemana > 0) {
          statsUpdate.ingresos_semana = increment(-abonosSemana);
        }

        transaction.set(statsRef, statsUpdate, { merge: true });

        transaction.set(auditRef, {
          actor_uid: actorUid,
          usuario: userName || "SU",
          modulo: "Facturación",
          tipo: "Eliminación de Factura",
          factura_id: idFactura,
          folio: factura.folio || "S/F",
          cliente: factura.cliente || cliente.nombre || "S/N",
          cliente_id: factura.cliente_id,
          valores_eliminados: {
            folio: factura.folio || "",
            cliente: factura.cliente || "",
            cliente_id: factura.cliente_id || "",
            monto_total: montoTotal,
            monto_pagado: montoPagado,
            saldo_pendiente: saldoPendiente,
            estatus: factura.estatus || "",
            abonos: abonos.length,
          },
          detalle: `El SU eliminó la factura ${factura.folio || "S/F"} de ${factura.cliente || cliente.nombre || "S/N"}. Se ajustaron saldo del cliente, crédito disponible, métricas globales y auditoría.`,
          serverTime: serverTimestamp(),
        });

        transaction.delete(facturaRef);

        return {
          folio: factura.folio || "S/F",
          cliente: factura.cliente || cliente.nombre || "S/N",
        };
      });

      return {
        success: true,
        data: resultado,
      };
    } catch (error) {
      console.error("Error al eliminar la factura:", error);

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },
};