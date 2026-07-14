import { auth, db } from "../config/firebase";
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

const CLIENTES_COLLECTION = "clientes";
const ACTIVIDAD_COLLECTION = "actividad";
const MOVIMIENTOS_LINEA_COLLECTION = "lineas_credito_movimientos";
const RESUMEN_LINEA_COLLECTION = "lineas_credito_resumen_clientes";
const SOLICITUDES_COLLECTION = "solicitudes";

const TIPOS_MOVIMIENTO = [
  "ALTA_INICIAL",
  "AUMENTO",
  "DISMINUCION",
  "CORRECCION",
];

const ORIGENES_MOVIMIENTO = {
  DIRECTO: "MOVIMIENTO_DIRECTO",
  SOLICITUD: "SOLICITUD_AUTORIZADA",
};

const ESTADOS_LINEA = {
  SIN_LINEA: "Sin línea",
  ACTIVA: "Activa",
  EXCEDIDA: "Excedida",
};

const mapearErrorFirestore = (error) => {
  if (error?.code === "resource-exhausted") {
    return "La cuota diaria de Firestore fue agotada. El movimiento de línea no pudo registrarse.";
  }

  if (error?.code === "permission-denied") {
    return "Firestore rechazó el movimiento por permisos. Verifica las reglas publicadas.";
  }

  if (error?.code === "aborted") {
    return "La línea de crédito cambió mientras se procesaba. La operación fue reintentada o rechazada para evitar sobrescrituras.";
  }

  if (error?.code === "unavailable") {
    return "Firestore no está disponible en este momento. Revisa tu conexión.";
  }

  return error?.message || "No se pudo registrar el movimiento de línea de crédito.";
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

const normalizarRolActor = (actorRol = "") => {
  const rol = textoLimpio(actorRol).toUpperCase();

  if (!["SU", "ADMIN"].includes(rol)) {
    throw new Error("El rol del usuario responsable no es válido.");
  }

  return rol;
};

const resolverEstadoLinea = ({ nuevoLimite, deudaActual }) => {
  if (deudaActual > nuevoLimite) return ESTADOS_LINEA.EXCEDIDA;
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

const validarYCalcularMovimiento = ({
  tipoMovimiento,
  montoCapturado,
  limiteAnterior,
  deudaActual,
}) => {
  if (!TIPOS_MOVIMIENTO.includes(tipoMovimiento)) {
    throw new Error("El tipo de movimiento de línea no es válido.");
  }

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

  if (tipoMovimiento === "ALTA_INICIAL") {
    if (limiteAnterior > 0) {
      throw new Error(
        "La línea ya existe. Usa AUMENTO, DISMINUCIÓN o CORRECCIÓN.",
      );
    }

    if (limiteNuevo <= 0) {
      throw new Error("El alta inicial debe asignar un límite mayor a cero.");
    }
  }

  if (tipoMovimiento === "AUMENTO" && limiteNuevo <= limiteAnterior) {
    throw new Error("Para AUMENTO, el movimiento debe incrementar la línea actual.");
  }

  if (tipoMovimiento === "DISMINUCION" && limiteNuevo >= limiteAnterior) {
    throw new Error("Para DISMINUCIÓN, el movimiento debe reducir la línea actual.");
  }

  if (
    tipoMovimiento === "CORRECCION" &&
    Math.abs(limiteNuevo - limiteAnterior) < 0.005
  ) {
    throw new Error("La corrección debe modificar el límite actual.");
  }

  const diferencia = redondearMoneda(limiteNuevo - limiteAnterior);
  const creditoDisponible = resolverDisponible({
    nuevoLimite: limiteNuevo,
    deudaActual,
  });
  const estadoLinea = resolverEstadoLinea({
    nuevoLimite: limiteNuevo,
    deudaActual,
  });

  return {
    limiteNuevo,
    diferencia,
    creditoDisponible,
    estadoLinea,
  };
};

const validarClienteActivo = (clienteData = {}) => {
  if (clienteData.activo === false || clienteData.estatus === "Inactivo") {
    throw new Error("No se puede modificar la línea de un cliente inactivo.");
  }
};

const obtenerTotalMovimientosAnterior = (resumenSnap, clienteId) => {
  if (!resumenSnap.exists()) return 0;

  const resumen = resumenSnap.data();

  if (
    resumen.cliente_id !== clienteId ||
    (resumen.id && resumen.id !== clienteId)
  ) {
    throw new Error(
      "El resumen de línea de crédito pertenece a otro cliente.",
    );
  }

  const totalMovimientos = Number(resumen.total_movimientos);

  if (!Number.isFinite(totalMovimientos) || totalMovimientos < 0) {
    throw new Error(
      "El resumen de línea de crédito está desalineado. Reconstrúyelo antes de continuar.",
    );
  }

  return totalMovimientos;
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

const construirPayloadsMovimiento = ({
  movimientoRef,
  actividadRef,
  clienteId,
  clienteData,
  tipoMovimiento,
  limiteAnterior,
  limiteNuevo,
  diferencia,
  deudaActual,
  creditoDisponible,
  estadoLinea,
  personalAutoriza,
  motivo,
  actorUid,
  actorNombre,
  actorRol,
  totalMovimientos,
  origen,
  solicitudId = "",
}) => {
  const clienteNombre = textoLimpio(clienteData.nombre) || "S/N";
  const responsable = textoLimpio(actorNombre) || actorRol;

  const movimientoPayload = {
    id: movimientoRef.id,
    actor_uid: actorUid,
    cliente_id: clienteId,
    cliente: clienteNombre,
    tipo_movimiento: tipoMovimiento,
    limite_anterior: limiteAnterior,
    limite_nuevo: limiteNuevo,
    diferencia,
    deuda_actual: deudaActual,
    credito_disponible_resultante: creditoDisponible,
    estado_resultante: estadoLinea,
    personal_autoriza: personalAutoriza,
    motivo,
    registrado_por_uid: actorUid,
    registrado_por_nombre: responsable,
    registrado_por_rol: actorRol,
    origen,
    solicitud_id: solicitudId,
    actividad_id: actividadRef.id,
    createdAt: serverTimestamp(),
  };

  const resumenPayload = {
    id: clienteId,
    cliente_id: clienteId,
    cliente: clienteNombre,
    limite_actual: limiteNuevo,
    deuda_actual: deudaActual,
    credito_disponible_actual: creditoDisponible,
    estado_resultante: estadoLinea,
    ultimo_tipo_movimiento: tipoMovimiento,
    ultimo_personal_autoriza: personalAutoriza,
    ultimo_registrado_por: responsable,
    ultimo_registrado_por_uid: actorUid,
    ultimo_registrado_por_rol: actorRol,
    ultimo_movimiento_id: movimientoRef.id,
    ultimo_movimiento_at: serverTimestamp(),
    total_movimientos: totalMovimientos,
    activo: true,
  };

  const clienteUpdate = {
    limite_credito: limiteNuevo,
    credito_disponible: creditoDisponible,
    linea_credito_estado: estadoLinea,
    linea_credito_autorizado_por: personalAutoriza,
    linea_credito_ultimo_movimiento: movimientoRef.id,
    linea_credito_actualizada_en: serverTimestamp(),
    linea_credito_actualizada_por: responsable,
    linea_credito_actualizada_por_uid: actorUid,
    updatedAt: serverTimestamp(),
  };

  const actividadPayload = {
    actor_uid: actorUid,
    usuario: responsable,
    modulo: "Crédito",
    tipo:
      origen === ORIGENES_MOVIMIENTO.SOLICITUD
        ? "Autorización de Línea"
        : "Movimiento de Línea",
    cliente: clienteNombre,
    cliente_id: clienteId,
    movimiento_linea_credito_id: movimientoRef.id,
    solicitud_id: solicitudId,
    personal_autoriza: personalAutoriza,
    detalle: construirDescripcionMovimiento({
      tipoMovimiento,
      limiteAnterior,
      limiteNuevo,
      diferencia,
      personalAutoriza,
    }),
    serverTime: serverTimestamp(),
  };

  return {
    movimientoPayload,
    resumenPayload,
    clienteUpdate,
    actividadPayload,
  };
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
      const clienteId = textoLimpio(cliente_id);

      if (!clienteId) {
        throw new Error(
          "No se identificó el cliente para registrar la línea de crédito.",
        );
      }

      const actorUid = obtenerActorUidSeguro(actor_uid);
      const actorRol = normalizarRolActor(actor_rol);
      const actorNombre = textoLimpio(actor_nombre) || actorRol;
      const tipoMovimiento = textoLimpio(tipo_movimiento).toUpperCase();
      const personalAutoriza = textoLimpio(
        personal_autoriza || referencia_externa,
      );
      const motivoLimpio = textoLimpio(motivo);
      const montoCapturado = redondearMoneda(
        monto_movimiento ?? nuevo_limite,
      );

      if (!personalAutoriza) {
        throw new Error("El personal que autoriza es obligatorio.");
      }

      if (!motivoLimpio) {
        throw new Error("El motivo del movimiento es obligatorio.");
      }

      const clienteRef = doc(db, CLIENTES_COLLECTION, clienteId);
      const resumenRef = doc(db, RESUMEN_LINEA_COLLECTION, clienteId);
      const movimientoRef = doc(
        collection(db, MOVIMIENTOS_LINEA_COLLECTION),
      );
      const actividadRef = doc(collection(db, ACTIVIDAD_COLLECTION));

      const resultado = await runTransaction(db, async (transaction) => {
        const clienteSnap = await transaction.get(clienteRef);
        const resumenSnap = await transaction.get(resumenRef);

        if (!clienteSnap.exists()) {
          throw new Error("El cliente no existe o ya no está disponible.");
        }

        const clienteData = clienteSnap.data();
        validarClienteActivo(clienteData);

        const limiteAnterior = redondearMoneda(clienteData.limite_credito);
        const deudaActual = redondearMoneda(clienteData.deuda_actual);
        const totalMovimientosAnterior = obtenerTotalMovimientosAnterior(
          resumenSnap,
          clienteId,
        );

        const {
          limiteNuevo,
          diferencia,
          creditoDisponible,
          estadoLinea,
        } = validarYCalcularMovimiento({
          tipoMovimiento,
          montoCapturado,
          limiteAnterior,
          deudaActual,
        });

        const payloads = construirPayloadsMovimiento({
          movimientoRef,
          actividadRef,
          clienteId,
          clienteData,
          tipoMovimiento,
          limiteAnterior,
          limiteNuevo,
          diferencia,
          deudaActual,
          creditoDisponible,
          estadoLinea,
          personalAutoriza,
          motivo: motivoLimpio,
          actorUid,
          actorNombre,
          actorRol,
          totalMovimientos: totalMovimientosAnterior + 1,
          origen: ORIGENES_MOVIMIENTO.DIRECTO,
        });

        transaction.set(movimientoRef, payloads.movimientoPayload);
        transaction.set(resumenRef, payloads.resumenPayload);
        transaction.update(clienteRef, payloads.clienteUpdate);
        transaction.set(actividadRef, payloads.actividadPayload);

        return {
          movimiento: payloads.movimientoPayload,
          limite_anterior: limiteAnterior,
          limite_nuevo: limiteNuevo,
          credito_disponible: creditoDisponible,
          estado_linea: estadoLinea,
        };
      });

      return {
        success: true,
        data: resultado,
      };
    } catch (error) {
      console.error("Error registrando movimiento de línea de crédito:", error);

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  autorizarSolicitudAumento: async ({
    solicitud_id,
    actor_uid,
    actor_nombre,
  }) => {
    try {
      const solicitudId = textoLimpio(solicitud_id);

      if (!solicitudId) {
        throw new Error("No se identificó la solicitud de aumento.");
      }

      const actorUid = obtenerActorUidSeguro(actor_uid);
      const actorRol = "SU";
      const actorNombre = textoLimpio(actor_nombre) || actorRol;

      const solicitudRef = doc(db, SOLICITUDES_COLLECTION, solicitudId);
      const movimientoRef = doc(
        collection(db, MOVIMIENTOS_LINEA_COLLECTION),
      );
      const actividadRef = doc(collection(db, ACTIVIDAD_COLLECTION));

      const resultado = await runTransaction(db, async (transaction) => {
        const solicitudSnap = await transaction.get(solicitudRef);

        if (!solicitudSnap.exists()) {
          throw new Error("La solicitud de aumento no existe.");
        }

        const solicitud = solicitudSnap.data();

        if (solicitud.estatus !== "Pendiente") {
          throw new Error(
            `La solicitud ya fue resuelta como ${solicitud.estatus}.`,
          );
        }

        const clienteId = textoLimpio(solicitud.cliente_id);
        const montoIncremento = redondearMoneda(solicitud.monto_incremento);

        if (!clienteId) {
          throw new Error(
            "La solicitud no contiene un cliente_id válido.",
          );
        }

        if (!Number.isFinite(montoIncremento) || montoIncremento <= 0) {
          throw new Error("La solicitud contiene un monto inválido.");
        }

        const clienteRef = doc(db, CLIENTES_COLLECTION, clienteId);
        const resumenRef = doc(db, RESUMEN_LINEA_COLLECTION, clienteId);
        const clienteSnap = await transaction.get(clienteRef);
        const resumenSnap = await transaction.get(resumenRef);

        if (!clienteSnap.exists()) {
          throw new Error("El cliente asociado no existe.");
        }

        const clienteData = clienteSnap.data();
        validarClienteActivo(clienteData);

        const limiteAnterior = redondearMoneda(clienteData.limite_credito);
        const deudaActual = redondearMoneda(clienteData.deuda_actual);
        const totalMovimientosAnterior = obtenerTotalMovimientosAnterior(
          resumenSnap,
          clienteId,
        );

        const {
          limiteNuevo,
          diferencia,
          creditoDisponible,
          estadoLinea,
        } = validarYCalcularMovimiento({
          tipoMovimiento: "AUMENTO",
          montoCapturado: montoIncremento,
          limiteAnterior,
          deudaActual,
        });

        const payloads = construirPayloadsMovimiento({
          movimientoRef,
          actividadRef,
          clienteId,
          clienteData,
          tipoMovimiento: "AUMENTO",
          limiteAnterior,
          limiteNuevo,
          diferencia,
          deudaActual,
          creditoDisponible,
          estadoLinea,
          personalAutoriza: actorNombre,
          motivo:
            textoLimpio(solicitud.motivo) ||
            "Aumento autorizado mediante solicitud.",
          actorUid,
          actorNombre,
          actorRol,
          totalMovimientos: totalMovimientosAnterior + 1,
          origen: ORIGENES_MOVIMIENTO.SOLICITUD,
          solicitudId,
        });

        transaction.set(movimientoRef, payloads.movimientoPayload);
        transaction.set(resumenRef, payloads.resumenPayload);
        transaction.update(clienteRef, payloads.clienteUpdate);
        transaction.update(solicitudRef, {
          estatus: "Autorizado",
          resolvedAt: serverTimestamp(),
          resolvedBy: actorNombre,
          resolvedByUid: actorUid,
          movimiento_linea_credito_id: movimientoRef.id,
          limite_aplicado_anterior: limiteAnterior,
          limite_aplicado_nuevo: limiteNuevo,
        });
        transaction.set(actividadRef, {
          ...payloads.actividadPayload,
          detalle: `El SU autorizó la solicitud de aumento por $${montoIncremento.toLocaleString("es-MX")}. Límite anterior: $${limiteAnterior.toLocaleString("es-MX")}. Límite nuevo: $${limiteNuevo.toLocaleString("es-MX")}.`,
        });

        return {
          solicitud_id: solicitudId,
          movimiento: payloads.movimientoPayload,
          limite_anterior: limiteAnterior,
          limite_nuevo: limiteNuevo,
          credito_disponible: creditoDisponible,
        };
      });

      return {
        success: true,
        data: resultado,
      };
    } catch (error) {
      console.error("Error autorizando solicitud de aumento:", error);

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },
};
