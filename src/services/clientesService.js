import { db } from "../config/firebase";
import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

const normalizarGrupo = (valor = "GENERAL") =>
  valor
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase() || "GENERAL";

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
      const batch = writeBatch(db);

      const limiteAsignado =
        userRole === "SU"
          ? Math.max(
              0,
              Number(clienteData.limite_credito) || 0,
            )
          : 0;

      const nuevoDocRef = doc(
        collection(db, "clientes"),
      );

      const folioManual = String(
        clienteData.numero_cliente ||
          clienteData.id ||
          "",
      ).trim();

      const clienteProcesado = {
        numero_cliente: folioManual,
        cliente_id: nuevoDocRef.id,
        nombre: String(clienteData.nombre || "").trim(),
        rfc: String(clienteData.rfc || "")
          .trim()
          .toUpperCase(),
        telefono: String(
          clienteData.telefono || "",
        ).trim(),
        correo: String(clienteData.correo || "")
          .trim()
          .toLowerCase(),
        direccion: String(
          clienteData.direccion || "",
        ).trim(),
        ultima_fecha_pago:
          clienteData.ultima_fecha_pago || "",
        grupo: normalizarGrupo(clienteData.grupo),
        segmentacion:
          clienteData.segmentacion || "Nuevo",
        dias_mensaje:
          Number(clienteData.dias_mensaje) || 0,
        pagare_monto:
          Number(clienteData.pagare_monto) || 0,
        pagare_fecha:
          clienteData.pagare_fecha || "",
        notas_internas: String(
          clienteData.notas ||
            clienteData.notas_internas ||
            "",
        ).trim(),
        limite_credito: limiteAsignado,
        deuda_actual: 0,
        credito_disponible: limiteAsignado,
        monto_ultimo_pago: null,
        fecha_ultimo_pago: null,
        clasificacion: "activo",
        activo: true,
        estatus: "Activo",
        createdAt: serverTimestamp(),
        createdBy: userName || "Sistema",
      };

      if (!clienteProcesado.nombre) {
        throw new Error(
          "El nombre del cliente es obligatorio.",
        );
      }

      batch.set(nuevoDocRef, clienteProcesado);

      const actividadRef = doc(
        collection(db, "actividad"),
      );

      batch.set(actividadRef, {
        actor_uid,
        usuario: userName || "Sistema",
        modulo: "Clientes",
        tipo: "Creación",
        cliente: clienteProcesado.nombre,
        detalle: `Se registró un nuevo cliente con un límite de crédito de $${limiteAsignado.toLocaleString("es-MX")}.`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return {
        success: true,
        data: {
          ...clienteProcesado,
          id: nuevoDocRef.id,
        },
      };
    } catch (error) {
      console.error(
        "Error al crear cliente:",
        error,
      );

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
        "pagare_monto",
        "pagare_fecha",
        "notas_internas",
      ];

      const datosSeguros = {};

      camposPermitidos.forEach((campo) => {
        if (
          Object.prototype.hasOwnProperty.call(
            datosActualizados,
            campo,
          )
        ) {
          datosSeguros[campo] =
            datosActualizados[campo];
        }
      });

      if (
        Object.prototype.hasOwnProperty.call(
          datosSeguros,
          "grupo",
        )
      ) {
        datosSeguros.grupo = normalizarGrupo(
          datosSeguros.grupo,
        );
      }

      if (
        Object.prototype.hasOwnProperty.call(
          datosSeguros,
          "dias_mensaje",
        )
      ) {
        datosSeguros.dias_mensaje =
          Number(datosSeguros.dias_mensaje) || 0;
      }

      if (
        Object.prototype.hasOwnProperty.call(
          datosSeguros,
          "pagare_monto",
        )
      ) {
        datosSeguros.pagare_monto =
          Number(datosSeguros.pagare_monto) || 0;
      }

      if (
        Object.prototype.hasOwnProperty.call(
          datosSeguros,
          "correo",
        )
      ) {
        datosSeguros.correo = String(
          datosSeguros.correo || "",
        )
          .trim()
          .toLowerCase();
      }

      if (
        Object.prototype.hasOwnProperty.call(
          datosSeguros,
          "rfc",
        )
      ) {
        datosSeguros.rfc = String(
          datosSeguros.rfc || "",
        )
          .trim()
          .toUpperCase();
      }

      if (Object.keys(datosSeguros).length === 0) {
        throw new Error(
          "No se recibieron campos editables.",
        );
      }

      const batch = writeBatch(db);
      const clienteRef = doc(db, "clientes", id);

      batch.update(clienteRef, {
        ...datosSeguros,
        updatedAt: serverTimestamp(),
      });

      const actividadRef = doc(
        collection(db, "actividad"),
      );

      batch.set(actividadRef, {
        actor_uid,
        usuario: userName || "Sistema",
        modulo: "Clientes",
        tipo: "Actualización",
        cliente:
          datosSeguros.nombre ||
          nombreCliente ||
          "S/N",
        detalle:
          "Se actualizaron los datos generales del expediente del cliente.",
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return { success: true };
    } catch (error) {
      console.error(
        "Error al actualizar cliente:",
        error,
      );

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
  ) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    try {
      const batch = writeBatch(db);
      const clienteRef = doc(db, "clientes", id);

      batch.update(clienteRef, {
        activo: false,
        estatus: "Inactivo",
        updatedAt: serverTimestamp(),
      });

      const actividadRef = doc(
        collection(db, "actividad"),
      );

      batch.set(actividadRef, {
        actor_uid,
        usuario: userName || "SU",
        modulo: "Clientes",
        tipo: "Inactivación",
        cliente: nombreCliente || "S/N",
        detalle:
          "El SU inactivó el expediente del cliente. Sus facturas y abonos fueron conservados.",
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return { success: true };
    } catch (error) {
      console.error(
        "Error al inactivar cliente:",
        error,
      );

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },
};