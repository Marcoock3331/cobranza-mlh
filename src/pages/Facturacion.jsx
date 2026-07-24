import { useState, useMemo, useContext, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GlobalContext } from "../context/GlobalContext";
import { useFacturas } from "../hooks/useFacturas";
import { useFacturasPaginadas } from "../hooks/useFacturasPaginadas";
import PaginacionGlobal from "../components/ui/PaginacionGlobal";
import { calcularDiasVencidos } from "../utils/fechas";
import { generarMensajeWA, normalizarTelefonoMX } from "../utils/whatsapp";
import {
  esFacturaCancelada,
  esFacturaPagada,
  esFacturaVencida,
} from "../utils/estadosFactura";
import Select from "react-select";
import {
  Search,
  Plus,
  FileText,
  DollarSign,
  AlertTriangle,
  Clock,
  MoreVertical,
  Trash2,
  Edit,
  MessageSquare,
  CreditCard,
  XCircle,
  Check,
  TrendingUp,
  Calendar,
  Send,
  Smartphone,
  FilterX,
  Loader2,
  RefreshCw,
  UserRound,
  Hash,
  X,
} from "lucide-react";

const FACTURAS_POR_PAGINA = 25;

const obtenerGrupoCliente = (cliente = {}) => {
  const grupo = String(cliente?.grupo || "").trim();

  return grupo || "GENERAL";
};

const normalizarTextoBusqueda = (valor = "") =>
  valor
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const obtenerTodasNotasCredito = (factura = {}) =>
  Array.isArray(factura.notas_credito) ? factura.notas_credito : [];

const obtenerNotasCredito = (factura = {}) =>
  obtenerTodasNotasCredito(factura).filter(
    (nota) => nota.cancelada !== true && nota.estado !== "Cancelada" && nota.estado !== "Anulada",
  );

const obtenerTiempoItemNota = (item = {}) => {
  const fechaBase =
    item.fecha_anulacion?.toDate?.().getTime?.() ||
    item.anuladaAt?.toDate?.().getTime?.() ||
    item.fecha?.toDate?.().getTime?.() ||
    item.createdAt?.toDate?.().getTime?.() ||
    item.resolvedAt?.toDate?.().getTime?.() ||
    new Date(item.fechaTexto || item.fecha || 0).getTime();

  return Number.isFinite(fechaBase) ? fechaBase : 0;
};

const obtenerTotalNotasCredito = (factura = {}) => {
  const totalGuardado = Number(factura.total_notas_credito);

  if (Number.isFinite(totalGuardado) && totalGuardado > 0) {
    return totalGuardado;
  }

  return obtenerNotasCredito(factura).reduce(
    (total, nota) => total + (Number(nota.monto) || 0),
    0,
  );
};

const formatearFechaNotaCredito = (fecha) => {
  if (!fecha) return "Sin fecha";

  if (fecha?.toDate && typeof fecha.toDate === "function") {
    return fecha.toDate().toLocaleString("es-MX");
  }

  if (typeof fecha === "string") return fecha;

  return "Sin fecha";
};

const formatearFechaAbono = (fecha) => {
  if (!fecha) return "Sin fecha";

  if (fecha?.toDate && typeof fecha.toDate === "function") {
    return fecha.toDate().toLocaleString("es-MX");
  }

  if (fecha instanceof Date) {
    return fecha.toLocaleString("es-MX");
  }

  if (typeof fecha === "object" && typeof fecha.seconds === "number") {
    return new Date(fecha.seconds * 1000).toLocaleString("es-MX");
  }

  if (typeof fecha === "object" && typeof fecha._seconds === "number") {
    return new Date(fecha._seconds * 1000).toLocaleString("es-MX");
  }

  if (typeof fecha === "string") {
    return fecha;
  }

  return "Sin fecha";
};

const obtenerTiempoAbono = (abono = {}) => {
  const tiempo =
    abono.fecha?.toDate?.().getTime?.() ||
    (abono.fecha instanceof Date ? abono.fecha.getTime() : 0) ||
    (typeof abono.fecha === "object" && typeof abono.fecha?.seconds === "number"
      ? abono.fecha.seconds * 1000
      : 0) ||
    new Date(abono.fecha || 0).getTime();

  return Number.isFinite(tiempo) ? tiempo : 0;
};

const obtenerUltimoAbono = (factura = {}) => {
  const abonos = Array.isArray(factura.abonos) ? factura.abonos : [];

  if (abonos.length === 0) {
    return null;
  }

  return [...abonos].sort(
    (a, b) => obtenerTiempoAbono(b) - obtenerTiempoAbono(a),
  )[0];
};

const normalizarEstatusNotaCredito = (estatus = "") => {
  const valor = String(estatus || "Pendiente").toLowerCase();

  if (["anulada", "anulado", "cancelada", "cancelado"].includes(valor)) {
    return "Anulada";
  }

  if (["autorizado", "autorizada", "aprobado", "aprobada", "activa"].includes(valor)) {
    return "Autorizada";
  }

  if (["rechazado", "rechazada"].includes(valor)) {
    return "Rechazada";
  }

  return "Pendiente";
};

const obtenerEstiloNotaCredito = (estatus) => {
  const normalizado = normalizarEstatusNotaCredito(estatus);

  if (normalizado === "Anulada") {
    return {
      texto: "text-slate-600",
      etiqueta: "bg-slate-100 text-slate-700 border-slate-200",
      borde: "border-slate-200",
      fondo: "bg-slate-50",
    };
  }

  if (normalizado === "Autorizada") {
    return {
      texto: "text-green-700",
      etiqueta: "bg-green-50 text-green-700 border-green-200",
      borde: "border-green-100",
      fondo: "bg-green-50/30",
    };
  }

  if (normalizado === "Rechazada") {
    return {
      texto: "text-red-600",
      etiqueta: "bg-red-50 text-red-600 border-red-200",
      borde: "border-red-100",
      fondo: "bg-red-50/30",
    };
  }

  return {
    texto: "text-blue-700",
    etiqueta: "bg-blue-50 text-blue-700 border-blue-200",
    borde: "border-blue-100",
    fondo: "bg-blue-50/30",
  };
};

const tieneValorNumerico = (valor) => {
  const numero = Number(valor);

  return Number.isFinite(numero) && numero >= 0;
};

const crearFormularioFactura = (factura = null) => {
  if (!factura) {
    return {
      cliente_id: "",
      cliente: "",
      folio: "",
      monto_total: "",
      moneda: "MXN",
      emision: "",
      vencimiento: "",
      observaciones: "",
    };
  }

  return {
    cliente_id: factura.cliente_id || "",
    cliente: factura.cliente || "",
    folio: factura.folio || "",
    monto_total: factura.monto_total ?? "",
    moneda: "MXN",
    emision: factura.emision || "",
    vencimiento: factura.vencimiento || "",
    observaciones: factura.observaciones || "",
  };
};

function TarjetaResumenFacturacion({
  etiqueta,
  valor,
  descripcion,
  icono: Icono,
  variante = "azul",
}) {
  const estilos = {
    azul: {
      tarjeta: "border-blue-200 bg-blue-50/40",
      etiqueta: "text-blue-700",
      valor: "text-[#0a192f]",
      icono: "bg-white/80 text-blue-600 border-blue-100",
    },
    rojo: {
      tarjeta: "border-red-200 bg-red-50/40",
      etiqueta: "text-red-700",
      valor: "text-red-600",
      icono: "bg-white/80 text-red-600 border-red-100",
    },
    verde: {
      tarjeta: "border-green-200 bg-green-50/40",
      etiqueta: "text-green-700",
      valor: "text-green-700",
      icono: "bg-white/80 text-green-600 border-green-100",
    },
  };

  const configuracion = estilos[variante] || estilos.azul;

  return (
    <article
      className={`p-4 md:p-5 rounded-xl border text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${configuracion.tarjeta}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`text-[10px] md:text-xs uppercase font-black tracking-wide ${configuracion.etiqueta}`}
          >
            {etiqueta}
          </p>
          <strong
            className={`text-xl md:text-3xl mt-2 block break-words ${configuracion.valor}`}
          >
            {valor}
          </strong>
        </div>

        <span
          className={`h-9 w-9 md:h-10 md:w-10 rounded-xl border flex items-center justify-center shrink-0 ${configuracion.icono}`}
        >
          <Icono className="h-4 w-4 md:h-5 md:w-5" />
        </span>
      </div>

      <p className="text-[10px] md:text-xs text-gray-500 mt-2 leading-relaxed">
        {descripcion}
      </p>
    </article>
  );
}

export default function Facturacion() {
  const {
    stats,
    userRole,
    clientes,
    crearFacturaEnNube,
    modificarFacturaEnNube,
    eliminarFacturaEnNube,
    registrarAbonoEnNube,
    eliminarAbonoEnNube,
    aplicarNotaCreditoEnNube,
    solicitarNotaCreditoEnNube,
    cancelarNotaCreditoEnNube,
    solicitudesNotasCredito,
  } = useContext(GlobalContext);

  const location = useLocation();
  const navigate = useNavigate();

  const parametrosURL = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const estadoSolicitado = parametrosURL.get("estado");
  const filtroEstatusInicial = [
    "Todas",
    "Pendiente",
    "Vencida",
    "Pagada",
  ].includes(estadoSolicitado)
    ? estadoSolicitado
    : "Todas";

  const facturaInicialEdicion = location.state?.editarFactura || null;
  const facturaInicialGestion = location.state?.gestionarFactura || null;
  const facturaInicial = facturaInicialGestion || facturaInicialEdicion;

  const {
    busqueda,
    setBusqueda,
    busquedaAplicada,
    aplicarBusqueda,
    limpiarBusquedaAplicada,
    limpiarBusqueda,
    filtroEstatus,
    setFiltroEstatus,
    fechaInicio,
    setFechaInicio,
    fechaFin,
    setFechaFin,
    kpis,
    limpiarFiltros,
  } = useFacturas(stats, { filtroEstatusInicial });

  const [clienteBusqueda, setClienteBusqueda] = useState(null);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const contenedorTablaRef = useRef(null);
  const historialNotasRef = useRef(null);
  const historialAbonosRef = useRef(null);
  const paginaRenderizadaRef = useRef(1);

  const {
    facturas: facturasPaginadas,
    cargando: cargandoFacturas,
    error: errorFacturas,
    mensaje: mensajeFacturas,
    pagina: paginaActualFacturas,
    hayAnterior,
    haySiguiente,
    siguientePagina,
    paginaAnterior,
    recargar: recargarFacturas,
  } = useFacturasPaginadas({
    pageSize: FACTURAS_POR_PAGINA,
    busqueda: busquedaAplicada,
    clienteId: clienteBusqueda?.id || "",
    filtroEstatus,
    fechaInicio,
    fechaFin,
  });

  const [modalActivo, setModalActivo] = useState(() => {
    if (facturaInicialGestion) return "opcionesFactura";
    if (facturaInicialEdicion) return "editarFactura";
    return null;
  });
  const [facturaSeleccionada, setFacturaSeleccionada] =
    useState(facturaInicial);
  const [notificacion, setNotificacion] = useState({
    titulo: "",
    descripcion: "",
    tipo: "exito",
  });

  const [invoiceForm, setInvoiceForm] = useState(() =>
    crearFormularioFactura(facturaInicialEdicion),
  );

  const [pagoForm, setPagoForm] = useState({ monto: "", metodo: "Efectivo" });
  const [notaCreditoForm, setNotaCreditoForm] = useState({
    monto: "",
    motivo: "",
    observaciones: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemAEliminar, setItemAEliminar] = useState(null);
  const [notaCreditoACancelar, setNotaCreditoACancelar] = useState(null);
  const [paginaHistorialNotas, setPaginaHistorialNotas] = useState(1);
  const registrosPorPaginaNotas = 5;
  const [paginaHistorialAbonos, setPaginaHistorialAbonos] = useState(1);
  const registrosPorPaginaAbonos = 5;
  const [datosWhatsapp, setDatosWhatsapp] = useState({
    telefono: "",
    plantilla: "atrasado",
    mensaje: "",
  });

  const opcionesClientes = useMemo(() => {
    if (!clientes) return [];

    return [...clientes]
      .filter((c) => c.activo !== false && c.estatus !== "Inactivo")
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map((c) => ({
        value: c.id,
        label: c.nombre + (c.numero_cliente ? " - #" + c.numero_cliente : ""),
        cliente: c,
      }));
  }, [clientes]);

  const clienteFacturaSeleccionado = useMemo(
    () =>
      (clientes || []).find(
        (cliente) => cliente.id === invoiceForm.cliente_id,
      ) || null,
    [clientes, invoiceForm.cliente_id],
  );

  const clientesSugeridos = useMemo(() => {
    const texto = normalizarTextoBusqueda(busqueda);

    if (texto.length < 2 || clienteBusqueda) {
      return [];
    }

    return (clientes || [])
      .filter(
        (cliente) => cliente.activo !== false && cliente.estatus !== "Inactivo",
      )
      .filter((cliente) => {
        const nombre = normalizarTextoBusqueda(cliente.nombre);
        const numero = normalizarTextoBusqueda(cliente.numero_cliente);
        const rfc = normalizarTextoBusqueda(cliente.rfc);

        return (
          nombre.includes(texto) ||
          numero.includes(texto) ||
          rfc.includes(texto)
        );
      })
      .sort((a, b) =>
        (a.nombre || "").localeCompare(b.nombre || "", "es", {
          sensitivity: "base",
        }),
      )
      .slice(0, 8);
  }, [busqueda, clienteBusqueda, clientes]);

  useLayoutEffect(() => {
    if (cargandoFacturas) return;

    if (paginaRenderizadaRef.current === paginaActualFacturas) {
      return;
    }

    paginaRenderizadaRef.current = paginaActualFacturas;

    const contenedor = contenedorTablaRef.current;

    if (!contenedor) return;

    contenedor.scrollTop = 0;
    contenedor.scrollLeft = 0;
  }, [paginaActualFacturas, cargandoFacturas]);

  const moverAInicioTabla = () => {
    const contenedor = contenedorTablaRef.current;

    if (!contenedor) return;

    window.requestAnimationFrame(() => {
      contenedor.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
    });
  };

  const handleCambioBusqueda = (valor) => {
    setBusqueda(valor);
    limpiarBusquedaAplicada();

    if (clienteBusqueda && valor !== clienteBusqueda.nombre) {
      setClienteBusqueda(null);
    }

    setMostrarSugerencias(valor.trim().length >= 2);
  };

  const seleccionarClienteBusqueda = (cliente) => {
    setClienteBusqueda(cliente);
    setBusqueda(cliente.nombre || "");
    limpiarBusquedaAplicada();
    setMostrarSugerencias(false);
    moverAInicioTabla();
  };

  const buscarPorFolio = () => {
    const folio = busqueda.trim();

    if (!folio) {
      setClienteBusqueda(null);
      limpiarBusqueda();
      setMostrarSugerencias(false);
      return;
    }

    setClienteBusqueda(null);
    aplicarBusqueda();
    setMostrarSugerencias(false);
    moverAInicioTabla();
  };

  const limpiarBusquedaCompleta = () => {
    setClienteBusqueda(null);
    limpiarBusqueda();
    setMostrarSugerencias(false);
    moverAInicioTabla();
  };

  const limpiarTodosLosFiltros = () => {
    setClienteBusqueda(null);
    limpiarFiltros();
    setMostrarSugerencias(false);
    moverAInicioTabla();
  };

  const abrirMenuOpciones = (factura) => {
    setFacturaSeleccionada(factura);
    setModalActivo("opcionesFactura");
  };

  const abrirFormulario = (tipo) => {
    if (tipo === "nuevoPago") setPagoForm({ monto: "", metodo: "Efectivo" });
    else if (tipo === "notaCredito") {
      setNotaCreditoForm({ monto: "", motivo: "", observaciones: "" });
    } else if (tipo === "historialNotasCredito") {
      setPaginaHistorialNotas(1);
    } else if (tipo === "historialPagos") {
      setPaginaHistorialAbonos(1);
    } else if (tipo === "whatsapp") {
      const clienteDB =
        clientes?.find((c) => c.id === facturaSeleccionada?.cliente_id) ||
        clientes?.find((c) => c.nombre === facturaSeleccionada?.cliente);

      const telefonoAsignado =
        clienteDB?.telefono || facturaSeleccionada?.telefono || "";
      setDatosWhatsapp({
        telefono: telefonoAsignado,
        plantilla: "atrasado",
        mensaje: generarMensajeWA("atrasado", facturaSeleccionada),
      });
    } else if (tipo === "nuevaFactura") {
      setInvoiceForm(crearFormularioFactura());
    } else if (tipo === "editarFactura" && facturaSeleccionada) {
      setInvoiceForm(crearFormularioFactura(facturaSeleccionada));
    }

    setModalActivo(tipo);
  };

  const cerrarModal = () => {
    setModalActivo(null);

    if (location.state?.editarFactura || location.state?.gestionarFactura) {
      navigate(`${location.pathname}${location.search}`, {
        replace: true,
        state: null,
      });
    }
    if (
      [
        "notificacion",
        "opcionesFactura",
        "confirmarEliminar",
        "whatsapp",
        "notaCredito",
        "historialNotasCredito",
        "confirmarCancelarNotaCredito",
      ].includes(modalActivo)
    ) {
      setFacturaSeleccionada(null);
      setItemAEliminar(null);
      setNotaCreditoACancelar(null);
    }
  };

  const mostrarNotificacion = (titulo, descripcion, tipo = "exito") => {
    setNotificacion({ titulo, descripcion, tipo });
    setModalActivo("notificacion");
  };

  const handleSaveFactura = async () => {
    setIsSubmitting(true);

    try {
      const nuevoMonto = Number(invoiceForm.monto_total) || 0;

      if (
        !invoiceForm.cliente_id ||
        !invoiceForm.folio?.trim() ||
        !invoiceForm.emision ||
        !invoiceForm.vencimiento ||
        nuevoMonto <= 0
      ) {
        mostrarNotificacion(
          "Campos incompletos",
          "Selecciona cliente, folio, fechas y un monto válido para continuar.",
          "error",
        );
        return;
      }

      if (invoiceForm.vencimiento < invoiceForm.emision) {
        mostrarNotificacion(
          "Fechas inválidas",
          "La fecha de vencimiento no puede ser anterior a la fecha de emisión.",
          "error",
        );
        return;
      }

      const clienteBD = clientes.find(
        (cliente) => cliente.id === invoiceForm.cliente_id,
      );

      if (!clienteBD) {
        mostrarNotificacion(
          "Error",
          "Selecciona un cliente comercial válido.",
          "error",
        );
        return;
      }

      const payloadFactura = {
        cliente_id: clienteBD.id,
        cliente: clienteBD.nombre,
        folio: invoiceForm.folio.trim(),
        monto_total: nuevoMonto,
        moneda: "MXN",
        emision: invoiceForm.emision,
        vencimiento: invoiceForm.vencimiento,
        observaciones: invoiceForm.observaciones?.trim() || "",
      };

      if (modalActivo === "nuevaFactura") {
        const limite = Number(clienteBD.limite_credito) || 0;
        const deudaActual = Number(clienteBD.deuda_actual) || 0;
        const disponibleGuardado = Number(clienteBD.credito_disponible);
        const creditoDisponible = Number.isFinite(disponibleGuardado)
          ? disponibleGuardado
          : Math.max(0, limite - deudaActual);

        if (limite <= 0) {
          mostrarNotificacion(
            "Línea de crédito no asignada",
            `El cliente ${clienteBD.nombre} todavía no tiene una línea de crédito configurada.`,
            "error",
          );
          return;
        }

        if (nuevoMonto > creditoDisponible) {
          mostrarNotificacion(
            "Límite de Crédito Excedido",
            `El cliente ${clienteBD.nombre} solo tiene $${Math.max(0, creditoDisponible).toLocaleString("es-MX")} de crédito libre.`,
            "error",
          );
          return;
        }

        const res = await crearFacturaEnNube(payloadFactura);

        if (!res?.success) {
          mostrarNotificacion(
            "Error",
            res?.error || "No se pudo crear la factura.",
            "error",
          );
          return;
        }

        await recargarFacturas();

        mostrarNotificacion(
          "Factura Autorizada",
          `Se ha generado el folio ${payloadFactura.folio} correctamente.`,
        );
        return;
      }

      if (modalActivo === "editarFactura") {
        if (!facturaSeleccionada?.id) {
          mostrarNotificacion(
            "Error",
            "No se identificó la factura que deseas editar.",
            "error",
          );
          return;
        }

        const res = await modificarFacturaEnNube(
          facturaSeleccionada.id,
          payloadFactura,
        );

        if (!res?.success) {
          mostrarNotificacion(
            "No se pudo editar",
            res?.error || "La modificación fue rechazada.",
            "error",
          );
          return;
        }

        if (res.sinCambios) {
          mostrarNotificacion(
            "Sin cambios",
            "La factura conserva los mismos datos; no se generó una entrada de auditoría.",
          );
          return;
        }

        await recargarFacturas();

        mostrarNotificacion(
          "Factura Modificada",
          `Se actualizaron ${res.camposModificados?.length || 1} campo(s). Los saldos, límites y métricas fueron recalculados y la edición quedó registrada para el SU.`,
        );
      }
    } catch (error) {
      console.error("Error al facturar:", error);

      mostrarNotificacion(
        "Error inesperado",
        "No se pudo completar la operación de facturación.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePago = async () => {
    setIsSubmitting(true);

    try {
      const response = await registrarAbonoEnNube(
        facturaSeleccionada,
        parseFloat(pagoForm.monto),
        pagoForm.metodo,
      );

      if (response?.success) {
        await recargarFacturas();
        setPagoForm({ monto: "", metodo: "Efectivo" });
        mostrarNotificacion(
          "Abono Exitoso",
          "Dinero ingresado y límite de crédito liberado.",
        );
      } else {
        mostrarNotificacion(
          "Error",
          response?.error || "No se pudo registrar el abono.",
          "error",
        );
      }
    } catch (error) {
      console.error(error);
      mostrarNotificacion(
        "Error",
        "Ocurrió un error inesperado al registrar el pago.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMontoNotaCredito = (event) => {
    const valor = parseFloat(event.target.value);
    const maximo = Number(facturaSeleccionada?.saldo_pendiente) || 0;

    if (valor > maximo) {
      setNotaCreditoForm((previo) => ({
        ...previo,
        monto: maximo,
      }));
      return;
    }

    setNotaCreditoForm((previo) => ({
      ...previo,
      monto: event.target.value,
    }));
  };

  const obtenerSolicitudesNotasFactura = (factura = {}) =>
    (solicitudesNotasCredito || []).filter(
      (solicitud) => solicitud.factura_id === factura.id,
    );

  const obtenerHistorialNotasCredito = (factura = {}) => {
    const notasAplicadas = obtenerTodasNotasCredito(factura);
    const solicitudesFactura = obtenerSolicitudesNotasFactura(factura);

    const notasUsadas = new Set();

    const historialSolicitudes = solicitudesFactura.map((solicitud) => {
      const notaRelacionada = notasAplicadas.find(
        (nota) =>
          nota.solicitud_nota_id === solicitud.id ||
          nota.id_nota === solicitud.nota_credito_id,
      );

      if (notaRelacionada?.id_nota) {
        notasUsadas.add(notaRelacionada.id_nota);
      }

      const estatus =
        notaRelacionada?.cancelada || ["Anulada", "Cancelada"].includes(notaRelacionada?.estado)
          ? "Anulada"
          : normalizarEstatusNotaCredito(solicitud.estatus);

      if (
        estatus === "Autorizada" &&
        solicitud.nota_credito_id &&
        !notaRelacionada
      ) {
        return null;
      }

      return {
        ...solicitud,
        ...notaRelacionada,
        id: solicitud.id,
        id_nota: notaRelacionada?.id_nota || solicitud.nota_credito_id || "",
        tipo_historial: "SOLICITUD_NOTA",
        estatus_historial: estatus,
        monto:
          Number(solicitud.monto_nota) ||
          Number(notaRelacionada?.monto) ||
          0,
        motivo: solicitud.motivo || notaRelacionada?.motivo || "Sin motivo",
        observaciones:
          solicitud.observaciones || notaRelacionada?.observaciones || "",
        fechaTexto:
          solicitud.fecha ||
          formatearFechaNotaCredito(
            solicitud.anuladaAt ||
              solicitud.resolvedAt ||
              solicitud.createdAt ||
              notaRelacionada?.fecha_anulacion ||
              notaRelacionada?.fecha,
          ),
        fechaOrden:
          solicitud.anuladaAt ||
          solicitud.resolvedAt ||
          solicitud.createdAt ||
          notaRelacionada?.fecha_anulacion ||
          notaRelacionada?.fecha,
        solicitado_por_nombre:
          solicitud.solicitado_por_nombre || "ADMIN",
        aplicado_por:
          notaRelacionada?.aplicado_por || solicitud.resolvedBy || "SU",
        esDirecta: false,
      };
    }).filter(Boolean);

    const historialDirectas = notasAplicadas
      .filter((nota) => !notasUsadas.has(nota.id_nota))
      .map((nota) => ({
        ...nota,
        tipo_historial: "NOTA_DIRECTA",
        estatus_historial:
          nota.cancelada || ["Anulada", "Cancelada"].includes(nota.estado)
            ? "Anulada"
            : "Autorizada",
        fechaTexto: formatearFechaNotaCredito(nota.fecha_anulacion || nota.fecha),
        fechaOrden: nota.fecha_anulacion || nota.fecha,
        monto: Number(nota.monto) || 0,
        motivo: nota.motivo || "Sin motivo",
        aplicado_por: nota.aplicado_por || "SU",
        esDirecta: true,
      }));

    return [...historialSolicitudes, ...historialDirectas].sort(
      (primera, segunda) =>
        obtenerTiempoItemNota(segunda.fechaOrden ? { ...segunda, fecha: segunda.fechaOrden } : segunda) -
        obtenerTiempoItemNota(primera.fechaOrden ? { ...primera, fecha: primera.fechaOrden } : primera),
    );
  };

  const historialNotasCredito = obtenerHistorialNotasCredito(
    facturaSeleccionada || {},
  );

  const totalPaginasNotas = Math.max(
    1,
    Math.ceil(historialNotasCredito.length / registrosPorPaginaNotas),
  );

  const historialNotasPaginado = historialNotasCredito.slice(
    (paginaHistorialNotas - 1) * registrosPorPaginaNotas,
    paginaHistorialNotas * registrosPorPaginaNotas,
  );

  const historialAbonosOrdenado = Array.isArray(facturaSeleccionada?.abonos)
    ? [...facturaSeleccionada.abonos].sort(
        (primero, segundo) =>
          obtenerTiempoAbono(segundo) - obtenerTiempoAbono(primero),
      )
    : [];

  const totalPaginasAbonos = Math.max(
    1,
    Math.ceil(historialAbonosOrdenado.length / registrosPorPaginaAbonos),
  );

  const historialAbonosPaginado = historialAbonosOrdenado.slice(
    (paginaHistorialAbonos - 1) * registrosPorPaginaAbonos,
    paginaHistorialAbonos * registrosPorPaginaAbonos,
  );

  const handleAplicarNotaCredito = async () => {
    if (isSubmitting) return;

    const monto = Number(notaCreditoForm.monto);
    const saldoActual = Number(facturaSeleccionada?.saldo_pendiente) || 0;

    if (!Number.isFinite(monto) || monto <= 0) {
      mostrarNotificacion(
        "Monto inválido",
        "Ingresa un monto mayor a cero.",
        "error",
      );
      return;
    }

    if (monto > saldoActual) {
      mostrarNotificacion(
        "Monto excedido",
        "La nota de crédito no puede superar el saldo pendiente.",
        "error",
      );
      return;
    }

    if (!notaCreditoForm.motivo.trim()) {
      mostrarNotificacion(
        "Motivo requerido",
        "Ingresa el motivo de la nota de crédito.",
        "error",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const respuesta =
        userRole === "SU"
          ? await aplicarNotaCreditoEnNube(
              facturaSeleccionada,
              monto,
              notaCreditoForm.motivo,
              notaCreditoForm.observaciones,
            )
          : await solicitarNotaCreditoEnNube(
              facturaSeleccionada,
              monto,
              notaCreditoForm.motivo,
              notaCreditoForm.observaciones,
            );

      if (!respuesta?.success) {
        mostrarNotificacion(
          "Error",
          respuesta?.error ||
            (userRole === "SU"
              ? "No se pudo aplicar la nota de crédito."
              : "No se pudo solicitar la nota de crédito."),
          "error",
        );
        return;
      }

      await recargarFacturas();
      setNotaCreditoForm({ monto: "", motivo: "", observaciones: "" });
      setFacturaSeleccionada(null);

      mostrarNotificacion(
        userRole === "SU" ? "Nota de crédito aplicada" : "Solicitud enviada",
        userRole === "SU"
          ? "Se redujo el saldo de la factura, el saldo del cliente y la cartera correspondiente. No se registró como ingreso."
          : "La solicitud de nota de crédito quedó pendiente de autorización del SU.",
      );
    } catch (error) {
      console.error("Error procesando nota de crédito:", error);
      mostrarNotificacion(
        "Error",
        "Ocurrió un error inesperado al procesar la nota de crédito.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelarNotaCredito = async () => {
    if (isSubmitting) return;

    if (userRole !== "SU") {
      mostrarNotificacion(
        "Acción no permitida",
        "Solo el SU puede cancelar notas de crédito.",
        "error",
      );
      return;
    }

    if (!facturaSeleccionada?.id || !notaCreditoACancelar?.id_nota) {
      mostrarNotificacion(
        "Error",
        "No se identificó la factura o la nota de crédito.",
        "error",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const respuesta = await cancelarNotaCreditoEnNube(
        facturaSeleccionada,
        notaCreditoACancelar.id_nota,
        "Cancelación manual desde gestión de factura",
      );

      if (!respuesta?.success) {
        mostrarNotificacion(
          "Error",
          respuesta?.error || "No se pudo cancelar la nota de crédito.",
          "error",
        );
        return;
      }

      await recargarFacturas();
      setNotaCreditoACancelar(null);
      setFacturaSeleccionada(null);

      mostrarNotificacion(
        "Nota de crédito anulada",
        "Se restauró el saldo y la nota quedó marcada como anulada en el historial.",
      );
    } catch (error) {
      console.error("Error anulando nota de crédito:", error);
      mostrarNotificacion(
        "Error",
        "Ocurrió un error inesperado al anular la nota de crédito.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmarEliminacion = (tipo, data) => {
    setItemAEliminar({ tipo, data });
    setModalActivo("confirmarEliminar");
  };

  const ejecutarEliminacion = async () => {
    if (!itemAEliminar || isSubmitting) return;

    setIsSubmitting(true);

    try {
      if (itemAEliminar.tipo === "factura") {
        if (userRole !== "SU") {
          mostrarNotificacion(
            "Acción no permitida",
            "Solo el SU puede cancelar facturas.",
            "error",
          );
          return;
        }

        const res = await eliminarFacturaEnNube(itemAEliminar.data.id);

        if (!res?.success) {
          mostrarNotificacion(
            "Error",
            res?.error || "No se pudo cancelar la factura.",
            "error",
          );
          return;
        }

        await recargarFacturas();

        setFacturaSeleccionada(null);

        mostrarNotificacion(
          "Factura cancelada",
          "Se canceló (archivó) la factura y se ajustaron saldo, crédito, métricas y auditoría.",
        );
      } else if (itemAEliminar.tipo === "abono") {
        const res = await eliminarAbonoEnNube(
          facturaSeleccionada.id,
          itemAEliminar.data.id_abono,
        );

        if (!res?.success) {
          mostrarNotificacion(
            "Error",
            res?.error || "No se pudo anular el abono.",
            "error",
          );
          return;
        }

        await recargarFacturas();

        mostrarNotificacion(
          "Pago anulado",
          "Abono revertido. La deuda regresó al saldo del cliente.",
        );
      }
    } catch (error) {
      console.error(error);
      mostrarNotificacion("Error", "Ocurrió un error inesperado.", "error");
    } finally {
      setIsSubmitting(false);
      setItemAEliminar(null);
    }
  };

  const handleMontoPago = (e) => {
    const valor = parseFloat(e.target.value);
    const maximo = facturaSeleccionada?.saldo_pendiente || 0;
    if (valor > maximo) setPagoForm({ ...pagoForm, monto: maximo });
    else setPagoForm({ ...pagoForm, monto: e.target.value });
  };

  const enviarWhatsApp = () => {
    if (!datosWhatsapp.telefono) {
      mostrarNotificacion(
        "Teléfono requerido",
        "Ingresa un número de teléfono para continuar.",
        "error",
      );
      return;
    }

    const numeroLimpio = normalizarTelefonoMX(datosWhatsapp.telefono);

    if (!numeroLimpio.startsWith("52") || numeroLimpio.length !== 12) {
      mostrarNotificacion(
        "Teléfono inválido",
        "Revisa que el número mexicano tenga 10 dígitos.",
        "error",
      );
      return;
    }

    const url = `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(
      datosWhatsapp.mensaje,
    )}`;

    window.open(url, "_blank", "noopener,noreferrer");
    setModalActivo("opcionesFactura");
  };


const BadgeEstatus = ({ factura }) => {
  const esCancelada = esFacturaCancelada(factura);
  const esPagada = esFacturaPagada(factura);
  const esVencida = esFacturaVencida(factura);

  let estatus = "Pendiente";

  if (esCancelada) estatus = "Cancelada";
  else if (esPagada) estatus = "Pagada";
  else if (esVencida) estatus = "Vencida";

  const configs = {
    Pagada: "bg-green-100 text-green-800 border-green-200",
    Pendiente: "bg-blue-100 text-blue-800 border-blue-200",
    Vencida: "bg-red-100 text-red-800 border-red-200",
    Cancelada: "bg-slate-100 text-slate-500 border-slate-200",
  };

  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap ${
        configs[estatus] || "bg-gray-100 text-gray-800"
      }`}
    >
      {estatus}
    </span>
  );
};

  return (
    <div className="flex flex-col space-y-4 md:space-y-6 relative pb-10 text-sm animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mt-2 md:mt-4 gap-4">
        <div className="w-full md:w-auto">
          <h1 className="text-xl md:text-2xl font-bold text-[#0a192f] flex items-center">
            <FileText className="h-5 w-5 md:h-6 md:w-6 mr-2 text-blue-600" />{" "}
            Facturación y Cobranza
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1">
            Control integral de facturas emitidas, saldos pendientes y pagos con
            carga paginada y operaciones seguras.
          </p>
        </div>
        <button
          onClick={() => abrirFormulario("nuevaFactura")}
          className="w-full md:w-auto px-5 py-3 md:py-2.5 bg-[#0a192f] text-white font-bold text-sm rounded-xl md:rounded-lg active:bg-[#1a2b45] hover:bg-[#1a2b45] flex items-center justify-center shadow-md transition-all"
        >
          <Plus className="h-4 w-4 mr-2" /> Capturar Factura
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <TarjetaResumenFacturacion
          etiqueta="Deuda activa"
          valor={`$${kpis.deuda_activa.toLocaleString("es-MX")}`}
          descripcion="Saldo total pendiente actualmente colocado."
          icono={DollarSign}
          variante="azul"
        />

        <TarjetaResumenFacturacion
          etiqueta="Saldo vencido"
          valor={`$${kpis.monto_vencido.toLocaleString("es-MX")}`}
          descripcion="Cartera vencida que requiere seguimiento."
          icono={AlertTriangle}
          variante="rojo"
        />

        <TarjetaResumenFacturacion
          etiqueta="Total liquidado"
          valor={`$${(Number(kpis.total_liquidado) || 0).toLocaleString("es-MX")}`}
          descripcion="Facturas cerradas mediante pagos registrados."
          icono={TrendingUp}
          variante="verde"
        />
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
          <div className="relative w-full md:max-w-xl">
            <div className="flex w-full">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 md:h-4 md:w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Escribe un cliente o el inicio del folio..."
                  value={busqueda}
                  onChange={(e) => handleCambioBusqueda(e.target.value)}
                  onFocus={() =>
                    setMostrarSugerencias(
                      busqueda.trim().length >= 2 && !clienteBusqueda,
                    )
                  }
                  onBlur={() =>
                    window.setTimeout(() => setMostrarSugerencias(false), 150)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !clienteBusqueda) {
                      e.preventDefault();
                      buscarPorFolio();
                    }
                  }}
                  className="w-full pl-10 pr-10 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-l-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                />

                {(busqueda || clienteBusqueda) && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={limpiarBusquedaCompleta}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-500 rounded"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={buscarPorFolio}
                disabled={Boolean(clienteBusqueda)}
                className="px-4 py-2.5 bg-[#0a192f] text-white text-xs font-black rounded-r-lg hover:bg-[#112240] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center shrink-0"
                title={
                  clienteBusqueda
                    ? "Quita el cliente seleccionado para buscar por folio"
                    : "Buscar folio por inicio"
                }
              >
                <Search className="h-4 w-4 mr-1.5" />
                Buscar
              </button>
            </div>

            {clienteBusqueda && (
              <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-700">
                <UserRound className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{clienteBusqueda.nombre}</span>
                <button
                  type="button"
                  onClick={limpiarBusquedaCompleta}
                  className="text-blue-400 hover:text-red-500"
                  aria-label="Quitar cliente seleccionado"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {mostrarSugerencias && !clienteBusqueda && (
              <div className="absolute left-0 right-0 top-full mt-2 z-30 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                {clientesSugeridos.length > 0 ? (
                  <>
                    <p className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gray-400 bg-gray-50 border-b">
                      Clientes encontrados
                    </p>
                    {clientesSugeridos.map((cliente) => (
                      <button
                        key={cliente.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => seleccionarClienteBusqueda(cliente)}
                        className="w-full px-3 py-2.5 text-left hover:bg-blue-50 border-b border-gray-50 last:border-0 flex items-center gap-3"
                      >
                        <UserRound className="h-4 w-4 text-blue-500 shrink-0" />
                        <span className="min-w-0">
                          <span className="block text-xs font-bold text-[#0a192f] truncate">
                            {cliente.nombre}
                          </span>
                          <span className="block text-[10px] text-gray-400 truncate">
                            {cliente.numero_cliente || "Sin número"}
                            {cliente.rfc ? ` • ${cliente.rfc}` : ""}
                          </span>
                        </span>
                      </button>
                    ))}
                  </>
                ) : (
                  <p className="px-3 py-3 text-xs text-gray-500">
                    No hay clientes coincidentes. Puedes buscar el texto como
                    inicio de folio.
                  </p>
                )}

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={buscarPorFolio}
                  className="w-full px-3 py-3 bg-gray-50 text-left text-xs font-bold text-blue-700 hover:bg-blue-50 flex items-center"
                >
                  <Hash className="h-4 w-4 mr-2" />
                  Buscar folios que comiencen con “
                  {busqueda.trim().toUpperCase()}”
                </button>
              </div>
            )}

            <p className="mt-2 text-[10px] text-gray-400 leading-relaxed">
              Selecciona un cliente sugerido sin escribir su nombre completo, o
              escribe el inicio del folio y presiona Enter.
            </p>
          </div>
          <div className="flex overflow-x-auto hide-scrollbar-mobile w-full md:w-auto bg-gray-50 p-1.5 md:p-1 rounded-xl md:rounded-lg border border-gray-200 gap-1 md:gap-0 shrink-0">
            {[
              { value: "Todas", label: "Todas" },
              { value: "Pendiente", label: "Pendientes" },
              { value: "Vencida", label: "Vencidas" },
              { value: "Pagada", label: "Pagadas" },
              ...(userRole === "SU" ? [{ value: "Cancelada", label: "Canceladas" }] : []),
            ].map((opcion) => (
              <button
                key={opcion.value}
                onClick={() => {
                  setFiltroEstatus(opcion.value);
                  moverAInicioTabla();
                }}
                className={`whitespace-nowrap px-4 py-2 md:py-1.5 text-xs font-bold rounded-lg md:rounded-md transition-colors flex-1 md:flex-none ${filtroEstatus === opcion.value ? "bg-white text-[#0a192f] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                {opcion.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-t border-gray-50 pt-4 md:pt-3">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Calendar className="h-4 w-4 md:h-4 md:w-4 text-gray-400 hidden sm:block" />
            <span className="text-[10px] md:text-xs font-bold text-gray-500 uppercase w-12 sm:w-auto">
              Desde:
            </span>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => {
                setFechaInicio(e.target.value);
                moverAInicioTabla();
              }}
              className="flex-1 sm:flex-none px-3 md:px-2 py-2.5 md:py-1.5 border border-gray-200 rounded-lg md:rounded text-xs focus:ring-2 focus:ring-blue-500 text-gray-600 outline-none"
            />
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-[10px] md:text-xs font-bold text-gray-500 uppercase w-12 sm:w-auto">
              Hasta:
            </span>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => {
                setFechaFin(e.target.value);
                moverAInicioTabla();
              }}
              className="flex-1 sm:flex-none px-3 md:px-2 py-2.5 md:py-1.5 border border-gray-200 rounded-lg md:rounded text-xs focus:ring-2 focus:ring-blue-500 text-gray-600 outline-none"
            />
          </div>
          {(fechaInicio ||
            fechaFin ||
            busqueda ||
            clienteBusqueda ||
            filtroEstatus !== "Todas") && (
            <button
              onClick={limpiarTodosLosFiltros}
              className="flex items-center justify-center px-4 md:px-3 py-3 md:py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors w-full sm:w-auto mt-2 sm:mt-0"
            >
              <FilterX className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1.5 md:mr-1" />{" "}
              Limpiar Filtros
            </button>
          )}

          <button
            type="button"
            onClick={recargarFacturas}
            disabled={cargandoFacturas}
            className="flex items-center justify-center px-4 md:px-3 py-3 md:py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors w-full sm:w-auto mt-2 sm:mt-0"
          >
            {cargandoFacturas ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1.5" />
            )}
            Actualizar
          </button>
        </div>

        {(mensajeFacturas || errorFacturas) && (
          <div
            className={`rounded-lg border px-3 py-2 text-xs font-medium ${
              errorFacturas
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {errorFacturas || mensajeFacturas}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col flex-1 overflow-hidden">
        <div
          ref={contenedorTablaRef}
          className="overflow-y-auto max-h-[calc(100dvh-280px)] pb-20 custom-scrollbar w-full md:max-h-[calc(100vh-350px)]"
        >
          <div className="space-y-3 p-3 md:hidden">
            {cargandoFacturas ? (
              Array.from({ length: 5 }).map((_, indice) => (
                <article
                  key={`factura-mobile-skeleton-${indice}`}
                  className="animate-pulse rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
                >
                  <div className="h-4 w-32 rounded bg-gray-100" />
                  <div className="mt-2 h-3 w-48 rounded bg-gray-100" />
                  <div className="mt-3 grid grid-cols-3 gap-1.5">
                    <div className="h-14 rounded-lg bg-gray-100" />
                    <div className="h-14 rounded-lg bg-gray-100" />
                    <div className="h-14 rounded-lg bg-gray-100" />
                  </div>
                </article>
              ))
            ) : errorFacturas ? (
              <div className="rounded-xl border border-red-100 bg-red-50 p-5 text-center text-red-700">
                <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-red-300" />
                <p className="text-xs font-black">No se pudieron cargar las facturas.</p>
                <p className="mt-1 text-[11px] font-semibold">{errorFacturas}</p>
              </div>
            ) : facturasPaginadas.length > 0 ? (
              facturasPaginadas.map((fac) => {
                const montoTotal = Number(fac.monto_total) || 0;
                const saldoPendiente = Number(fac.saldo_pendiente) || 0;
                const totalNotas = obtenerTotalNotasCredito(fac);
                const ultimoAbono = obtenerUltimoAbono(fac);
                
                const esCancelada = esFacturaCancelada(fac);
                const esVencida = esFacturaVencida(fac);

                return (
                  <article
                    key={fac.id}
                    className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
  <div className="min-w-0 flex-1">
    <h3 className="truncate text-sm font-black text-[#0a192f]">
      {fac.folio || "Sin folio"}
    </h3>

    <p className="mt-0.5 truncate text-xs font-semibold text-gray-600">
      {fac.cliente_nombre || fac.cliente || "Cliente sin nombre"}
    </p>
  </div>

  <div className="shrink-0 text-right">
    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
      Vence
    </p>

    <p className="text-xs font-black text-gray-700">
  {fac.vencimiento || "S/F"}
</p>
  </div>
</div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <BadgeEstatus factura={fac} />
                      {esVencida && (
                        <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[9px] font-black text-red-700">
                          Hace {calcularDiasVencidos(fac.vencimiento)} días
                        </span>
                      )} 
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-1.5">
                      <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-2 min-w-0">
                        <p className="text-[7px] font-black uppercase tracking-wide text-blue-400">
                          Total
                        </p>
                        <p className="mt-0.5 break-words text-[11px] font-black text-[#0a192f]">
                          ${montoTotal.toLocaleString("es-MX")}
                        </p>
                      </div>

                      <div className="rounded-lg border border-green-100 bg-green-50/60 p-2 min-w-0">
  <p className="text-[7px] font-black uppercase tracking-wide text-green-500">
    Último pago
  </p>

  <p className="mt-0.5 break-words text-[11px] font-black text-green-600">
  $
  {ultimoAbono
    ? Number(ultimoAbono.monto || 0).toLocaleString("es-MX")
    : "0"}
</p>

<p className="text-[9px] text-gray-500">
  {ultimoAbono?.fecha
  ? formatearFechaAbono(ultimoAbono.fecha).split(",")[0]
  : "Sin pagos"}
</p>
</div>

                      <div className="rounded-lg border border-red-100 bg-red-50/60 p-2 min-w-0">
                        <p className="text-[7px] font-black uppercase tracking-wide text-red-400">
                          Saldo
                        </p>
                        <p
                          className={`mt-0.5 break-words text-[11px] font-black ${
                            saldoPendiente > 0
                              ? esVencida
                                ? "text-red-600"
                                : "text-[#0a192f]"
                              : "text-green-600"
                          }`}
                        >
                          ${saldoPendiente.toLocaleString("es-MX")}
                        </p>
                      </div>

                      <div className="rounded-lg border border-purple-100 bg-purple-50/60 p-2 min-w-0">
                        <p className="text-[7px] font-black uppercase tracking-wide text-purple-400">
                          Notas crédito
                        </p>
                        <p className="mt-0.5 break-words text-[11px] font-black text-purple-700">
                          ${totalNotas.toLocaleString("es-MX")}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-gray-100 bg-gray-50 p-2 text-[10px]">
                      <div>
                        <p className="font-black uppercase tracking-wide text-gray-400">Emisión</p>
                        <p className="mt-0.5 font-mono font-bold text-gray-700">{fac.emision || "S/F"}</p>
                      </div>
                      <div>
                        <p className="font-black uppercase tracking-wide text-gray-400">Vence</p>
                        <p className={`mt-0.5 font-mono font-black ${esVencida ? "text-red-600" : "text-[#0a192f]"}`}>
                          {fac.vencimiento || "S/F"}
                        </p>
                      </div>
                    </div>

                    {!esCancelada ? (
                      <button
                        type="button"
                        onClick={() => abrirMenuOpciones(fac)}
                        className="mt-3 flex w-full items-center justify-center rounded-lg bg-[#0a192f] py-2 text-[10px] font-black text-white active:bg-[#112240]"
                      >
                        Gestionar factura
                        <MoreVertical className="ml-1 h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <div className="mt-3 flex w-full items-center justify-center rounded-lg bg-gray-100 py-2 text-[10px] font-black text-gray-400 uppercase">
                        Factura Archivada
                      </div>
                    )}
                  </article>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-gray-400">
                <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-xs font-bold uppercase tracking-wider">
                  No se encontraron facturas con los filtros seleccionados.
                </p>
              </div>
            )}
          </div>

          <div className="hidden md:block">
            <table className="w-full min-w-[1000px] text-left text-sm border-separate border-spacing-0">
            <thead className="bg-[#0a192f] text-white uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 border-b border-gray-200 whitespace-nowrap">
                  Folio / Cliente
                </th>
                <th className="px-4 py-3 text-center border-b border-gray-200 whitespace-nowrap">
                  Fechas
                </th>
                <th className="px-4 py-3 text-right border-b border-gray-200 whitespace-nowrap">
                  Monto Total
                </th>
                <th className="px-4 py-3 text-right border-b border-gray-200 whitespace-nowrap">
                  Último pago
                </th>
                <th className="px-4 py-3 text-right border-b border-gray-200 whitespace-nowrap">
                  Restante
                </th>
                <th className="px-4 py-3 text-center border-b border-gray-200 whitespace-nowrap">
                  Estado
                </th>
                <th className="px-4 py-3 text-center border-b border-gray-200 whitespace-nowrap">
                  Gestión
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {cargandoFacturas ? (
                Array.from({ length: 6 }).map((_, indice) => (
                  <tr key={`skeleton-${indice}`} className="animate-pulse">
                    {Array.from({ length: 7 }).map((__, columna) => (
                      <td
                        key={`skeleton-${indice}-${columna}`}
                        className="px-4 py-4 bg-white"
                      >
                        <div className="h-4 bg-gray-100 rounded w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : errorFacturas ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-10 text-center text-red-600 bg-red-50/30"
                  >
                    <AlertTriangle className="h-10 w-10 mx-auto mb-2 text-red-300" />
                    <p className="font-bold">
                      No se pudieron cargar las facturas.
                    </p>
                    <p className="text-xs mt-1">{errorFacturas}</p>
                  </td>
                </tr>
              ) : facturasPaginadas.length > 0 ? (
                facturasPaginadas.map((fac) => {
  const montoTotal = Number(fac.monto_total) || 0;
  const saldoPendiente = Number(fac.saldo_pendiente) || 0;
  const ultimoAbono = obtenerUltimoAbono(fac);

  const esCancelada = esFacturaCancelada(fac);
  const esVencida = esFacturaVencida(fac);

  return (
                    <tr
                      key={fac.id}
                      className="hover:bg-blue-50/30 active:bg-blue-50/50 transition-colors group"
                    >
                      <td
                        className={`px-4 py-4 md:py-3 bg-white ${!esCancelada ? 'cursor-pointer' : ''}`}
                        onClick={() => !esCancelada && abrirMenuOpciones(fac)}
                      >
                        <div className="flex flex-col">
                          <span className={`font-black text-base ${esCancelada ? 'text-gray-400' : 'text-[#0a192f]'}`}>
                            {fac.folio}
                          </span>
                          <span
                            className={`${esCancelada ? 'text-gray-400' : 'text-gray-600'} font-medium truncate max-w-[200px]`}
                            title={fac.cliente}
                          >
                            {fac.cliente}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 md:py-3 text-center text-xs text-gray-500 bg-white whitespace-nowrap">
                        <p>
                          Emisión:{" "}
                          <span className="font-mono">{fac.emision}</span>
                        </p>
                        <p className="mt-0.5 font-bold text-gray-700">
                          Vence:{" "}
                          <span className="font-mono">{fac.vencimiento}</span>
                        </p>
                        {esVencida && (
                          <span className="block text-[11px] font-black text-red-500 mt-0.5">
                            (Hace {calcularDiasVencidos(fac.vencimiento)} días)
                          </span>
                        )}
                      </td>
                      <td className={`px-4 py-4 md:py-3 text-right font-semibold bg-white whitespace-nowrap ${esCancelada ? 'text-gray-400' : 'text-gray-700'}`}>
                        ${montoTotal.toLocaleString("es-MX")}
                      </td>
                      <td
  className={`px-4 py-4 md:py-3 text-right bg-white whitespace-nowrap ${
    esCancelada ? "text-gray-400" : "text-green-600"
  }`}
>
  <div className="flex flex-col items-end">
    <span className="font-semibold">
      $
      {ultimoAbono
        ? Number(ultimoAbono.monto || 0).toLocaleString("es-MX")
        : "0"}
    </span>

    <span className="text-[11px] text-gray-500">
      {ultimoAbono?.fecha
  ? formatearFechaAbono(ultimoAbono.fecha).split(",")[0]
  : "Sin pagos"}
    </span>
  </div>
</td>
                      <td className="px-4 py-4 md:py-3 text-right bg-white whitespace-nowrap">
                        <span
                          className={`text-base font-black ${
                            esCancelada 
                              ? "text-gray-400"
                              : saldoPendiente > 0
                                ? esVencida
                                  ? "text-red-600"
                                  : "text-[#0a192f]"
                                : "text-green-600"
                          }`}
                        >
                          ${saldoPendiente.toLocaleString("es-MX")}
                        </span>
                      </td>
                      <td className="px-4 py-4 md:py-3 text-center bg-white">
                        <BadgeEstatus factura={fac} />
                      </td>
                      <td className="px-4 py-4 md:py-3 text-center bg-white">
                        {!esCancelada ? (
                          <button
                            onClick={() => abrirMenuOpciones(fac)}
                            className="p-3 md:p-1.5 text-gray-400 active:text-blue-600 hover:text-blue-600 active:bg-blue-50 hover:bg-blue-50 rounded-full md:rounded-lg transition-colors border border-transparent"
                            title="Ver Opciones"
                          >
                            <MoreVertical className="h-5 w-5 md:h-5 md:w-5 mx-auto" />
                          </button>
                        ) : (
                          <span className="text-[9px] font-black uppercase text-gray-400">Archivada</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-10 text-center text-gray-400 bg-white"
                  >
                    <FileText className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p>
                      No se encontraron facturas con los filtros seleccionados.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
            </table>
          </div>
        </div>

        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
          <PaginacionGlobal
            modoCursor
            mostrarSiempre
            pagina={paginaActualFacturas}
            hayAnterior={hayAnterior}
            haySiguiente={haySiguiente}
            cargando={cargandoFacturas}
            registrosEnPagina={facturasPaginadas.length}
            etiquetaTotal="facturas"
            etiquetaPagina="Facturas por página"
            textoMostrando={
              cargandoFacturas
                ? "Consultando facturas..."
                : `Mostrando ${facturasPaginadas.length} factura(s) en esta página`
            }
            scrollTargetRef={contenedorTablaRef}
            onAnterior={paginaAnterior}
            onSiguiente={siguientePagina}
            className="mt-0"
          />
        </div>
      </div>

      {modalActivo && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm md:items-center md:p-4">
          {modalActivo === "opcionesFactura" && (
            <div className="flex max-h-[92dvh] w-full max-w-sm flex-col overflow-hidden rounded-t-3xl bg-white pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-slide-up md:m-0 md:rounded-xl md:pb-0 md:animate-zoom-in">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden shrink-0"></div>
              <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-white md:bg-gray-50 shrink-0">
                <h2 className="text-sm font-black text-[#0a192f]">
                  Gestión de Factura
                </h2>
                <button
                  onClick={cerrarModal}
                  className="text-gray-400 active:text-red-500 bg-gray-50 md:bg-transparent rounded-full p-1 md:p-0"
                >
                  <XCircle className="h-6 w-6 md:h-5 md:w-5" />
                </button>
              </div>
              <div className="p-5 text-center border-b border-gray-100 bg-white">
                <p className="text-2xl font-black text-[#0a192f] font-mono">
                  {facturaSeleccionada?.folio}
                </p>
                <p className="text-sm font-bold text-gray-600 mt-1">
                  {facturaSeleccionada?.cliente}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Saldo Actual:{" "}
                  <span className="font-black text-[#0a192f] text-sm">
                    $
                    {facturaSeleccionada?.saldo_pendiente.toLocaleString(
                      "es-MX",
                    )}
                  </span>
                </p>
              </div>
              <div className="p-5 md:p-4 space-y-3 md:space-y-2 bg-gray-50/50 overflow-y-auto custom-scrollbar">
                      {facturaSeleccionada?.estatus !== "Cancelada" &&
facturaSeleccionada?.saldo_pendiente > 0 &&(                  
                        <button
                    onClick={() => abrirFormulario("nuevoPago")}
                    className="w-full p-3.5 md:p-3 bg-green-600 text-white active:bg-green-700 hover:bg-green-700 rounded-xl md:rounded-lg flex items-center justify-center font-black text-sm shadow-sm transition-colors"
                  >
                    <CreditCard className="h-4 w-4 md:h-4 md:w-4 mr-2" />{" "}
                    Registrar Pago / Abono
                  </button>
                )}
                <button
                  onClick={() => abrirFormulario("historialPagos")}
                  className="w-full p-3.5 md:p-3 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl md:rounded-lg flex items-center justify-center font-bold text-sm transition-colors"
                >
                  <Clock className="h-4 w-4 md:h-4 md:w-4 mr-2" /> Historial de
                  Abonos ({facturaSeleccionada?.abonos?.length || 0})
                </button>
                <button
                  onClick={() => abrirFormulario("historialNotasCredito")}
                  className="w-full p-3.5 md:p-3 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-xl md:rounded-lg flex items-center justify-center font-bold text-sm transition-colors"
                >
                  <FileText className="h-4 w-4 md:h-4 md:w-4 mr-2" /> Historial
                  de Notas ({obtenerHistorialNotasCredito(facturaSeleccionada).length})
                </button>
                {["SU", "ADMIN"].includes(userRole) &&
facturaSeleccionada?.estatus !== "Cancelada" &&
Number(facturaSeleccionada?.saldo_pendiente) > 0&& (
                    <button
                      onClick={() => abrirFormulario("notaCredito")}
                      className="w-full p-3.5 md:p-3 bg-purple-600 text-white active:bg-purple-700 hover:bg-purple-700 rounded-xl md:rounded-lg flex items-center justify-center font-black text-sm shadow-sm transition-colors"
                    >
                      <DollarSign className="h-4 w-4 md:h-4 md:w-4 mr-2" />
                      {userRole === "SU"
                        ? "Aplicar nota de crédito"
                        : "Solicitar nota de crédito"}
                    </button>
                  )}
                <button
                  onClick={() => abrirFormulario("whatsapp")}
                  className="w-full p-3.5 md:p-3 bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-xl md:rounded-lg flex items-center justify-center font-bold text-sm transition-colors"
                >
                  <MessageSquare className="h-4 w-4 md:h-4 md:w-4 mr-2 text-green-600" />{" "}
                  Enviar Aviso WhatsApp
                </button>
                <div
                  className={`mt-4 pt-4 border-t border-gray-200 grid gap-3 md:gap-2 ${
                    userRole === "SU" ? "grid-cols-2" : "grid-cols-1"
                  }`}
                >
                  {facturaSeleccionada?.estatus !== "Cancelada"&& (
  <button
    type="button"
    onClick={() => abrirFormulario("editarFactura")}
    className="p-3 md:p-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl md:rounded-lg flex flex-col items-center justify-center font-bold text-xs hover:bg-amber-100 active:bg-amber-100 transition-colors"
  >
    <Edit className="h-5 w-5 md:h-4 md:w-4 mb-1" />
    Editar
  </button>
)}
                  {userRole === "SU" &&
facturaSeleccionada?.estatus !== "Cancelada"&& (
  <button
    type="button"
    onClick={() =>
      confirmarEliminacion("factura", facturaSeleccionada)
    }
    className="p-3 md:p-2 bg-red-50 text-red-700 border border-red-200 rounded-xl md:rounded-lg flex flex-col items-center justify-center font-bold text-xs hover:bg-red-100 active:bg-red-100 transition-colors"
  >
    <Trash2 className="h-5 w-5 md:h-4 md:w-4 mb-1" />
    Cancelar
  </button>
)}
                </div>
              </div>
            </div>
          )}

          {modalActivo === "notaCredito" && (
            <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-slide-up md:m-0 md:rounded-xl md:pb-0 md:animate-zoom-in">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden shrink-0" />
              <div className="p-4 border-b border-gray-100 bg-white md:bg-purple-50 flex justify-between items-center shrink-0">
                <h2 className="text-sm md:text-base font-black text-purple-800 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />{" "}
                  {userRole === "SU"
                    ? "Aplicar nota de crédito"
                    : "Solicitar nota de crédito"}
                </h2>
                <button
                  onClick={() => setModalActivo("opcionesFactura")}
                  className="text-gray-400 active:text-gray-700 bg-gray-50 md:bg-transparent rounded-full p-1 md:p-0"
                >
                  <XCircle className="h-6 w-6 md:h-5 md:w-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-purple-700">
                    Factura seleccionada
                  </p>
                  <p className="font-mono font-black text-[#0a192f] mt-1">
                    {facturaSeleccionada?.folio}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Saldo disponible para nota:{" "}
                    <strong>
                      $
                      {(
                        Number(facturaSeleccionada?.saldo_pendiente) || 0
                      ).toLocaleString("es-MX")}
                    </strong>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                    Monto de la nota <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={notaCreditoForm.monto}
                    onChange={handleMontoNotaCredito}
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 text-sm font-black text-[#0a192f]"
                    placeholder="Ej. 500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                    Motivo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={notaCreditoForm.motivo}
                    onChange={(event) =>
                      setNotaCreditoForm((previo) => ({
                        ...previo,
                        motivo: event.target.value,
                      }))
                    }
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 text-sm"
                    placeholder="Ej. Descuento autorizado"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                    Observaciones
                  </label>
                  <textarea
                    value={notaCreditoForm.observaciones}
                    onChange={(event) =>
                      setNotaCreditoForm((previo) => ({
                        ...previo,
                        observaciones: event.target.value,
                      }))
                    }
                    rows="3"
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 text-sm resize-none"
                    placeholder="Detalle interno de la autorización"
                  />
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 leading-relaxed">
                  {userRole === "SU"
                    ? "Esta operación reduce cartera y saldo pendiente, pero no cuenta como ingreso ni como abono cobrado."
                    : "La solicitud quedará pendiente y solo el SU podrá autorizarla."}
                </div>
              </div>

              <div className="p-4 md:p-3 border-t border-gray-100 bg-white md:bg-gray-50 flex flex-col-reverse md:flex-row justify-end gap-2 shrink-0 md:rounded-b-xl">
                <button
                  onClick={() => setModalActivo("opcionesFactura")}
                  disabled={isSubmitting}
                  className="w-full md:w-auto px-4 py-3 md:py-2 text-sm md:text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-xl md:rounded active:bg-gray-100 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAplicarNotaCredito}
                  disabled={isSubmitting}
                  className="w-full md:w-auto px-4 py-3 md:py-2 text-sm md:text-xs font-black text-white bg-purple-600 rounded-xl md:rounded active:bg-purple-700 disabled:opacity-70 flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {userRole === "SU" ? "Aplicando..." : "Enviando..."}
                    </>
                  ) : userRole === "SU" ? (
                    "Aplicar nota"
                  ) : (
                    "Solicitar nota"
                  )}
                </button>
              </div>
            </div>
          )}

          {modalActivo === "historialNotasCredito" && (
            <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-slide-up md:m-0 md:rounded-xl md:pb-0 md:animate-zoom-in">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden shrink-0" />
              <div className="p-4 border-b border-gray-100 bg-white md:bg-blue-50 flex justify-between items-center shrink-0">
                <h2 className="text-sm md:text-base font-black text-blue-800 flex items-center">
                  <FileText className="h-5 w-5 mr-2" /> Historial de notas
                </h2>
                <button
                  onClick={() => setModalActivo("opcionesFactura")}
                  className="text-gray-400 active:text-gray-700 bg-gray-50 md:bg-transparent rounded-full p-1 md:p-0"
                  aria-label="Cerrar historial de notas"
                >
                  <XCircle className="h-6 w-6 md:h-5 md:w-5" />
                </button>
              </div>

              <div ref={historialNotasRef} className="p-3 flex-1 overflow-y-auto custom-scrollbar space-y-3">
                {historialNotasCredito.length > 0 ? (
                  <>
                    {historialNotasPaginado.map((nota) => {
                      const estatus = normalizarEstatusNotaCredito(
                        nota.estatus_historial,
                      );
                      const estilosNota = obtenerEstiloNotaCredito(estatus);
                      const esPendiente = estatus === "Pendiente";
                      const esRechazada = estatus === "Rechazada";
                      const esAutorizada = estatus === "Autorizada";
                      const esAnulada = estatus === "Anulada";

                      return (
                        <article
                          key={`${nota.id || nota.id_nota}-${estatus}`}
                          className={`rounded-2xl border ${estilosNota.borde} ${estilosNota.fondo} p-3.5`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p
                                  className={`text-base font-black ${estilosNota.texto}`}
                                >
                                  $
                                  {(Number(nota.monto) || 0).toLocaleString(
                                    "es-MX",
                                  )}
                                </p>

                                <span
                                  className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase ${estilosNota.etiqueta}`}
                                >
                                  {estatus}
                                </span>
                              </div>

                              <p className="text-xs font-black text-[#0a192f] mt-1">
                                {nota.motivo || "Sin motivo"}
                              </p>
                            </div>

                            <p className="text-[10px] text-gray-500 font-bold text-right shrink-0">
                              {nota.fechaTexto ||
                                formatearFechaNotaCredito(nota.fecha)}
                            </p>
                          </div>

                          <div className="mt-2 space-y-1 text-[11px] text-gray-500">
                            {nota.esDirecta ? (
                              <p>
                                Aplicada directamente por:{" "}
                                <strong>{nota.aplicado_por || "SU"}</strong>
                              </p>
                            ) : (
                              <>
                                <p>
                                  Solicitó:{" "}
                                  <strong>
                                    {nota.solicitado_por_nombre || "ADMIN"}
                                  </strong>
                                </p>

                                {esPendiente ? (
                                  <p className="text-blue-700 font-bold">
                                    En espera de autorización del SU.
                                  </p>
                                ) : (
                                  <p>
                                    Resolvió:{" "}
                                    <strong>
                                      {nota.resolvedBy ||
                                        nota.aplicado_por ||
                                        "SU"}
                                    </strong>
                                  </p>
                                )}
                              </>
                            )}
                          </div>

                          {esRechazada && (
                            <div className="mt-2 bg-red-50 border border-red-100 rounded-xl p-2 text-[11px] text-red-700 leading-relaxed">
                              <strong>Motivo de rechazo:</strong>{" "}
                              {nota.motivo_resolucion ||
                                "El SU rechazó la solicitud sin capturar motivo adicional."}
                            </div>
                          )}

                          {esAnulada && (
                            <div className="mt-2 bg-slate-100 border border-slate-200 rounded-xl p-2 text-[11px] text-slate-700 leading-relaxed">
                              <strong>Nota anulada:</strong>{" "}
                              {nota.motivo_cancelacion ||
                                nota.motivo_anulacion ||
                                "Reversión aplicada por SU."}
                            </div>
                          )}

                          {nota.observaciones && (
                            <p className="text-[11px] text-gray-600 mt-2 bg-white/75 border border-gray-100 rounded-xl p-2 leading-relaxed">
                              {nota.observaciones}
                            </p>
                          )}

                          {esAutorizada && nota.id_nota && userRole === "SU" && (
                            <button
                              type="button"
                              onClick={() => {
                                setNotaCreditoACancelar(nota);
                                setModalActivo("confirmarCancelarNotaCredito");
                              }}
                              className="mt-3 w-full px-3 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs font-black hover:bg-red-100 active:bg-red-100 transition-colors"
                            >
                              Anular / revertir nota
                            </button>
                          )}
                        </article>
                      );
                    })}

                    <PaginacionGlobal
                      pagina={paginaHistorialNotas}
                      totalPaginas={totalPaginasNotas}
                      totalRegistros={historialNotasCredito.length}
                      registrosPorPagina={registrosPorPaginaNotas}
                      registrosEnPagina={historialNotasPaginado.length}
                      etiquetaTotal="notas"
                      scrollTargetRef={historialNotasRef}
                      onCambiarPagina={setPaginaHistorialNotas}
                    />
                  </>
                ) : (
                  <div className="p-10 text-center text-gray-400 rounded-2xl border border-dashed border-gray-200 bg-gray-50/70">
                    <AlertTriangle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-bold uppercase tracking-wider">
                      No hay notas o solicitudes para esta factura.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {modalActivo === "confirmarCancelarNotaCredito" && (
            <div className="flex max-h-[92dvh] w-full max-w-sm flex-col overflow-hidden rounded-t-3xl bg-white pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-slide-up md:m-0 md:rounded-xl md:pb-0 md:animate-zoom-in">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden shrink-0" />
              <div className="p-5 text-center space-y-4">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
                <div>
                  <h2 className="text-base font-black text-[#0a192f]">
                    Eliminar nota de crédito
                  </h2>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    Esta acción revertirá el efecto financiero y conservará la nota
                    como ANULADA dentro del historial de la factura.
                  </p>
                </div>

                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs">
                  <p className="font-black text-red-700">
                    $
                    {(Number(notaCreditoACancelar?.monto) || 0).toLocaleString(
                      "es-MX",
                    )}
                  </p>
                  <p className="text-red-600 mt-1">
                    {notaCreditoACancelar?.motivo || "Sin motivo"}
                  </p>
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col-reverse md:flex-row gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setModalActivo("historialNotasCredito")}
                  className="w-full md:w-auto px-4 py-3 md:py-2 text-sm md:text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-xl md:rounded active:bg-gray-100 disabled:opacity-50"
                >
                  Regresar
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleCancelarNotaCredito}
                  className="w-full md:w-auto px-4 py-3 md:py-2 text-sm md:text-xs font-black text-white bg-red-600 rounded-xl md:rounded active:bg-red-700 disabled:opacity-70 flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    "Sí, anular nota"
                  )}
                </button>
              </div>
            </div>
          )}

          {modalActivo === "whatsapp" && (
            <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-slide-up md:m-0 md:rounded-xl md:pb-0 md:animate-zoom-in">
              <div className="w-12 h-1.5 bg-white/40 rounded-full mx-auto mt-3 md:hidden shrink-0 z-10 absolute left-0 right-0"></div>
              <div className="pt-6 md:pt-4 pb-4 px-4 border-b border-gray-100 bg-[#25D366] text-white flex justify-between items-center shrink-0 relative">
                <h2 className="text-base font-bold flex items-center">
                  <Smartphone className="h-5 w-5 mr-2" /> Gestión vía WhatsApp
                </h2>
                <button
                  onClick={() => setModalActivo("opcionesFactura")}
                  className="text-green-100 hover:text-white transition-colors"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <div className="p-5 flex flex-col md:flex-row gap-5 overflow-y-auto custom-scrollbar">
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase">
                      Cliente a Contactar
                    </label>
                    <p className="font-bold text-[#0a192f] text-sm">
                      {facturaSeleccionada?.cliente}
                    </p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                      Teléfono Destino
                    </label>
                    <input
                      type="text"
                      value={datosWhatsapp.telefono}
                      onChange={(e) =>
                        setDatosWhatsapp({
                          ...datosWhatsapp,
                          telefono: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 md:py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#25D366] font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="flex-[2] space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                      Plantilla de Abordaje
                    </label>
                    <select
                      value={datosWhatsapp.plantilla}
                      onChange={(e) =>
                        setDatosWhatsapp({
                          ...datosWhatsapp,
                          plantilla: e.target.value,
                          mensaje: generarMensajeWA(
                            e.target.value,
                            facturaSeleccionada,
                          ),
                        })
                      }
                      className="w-full px-3 py-2.5 md:py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#25D366] bg-white text-sm font-medium"
                    >
                      <option value="atrasado">Cobro: Saldo Vencido</option>
                      <option value="proximo">
                        Aviso: Vencimiento Próximo
                      </option>
                      <option value="manual">Mensaje Personalizado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                      Vista Previa del Mensaje
                    </label>
                    <textarea
                      value={datosWhatsapp.mensaje}
                      onChange={(e) =>
                        setDatosWhatsapp({
                          ...datosWhatsapp,
                          mensaje: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#25D366] text-xs resize-none"
                      rows="6"
                    ></textarea>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col-reverse md:flex-row justify-end gap-3 shrink-0 md:rounded-b-xl">
                <button
                  onClick={() => setModalActivo("opcionesFactura")}
                  className="w-full md:w-auto px-4 py-3.5 md:py-2 text-xs font-bold text-gray-600 bg-white md:bg-transparent border border-gray-300 md:border-transparent hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Volver a Opciones
                </button>
                <button
                  onClick={enviarWhatsApp}
                  disabled={!datosWhatsapp.telefono}
                  className="w-full md:w-auto px-5 py-3.5 md:py-2 bg-[#25D366] hover:bg-[#1DA851] active:bg-[#1DA851] text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5 mr-2" /> Enviar WhatsApp
                </button>
              </div>
            </div>
          )}

          {(modalActivo === "nuevaFactura" ||
            modalActivo === "editarFactura") && (
            <div className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-slide-up md:m-0 md:rounded-xl md:pb-0 md:animate-zoom-in">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden shrink-0"></div>
              <div className="p-4 md:p-4 border-b border-gray-100 bg-[#0a192f] text-white flex justify-between items-center shrink-0">
                <h2 className="text-base md:text-lg font-bold flex items-center">
                  {modalActivo === "nuevaFactura" ? (
                    <>
                      <FileText className="h-5 w-5 mr-2 text-blue-400" />{" "}
                      Captura de Factura
                    </>
                  ) : (
                    <>
                      <Edit className="h-5 w-5 mr-2 text-amber-400" /> Editar
                      Factura
                    </>
                  )}
                </h2>
                <button
                  onClick={cerrarModal}
                  className="text-gray-400 hover:text-white transition-colors bg-white/10 md:bg-transparent rounded-full p-1 md:p-0"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/30 custom-scrollbar">
                <div className="space-y-4 md:space-y-6">
                  <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-xs md:text-sm font-black text-[#0a192f] mb-4 flex items-center border-b pb-2">
                      <Search className="h-4 w-4 mr-2 text-blue-500" />{" "}
                      Información Principal
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                          Nombre del Cliente
                        </label>
                        <Select
                          options={opcionesClientes}
                          value={
                            opcionesClientes.find(
                              (op) => op.value === invoiceForm.cliente_id,
                            ) || null
                          }
                          onChange={(selected) =>
                            setInvoiceForm({
                              ...invoiceForm,
                              cliente_id: selected ? selected.cliente.id : "",
                              cliente: selected ? selected.cliente.nombre : "",
                            })
                          }
                          placeholder="Buscar cliente..."
                          isClearable
                          noOptionsMessage={() => "No se encontró el cliente"}
                          styles={{
                            control: (base, state) => ({
                              ...base,
                              borderRadius: "0.5rem",
                              borderColor: state.isFocused
                                ? "#ffd700"
                                : "#d1d5db",
                              boxShadow: state.isFocused
                                ? "0 0 0 2px rgba(255, 215, 0, 0.3)"
                                : "none",
                              backgroundColor: state.isFocused
                                ? "#ffffff"
                                : "#f9fafb",
                              padding: "2px",
                              minHeight: "42px",
                              cursor: "text",
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 9999,
                            }),
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                          Grupo asignado
                        </label>
                        <div className="w-full min-h-[42px] px-3 py-3 md:py-2 border border-gray-200 rounded-xl md:rounded-lg bg-gray-100 text-sm font-bold text-gray-700 flex items-center">
                          {clienteFacturaSeleccionado
                            ? obtenerGrupoCliente(clienteFacturaSeleccionado)
                            : "Selecciona un cliente"}
                        </div>
                        <p className="mt-1 text-[10px] font-medium text-gray-400">
                          La factura hereda automáticamente el grupo vigente del
                          cliente.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                          No. de Factura
                        </label>
                        <input
                          type="text"
                          value={invoiceForm.folio}
                          onChange={(e) =>
                            setInvoiceForm({
                              ...invoiceForm,
                              folio: e.target.value,
                            })
                          }
                          className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-xl md:rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffd700] font-mono text-sm uppercase bg-gray-50 focus:bg-white"
                          placeholder="Ej. F-1035"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                          Monto Total
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={invoiceForm.monto_total}
                            onChange={(e) =>
                              setInvoiceForm({
                                ...invoiceForm,
                                monto_total: e.target.value,
                              })
                            }
                            className="w-full pl-9 pr-3 py-3 md:py-2 border border-gray-300 rounded-xl md:rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffd700] font-bold text-[#0a192f] bg-gray-50 focus:bg-white"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                          Moneda
                        </label>
                        <input
                          type="text"
                          value="MXN"
                          readOnly
                          className="w-full px-3 py-3 md:py-2 border border-gray-200 rounded-xl md:rounded-lg bg-gray-100 text-gray-500 font-bold cursor-not-allowed text-center text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-xs md:text-sm font-black text-[#0a192f] mb-4 flex items-center border-b pb-2">
                      <Calendar className="h-4 w-4 mr-2 text-blue-500" /> Fechas
                      de la Factura
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                          Fecha de Emisión
                        </label>
                        <input
                          type="date"
                          value={invoiceForm.emision}
                          onChange={(e) =>
                            setInvoiceForm({
                              ...invoiceForm,
                              emision: e.target.value,
                            })
                          }
                          className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-xl md:rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm bg-gray-50 focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                          Fecha de Vencimiento
                        </label>
                        <input
                          type="date"
                          value={invoiceForm.vencimiento}
                          onChange={(e) =>
                            setInvoiceForm({
                              ...invoiceForm,
                              vencimiento: e.target.value,
                            })
                          }
                          className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-xl md:rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm bg-gray-50 focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-xs md:text-sm font-black text-[#0a192f] mb-4 flex items-center border-b pb-2">
                      <FileText className="h-4 w-4 mr-2 text-blue-500" /> Extras
                    </h3>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                        Observaciones
                      </label>
                      <textarea
                        value={invoiceForm.observaciones}
                        onChange={(e) =>
                          setInvoiceForm({
                            ...invoiceForm,
                            observaciones: e.target.value,
                          })
                        }
                        className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-xl md:rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm bg-gray-50 focus:bg-white resize-none"
                        rows="3"
                        placeholder="Escribe aquí notas adicionales..."
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 md:p-4 border-t border-gray-200 bg-white md:bg-gray-50 flex flex-col-reverse md:flex-row justify-end gap-3 md:gap-2 shrink-0 md:rounded-b-xl">
                <button
                  onClick={cerrarModal}
                  className="w-full md:w-auto px-4 py-3.5 md:py-2.5 text-sm md:text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-xl md:rounded-lg active:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveFactura}
                  disabled={isSubmitting}
                  className="w-full md:w-auto px-6 py-3.5 md:py-2.5 bg-[#ffd700] text-[#0a192f] text-sm md:text-xs font-black rounded-xl md:rounded-lg shadow-sm active:bg-[#e6c200] transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Guardando..."
                    : modalActivo === "editarFactura"
                      ? "Guardar Cambios"
                      : "Guardar Factura"}
                </button>
              </div>
            </div>
          )}

          {modalActivo === "confirmarEliminar" && (
            <div className="bg-white rounded-t-3xl md:rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-slide-up md:animate-zoom-in mt-auto mb-auto md:mt-10 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-0">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden shrink-0"></div>
              <div className="p-6 text-center space-y-4">
                <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto ring-4 ring-red-50">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl md:text-lg font-black text-[#0a192f]">
                    {itemAEliminar?.tipo === "factura"
                      ? "¿Cancelar (Archivar) Factura?"
                      : "¿Eliminar Abono?"}
                  </h3>
                  <p className="text-sm md:text-sm text-gray-600 mt-2">
                    {itemAEliminar?.tipo === "factura" ? (
                      <>
                        Estás a punto de cancelar la factura{" "}
                        <span className="font-bold text-[#0a192f]">
                          {itemAEliminar.data?.folio}
                        </span>{" "}
                        de{" "}
                        <span className="font-bold text-[#0a192f]">
                          {itemAEliminar.data?.cliente}
                        </span>
                        . Esta operación ajustará el saldo del cliente,
                        el crédito disponible, las métricas globales y la bitácora.
                      </>
                    ) : (
                      <>
                        Estás a punto de eliminar un abono de{" "}
                        <span className="font-bold text-[#0a192f]">
                          ${itemAEliminar.data?.monto?.toLocaleString("es-MX")}
                        </span>{" "}
                        de la factura{" "}
                        <span className="font-bold text-[#0a192f]">
                          {facturaSeleccionada?.folio}
                        </span>
                        .
                      </>
                    )}
                  </p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-xs text-red-700 font-medium text-left">
                  <p>
                    <strong>Atención:</strong>{" "}
                    {itemAEliminar?.tipo === "factura"
                      ? "Solo el SU puede cancelar facturas. Esta quedará archivada como 'Cancelada' para proteger el rastro de auditoría."
                      : "El saldo de la factura se recalculará automáticamente."}{" "}
                    Esta acción es irreversible.
                  </p>
                </div>
              </div>
              <div className="p-4 md:p-3 border-t border-gray-100 bg-white md:bg-gray-50 flex flex-col-reverse md:flex-row justify-end gap-3 md:gap-2 md:rounded-b-xl">
                <button
                  onClick={() => {
                    if (itemAEliminar?.tipo === "abono")
                      setModalActivo("historialPagos");
                    else setModalActivo("opcionesFactura");
                  }}
                  className="w-full md:w-auto px-4 py-3.5 md:py-2 text-sm md:text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-xl md:rounded-lg active:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={ejecutarEliminacion}
                  disabled={isSubmitting}
                  className="w-full md:w-auto px-5 py-3.5 md:py-2 text-sm md:text-xs font-black text-white bg-red-600 active:bg-red-700 rounded-xl md:rounded-lg shadow-sm flex items-center justify-center transition-colors disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 md:mr-1 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-1.5 md:mr-1" />
                      {itemAEliminar?.tipo === "factura" ? "Sí, cancelar factura" : "Sí, eliminar"}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {modalActivo === "nuevoPago" && (
            <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-slide-up md:m-0 md:rounded-xl md:pb-0 md:animate-zoom-in">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden shrink-0"></div>
              <div className="p-4 border-b border-gray-100 bg-white md:bg-green-50 flex justify-between items-center shrink-0">
                <h2 className="text-sm md:text-base font-black text-green-800 flex items-center">
                  <CreditCard className="h-5 w-5 md:h-5 md:w-5 mr-2" /> Ingreso
                  de Pago
                </h2>
                <button
                  onClick={() => setModalActivo("opcionesFactura")}
                  className="text-gray-400 active:text-gray-700 bg-gray-50 md:bg-transparent rounded-full p-1 md:p-0"
                >
                  <XCircle className="h-6 w-6 md:h-5 md:w-5" />
                </button>
              </div>
              <div className="p-6 md:p-6 space-y-5 md:space-y-4 overflow-y-auto custom-scrollbar">
                <div className="bg-gray-50 p-4 md:p-3 rounded-xl md:rounded-lg text-center border border-gray-200 flex flex-col items-center">
                  <p className="text-[10px] md:text-xs text-gray-500 uppercase font-bold">
                    Saldo Pendiente (Máximo Permitido)
                  </p>
                  <p className="text-3xl md:text-2xl font-black text-[#0a192f] mt-1">
                    $
                    {facturaSeleccionada?.saldo_pendiente.toLocaleString(
                      "es-MX",
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                    Monto a abonar ($)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 md:h-4 md:w-4 text-gray-400" />
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={pagoForm.monto}
                      onChange={handleMontoPago}
                      className="w-full pl-10 pr-3 py-3 md:py-2 border border-gray-200 rounded-xl md:rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-bold text-xl md:text-lg bg-gray-50 focus:bg-white"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1">
                    El monto no puede superar la deuda actual.
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                    Método de Pago
                  </label>
                  <select
                    value={pagoForm.metodo}
                    onChange={(e) =>
                      setPagoForm({ ...pagoForm, metodo: e.target.value })
                    }
                    className="w-full px-4 py-3 md:py-2 border border-gray-200 rounded-xl md:rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 focus:bg-white font-bold text-sm"
                  >
                    <option>Efectivo</option>
                    <option>Transferencia</option>
                    <option>Cheque</option>
                  </select>
                </div>
              </div>
              <div className="p-4 md:p-4 border-t border-gray-100 bg-white md:bg-gray-50 flex flex-col-reverse md:flex-row justify-end gap-3 md:gap-2 shrink-0 md:rounded-b-xl">
                <button
                  onClick={() => setModalActivo("opcionesFactura")}
                  className="w-full md:w-auto px-4 py-3.5 md:py-2 text-sm md:text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl md:rounded active:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSavePago}
                  disabled={
                    !pagoForm.monto ||
                    parseFloat(pagoForm.monto) <= 0 ||
                    isSubmitting
                  }
                  className="w-full md:w-auto px-6 py-3.5 md:py-2 bg-green-600 text-white font-black text-sm md:text-sm rounded-xl md:rounded-lg shadow-sm active:bg-green-700 disabled:opacity-50 flex items-center justify-center transition-colors"
                >
                  Guardar Abono
                </button>
              </div>
            </div>
          )}

          {modalActivo === "historialPagos" && (
            <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-slide-up md:m-0 md:rounded-xl md:pb-0 md:animate-zoom-in">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden shrink-0"></div>
              <div className="p-4 border-b border-gray-100 bg-white md:bg-blue-50 flex justify-between items-center shrink-0">
                <h2 className="text-sm md:text-base font-black text-blue-800 flex items-center">
                  <Clock className="h-5 w-5 md:h-5 md:w-5 mr-2" /> Historial de
                  Abonos
                </h2>
                <button
                  onClick={() => setModalActivo("opcionesFactura")}
                  className="text-gray-400 active:text-gray-700 bg-gray-50 md:bg-transparent rounded-full p-1 md:p-0"
                  aria-label="Cerrar historial de abonos"
                >
                  <XCircle className="h-6 w-6 md:h-5 md:w-5" />
                </button>
              </div>

              <div ref={historialAbonosRef} className="p-3 flex-1 overflow-y-auto custom-scrollbar space-y-3">
                {historialAbonosOrdenado.length > 0 ? (
                  <>
                    {historialAbonosPaginado.map((abono, indice) => {
                      const montoAbono = Number(abono.monto) || 0;
                      const tieneSaldoAnterior = tieneValorNumerico(
                        abono.saldo_anterior,
                      );
                      const tieneSaldoRestante = tieneValorNumerico(
                        abono.saldo_restante,
                      );

                      return (
                        <article
                          key={abono.id_abono || `${abono.fecha}-${indice}`}
                          className="rounded-2xl border border-green-100 bg-green-50/25 p-3.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-lg font-black text-green-700">
                                ${montoAbono.toLocaleString("es-MX")}
                              </p>
                              <p className="text-[11px] font-black uppercase text-gray-400 mt-0.5">
                                Abono registrado
                              </p>
                            </div>

                            <p className="text-[10px] font-bold text-gray-500 text-right shrink-0">
                              {formatearFechaAbono(abono.fecha)}
                            </p>
                          </div>

                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-600">
                            {abono.metodo && (
                              <p>
                                <span className="font-black text-gray-400 uppercase tracking-wider">
                                  Método:
                                </span>{" "}
                                <span className="font-bold">{abono.metodo}</span>
                              </p>
                            )}

                            {abono.registrado_por && (
                              <p>
                                <span className="font-black text-gray-400 uppercase tracking-wider">
                                  Registró:
                                </span>{" "}
                                <span className="font-bold">
                                  {abono.registrado_por}
                                </span>
                              </p>
                            )}

                            {tieneSaldoAnterior && (
                              <p>
                                <span className="font-black text-gray-400 uppercase tracking-wider">
                                  Saldo anterior:
                                </span>{" "}
                                <span className="font-bold">
                                  $
                                  {Number(abono.saldo_anterior).toLocaleString(
                                    "es-MX",
                                  )}
                                </span>
                              </p>
                            )}

                            {tieneSaldoRestante && (
                              <p>
                                <span className="font-black text-gray-400 uppercase tracking-wider">
                                  Restante:
                                </span>{" "}
                                <span className="font-bold">
                                  $
                                  {Number(abono.saldo_restante).toLocaleString(
                                    "es-MX",
                                  )}
                                </span>
                              </p>
                            )}
                          </div>

                          {abono.observaciones && (
                            <p className="mt-2 text-[11px] text-gray-600 bg-white/75 border border-gray-100 rounded-xl p-2">
                              {abono.observaciones}
                            </p>
                          )}

                          {userRole === "SU" && (
                            <button
                              type="button"
                              onClick={() =>
                                confirmarEliminacion("abono", abono)
                              }
                              className="mt-3 w-full px-3 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs font-black hover:bg-red-100 active:bg-red-100 transition-colors"
                            >
                              Anular abono
                            </button>
                          )}
                        </article>
                      );
                    })}

                    <PaginacionGlobal
                      pagina={paginaHistorialAbonos}
                      totalPaginas={totalPaginasAbonos}
                      totalRegistros={historialAbonosOrdenado.length}
                      registrosPorPagina={registrosPorPaginaAbonos}
                      registrosEnPagina={historialAbonosPaginado.length}
                      etiquetaTotal="abonos"
                      scrollTargetRef={historialAbonosRef}
                      onCambiarPagina={setPaginaHistorialAbonos}
                    />
                  </>
                ) : (
                  <div className="p-10 text-center text-gray-400 rounded-2xl border border-dashed border-gray-200 bg-gray-50/70">
                    <AlertTriangle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-bold uppercase tracking-wider">
                      No se han registrado abonos a esta factura.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {modalActivo === "notificacion" && (
            <div className="bg-white rounded-t-3xl md:rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-slide-up md:animate-zoom-in mt-auto mb-auto pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-0">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden shrink-0"></div>
              <div className="p-6 md:p-6 text-center">
                <div
                  className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ${notificacion.tipo === "error" ? "bg-red-100 ring-red-50 text-red-600" : "bg-green-100 ring-green-50 text-green-600"}`}
                >
                  {notificacion.tipo === "error" ? (
                    <XCircle className="h-8 w-8" />
                  ) : (
                    <Check className="h-8 w-8" />
                  )}
                </div>
                <h3 className="text-xl md:text-lg font-black text-[#0a192f] mb-2">
                  {notificacion.titulo}
                </h3>
                <p className="text-sm md:text-xs text-gray-600 leading-relaxed font-medium">
                  {notificacion.descripcion}
                </p>
                <button
                  onClick={cerrarModal}
                  className={`w-full mt-6 px-5 py-3.5 md:py-2.5 text-sm md:text-sm font-black text-[#0a192f] rounded-xl md:rounded-lg transition-colors shadow-sm ${notificacion.tipo === "error" ? "bg-red-50 hover:bg-red-100 border border-red-200" : "bg-[#ffd700] hover:bg-[#e6c200]"}`}
                >
                  Aceptar y Continuar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}