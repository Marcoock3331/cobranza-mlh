import { db } from "../config/firebase";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
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
  if (campo === "monto_total") {
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
      const facturaRef = doc(
        db,
        FACTURAS_COLLECTION,
        idFactura,
      );

      const facturaSnapshot = await getDoc(facturaRef);

      if (!facturaSnapshot.exists()) {
        throw new Error("La factura no fue encontrada.");
      }

      const factura = {
        id: facturaSnapshot.id,
        ...facturaSnapshot.data(),
      };

      const abonosFactura = Array.isArray(factura.abonos)
        ? factura.abonos
        : [];

      const abonoTarget = abonosFactura.find(
        (abono) => abono.id_abono === idAbono,
      );

      if (!abonoTarget) {
        throw new Error("El abono no fue encontrado.");
      }

      if (!factura.cliente_id) {
        throw new Error(
          "La factura no contiene un cliente_id válido.",
        );
      }

      const clienteRef = doc(
        db,
        CLIENTES_COLLECTION,
        factura.cliente_id,
      );

      const clienteSnapshot = await getDoc(clienteRef);

      if (!clienteSnapshot.exists()) {
        throw new Error(
          "No se encontró el cliente enlazado mediante cliente_id.",
        );
      }

      const clienteBD = {
        id: clienteSnapshot.id,
        ...clienteSnapshot.data(),
      };

      const montoAbono = Number(abonoTarget.monto) || 0;

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

      const facturasClienteQuery = query(
        collection(db, FACTURAS_COLLECTION),
        where("cliente_id", "==", factura.cliente_id),
      );

      const facturasClienteSnapshot = await getDocs(
        facturasClienteQuery,
      );

      const abonosRestantes = [];

      facturasClienteSnapshot.docs.forEach((documento) => {
        const data = documento.data();
        const abonos = Array.isArray(data.abonos) ? data.abonos : [];

        abonos.forEach((abono) => {
          const esAbonoEliminado =
            documento.id === idFactura &&
            abono.id_abono === idAbono;

          if (!esAbonoEliminado) {
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
      const batch = writeBatch(db);

      batch.update(facturaRef, {
        saldo_pendiente: nuevoSaldo,
        monto_pagado: nuevoMontoPagado,
        estatus: nuevoEstatus,
        abonos: arrayRemove(abonoTarget),
        updatedAt: serverTimestamp(),
      });

      const clienteUpdatePayload = {
        deuda_actual: increment(montoAbono),
        credito_disponible: increment(-montoAbono),
        updatedAt: serverTimestamp(),
      };

      if (ultimoAbono) {
        clienteUpdatePayload.monto_ultimo_pago = ultimoAbono.monto;
        clienteUpdatePayload.fecha_ultimo_pago = ultimoAbono.fecha;
        clienteUpdatePayload.metodo_ultimo_pago = ultimoAbono.metodo;
        clienteUpdatePayload.ultimo_deposito_monto = ultimoAbono.monto;
        clienteUpdatePayload.ultimo_deposito_fecha = ultimoAbono.fecha;
        clienteUpdatePayload.ultimo_deposito_metodo = ultimoAbono.metodo;
      } else {
        clienteUpdatePayload.monto_ultimo_pago = null;
        clienteUpdatePayload.fecha_ultimo_pago = null;
        clienteUpdatePayload.metodo_ultimo_pago = null;
        clienteUpdatePayload.ultimo_deposito_monto = null;
        clienteUpdatePayload.ultimo_deposito_fecha = null;
        clienteUpdatePayload.ultimo_deposito_metodo = null;
      }

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
          ultima_edicion_actor_uid: actor_uid,
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
          actor_uid,
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

  eliminarFactura: async () => ({
    success: false,
    error:
      "La anulación directa requiere estorno financiero en cascada. En construcción.",
  }),
};