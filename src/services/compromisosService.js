import {
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "../config/firebase";
import { formatearFechaSegura } from "../utils/normalizadores";

const COMPROMISOS_COLLECTION = "compromisos";
const ACTIVIDAD_COLLECTION = "actividad";
const ESTADOS_FINALES = ["Completado", "Cancelado"];

const validarActor = (actorUid) => {
  if (!actorUid) {
    return {
      success: false,
      error: "No se identificó al usuario responsable de la acción.",
    };
  }

  return null;
};

const crearAccion = (responsable, accion, detalle) => ({
  responsable: responsable || "Operador MLH",
  fecha: Timestamp.now(),
  accion,
  detalle,
});

const crearActividad = ({ actorUid, userName, tipo, cliente, detalle }) => ({
  actor_uid: actorUid,
  usuario: userName || "Operador MLH",
  modulo: "Calendario",
  tipo,
  cliente: cliente || "Recordatorio general",
  detalle,
  serverTime: serverTimestamp(),
});

const fechaDesdeISO = (fechaISO) => {
  if (!fechaISO) {
    throw new Error("La fecha del compromiso es obligatoria.");
  }

  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  fecha.setHours(12, 0, 0, 0);

  if (!anio || !mes || !dia || Number.isNaN(fecha.getTime())) {
    throw new Error("La fecha del compromiso no es válida.");
  }

  return { fecha, anio, mes, dia };
};

const descripcionVinculo = (tipoVinculo) => {
  if (tipoVinculo === "FACTURA") return "recordatorio de factura";
  if (tipoVinculo === "CLIENTE") return "recordatorio de cliente";
  return "recordatorio general";
};

export const compromisosService = {
  escucharCompromisosMes: (mesAnio, callback) => {
    const consulta = query(
      collection(db, COMPROMISOS_COLLECTION),
      where("mes_anio", "==", mesAnio),
    );

    return onSnapshot(
      consulta,
      (snapshot) => {
        callback(
          snapshot.docs.map((documento) => {
            const data = documento.data();

            return {
              id: documento.id,
              ...data,
              fecha_compromiso_texto: formatearFechaSegura(
                data.fecha_compromiso,
                "Sin fecha",
              ),
              ultima_accion_fecha: formatearFechaSegura(
                data.ultima_accion?.fecha,
                "Reciente",
              ),
            };
          }),
        );
      },
      (error) => {
        console.error("Error al escuchar compromisos:", error);
        callback([]);
      },
    );
  },

  crearCompromiso: async (data, userName, actorUid) => {
    const errorActor = validarActor(actorUid);
    if (errorActor) return errorActor;

    try {
      const { fecha, anio, mes, dia } = fechaDesdeISO(data?.fecha);
      const tipoVinculo = data.tipo_vinculo || "GENERAL";
      const titulo = data.titulo?.trim();
      const motivo = data.motivo?.trim();

      if (!titulo) {
        throw new Error("El título del recordatorio es obligatorio.");
      }

      if (!motivo) {
        throw new Error("El detalle del recordatorio es obligatorio.");
      }

      if (tipoVinculo === "CLIENTE" && !data.cliente_id) {
        throw new Error("Selecciona un cliente para este recordatorio.");
      }

      if (
        tipoVinculo === "FACTURA" &&
        (!data.cliente_id || !data.factura_id)
      ) {
        throw new Error("Selecciona un cliente y una factura.");
      }

      const clienteId =
        tipoVinculo === "GENERAL" ? null : data.cliente_id || null;
      const clienteNombre =
        tipoVinculo === "GENERAL" ? "" : data.cliente_nombre || "";
      const facturaId =
        tipoVinculo === "FACTURA" ? data.factura_id || null : null;
      const folioFactura =
        tipoVinculo === "FACTURA" ? data.folio_factura || "" : "";
      const telefono =
        tipoVinculo === "GENERAL" ? "" : data.telefono || "";
      const monto =
        tipoVinculo === "FACTURA" ? Number(data.monto) || 0 : 0;

      const accionInicial = crearAccion(
        userName,
        "Creación",
        `${descripcionVinculo(tipoVinculo)} creado`,
      );

      const nuevoCompromiso = {
        tipo_vinculo: tipoVinculo,
        titulo,
        motivo,
        cliente_id: clienteId,
        cliente_nombre: clienteNombre,
        factura_id: facturaId,
        folio_factura: folioFactura,
        tipo_evento: data.tipo_evento || "Recordatorio",
        monto,
        telefono,
        fecha_compromiso: Timestamp.fromDate(fecha),
        mes_anio: `${anio}-${String(mes).padStart(2, "0")}`,
        estatus: "Pendiente",
        ultima_accion: accionInicial,
        historial_acciones: [accionInicial],
        creado_por: userName || "Operador MLH",
        creado_por_uid: actorUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const batch = writeBatch(db);
      const compromisoRef = doc(collection(db, COMPROMISOS_COLLECTION));
      const actividadRef = doc(collection(db, ACTIVIDAD_COLLECTION));

      batch.set(compromisoRef, nuevoCompromiso);
      batch.set(
        actividadRef,
        crearActividad({
          actorUid,
          userName,
          tipo: "Creación",
          cliente: clienteNombre,
          detalle: `Se agendó un ${descripcionVinculo(tipoVinculo)} para el ${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${anio}. Título: ${titulo}.`,
        }),
      );

      await batch.commit();
      return { success: true, id: compromisoRef.id };
    } catch (error) {
      console.error("Error al crear compromiso:", error);
      return { success: false, error: error.message };
    }
  },

  completarCompromiso: async (id, clienteNombre, userName, actorUid) => {
    const errorActor = validarActor(actorUid);
    if (errorActor) return errorActor;

    try {
      await runTransaction(db, async (transaction) => {
        const compromisoRef = doc(db, COMPROMISOS_COLLECTION, id);
        const snapshot = await transaction.get(compromisoRef);

        if (!snapshot.exists()) {
          throw new Error("El recordatorio ya no existe.");
        }

        const compromiso = snapshot.data();

        if (ESTADOS_FINALES.includes(compromiso.estatus)) {
          throw new Error("Este recordatorio ya tiene un estado final.");
        }

        const accion = crearAccion(
          userName,
          "Completar",
          "Marcado como completado",
        );

        transaction.update(compromisoRef, {
          estatus: "Completado",
          fecha_completado: serverTimestamp(),
          completado_por: userName || "Operador MLH",
          completado_por_uid: actorUid,
          updatedAt: serverTimestamp(),
          ultima_accion: accion,
          historial_acciones: arrayUnion(accion),
        });

        const actividadRef = doc(collection(db, ACTIVIDAD_COLLECTION));
        transaction.set(
          actividadRef,
          crearActividad({
            actorUid,
            userName,
            tipo: "Actualización",
            cliente: clienteNombre,
            detalle: "El recordatorio fue marcado como completado.",
          }),
        );
      });

      return { success: true };
    } catch (error) {
      console.error("Error completando compromiso:", error);
      return { success: false, error: error.message };
    }
  },

  reprogramarCompromiso: async (
    id,
    nuevaFechaISO,
    clienteNombre,
    userName,
    actorUid,
  ) => {
    const errorActor = validarActor(actorUid);
    if (errorActor) return errorActor;

    try {
      const { fecha, anio, mes, dia } = fechaDesdeISO(nuevaFechaISO);
      const fechaLegible = `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${anio}`;

      await runTransaction(db, async (transaction) => {
        const compromisoRef = doc(db, COMPROMISOS_COLLECTION, id);
        const snapshot = await transaction.get(compromisoRef);

        if (!snapshot.exists()) {
          throw new Error("El recordatorio ya no existe.");
        }

        const compromiso = snapshot.data();

        if (ESTADOS_FINALES.includes(compromiso.estatus)) {
          throw new Error("Un recordatorio cerrado no puede reprogramarse.");
        }

        const accion = crearAccion(
          userName,
          "Reprogramación",
          `Reprogramado para el ${fechaLegible}`,
        );

        transaction.update(compromisoRef, {
          fecha_compromiso: Timestamp.fromDate(fecha),
          mes_anio: `${anio}-${String(mes).padStart(2, "0")}`,
          estatus: "Reprogramado",
          updatedAt: serverTimestamp(),
          ultima_accion: accion,
          historial_acciones: arrayUnion(accion),
        });

        const actividadRef = doc(collection(db, ACTIVIDAD_COLLECTION));
        transaction.set(
          actividadRef,
          crearActividad({
            actorUid,
            userName,
            tipo: "Reprogramación",
            cliente: clienteNombre,
            detalle: `El recordatorio fue reprogramado para el ${fechaLegible}.`,
          }),
        );
      });

      return { success: true };
    } catch (error) {
      console.error("Error reprogramando compromiso:", error);
      return { success: false, error: error.message };
    }
  },

  cancelarCompromiso: async (id, clienteNombre, userName, actorUid) => {
    const errorActor = validarActor(actorUid);
    if (errorActor) return errorActor;

    try {
      await runTransaction(db, async (transaction) => {
        const compromisoRef = doc(db, COMPROMISOS_COLLECTION, id);
        const snapshot = await transaction.get(compromisoRef);

        if (!snapshot.exists()) {
          throw new Error("El recordatorio ya no existe.");
        }

        const compromiso = snapshot.data();

        if (ESTADOS_FINALES.includes(compromiso.estatus)) {
          throw new Error("Este recordatorio ya tiene un estado final.");
        }

        const accion = crearAccion(
          userName,
          "Cancelación",
          "Cancelado por el operador",
        );

        transaction.update(compromisoRef, {
          estatus: "Cancelado",
          updatedAt: serverTimestamp(),
          ultima_accion: accion,
          historial_acciones: arrayUnion(accion),
        });

        const actividadRef = doc(collection(db, ACTIVIDAD_COLLECTION));
        transaction.set(
          actividadRef,
          crearActividad({
            actorUid,
            userName,
            tipo: "Cancelación",
            cliente: clienteNombre,
            detalle: "Se canceló el recordatorio del calendario.",
          }),
        );
      });

      return { success: true };
    } catch (error) {
      console.error("Error cancelando compromiso:", error);
      return { success: false, error: error.message };
    }
  },

  registrarWhatsAppCompromiso: async ({
    idCompromiso,
    esFacturaAuto,
    clienteNombre,
    tipoMensaje,
    userName,
    actor_uid: actorUid,
  }) => {
    const errorActor = validarActor(actorUid);
    if (errorActor) return errorActor;

    try {
      const batch = writeBatch(db);

      if (!esFacturaAuto && idCompromiso) {
        const accion = crearAccion(
          userName,
          "WhatsApp",
          `WhatsApp abierto (${tipoMensaje})`,
        );

        batch.update(doc(db, COMPROMISOS_COLLECTION, idCompromiso), {
          updatedAt: serverTimestamp(),
          ultima_accion: accion,
          historial_acciones: arrayUnion(accion),
        });
      }

      batch.set(
        doc(collection(db, ACTIVIDAD_COLLECTION)),
        crearActividad({
          actorUid,
          userName,
          tipo: "WhatsApp",
          cliente: clienteNombre,
          detalle: `Se abrió WhatsApp con una plantilla tipo "${tipoMensaje}".`,
        }),
      );

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Error registrando WhatsApp:", error);
      return { success: false, error: error.message };
    }
  },

  eliminarCompromiso: async (id, clienteNombre, userName, actorUid) => {
    const errorActor = validarActor(actorUid);
    if (errorActor) return errorActor;

    try {
      const batch = writeBatch(db);

      batch.delete(doc(db, COMPROMISOS_COLLECTION, id));
      batch.set(
        doc(collection(db, ACTIVIDAD_COLLECTION)),
        crearActividad({
          actorUid,
          userName,
          tipo: "Eliminación",
          cliente: clienteNombre,
          detalle:
            "El SU eliminó permanentemente un recordatorio del calendario.",
        }),
      );

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Error eliminando compromiso:", error);
      return { success: false, error: error.message };
    }
  },
};