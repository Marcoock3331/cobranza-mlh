import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { useLocation } from "react-router-dom";

import { db } from "../config/firebase";
import { abonosIndexService } from "../services/abonosIndexService";
import { clientesService } from "../services/clientesService";
import { facturasService } from "../services/facturasService";
import { obtenerPeriodosMetricas } from "../services/metricasService";
import { solicitudesService } from "../services/solicitudesService";
import { formatearFechaSegura } from "../utils/normalizadores";
import { normalizarFacturaSnapshot } from "../utils/normalizarFactura";
import { AuthContext } from "./AuthContext";
import { GlobalContext } from "./GlobalContext";

const AUTH_DATA_VACIO = Object.freeze({});
const CLIENTES_COLLECTION = "clientes";
const FACTURAS_COLLECTION = "facturas";
const STATS_COLLECTION = "metricas_globales";
const STATS_DOC = "stats_actuales";
const ACTIVIDAD_COLLECTION = "actividad";
const SOLICITUDES_COLLECTION = "solicitudes";
const SOLICITUDES_NOTAS_CREDITO_COLLECTION = "solicitudes_notas_credito";
const NOTIFICACIONES_OPERATIVAS_COLLECTION = "notificaciones_operativas";

const ordenarFacturas = (lista) =>
  [...lista].sort((primera, segunda) => {
    const fechaPrimera =
      primera.emision?.toDate?.().getTime?.() ||
      new Date(primera.emision || 0).getTime() ||
      0;

    const fechaSegunda =
      segunda.emision?.toDate?.().getTime?.() ||
      new Date(segunda.emision || 0).getTime() ||
      0;

    return fechaSegunda - fechaPrimera;
  });

const rutaNecesitaFacturasGlobales = () => false;

const numeroMetricaSeguro = (valor, respaldo = 0) => {
  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : respaldo;
};

export const GlobalProvider = ({ children }) => {
  const authContextValue = useContext(AuthContext);
  const authData = authContextValue ?? AUTH_DATA_VACIO;

  const valorSinSesion = useMemo(
    () => ({
      ...authData,
      authLoading: authData.loading,
      stats: {
        cartera_total: 0,
        cartera_vencida: 0,
        ingresos_mes: 0,
        ingresos_semana: 0,
        clientes_activos: 0,
        facturas_pendientes: 0,
        facturas_pagadas: 0,
        facturas_vencidas: 0,
        facturas_total: 0,
        total_facturado: 0,
        total_liquidado: 0,
        cobrado_historico: 0,
        abonos_registrados: 0,
        abonos_cantidad: 0,
        monto_recuperado: 0,
        total_notas_credito: 0,
        periodo_mes: "",
        periodo_semana: "",
        ultimo_movimiento_id: "",
        ultima_reconciliacion: null,
        ultima_actualizacion: null,
      },
      metricasCargadas: false,
      errorMetricas: null,
      clientes: [],
      facturas: [],
      actividad: [],
      solicitudes: [],
      solicitudesNotasCredito: [],
      notificacionesOperativas: [],
      usuarios: [],
    }),
    [authData],
  );

  if (!authData.currentUser) {
    return (
      <GlobalContext.Provider value={valorSinSesion}>
        {children}
      </GlobalContext.Provider>
    );
  }

  return (
    <GlobalDataProvider authData={authData}>{children}</GlobalDataProvider>
  );
};

function GlobalDataProvider({ authData, children }) {
  const location = useLocation();
  const { currentUser, userName, userRole } = authData;
  const actorUid = currentUser.uid;
  const necesitaFacturasGlobales = rutaNecesitaFacturasGlobales(
    location.pathname,
  );

  const [clientes, setClientes] = useState([]);
  const [facturasGlobales, setFacturasGlobales] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [solicitudesNotasCredito, setSolicitudesNotasCredito] = useState([]);
  const [actividad, setActividad] = useState([]);
  const [notificacionesOperativas, setNotificacionesOperativas] = useState([]);
  const [statsDB, setStatsDB] = useState({
    cartera_total: 0,
    cartera_vencida: 0,
    ingresos_mes: 0,
    ingresos_semana: 0,
    clientes_activos: 0,
    facturas_pendientes: 0,
    facturas_pagadas: 0,
    facturas_vencidas: 0,
    facturas_total: 0,
    total_facturado: 0,
    total_liquidado: 0,
    cobrado_historico: 0,
    abonos_registrados: 0,
    abonos_cantidad: 0,
    monto_recuperado: 0,
    total_notas_credito: 0,
    periodo_mes: "",
    periodo_semana: "",
    ultimo_movimiento_id: "",
    ultima_reconciliacion: null,
    ultima_actualizacion: null,
  });
  const [estadoCargaMetricas, setEstadoCargaMetricas] = useState({
    actorUid: "",
    cargadas: false,
    error: null,
  });
  const metricasCargadas =
    Boolean(actorUid) &&
    estadoCargaMetricas.actorUid === actorUid &&
    estadoCargaMetricas.cargadas;
  const errorMetricas =
    estadoCargaMetricas.actorUid === actorUid
      ? estadoCargaMetricas.error
      : null;

  useEffect(() => {
    if (!actorUid) {
      return undefined;
    }

    let unsubActividad = () => {};

    if (userRole === "SU") {
      const qActividad = query(
        collection(db, ACTIVIDAD_COLLECTION),
        orderBy("serverTime", "desc"),
        limit(100),
      );

      unsubActividad = onSnapshot(
        qActividad,
        (snap) => {
          setActividad(
            snap.docs.map((documento) => {
              const data = documento.data();

              return {
                id: documento.id,
                ...data,
                fechaHora: formatearFechaSegura(
                  data.serverTime || data.fechaHora,
                  "Sin fecha",
                ),
              };
            }),
          );
        },
        (error) => {
          console.error("Error escuchando la actividad:", error);
        },
      );
    }

    const qNotificacionesOperativas = query(
      collection(db, NOTIFICACIONES_OPERATIVAS_COLLECTION),
      orderBy("serverTime", "desc"),
      limit(50),
    );

    const unsubNotificacionesOperativas = onSnapshot(
      qNotificacionesOperativas,
      (snap) => {
        setNotificacionesOperativas(
          snap.docs.map((documento) => {
            const data = documento.data();

            return {
              id: documento.id,
              ...data,
              fecha: formatearFechaSegura(
                data.serverTime,
                "Sin fecha",
              ),
            };
          }),
        );
      },
      (error) => {
        console.error(
          "Error escuchando notificaciones operativas:",
          error,
        );
      },
    );

    const unsubClientes = onSnapshot(
      collection(db, CLIENTES_COLLECTION),
      (snap) => {
        setClientes(
          snap.docs.map((documento) => ({
            id: documento.id,
            ...documento.data(),
          })),
        );
      },
      (error) => {
        console.error("Error escuchando clientes:", error);
      },
    );

    const unsubStats = onSnapshot(
      doc(db, STATS_COLLECTION, STATS_DOC),
      (docSnap) => {
        if (docSnap.exists()) {
          setStatsDB(docSnap.data());
        }

        setEstadoCargaMetricas({
          actorUid,
          cargadas: true,
          error: null,
        });
      },
      (error) => {
        console.error("Error escuchando métricas:", error);
        setEstadoCargaMetricas({
          actorUid,
          cargadas: true,
          error:
            error?.message || "No se pudieron consultar las métricas.",
        });
      },
    );

    const qSolicitudes = query(
      collection(db, SOLICITUDES_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(100),
    );

    const unsubSolicitudes = onSnapshot(
      qSolicitudes,
      (snap) => {
        const dataNormalizada = snap.docs.map((documento) => {
          const data = documento.data();

          return {
            id: documento.id,
            ...data,
            fecha: formatearFechaSegura(
              data.createdAt || data.fecha,
              "Sin fecha",
            ),
          };
        });

        setSolicitudes(dataNormalizada);
      },
      (error) => {
        console.error("Error escuchando solicitudes:", error);
      },
    );

    const qSolicitudesNotasCredito = query(
      collection(db, SOLICITUDES_NOTAS_CREDITO_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(100),
    );

    const unsubSolicitudesNotasCredito = onSnapshot(
      qSolicitudesNotasCredito,
      (snap) => {
        const dataNormalizada = snap.docs.map((documento) => {
          const data = documento.data();

          return {
            id: documento.id,
            ...data,
            fecha: formatearFechaSegura(
              data.createdAt || data.fecha,
              "Sin fecha",
            ),
          };
        });

        setSolicitudesNotasCredito(dataNormalizada);
      },
      (error) => {
        console.error("Error escuchando solicitudes de notas de crédito:", error);
      },
    );

    return () => {
      unsubClientes();
      unsubStats();
      unsubActividad();
      unsubNotificacionesOperativas();
      unsubSolicitudes();
      unsubSolicitudesNotasCredito();
    };
  }, [actorUid, userRole]);

  useEffect(() => {
    if (!actorUid || !necesitaFacturasGlobales) {
      return undefined;
    }

    const unsubFacturas = onSnapshot(
      collection(db, FACTURAS_COLLECTION),
      (snap) => {
        const facturasNormalizadas = snap.docs.map((documento) =>
          normalizarFacturaSnapshot(documento),
        );

        setFacturasGlobales(ordenarFacturas(facturasNormalizadas));
      },
      (error) => {
        console.error("Error escuchando facturas globales:", error);
      },
    );

    return () => {
      unsubFacturas();
    };
  }, [actorUid, necesitaFacturasGlobales]);

  const facturas = useMemo(
    () => (necesitaFacturasGlobales ? facturasGlobales : []),
    [necesitaFacturasGlobales, facturasGlobales],
  );

  const stats = useMemo(() => {
    const periodosActuales = obtenerPeriodosMetricas();
    const clientesReales = clientes.filter(
      (cliente) => cliente.activo !== false && cliente.estatus !== "Inactivo",
    );

    return {
      ...statsDB,
      cartera_total: numeroMetricaSeguro(statsDB.cartera_total),
      cartera_vencida: numeroMetricaSeguro(
        statsDB.cartera_vencida,
      ),
      ingresos_mes:
        statsDB.periodo_mes &&
        statsDB.periodo_mes !== periodosActuales.periodoMes
          ? 0
          : numeroMetricaSeguro(statsDB.ingresos_mes),
      ingresos_semana:
        statsDB.periodo_semana &&
        statsDB.periodo_semana !== periodosActuales.periodoSemana
          ? 0
          : numeroMetricaSeguro(statsDB.ingresos_semana),
      clientes_activos: numeroMetricaSeguro(
        statsDB.clientes_activos,
        clientesReales.length,
      ),
      facturas_pendientes: numeroMetricaSeguro(
        statsDB.facturas_pendientes,
      ),
      facturas_pagadas: numeroMetricaSeguro(
        statsDB.facturas_pagadas,
      ),
      facturas_vencidas: numeroMetricaSeguro(
        statsDB.facturas_vencidas,
      ),
      facturas_total: numeroMetricaSeguro(statsDB.facturas_total),
      total_facturado: numeroMetricaSeguro(
        statsDB.total_facturado,
      ),
      total_liquidado: numeroMetricaSeguro(
        statsDB.total_liquidado,
      ),
      cobrado_historico: numeroMetricaSeguro(
        statsDB.cobrado_historico,
      ),
      abonos_registrados: numeroMetricaSeguro(
        statsDB.abonos_registrados,
      ),
      abonos_cantidad: numeroMetricaSeguro(
        statsDB.abonos_cantidad,
      ),
      monto_recuperado: numeroMetricaSeguro(
        statsDB.monto_recuperado,
        numeroMetricaSeguro(statsDB.cobrado_historico),
      ),
      total_notas_credito: numeroMetricaSeguro(
        statsDB.total_notas_credito,
      ),
      periodo_mes: String(statsDB.periodo_mes || ""),
      periodo_semana: String(statsDB.periodo_semana || ""),
      ultimo_movimiento_id: String(
        statsDB.ultimo_movimiento_id || "",
      ),
      ultima_reconciliacion: statsDB.ultima_reconciliacion || null,
      ultima_actualizacion: statsDB.ultima_actualizacion || null,
    };
  }, [clientes, statsDB]);

  const crearFacturaEnNube = useCallback(
    async (formData) => {
      if (!actorUid) {
        return {
          success: false,
          error: "No se identificó al usuario responsable.",
        };
      }

      return facturasService.crearFactura({
        formData,
        clientes,
        userName,
        actor_uid: actorUid,
      });
    },
    [clientes, actorUid, userName],
  );

  const registrarAbonoEnNube = useCallback(
    async (factura, montoAbonado, metodoPago) => {
      if (!actorUid) {
        return {
          success: false,
          error: "No se identificó al usuario responsable.",
        };
      }

      return facturasService.registrarAbono({
        factura,
        montoAbonado,
        metodoPago,
        clientes,
        userName,
        actor_uid: actorUid,
      });
    },
    [clientes, actorUid, userName],
  );

  const eliminarAbonoEnNube = useCallback(
    async (idFactura, idAbono) => {
      if (!actorUid) {
        return {
          success: false,
          error: "No se identificó al usuario responsable.",
        };
      }

      return facturasService.eliminarAbono({
        idFactura,
        idAbono,
        userName,
        actor_uid: actorUid,
      });
    },
    [actorUid, userName],
  );


  const aplicarNotaCreditoEnNube = useCallback(
    async (factura, montoNota, motivo, observaciones = "") => {
      if (userRole !== "SU") {
        return {
          success: false,
          error: "Solo el SU puede aplicar notas de crédito.",
        };
      }

      if (!actorUid) {
        return {
          success: false,
          error: "No se identificó al usuario responsable.",
        };
      }

      return facturasService.aplicarNotaCredito({
        factura,
        montoNota,
        motivo,
        observaciones,
        userName,
        actor_uid: actorUid,
      });
    },
    [actorUid, userName, userRole],
  );


  const solicitarNotaCreditoEnNube = useCallback(
    async (factura, montoNota, motivo, observaciones = "") => {
      if (userRole !== "ADMIN") {
        return {
          success: false,
          error: "Solo el ADMIN puede solicitar notas de crédito.",
        };
      }

      if (!actorUid) {
        return {
          success: false,
          error: "No se identificó al usuario responsable.",
        };
      }

      return solicitudesService.crearSolicitudNotaCredito({
        factura,
        montoNota,
        motivo,
        observaciones,
        solicitado_por_uid: actorUid,
        solicitado_por_nombre: userName || "ADMIN",
      });
    },
    [actorUid, userName, userRole],
  );

  const cancelarNotaCreditoEnNube = useCallback(
    async (factura, idNota, motivoCancelacion = "") => {
      if (userRole !== "SU") {
        return {
          success: false,
          error: "Solo el SU puede cancelar notas de crédito.",
        };
      }

      if (!actorUid) {
        return {
          success: false,
          error: "No se identificó al usuario responsable.",
        };
      }

      return facturasService.cancelarNotaCredito({
        factura,
        idNota,
        motivoCancelacion,
        userName,
        actor_uid: actorUid,
      });
    },
    [actorUid, userName, userRole],
  );

  const modificarFacturaEnNube = useCallback(
    async (idFactura, formData) => {
      if (!actorUid) {
        return {
          success: false,
          error: "No se identificó al usuario responsable.",
        };
      }

      return facturasService.modificarFactura({
        idFactura,
        formData,
        userName,
        actor_uid: actorUid,
      });
    },
    [actorUid, userName],
  );

  const eliminarFacturaEnNube = useCallback(
    async (idFactura) => {
      if (userRole !== "SU") {
        return {
          success: false,
          error: "Solo el SU puede eliminar facturas.",
        };
      }

      if (!actorUid) {
        return {
          success: false,
          error: "No se identificó al usuario responsable.",
        };
      }

      return facturasService.eliminarFactura({
        idFactura,
        userName,
        actor_uid: actorUid,
      });
    },
    [actorUid, userName, userRole],
  );

  const eliminarClienteEnNube = useCallback(
    async (id, nombreCliente, motivo) => {
      if (!actorUid) {
        return {
          success: false,
          error: "No se identificó al usuario responsable.",
        };
      }

      return clientesService.eliminarCliente(
        id,
        nombreCliente,
        userName,
        actorUid,
        motivo,
      );
    },
    [actorUid, userName],
  );

  const reactivarClienteEnNube = useCallback(
    async (id, nombreCliente, motivo) => {
      if (!actorUid) {
        return {
          success: false,
          error: "No se identificó al usuario responsable.",
        };
      }

      return clientesService.reactivarCliente(
        id,
        nombreCliente,
        userName,
        actorUid,
        motivo,
      );
    },
    [actorUid, userName],
  );

  const reconstruirMetricasEnNube = useCallback(
    async ({ reconstruirIndice = true } = {}) => {
      if (userRole !== "SU") {
        return {
          success: false,
          error: "Solo el SU puede reconciliar las métricas.",
        };
      }

      if (!actorUid) {
        return {
          success: false,
          error: "No se identificó al usuario responsable.",
        };
      }

      return abonosIndexService.reconstruirDesdeFacturas({
        actor_uid: actorUid,
        userName: userName || "SU",
        reconstruirIndice,
      });
    },
    [actorUid, userName, userRole],
  );

  const actividadVisible = useMemo(
    () => (userRole === "SU" ? actividad : []),
    [actividad, userRole],
  );

  const contextValue = useMemo(
    () => ({
      ...authData,
      authLoading: authData.loading,
      stats,
      metricasCargadas,
      errorMetricas,
      clientes,
      setClientes,
      eliminarClienteEnNube,
      reactivarClienteEnNube,
      facturas,
      setFacturas: setFacturasGlobales,
      crearFacturaEnNube,
      modificarFacturaEnNube,
      eliminarFacturaEnNube,
      registrarAbonoEnNube,
      eliminarAbonoEnNube,
      aplicarNotaCreditoEnNube,
      solicitarNotaCreditoEnNube,
      cancelarNotaCreditoEnNube,
      reconstruirMetricasEnNube,
      actividad: actividadVisible,
      setActividad,
      solicitudes,
      setSolicitudes,
      solicitudesNotasCredito,
      setSolicitudesNotasCredito,
      notificacionesOperativas,
      usuarios: [],
    }),
    [
      authData,
      stats,
      metricasCargadas,
      errorMetricas,
      clientes,
      eliminarClienteEnNube,
      reactivarClienteEnNube,
      facturas,
      crearFacturaEnNube,
      modificarFacturaEnNube,
      eliminarFacturaEnNube,
      registrarAbonoEnNube,
      eliminarAbonoEnNube,
      aplicarNotaCreditoEnNube,
      solicitarNotaCreditoEnNube,
      cancelarNotaCreditoEnNube,
      reconstruirMetricasEnNube,
      actividadVisible,
      solicitudes,
      solicitudesNotasCredito,
      notificacionesOperativas,
    ],
  );

  return (
    <GlobalContext.Provider value={contextValue}>
      {children}
    </GlobalContext.Provider>
  );
}