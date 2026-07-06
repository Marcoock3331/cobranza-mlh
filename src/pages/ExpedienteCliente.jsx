import {
  useState,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { GlobalContext } from "../context/GlobalContext";
import { db } from "../config/firebase";
import PaginacionGlobal from "../components/ui/PaginacionGlobal";
import { calcularDiasVencidos } from "../utils/fechas";
import { clientesService } from "../services/clientesService";
import { lineaCreditoService } from "../services/lineaCreditoService";
import { useFacturasCliente } from "../hooks/useFacturasCliente";
import {
  ArrowLeft,
  Edit,
  FileText,
  User,
  CheckCircle,
  Pencil,
  X,
  XCircle,
  TrendingUp,
  Shield,
  Mail,
  Tag,
  MessageSquare,
  StickyNote,
  DollarSign,
  Trash2,
  Loader2,
  AlertTriangle,
} from "lucide-react";

const GRUPOS_CLIENTE = [
  { value: "CARPINTERIA", label: "Carpintería" },
  { value: "CRUCE", label: "Cruce" },
  { value: "FAMILIARES", label: "Familiares" },
  { value: "GENERAL", label: "General" },
  { value: "PRIORIDAD", label: "Prioridad" },
  { value: "IHB", label: "IHB" },
  { value: "RC INTERCOMERCE", label: "RC Intercomerce" },
  { value: "TORRE LAS AMERICAS", label: "Torre Las Americas" },
  { value: "NUEVO", label: "Nuevo" },
];

const TIPOS_MOVIMIENTO_LINEA = [
  { value: "ALTA_INICIAL", label: "Alta inicial" },
  { value: "AUMENTO", label: "Aumento" },
  { value: "DISMINUCION", label: "Disminución" },
  { value: "CORRECCION", label: "Corrección" },
];

const estadoInicialLineaCredito = {
  tipo_movimiento: "AUMENTO",
  nuevo_limite: "",
  personal_autoriza: "",
  motivo: "",
};

const normalizarGrupoCliente = (valor = "") => {
  const normalizado = valor
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  const coincidencia = GRUPOS_CLIENTE.find(
    (grupo) => grupo.value === normalizado,
  );

  return coincidencia?.value || "GENERAL";
};

const obtenerEtiquetaGrupo = (valor = "") => {
  const valorNormalizado = normalizarGrupoCliente(valor);

  return (
    GRUPOS_CLIENTE.find((grupo) => grupo.value === valorNormalizado)?.label ||
    "General"
  );
};

const obtenerTodasNotasCredito = (factura = {}) =>
  Array.isArray(factura.notas_credito) ? factura.notas_credito : [];

const obtenerNotasCredito = (factura = {}) =>
  obtenerTodasNotasCredito(factura).filter(
    (nota) => nota.cancelada !== true && nota.estado !== "Cancelada" && nota.estado !== "Anulada",
  );

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

const obtenerMontoAbonadoSeguro = (factura = {}) => {
  const montoGuardado = Number(factura.monto_pagado);

  if (Number.isFinite(montoGuardado)) {
    return Math.max(0, montoGuardado);
  }

  const montoTotal = Number(factura.monto_total) || 0;
  const saldoPendiente = Number(factura.saldo_pendiente) || 0;
  const totalNotasCredito = obtenerTotalNotasCredito(factura);

  return Math.max(0, montoTotal - saldoPendiente - totalNotasCredito);
};

const obtenerResumenFacturaVisual = (factura = {}) => {
  const montoTotal = Number(factura.monto_total) || 0;
  const saldoPendiente = Number(factura.saldo_pendiente) || 0;
  const totalNotasCredito = obtenerTotalNotasCredito(factura);
  const montoAbonado = obtenerMontoAbonadoSeguro(factura);
  const esVencida = factura.estatus === "Vencida";
  const esPagada = saldoPendiente <= 0;
  const diasVencidos = esVencida
    ? calcularDiasVencidos(factura.vencimiento)
    : 0;

  const porcentajeLiquidado =
    montoTotal > 0
      ? Math.min(100, ((montoAbonado + totalNotasCredito) / montoTotal) * 100)
      : 0;

  return {
    montoTotal,
    saldoPendiente,
    totalNotasCredito,
    montoAbonado,
    porcentajeLiquidado,
    esVencida,
    esPagada,
    diasVencidos,
  };
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

const tieneValorNumerico = (valor) => {
  const numero = Number(valor);

  return Number.isFinite(numero) && numero >= 0;
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
    return fecha.toDate().toLocaleDateString("es-MX");
  }

  if (fecha instanceof Date) {
    return fecha.toLocaleDateString("es-MX");
  }

  if (typeof fecha === "object" && typeof fecha.seconds === "number") {
    return new Date(fecha.seconds * 1000).toLocaleDateString("es-MX");
  }

  if (typeof fecha === "object" && typeof fecha._seconds === "number") {
    return new Date(fecha._seconds * 1000).toLocaleDateString("es-MX");
  }

  if (typeof fecha === "string") {
    return fecha.split(",")[0] || fecha;
  }

  return "Sin fecha";
};

const FACTURAS_COLLECTION = "facturas";

const formatearFechaFacturaExpediente = (fecha) => {
  if (!fecha) return "";

  if (fecha?.toDate && typeof fecha.toDate === "function") {
    return fecha.toDate().toISOString().split("T")[0];
  }

  if (typeof fecha === "object" && typeof fecha.seconds === "number") {
    return new Date(fecha.seconds * 1000).toISOString().split("T")[0];
  }

  if (typeof fecha === "object" && typeof fecha._seconds === "number") {
    return new Date(fecha._seconds * 1000).toISOString().split("T")[0];
  }

  if (fecha instanceof Date) {
    return fecha.toISOString().split("T")[0];
  }

  return String(fecha);
};

const normalizarFacturaExpediente = (idFactura, data = {}) => ({
  id: idFactura,
  ...data,
  emision: formatearFechaFacturaExpediente(data.emision),
  vencimiento: formatearFechaFacturaExpediente(data.vencimiento),
  abonos: Array.isArray(data.abonos) ? data.abonos : [],
  notas_credito: Array.isArray(data.notas_credito) ? data.notas_credito : [],
});

const obtenerTiempoItemNotaCredito = (item = {}) => {
  const fechaBase =
    item.fecha_anulacion?.toDate?.().getTime?.() ||
    item.anuladaAt?.toDate?.().getTime?.() ||
    item.fecha?.toDate?.().getTime?.() ||
    item.createdAt?.toDate?.().getTime?.() ||
    item.resolvedAt?.toDate?.().getTime?.() ||
    new Date(item.fechaTexto || item.fecha || 0).getTime();

  return Number.isFinite(fechaBase) ? fechaBase : 0;
};

const obtenerSolicitudesNotasFactura = (factura = {}, solicitudes = []) =>
  (solicitudes || []).filter(
    (solicitud) => solicitud.factura_id === factura.id,
  );

const obtenerHistorialNotasCreditoExpediente = (
  factura = {},
  solicitudes = [],
) => {
  const notasAplicadas = obtenerTodasNotasCredito(factura);
  const solicitudesFactura = obtenerSolicitudesNotasFactura(
    factura,
    solicitudes,
  );
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
      obtenerTiempoItemNotaCredito(
        segunda.fechaOrden ? { ...segunda, fecha: segunda.fechaOrden } : segunda,
      ) -
      obtenerTiempoItemNotaCredito(
        primera.fechaOrden ? { ...primera, fecha: primera.fechaOrden } : primera,
      ),
  );
};

const llevarExpedienteAlInicio = (elementoBase) => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }

  const candidatos = new Set([
    window,
    document.scrollingElement,
    document.documentElement,
    document.body,
    document.getElementById("root"),
    elementoBase,
  ]);

  let nodoActual = elementoBase;

  while (nodoActual) {
    candidatos.add(nodoActual);
    nodoActual = nodoActual.parentElement;
  }

  document
    .querySelectorAll(
      [
        "main",
        "[role='main']",
        "[data-scroll-container]",
        ".overflow-y-auto",
        ".overflow-y-scroll",
        ".overflow-auto",
        ".custom-scrollbar",
      ].join(","),
    )
    .forEach((elemento) => candidatos.add(elemento));

  candidatos.forEach((elemento) => {
    if (!elemento) return;

    if (elemento === window) {
      window.scrollTo(0, 0);
      return;
    }

    if (typeof elemento.scrollTo === "function") {
      elemento.scrollTo(0, 0);
    }

    if ("scrollTop" in elemento) {
      elemento.scrollTop = 0;
    }
  });
};

function TarjetaResumenExpediente({
  etiqueta,
  valor,
  descripcion,
  icono: Icono,
  variante = "azul",
  accion,
  textoAccion,
}) {
  const variantes = {
    azul: {
      tarjeta: "border-blue-100 bg-blue-50/30",
      etiqueta: "text-blue-600",
      valor: "text-[#0a192f]",
      icono: "bg-blue-100 text-blue-600",
      accion: "text-blue-700 hover:text-blue-900",
    },
    rojo: {
      tarjeta: "border-red-200 bg-red-50/45",
      etiqueta: "text-red-600",
      valor: "text-red-600",
      icono: "bg-red-100 text-red-600",
      accion: "text-red-700 hover:text-red-900",
    },
    verde: {
      tarjeta: "border-green-100 bg-green-50/30",
      etiqueta: "text-green-700",
      valor: "text-green-600",
      icono: "bg-green-100 text-green-600",
      accion: "text-green-700 hover:text-green-900",
    },
    morado: {
      tarjeta: "border-purple-100 bg-purple-50/30",
      etiqueta: "text-purple-700",
      valor: "text-[#0a192f]",
      icono: "bg-purple-100 text-purple-600",
      accion: "text-purple-700 hover:text-purple-900",
    },
    amber: {
      tarjeta: "border-amber-200 bg-amber-50/45",
      etiqueta: "text-amber-700",
      valor: "text-amber-600",
      icono: "bg-amber-100 text-amber-700",
      accion: "text-amber-700 hover:text-amber-900",
    },
  };

  const estilos = variantes[variante] || variantes.azul;

  return (
    <article
      className={`p-4 md:p-5 rounded-2xl border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${estilos.tarjeta}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`text-[10px] md:text-xs font-black uppercase tracking-wider ${estilos.etiqueta}`}
          >
            {etiqueta}
          </p>

          <h3
            className={`text-xl md:text-2xl font-black mt-1 break-words ${estilos.valor}`}
          >
            {valor}
          </h3>
        </div>

        <div className={`p-2.5 rounded-xl shrink-0 ${estilos.icono}`}>
          <Icono className="h-5 w-5" />
        </div>
      </div>

      <p className="text-[11px] md:text-xs text-gray-500 mt-3 font-medium">
        {descripcion}
      </p>

      {accion && textoAccion && (
        <button
          type="button"
          onClick={accion}
          className={`mt-3 text-xs font-black flex items-center ${estilos.accion}`}
        >
          {textoAccion}
          <Pencil className="h-3.5 w-3.5 ml-1" />
        </button>
      )}
    </article>
  );
}

export default function ExpedienteCliente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const expedienteTopRef = useRef(null);
  const facturasListaRef = useRef(null);
  const historialAbonosRef = useRef(null);
  const historialNotasRef = useRef(null);

  useLayoutEffect(() => {
    const ejecutarScrollInicial = () => {
      llevarExpedienteAlInicio(expedienteTopRef.current);
    };

    ejecutarScrollInicial();

    const frame = window.requestAnimationFrame(ejecutarScrollInicial);
    const temporizadorCorto = window.setTimeout(ejecutarScrollInicial, 80);
    const temporizadorLargo = window.setTimeout(ejecutarScrollInicial, 250);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(temporizadorCorto);
      window.clearTimeout(temporizadorLargo);
    };
  }, [id]);

  const {
    clientes,
    userRole,
    userName,
    currentUser,
    solicitudesNotasCredito,
    eliminarFacturaEnNube,
  } = useContext(GlobalContext);

  const [filtroFacturas, setFiltroFacturas] = useState("Historial");
  const [modalActivo, setModalActivo] = useState(null);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [lineaCreditoForm, setLineaCreditoForm] = useState(estadoInicialLineaCredito);
  const [notificacion, setNotificacion] = useState({
    titulo: "",
    descripcion: "",
    tipo: "exito",
  });
  const [clienteForm, setClienteForm] = useState({});
  const [procesandoCredito, setProcesandoCredito] = useState(false);
  const [procesandoEliminacionFactura, setProcesandoEliminacionFactura] =
    useState(false);
  const [facturaAutoAbierta, setFacturaAutoAbierta] = useState("");
  const [paginaHistorialNotas, setPaginaHistorialNotas] = useState(1);
  const [paginaHistorialAbonos, setPaginaHistorialAbonos] = useState(1);
  const registrosHistorialModal = 5;
  const facturasPorPagina = 8;

  const mostrarNotificacion = (titulo, descripcion, tipo = "exito") => {
    setNotificacion({ titulo, descripcion, tipo });
    setModalActivo("notificacion");
  };

  const clienteBase = clientes.find((c) => c.id === id) || null;

  const {
    facturas: facturasPaginadas,
    resumen: resumenFacturasCliente,
    cargando: cargandoFacturasCliente,
    cargandoResumen: cargandoResumenFacturas,
    error: errorFacturasCliente,
    pagina: paginaFacturas,
    hayAnterior: hayPaginaAnterior,
    haySiguiente: hayPaginaSiguiente,
    siguientePagina,
    paginaAnterior,
    recargar: recargarFacturasCliente,
  } = useFacturasCliente({
    clienteId: clienteBase?.id || "",
    filtroFacturas,
    pageSize: facturasPorPagina,
    enabled: Boolean(clienteBase?.id),
  });

  const facturaIdQuery = searchParams.get("facturaId") || "";
  const abrirFacturaQuery = searchParams.get("abrirFactura") === "1";

  const abrirDetalleFactura = (factura) => {
    setFacturaSeleccionada(factura);
    setPaginaHistorialNotas(1);
    setPaginaHistorialAbonos(1);
    setModalActivo("verFactura");
  };

  useEffect(() => {
    if (!abrirFacturaQuery || !facturaIdQuery || !clienteBase?.id) {
      return undefined;
    }

    const llaveApertura = `${clienteBase.id}-${facturaIdQuery}`;

    if (facturaAutoAbierta === llaveApertura) {
      return undefined;
    }

    const abrirFacturaExacta = (factura) => {
      abrirDetalleFactura(factura);
      setFacturaAutoAbierta(llaveApertura);
    };

    const facturaEnPagina = facturasPaginadas.find(
      (factura) => factura.id === facturaIdQuery,
    );

    if (facturaEnPagina) {
      abrirFacturaExacta(facturaEnPagina);
      return undefined;
    }

    let activo = true;

    const cargarFacturaExacta = async () => {
      try {
        const facturaSnap = await getDoc(
          doc(db, FACTURAS_COLLECTION, facturaIdQuery),
        );

        if (!activo) return;

        if (!facturaSnap.exists()) {
          console.warn("Factura solicitada no encontrada:", facturaIdQuery);
          setFacturaAutoAbierta(llaveApertura);
          return;
        }

        const factura = normalizarFacturaExpediente(
          facturaSnap.id,
          facturaSnap.data(),
        );

        if (factura.cliente_id !== clienteBase.id) {
          console.warn(
            "La factura solicitada no pertenece al expediente actual:",
            facturaIdQuery,
          );
          setFacturaAutoAbierta(llaveApertura);
          return;
        }

        abrirFacturaExacta(factura);
      } catch (error) {
        console.error("No se pudo abrir la factura exacta:", error);
        if (activo) {
          setFacturaAutoAbierta(llaveApertura);
        }
      }
    };

    void cargarFacturaExacta();

    return () => {
      activo = false;
    };
  }, [
    abrirFacturaQuery,
    clienteBase?.id,
    facturaAutoAbierta,
    facturaIdQuery,
    facturasPaginadas,
  ]);

  const cambiarFiltroFacturas = (tab) => {
    setFiltroFacturas(tab);
  };

  const deudaReal = Number(clienteBase?.deuda_actual) || 0;
  const saldoVencidoReal = Number(resumenFacturasCliente?.saldoVencido) || 0;

  const limiteCredito = Number(clienteBase?.limite_credito) || 0;
  const tieneLineaCredito = limiteCredito > 0;
  const clienteInactivo =
    clienteBase?.activo === false || clienteBase?.estatus === "Inactivo";
  const estadoLineaCredito = clienteInactivo
    ? "Bloqueada por cliente inactivo"
    : clienteBase?.linea_credito_estado ||
      (tieneLineaCredito ? "Activa" : "Sin línea");
  const creditoDisponibleCalculado = clienteInactivo
    ? 0
    : tieneLineaCredito
      ? Math.max(0, limiteCredito - deudaReal)
      : 0;
  const pagareInicialCliente =
    typeof clienteBase?.pagare_inicial === "boolean"
      ? clienteBase.pagare_inicial
      : Number(clienteBase?.pagare_monto) > 0
        ? true
        : null;

  const baseCombinada = clienteBase
    ? {
        ...clienteBase,
        rfc: clienteBase.rfc || "S/N",
        limite_credito: limiteCredito,
        deuda_actual: deudaReal,
        credito_disponible: creditoDisponibleCalculado,
        linea_credito_estado: estadoLineaCredito,
        linea_credito_autorizado_por:
          clienteBase.linea_credito_autorizado_por ||
          clienteBase.linea_credito_referencia ||
          "Sin autorizador",
        linea_credito_actualizada_por:
          clienteBase.linea_credito_actualizada_por || "Sin registro",
        saldo_vencido: saldoVencidoReal,
        direccion: clienteBase.direccion || "Sin dirección registrada.",
        correo: clienteBase.correo || "S/N",
        segmentacion: clienteBase.segmentacion || "Nuevo",
        dias_mensaje: clienteBase.dias_mensaje || "",
        pagare_inicial: pagareInicialCliente,
        notas_internas: clienteBase.notas_internas || "",
      }
    : null;

  const cliente = baseCombinada;

  const cerrarModal = () => {
    if (procesandoEliminacionFactura) return;

    setModalActivo(null);
    setFacturaSeleccionada(null);
    setLineaCreditoForm(estadoInicialLineaCredito);
  };

  const opcionesSegmentacion = [
    "Cumplidor",
    "Moroso",
    "Riesgo Alto",
    "Nuevo",
    "Suspendido",
  ];

  const obtenerEtiquetaMontoLinea = (tipoMovimiento = "") => {
    if (tipoMovimiento === "AUMENTO") return "Monto a aumentar";
    if (tipoMovimiento === "DISMINUCION") return "Monto a disminuir";
    if (tipoMovimiento === "CORRECCION") return "Nuevo límite correcto";
    return "Límite inicial autorizado";
  };

  const obtenerDescripcionMontoLinea = (tipoMovimiento = "") => {
    if (tipoMovimiento === "AUMENTO") {
      return "El monto capturado se sumará a la línea actual.";
    }

    if (tipoMovimiento === "DISMINUCION") {
      return "El monto capturado se restará de la línea actual.";
    }

    if (tipoMovimiento === "CORRECCION") {
      return "El monto capturado reemplazará el límite actual.";
    }

    return "El monto capturado será la línea inicial del cliente.";
  };

  const calcularNuevoLimitePreview = ({
    tipoMovimiento,
    montoCapturado,
    limiteActual,
  }) => {
    if (!Number.isFinite(montoCapturado)) return null;

    if (tipoMovimiento === "AUMENTO") {
      return limiteActual + montoCapturado;
    }

    if (tipoMovimiento === "DISMINUCION") {
      return limiteActual - montoCapturado;
    }

    return montoCapturado;
  };

  const limiteActualLinea = Number(cliente?.limite_credito) || 0;
  const deudaActualLinea = Number(cliente?.deuda_actual) || 0;
  const montoLineaCapturado = Number(lineaCreditoForm.nuevo_limite);

  const nuevoLimitePreview = calcularNuevoLimitePreview({
    tipoMovimiento: lineaCreditoForm.tipo_movimiento,
    montoCapturado: montoLineaCapturado,
    limiteActual: limiteActualLinea,
  });
  
  const movimientoLineaInvalidoPorDeuda =
    Number.isFinite(nuevoLimitePreview) &&
    nuevoLimitePreview < deudaActualLinea;

  const prepararCambioLineaCredito = () => {
    setLineaCreditoForm({
      ...estadoInicialLineaCredito,
      tipo_movimiento: tieneLineaCredito ? "AUMENTO" : "ALTA_INICIAL",
      nuevo_limite: "",
      personal_autoriza: "",
      motivo: "",
    });

    setModalActivo("registrarLineaCredito");
  };

  const handleRegistrarMovimientoLinea = async (e) => {
    e.preventDefault();

    if (procesandoCredito) return;

    if (!currentUser?.uid) {
      mostrarNotificacion(
        "Error",
        "No se identificó al usuario responsable.",
        "error",
      );
      return;
    }

    const montoMovimiento = Number(lineaCreditoForm.nuevo_limite);
    const tipoMovimiento = lineaCreditoForm.tipo_movimiento;

    if (
      !tipoMovimiento ||
      !Number.isFinite(montoMovimiento) ||
      montoMovimiento < 0 ||
      !lineaCreditoForm.personal_autoriza.trim() ||
      !lineaCreditoForm.motivo.trim()
    ) {
      mostrarNotificacion(
        "Campos incompletos",
        "Selecciona el tipo de movimiento, captura el monto, el personal que autoriza y el motivo.",
        "error",
      );
      return;
    }

    if (["AUMENTO", "DISMINUCION"].includes(tipoMovimiento) && montoMovimiento <= 0) {
      mostrarNotificacion(
        "Monto inválido",
        tipoMovimiento === "AUMENTO"
          ? "El monto a aumentar debe ser mayor a cero."
          : "El monto a disminuir debe ser mayor a cero.",
        "error",
      );
      return;
    }

    const limiteActual = Number(cliente?.limite_credito) || 0;
    const deudaActual = Number(cliente?.deuda_actual) || 0;

    const limiteResultante = calcularNuevoLimitePreview({
      tipoMovimiento,
      montoCapturado: montoMovimiento,
      limiteActual,
    });

    if (!Number.isFinite(limiteResultante) || limiteResultante < 0) {
      mostrarNotificacion(
        "Movimiento inválido",
        "El movimiento no puede dejar la línea de crédito en negativo.",
        "error",
      );
      return;
    }

    if (limiteResultante < deudaActual) {
      mostrarNotificacion(
        "Límite menor a la deuda",
        `El nuevo límite resultante no puede ser menor a la deuda actual del cliente. Deuda actual: $${deudaActual.toLocaleString("es-MX")}.`,
        "error",
      );
      return;
    }

    setProcesandoCredito(true);

    try {
      const res = await lineaCreditoService.registrarMovimientoLineaCredito({
        cliente_id: cliente.id,
        tipo_movimiento: tipoMovimiento,
        monto_movimiento: montoMovimiento,
        personal_autoriza: lineaCreditoForm.personal_autoriza.trim(),
        motivo: lineaCreditoForm.motivo.trim(),
        actor_uid: currentUser.uid,
        actor_nombre: userName || userRole || "ADMIN",
        actor_rol: userRole || "ADMIN",
      });

      if (!res?.success) {
        mostrarNotificacion(
          "No se pudo registrar",
          res?.error || "El movimiento de línea fue rechazado.",
          "error",
        );
        return;
      }

      cerrarModal();
      mostrarNotificacion(
        "Movimiento registrado",
        "La línea de crédito fue actualizada y el cambio quedó guardado en historial y actividad del sistema.",
        "exito",
      );
    } catch (error) {
      console.error("Error registrando línea de crédito:", error);
      mostrarNotificacion(
        "Error",
        "Ocurrió un error inesperado al registrar la línea de crédito.",
        "error",
      );
    } finally {
      setProcesandoCredito(false);
    }
  };

  const handleGuardarEdicionCliente = async (e) => {
    e.preventDefault();

    if (!currentUser?.uid) {
      mostrarNotificacion(
        "Error",
        "No se identificó al usuario responsable.",
        "error",
      );
      return;
    }

    const respuesta = await clientesService.modificarCliente(
      cliente.id,
      clienteForm,
      cliente.nombre,
      userName,
      currentUser.uid,
    );

    if (respuesta.success) {
      cerrarModal();
      mostrarNotificacion(
        "Cambios Guardados",
        "Los datos del cliente han sido actualizados en la nube con éxito.",
        "exito",
      );
    } else {
      mostrarNotificacion(
        "Error",
        respuesta.error || "Fallo de conexión al guardar en la nube.",
        "error",
      );
    }
  };

  const handleEliminarFactura = async () => {
    if (procesandoEliminacionFactura) return;

    if (userRole !== "SU") {
      mostrarNotificacion(
        "Acción no permitida",
        "Solo el SU puede eliminar facturas.",
        "error",
      );
      return;
    }

    if (!currentUser?.uid) {
      mostrarNotificacion(
        "Error",
        "No se identificó al usuario responsable.",
        "error",
      );
      return;
    }

    if (!facturaSeleccionada?.id) {
      mostrarNotificacion(
        "Error",
        "No se identificó la factura que será eliminada.",
        "error",
      );
      return;
    }

    setProcesandoEliminacionFactura(true);

    try {
      const respuesta = await eliminarFacturaEnNube(facturaSeleccionada.id);

      if (!respuesta?.success) {
        mostrarNotificacion(
          "Error",
          respuesta?.error || "No se pudo eliminar la factura.",
          "error",
        );
        return;
      }

      setFacturaSeleccionada(null);
      await recargarFacturasCliente();

      mostrarNotificacion(
        "Factura eliminada",
        "Se eliminó la factura y se ajustaron saldo, crédito, métricas y auditoría.",
        "exito",
      );
    } catch (error) {
      console.error("Error eliminando factura desde expediente:", error);
      mostrarNotificacion(
        "Error",
        "Ocurrió un error inesperado al eliminar la factura.",
        "error",
      );
    } finally {
      setProcesandoEliminacionFactura(false);
    }
  };

  // RENDEREADO DE FALLBACK (Bloqueado aquí para no romper el orden de los Hooks anteriores)
  if (!cliente) {
    return (
      <div className="p-8 text-center font-bold text-gray-500">
        Cargando expediente o cliente no encontrado...
      </div>
    );
  }

  return (
    <div
      ref={expedienteTopRef}
      className="flex flex-col space-y-4 md:space-y-6 animate-fade-in relative pb-6 text-sm"
    >
      <div className="flex items-center mt-2 md:mt-4">
        <button
          onClick={() => navigate("/clientes")}
          className="text-gray-500 hover:text-[#0a192f] active:text-[#0a192f] active:bg-gray-100 font-bold flex items-center transition-colors py-2 md:py-0 px-2 md:px-0 rounded-lg -ml-2 md:ml-0"
        >
          <ArrowLeft className="h-5 w-5 md:h-4 md:w-4 mr-1.5" /> Regresar a
          Clientes
        </button>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center w-full md:w-auto">
          <div className="h-12 w-12 md:h-14 md:w-14 shrink-0 bg-gradient-to-tr from-[#0a192f] to-blue-900 rounded-full flex items-center justify-center font-black text-white text-lg md:text-xl shadow-md">
            {cliente.nombre ? cliente.nombre.charAt(0) : "U"}
          </div>
          <div className="ml-3 md:ml-4 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <h1 className="text-lg md:text-xl font-black text-[#0a192f] leading-tight">
                {cliente.nombre}
              </h1>
              <span className="w-fit text-[10px] md:text-[11px] font-black uppercase px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-600 rounded">
                {obtenerEtiquetaGrupo(cliente.grupo)}
              </span>
            </div>
            <p className="text-[11px] md:text-xs text-gray-400 mt-1 font-mono">
              No. Cliente: #{cliente.numero_cliente || "SIN-FOLIO"}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setClienteForm({
              ...cliente,
              grupo: normalizarGrupoCliente(cliente.grupo),
            });
            setModalActivo("editarCliente");
          }}
          className="w-full md:w-auto px-4 py-3 md:py-2 bg-gray-50 border border-gray-200 text-gray-700 font-bold text-xs rounded-xl md:rounded-lg active:bg-gray-200 hover:bg-gray-100 flex items-center justify-center shadow-sm transition-colors"
        >
          <Edit className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1.5 text-gray-500" />{" "}
          Editar Perfil
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <TarjetaResumenExpediente
          etiqueta="Deuda actual"
          valor={`$${(cliente.deuda_actual || 0).toLocaleString("es-MX")}`}
          descripcion="Suma de saldos pendientes."
          icono={DollarSign}
          variante="azul"
        />

        <TarjetaResumenExpediente
          etiqueta="Límite crédito"
          valor={
            tieneLineaCredito
              ? `$${(cliente.limite_credito || 0).toLocaleString("es-MX")}`
              : "Sin línea asignada"
          }
          descripcion={
            tieneLineaCredito
              ? `${estadoLineaCredito}. Autorizó: ${cliente.linea_credito_autorizado_por}`
              : "Pendiente de registro externo."
          }
          icono={Shield}
          variante={tieneLineaCredito ? "morado" : "amber"}
          accion={clienteInactivo ? undefined : prepararCambioLineaCredito}
          textoAccion="Registrar cambio"
        />

        <TarjetaResumenExpediente
          etiqueta="Crédito disponible"
          valor={
            tieneLineaCredito
              ? `$${(cliente.credito_disponible || 0).toLocaleString("es-MX")}`
              : "N/A"
          }
          descripcion={
            tieneLineaCredito
              ? cliente.credito_disponible > 0
                ? "Margen operativo disponible."
                : "Límite excedido."
              : "Registra la línea autorizada externa."
          }
          icono={CheckCircle}
          variante={
            !tieneLineaCredito
              ? "morado"
              : cliente.credito_disponible > 0
                ? "verde"
                : "rojo"
          }
        />

        <TarjetaResumenExpediente
          etiqueta="Saldo vencido"
          valor={`$${(cliente.saldo_vencido || 0).toLocaleString("es-MX")}`}
          descripcion={
            cliente.saldo_vencido > 0
              ? "Fuera del plazo permitido."
              : "Sin vencimientos activos."
          }
          icono={AlertTriangle}
          variante={cliente.saldo_vencido > 0 ? "rojo" : "azul"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 items-start">
        {" "}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden h-fit">
          <div className="p-4 border-b border-gray-50 bg-gray-50/30">
            <h3 className="font-bold text-[#0a192f] flex items-center">
              <User className="h-4 w-4 mr-2 text-blue-600" /> Datos de Cliente
            </h3>
          </div>
          <div className="p-4 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                  No. Cliente
                </span>
                <strong className="text-gray-800 font-mono text-sm">
                  #{cliente.numero_cliente || "SIN-FOLIO"}
                </strong>
              </div>
              <div>
                <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                  Grupo
                </span>
                <strong className="text-gray-800 text-sm">
                  {obtenerEtiquetaGrupo(cliente.grupo)}
                </strong>
              </div>
            </div>
            <div>
              <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                RFC Comercial
              </span>
              <strong className="text-sm font-mono text-gray-800">
                {cliente.rfc}
              </strong>
            </div>
            <div>
              <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                Correo Electrónico
              </span>
              <strong className="text-gray-700 font-medium flex items-center gap-1">
                <Mail className="h-3 w-3 text-gray-400" /> {cliente.correo}
              </strong>
            </div>
            <div>
              <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                Teléfono
              </span>
              <strong className="text-gray-700 block">
                {cliente.telefono}
              </strong>
            </div>
            <div>
              <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                Dirección Fiscal / Entrega
              </span>
              <strong className="text-gray-700 leading-relaxed block font-normal">
                {cliente.direccion}
              </strong>
            </div>
            <div>
              <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                Segmentación
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100 mt-1">
                <Tag className="h-3 w-3 mr-1" /> {cliente.segmentacion}
              </span>
            </div>

            <div>
              <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                Pagaré inicial
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border mt-1 ${
                  cliente.pagare_inicial === true
                    ? "bg-green-50 text-green-700 border-green-100"
                    : cliente.pagare_inicial === false
                      ? "bg-gray-50 text-gray-600 border-gray-200"
                      : "bg-amber-50 text-amber-700 border-amber-100"
                }`}
              >
                <Shield className="h-3 w-3 mr-1" />
                {cliente.pagare_inicial === true
                  ? "Sí"
                  : cliente.pagare_inicial === false
                    ? "No"
                    : "No registrado"}
              </span>
            </div>
            {cliente.dias_mensaje && cliente.dias_mensaje !== "" && (
              <div>
                <span className="block font-bold text-amber-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> Días de Mensaje
                </span>
                <strong className="text-gray-800 text-sm">
                  Avisar {cliente.dias_mensaje} días antes del vencimiento.
                </strong>
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 mt-2">
              <span className="block font-bold text-green-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                <DollarSign className="h-4 w-4" /> Último Abono Registrado
              </span>
              <div className="bg-green-50/50 p-3 rounded-lg border border-green-100">
                <p className="text-lg font-black text-green-700">
                  $
                  {(
                    cliente.monto_ultimo_pago ||
                    cliente.ultimo_deposito_monto ||
                    0
                  ).toLocaleString("es-MX")}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Fecha:{" "}
                  {cliente.fecha_ultimo_pago?.toDate
                    ? cliente.fecha_ultimo_pago.toDate().toLocaleDateString()
                    : cliente.ultimo_deposito_fecha?.toDate
                      ? cliente.ultimo_deposito_fecha
                          .toDate()
                          .toLocaleDateString()
                      : "Sin registros"}
                </p>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">
                  Método:{" "}
                  {cliente.metodo_ultimo_pago ||
                    cliente.ultimo_deposito_metodo ||
                    "N/A"}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-50">
              <span className="block font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <StickyNote className="h-3 w-3" /> Notas Internas
              </span>
              <p className="text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 leading-relaxed font-serif italic text-xs">
                {cliente.notas_internas
                  ? `"${cliente.notas_internas}"`
                  : "Sin notas registradas."}
              </p>
            </div>
          </div>
        </div>
        <div ref={facturasListaRef} className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden h-fit self-start">
          {" "}
          <div className="p-4 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="font-bold text-[#0a192f] flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" /> Historial de
              Facturas
            </h3>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex bg-gray-100 p-1 rounded-xl md:rounded-lg border border-gray-200 w-full sm:w-auto overflow-x-auto hide-scrollbar-mobile shrink-0">
                {["Historial", "Vencidas", "Pagadas"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => cambiarFiltroFacturas(tab)}
                    className={`flex-1 sm:flex-none whitespace-nowrap px-4 md:px-3 py-2 md:py-1 text-xs md:text-[11px] font-bold rounded-lg md:rounded-md transition-colors ${filtroFacturas === tab ? "bg-white text-[#0a192f] shadow-sm" : "text-gray-500 hover:text-[#0a192f] active:bg-gray-200"}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {(cargandoFacturasCliente || cargandoResumenFacturas) && (
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin shrink-0" />
              )}
            </div>
          </div>
          <div className="border-t border-gray-100 bg-white">
            {facturasPaginadas.length > 0 ? (
              <>
                <div className="hidden md:block overflow-x-auto custom-scrollbar w-full">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-gray-50 text-[11px] font-black text-gray-500 uppercase border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-3 whitespace-nowrap">Folio</th>
                        <th className="px-4 py-3 whitespace-nowrap">Fechas</th>
                        <th className="px-4 py-3 text-right whitespace-nowrap">
                          Total
                        </th>
                        <th className="px-4 py-3 text-right whitespace-nowrap">
                          Saldo
                        </th>
                        <th className="px-4 py-3 text-center whitespace-nowrap">
                          Estado
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-50">
                      {facturasPaginadas.map((fac) => {
                        const {
                          saldoPendiente,
                          montoTotal,
                          esVencida,
                          esPagada,
                          diasVencidos,
                        } = obtenerResumenFacturaVisual(fac);

                        return (
                          <tr
                            key={fac.id}
                            onClick={() => {
                              abrirDetalleFactura(fac);
                            }}
                            className="hover:bg-blue-50/40 cursor-pointer transition-colors text-xs"
                          >
                            <td className="px-4 py-3 font-mono font-black text-blue-600 whitespace-nowrap">
                              {fac.folio}
                            </td>

                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                              <div className="font-medium">
                                Emi: {fac.emision}
                              </div>
                              <div className="text-[11px] text-red-500 font-mono">
                                Vence: {fac.vencimiento}
                              </div>
                            </td>

                            <td className="px-4 py-3 font-black text-gray-900 text-right whitespace-nowrap">
                              ${montoTotal.toLocaleString("es-MX")}
                            </td>

                            <td className="px-4 py-3 font-black text-right whitespace-nowrap">
                              {saldoPendiente > 0 ? (
                                <span
                                  className={
                                    esVencida
                                      ? "text-red-600"
                                      : "text-[#0a192f]"
                                  }
                                >
                                  ${saldoPendiente.toLocaleString("es-MX")}
                                </span>
                              ) : (
                                <span className="text-green-600">$0.00</span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <span
                                className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase border inline-flex items-center justify-center ${
                                  esPagada
                                    ? "bg-green-50 border-green-200 text-green-700"
                                    : esVencida
                                      ? "bg-red-50 border-red-200 text-red-700"
                                      : "bg-blue-50 border-blue-200 text-blue-700"
                                }`}
                              >
                                {esPagada
                                  ? "Pagada"
                                  : esVencida
                                    ? `Vencida (${diasVencidos}d)`
                                    : fac.estatus}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-gray-100">
                  {facturasPaginadas.map((fac) => {
                    const saldoPendiente = Number(fac.saldo_pendiente) || 0;
                    const montoTotal = Number(fac.monto_total) || 0;
                    const esVencida = fac.estatus === "Vencida";
                    const esPagada = saldoPendiente <= 0;
                    const diasVencidos = esVencida
                      ? calcularDiasVencidos(fac.vencimiento)
                      : 0;

                    return (
                      <button
                        key={fac.id}
                        type="button"
                        onClick={() => {
                          abrirDetalleFactura(fac);
                        }}
                        className="w-full p-4 text-left active:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-mono font-black text-blue-600 text-sm truncate">
                              {fac.folio}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-1">
                              Emi: {fac.emision}
                            </p>
                            <p className="text-[11px] text-red-500 font-mono">
                              Vence: {fac.vencimiento}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 px-2 py-1 rounded-md text-[9px] font-black uppercase border ${
                              esPagada
                                ? "bg-green-50 border-green-200 text-green-700"
                                : esVencida
                                  ? "bg-red-50 border-red-200 text-red-700"
                                  : "bg-blue-50 border-blue-200 text-blue-700"
                            }`}
                          >
                            {esPagada
                              ? "Pagada"
                              : esVencida
                                ? `${diasVencidos}d`
                                : fac.estatus}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div className="rounded-lg bg-gray-50 border border-gray-100 p-2">
                            <p className="text-[9px] font-black uppercase text-gray-400">
                              Total
                            </p>
                            <p className="text-sm font-black text-[#0a192f] mt-0.5">
                              ${montoTotal.toLocaleString("es-MX")}
                            </p>
                          </div>

                          <div className="rounded-lg bg-gray-50 border border-gray-100 p-2">
                            <p className="text-[9px] font-black uppercase text-gray-400">
                              Saldo
                            </p>
                            <p
                              className={`text-sm font-black mt-0.5 ${
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
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="px-4 py-10 text-center text-gray-400">
                {cargandoFacturasCliente ? (
                  <>
                    <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-blue-500" />
                    <p className="text-xs font-bold uppercase tracking-wider">
                      Cargando facturas del expediente...
                    </p>
                  </>
                ) : (
                  <>
                    <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-xs font-bold uppercase tracking-wider">
                      {errorFacturasCliente ||
                        "No se encontraron facturas para este filtro."}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
          <PaginacionGlobal
            modoCursor
            pagina={paginaFacturas}
            hayAnterior={hayPaginaAnterior}
            haySiguiente={hayPaginaSiguiente}
            cargando={cargandoFacturasCliente}
            registrosEnPagina={facturasPaginadas.length}
            etiquetaTotal="factura(s)"
            etiquetaPagina="Facturas del cliente"
            mostrarSiempre={facturasPaginadas.length > 0}
            scrollTargetRef={facturasListaRef}
            onAnterior={paginaAnterior}
            onSiguiente={siguientePagina}
            className="m-0 rounded-none border-x-0 border-b-0 bg-gray-50 shadow-none"
          />
        </div>
      </div>

      {modalActivo && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm md:items-center md:p-4">
          <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-slide-up md:rounded-xl md:pb-0 md:animate-fade-in">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden shrink-0"></div>

            {modalActivo !== "notificacion" && (
              <div className="flex justify-between items-center p-4 md:p-4 border-b border-gray-100 bg-white md:bg-gray-50 shrink-0">
                <h2 className="text-sm font-black text-[#0a192f] flex items-center">
                  {modalActivo === "registrarLineaCredito" && (
                    <>
                      <TrendingUp className="h-5 w-5 md:h-4 md:w-4 mr-2 text-blue-600" />{" "}
                      Línea de Crédito
                    </>
                  )}
                  {modalActivo === "editarCliente" && (
                    <>
                      <Edit className="h-5 w-5 md:h-4 md:w-4 mr-2 text-blue-600" />{" "}
                      Editar Cliente
                    </>
                  )}
                  {modalActivo === "verFactura" && (
                    <>
                      <FileText className="h-5 w-5 md:h-4 md:w-4 mr-2 text-gray-600" />{" "}
                      Factura:{" "}
                      <span className="font-mono text-blue-600 ml-1">
                        {facturaSeleccionada?.folio}
                      </span>
                    </>
                  )}
                  {modalActivo === "confirmarEliminarFactura" && (
                    <>
                      <AlertTriangle className="h-5 w-5 md:h-4 md:w-4 mr-2 text-red-600" />{" "}
                      Eliminar Factura
                    </>
                  )}
                </h2>
                <button
                  onClick={cerrarModal}
                  className="text-gray-400 active:text-red-500 p-1 bg-gray-50 md:bg-transparent rounded-full"
                >
                  <X className="h-6 w-6 md:h-5 md:w-5" />
                </button>
              </div>
            )}

            <div className="p-5 overflow-y-auto custom-scrollbar">
              {modalActivo === "verFactura" &&
                facturaSeleccionada &&
                (() => {
                  const fac = facturaSeleccionada;
                  const {
                    montoTotal,
                    saldoPendiente,
                    totalNotasCredito,
                    montoAbonado,
                    porcentajeLiquidado,
                    esVencida,
                    esPagada,
                    diasVencidos,
                  } = obtenerResumenFacturaVisual(fac);
                  const observacionLimpia = String(fac.observaciones || "")
                    .replace(/^observaciones\s*:\s*/i, "")
                    .trim();
                  const historialNotasCredito =
                    obtenerHistorialNotasCreditoExpediente(
                      fac,
                      solicitudesNotasCredito,
                    );
                  const totalPaginasNotas = Math.max(
                    1,
                    Math.ceil(historialNotasCredito.length / registrosHistorialModal),
                  );
                  const historialNotasPaginado = historialNotasCredito.slice(
                    (paginaHistorialNotas - 1) * registrosHistorialModal,
                    paginaHistorialNotas * registrosHistorialModal,
                  );
                  const historialAbonosOrdenado = Array.isArray(fac.abonos)
                    ? [...fac.abonos].sort(
                        (primero, segundo) =>
                          obtenerTiempoAbono(segundo) - obtenerTiempoAbono(primero),
                      )
                    : [];
                  const totalPaginasAbonos = Math.max(
                    1,
                    Math.ceil(historialAbonosOrdenado.length / registrosHistorialModal),
                  );
                  const historialAbonosPaginado = historialAbonosOrdenado.slice(
                    (paginaHistorialAbonos - 1) * registrosHistorialModal,
                    paginaHistorialAbonos * registrosHistorialModal,
                  );

                  return (
                    <div className="flex flex-col space-y-5 md:space-y-4">
                      <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 md:p-3 rounded-xl md:rounded-lg border border-gray-100 text-xs">
                        <div>
                          <span className="block font-black text-[10px] text-gray-400 uppercase tracking-wider mb-1 md:mb-0.5">
                            Emisión / Vcto
                          </span>
                          <strong className="text-gray-800 text-sm md:text-xs block md:inline">
                            {fac.emision}{" "}
                            <span className="hidden md:inline text-gray-400 font-normal mx-1">
                              |
                            </span>{" "}
                            <span
                              className={`block md:inline mt-0.5 md:mt-0 ${esVencida ? "text-red-500" : ""}`}
                            >
                              {fac.vencimiento}
                            </span>
                          </strong>
                        </div>
                        <div>
                          <span className="block font-black text-[10px] text-gray-400 uppercase tracking-wider mb-1 md:mb-0.5">
                            Estatus Actual
                          </span>
                          <span
                            className={`inline-block px-2.5 py-1 md:py-0.5 font-black uppercase rounded text-[10px] md:text-[10px] ${esPagada ? "bg-green-100 text-green-800" : esVencida ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}
                          >
                            {esPagada
                              ? "Pagada"
                              : esVencida
                                ? `Vencida (${diasVencidos}d)`
                                : fac.estatus}
                          </span>
                        </div>
                      </div>

                      <div className="bg-white p-4 md:p-3 rounded-xl md:rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase mb-2 md:mb-1.5">
                          <span>Progreso de Pago</span>
                          <span className={esPagada ? "text-green-600" : ""}>
                            {porcentajeLiquidado.toFixed(1)}% Liquidado
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 md:h-2">
                          <div
                            className={`h-2.5 md:h-2 rounded-full transition-all duration-500 ${esPagada ? "bg-green-500" : esVencida ? "bg-red-500" : "bg-blue-500"}`}
                            style={{ width: `${porcentajeLiquidado}%` }}
                          ></div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-[10px] font-bold mt-3 md:mt-2 pt-3 md:pt-2 border-t border-gray-50">
                          <div className="flex flex-col">
                            <span className="text-gray-400 uppercase">
                              Facturado
                            </span>
                            <span className="text-gray-800 text-sm md:text-xs font-black">
                              ${montoTotal.toLocaleString("es-MX")}
                            </span>
                          </div>
                          <div className="flex flex-col md:border-l border-gray-100">
                            <span className="text-gray-400 uppercase">
                              Abonado
                            </span>
                            <span className="text-green-600 text-sm md:text-xs font-black">
                              ${montoAbonado.toLocaleString("es-MX")}
                            </span>
                          </div>
                          <div className="flex flex-col md:border-l border-gray-100">
                            <span className="text-gray-400 uppercase">
                              Notas crédito
                            </span>
                            <span className="text-purple-600 text-sm md:text-xs font-black">
                              ${totalNotasCredito.toLocaleString("es-MX")}
                            </span>
                          </div>
                          <div className="flex flex-col md:border-l border-gray-100">
                            <span className="text-gray-400 uppercase">
                              Faltante
                            </span>
                            <span
                              className={`text-sm md:text-xs font-black ${esPagada ? "text-green-600" : esVencida ? "text-red-600" : "text-[#0a192f]"}`}
                            >
                              ${saldoPendiente.toLocaleString("es-MX")}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-amber-100 bg-amber-50/45 px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-black uppercase tracking-wide text-amber-700 flex items-center">
                            <StickyNote className="h-3.5 w-3.5 mr-1.5" />
                            Observaciones
                          </p>

                          <span
                            className={`shrink-0 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase ${
                              observacionLimpia
                                ? "bg-white border-amber-200 text-amber-700"
                                : "bg-gray-50 border-gray-200 text-gray-500"
                            }`}
                          >
                            {observacionLimpia ? "Registrada" : "Sin registro"}
                          </span>
                        </div>

                        <p
                          className={`mt-1.5 text-[11px] leading-relaxed whitespace-pre-wrap break-words ${
                            observacionLimpia
                              ? "text-gray-700 font-medium"
                              : "text-gray-400 italic"
                          }`}
                        >
                          {observacionLimpia ||
                            "Sin observaciones registradas."}
                        </p>
                      </div>

                      <div ref={historialAbonosRef}>
                        <span className="block font-black text-[#0a192f] text-xs md:text-xs flex items-center mb-2 md:mb-2">
                          <FileText className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1 text-blue-600" />{" "}
                          Historial de Abonos
                        </span>

                        <div className="space-y-2">
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
                                    key={
                                      abono.id_abono ||
                                      `${abono.fecha}-${indice}`
                                    }
                                    className="rounded-xl border border-green-100 bg-green-50/25 p-3 text-xs"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-base font-black text-green-700">
                                          $
                                          {montoAbono.toLocaleString("es-MX")}
                                        </p>
                                        <p className="text-[10px] font-black uppercase text-gray-400">
                                          Abono registrado
                                        </p>
                                      </div>

                                      <p className="text-[10px] text-gray-500 font-bold text-right shrink-0">
                                        {formatearFechaAbono(abono.fecha)}
                                      </p>
                                    </div>

                                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-gray-600">
                                      {abono.metodo && (
                                        <p>
                                          <span className="font-black text-gray-400 uppercase tracking-wider">
                                            Método:
                                          </span>{" "}
                                          <span className="font-bold">
                                            {abono.metodo}
                                          </span>
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
                                            {Number(
                                              abono.saldo_anterior,
                                            ).toLocaleString("es-MX")}
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
                                            {Number(
                                              abono.saldo_restante,
                                            ).toLocaleString("es-MX")}
                                          </span>
                                        </p>
                                      )}
                                    </div>

                                    {abono.observaciones && (
                                      <p className="mt-2 text-[11px] text-gray-600 bg-white/75 border border-gray-100 rounded-lg p-2">
                                        {abono.observaciones}
                                      </p>
                                    )}
                                  </article>
                                );
                              })}

                              <PaginacionGlobal
                                pagina={paginaHistorialAbonos}
                                totalPaginas={totalPaginasAbonos}
                                totalRegistros={historialAbonosOrdenado.length}
                                registrosPorPagina={registrosHistorialModal}
                                registrosEnPagina={historialAbonosPaginado.length}
                                etiquetaTotal="abono(s)"
                                scrollTargetRef={historialAbonosRef}
                                onCambiarPagina={setPaginaHistorialAbonos}
                              />
                            </>
                          ) : (
                            <p className="px-3 py-6 text-center text-gray-400 font-medium italic text-xs rounded-xl border border-gray-200 bg-gray-50/70">
                              No se han registrado pagos.
                            </p>
                          )}
                        </div>
                      </div>

                      <div ref={historialNotasRef}>
                        <span className="block font-black text-[#0a192f] text-xs md:text-xs flex items-center mb-2 md:mb-2">
                          <FileText className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1 text-blue-600" />{" "}
                          Historial de Notas de Crédito
                        </span>

                        <div className="space-y-2">
                          {historialNotasCredito.length > 0 ? (
                            <>
                              {historialNotasPaginado.map((nota) => {
                                const estatus = normalizarEstatusNotaCredito(
                                  nota.estatus_historial,
                                );
                                const estilosNota =
                                  obtenerEstiloNotaCredito(estatus);
                                const esPendiente = estatus === "Pendiente";
                                const esRechazada = estatus === "Rechazada";
                                const esAnulada = estatus === "Anulada";

                                return (
                                  <article
                                    key={`${nota.id || nota.id_nota}-${estatus}`}
                                    className={`rounded-xl border ${estilosNota.borde} ${estilosNota.fondo} p-3 text-xs`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <p
                                            className={`font-black ${estilosNota.texto}`}
                                          >
                                            $
                                            {(
                                              Number(nota.monto) || 0
                                            ).toLocaleString("es-MX")}
                                          </p>

                                          <span
                                            className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase ${estilosNota.etiqueta}`}
                                          >
                                            {estatus}
                                          </span>
                                        </div>

                                        <p className="font-bold text-gray-700 mt-1">
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
                                          <strong>
                                            {nota.aplicado_por || "SU"}
                                          </strong>
                                        </p>
                                      ) : (
                                        <>
                                          <p>
                                            Solicitó:{" "}
                                            <strong>
                                              {nota.solicitado_por_nombre ||
                                                "ADMIN"}
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
                                      <div className="mt-2 bg-red-50 border border-red-100 rounded-lg p-2 text-[11px] text-red-700 leading-relaxed">
                                        <strong>Motivo de rechazo:</strong>{" "}
                                        {nota.motivo_resolucion ||
                                          "El SU rechazó la solicitud sin capturar motivo adicional."}
                                      </div>
                                    )}

                                    {esAnulada && (
                                      <div className="mt-2 bg-slate-100 border border-slate-200 rounded-lg p-2 text-[11px] text-slate-700 leading-relaxed">
                                        <strong>Nota anulada:</strong>{" "}
                                        {nota.motivo_cancelacion ||
                                          nota.motivo_anulacion ||
                                          "Reversión aplicada por SU."}
                                      </div>
                                    )}

                                    {nota.observaciones && (
                                      <p className="text-[11px] text-gray-600 mt-2 bg-white/75 border border-gray-100 rounded-lg p-2">
                                        {nota.observaciones}
                                      </p>
                                    )}
                                  </article>
                                );
                              })}

                              <PaginacionGlobal
                                pagina={paginaHistorialNotas}
                                totalPaginas={totalPaginasNotas}
                                totalRegistros={historialNotasCredito.length}
                                registrosPorPagina={registrosHistorialModal}
                                registrosEnPagina={historialNotasPaginado.length}
                                etiquetaTotal="nota(s)"
                                scrollTargetRef={historialNotasRef}
                                onCambiarPagina={setPaginaHistorialNotas}
                              />
                            </>
                          ) : (
                            <p className="px-3 py-6 text-center text-gray-400 font-medium italic text-xs rounded-xl border border-gray-200 bg-gray-50/70">
                              No se han aplicado ni solicitado notas de crédito.
                            </p>
                          )}
                        </div>
                      </div>

                      {userRole === "SU" && (
                        <button
                          type="button"
                          onClick={() => setModalActivo("confirmarEliminarFactura")}
                          className="w-full px-4 py-3 bg-red-50 text-red-700 border border-red-200 rounded-xl font-black text-xs flex items-center justify-center hover:bg-red-100 active:bg-red-100 transition-colors"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar factura
                        </button>
                      )}
                    </div>
                  );
                })()}

              {modalActivo === "confirmarEliminarFactura" &&
                facturaSeleccionada && (
                  <div className="space-y-5">
                    <div className="text-center space-y-3">
                      <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto ring-4 ring-red-50">
                        <AlertTriangle className="h-8 w-8 text-red-600" />
                      </div>

                      <div>
                        <h3 className="text-lg font-black text-[#0a192f]">
                          ¿Eliminar esta factura?
                        </h3>

                        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                          Se eliminará la factura{" "}
                          <span className="font-black text-[#0a192f]">
                            {facturaSeleccionada.folio}
                          </span>{" "}
                          de{" "}
                          <span className="font-black text-[#0a192f]">
                            {facturaSeleccionada.cliente}
                          </span>
                          .
                        </p>
                      </div>
                    </div>

                    <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-xs text-red-700 leading-relaxed">
                      Esta acción solo puede realizarla el SU. También se
                      ajustará el saldo del cliente, el crédito disponible, las
                      métricas globales y quedará registro en la bitácora.
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setModalActivo("verFactura")}
                        disabled={procesandoEliminacionFactura}
                        className="w-full px-4 py-3 bg-white text-gray-700 border border-gray-300 rounded-xl font-black text-xs hover:bg-gray-50 disabled:opacity-60"
                      >
                        Cancelar
                      </button>

                      <button
                        type="button"
                        onClick={handleEliminarFactura}
                        disabled={procesandoEliminacionFactura}
                        className="w-full px-4 py-3 bg-red-600 text-white rounded-xl font-black text-xs flex items-center justify-center hover:bg-red-700 disabled:opacity-60"
                      >
                        {procesandoEliminacionFactura ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Eliminando...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Sí, eliminar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

              {modalActivo === "editarCliente" && (
                <form
                  id="formEditarCliente"
                  onSubmit={handleGuardarEdicionCliente}
                  className="space-y-5 md:space-y-4 text-sm md:text-xs"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-3">
                    <div>
                      <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">
                        No. Cliente
                      </label>
                      <input
                        type="text"
                        value={clienteForm.numero_cliente || ""}
                        onChange={(e) =>
                          setClienteForm({
                            ...clienteForm,
                            numero_cliente: e.target.value,
                          })
                        }
                        placeholder="Ej. CLI-007"
                        className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md font-bold uppercase focus:ring-2 focus:ring-[#ffd700] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={clienteForm.nombre || ""}
                        onChange={(e) =>
                          setClienteForm({
                            ...clienteForm,
                            nombre: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md font-bold focus:ring-2 focus:ring-[#ffd700] outline-none"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:gap-3">
                    <div>
                      <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">
                        RFC
                      </label>
                      <input
                        type="text"
                        value={clienteForm.rfc || ""}
                        onChange={(e) =>
                          setClienteForm({
                            ...clienteForm,
                            rfc: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md font-mono uppercase focus:ring-2 focus:ring-[#ffd700] outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        value={clienteForm.telefono || ""}
                        onChange={(e) =>
                          setClienteForm({
                            ...clienteForm,
                            telefono: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md focus:ring-2 focus:ring-[#ffd700] outline-none"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">
                      Correo
                    </label>
                    <input
                      type="email"
                      value={clienteForm.correo || ""}
                      onChange={(e) =>
                        setClienteForm({
                          ...clienteForm,
                          correo: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md focus:ring-2 focus:ring-[#ffd700] outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">
                      Dirección
                    </label>
                    <textarea
                      value={clienteForm.direccion || ""}
                      onChange={(e) =>
                        setClienteForm({
                          ...clienteForm,
                          direccion: e.target.value,
                        })
                      }
                      rows="2"
                      className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md resize-none focus:ring-2 focus:ring-[#ffd700] outline-none"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:gap-3">
                    <div>
                      <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">
                        Grupo
                      </label>
                      <select
                        value={normalizarGrupoCliente(clienteForm.grupo)}
                        onChange={(e) =>
                          setClienteForm((prev) => ({
                            ...prev,
                            grupo: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md outline-none"
                      >
                        {GRUPOS_CLIENTE.map((grupo) => (
                          <option key={grupo.value} value={grupo.value}>
                            {grupo.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">
                        Segmentación
                      </label>
                      <select
                        value={clienteForm.segmentacion || ""}
                        onChange={(e) =>
                          setClienteForm({
                            ...clienteForm,
                            segmentacion: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md outline-none"
                      >
                        {opcionesSegmentacion.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">
                      Días de Mensaje (Aviso)
                    </label>
                    <input
                      type="number"
                      value={clienteForm.dias_mensaje || ""}
                      onChange={(e) =>
                        setClienteForm({
                          ...clienteForm,
                          dias_mensaje: e.target.value,
                        })
                      }
                      placeholder="Ej. 5"
                      className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md focus:ring-2 focus:ring-[#ffd700] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">
                      Notas Internas
                    </label>
                    <textarea
                      value={clienteForm.notas_internas || ""}
                      onChange={(e) =>
                        setClienteForm({
                          ...clienteForm,
                          notas_internas: e.target.value,
                        })
                      }
                      rows="2"
                      className="w-full px-4 py-3 md:px-3 md:py-2 bg-yellow-50/50 focus:bg-yellow-50 border border-yellow-200 rounded-xl md:rounded-md resize-none font-serif focus:ring-2 focus:ring-[#ffd700] outline-none"
                    />
                  </div>
                </form>
              )}

              {modalActivo === "registrarLineaCredito" && (
                <form
                  onSubmit={handleRegistrarMovimientoLinea}
                  className="space-y-5 md:space-y-4"
                >
                  <div className="bg-blue-50 p-4 md:p-3 rounded-xl border border-blue-100 text-blue-800 text-xs flex items-start gap-3">
                    <Shield className="h-5 w-5 md:h-4 md:w-4 shrink-0 mt-0.5" />

                    <p className="leading-relaxed">
                      Registra aquí únicamente cambios ya aprobados. El movimiento quedará en historial y actividad para auditoría del SU.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                        Tipo de movimiento
                      </label>

                      <select
                        required
                        value={lineaCreditoForm.tipo_movimiento}
                        onChange={(e) =>
                          setLineaCreditoForm({
                            ...lineaCreditoForm,
                            tipo_movimiento: e.target.value,
                            nuevo_limite: "",
                          })
                        }
                        className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md focus:ring-2 focus:ring-[#ffd700] outline-none font-bold"
                      >
                        {TIPOS_MOVIMIENTO_LINEA.map((tipo) => (
                          <option key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                        Límite actual
                      </label>

                      <input
                        type="text"
                        disabled
                        value={`$${limiteActualLinea.toLocaleString("es-MX")}`}
                        className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-100 border rounded-xl md:rounded-md font-bold text-gray-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                      {obtenerEtiquetaMontoLinea(lineaCreditoForm.tipo_movimiento)}
                    </label>

                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black">
                        $
                      </span>

                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={lineaCreditoForm.nuevo_limite}
                        onChange={(e) =>
                          setLineaCreditoForm({
                            ...lineaCreditoForm,
                            nuevo_limite: e.target.value,
                          })
                        }
                        placeholder={
                          lineaCreditoForm.tipo_movimiento === "AUMENTO"
                            ? "Ej. 1000 para sumar a la línea actual"
                            : lineaCreditoForm.tipo_movimiento === "DISMINUCION"
                              ? "Ej. 1000 para restar a la línea actual"
                              : "Ej. 3000 como límite final correcto"
                        }
                        className="w-full pl-8 pr-4 py-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md focus:ring-2 focus:ring-[#ffd700] outline-none font-black text-[#0a192f]"
                      />
                    </div>

                    <p className="mt-1 text-[10px] text-gray-500">
                      {obtenerDescripcionMontoLinea(lineaCreditoForm.tipo_movimiento)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-wide text-blue-500">
                      Resultado
                    </p>

                    <p className="mt-1 text-xl font-black text-[#0a192f]">
                      $
                      {Number.isFinite(nuevoLimitePreview)
                        ? nuevoLimitePreview.toLocaleString("es-MX")
                        : "0"}
                    </p>

                    {movimientoLineaInvalidoPorDeuda && (
                      <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700">
                        El límite resultante no puede quedar por debajo de la deuda actual.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                      Personal que autoriza
                    </label>

                    <input
                      type="text"
                      required
                      value={lineaCreditoForm.personal_autoriza}
                      onChange={(e) =>
                        setLineaCreditoForm({
                          ...lineaCreditoForm,
                          personal_autoriza: e.target.value,
                        })
                      }
                      placeholder="Ej. Lic. Flor"
                      className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md focus:ring-2 focus:ring-[#ffd700] outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                      Motivo / comentario de respaldo
                    </label>

                    <textarea
                      required
                      value={lineaCreditoForm.motivo}
                      onChange={(e) =>
                        setLineaCreditoForm({
                          ...lineaCreditoForm,
                          motivo: e.target.value,
                        })
                      }
                      rows="3"
                      placeholder="Indica por qué se registra este cambio y quién lo autorizó."
                      className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md resize-none focus:ring-2 focus:ring-[#ffd700] outline-none"
                    />
                  </div>

                  <div className="pt-4 md:border-t flex flex-col-reverse md:flex-row justify-end gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={cerrarModal}
                      disabled={procesandoCredito}
                      className="w-full md:w-auto px-4 py-3.5 md:py-2 text-sm md:text-xs font-bold text-gray-700 bg-white border rounded-xl md:rounded-lg active:bg-gray-100 disabled:opacity-50"
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      disabled={procesandoCredito || movimientoLineaInvalidoPorDeuda}
                      className="w-full md:w-auto px-5 py-3.5 md:py-2 text-sm md:text-xs font-black text-[#0a192f] bg-[#ffd700] rounded-xl md:rounded-lg active:bg-[#e6c200] flex items-center justify-center disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1.5" />
                      {procesandoCredito ? "Registrando..." : "Registrar movimiento"}
                    </button>
                  </div>
                </form>
              )}

              {modalActivo === "notificacion" && (
                <div className="text-center py-4 md:py-2 animate-fade-in">
                  <div
                    className={`h-16 w-16 md:h-14 md:w-14 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-3 ring-4 ${notificacion.tipo === "error" ? "bg-red-100 ring-red-50 text-red-600" : "bg-green-100 ring-green-50 text-green-600"}`}
                  >
                    {notificacion.tipo === "error" ? (
                      <XCircle className="h-8 w-8 md:h-7 md:w-7" />
                    ) : (
                      <CheckCircle className="h-8 w-8 md:h-7 md:w-7" />
                    )}
                  </div>
                  <h3 className="text-xl md:text-lg font-black text-[#0a192f] mb-2 md:mb-1">
                    {notificacion.titulo}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed px-2">
                    {notificacion.descripcion}
                  </p>
                </div>
              )}
            </div>

            {modalActivo !== "registrarLineaCredito" && (
              <div className="p-4 md:p-4 border-t border-gray-100 bg-white md:bg-gray-50 flex flex-col-reverse md:flex-row justify-end gap-3 md:gap-3 rounded-b-xl shrink-0">
                {modalActivo === "notificacion" ? (
                  <button
                    onClick={cerrarModal}
                    className={`w-full md:w-auto px-6 py-3.5 md:py-2 text-sm md:text-xs font-black text-white rounded-xl md:rounded-lg active:opacity-80 transition-colors ${notificacion.tipo === "error" ? "bg-red-600" : "bg-green-600"}`}
                  >
                    Aceptar
                  </button>
                ) : modalActivo === "editarCliente" ? (
                  <>
                    <button
                      type="button"
                      onClick={cerrarModal}
                      className="w-full md:w-auto px-4 py-3.5 md:py-2 text-sm md:text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-xl md:rounded-lg active:bg-gray-100"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      form="formEditarCliente"
                      className="w-full md:w-auto px-8 py-3.5 md:py-2 text-sm md:text-xs font-black text-[#0a192f] bg-[#ffd700] rounded-xl md:rounded-lg active:bg-[#e6c200]"
                    >
                      Guardar
                    </button>
                  </>
                ) : modalActivo === "verFactura" && facturaSeleccionada ? (
                  <button
                    type="button"
                    onClick={() =>
                      navigate("/facturas", {
                        state: { editarFactura: facturaSeleccionada },
                      })
                    }
                    className="w-full md:w-auto px-8 py-3.5 md:py-2 bg-amber-50 text-amber-700 border border-amber-200 font-black text-sm md:text-xs rounded-xl md:rounded-lg hover:bg-amber-100 active:bg-amber-100"
                  >
                    Editar esta factura
                  </button>
                ) : (
                  <button
                    onClick={cerrarModal}
                    className="w-full md:w-auto px-8 py-3.5 md:py-2 bg-gray-100 md:bg-[#0a192f] text-gray-800 md:text-white font-black text-sm md:text-xs rounded-xl md:rounded-lg active:bg-gray-200"
                  >
                    Cerrar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}