import { serverTimestamp } from "firebase/firestore";

export const METRICAS_COLLECTION = "metricas_globales";
export const METRICAS_DOC = "stats_actuales";
export const METRICAS_MOVIMIENTOS_COLLECTION = "metricas_movimientos";

export const CAMPOS_METRICAS = Object.freeze([
  "cartera_total",
  "cartera_vencida",
  "ingresos_mes",
  "ingresos_semana",
  "clientes_activos",
  "facturas_vencidas",
  "facturas_pendientes",
  "facturas_pagadas",
  "facturas_total",
  "total_facturado",
  "total_liquidado",
  "cobrado_historico",
  "abonos_registrados",
  "abonos_cantidad",
  "monto_recuperado",
  "total_notas_credito",
]);

const CAMPOS_ENTEROS = new Set([
  "clientes_activos",
  "facturas_vencidas",
  "facturas_pendientes",
  "facturas_pagadas",
  "facturas_total",
  "abonos_cantidad",
]);

const redondearMoneda = (valor) =>
  Math.round((Number(valor) || 0) * 100) / 100;

const textoSeguro = (valor = "") => String(valor || "").trim();

const fechaSegura = (valor = new Date()) => {
  if (valor?.toDate && typeof valor.toDate === "function") {
    return valor.toDate();
  }

  if (valor instanceof Date) {
    return new Date(valor.getTime());
  }

  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? new Date() : fecha;
};

const obtenerSemanaISO = (valor = new Date()) => {
  const fecha = fechaSegura(valor);
  const fechaUTC = new Date(
    Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()),
  );
  const dia = fechaUTC.getUTCDay() || 7;
  fechaUTC.setUTCDate(fechaUTC.getUTCDate() + 4 - dia);
  const inicioAnio = new Date(Date.UTC(fechaUTC.getUTCFullYear(), 0, 1));
  const semana = Math.ceil(
    (((fechaUTC - inicioAnio) / 86400000) + 1) / 7,
  );

  return {
    anio: fechaUTC.getUTCFullYear(),
    semana,
  };
};

export const obtenerPeriodosMetricas = (valor = new Date()) => {
  const fecha = fechaSegura(valor);
  const semanaISO = obtenerSemanaISO(fecha);

  return {
    periodoMes: `${fecha.getFullYear()}-${String(
      fecha.getMonth() + 1,
    ).padStart(2, "0")}`,
    periodoSemana: `${semanaISO.anio}-W${String(
      semanaISO.semana,
    ).padStart(2, "0")}`,
  };
};

export const perteneceAlPeriodoMes = (
  valor,
  periodoMes = obtenerPeriodosMetricas().periodoMes,
) => obtenerPeriodosMetricas(valor).periodoMes === periodoMes;

export const perteneceAlPeriodoSemana = (
  valor,
  periodoSemana = obtenerPeriodosMetricas().periodoSemana,
) => obtenerPeriodosMetricas(valor).periodoSemana === periodoSemana;

const normalizarCampo = (campo, valor) => {
  const numero = Number(valor ?? 0);

  if (!Number.isFinite(numero)) {
    throw new Error(`La métrica ${campo} contiene un valor inválido.`);
  }

  if (CAMPOS_ENTEROS.has(campo)) {
    if (!Number.isInteger(numero)) {
      throw new Error(`La métrica ${campo} debe ser un número entero.`);
    }

    return numero;
  }

  return redondearMoneda(numero);
};

export const normalizarMetricas = (stats = {}) =>
  Object.fromEntries(
    CAMPOS_METRICAS.map((campo) => [
      campo,
      normalizarCampo(campo, stats?.[campo] ?? 0),
    ]),
  );

export const construirDeltasMetricas = (deltas = {}) =>
  Object.fromEntries(
    CAMPOS_METRICAS.map((campo) => [
      campo,
      normalizarCampo(campo, deltas?.[campo] ?? 0),
    ]),
  );

const validarResultadoNoNegativo = (metricas = {}) => {
  CAMPOS_METRICAS.forEach((campo) => {
    const valor = Number(metricas[campo]);

    if (valor < -0.011) {
      throw new Error(
        `La operación dejaría la métrica ${campo} en un valor negativo.`,
      );
    }
  });
};

export const prepararMovimientoMetricas = ({
  statsActuales = {},
  movimientoRef,
  actorUid,
  actorNombre = "",
  tipo,
  entidadTipo,
  entidadId,
  facturaId = "",
  clienteId = "",
  abonoId = "",
  notaId = "",
  actividadId = "",
  deltas = {},
  fechaOperacion = new Date(),
  origen = "APP_CLIENTE",
} = {}) => {
  if (!movimientoRef?.id) {
    throw new Error("No se generó el identificador del movimiento de métricas.");
  }

  const actorUidSeguro = textoSeguro(actorUid);
  const tipoSeguro = textoSeguro(tipo).toUpperCase();
  const entidadTipoSeguro = textoSeguro(entidadTipo).toUpperCase();
  const entidadIdSeguro = textoSeguro(entidadId);

  if (!actorUidSeguro || !tipoSeguro || !entidadTipoSeguro || !entidadIdSeguro) {
    throw new Error(
      "El movimiento de métricas no contiene actor, tipo o entidad válidos.",
    );
  }

  const anteriores = normalizarMetricas(statsActuales);
  const deltasFuente = construirDeltasMetricas(deltas);
  const periodosNuevos = obtenerPeriodosMetricas(fechaOperacion);
  const periodoMesAnterior = textoSeguro(statsActuales?.periodo_mes);
  const periodoSemanaAnterior = textoSeguro(
    statsActuales?.periodo_semana,
  );
  const reinicioMes = Boolean(
    periodoMesAnterior &&
      periodoMesAnterior !== periodosNuevos.periodoMes,
  );
  const reinicioSemana = Boolean(
    periodoSemanaAnterior &&
      periodoSemanaAnterior !== periodosNuevos.periodoSemana,
  );

  const deltasAplicados = {
    ...deltasFuente,
    ingresos_mes: redondearMoneda(
      deltasFuente.ingresos_mes -
        (reinicioMes ? anteriores.ingresos_mes : 0),
    ),
    ingresos_semana: redondearMoneda(
      deltasFuente.ingresos_semana -
        (reinicioSemana ? anteriores.ingresos_semana : 0),
    ),
  };

  const posteriores = Object.fromEntries(
    CAMPOS_METRICAS.map((campo) => [
      campo,
      normalizarCampo(
        campo,
        anteriores[campo] + deltasAplicados[campo],
      ),
    ]),
  );

  validarResultadoNoNegativo(posteriores);

  return {
    movimientoPayload: {
      id: movimientoRef.id,
      actor_uid: actorUidSeguro,
      actor_nombre: textoSeguro(actorNombre) || "Usuario",
      tipo: tipoSeguro,
      entidad_tipo: entidadTipoSeguro,
      entidad_id: entidadIdSeguro,
      factura_id: textoSeguro(facturaId),
      cliente_id: textoSeguro(clienteId),
      abono_id: textoSeguro(abonoId),
      nota_id: textoSeguro(notaId),
      actividad_id: textoSeguro(actividadId),
      deltas_fuente: deltasFuente,
      deltas_aplicados: deltasAplicados,
      periodo_mes_anterior: periodoMesAnterior,
      periodo_mes_nuevo: periodosNuevos.periodoMes,
      periodo_semana_anterior: periodoSemanaAnterior,
      periodo_semana_nuevo: periodosNuevos.periodoSemana,
      reinicio_mes: reinicioMes,
      reinicio_semana: reinicioSemana,
      origen: textoSeguro(origen) || "APP_CLIENTE",
      createdAt: serverTimestamp(),
    },
    statsPayload: {
      ...posteriores,
      periodo_mes: periodosNuevos.periodoMes,
      periodo_semana: periodosNuevos.periodoSemana,
      ultimo_movimiento_id: movimientoRef.id,
      ultima_actualizacion: serverTimestamp(),
    },
  };
};

export const prepararReconciliacionMetricas = ({
  statsActuales = {},
  metricasObjetivo = {},
  movimientoRef,
  actorUid,
  actorNombre = "",
  actividadId = "",
  reconstruccionId = "",
} = {}) => {
  const anteriores = normalizarMetricas(statsActuales);
  const objetivo = normalizarMetricas(metricasObjetivo);
  const deltas = Object.fromEntries(
    CAMPOS_METRICAS.map((campo) => [
      campo,
      normalizarCampo(campo, objetivo[campo] - anteriores[campo]),
    ]),
  );
  const periodos = obtenerPeriodosMetricas();

  return {
    movimientoPayload: {
      id: movimientoRef.id,
      actor_uid: textoSeguro(actorUid),
      actor_nombre: textoSeguro(actorNombre) || "SU",
      tipo: "RECONSTRUCCION_METRICAS",
      entidad_tipo: "METRICAS",
      entidad_id: METRICAS_DOC,
      factura_id: "",
      cliente_id: "",
      abono_id: "",
      nota_id: "",
      actividad_id: textoSeguro(actividadId),
      deltas_fuente: deltas,
      deltas_aplicados: deltas,
      periodo_mes_anterior: textoSeguro(statsActuales?.periodo_mes),
      periodo_mes_nuevo: periodos.periodoMes,
      periodo_semana_anterior: textoSeguro(
        statsActuales?.periodo_semana,
      ),
      periodo_semana_nuevo: periodos.periodoSemana,
      reinicio_mes: false,
      reinicio_semana: false,
      origen: "RECONSTRUCCION_SU",
      reconstruccion_id: textoSeguro(reconstruccionId) || movimientoRef.id,
      createdAt: serverTimestamp(),
    },
    statsPayload: {
      ...objetivo,
      periodo_mes: periodos.periodoMes,
      periodo_semana: periodos.periodoSemana,
      ultimo_movimiento_id: movimientoRef.id,
      ultima_reconciliacion: serverTimestamp(),
      ultima_actualizacion: serverTimestamp(),
    },
  };
};
