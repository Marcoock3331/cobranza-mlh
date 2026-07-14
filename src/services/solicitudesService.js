import { db } from "../config/firebase";
import { facturasService } from "./facturasService";
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
const CLIENTES_COLLECTION = "clientes";
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
    try {
      if (!cliente_id) {
        throw new Error(
          "El identificador del cliente es obligatorio.",
        );
      }

      if (!solicitado_por_uid) {
        throw new Error(
          "No se identificó al usuario solicitante.",
        );
      }

      const monto = Number(monto_incremento);

      if (!Number.isFinite(monto) || monto <= 0) {
        throw new Error(
          "El monto del incremento debe ser mayor a cero.",
        );
      }

      const limiteAnterior =
        Number(limite_anterior) || 0;

      const solicitudRef = doc(
        collection(db, SOLICITUDES_COLLECTION),
      );

      const payload = {
        id: solicitudRef.id,
        cliente_id,
        cliente: String(cliente || "S/N"),
        monto_incremento: monto,
        limite_anterior: limiteAnterior,
        nuevo_limite_propuesto:
          limiteAnterior + monto,
        motivo: String(motivo || "").trim(),
        estatus: "Pendiente",
        solicitado_por_uid,
        solicitado_por_nombre:
          solicitado_por_nombre || "ADMIN",
        createdAt: serverTimestamp(),
      };

      const batch = writeBatch(db);
      batch.set(solicitudRef, payload);

      const actividadRef = doc(
        collection(db, ACTIVIDAD_COLLECTION),
      );

      batch.set(actividadRef, {
        actor_uid: solicitado_por_uid,
        usuario:
          solicitado_por_nombre || "ADMIN",
        modulo: "Crédito",
        tipo: "Solicitud de Aumento",
        cliente: payload.cliente,
        detalle: `Solicitó un aumento de $${monto.toLocaleString("es-MX")} para la línea de crédito. La solicitud quedó pendiente de autorización.`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();

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
    try {
      if (!cliente_id) {
        throw new Error(
          "El identificador del cliente es obligatorio.",
        );
      }

      if (!actor_uid) {
        throw new Error(
          "No se identificó al Súper Usuario responsable.",
        );
      }

      const monto = Number(monto_incremento);

      if (!Number.isFinite(monto) || monto <= 0) {
        throw new Error(
          "El monto del incremento debe ser mayor a cero.",
        );
      }

      const batch = writeBatch(db);
      const clienteRef = doc(
        db,
        CLIENTES_COLLECTION,
        cliente_id,
      );

      batch.update(clienteRef, {
        limite_credito: increment(monto),
        credito_disponible: increment(monto),
        updatedAt: serverTimestamp(),
      });

      const nuevoLimiteTotal =
        (Number(limite_actual) || 0) + monto;

      const actividadRef = doc(
        collection(db, ACTIVIDAD_COLLECTION),
      );

      batch.set(actividadRef, {
        actor_uid,
        usuario: actor_nombre || "SU",
        modulo: "Crédito",
        tipo: "Aumento Directo",
        cliente: cliente_nombre || "S/N",
        detalle: `El SU autorizó directamente un aumento de $${monto.toLocaleString("es-MX")}. El límite quedó en $${nuevoLimiteTotal.toLocaleString("es-MX")}.`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return { success: true };
    } catch (error) {
      console.error(
        "Error aplicando aumento directo:",
        error,
      );

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
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
      if (!solicitud_id || !decision || !actor_uid) {
        throw new Error("Faltan datos obligatorios para resolver la solicitud.");
      }

      if (!["Autorizado", "Rechazado"].includes(decision)) {
        throw new Error("La decisión indicada no es válida.");
      }

      await runTransaction(
        db,
        async (transaction) => {
          const solicitudRef = doc(db, SOLICITUDES_COLLECTION, solicitud_id);
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

          const montoIncremento = Number(solicitudData.monto_incremento) || 0;

          if (decision === "Autorizado") {
            if (!Number.isFinite(montoIncremento) || montoIncremento <= 0) {
              throw new Error("La solicitud contiene un monto inválido.");
            }

            if (!solicitudData.cliente_id) {
              throw new Error("La solicitud no contiene un cliente_id válido.");
            }

            const clienteRef = doc(
              db,
              CLIENTES_COLLECTION,
              solicitudData.cliente_id,
            );
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
                "No se puede autorizar crédito para un cliente inactivo.",
              );
            }

            transaction.update(clienteRef, {
              limite_credito: increment(montoIncremento),
              credito_disponible: increment(montoIncremento),
              updatedAt: serverTimestamp(),
            });
          }

          transaction.update(solicitudRef, {
            estatus: decision,
            resolvedAt: serverTimestamp(),
            resolvedBy: actor_nombre || "SU",
            resolvedByUid: actor_uid,
          });

          transaction.set(doc(collection(db, ACTIVIDAD_COLLECTION)), {
            actor_uid,
            usuario: actor_nombre || "SU",
            modulo: "Crédito",
            tipo: `Resolución (${decision})`,
            cliente: solicitudData.cliente || "S/N",
            detalle: `El SU resolvió como ${decision.toUpperCase()} la solicitud de aumento por $${montoIncremento.toLocaleString("es-MX")}.`,
            serverTime: serverTimestamp(),
          });
        },
        { maxAttempts: 1 },
      );

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