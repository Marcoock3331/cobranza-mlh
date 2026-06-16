import { db } from '../config/firebase';
import { 
  collection, doc, serverTimestamp, onSnapshot, query, where, Timestamp, arrayUnion, writeBatch 
} from 'firebase/firestore';
import { formatearFechaSegura } from '../utils/normalizadores';

export const compromisosService = {
  
  escucharCompromisosMes: (mesAnio, callback) => {
    const q = query(
      collection(db, 'compromisos'),
      where('mes_anio', '==', mesAnio)
    );

    return onSnapshot(q, (snapshot) => {
      const compromisos = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          fecha_compromiso_texto: formatearFechaSegura(data.fecha_compromiso, "Sin fecha"),
          ultima_accion_fecha: formatearFechaSegura(data.ultima_accion?.fecha, "Reciente")
        };
      });
      callback(compromisos);
    }, (error) => {
      console.error("Error al escuchar compromisos:", error);
      callback([]);
    });
  },

  crearCompromiso: async (data, userName, actor_uid) => {
    if (!actor_uid) {
      return { success: false, error: "No se identificó al usuario responsable de la acción." };
    }

    try {
      const batch = writeBatch(db);

      const [anio, mes, dia] = data.fecha.split('-');
      const mesAnio = `${anio}-${mes}`;
      const fechaCompromisoTs = Timestamp.fromDate(new Date(anio, mes - 1, dia));

      const accionInicial = {
        responsable: userName || "Admin",
        fecha: Timestamp.now(),
        accion: "Creación",
        detalle: "Evento creado"
      };

      const nuevoCompromiso = {
        cliente_id: data.cliente_id || "N/A",
        cliente_nombre: data.cliente_nombre || "Sin Nombre",
        factura_id: data.factura_id || null,
        folio_factura: data.folio_factura || null,
        tipo_evento: data.tipo_evento || "Recordatorio",
        motivo: data.motivo || "Seguimiento",
        monto: Number(data.monto) || 0,
        telefono: data.telefono || "",
        fecha_compromiso: fechaCompromisoTs,
        mes_anio: mesAnio,
        estatus: "Pendiente",
        ultima_accion: accionInicial,
        historial_acciones: [accionInicial],
        creado_por: userName || "Admin",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const compRef = doc(collection(db, 'compromisos'));
      batch.set(compRef, nuevoCompromiso);

      const actRef = doc(collection(db, 'actividad'));
      batch.set(actRef, {
        actor_uid,
        usuario: userName || 'Admin',
        modulo: 'Calendario',
        tipo: 'Creación',
        cliente: nuevoCompromiso.cliente_nombre,
        detalle: `Se agendó un ${nuevoCompromiso.tipo_evento.toLowerCase()} para el ${dia}/${mes}/${anio}. Motivo: ${nuevoCompromiso.motivo}.`,
        serverTime: serverTimestamp()
      });

      await batch.commit();
      return { success: true, id: compRef.id };
    } catch (error) {
      console.error("Error al crear compromiso:", error);
      return { success: false, error: error.message };
    }
  },

  completarCompromiso: async (id, clienteNombre, userName, actor_uid) => {
    if (!actor_uid) {
      return { success: false, error: "No se identificó al usuario responsable de la acción." };
    }

    try {
      const batch = writeBatch(db);
      const accion = {
        responsable: userName || "Admin",
        fecha: Timestamp.now(),
        accion: "Completar",
        detalle: "Marcado como completado"
      };

      const compRef = doc(db, 'compromisos', id);
      batch.update(compRef, {
        estatus: "Completado",
        fecha_completado: serverTimestamp(),
        completado_por: userName || "Admin",
        updatedAt: serverTimestamp(),
        ultima_accion: accion,
        historial_acciones: arrayUnion(accion)
      });

      const actRef = doc(collection(db, 'actividad'));
      batch.set(actRef, {
        actor_uid,
        usuario: userName || 'Admin',
        modulo: 'Calendario',
        tipo: 'Actualización',
        cliente: clienteNombre || "N/A",
        detalle: `El compromiso de seguimiento fue marcado como completado.`,
        serverTime: serverTimestamp()
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Error completando compromiso:", error);
      return { success: false, error: error.message };
    }
  },

  reprogramarCompromiso: async (id, nuevaFechaStr, clienteNombre, userName, actor_uid) => {
    if (!actor_uid) {
      return { success: false, error: "No se identificó al usuario responsable de la acción." };
    }

    try {
      const batch = writeBatch(db);
      const [anio, mes, dia] = nuevaFechaStr.split('-');
      const mesAnio = `${anio}-${mes}`;
      const nuevaFechaTs = Timestamp.fromDate(new Date(anio, mes - 1, dia));

      const accion = {
        responsable: userName || "Admin",
        fecha: Timestamp.now(),
        accion: "Reprogramación",
        detalle: `Reprogramado para el ${dia}/${mes}/${anio}`
      };

      const compRef = doc(db, 'compromisos', id);
      batch.update(compRef, {
        fecha_compromiso: nuevaFechaTs,
        mes_anio: mesAnio,
        estatus: "Reprogramado",
        updatedAt: serverTimestamp(),
        ultima_accion: accion,
        historial_acciones: arrayUnion(accion)
      });

      const actRef = doc(collection(db, 'actividad'));
      batch.set(actRef, {
        actor_uid,
        usuario: userName || 'Admin',
        modulo: 'Calendario',
        tipo: 'Reprogramación',
        cliente: clienteNombre || "N/A",
        detalle: `El compromiso fue reprogramado para la fecha ${dia}/${mes}/${anio}.`,
        serverTime: serverTimestamp()
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Error reprogramando compromiso:", error);
      return { success: false, error: error.message };
    }
  },

  cancelarCompromiso: async (id, clienteNombre, userName, actor_uid) => {
    if (!actor_uid) {
      return { success: false, error: "No se identificó al usuario responsable de la acción." };
    }

    try {
      const batch = writeBatch(db);
      const accion = {
        responsable: userName || "Admin",
        fecha: Timestamp.now(),
        accion: "Cancelación",
        detalle: "Cancelado por el operador"
      };

      const compRef = doc(db, 'compromisos', id);
      batch.update(compRef, {
        estatus: "Cancelado",
        updatedAt: serverTimestamp(),
        ultima_accion: accion,
        historial_acciones: arrayUnion(accion)
      });

      const actRef = doc(collection(db, 'actividad'));
      batch.set(actRef, {
        actor_uid,
        usuario: userName || 'Admin',
        modulo: 'Calendario',
        tipo: 'Cancelación',
        cliente: clienteNombre || "N/A",
        detalle: `Se canceló el compromiso de seguimiento.`,
        serverTime: serverTimestamp()
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Error cancelando compromiso:", error);
      return { success: false, error: error.message };
    }
  },

  registrarWhatsAppCompromiso: async ({ idCompromiso, esFacturaAuto, clienteNombre, tipoMensaje, userName, actor_uid }) => {
    if (!actor_uid) {
      return { success: false, error: "No se identificó al usuario responsable de la acción." };
    }

    try {
      const batch = writeBatch(db);

      if (!esFacturaAuto && idCompromiso) {
        const accion = {
          responsable: userName || "Admin",
          fecha: Timestamp.now(),
          accion: "WhatsApp",
          detalle: `WhatsApp abierto (${tipoMensaje})`
        };

        const compRef = doc(db, 'compromisos', idCompromiso);
        batch.update(compRef, {
          updatedAt: serverTimestamp(),
          ultima_accion: accion,
          historial_acciones: arrayUnion(accion)
        });
      }

      const actRef = doc(collection(db, 'actividad'));
      batch.set(actRef, {
        actor_uid,
        usuario: userName || 'Admin',
        modulo: 'Calendario',
        tipo: 'WhatsApp',
        cliente: clienteNombre || "N/A",
        detalle: `Se abrió WhatsApp con una plantilla tipo "${tipoMensaje}".`,
        serverTime: serverTimestamp()
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Error registrando WhatsApp:", error);
      return { success: false, error: error.message };
    }
  },

  eliminarCompromiso: async (id, clienteNombre, userName, actor_uid) => {
    if (!actor_uid) {
      return { success: false, error: "No se identificó al usuario responsable de la acción." };
    }

    try {
      const batch = writeBatch(db);

      const compRef = doc(db, 'compromisos', id);
      batch.delete(compRef);

      const actRef = doc(collection(db, 'actividad'));
      batch.set(actRef, {
        actor_uid,
        usuario: userName || 'SU',
        modulo: 'Calendario',
        tipo: 'Eliminación',
        cliente: clienteNombre || "N/A",
        detalle: `El SU eliminó permanentemente un registro de compromiso del calendario.`,
        serverTime: serverTimestamp()
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Error eliminando compromiso:", error);
      return { success: false, error: error.message };
    }
  }
};