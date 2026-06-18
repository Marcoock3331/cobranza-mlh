import { db } from "../config/firebase";
import {
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { formatearFechaSegura } from "../utils/normalizadores";

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
  responsable: responsable || "Admin",
  fecha: Timestamp.now(),
  accion,
  detalle,
});

export const compromisosService = {
  escucharCompromisosMes: (mesAnio, callback) => {
    const consulta = query(
      collection(db, "compromisos"),
      where("mes_anio", "==", mesAnio),
    );

    return onSnapshot(
      consulta,
      (snapshot) => {
        const compromisos = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();

          return {
            id: docSnap.id,
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
        });

        callback(compromisos);
      },
      (error) => {
        console.error("Error al escuchar compromisos:", error);
        callback([]);
      },
    );
  },

  crearCompromiso: async (data, userName, actor_uid) => {
    const errorActor = validarActor(actor_uid);
    if (errorActor) return errorActor;

    try {
      if (!data?.fecha) {
        throw new Error("La fecha del compromiso es obligatoria.");
      }

      const [anio, mes, dia] = data.fecha.split("-").map(Number);
      const fechaCompromiso = new Date(anio, mes - 1, dia);

      if (
        !anio ||
        !mes ||
        !dia ||
        Number.isNaN(fechaCompromiso.getTime())
      ) {
        throw new Error("La fecha del compromiso no es válida.");
      }

      const batch = writeBatch(db);
      const accionInicial = crearAccion(
        userName,
        "Creación",
        "Evento creado",
      );

      const nuevoCompromiso = {
        cliente_id: data.cliente_id || "N/A",
        cliente_nombre: data.cliente_nombre || "Sin Nombre",
        factura_id: data.factura_id || null,
        folio_factura: data.folio_factura || null,
        tipo_evento: data.tipo_evento || "Recordatorio",
        motivo: data.motivo || "Seguimiento",
        monto: Number(data.monto) || 0,
        telefono: data.telefono || "",
        fecha_compromiso: Timestamp.fromDate(fechaCompromiso),
        mes_anio: `${anio}-${String(mes).padStart(2, "0")}`,
        estatus: "Pendiente",
        ultima_accion: accionInicial,
        historial_acciones: [accionInicial],
        creado_por: userName || "Admin",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const compromisoRef = doc(collection(db, "compromisos"));
      batch.set(compromisoRef, nuevoCompromiso);

      const actividadRef = doc(collection(db, "actividad"));
      batch.set(actividadRef, {
        actor_uid,
        usuario: userName || "Admin",
        modulo: "Calendario",
        tipo: "Creación",
        cliente: nuevoCompromiso.cliente_nombre,
        detalle: `Se agendó un ${nuevoCompromiso.tipo_evento.toLowerCase()} para el ${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${anio}. Motivo: ${nuevoCompromiso.motivo}.`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return { success: true, id: compromisoRef.id };
    } catch (error) {
      console.error("Error al crear compromiso:", error);
      return { success: false, error: error.message };
    }
  },

  completarCompromiso: async (
    id,
    clienteNombre,
    userName,
    actor_uid,
  ) => {
    const errorActor = validarActor(actor_uid);
    if (errorActor) return errorActor;

    try {
      const batch = writeBatch(db);
      const accion = crearAccion(
        userName,
        "Completar",
        "Marcado como completado",
      );

      const compromisoRef = doc(db, "compromisos", id);
      batch.update(compromisoRef, {
        estatus: "Completado",
        fecha_completado: serverTimestamp(),
        completado_por: userName || "Admin",
        completado_por_uid: actor_uid,
        updatedAt: serverTimestamp(),
        ultima_accion: accion,
        historial_acciones: arrayUnion(accion),
      });

      const actividadRef = doc(collection(db, "actividad"));
      batch.set(actividadRef, {
        actor_uid,
        usuario: userName || "Admin",
        modulo: "Calendario",
        tipo: "Actualización",
        cliente: clienteNombre || "N/A",
        detalle:
          "El compromiso de seguimiento fue marcado como completado.",
        serverTime: serverTimestamp(),
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Error completando compromiso:", error);
      return { success: false, error: error.message };
    }
  },

  reprogramarCompromiso: async (
    id,
    nuevaFechaStr,
    clienteNombre,
    userName,
    actor_uid,
  ) => {
    const errorActor = validarActor(actor_uid);
    if (errorActor) return errorActor;

    try {
      const [anio, mes, dia] = nuevaFechaStr.split("-").map(Number);
      const nuevaFecha = new Date(anio, mes - 1, dia);

      if (
        !anio ||
        !mes ||
        !dia ||
        Number.isNaN(nuevaFecha.getTime())
      ) {
        throw new Error("La nueva fecha no es válida.");
      }

      const batch = writeBatch(db);
      const fechaLegible = `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${anio}`;
      const accion = crearAccion(
        userName,
        "Reprogramación",
        `Reprogramado para el ${fechaLegible}`,
      );

      const compromisoRef = doc(db, "compromisos", id);
      batch.update(compromisoRef, {
        fecha_compromiso: Timestamp.fromDate(nuevaFecha),
        mes_anio: `${anio}-${String(mes).padStart(2, "0")}`,
        estatus: "Reprogramado",
        updatedAt: serverTimestamp(),
        ultima_accion: accion,
        historial_acciones: arrayUnion(accion),
      });

      const actividadRef = doc(collection(db, "actividad"));
      batch.set(actividadRef, {
        actor_uid,
        usuario: userName || "Admin",
        modulo: "Calendario",
        tipo: "Reprogramación",
        cliente: clienteNombre || "N/A",
        detalle: `El compromiso fue reprogramado para la fecha ${fechaLegible}.`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Error reprogramando compromiso:", error);
      return { success: false, error: error.message };
    }
  },

  cancelarCompromiso: async (
    id,
    clienteNombre,
    userName,
    actor_uid,
  ) => {
    const errorActor = validarActor(actor_uid);
    if (errorActor) return errorActor;

    try {
      const batch = writeBatch(db);
      const accion = crearAccion(
        userName,
        "Cancelación",
        "Cancelado por el operador",
      );

      const compromisoRef = doc(db, "compromisos", id);
      batch.update(compromisoRef, {
        estatus: "Cancelado",
        updatedAt: serverTimestamp(),
        ultima_accion: accion,
        historial_acciones: arrayUnion(accion),
      });

      const actividadRef = doc(collection(db, "actividad"));
      batch.set(actividadRef, {
        actor_uid,
        usuario: userName || "Admin",
        modulo: "Calendario",
        tipo: "Cancelación",
        cliente: clienteNombre || "N/A",
        detalle: "Se canceló el compromiso de seguimiento.",
        serverTime: serverTimestamp(),
      });

      await batch.commit();
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
    actor_uid,
  }) => {
    const errorActor = validarActor(actor_uid);
    if (errorActor) return errorActor;

    try {
      const batch = writeBatch(db);

      if (!esFacturaAuto && idCompromiso) {
        const accion = crearAccion(
          userName,
          "WhatsApp",
          `WhatsApp abierto (${tipoMensaje})`,
        );

        const compromisoRef = doc(db, "compromisos", idCompromiso);
        batch.update(compromisoRef, {
          updatedAt: serverTimestamp(),
          ultima_accion: accion,
          historial_acciones: arrayUnion(accion),
        });
      }

      const actividadRef = doc(collection(db, "actividad"));
      batch.set(actividadRef, {
        actor_uid,
        usuario: userName || "Admin",
        modulo: "Calendario",
        tipo: "WhatsApp",
        cliente: clienteNombre || "N/A",
        detalle: `Se abrió WhatsApp con una plantilla tipo "${tipoMensaje}".`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Error registrando WhatsApp:", error);
      return { success: false, error: error.message };
    }
  },

  eliminarCompromiso: async (
    id,
    clienteNombre,
    userName,
    actor_uid,
  ) => {
    const errorActor = validarActor(actor_uid);
    if (errorActor) return errorActor;

    try {
      const batch = writeBatch(db);

      const compromisoRef = doc(db, "compromisos", id);
      batch.delete(compromisoRef);

      const actividadRef = doc(collection(db, "actividad"));
      batch.set(actividadRef, {
        actor_uid,
        usuario: userName || "SU",
        modulo: "Calendario",
        tipo: "Eliminación",
        cliente: clienteNombre || "N/A",
        detalle:
          "El SU eliminó permanentemente un registro de compromiso del calendario.",
        serverTime: serverTimestamp(),
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Error eliminando compromiso:", error);
      return { success: false, error: error.message };
    }
  },
};