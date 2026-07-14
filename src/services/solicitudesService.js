import { auth, db } from "../config/firebase";
import { facturasService } from "./facturasService";
import { lineaCreditoService } from "./lineaCreditoService";
import {
  collection,
  doc,
  getDoc,
  increment,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

const SOLICITUDES_COLLECTION = "solicitudes";
const SOLICITUDES_NOTAS_CREDITO_COLLECTION = "solicitudes_notas_credito";
const RESUMEN_NOTAS_CREDITO_COLLECTION = "notas_credito_resumen_clientes";
const ACTIVIDAD_COLLECTION = "actividad";

const mapearErrorFirestore = (error) => {
  if (error?.code === "resource-exhausted") {
    return "La cuota diaria de Firestore fue agotada. La solicitud no pudo procesarse. Espera al restablecimiento de la cuota o utiliza el emulador local.";
  }

  if (error?.code === "permission-denied") {
    return "Firestore rechazó la operación por permisos. Verifica que las reglas publicadas coincidan con firestore.rules.";
  }

  if (error?.code === "aborted") {
    return "La solicitud cambió mientras se procesaba. Recarga la página e intenta nuevamente.";
  }

  if (error?.code === "unavailable") {
    return "Firestore no está disponible en este momento. Revisa tu conexión.";
  }

  return error?.message || "No se pudo completar la operación de crédito.";
};

const redondearMoneda = (valor) =>
  Math.round((Number(valor) || 0) * 100) / 100;

const textoLimpio = (valor) => String(valor || "").trim();

const obtenerActorUidSeguro = (actorUidRecibido = "") => {
  const actorUidSesion = auth.currentUser?.uid || "";
  const actorUidSolicitado = textoLimpio(actorUidRecibido);

  if (!actorUidSesion) {
    throw new Error("No existe una sesión activa de Firebase Authentication.");
  }

  if (actorUidSolicitado && actorUidSolicitado !== actorUidSesion) {
    console.warn(
      "actor_uid distinto al UID autenticado. Se utilizará el UID real de Firebase Auth.",
      {
        actor_uid_recibido: actorUidSolicitado,
        uid_auth_real: actorUidSesion,
      },
    );
  }

  return actorUidSesion;
};

const resumenNotaRefPorCliente = (clienteId) =>
  doc(db, RESUMEN_NOTAS_CREDITO_COLLECTION, String(clienteId || "sin-cliente"));

const setResumenNuevaSolicitudNota = (batch, payload) => {
  if (!payload.cliente_id) return;

  const resumenRef = resumenNotaRefPorCliente(payload.cliente_id);
  const monto = Number(payload.monto_nota) || 0;

  batch.set(
    resumenRef,
    {
      id: payload.cliente_id,
      cliente_id: payload.cliente_id,
      cliente: payload.cliente || "S/N",
      total_solicitudes: increment(1),
      pendientes: increment(1),
      autorizadas: increment(0),
      rechazadas: increment(0),
      anuladas: increment(0),
      monto_total_notas: increment(monto),
      ultimo_estado: "Pendiente",
      ultimo_monto_nota: monto,
      ultimo_folio: payload.folio || "S/F",
      ultimo_movimiento_at: serverTimestamp(),
      ultimo_solicitado_por: payload.solicitado_por_nombre || "ADMIN",
      activo: true,
    },
    { merge: true },
  );
};

const setResumenResolucionNota = (writer, solicitud, decision, actorNombre) => {
  if (!solicitud?.cliente_id) return;

  const resumenRef = resumenNotaRefPorCliente(solicitud.cliente_id);
  const monto = Number(solicitud.monto_nota) || 0;
  const campoResultado = decision === "Autorizado" ? "autorizadas" : "rechazadas";

  writer.set(
    resumenRef,
    {
      id: solicitud.cliente_id,
      cliente_id: solicitud.cliente_id,
      cliente: solicitud.cliente || "S/N",
      pendientes: increment(-1),
      [campoResultado]: increment(1),
      ultimo_estado: decision,
      ultimo_monto_nota: monto,
      ultimo_folio: solicitud.folio || "S/F",
      ultimo_movimiento_at: serverTimestamp(),
      ultimo_resuelto_por: actorNombre || "SU",
      activo: true,
    },
    { merge: true },
  );
};

export const solicitudesService = {
  crearSolicitudAumento: async ({
    cliente_id,
    cliente,
    monto_incremento,
    limite_anterior,
    motivo,
    solicitado_por_uid,
    solicitado_por_nombre,
  }) => {
    void limite_anterior;

    try {
      const clienteId = textoLimpio(cliente_id);
      const actorUid = obtenerActorUidSeguro(solicitado_por_uid);
      const actorNombre =
        textoLimpio(solicitado_por_nombre) || "ADMIN";
      const monto = redondearMoneda(monto_incremento);
      const motivoLimpio = textoLimpio(motivo);

      if (!clienteId) {
        throw new Error(
          "El identificador del cliente es obligatorio.",
        );
      }

      if (!Number.isFinite(monto) || monto <= 0) {
        throw new Error(
          "El monto del incremento debe ser mayor a cero.",
        );
      }

      if (!motivoLimpio) {
        throw new Error(
          "El motivo de la solicitud de aumento es obligatorio.",
        );
      }

      const solicitudRef = doc(
        collection(db, SOLICITUDES_COLLECTION),
      );
      const clienteRef = doc(db, "clientes", clienteId);
      const actividadRef = doc(
        collection(db, ACTIVIDAD_COLLECTION),
      );

      const payload = await runTransaction(db, async (transaction) => {
        const clienteSnap = await transaction.get(clienteRef);

        if (!clienteSnap.exists()) {
          throw new Error("El cliente asociado no existe.");
        }

        const clienteData = clienteSnap.data();

        if (
          clienteData.activo === false ||
          clienteData.estatus === "Inactivo"
        ) {
          throw new Error(
            "No se puede solicitar crédito para un cliente inactivo.",
          );
        }

        const limiteAnteriorActual = redondearMoneda(
          clienteData.limite_credito,
        );
        const nuevoLimitePropuesto = redondearMoneda(
          limiteAnteriorActual + monto,
        );
        const clienteNombre =
          textoLimpio(clienteData.nombre) ||
          textoLimpio(cliente) ||
          "S/N";

        const solicitudPayload = {
          id: solicitudRef.id,
          cliente_id: clienteId,
          cliente: clienteNombre,
          monto_incremento: monto,
          limite_anterior: limiteAnteriorActual,
          nuevo_limite_propuesto: nuevoLimitePropuesto,
          motivo: motivoLimpio,
          estatus: "Pendiente",
          solicitado_por_uid: actorUid,
          solicitado_por_nombre: actorNombre,
          createdAt: serverTimestamp(),
        };

        transaction.set(solicitudRef, solicitudPayload);
        transaction.set(actividadRef, {
          actor_uid: actorUid,
          usuario: actorNombre,
          modulo: "Crédito",
          tipo: "Solicitud de Aumento",
          cliente: clienteNombre,
          cliente_id: clienteId,
          solicitud_id: solicitudRef.id,
          detalle: `Solicitó un aumento de $${monto.toLocaleString("es-MX")} para la línea de crédito. La solicitud quedó pendiente de autorización.`,
          serverTime: serverTimestamp(),
        });

        return solicitudPayload;
      });

      return {
        success: true,
        data: payload,
      };
    } catch (error) {
      console.error(
        "Error creando solicitud de crédito:",
        error,
      );

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  aplicarAumentoDirectoSU: async ({
    cliente_id,
    cliente_nombre,
    monto_incremento,
    limite_actual,
    actor_uid,
    actor_nombre,
  }) => {
    void cliente_nombre;
    void limite_actual;

    return lineaCreditoService.registrarMovimientoLineaCredito({
      cliente_id,
      tipo_movimiento: "AUMENTO",
      monto_movimiento: monto_incremento,
      personal_autoriza: actor_nombre || "SU",
      motivo: "Aumento directo autorizado por el Súper Usuario.",
      actor_uid,
      actor_nombre: actor_nombre || "SU",
      actor_rol: "SU",
    });
  },

  crearSolicitudNotaCredito: async ({
    factura,
    montoNota,
    motivo,
    observaciones,
    solicitado_por_uid,
    solicitado_por_nombre,
  }) => {
    try {
      if (!factura?.id) {
        throw new Error("No se identificó la factura para solicitar la nota de crédito.");
      }

      if (!solicitado_por_uid) {
        throw new Error("No se identificó al usuario solicitante.");
      }

      const monto = Number(montoNota);
      const saldoActual = Number(factura.saldo_pendiente) || 0;

      if (!Number.isFinite(monto) || monto <= 0) {
        throw new Error("El monto de la nota de crédito debe ser mayor a cero.");
      }

      if (monto > saldoActual) {
        throw new Error("La nota de crédito no puede superar el saldo pendiente.");
      }

      if (!String(motivo || "").trim()) {
        throw new Error("El motivo de la nota de crédito es obligatorio.");
      }

      const solicitudRef = doc(
        collection(db, SOLICITUDES_NOTAS_CREDITO_COLLECTION),
      );

      const payload = {
        id: solicitudRef.id,
        tipo_solicitud: "NOTA_CREDITO",
        factura_id: factura.id,
        folio: String(factura.folio || "S/F"),
        cliente_id: String(factura.cliente_id || ""),
        cliente: String(factura.cliente || "S/N"),
        monto_nota: monto,
        saldo_actual: saldoActual,
        motivo: String(motivo || "").trim(),
        observaciones: String(observaciones || "").trim(),
        estatus: "Pendiente",
        solicitado_por_uid,
        solicitado_por_nombre: solicitado_por_nombre || "ADMIN",
        createdAt: serverTimestamp(),
      };

      const batch = writeBatch(db);
      batch.set(solicitudRef, payload);
      setResumenNuevaSolicitudNota(batch, payload);

      const actividadRef = doc(
        collection(db, ACTIVIDAD_COLLECTION),
      );

      batch.set(actividadRef, {
        actor_uid: solicitado_por_uid,
        usuario: solicitado_por_nombre || "ADMIN",
        modulo: "Facturación",
        tipo: "Solicitud de Nota de Crédito",
        cliente: payload.cliente,
        factura_id: payload.factura_id,
        folio: payload.folio,
        detalle: `Solicitó una nota de crédito por $${monto.toLocaleString("es-MX")} para la factura ${payload.folio}. Motivo: ${payload.motivo}.`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return {
        success: true,
        data: payload,
      };
    } catch (error) {
      console.error(
        "Error creando solicitud de nota de crédito:",
        error,
      );

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  resolverSolicitudNotaCredito: async ({
    solicitud_id,
    decision,
    actor_uid,
    actor_nombre,
    motivo_resolucion = "",
  }) => {
    try {
      if (!solicitud_id || !decision || !actor_uid) {
        throw new Error("Faltan datos obligatorios para resolver la solicitud.");
      }

      if (!["Autorizado", "Rechazado"].includes(decision)) {
        throw new Error("La decisión indicada no es válida.");
      }

      const solicitudRef = doc(
        db,
        SOLICITUDES_NOTAS_CREDITO_COLLECTION,
        solicitud_id,
      );

      const solicitudSnap = await getDoc(solicitudRef);

      if (!solicitudSnap.exists()) {
        throw new Error("La solicitud de nota de crédito no existe.");
      }

      const solicitudData = {
        id: solicitudSnap.id,
        ...solicitudSnap.data(),
      };

      if (solicitudData.estatus !== "Pendiente") {
        throw new Error(
          `La solicitud ya fue resuelta como ${solicitudData.estatus}.`,
        );
      }

      if (decision === "Autorizado") {
        return facturasService.aplicarNotaCredito({
          factura: { id: solicitudData.factura_id },
          montoNota: solicitudData.monto_nota,
          motivo: solicitudData.motivo,
          observaciones: solicitudData.observaciones,
          userName: actor_nombre || "SU",
          actor_uid,
          solicitudNotaId: solicitudData.id,
        });
      }

      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(solicitudRef);

        if (!snap.exists()) {
          throw new Error("La solicitud de nota de crédito no existe.");
        }

        const solicitud = snap.data();

        if (solicitud.estatus !== "Pendiente") {
          throw new Error(
            `La solicitud ya fue resuelta como ${solicitud.estatus}.`,
          );
        }

        if (!solicitud.cliente_id) {
          throw new Error(
            "La solicitud no contiene un cliente_id válido.",
          );
        }

        const resumenRef = resumenNotaRefPorCliente(solicitud.cliente_id);
        const resumenSnap = await transaction.get(resumenRef);

        if (!resumenSnap.exists()) {
          throw new Error(
            "No existe el resumen de notas de crédito del cliente. Reconstrúyelo antes de rechazar la solicitud.",
          );
        }

        const resumen = resumenSnap.data();
        const pendientesResumen = Number(resumen.pendientes);
        const rechazadasResumen = Number(resumen.rechazadas);

        if (
          !Number.isFinite(pendientesResumen) ||
          pendientesResumen < 1 ||
          !Number.isFinite(rechazadasResumen) ||
          rechazadasResumen < 0
        ) {
          throw new Error(
            "El resumen de notas de crédito está desalineado y el rechazo fue bloqueado.",
          );
        }

        transaction.update(solicitudRef, {
          estatus: "Rechazado",
          resolvedAt: serverTimestamp(),
          resolvedBy: actor_nombre || "SU",
          resolvedByUid: actor_uid,
          motivo_resolucion: String(motivo_resolucion || "").trim(),
        });

        setResumenResolucionNota(
          transaction,
          solicitud,
          "Rechazado",
          actor_nombre || "SU",
        );

        const actividadRef = doc(
          collection(db, ACTIVIDAD_COLLECTION),
        );

        transaction.set(actividadRef, {
          actor_uid,
          usuario: actor_nombre || "SU",
          modulo: "Facturación",
          tipo: "Rechazo de Nota de Crédito",
          cliente: solicitud.cliente || "S/N",
          factura_id: solicitud.factura_id || "",
          folio: solicitud.folio || "S/F",
          motivo_resolucion: String(motivo_resolucion || "").trim(),
          detalle: `El SU rechazó la solicitud de nota de crédito por $${(Number(solicitud.monto_nota) || 0).toLocaleString("es-MX")} de la factura ${solicitud.folio || "S/F"}.${String(motivo_resolucion || "").trim() ? ` Motivo: ${String(motivo_resolucion || "").trim()}.` : ""}`,
          serverTime: serverTimestamp(),
        });
      });

      return { success: true };
    } catch (error) {
      console.error(
        "Fallo al resolver solicitud de nota de crédito:",
        error,
      );

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  resolverSolicitud: async ({
    solicitud_id,
    decision,
    actor_uid,
    actor_nombre,
  }) => {
    try {
      const solicitudId = textoLimpio(solicitud_id);
      const decisionSegura = textoLimpio(decision);
      const actorUid = obtenerActorUidSeguro(actor_uid);
      const actorNombre = textoLimpio(actor_nombre) || "SU";

      if (!solicitudId || !decisionSegura) {
        throw new Error("Faltan datos obligatorios para resolver la solicitud.");
      }

      if (!["Autorizado", "Rechazado"].includes(decisionSegura)) {
        throw new Error("La decisión indicada no es válida.");
      }

      if (decisionSegura === "Autorizado") {
        return lineaCreditoService.autorizarSolicitudAumento({
          solicitud_id: solicitudId,
          actor_uid: actorUid,
          actor_nombre: actorNombre,
        });
      }

      const solicitudRef = doc(
        db,
        SOLICITUDES_COLLECTION,
        solicitudId,
      );

      await runTransaction(db, async (transaction) => {
        const solicitudSnap = await transaction.get(solicitudRef);

        if (!solicitudSnap.exists()) {
          throw new Error("La solicitud no existe.");
        }

        const solicitudData = solicitudSnap.data();

        if (solicitudData.estatus !== "Pendiente") {
          throw new Error(
            `La solicitud ya fue resuelta como ${solicitudData.estatus}.`,
          );
        }

        const montoIncremento = redondearMoneda(
          solicitudData.monto_incremento,
        );

        transaction.update(solicitudRef, {
          estatus: "Rechazado",
          resolvedAt: serverTimestamp(),
          resolvedBy: actorNombre,
          resolvedByUid: actorUid,
        });

        transaction.set(doc(collection(db, ACTIVIDAD_COLLECTION)), {
          actor_uid: actorUid,
          usuario: actorNombre,
          modulo: "Crédito",
          tipo: "Resolución (Rechazado)",
          cliente: solicitudData.cliente || "S/N",
          cliente_id: solicitudData.cliente_id || "",
          solicitud_id: solicitudId,
          detalle: `El SU resolvió como RECHAZADO la solicitud de aumento por $${montoIncremento.toLocaleString("es-MX")}.`,
          serverTime: serverTimestamp(),
        });
      });

      return { success: true };
    } catch (error) {
      console.error("Fallo transaccional al resolver solicitud:", error);

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },
};