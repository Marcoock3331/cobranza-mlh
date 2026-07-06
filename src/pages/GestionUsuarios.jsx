import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  CreditCard,
  Shield,
  UserCheck,
} from "lucide-react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
} from "firebase/firestore";

import { GlobalContext } from "../context/GlobalContext";
import { db } from "../config/firebase";
import { usuariosService } from "../services/usuariosService";
import { solicitudesService } from "../services/solicitudesService";
import AuditoriaSU from "../components/su/AuditoriaSU";
import ControlPersonalSU from "../components/su/ControlPersonalSU";
import CreditoRiesgoSU from "../components/su/CreditoRiesgoSU";
import ModalesSU from "../components/su/ModalesSU";
import ResumenEjecutivoSU from "../components/su/ResumenEjecutivoSU";
import {
  MOVIMIENTOS_LINEA_POR_PAGINA,
  NOTAS_CLIENTES_POR_PAGINA,
  NOTAS_HISTORIAL_POR_PAGINA,
  RESUMENES_LINEA_POR_PAGINA,
  TABS_PANEL_SU,
  ordenarSolicitudesOperativas,
} from "../components/su/suUtils";

const RESUMEN_LINEA_COLLECTION = "lineas_credito_resumen_clientes";
const MOVIMIENTOS_LINEA_COLLECTION = "lineas_credito_movimientos";
const RESUMEN_NOTAS_COLLECTION = "notas_credito_resumen_clientes";
const SOLICITUDES_NOTAS_COLLECTION = "solicitudes_notas_credito";

const normalizarTab = (tab = "") => {
  if (tab === "solicitudes" || tab === "creditos") return "creditos";
  if (tab === "usuarios") return "usuarios";
  if (tab === "actividad") return "actividad";
  return "resumen";
};

const normalizarVistaCredito = (vista = "") =>
  vista === "linea" ? "linea" : "notas";

const normalizarFiltroNotaCredito = (filtro = "") => {
  const filtroSeguro = String(filtro || "").trim();

  if (["Pendiente", "Autorizado", "Rechazado", "Anulada"].includes(filtroSeguro)) {
    return filtroSeguro;
  }

  return "TODAS";
};

export default function GestionUsuarios() {
  const {
    userRole,
    actividad,
    solicitudesNotasCredito,
    currentUser,
    usuarios,
    userName,
  } = useContext(GlobalContext);

  const [searchParams, setSearchParams] = useSearchParams();

  const tabActiva = normalizarTab(searchParams.get("tab"));
  const vistaCredito = normalizarVistaCredito(searchParams.get("vista"));
  const clienteLineaSeleccionadoId = searchParams.get("clienteLinea") || "";
  const clienteNotaSeleccionadoId = searchParams.get("clienteNota") || "";
  const filtroHistorialNotasCredito = normalizarFiltroNotaCredito(
    searchParams.get("filtroNota"),
  );

  const isSuperUser = userRole && userRole.trim().toUpperCase() === "SU";
  const usuarioResponsable = userName || "SU_Admin";

  const [modalActivo, setModalActivo] = useState(null);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [actividadSeleccionada, setActividadSeleccionada] = useState(null);
  const [tempSolicitud, setTempSolicitud] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notificacion, setNotificacion] = useState({
    titulo: "",
    descripcion: "",
    tipo: "exito",
  });
  const [motivoRechazoNota, setMotivoRechazoNota] = useState("");
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    usuario: "",
    correo: "",
    password: "",
  });

  const [resumenesLineaCredito, setResumenesLineaCredito] = useState([]);
  const [clienteLineaSeleccionadoDetalle, setClienteLineaSeleccionadoDetalle] =
    useState(null);
  const [movimientosClienteLinea, setMovimientosClienteLinea] = useState([]);
  const [cargandoMovimientosLinea, setCargandoMovimientosLinea] =
    useState(false);
  const [cargandoResumenesLineaCredito, setCargandoResumenesLineaCredito] =
    useState(false);
  const [errorResumenesLineaCredito, setErrorResumenesLineaCredito] =
    useState("");
  const [paginaLineaCredito, setPaginaLineaCredito] = useState(1);
  const [cursoresLineaCredito, setCursoresLineaCredito] = useState([]);
  const [haySiguienteLineaCredito, setHaySiguienteLineaCredito] =
    useState(false);

  const [resumenesNotasCredito, setResumenesNotasCredito] = useState([]);
  const [clienteNotaSeleccionadoDetalle, setClienteNotaSeleccionadoDetalle] =
    useState(null);
  const [historialNotasCliente, setHistorialNotasCliente] = useState([]);
  const [cargandoResumenesNotasCredito, setCargandoResumenesNotasCredito] =
    useState(false);
  const [errorResumenesNotasCredito, setErrorResumenesNotasCredito] =
    useState("");
  const [cargandoHistorialNotasCredito, setCargandoHistorialNotasCredito] =
    useState(false);
  const [errorHistorialNotasCredito, setErrorHistorialNotasCredito] =
    useState("");
  const [paginaNotasCredito, setPaginaNotasCredito] = useState(1);
  const [cursoresNotasCredito, setCursoresNotasCredito] = useState([]);
  const [haySiguienteNotasCredito, setHaySiguienteNotasCredito] =
    useState(false);
  const [paginaHistorialNotasCredito, setPaginaHistorialNotasCredito] =
    useState(1);
  const [cursoresHistorialNotasCredito, setCursoresHistorialNotasCredito] =
    useState([]);
  const [haySiguienteHistorialNotasCredito, setHaySiguienteHistorialNotasCredito] =
    useState(false);
  const hayAnteriorLineaCredito = paginaLineaCredito > 1;
  const hayAnteriorNotasCredito = paginaNotasCredito > 1;
  const hayAnteriorHistorialNotasCredito = paginaHistorialNotasCredito > 1;

  const clienteLineaEnPagina = useMemo(
    () =>
      (resumenesLineaCredito || []).find(
        (resumen) => resumen.cliente_id === clienteLineaSeleccionadoId,
      ) || null,
    [clienteLineaSeleccionadoId, resumenesLineaCredito],
  );

  const clienteLineaSeleccionadoParaVista = clienteLineaSeleccionadoId
    ? clienteLineaEnPagina || clienteLineaSeleccionadoDetalle
    : null;

  const clienteNotaEnPagina = useMemo(
    () =>
      (resumenesNotasCredito || []).find(
        (resumen) => resumen.cliente_id === clienteNotaSeleccionadoId,
      ) || null,
    [clienteNotaSeleccionadoId, resumenesNotasCredito],
  );

  const clienteNotaSeleccionadoParaVista = clienteNotaSeleccionadoId
    ? clienteNotaEnPagina || clienteNotaSeleccionadoDetalle
    : null;

  const actualizarParametros = (cambios = {}, borrar = []) => {
    const nuevosParametros = new URLSearchParams(searchParams);

    Object.entries(cambios).forEach(([clave, valor]) => {
      if (valor === null || valor === undefined || valor === "") {
        nuevosParametros.delete(clave);
      } else {
        nuevosParametros.set(clave, valor);
      }
    });

    borrar.forEach((clave) => nuevosParametros.delete(clave));

    setSearchParams(nuevosParametros);
  };

  const cambiarTab = (tab) => {
    actualizarParametros(
      {
        tab,
      },
      tab === "creditos"
        ? []
        : ["vista", "solicitud", "clienteLinea", "clienteNota", "filtroNota"],
    );
  };

  const cambiarVistaCredito = (vista) => {
    actualizarParametros(
      {
        tab: "creditos",
        vista,
      },
      vista === "linea"
        ? ["solicitud", "clienteNota", "filtroNota"]
        : ["clienteLinea"],
    );
  };

  const administradores = useMemo(
    () => (usuarios || []).filter((usuario) => usuario.rol === "ADMIN"),
    [usuarios],
  );

  const solicitudesNotasOrdenadas = useMemo(
    () => ordenarSolicitudesOperativas(solicitudesNotasCredito || []),
    [solicitudesNotasCredito],
  );

  const solicitudesPendientesCount = useMemo(
    () =>
      solicitudesNotasOrdenadas.filter(
        (solicitud) => solicitud.estatus === "Pendiente",
      ).length,
    [solicitudesNotasOrdenadas],
  );

  const cargarPaginaResumenesLineaCredito = useCallback(
    async ({ paginaDestino = 1, cursor = null, reiniciarCursores = false } = {}) => {
      if (!isSuperUser) return;

      setCargandoResumenesLineaCredito(true);
      setErrorResumenesLineaCredito("");

      try {
        const restricciones = [];

        restricciones.push(orderBy("ultimo_movimiento_at", "desc"));

        if (cursor) {
          restricciones.push(startAfter(cursor));
        }

        restricciones.push(limit(RESUMENES_LINEA_POR_PAGINA + 1));

        const qResumenes = query(
          collection(db, RESUMEN_LINEA_COLLECTION),
          ...restricciones,
        );

        const snap = await getDocs(qResumenes);
        const documentosVisibles = snap.docs.slice(
          0,
          RESUMENES_LINEA_POR_PAGINA,
        );

        const data = documentosVisibles.map((documento) => ({
          id: documento.id,
          ...documento.data(),
        }));

        setResumenesLineaCredito(data);
        setPaginaLineaCredito(paginaDestino);
        setHaySiguienteLineaCredito(
          snap.docs.length > RESUMENES_LINEA_POR_PAGINA,
        );

        setCursoresLineaCredito((cursoresActuales) => {
          if (reiniciarCursores) {
            return documentosVisibles.length > 0
              ? [documentosVisibles[documentosVisibles.length - 1]]
              : [];
          }

          const cursoresNuevos = cursoresActuales.slice(0, paginaDestino - 1);

          if (documentosVisibles.length > 0) {
            cursoresNuevos[paginaDestino - 1] =
              documentosVisibles[documentosVisibles.length - 1];
          }

          return cursoresNuevos;
        });
      } catch (error) {
        console.error("Error cargando resumen de línea de crédito:", error);
        setResumenesLineaCredito([]);
        setHaySiguienteLineaCredito(false);
        setErrorResumenesLineaCredito(
          error?.code === "failed-precondition"
            ? "Firestore requiere un índice para este filtro. Crea el índice que Firebase indique en consola."
            : "No se pudo cargar la página de líneas de crédito.",
        );
      } finally {
        setCargandoResumenesLineaCredito(false);
      }
    },
    [isSuperUser],
  );

  const cargarPaginaResumenesNotasCredito = useCallback(
    async ({ paginaDestino = 1, cursor = null, reiniciarCursores = false } = {}) => {
      if (!isSuperUser) return;

      setCargandoResumenesNotasCredito(true);
      setErrorResumenesNotasCredito("");

      try {
        const restricciones = [];

        restricciones.push(orderBy("ultimo_movimiento_at", "desc"));

        if (cursor) {
          restricciones.push(startAfter(cursor));
        }

        restricciones.push(limit(NOTAS_CLIENTES_POR_PAGINA + 1));

        const qResumenes = query(
          collection(db, RESUMEN_NOTAS_COLLECTION),
          ...restricciones,
        );

        const snap = await getDocs(qResumenes);
        const documentosVisibles = snap.docs.slice(
          0,
          NOTAS_CLIENTES_POR_PAGINA,
        );

        const resumenesOptimizados = documentosVisibles.map((documento) => ({
          id: documento.id,
          ...documento.data(),
        }));

        setResumenesNotasCredito(resumenesOptimizados);
        setPaginaNotasCredito(paginaDestino);
        setHaySiguienteNotasCredito(
          snap.docs.length > NOTAS_CLIENTES_POR_PAGINA,
        );

        setCursoresNotasCredito((cursoresActuales) => {
          if (reiniciarCursores) {
            return documentosVisibles.length > 0
              ? [documentosVisibles[documentosVisibles.length - 1]]
              : [];
          }

          const cursoresNuevos = cursoresActuales.slice(0, paginaDestino - 1);

          if (documentosVisibles.length > 0) {
            cursoresNuevos[paginaDestino - 1] =
              documentosVisibles[documentosVisibles.length - 1];
          }

          return cursoresNuevos;
        });
      } catch (error) {
        console.error("Error cargando resumen de notas de crédito:", error);
        setResumenesNotasCredito([]);
        setHaySiguienteNotasCredito(false);
        setErrorResumenesNotasCredito(
          error?.code === "failed-precondition"
            ? "Firestore requiere un índice para cargar clientes con notas. Crea el índice que Firebase indique en consola."
            : "No se pudo cargar la página de clientes con notas de crédito.",
        );
      } finally {
        setCargandoResumenesNotasCredito(false);
      }
    },
    [isSuperUser],
  );

  const cargarPaginaHistorialNotasCredito = useCallback(
    async ({ paginaDestino = 1, cursor = null, reiniciarCursores = false } = {}) => {
      if (!isSuperUser || !clienteNotaSeleccionadoId) return;

      setCargandoHistorialNotasCredito(true);
      setErrorHistorialNotasCredito("");

      try {
        const restricciones = [where("cliente_id", "==", clienteNotaSeleccionadoId)];

        if (filtroHistorialNotasCredito === "Anulada") {
          restricciones.push(where("nota_anulada", "==", true));
        } else if (filtroHistorialNotasCredito !== "TODAS") {
          restricciones.push(where("estatus", "==", filtroHistorialNotasCredito));
        }

        restricciones.push(orderBy("createdAt", "desc"));

        if (cursor) {
          restricciones.push(startAfter(cursor));
        }

        restricciones.push(limit(NOTAS_HISTORIAL_POR_PAGINA + 1));

        const qHistorial = query(
          collection(db, SOLICITUDES_NOTAS_COLLECTION),
          ...restricciones,
        );

        const snap = await getDocs(qHistorial);
        const documentosVisibles = snap.docs.slice(
          0,
          NOTAS_HISTORIAL_POR_PAGINA,
        );

        const data = documentosVisibles.map((documento) => ({
          id: documento.id,
          ...documento.data(),
        }));

        setHistorialNotasCliente(data);
        setPaginaHistorialNotasCredito(paginaDestino);
        setHaySiguienteHistorialNotasCredito(
          snap.docs.length > NOTAS_HISTORIAL_POR_PAGINA,
        );

        setCursoresHistorialNotasCredito((cursoresActuales) => {
          if (reiniciarCursores) {
            return documentosVisibles.length > 0
              ? [documentosVisibles[documentosVisibles.length - 1]]
              : [];
          }

          const cursoresNuevos = cursoresActuales.slice(0, paginaDestino - 1);

          if (documentosVisibles.length > 0) {
            cursoresNuevos[paginaDestino - 1] =
              documentosVisibles[documentosVisibles.length - 1];
          }

          return cursoresNuevos;
        });
      } catch (error) {
        console.error("Error cargando historial de notas de crédito:", error);
        setHistorialNotasCliente([]);
        setHaySiguienteHistorialNotasCredito(false);
        setErrorHistorialNotasCredito(
          error?.code === "failed-precondition"
            ? "Firestore requiere un índice para este historial. Crea el índice que Firebase indique en consola."
            : "No se pudo cargar el historial de notas del cliente.",
        );
      } finally {
        setCargandoHistorialNotasCredito(false);
      }
    },
    [clienteNotaSeleccionadoId, filtroHistorialNotasCredito, isSuperUser],
  );

  useEffect(() => {
    if (!isSuperUser) {
      return undefined;
    }

    let cancelado = false;

    const timeoutId = window.setTimeout(() => {
      if (cancelado) return;

      cargarPaginaResumenesLineaCredito({
        paginaDestino: 1,
        cursor: null,
        reiniciarCursores: true,
      });
    }, 0);

    return () => {
      cancelado = true;
      window.clearTimeout(timeoutId);
    };
  }, [cargarPaginaResumenesLineaCredito, isSuperUser]);

  useEffect(() => {
    if (!isSuperUser) {
      return undefined;
    }

    let cancelado = false;

    const timeoutId = window.setTimeout(() => {
      if (cancelado) return;

      cargarPaginaResumenesNotasCredito({
        paginaDestino: 1,
        cursor: null,
        reiniciarCursores: true,
      });
    }, 0);

    return () => {
      cancelado = true;
      window.clearTimeout(timeoutId);
    };
  }, [cargarPaginaResumenesNotasCredito, isSuperUser]);

  useEffect(() => {
    if (!isSuperUser || !clienteLineaSeleccionadoId || clienteLineaEnPagina) {
      return undefined;
    }

    let cancelado = false;

    const cargarDetalleSeleccionado = async () => {
      try {
        const resumenRef = doc(
          db,
          RESUMEN_LINEA_COLLECTION,
          clienteLineaSeleccionadoId,
        );
        const resumenSnap = await getDoc(resumenRef);

        if (cancelado) return;

        if (resumenSnap.exists()) {
          setClienteLineaSeleccionadoDetalle({
            id: resumenSnap.id,
            ...resumenSnap.data(),
          });
        } else {
          setClienteLineaSeleccionadoDetalle(null);
        }
      } catch (error) {
        console.error("Error cargando detalle de línea seleccionado:", error);

        if (!cancelado) {
          setClienteLineaSeleccionadoDetalle(null);
        }
      }
    };

    cargarDetalleSeleccionado();

    return () => {
      cancelado = true;
    };
  }, [clienteLineaEnPagina, clienteLineaSeleccionadoId, isSuperUser]);

  useEffect(() => {
    if (!isSuperUser || !clienteNotaSeleccionadoId || clienteNotaEnPagina) {
      return undefined;
    }

    let cancelado = false;

    const cargarDetalleSeleccionado = async () => {
      try {
        const resumenRef = doc(
          db,
          RESUMEN_NOTAS_COLLECTION,
          clienteNotaSeleccionadoId,
        );
        const resumenSnap = await getDoc(resumenRef);

        if (cancelado) return;

        setClienteNotaSeleccionadoDetalle(
          resumenSnap.exists()
            ? {
                id: resumenSnap.id,
                ...resumenSnap.data(),
              }
            : null,
        );
      } catch (error) {
        console.error("Error cargando detalle de notas seleccionado:", error);

        if (!cancelado) {
          setClienteNotaSeleccionadoDetalle(null);
        }
      }
    };

    cargarDetalleSeleccionado();

    return () => {
      cancelado = true;
    };
  }, [clienteNotaEnPagina, clienteNotaSeleccionadoId, isSuperUser]);

  useEffect(() => {
    if (!isSuperUser || !clienteNotaSeleccionadoId) {
      return undefined;
    }

    let cancelado = false;

    const timeoutId = window.setTimeout(() => {
      if (cancelado) return;

      cargarPaginaHistorialNotasCredito({
        paginaDestino: 1,
        cursor: null,
        reiniciarCursores: true,
      });
    }, 0);

    return () => {
      cancelado = true;
      window.clearTimeout(timeoutId);
    };
  }, [cargarPaginaHistorialNotasCredito, clienteNotaSeleccionadoId, isSuperUser]);

  useEffect(() => {
    if (!isSuperUser || !clienteLineaSeleccionadoId) {
      return undefined;
    }

    const qMovimientos = query(
      collection(db, MOVIMIENTOS_LINEA_COLLECTION),
      where("cliente_id", "==", clienteLineaSeleccionadoId),
      orderBy("createdAt", "desc"),
      limit(MOVIMIENTOS_LINEA_POR_PAGINA),
    );

    const unsub = onSnapshot(
      qMovimientos,
      (snap) => {
        const data = snap.docs.map((documento) => ({
          id: documento.id,
          ...documento.data(),
        }));

        setMovimientosClienteLinea(data);
        setCargandoMovimientosLinea(false);
      },
      (error) => {
        console.error("Error cargando historial de línea del cliente:", error);
        setMovimientosClienteLinea([]);
        setCargandoMovimientosLinea(false);
      },
    );

    return () => unsub();
  }, [isSuperUser, clienteLineaSeleccionadoId]);

  const irSiguienteLineaCredito = () => {
    if (cargandoResumenesLineaCredito || !haySiguienteLineaCredito) return;

    const cursorActual = cursoresLineaCredito[paginaLineaCredito - 1];

    if (!cursorActual) return;

    cargarPaginaResumenesLineaCredito({
      paginaDestino: paginaLineaCredito + 1,
      cursor: cursorActual,
    });
  };

  const irAnteriorLineaCredito = () => {
    if (cargandoResumenesLineaCredito || paginaLineaCredito <= 1) return;

    const paginaDestino = paginaLineaCredito - 1;
    const cursorAnterior =
      paginaDestino === 1 ? null : cursoresLineaCredito[paginaDestino - 2];

    cargarPaginaResumenesLineaCredito({
      paginaDestino,
      cursor: cursorAnterior,
    });
  };

  const irSiguienteNotasCredito = () => {
    if (cargandoResumenesNotasCredito || !haySiguienteNotasCredito) return;

    const cursorActual = cursoresNotasCredito[paginaNotasCredito - 1];

    if (!cursorActual) return;

    cargarPaginaResumenesNotasCredito({
      paginaDestino: paginaNotasCredito + 1,
      cursor: cursorActual,
    });
  };

  const irAnteriorNotasCredito = () => {
    if (cargandoResumenesNotasCredito || paginaNotasCredito <= 1) return;

    const paginaDestino = paginaNotasCredito - 1;
    const cursorAnterior =
      paginaDestino === 1 ? null : cursoresNotasCredito[paginaDestino - 2];

    cargarPaginaResumenesNotasCredito({
      paginaDestino,
      cursor: cursorAnterior,
    });
  };

  const irSiguienteHistorialNotasCredito = () => {
    if (cargandoHistorialNotasCredito || !haySiguienteHistorialNotasCredito) {
      return;
    }

    const cursorActual = cursoresHistorialNotasCredito[paginaHistorialNotasCredito - 1];

    if (!cursorActual) return;

    cargarPaginaHistorialNotasCredito({
      paginaDestino: paginaHistorialNotasCredito + 1,
      cursor: cursorActual,
    });
  };

  const irAnteriorHistorialNotasCredito = () => {
    if (cargandoHistorialNotasCredito || paginaHistorialNotasCredito <= 1) {
      return;
    }

    const paginaDestino = paginaHistorialNotasCredito - 1;
    const cursorAnterior =
      paginaDestino === 1
        ? null
        : cursoresHistorialNotasCredito[paginaDestino - 2];

    cargarPaginaHistorialNotasCredito({
      paginaDestino,
      cursor: cursorAnterior,
    });
  };

  const cerrarModal = () => {
    if (isSubmitting) return;

    setModalActivo(null);
    setUsuarioSeleccionado(null);
    setActividadSeleccionada(null);
    setTempSolicitud(null);
    setMotivoRechazoNota("");
  };

  const mostrarNotificacion = (titulo, descripcion, tipo = "exito") => {
    setNotificacion({ titulo, descripcion, tipo });
    setModalActivo("notificacion");
  };

  const handleCrearUsuario = async (event) => {
    event.preventDefault();

    if (!currentUser?.uid) {
      mostrarNotificacion(
        "Error",
        "No se pudo identificar al Súper Usuario responsable.",
        "error",
      );
      return;
    }

    setIsSubmitting(true);

    const res = await usuariosService.crearAdmin({
      nombre: nuevoUsuario.nombre,
      usuario: nuevoUsuario.usuario,
      correo: nuevoUsuario.correo,
      password: nuevoUsuario.password,
      userName: usuarioResponsable,
      actor_uid: currentUser.uid,
    });

    setIsSubmitting(false);

    if (res.success) {
      mostrarNotificacion(
        "Usuario creado",
        `El acceso para ${nuevoUsuario.nombre} fue generado con alias y correo real.`,
      );

      setNuevoUsuario({
        nombre: "",
        usuario: "",
        correo: "",
        password: "",
      });
      return;
    }

    mostrarNotificacion("Alerta", res.error, "error");
  };

  const abrirConfirmacionEstado = (usuario) => {
    setUsuarioSeleccionado(usuario);
    setModalActivo("confirmarEstado");
  };

  const abrirConfirmacionResetPassword = (usuario) => {
    setUsuarioSeleccionado(usuario);
    setModalActivo("confirmarResetPassword");
  };

  const confirmarResetPassword = async () => {
    if (!usuarioSeleccionado || !currentUser?.uid) {
      mostrarNotificacion(
        "Error",
        "No se pudo identificar al usuario o al Súper Usuario responsable.",
        "error",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await usuariosService.enviarRecuperacionPassword({
        correoObjetivo: usuarioSeleccionado.correo,
        usuarioAlias: usuarioSeleccionado.usuario_alias || usuarioSeleccionado.usuarioLimpio,
        userName: usuarioResponsable,
        actor_uid: currentUser.uid,
      });

      if (!res.success) {
        mostrarNotificacion(
          "Error",
          res.error || "No se pudo enviar el correo de recuperación.",
          "error",
        );
        return;
      }

      setUsuarioSeleccionado(null);

      mostrarNotificacion(
        "Recuperación enviada",
        "Firebase envió el enlace de recuperación al correo real vinculado.",
      );
    } catch (error) {
      console.error("Error enviando recuperación:", error);

      mostrarNotificacion(
        "Error crítico",
        "Ocurrió un error inesperado al enviar la recuperación.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const alternarEstadoUsuario = async () => {
    if (!usuarioSeleccionado || !currentUser?.uid) {
      mostrarNotificacion(
        "Error",
        "No se pudo identificar al usuario o al Súper Usuario responsable.",
        "error",
      );
      return;
    }

    const nuevoEstado = !usuarioSeleccionado.activo;
    setIsSubmitting(true);

    try {
      const res = await usuariosService.actualizarEstadoUsuario({
        uid: usuarioSeleccionado.id,
        activo: nuevoEstado,
        correoObjetivo: usuarioSeleccionado.correo,
        usuarioAlias: usuarioSeleccionado.usuario_alias || usuarioSeleccionado.usuarioLimpio,
        userName: usuarioResponsable,
        actor_uid: currentUser.uid,
      });

      if (!res.success) {
        mostrarNotificacion(
          "Error",
          res.error || "No se pudo actualizar la cuenta.",
          "error",
        );
        return;
      }

      setUsuarioSeleccionado(null);

      mostrarNotificacion(
        nuevoEstado ? "Usuario reactivado" : "Usuario suspendido",
        nuevoEstado
          ? "La cuenta fue reactivada correctamente."
          : "La cuenta fue suspendida correctamente.",
      );
    } catch (error) {
      console.error("Error actualizando el usuario:", error);

      mostrarNotificacion(
        "Error crítico",
        "Ocurrió un error inesperado al actualizar la cuenta.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const abrirEvaluarSolicitudNotaCredito = (solicitud, nuevoEstatus) => {
    setMotivoRechazoNota("");
    setTempSolicitud({
      ...solicitud,
      nuevoEstatus,
      tipo_solicitud: "NOTA_CREDITO",
    });
    setModalActivo("confirmarSolicitud");
  };

  const confirmarSolicitud = async () => {
    if (!tempSolicitud?.id || !currentUser?.uid) {
      mostrarNotificacion(
        "Error",
        "No se pudo identificar la solicitud o al Súper Usuario.",
        "error",
      );
      return;
    }

    if (tempSolicitud.nuevoEstatus === "Rechazado" && !motivoRechazoNota.trim()) {
      mostrarNotificacion(
        "Motivo requerido",
        "Ingresa el motivo del rechazo para que el ADMIN pueda consultarlo.",
        "error",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await solicitudesService.resolverSolicitudNotaCredito({
        solicitud_id: tempSolicitud.id,
        decision: tempSolicitud.nuevoEstatus,
        actor_uid: currentUser.uid,
        actor_nombre: usuarioResponsable,
        motivo_resolucion:
          tempSolicitud.nuevoEstatus === "Rechazado"
            ? motivoRechazoNota
            : "",
      });

      if (!res.success) {
        mostrarNotificacion(
          "Error al resolver",
          res.error || "No se pudo procesar la solicitud.",
          "error",
        );
        return;
      }

      mostrarNotificacion(
        tempSolicitud.nuevoEstatus === "Autorizado"
          ? "Solicitud aprobada"
          : "Solicitud rechazada",
        tempSolicitud.nuevoEstatus === "Autorizado"
          ? "La nota de crédito fue aplicada a la factura y quedó registrada en auditoría."
          : "La solicitud de nota de crédito fue rechazada sin modificar la factura.",
      );

      setTempSolicitud(null);
      setMotivoRechazoNota("");

      await cargarPaginaResumenesNotasCredito({
        paginaDestino: paginaNotasCredito,
        cursor: paginaNotasCredito === 1 ? null : cursoresNotasCredito[paginaNotasCredito - 2],
        reiniciarCursores: paginaNotasCredito === 1,
      });

      if (clienteNotaSeleccionadoId) {
        await cargarPaginaHistorialNotasCredito({
          paginaDestino: 1,
          cursor: null,
          reiniciarCursores: true,
        });
      }
    } catch (error) {
      console.error("Error resolviendo solicitud:", error);

      mostrarNotificacion(
        "Error crítico",
        "Ocurrió un error inesperado al resolver la solicitud.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const seleccionarClienteNota = (resumen) => {
    const mismoElemento = clienteNotaSeleccionadoId === resumen.cliente_id;

    if (mismoElemento) {
      setClienteNotaSeleccionadoDetalle(null);
      setHistorialNotasCliente([]);
      setCargandoHistorialNotasCredito(false);
    } else {
      setClienteNotaSeleccionadoDetalle(resumen);
      setHistorialNotasCliente([]);
      setCargandoHistorialNotasCredito(true);
    }

    actualizarParametros(
      {
        tab: "creditos",
        vista: "notas",
        clienteNota: mismoElemento ? "" : resumen.cliente_id,
        filtroNota: mismoElemento ? "" : "TODAS",
      },
      ["clienteLinea", "solicitud"],
    );
  };

  const cambiarFiltroHistorialNotasCredito = (filtro) => {
    actualizarParametros(
      {
        tab: "creditos",
        vista: "notas",
        filtroNota: filtro === "TODAS" ? "" : filtro,
      },
      ["clienteLinea", "solicitud"],
    );
  };

  const seleccionarClienteLinea = (resumen) => {
    const mismoElemento = clienteLineaSeleccionadoId === resumen.cliente_id;

    if (mismoElemento) {
      setClienteLineaSeleccionadoDetalle(null);
      setMovimientosClienteLinea([]);
      setCargandoMovimientosLinea(false);
    } else {
      setClienteLineaSeleccionadoDetalle(resumen);
      setMovimientosClienteLinea([]);
      setCargandoMovimientosLinea(true);
    }

    actualizarParametros(
      {
        tab: "creditos",
        vista: "linea",
        clienteLinea: mismoElemento ? "" : resumen.cliente_id,
      },
      ["solicitud", "clienteNota", "filtroNota"],
    );
  };

  const abrirDetalleEdicionFactura = (actividadSeleccionadaNueva) => {
    setActividadSeleccionada(actividadSeleccionadaNueva);
    setModalActivo("detalleEdicionFactura");
  };

  if (!isSuperUser) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center rounded-xl border border-gray-100 bg-white p-6 text-center shadow-sm animate-in zoom-in duration-300">
        <div className="mb-4 rounded-full bg-red-50 p-4 text-red-500">
          <Shield className="h-10 w-10" />
        </div>

        <h2 className="text-xl font-black text-[#0a192f]">
          Área privada requerida
        </h2>

        <p className="mt-1 max-w-sm text-xs leading-relaxed text-gray-400">
          No posees el rango maestro de Súper Usuario para modificar accesos o auditar operaciones financieras.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col space-y-4 pb-10 text-sm animate-fade-in md:space-y-6">
      <div className="mt-2 flex flex-col items-start justify-between gap-2 md:mt-4 md:flex-row md:items-end md:gap-4">
        <div>
          <h1 className="flex items-center text-xl font-bold text-[#0a192f] md:text-2xl">
            <Shield className="mr-2 h-5 w-5 text-amber-500 md:h-6 md:w-6" />
            Panel de Control SU
          </h1>

          <p className="mt-1 text-xs text-gray-500 md:text-sm">
            Centro ejecutivo de personal, gestión de créditos y auditoría global.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white bg-white/55 p-2 shadow-sm md:grid-cols-4">
        {TABS_PANEL_SU.map((tab) => {
          const activa = tabActiva === tab.id;

          const Icono =
            tab.id === "resumen"
              ? Shield
              : tab.id === "usuarios"
                ? UserCheck
                : tab.id === "creditos"
                  ? CreditCard
                  : Activity;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => cambiarTab(tab.id)}
              className={`group flex min-h-[64px] items-center gap-2 rounded-xl border px-3 py-3 text-left transition-all duration-100 active:scale-[0.98] md:gap-3 md:px-4 ${
                activa
                  ? "border-[#0a192f] bg-[#0a192f] text-white shadow-sm"
                  : "border-transparent text-gray-600 hover:-translate-y-0.5 hover:border-[#ffd700]/60 hover:bg-white hover:shadow-[0_10px_22px_rgba(10,25,47,0.10)]"
              }`}
            >
              <Icono
                className={`h-4 w-4 shrink-0 ${
                  activa ? "text-[#ffd700]" : "text-gray-400 group-hover:text-[#ffd700]"
                }`}
              />

              <span className="min-w-0">
                <span className="block text-xs font-black">
                  {tab.label}
                  {tab.id === "creditos" && solicitudesPendientesCount > 0 && (
                    <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] text-white">
                      {solicitudesPendientesCount}
                    </span>
                  )}
                </span>

                <span
                  className={`hidden text-[10px] font-semibold md:block ${
                    activa ? "text-white/60" : "text-gray-400"
                  }`}
                >
                  {tab.descripcion}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {tabActiva === "resumen" && (
        <ResumenEjecutivoSU
          administradores={administradores}
          solicitudesNotasOrdenadas={solicitudesNotasOrdenadas}
          resumenesLineaCredito={resumenesLineaCredito}
          actividad={actividad || []}
          onCambiarTab={cambiarTab}
        />
      )}

      {tabActiva === "usuarios" && (
        <ControlPersonalSU
          administradores={administradores}
          onCrearUsuario={() => setModalActivo("nuevoUsuario")}
          onCambiarEstado={abrirConfirmacionEstado}
          onEnviarResetPassword={abrirConfirmacionResetPassword}
        />
      )}

      {tabActiva === "creditos" && (
        <CreditoRiesgoSU
          vistaCredito={vistaCredito}
          onCambiarVista={cambiarVistaCredito}
          clienteNotaSeleccionadoId={clienteNotaSeleccionadoId}
          clienteNotaSeleccionado={clienteNotaSeleccionadoParaVista}
          resumenesNotasCredito={resumenesNotasCredito}
          historialNotasCliente={historialNotasCliente}
          cargandoResumenesNotasCredito={cargandoResumenesNotasCredito}
          errorResumenesNotasCredito={errorResumenesNotasCredito}
          cargandoHistorialNotasCredito={cargandoHistorialNotasCredito}
          errorHistorialNotasCredito={errorHistorialNotasCredito}
          paginaNotasCredito={paginaNotasCredito}
          hayAnteriorNotasCredito={hayAnteriorNotasCredito}
          haySiguienteNotasCredito={haySiguienteNotasCredito}
          paginaHistorialNotasCredito={paginaHistorialNotasCredito}
          hayAnteriorHistorialNotasCredito={hayAnteriorHistorialNotasCredito}
          haySiguienteHistorialNotasCredito={haySiguienteHistorialNotasCredito}
          filtroHistorialNotasCredito={filtroHistorialNotasCredito}
          clienteLineaSeleccionadoId={clienteLineaSeleccionadoId}
          clienteLineaSeleccionado={clienteLineaSeleccionadoParaVista}
          solicitudesNotasOrdenadas={solicitudesNotasOrdenadas}
          resumenesLineaCredito={resumenesLineaCredito}
          movimientosClienteLinea={movimientosClienteLinea}
          cargandoMovimientosLinea={cargandoMovimientosLinea}
          cargandoResumenesLineaCredito={cargandoResumenesLineaCredito}
          errorResumenesLineaCredito={errorResumenesLineaCredito}
          paginaLineaCredito={paginaLineaCredito}
          hayAnteriorLineaCredito={hayAnteriorLineaCredito}
          haySiguienteLineaCredito={haySiguienteLineaCredito}
          onAnteriorNotasCredito={irAnteriorNotasCredito}
          onSiguienteNotasCredito={irSiguienteNotasCredito}
          onAnteriorHistorialNotasCredito={irAnteriorHistorialNotasCredito}
          onSiguienteHistorialNotasCredito={irSiguienteHistorialNotasCredito}
          onCambiarFiltroHistorialNotasCredito={cambiarFiltroHistorialNotasCredito}
          onAnteriorLineaCredito={irAnteriorLineaCredito}
          onSiguienteLineaCredito={irSiguienteLineaCredito}
          onSeleccionarClienteNota={seleccionarClienteNota}
          onSeleccionarClienteLinea={seleccionarClienteLinea}
          onResolverSolicitudNota={abrirEvaluarSolicitudNotaCredito}
        />
      )}

      {tabActiva === "actividad" && (
        <AuditoriaSU
          actividad={actividad || []}
          onVerDetalleEdicionFactura={abrirDetalleEdicionFactura}
        />
      )}

      <ModalesSU
        modalActivo={modalActivo}
        nuevoUsuario={nuevoUsuario}
        setNuevoUsuario={setNuevoUsuario}
        usuarioSeleccionado={usuarioSeleccionado}
        tempSolicitud={tempSolicitud}
        actividadSeleccionada={actividadSeleccionada}
        notificacion={notificacion}
        motivoRechazoNota={motivoRechazoNota}
        setMotivoRechazoNota={setMotivoRechazoNota}
        isSubmitting={isSubmitting}
        onCerrarModal={cerrarModal}
        onCrearUsuario={handleCrearUsuario}
        onAlternarEstadoUsuario={alternarEstadoUsuario}
        onConfirmarSolicitud={confirmarSolicitud}
        onConfirmarResetPassword={confirmarResetPassword}
      />
    </div>
  );
}