import { db } from "../config/firebase";
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import {
  METRICAS_COLLECTION,
  METRICAS_DOC,
  METRICAS_MOVIMIENTOS_COLLECTION,
  prepararMovimientoMetricas,
} from "./metricasService";

const aplicarMetricasCliente = ({
  transaction,
  statsSnapshot,
  statsRef,
  movimientoRef,
  actorUid,
  actorNombre,
  tipo,
  clienteId,
  actividadId,
  deltaClientesActivos,
}) => {
  if (!statsSnapshot.exists()) {
    throw new Error(
      "Las métricas globales no están inicializadas. Reconstrúyelas antes de continuar.",
    );
  }

  const { movimientoPayload, statsPayload } =
    prepararMovimientoMetricas({
      statsActuales: statsSnapshot.data(),
      movimientoRef,
      actorUid,
      actorNombre,
      tipo,
      entidadTipo: "CLIENTE",
      entidadId: clienteId,
      clienteId,
      actividadId,
      deltas: {
        clientes_activos: deltaClientesActivos,
      },
    });

  transaction.set(movimientoRef, movimientoPayload);
  transaction.update(statsRef, statsPayload);
};

const normalizarGrupo = (valor = "GENERAL") =>
  valor
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase() || "GENERAL";

const normalizarPagareInicial = (valor) => {
  if (valor === true || valor === "SI" || valor === "Sí" || valor === "si") {
    return true;
  }

  if (valor === false || valor === "NO" || valor === "No" || valor === "no") {
    return false;
  }

  return null;
};

const mapearErrorFirestore = (error) => {
  if (error?.code === "resource-exhausted") {
    return "La cuota diaria de Firestore fue agotada. La operación no pudo completarse.";
  }

  if (error?.code === "permission-denied") {
    return "Firestore rechazó la operación por permisos. Verifica las reglas publicadas.";
  }

  return error?.message || "No se pudo completar la operación del cliente.";
};

export const clientesService = {
  crearCliente: async (
    clienteData,
    userName,
    actor_uid,
    userRole,
  ) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    try {
      const rolResponsable = userRole || "ADMIN";

      const limiteAsignado = Math.max(
        0,
        Number(clienteData.limite_credito) || 0,
      );

      const pagareInicial = normalizarPagareInicial(
        clienteData.pagare_inicial,
      );

      const nuevoDocRef = doc(collection(db, "clientes"));
      const movimientoLineaRef = doc(
        collection(db, "lineas_credito_movimientos"),
      );
      const resumenLineaRef = doc(
        db,
        "lineas_credito_resumen_clientes",
        nuevoDocRef.id,
      );

      const folioManual = String(
        clienteData.numero_cliente || clienteData.id || "",
      ).trim();

      const personalAutorizaLinea = String(
        clienteData.linea_credito_autorizado_por ||
          clienteData.personal_autoriza ||
          "",
      ).trim();

      const motivoLinea = String(
        clienteData.linea_credito_motivo ||
          clienteData.motivo_linea_credito ||
          "Línea inicial registrada al crear el expediente.",
      ).trim();

      const estadoLinea = limiteAsignado > 0 ? "Activa" : "Sin línea";
      const autorizadoPor = personalAutorizaLinea || "SIN AUTORIZADOR";

      const clienteProcesado = {
        numero_cliente: folioManual,
        cliente_id: nuevoDocRef.id,
        nombre: String(clienteData.nombre || "").trim(),
        rfc: String(clienteData.rfc || "").trim().toUpperCase(),
        telefono: String(clienteData.telefono || "").trim(),
        correo: String(clienteData.correo || "").trim().toLowerCase(),
        direccion: String(clienteData.direccion || "").trim(),
        ultima_fecha_pago: clienteData.ultima_fecha_pago || "",
        grupo: normalizarGrupo(clienteData.grupo),
        segmentacion: clienteData.segmentacion || "Nuevo",
        dias_mensaje: Number(clienteData.dias_mensaje) || 0,
        pagare_inicial: pagareInicial,
        pagare_monto: Number(clienteData.pagare_monto) || 0,
        pagare_fecha: clienteData.pagare_fecha || "",
        notas_internas: String(
          clienteData.notas || clienteData.notas_internas || "",
        ).trim(),
        limite_credito: limiteAsignado,
        deuda_actual: 0,
        credito_disponible: limiteAsignado,
        linea_credito_estado: estadoLinea,
        linea_credito_autorizado_por: autorizadoPor,
        linea_credito_ultimo_movimiento: movimientoLineaRef.id,
        linea_credito_actualizada_en: serverTimestamp(),
        linea_credito_actualizada_por: userName || "Sistema",
        linea_credito_actualizada_por_uid: actor_uid,
        ultimo_metricas_movimiento_id: "",
        ultimo_metricas_tipo: "CLIENTE_CREADO",
        monto_ultimo_pago: null,
        fecha_ultimo_pago: null,
        clasificacion: "activo",
        activo: true,
        estatus: "Activo",
        createdAt: serverTimestamp(),
        createdBy: userName || "Sistema",
      };

      const camposObligatorios = [
        [clienteProcesado.numero_cliente, "El número de cliente es obligatorio."],
        [clienteProcesado.nombre, "El nombre del cliente es obligatorio."],
        [clienteProcesado.rfc, "El RFC del cliente es obligatorio."],
        [clienteProcesado.telefono, "El teléfono del cliente es obligatorio."],
        [clienteProcesado.direccion, "La dirección del cliente es obligatoria."],
      ];

      const campoFaltante = camposObligatorios.find(
        ([valor]) => !String(valor || "").trim(),
      );

      if (campoFaltante) {
        throw new Error(campoFaltante[1]);
      }

      if (pagareInicial === null) {
        throw new Error("Indica si el cliente cuenta con pagaré inicial.");
      }

      if (limiteAsignado > 0 && !personalAutorizaLinea) {
        throw new Error(
          "El personal que autoriza es obligatorio cuando existe límite inicial.",
        );
      }

      if (limiteAsignado > 0 && !motivoLinea) {
        throw new Error(
          "El motivo de la línea inicial es obligatorio cuando existe límite inicial.",
        );
      }

      const actividadRef = doc(collection(db, "actividad"));
      const statsRef = doc(db, METRICAS_COLLECTION, METRICAS_DOC);
      const metricasMovimientoRef = doc(
        collection(db, METRICAS_MOVIMIENTOS_COLLECTION),
      );

      clienteProcesado.ultimo_metricas_movimiento_id =
        metricasMovimientoRef.id;

      await runTransaction(db, async (transaction) => {
        const statsSnapshot = await transaction.get(statsRef);

        transaction.set(nuevoDocRef, clienteProcesado);

        transaction.set(movimientoLineaRef, {
          id: movimientoLineaRef.id,
          actor_uid,
          cliente_id: nuevoDocRef.id,
          cliente: clienteProcesado.nombre,
          tipo_movimiento: "ALTA_INICIAL",
          limite_anterior: 0,
          limite_nuevo: limiteAsignado,
          diferencia: limiteAsignado,
          deuda_actual: 0,
          credito_disponible_resultante: limiteAsignado,
          estado_resultante: estadoLinea,
          personal_autoriza: autorizadoPor,
          motivo: motivoLinea,
          registrado_por_uid: actor_uid,
          registrado_por_nombre: userName || "Sistema",
          registrado_por_rol: rolResponsable,
          origen: "CLIENTE_NUEVO",
          solicitud_id: "",
          actividad_id: actividadRef.id,
          createdAt: serverTimestamp(),
        });

        transaction.set(resumenLineaRef, {
          id: nuevoDocRef.id,
          cliente_id: nuevoDocRef.id,
          cliente: clienteProcesado.nombre,
          limite_actual: limiteAsignado,
          deuda_actual: 0,
          credito_disponible_actual: limiteAsignado,
          estado_resultante: estadoLinea,
          ultimo_tipo_movimiento: "ALTA_INICIAL",
          ultimo_personal_autoriza: autorizadoPor,
          ultimo_registrado_por: userName || "Sistema",
          ultimo_registrado_por_uid: actor_uid,
          ultimo_registrado_por_rol: rolResponsable,
          ultimo_movimiento_id: movimientoLineaRef.id,
          ultimo_movimiento_at: serverTimestamp(),
          total_movimientos: 1,
          activo: true,
        });

        transaction.set(actividadRef, {
          actor_uid,
          metricas_movimiento_id: metricasMovimientoRef.id,
          usuario: userName || "Sistema",
          modulo: "Clientes",
          tipo: "Creación",
          cliente: clienteProcesado.nombre,
          cliente_id: nuevoDocRef.id,
          movimiento_linea_credito_id: movimientoLineaRef.id,
          personal_autoriza: autorizadoPor,
          detalle: `Se registró un nuevo cliente por ${rolResponsable} con un límite de crédito inicial de $${limiteAsignado.toLocaleString("es-MX")} y pagaré inicial: ${pagareInicial ? "Sí" : "No"}.`,
          serverTime: serverTimestamp(),
        });

        aplicarMetricasCliente({
          transaction,
          statsSnapshot,
          statsRef,
          movimientoRef: metricasMovimientoRef,
          actorUid: actor_uid,
          actorNombre: userName || "Sistema",
          tipo: "CLIENTE_CREADO",
          clienteId: nuevoDocRef.id,
          actividadId: actividadRef.id,
          deltaClientesActivos: 1,
        });
      });

      return {
        success: true,
        data: {
          ...clienteProcesado,
          id: nuevoDocRef.id,
        },
      };
    } catch (error) {
      console.error("Error al crear cliente:", error);

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  modificarCliente: async (
    id,
    datosActualizados,
    nombreCliente,
    userName,
    actor_uid,
  ) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    try {
      const camposPermitidos = [
        "nombre",
        "numero_cliente",
        "rfc",
        "telefono",
        "correo",
        "direccion",
        "grupo",
        "segmentacion",
        "dias_mensaje",
        "pagare_inicial",
        "pagare_monto",
        "pagare_fecha",
        "notas_internas",
      ];

      const datosSeguros = {};

      camposPermitidos.forEach((campo) => {
        if (Object.prototype.hasOwnProperty.call(datosActualizados, campo)) {
          datosSeguros[campo] = datosActualizados[campo];
        }
      });

      if (Object.prototype.hasOwnProperty.call(datosSeguros, "grupo")) {
        datosSeguros.grupo = normalizarGrupo(datosSeguros.grupo);
      }

      if (Object.prototype.hasOwnProperty.call(datosSeguros, "dias_mensaje")) {
        datosSeguros.dias_mensaje = Number(datosSeguros.dias_mensaje) || 0;
      }

      if (Object.prototype.hasOwnProperty.call(datosSeguros, "pagare_inicial")) {
        const pagareInicial = normalizarPagareInicial(datosSeguros.pagare_inicial);

        if (pagareInicial === null) {
          throw new Error("Indica si el cliente cuenta con pagaré inicial.");
        }

        datosSeguros.pagare_inicial = pagareInicial;
      }

      if (Object.prototype.hasOwnProperty.call(datosSeguros, "pagare_monto")) {
        datosSeguros.pagare_monto = Number(datosSeguros.pagare_monto) || 0;
      }

      if (Object.prototype.hasOwnProperty.call(datosSeguros, "correo")) {
        datosSeguros.correo = String(datosSeguros.correo || "")
          .trim()
          .toLowerCase();
      }

      if (Object.prototype.hasOwnProperty.call(datosSeguros, "rfc")) {
        datosSeguros.rfc = String(datosSeguros.rfc || "")
          .trim()
          .toUpperCase();
      }

      if (Object.keys(datosSeguros).length === 0) {
        throw new Error("No se recibieron campos editables.");
      }

      const batch = writeBatch(db);
      const clienteRef = doc(db, "clientes", id);

      batch.update(clienteRef, {
        ...datosSeguros,
        updatedAt: serverTimestamp(),
      });

      const actividadRef = doc(collection(db, "actividad"));

      batch.set(actividadRef, {
        actor_uid,
        usuario: userName || "Sistema",
        modulo: "Clientes",
        tipo: "Actualización",
        cliente: datosSeguros.nombre || nombreCliente || "S/N",
        detalle: "Se actualizaron los datos generales del expediente del cliente.",
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return { success: true };
    } catch (error) {
      console.error("Error al actualizar cliente:", error);

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  eliminarCliente: async (
    id,
    nombreCliente,
    userName,
    actor_uid,
    motivo = "",
  ) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    try {
      const motivoLimpio = String(motivo || "").trim();

      if (!motivoLimpio) {
        throw new Error("El motivo de inactivación es obligatorio.");
      }

      const clienteRef = doc(db, "clientes", id);
      const actividadRef = doc(collection(db, "actividad"));
      const statsRef = doc(db, METRICAS_COLLECTION, METRICAS_DOC);
      const metricasMovimientoRef = doc(
        collection(db, METRICAS_MOVIMIENTOS_COLLECTION),
      );

      await runTransaction(db, async (transaction) => {
        const clienteSnapshot = await transaction.get(clienteRef);
        const statsSnapshot = await transaction.get(statsRef);

        if (!clienteSnapshot.exists()) {
          throw new Error("El cliente ya no existe.");
        }

        const clienteActual = clienteSnapshot.data();

        if (
          clienteActual.activo === false ||
          clienteActual.estatus === "Inactivo"
        ) {
          throw new Error("El cliente ya se encuentra inactivo.");
        }

        transaction.update(clienteRef, {
          activo: false,
          estatus: "Inactivo",
          inactivo_motivo: motivoLimpio,
          inactivo_por: userName || "Sistema",
          inactivo_por_uid: actor_uid,
          inactivo_at: serverTimestamp(),
          ultimo_metricas_movimiento_id: metricasMovimientoRef.id,
          ultimo_metricas_tipo: "CLIENTE_INACTIVADO",
          updatedAt: serverTimestamp(),
        });

        transaction.set(actividadRef, {
          actor_uid,
          metricas_movimiento_id: metricasMovimientoRef.id,
          usuario: userName || "Sistema",
          modulo: "Clientes",
          tipo: "Inactivación",
          cliente: clienteActual.nombre || nombreCliente || "S/N",
          cliente_id: id,
          motivo: motivoLimpio,
          detalle: `Se inactivó el expediente del cliente. Motivo: ${motivoLimpio}. Sus facturas y abonos fueron conservados.`,
          serverTime: serverTimestamp(),
        });

        aplicarMetricasCliente({
          transaction,
          statsSnapshot,
          statsRef,
          movimientoRef: metricasMovimientoRef,
          actorUid: actor_uid,
          actorNombre: userName || "Sistema",
          tipo: "CLIENTE_INACTIVADO",
          clienteId: id,
          actividadId: actividadRef.id,
          deltaClientesActivos: -1,
        });
      });

      return { success: true };
    } catch (error) {
      console.error("Error al inactivar cliente:", error);

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  reactivarCliente: async (
    id,
    nombreCliente,
    userName,
    actor_uid,
    motivo = "",
  ) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    try {
      const motivoLimpio = String(motivo || "").trim();

      if (!motivoLimpio) {
        throw new Error("El motivo de reactivación es obligatorio.");
      }

      const clienteRef = doc(db, "clientes", id);
      const actividadRef = doc(collection(db, "actividad"));
      const statsRef = doc(db, METRICAS_COLLECTION, METRICAS_DOC);
      const metricasMovimientoRef = doc(
        collection(db, METRICAS_MOVIMIENTOS_COLLECTION),
      );

      await runTransaction(db, async (transaction) => {
        const clienteSnapshot = await transaction.get(clienteRef);
        const statsSnapshot = await transaction.get(statsRef);

        if (!clienteSnapshot.exists()) {
          throw new Error("El cliente ya no existe.");
        }

        const clienteActual = clienteSnapshot.data();

        if (
          clienteActual.activo !== false &&
          clienteActual.estatus !== "Inactivo"
        ) {
          throw new Error("El cliente ya se encuentra activo.");
        }

        transaction.update(clienteRef, {
          activo: true,
          estatus: "Activo",
          reactivado_motivo: motivoLimpio,
          reactivado_por: userName || "Sistema",
          reactivado_por_uid: actor_uid,
          reactivado_at: serverTimestamp(),
          ultimo_metricas_movimiento_id: metricasMovimientoRef.id,
          ultimo_metricas_tipo: "CLIENTE_REACTIVADO",
          updatedAt: serverTimestamp(),
        });

        transaction.set(actividadRef, {
          actor_uid,
          metricas_movimiento_id: metricasMovimientoRef.id,
          usuario: userName || "Sistema",
          modulo: "Clientes",
          tipo: "Reactivación",
          cliente: clienteActual.nombre || nombreCliente || "S/N",
          cliente_id: id,
          motivo: motivoLimpio,
          detalle: `Se reactivó el expediente del cliente. Motivo: ${motivoLimpio}.`,
          serverTime: serverTimestamp(),
        });

        aplicarMetricasCliente({
          transaction,
          statsSnapshot,
          statsRef,
          movimientoRef: metricasMovimientoRef,
          actorUid: actor_uid,
          actorNombre: userName || "Sistema",
          tipo: "CLIENTE_REACTIVADO",
          clienteId: id,
          actividadId: actividadRef.id,
          deltaClientesActivos: 1,
        });
      });

      return { success: true };
    } catch (error) {
      console.error("Error al reactivar cliente:", error);

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },
};