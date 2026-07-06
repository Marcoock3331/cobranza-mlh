import { db } from "../config/firebase";
import {
  collection,
  doc,
  getDoc,
  increment,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

const CLIENTES_COLLECTION = "clientes";
const ACTIVIDAD_COLLECTION = "actividad";
const MOVIMIENTOS_LINEA_COLLECTION = "lineas_credito_movimientos";
const RESUMEN_LINEA_COLLECTION = "lineas_credito_resumen_clientes";

const TIPOS_MOVIMIENTO = [
  "ALTA_INICIAL",
  "AUMENTO",
  "DISMINUCION",
  "CORRECCION",
];

const ESTADOS_LINEA = {
  SIN_LINEA: "Sin línea",
  ACTIVA: "Activa",
};

const mapearErrorFirestore = (error) => {
  if (error?.code === "resource-exhausted") {
    return "La cuota diaria de Firestore fue agotada. El movimiento de línea no pudo registrarse.";
  }

  if (error?.code === "permission-denied") {
    return "Firestore rechazó el movimiento por permisos. Verifica las reglas publicadas.";
  }

  if (error?.code === "unavailable") {
    return "Firestore no está disponible en este momento. Revisa tu conexión.";
  }

  return error?.message || "No se pudo registrar el movimiento de línea de crédito.";
};

const redondearMoneda = (valor) =>
  Math.round((Number(valor) || 0) * 100) / 100;

const textoLimpio = (valor) => String(valor || "").trim();

const resolverEstadoLinea = ({ nuevoLimite }) => {
  if (nuevoLimite <= 0) return ESTADOS_LINEA.SIN_LINEA;
  return ESTADOS_LINEA.ACTIVA;
};

const resolverDisponible = ({ nuevoLimite, deudaActual }) =>
  Math.max(0, redondearMoneda(nuevoLimite - deudaActual));

const calcularNuevoLimite = ({
  tipoMovimiento,
  montoCapturado,
  limiteAnterior,
}) => {
  if (tipoMovimiento === "AUMENTO") {
    return redondearMoneda(limiteAnterior + montoCapturado);
  }

  if (tipoMovimiento === "DISMINUCION") {
    return redondearMoneda(limiteAnterior - montoCapturado);
  }

  return redondearMoneda(montoCapturado);
};

const construirDescripcionMovimiento = ({
  tipoMovimiento,
  limiteAnterior,
  limiteNuevo,
  diferencia,
  personalAutoriza,
}) => {
  const diferenciaTexto =
    diferencia >= 0
      ? `+$${diferencia.toLocaleString("es-MX")}`
      : `-$${Math.abs(diferencia).toLocaleString("es-MX")}`;

  const etiquetas = {
    ALTA_INICIAL: "alta inicial",
    AUMENTO: "aumento",
    DISMINUCION: "disminución",
    CORRECCION: "corrección",
  };

  return `Se registró ${etiquetas[tipoMovimiento] || "movimiento"} de línea de crédito. Antes: $${limiteAnterior.toLocaleString("es-MX")}. Después: $${limiteNuevo.toLocaleString("es-MX")}. Diferencia: ${diferenciaTexto}. Autorizó: ${personalAutoriza}.`;
};

export const lineaCreditoService = {
  registrarMovimientoLineaCredito: async ({
    cliente_id,
    tipo_movimiento,
    monto_movimiento,
    nuevo_limite,
    personal_autoriza,
    referencia_externa,
    motivo,
    actor_uid,
    actor_nombre,
    actor_rol,
  }) => {
    try {
      if (!cliente_id) {
        throw new Error("No se identificó el cliente para registrar la línea de crédito.");
      }

      if (!actor_uid) {
        throw new Error("No se identificó al usuario responsable del movimiento.");
      }

      const tipoMovimiento = textoLimpio(tipo_movimiento).toUpperCase();

      if (!TIPOS_MOVIMIENTO.includes(tipoMovimiento)) {
        throw new Error("El tipo de movimiento de línea no es válido.");
      }

      const personalAutoriza = textoLimpio(
        personal_autoriza || referencia_externa,
      );

      const motivoLimpio = textoLimpio(motivo);

      if (!personalAutoriza) {
        throw new Error("El personal que autoriza es obligatorio.");
      }

      if (!motivoLimpio) {
        throw new Error("El motivo del movimiento es obligatorio.");
      }

      const montoCapturado = redondearMoneda(
        monto_movimiento ?? nuevo_limite,
      );

      if (!Number.isFinite(montoCapturado) || montoCapturado < 0) {
        throw new Error("El monto capturado debe ser mayor o igual a cero.");
      }

      if (
        ["AUMENTO", "DISMINUCION"].includes(tipoMovimiento) &&
        montoCapturado <= 0
      ) {
        throw new Error(
          tipoMovimiento === "AUMENTO"
            ? "El monto a aumentar debe ser mayor a cero."
            : "El monto a disminuir debe ser mayor a cero.",
        );
      }

      const clienteRef = doc(db, CLIENTES_COLLECTION, cliente_id);
      const clienteSnap = await getDoc(clienteRef);

      if (!clienteSnap.exists()) {
        throw new Error("El cliente no existe o ya no está disponible.");
      }

      const clienteData = clienteSnap.data();

      if (clienteData.activo === false || clienteData.estatus === "Inactivo") {
        throw new Error("No se puede modificar la línea de un cliente inactivo.");
      }

      const limiteAnterior = redondearMoneda(clienteData.limite_credito);
      const deudaActual = redondearMoneda(clienteData.deuda_actual);

      const limiteNuevo = calcularNuevoLimite({
        tipoMovimiento,
        montoCapturado,
        limiteAnterior,
      });

      if (limiteNuevo < 0) {
        throw new Error(
          "La disminución no puede dejar la línea de crédito en un valor negativo.",
        );
      }

      if (limiteNuevo < deudaActual) {
        throw new Error(
          `El nuevo límite de crédito no puede ser menor a la deuda actual del cliente. Deuda actual: $${deudaActual.toLocaleString("es-MX")}.`,
        );
      }

      if (tipoMovimiento === "AUMENTO" && limiteNuevo <= limiteAnterior) {
        throw new Error("Para AUMENTO, el movimiento debe incrementar la línea actual.");
      }

      if (tipoMovimiento === "DISMINUCION" && limiteNuevo >= limiteAnterior) {
        throw new Error("Para DISMINUCIÓN, el movimiento debe reducir la línea actual.");
      }

      const diferencia = redondearMoneda(limiteNuevo - limiteAnterior);

      const estadoLinea = resolverEstadoLinea({
        nuevoLimite: limiteNuevo,
      });

      const creditoDisponible = resolverDisponible({
        nuevoLimite: limiteNuevo,
        deudaActual,
      });

      const movimientoRef = doc(collection(db, MOVIMIENTOS_LINEA_COLLECTION));
      const resumenRef = doc(db, RESUMEN_LINEA_COLLECTION, cliente_id);
      const actividadRef = doc(collection(db, ACTIVIDAD_COLLECTION));
      const batch = writeBatch(db);

      const movimientoPayload = {
        id: movimientoRef.id,
        actor_uid,
        cliente_id,
        cliente: String(clienteData.nombre || "S/N"),
        tipo_movimiento: tipoMovimiento,
        limite_anterior: limiteAnterior,
        limite_nuevo: limiteNuevo,
        diferencia,
        deuda_actual: deudaActual,
        credito_disponible_resultante: creditoDisponible,
        estado_resultante: estadoLinea,
        personal_autoriza: personalAutoriza,
        motivo: motivoLimpio,
        registrado_por_uid: actor_uid,
        registrado_por_nombre: actor_nombre || "ADMIN",
        registrado_por_rol: actor_rol || "ADMIN",
        createdAt: serverTimestamp(),
      };

      batch.set(movimientoRef, movimientoPayload);

      batch.set(
        resumenRef,
        {
          id: cliente_id,
          cliente_id,
          cliente: String(clienteData.nombre || "S/N"),
          limite_actual: limiteNuevo,
          deuda_actual: deudaActual,
          credito_disponible_actual: creditoDisponible,
          estado_resultante: estadoLinea,
          ultimo_tipo_movimiento: tipoMovimiento,
          ultimo_personal_autoriza: personalAutoriza,
          ultimo_registrado_por: actor_nombre || "ADMIN",
          ultimo_registrado_por_uid: actor_uid,
          ultimo_registrado_por_rol: actor_rol || "ADMIN",
          ultimo_movimiento_id: movimientoRef.id,
          ultimo_movimiento_at: serverTimestamp(),
          total_movimientos: increment(1),
          activo: true,
        },
        { merge: true },
      );

      batch.update(clienteRef, {
        limite_credito: limiteNuevo,
        credito_disponible: creditoDisponible,
        linea_credito_estado: estadoLinea,
        linea_credito_autorizado_por: personalAutoriza,
        linea_credito_ultimo_movimiento: movimientoRef.id,
        linea_credito_actualizada_en: serverTimestamp(),
        linea_credito_actualizada_por: actor_nombre || "ADMIN",
        linea_credito_actualizada_por_uid: actor_uid,
        updatedAt: serverTimestamp(),
      });

      batch.set(actividadRef, {
        actor_uid,
        usuario: actor_nombre || "ADMIN",
        modulo: "Crédito",
        tipo: "Movimiento de Línea",
        cliente: String(clienteData.nombre || "S/N"),
        cliente_id,
        movimiento_linea_credito_id: movimientoRef.id,
        personal_autoriza: personalAutoriza,
        detalle: construirDescripcionMovimiento({
          tipoMovimiento,
          limiteAnterior,
          limiteNuevo,
          diferencia,
          personalAutoriza,
        }),
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return {
        success: true,
        data: movimientoPayload,
      };
    } catch (error) {
      console.error("Error registrando movimiento de línea de crédito:", error);

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },
};