import { db } from "../config/firebase";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  increment,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from "firebase/firestore";

const FACTURAS_COLLECTION = "facturas";
const CLIENTES_COLLECTION = "clientes";
const STATS_COLLECTION = "metricas_globales";
const STATS_DOC = "stats_actuales";
const ACTIVIDAD_COLLECTION = "actividad";

const redondearMoneda = (valor) =>
  Math.round((Number(valor) || 0) * 100) / 100;

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
        actor_uid,
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
      const saldoActual =
        Number(factura.saldo_pendiente) || 0;

      const monto = redondearMoneda(montoAbonado);

      if (monto <= 0) {
        throw new Error(
          "El monto del abono debe ser mayor a cero.",
        );
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
        throw new Error(
          "No se encontró el cliente enlazado mediante cliente_id.",
        );
      }

      const nuevoSaldo = redondearMoneda(
        saldoActual - monto,
      );

      const montoPagadoActual = Number.isFinite(
        Number(factura.monto_pagado),
      )
        ? Number(factura.monto_pagado)
        : Math.max(
            0,
            (Number(factura.monto_total) || 0) -
              saldoActual,
          );

      const nuevoMontoPagado = redondearMoneda(
        montoPagadoActual + monto,
      );

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

      const nuevoAbono = {
        id_abono: `abn-${Date.now()}`,
        fecha: Timestamp.now(),
        monto,
        metodo: metodoPago,
        registrado_por: userName || "Usuario",
        saldo_anterior: saldoActual,
        saldo_restante: nuevoSaldo,
      };

      const batch = writeBatch(db);

      const facturaRef = doc(
        db,
        FACTURAS_COLLECTION,
        factura.id,
      );

      batch.update(facturaRef, {
        saldo_pendiente: nuevoSaldo,
        monto_pagado: nuevoMontoPagado,
        estatus: nuevoEstatus,
        abonos: arrayUnion(nuevoAbono),
        updatedAt: serverTimestamp(),
      });

      const clienteRef = doc(
        db,
        CLIENTES_COLLECTION,
        clienteBD.id,
      );

      batch.update(clienteRef, {
        deuda_actual: increment(-monto),
        credito_disponible: increment(monto),
        monto_ultimo_pago: monto,
        fecha_ultimo_pago: serverTimestamp(),
        metodo_ultimo_pago: metodoPago,
        ultimo_deposito_monto: monto,
        ultimo_deposito_fecha: serverTimestamp(),
        ultimo_deposito_metodo: metodoPago,
        updatedAt: serverTimestamp(),
      });

      const statsPayload = {
        cartera_total: increment(-monto),
        ingresos_mes: increment(monto),
        ingresos_semana: increment(monto),
        cobrado_historico: increment(monto),
        abonos_registrados: increment(monto),
        ultima_actualizacion: serverTimestamp(),
      };

      const estabaVencida = esFacturaVencida(factura);

      if (estabaVencida) {
        statsPayload.cartera_vencida = increment(-monto);
      }

      if (nuevoSaldo === 0) {
        statsPayload.facturas_pagadas = increment(1);
        statsPayload.facturas_pendientes = increment(-1);
        statsPayload.total_liquidado = increment(
          Number(factura.monto_total) || 0,
        );

        if (estabaVencida) {
          statsPayload.facturas_vencidas = increment(-1);
        }
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
        actor_uid,
        usuario: userName || "Usuario",
        modulo: "Facturación",
        tipo: "Abono",
        cliente: factura.cliente || clienteBD.nombre,
        detalle: `Abono de $${monto.toLocaleString("es-MX")} registrado vía ${metodoPago} a la factura ${factura.folio}.`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return {
        success: true,
        data: nuevoAbono,
      };
    } catch (error) {
      console.error(
        "Error al registrar el abono:",
        error,
      );

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  eliminarAbono: async ({
    idFactura,
    idAbono,
    facturas,
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
      const factura = facturas.find(
        (item) => item.id === idFactura,
      );

      if (!factura) {
        throw new Error("La factura no fue encontrada.");
      }

      const abonoTarget = (
        factura._abonos_raw || []
      ).find((abono) => abono.id_abono === idAbono);

      if (!abonoTarget) {
        throw new Error("El abono no fue encontrado.");
      }

      const clienteBD = clientes.find(
        (cliente) => cliente.id === factura.cliente_id,
      );

      if (!clienteBD) {
        throw new Error(
          "No se encontró el cliente enlazado mediante cliente_id.",
        );
      }

      const montoAbono =
        Number(abonoTarget.monto) || 0;

      if (montoAbono <= 0) {
        throw new Error(
          "El abono seleccionado contiene un monto inválido.",
        );
      }

      const saldoActual =
        Number(factura.saldo_pendiente) || 0;

      const nuevoSaldo = redondearMoneda(
        saldoActual + montoAbono,
      );

      const montoTotal =
        Number(factura.monto_total) || 0;

      if (nuevoSaldo > montoTotal) {
        throw new Error(
          "La reversión produciría un saldo superior al monto total de la factura.",
        );
      }

      const montoPagadoActual = Number.isFinite(
        Number(factura.monto_pagado),
      )
        ? Number(factura.monto_pagado)
        : Math.max(0, montoTotal - saldoActual);

      const nuevoMontoPagado = redondearMoneda(
        Math.max(0, montoPagadoActual - montoAbono),
      );

      const pasaAVencida =
        nuevoSaldo > 0 && esFacturaVencida(factura);

      const nuevoEstatus = pasaAVencida
        ? "Vencida"
        : nuevoSaldo > 0
          ? "Pendiente"
          : "Pagada";

      const batch = writeBatch(db);

      const facturaRef = doc(
        db,
        FACTURAS_COLLECTION,
        idFactura,
      );

      batch.update(facturaRef, {
        saldo_pendiente: nuevoSaldo,
        monto_pagado: nuevoMontoPagado,
        estatus: nuevoEstatus,
        abonos: arrayRemove(abonoTarget),
        updatedAt: serverTimestamp(),
      });

      const facturasCliente = facturas.filter(
        (item) => item.cliente_id === factura.cliente_id,
      );

      const abonosRestantes = [];

      facturasCliente.forEach((item) => {
        (item._abonos_raw || []).forEach((abono) => {
          if (abono.id_abono !== idAbono) {
            abonosRestantes.push(abono);
          }
        });
      });

      abonosRestantes.sort((primerAbono, segundoAbono) => {
        const fechaPrimera = primerAbono.fecha?.toDate
          ? primerAbono.fecha.toDate().getTime()
          : new Date(primerAbono.fecha).getTime();

        const fechaSegunda = segundoAbono.fecha?.toDate
          ? segundoAbono.fecha.toDate().getTime()
          : new Date(segundoAbono.fecha).getTime();

        return fechaSegunda - fechaPrimera;
      });

      const ultimoAbono = abonosRestantes[0];

      const clienteUpdatePayload = {
        deuda_actual: increment(montoAbono),
        credito_disponible: increment(-montoAbono),
        updatedAt: serverTimestamp(),
      };

      if (ultimoAbono) {
        clienteUpdatePayload.monto_ultimo_pago =
          ultimoAbono.monto;
        clienteUpdatePayload.fecha_ultimo_pago =
          ultimoAbono.fecha;
        clienteUpdatePayload.metodo_ultimo_pago =
          ultimoAbono.metodo;
        clienteUpdatePayload.ultimo_deposito_monto =
          ultimoAbono.monto;
        clienteUpdatePayload.ultimo_deposito_fecha =
          ultimoAbono.fecha;
        clienteUpdatePayload.ultimo_deposito_metodo =
          ultimoAbono.metodo;
      } else {
        clienteUpdatePayload.monto_ultimo_pago = null;
        clienteUpdatePayload.fecha_ultimo_pago = null;
        clienteUpdatePayload.metodo_ultimo_pago = null;
        clienteUpdatePayload.ultimo_deposito_monto = null;
        clienteUpdatePayload.ultimo_deposito_fecha = null;
        clienteUpdatePayload.ultimo_deposito_metodo = null;
      }

      const clienteRef = doc(
        db,
        CLIENTES_COLLECTION,
        clienteBD.id,
      );

      batch.update(clienteRef, clienteUpdatePayload);

      const statsPayload = {
        cartera_total: increment(montoAbono),
        cobrado_historico: increment(-montoAbono),
        abonos_registrados: increment(-montoAbono),
        ultima_actualizacion: serverTimestamp(),
      };

      if (esMismoMes(abonoTarget.fecha)) {
        statsPayload.ingresos_mes = increment(-montoAbono);
      }

      if (esMismaSemana(abonoTarget.fecha)) {
        statsPayload.ingresos_semana =
          increment(-montoAbono);
      }

      if (pasaAVencida) {
        statsPayload.cartera_vencida =
          increment(montoAbono);
      }

      if (
        factura.estatus === "Pagada" &&
        nuevoSaldo > 0
      ) {
        statsPayload.facturas_pagadas = increment(-1);
        statsPayload.facturas_pendientes = increment(1);
        statsPayload.total_liquidado = increment(
          -montoTotal,
        );

        if (pasaAVencida) {
          statsPayload.facturas_vencidas = increment(1);
        }
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
        actor_uid,
        usuario: userName || "Usuario",
        modulo: "Facturación",
        tipo: "Eliminación de Abono",
        cliente: factura.cliente || clienteBD.nombre,
        detalle: `Se anuló un abono de $${montoAbono.toLocaleString("es-MX")} de la factura ${factura.folio}. El saldo y los indicadores fueron restaurados.`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return { success: true };
    } catch (error) {
      console.error(
        "Error al eliminar el abono:",
        error,
      );

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  modificarFactura: async () => ({
    success: false,
    error:
      "La modificación de facturas requiere recalibración de saldos y límites. En construcción.",
  }),

  eliminarFactura: async () => ({
    success: false,
    error:
      "La anulación directa requiere estorno financiero en cascada. En construcción.",
  }),
};