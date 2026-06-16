import { db } from "../config/firebase";
import {
  collection,
  doc,
  increment,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

const SOLICITUDES_COLLECTION = "solicitudes";
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

  resolverSolicitud: async ({
    solicitud_id,
    decision,
    actor_uid,
    actor_nombre,
  }) => {
    try {
      if (
        !solicitud_id ||
        !decision ||
        !actor_uid
      ) {
        throw new Error(
          "Faltan datos obligatorios para resolver la solicitud.",
        );
      }

      if (
        !["Autorizado", "Rechazado"].includes(
          decision,
        )
      ) {
        throw new Error(
          "La decisión indicada no es válida.",
        );
      }

      await runTransaction(
        db,
        async (transaction) => {
          const solicitudRef = doc(
            db,
            SOLICITUDES_COLLECTION,
            solicitud_id,
          );

          const solicitudSnap =
            await transaction.get(solicitudRef);

          if (!solicitudSnap.exists()) {
            throw new Error(
              "La solicitud no existe.",
            );
          }

          const solicitudData =
            solicitudSnap.data();

          if (
            solicitudData.estatus !== "Pendiente"
          ) {
            throw new Error(
              `La solicitud ya fue resuelta como ${solicitudData.estatus}.`,
            );
          }

          const clienteId =
            solicitudData.cliente_id;

          if (!clienteId) {
            throw new Error(
              "La solicitud no contiene un cliente_id válido.",
            );
          }

          const clienteRef = doc(
            db,
            CLIENTES_COLLECTION,
            clienteId,
          );

          const clienteSnap =
            await transaction.get(clienteRef);

          if (!clienteSnap.exists()) {
            throw new Error(
              "El cliente asociado no existe.",
            );
          }

          const clienteData =
            clienteSnap.data();

          if (
            clienteData.activo === false ||
            clienteData.estatus === "Inactivo"
          ) {
            throw new Error(
              "No se puede resolver crédito para un cliente inactivo.",
            );
          }

          const montoIncremento = Number(
            solicitudData.monto_incremento,
          );

          if (
            !Number.isFinite(montoIncremento) ||
            montoIncremento <= 0
          ) {
            throw new Error(
              "La solicitud contiene un monto inválido.",
            );
          }

          if (decision === "Autorizado") {
            transaction.update(clienteRef, {
              limite_credito:
                increment(montoIncremento),
              credito_disponible:
                increment(montoIncremento),
              updatedAt: serverTimestamp(),
            });
          }

          transaction.update(solicitudRef, {
            estatus: decision,
            resolvedAt: serverTimestamp(),
            resolvedBy: actor_nombre || "SU",
            resolvedByUid: actor_uid,
          });

          const actividadRef = doc(
            collection(db, ACTIVIDAD_COLLECTION),
          );

          transaction.set(actividadRef, {
            actor_uid,
            usuario: actor_nombre || "SU",
            modulo: "Crédito",
            tipo: `Resolución (${decision})`,
            cliente:
              solicitudData.cliente || "S/N",
            detalle: `El SU resolvió como ${decision.toUpperCase()} la solicitud de aumento por $${montoIncremento.toLocaleString("es-MX")}.`,
            serverTime: serverTimestamp(),
          });
        },
        {
          maxAttempts: 1,
        },
      );

      return { success: true };
    } catch (error) {
      console.error(
        "Fallo transaccional al resolver solicitud:",
        error,
      );

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },
};