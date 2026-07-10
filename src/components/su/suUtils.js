import { textoSeguro } from "../../utils/normalizadores";

export const SOLICITUDES_POR_PAGINA = 8;
export const ACTIVIDAD_POR_PAGINA = 10;
export const RESUMENES_LINEA_POR_PAGINA = 10;
export const MOVIMIENTOS_LINEA_POR_PAGINA = 6;
export const NOTAS_CLIENTES_POR_PAGINA = 10;
export const NOTAS_HISTORIAL_POR_PAGINA = 6;
export const ABONOS_REPORTE_POR_PAGINA = 10;


export const TABS_PANEL_SU = [
  {
    id: "resumen",
    label: "Resumen Ejecutivo",
    descripcion: "Vista rápida del estado operativo.",
  },
  {
    id: "usuarios",
    label: "Control de Personal",
    descripcion: "Administración de accesos ADMIN.",
  },
  {
    id: "creditos",
    label: "Gestión de Créditos",
    descripcion: "Notas de crédito y líneas de crédito.",
  },
  {
    id: "actividad",
    label: "Auditoría",
    descripcion: "Registro completo de eventos.",
  },
  {
    id: "abonos",
    label: "Reporte de Abonos",
    descripcion: "Pagos registrados y limpieza de pruebas.",
  },
];

export const FILTROS_SOLICITUDES = [
  { id: "PENDIENTES", label: "Pendientes" },
  { id: "RESUELTAS", label: "Resueltas" },
  { id: "TODAS", label: "Todas" },
];


export const FILTROS_NOTAS_CREDITO = [
  { id: "TODAS", label: "Todas" },
  { id: "Pendiente", label: "Pendientes" },
  { id: "Autorizado", label: "Autorizadas" },
  { id: "Rechazado", label: "Rechazadas" },
  { id: "Anulada", label: "Anuladas" },
];

export const FILTROS_LINEA_CREDITO = [
  { id: "TODOS", label: "Todos" },
  { id: "AUMENTO", label: "Aumentos" },
  { id: "DISMINUCION", label: "Disminuciones" },
  { id: "CORRECCION", label: "Correcciones" },
  { id: "ALTA_INICIAL", label: "Alta inicial" },
  { id: "SUSPENSION", label: "Suspensión" },
  { id: "REACTIVACION", label: "Reactivación" },
];

export const ESTILOS_SOLICITUD = {
  Pendiente: {
    punto: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    monto: "text-amber-700",
  },
  Autorizado: {
    punto: "bg-green-500",
    badge: "bg-green-50 text-green-700 border-green-200",
    monto: "text-green-700",
  },
  Rechazado: {
    punto: "bg-red-500",
    badge: "bg-red-50 text-red-700 border-red-200",
    monto: "text-red-700",
  },
  Anulada: {
    punto: "bg-slate-400",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    monto: "text-slate-600",
  },
};

export const ETIQUETAS_CAMBIOS_FACTURA = {
  cliente_id: "Cliente",
  grupo: "Grupo",
  folio: "Folio",
  monto_total: "Monto total",
  emision: "Emisión",
  vencimiento: "Vencimiento",
  observaciones: "Observaciones",
};

export const formatearMoneda = (valor, decimales = 0) =>
  (Number(valor) || 0).toLocaleString("es-MX", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: 2,
  });

export const obtenerEstiloSolicitud = (estatus = "") =>
  ESTILOS_SOLICITUD[textoSeguro(estatus, "Pendiente")] ||
  ESTILOS_SOLICITUD.Pendiente;

export const formatearCambioFactura = (campo, valor) => {
  if (campo === "monto_total") {
    return `$${formatearMoneda(valor, 2)}`;
  }

  if (campo === "emision" || campo === "vencimiento") {
    const fecha = String(valor || "");

    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      const [anio, mes, dia] = fecha.split("-");
      return `${dia}/${mes}/${anio}`;
    }
  }

  return textoSeguro(valor, "Sin datos") || "Sin datos";
};

export const formatearFechaFirestore = (valor) => {
  const fecha =
    valor?.toDate?.() ||
    (typeof valor?.seconds === "number"
      ? new Date(valor.seconds * 1000)
      : valor
        ? new Date(valor)
        : null);

  if (!fecha || Number.isNaN(fecha.getTime())) {
    return "Sin fecha";
  }

  return fecha.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const obtenerTiempoFirestore = (valor) =>
  valor?.toDate?.().getTime?.() ||
  (typeof valor?.seconds === "number" ? valor.seconds * 1000 : 0) ||
  (valor instanceof Date ? valor.getTime() : 0) ||
  new Date(valor || 0).getTime() ||
  0;

export const obtenerTiempoSolicitud = (solicitud = {}) =>
  obtenerTiempoFirestore(solicitud.resolvedAt) ||
  obtenerTiempoFirestore(solicitud.createdAt) ||
  obtenerTiempoFirestore(solicitud.fecha);

export const ordenarSolicitudesOperativas = (lista = []) =>
  [...lista].sort((a, b) => {
    if ((a.estatus === "Pendiente") !== (b.estatus === "Pendiente")) {
      return a.estatus === "Pendiente" ? -1 : 1;
    }

    return obtenerTiempoSolicitud(b) - obtenerTiempoSolicitud(a);
  });

export const coincideFiltroSolicitud = (solicitud, filtro) => {
  if (filtro === "PENDIENTES") return solicitud.estatus === "Pendiente";
  if (filtro === "RESUELTAS") return solicitud.estatus !== "Pendiente";
  return true;
};

export const obtenerConteosSolicitudes = (solicitudes = []) => ({
  PENDIENTES: solicitudes.filter((solicitud) =>
    coincideFiltroSolicitud(solicitud, "PENDIENTES"),
  ).length,
  RESUELTAS: solicitudes.filter((solicitud) =>
    coincideFiltroSolicitud(solicitud, "RESUELTAS"),
  ).length,
  TODAS: solicitudes.length,
});

export const normalizarBusqueda = (valor = "") =>
  valor
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const actividadEsCritica = (actividad = {}) => {
  const tipo = normalizarBusqueda(actividad.tipo);
  const detalle = normalizarBusqueda(actividad.detalle);

  return [
    "eliminacion",
    "eliminación",
    "disminucion",
    "disminución",
    "inactivacion",
    "inactivación",
    "rechazo",
    "suspension",
    "suspensión",
  ].some((palabra) => tipo.includes(palabra) || detalle.includes(palabra));
};
