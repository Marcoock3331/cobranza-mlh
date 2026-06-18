import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import { db } from "../config/firebase";
import { usuariosService } from "../services/usuariosService";
import { facturasService } from "../services/facturasService";
import { clientesService } from "../services/clientesService";
import { formatearFechaSegura } from "../utils/normalizadores";
import { AuthContext } from "./AuthContext";
import { GlobalContext } from "./GlobalContext";

const AUTH_DATA_VACIO = Object.freeze({});
const CLIENTES_COLLECTION = "clientes";
const FACTURAS_COLLECTION = "facturas";
const STATS_COLLECTION = "metricas_globales";
const STATS_DOC = "stats_actuales";
const ACTIVIDAD_COLLECTION = "actividad";
const SOLICITUDES_COLLECTION = "solicitudes";

const normalizarFactura = (documento) => {
  const factura = documento.data();

  const emisionStr = factura.emision?.toDate
    ? factura.emision.toDate().toISOString().split("T")[0]
    : factura.emision;

  const vencimientoStr = factura.vencimiento?.toDate
    ? factura.vencimiento.toDate().toISOString().split("T")[0]
    : factura.vencimiento;

  let estatusReal = factura.estatus;

  if (
    (estatusReal === "Pendiente" || estatusReal === "Reprogramado") &&
    factura.vencimiento?.toDate
  ) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fechaVencimiento = factura.vencimiento.toDate();
    fechaVencimiento.setHours(0, 0, 0, 0);

    if (hoy > fechaVencimiento) {
      estatusReal = "Vencida";
    }
  }

  return {
    id: documento.id,
    ...factura,
    estatus: estatusReal,
    emision: emisionStr,
    vencimiento: vencimientoStr,
    _abonos_raw: factura.abonos || [],
    abonos: (factura.abonos || []).map((abono) => ({
      ...abono,
      fecha: abono.fecha?.toDate
        ? abono.fecha.toDate().toLocaleString("es-MX")
        : abono.fecha,
    })),
  };
};

const ordenarFacturas = (lista) =>
  [...lista].sort((primera, segunda) => {
    const fechaPrimera =
      primera.createdAt?.toMillis?.() ||
      primera.emision?.toDate?.().getTime?.() ||
      new Date(primera.emision || 0).getTime() ||
      0;

    const fechaSegunda =
      segunda.createdAt?.toMillis?.() ||
      segunda.emision?.toDate?.().getTime?.() ||
      new Date(segunda.emision || 0).getTime() ||
      0;

    return fechaSegunda - fechaPrimera;
  });

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
        clientes_activos: 0,
      },
      clientes: [],
      facturas: [],
      actividad: [],
      solicitudes: [],
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
  const { currentUser, userName, userRole } = authData;

  const actorUid = currentUser.uid;

  const [clientes, setClientes] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [actividad, setActividad] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [statsDB, setStatsDB] = useState({
    cartera_total: 0,
    ingresos_mes: 0,
    ingresos_semana: 0,
  });

  useEffect(() => {
    if (!actorUid) {
      return undefined;
    }

    let unsubUsuarios = () => {};
    let unsubActividad = () => {};

    if (userRole === "SU") {
      unsubUsuarios = usuariosService.escucharUsuarios((dataNormalizada) => {
        setUsuarios(dataNormalizada);
      });

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

    const unsubFacturas = onSnapshot(
      collection(db, FACTURAS_COLLECTION),
      (snap) => {
        setFacturas((facturasPrevias) => {
          const mapa = new Map(
            facturasPrevias.map((factura) => [factura.id, factura]),
          );

          snap.docChanges().forEach((cambio) => {
            if (cambio.type === "removed") {
              mapa.delete(cambio.doc.id);
              return;
            }

            mapa.set(cambio.doc.id, normalizarFactura(cambio.doc));
          });

          return ordenarFacturas(Array.from(mapa.values()));
        });
      },
      (error) => {
        console.error("Error escuchando facturas:", error);
      },
    );

    const unsubStats = onSnapshot(
      doc(db, STATS_COLLECTION, STATS_DOC),
      (docSnap) => {
        if (docSnap.exists()) {
          setStatsDB(docSnap.data());
        }
      },
      (error) => {
        console.error("Error escuchando métricas:", error);
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

    return () => {
      unsubClientes();
      unsubFacturas();
      unsubStats();
      unsubActividad();
      unsubSolicitudes();
      unsubUsuarios();
    };
  }, [actorUid, userRole]);

  const stats = useMemo(() => {
    let vencida = 0;

    facturas.forEach((factura) => {
      if (factura.estatus === "Vencida") {
        vencida += Number(factura.saldo_pendiente) || 0;
      }
    });

    const clientesReales = clientes.filter(
      (cliente) => cliente.activo !== false && cliente.estatus !== "Inactivo",
    );

    return {
      cartera_total: statsDB.cartera_total || 0,
      cartera_vencida: statsDB.cartera_vencida ?? vencida,
      ingresos_mes: statsDB.ingresos_mes || 0,
      clientes_activos: clientesReales.length,
    };
  }, [facturas, clientes, statsDB]);

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
        facturas,
        clientes,
        userName,
        actor_uid: actorUid,
      });
    },
    [facturas, clientes, actorUid, userName],
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

  const eliminarFacturaEnNube = useCallback(async () => {
    window.alert(
      "La anulación de facturas requiere estorno de saldos. Se implementará en el módulo de Facturación.",
    );

    return {
      success: false,
      error: "La anulación de facturas no está habilitada.",
    };
  }, []);

  const eliminarClienteEnNube = useCallback(
    async (id, nombreCliente) => {
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
      );
    },
    [actorUid, userName],
  );

  const actividadVisible = useMemo(
    () => (userRole === "SU" ? actividad : []),
    [actividad, userRole],
  );

  const usuariosVisibles = useMemo(
    () => (userRole === "SU" ? usuarios : []),
    [usuarios, userRole],
  );

  const contextValue = useMemo(
    () => ({
      ...authData,
      authLoading: authData.loading,

      stats,

      clientes,
      setClientes,
      eliminarClienteEnNube,

      facturas,
      setFacturas,
      crearFacturaEnNube,
      modificarFacturaEnNube,
      eliminarFacturaEnNube,
      registrarAbonoEnNube,
      eliminarAbonoEnNube,

      actividad: actividadVisible,
      setActividad,

      solicitudes,
      setSolicitudes,

      usuarios: usuariosVisibles,
    }),
    [
      authData,
      stats,
      clientes,
      eliminarClienteEnNube,
      facturas,
      crearFacturaEnNube,
      modificarFacturaEnNube,
      eliminarFacturaEnNube,
      registrarAbonoEnNube,
      eliminarAbonoEnNube,
      actividadVisible,
      solicitudes,
      usuariosVisibles,
    ],
  );

  return (
    <GlobalContext.Provider value={contextValue}>
      {children}
    </GlobalContext.Provider>
  );
}