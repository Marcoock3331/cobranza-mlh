import { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  FileText,
  TrendingUp,
  Users,
} from "lucide-react";

import { GlobalContext } from "../context/GlobalContext";
import { useAgendaRango } from "../hooks/useAgendaRango";
import {
  agruparEventosPorDia,
  contarCategorias,
  fechaAClave,
  generarDiasRango,
  obtenerRangoAgenda,
} from "../utils/agenda";

const CATEGORIAS = {
  VENCIDAS: {
    label: "Vencidas",
    className: "bg-red-50 text-red-700 border-red-200",
    iconClassName: "bg-red-100 text-red-600",
    icon: AlertTriangle,
  },
  POR_VENCER: {
    label: "Por vencer",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    iconClassName: "bg-amber-100 text-amber-700",
    icon: Clock,
  },
  RECORDATORIOS: {
    label: "Recordatorios",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    iconClassName: "bg-blue-100 text-blue-600",
    icon: Bell,
  },
};

const FILTROS_ACTIVIDAD = [
  { id: "TODOS", label: "Todos" },
  { id: "HOY", label: "Hoy" },
  { id: "VENCIDAS", label: "Vencidas" },
  { id: "RECORDATORIOS", label: "Recordatorios" },
  { id: "PROXIMOS", label: "Próximos" },
  { id: "CREDITOS", label: "Créditos" },
];

const ESTILOS_ACTIVIDAD = {
  alerta: {
    borde: "border-red-200",
    fondo: "bg-red-50/35",
    barra: "bg-red-500",
    icono: "bg-red-100 text-red-600",
    accion: "text-red-700",
    componente: AlertTriangle,
  },
  recordatorio: {
    borde: "border-blue-200",
    fondo: "bg-blue-50/30",
    barra: "bg-blue-500",
    icono: "bg-blue-100 text-blue-600",
    accion: "text-blue-700",
    componente: Bell,
  },
  proximo: {
    borde: "border-amber-200",
    fondo: "bg-amber-50/35",
    barra: "bg-amber-500",
    icono: "bg-amber-100 text-amber-700",
    accion: "text-amber-700",
    componente: Clock,
  },
  aprobada: {
    borde: "border-green-200",
    fondo: "bg-green-50/35",
    barra: "bg-green-500",
    icono: "bg-green-100 text-green-600",
    accion: "text-green-700",
    componente: CheckCircle,
  },
  rechazada: {
    borde: "border-gray-200",
    fondo: "bg-gray-50",
    barra: "bg-gray-400",
    icono: "bg-gray-200 text-gray-600",
    accion: "text-gray-700",
    componente: FileText,
  },
  dato: {
    borde: "border-slate-200",
    fondo: "bg-slate-50/70",
    barra: "bg-slate-500",
    icono: "bg-slate-200 text-slate-700",
    accion: "text-slate-700",
    componente: Users,
  },
};

const ESTILOS_PRIORIDAD = {
  ALTA: "bg-red-100 text-red-700 border-red-200",
  HOY: "bg-blue-100 text-blue-700 border-blue-200",
  SEMANA: "bg-amber-100 text-amber-700 border-amber-200",
  PENDIENTE: "bg-purple-100 text-purple-700 border-purple-200",
  CRÉDITO: "bg-green-100 text-green-700 border-green-200",
  DATOS: "bg-slate-200 text-slate-700 border-slate-300",
};

const formatearMoneda = (valor) =>
  (Number(valor) || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const capitalizar = (texto = "") =>
  texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : "";

const formatearRangoSemana = (inicio, fin) => {
  const mismoMes =
    inicio.getMonth() === fin.getMonth() &&
    inicio.getFullYear() === fin.getFullYear();

  if (mismoMes) {
    const mesAnio = fin.toLocaleDateString("es-MX", {
      month: "long",
      year: "numeric",
    });

    return `${inicio.getDate()}–${fin.getDate()} de ${mesAnio}`;
  }

  const inicioTexto = inicio.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });

  const finTexto = fin.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `${inicioTexto}–${finTexto}`;
};

function TarjetaKPI({
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
    },
    rojo: {
      tarjeta: "border-red-200 bg-red-50/45",
      etiqueta: "text-red-600",
      valor: "text-red-600",
      icono: "bg-red-100 text-red-600",
    },
    verde: {
      tarjeta: "border-green-100 bg-green-50/30",
      etiqueta: "text-green-700",
      valor: "text-green-600",
      icono: "bg-green-100 text-green-600",
    },
    morado: {
      tarjeta: "border-purple-100 bg-purple-50/30",
      etiqueta: "text-purple-700",
      valor: "text-[#0a192f]",
      icono: "bg-purple-100 text-purple-600",
    },
  };

  const estilos = variantes[variante] || variantes.azul;

  return (
    <article
      className={`p-4 md:p-5 rounded-2xl border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${estilos.tarjeta}`}
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
          className="mt-3 text-xs font-black text-blue-700 flex items-center hover:text-blue-900"
        >
          {textoAccion}
          <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </button>
      )}
    </article>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { stats, solicitudes, userRole, clientes } =
    useContext(GlobalContext);

  const [panelExpandido, setPanelExpandido] = useState(false);
  const [filtroActividad, setFiltroActividad] = useState("TODOS");

  const rangoSemana = useMemo(
    () => obtenerRangoAgenda(new Date(), "SEMANA"),
    [],
  );

  const { eventos, cargando } = useAgendaRango(
    rangoSemana.inicio,
    rangoSemana.fin,
  );

  const eventosActivos = useMemo(
    () =>
      eventos.filter(
        (evento) =>
          evento.origen === "FACTURA" ||
          !["Completado", "Cancelado"].includes(evento.estatus),
      ),
    [eventos],
  );

  const eventosPorDia = useMemo(
    () => agruparEventosPorDia(eventosActivos),
    [eventosActivos],
  );

  const diasSemana = useMemo(
    () => generarDiasRango(rangoSemana.inicio, rangoSemana.fin),
    [rangoSemana],
  );

  const resumenSemana = useMemo(
    () => contarCategorias(eventosActivos),
    [eventosActivos],
  );

  const claveHoy = fechaAClave(new Date());

  const recordatoriosHoy = useMemo(
    () =>
      eventosActivos.filter(
        (evento) =>
          evento.origen === "COMPROMISO" &&
          evento.fechaClave === claveHoy,
      ),
    [eventosActivos, claveHoy],
  );

  const vencimientosHoy = useMemo(
    () =>
      eventosActivos.filter(
        (evento) =>
          evento.categoria === "POR_VENCER" &&
          evento.fechaClave === claveHoy,
      ),
    [eventosActivos, claveHoy],
  );

  const recordatoriosAtrasados = useMemo(
    () =>
      eventosActivos.filter(
        (evento) =>
          evento.origen === "COMPROMISO" &&
          evento.fechaClave < claveHoy,
      ),
    [eventosActivos, claveHoy],
  );

  const recordatoriosProximos = useMemo(
    () =>
      eventosActivos.filter(
        (evento) =>
          evento.origen === "COMPROMISO" &&
          evento.fechaClave > claveHoy,
      ),
    [eventosActivos, claveHoy],
  );

  const clientesSinTelefonoConSaldo = useMemo(
    () =>
      (clientes || []).filter((cliente) => {
        const activo =
          cliente?.activo !== false &&
          cliente?.estatus !== "Inactivo";

        const tieneSaldo = Number(cliente?.deuda_actual) > 0;
        const telefono = String(cliente?.telefono || "").replace(/\D/g, "");

        return activo && tieneSaldo && telefono.length < 10;
      }),
    [clientes],
  );

  const fechaActualTexto = new Date().toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const solicitudesPendientes = useMemo(
    () =>
      (solicitudes || []).filter(
        (solicitud) => solicitud.estatus === "Pendiente",
      ),
    [solicitudes],
  );

  const abrirCalendario = (fecha, filtro = "TODOS", vista = "SEMANA") => {
    navigate(
      `/calendario?fecha=${fechaAClave(fecha)}&vista=${vista}&filtro=${filtro}`,
    );
  };

  const abrirFacturasVencidas = () => {
    navigate("/facturas?estado=Vencida");
  };

  const notificacionesFeed = useMemo(() => {
    const feed = [];
    const totalVencidas = Number(stats?.facturas_vencidas) || 0;

    recordatoriosAtrasados.forEach((recordatorio, indice) => {
      const descripcion =
        recordatorio.motivo ||
        recordatorio.titulo ||
        "Actividad pendiente de una fecha anterior.";

      feed.push({
        id: `recordatorio-atrasado-${recordatorio.id}`,
        tipo: "alerta",
        prioridad: "ALTA",
        categoriaActividad: "RECORDATORIOS",
        esHoy: false,
        orden: 10 + indice,
        titulo: "Recordatorio atrasado",
        descripcion: [
          descripcion,
          recordatorio.cliente || "",
          recordatorio.folio ? `Folio ${recordatorio.folio}` : "",
        ]
          .filter(Boolean)
          .join(" • "),
        fecha: `Programado para ${recordatorio.fechaClave}`,
        accionTexto: "Atender recordatorio",
        ruta: `/calendario?fecha=${recordatorio.fechaClave}&vista=DIA&filtro=RECORDATORIOS`,
      });
    });

    recordatoriosHoy.forEach((recordatorio, indice) => {
      const contexto = [
        recordatorio.cliente,
        recordatorio.folio ? `Folio ${recordatorio.folio}` : "",
      ]
        .filter(Boolean)
        .join(" • ");

      const descripcionBase =
        recordatorio.motivo ||
        recordatorio.titulo ||
        "Recordatorio programado para hoy.";

      feed.push({
        id: `recordatorio-hoy-${recordatorio.id}`,
        tipo: "recordatorio",
        prioridad: "HOY",
        categoriaActividad: "RECORDATORIOS",
        esHoy: true,
        orden: 30 + indice,
        titulo: recordatorio.titulo || "Recordatorio de hoy",
        descripcion: contexto
          ? `${descripcionBase} • ${contexto}`
          : descripcionBase,
        fecha: "Programado para hoy",
        accionTexto: "Abrir recordatorio",
        ruta: `/calendario?fecha=${claveHoy}&vista=DIA&filtro=RECORDATORIOS`,
      });
    });

    if (vencimientosHoy.length > 0) {
      feed.push({
        id: "vencimientos-hoy",
        tipo: "proximo",
        prioridad: "HOY",
        categoriaActividad: "PROXIMOS",
        esHoy: true,
        orden: 20,
        titulo: "Facturas que vencen hoy",
        descripcion: `${vencimientosHoy.length} factura(s) requieren seguimiento antes de terminar el día.`,
        fecha: "Vencimiento de hoy",
        accionTexto: "Ver vencimientos",
        ruta: `/calendario?fecha=${claveHoy}&vista=DIA&filtro=POR_VENCER`,
      });
    }

    if (totalVencidas > 0) {
      feed.push({
        id: "resumen-vencidas",
        tipo: "alerta",
        prioridad: "ALTA",
        categoriaActividad: "VENCIDAS",
        esHoy: false,
        orden: 5,
        titulo: "Facturas vencidas",
        descripcion: `${totalVencidas} factura(s) requieren seguimiento de cobranza. Abre la bandeja filtrada para registrar pagos o dar seguimiento.`,
        fecha: "Cartera actual",
        accionTexto: "Abrir cobranza vencida",
        ruta: "/facturas?estado=Vencida",
      });
    }

    if (resumenSemana.POR_VENCER > vencimientosHoy.length) {
      const restantes = resumenSemana.POR_VENCER - vencimientosHoy.length;

      feed.push({
        id: "resumen-por-vencer",
        tipo: "proximo",
        prioridad: "SEMANA",
        categoriaActividad: "PROXIMOS",
        esHoy: false,
        orden: 50,
        titulo: "Próximos vencimientos",
        descripcion: `${restantes} factura(s) adicionales vencen durante la semana actual.`,
        fecha: "Semana actual",
        accionTexto: "Abrir agenda semanal",
        ruta: `/calendario?fecha=${claveHoy}&vista=SEMANA&filtro=POR_VENCER`,
      });
    }

    if (recordatoriosProximos.length > 0) {
      feed.push({
        id: "recordatorios-proximos",
        tipo: "recordatorio",
        prioridad: "SEMANA",
        categoriaActividad: "RECORDATORIOS",
        esHoy: false,
        orden: 60,
        titulo: "Recordatorios próximos",
        descripcion: `${recordatoriosProximos.length} actividad(es) manuales permanecen programadas para los próximos días de esta semana.`,
        fecha: "Semana actual",
        accionTexto: "Ver recordatorios",
        ruta: `/calendario?fecha=${claveHoy}&vista=SEMANA&filtro=RECORDATORIOS`,
      });
    }

    if (solicitudesPendientes.length > 0) {
      feed.push({
        id: "solicitudes-pendientes",
        tipo: "recordatorio",
        prioridad: "PENDIENTE",
        categoriaActividad: "CREDITOS",
        esHoy: false,
        orden: 40,
        titulo:
          userRole === "SU"
            ? "Solicitudes pendientes de autorización"
            : "Solicitudes de crédito en revisión",
        descripcion:
          userRole === "SU"
            ? `${solicitudesPendientes.length} solicitud(es) necesitan autorización o rechazo.`
            : `${solicitudesPendientes.length} solicitud(es) enviadas esperan resolución del SU.`,
        fecha: "En espera de resolución",
        accionTexto:
          userRole === "SU" ? "Revisar solicitudes" : "Ver clientes",
        ruta: userRole === "SU" ? "/panel-su" : "/clientes",
      });
    }

    (solicitudes || [])
      .filter((solicitud) => solicitud.estatus !== "Pendiente")
      .slice(0, 4)
      .forEach((solicitud, indice) => {
        const esAprobada = ["Autorizado", "Aprobado"].includes(
          solicitud.estatus,
        );

        const monto =
          Number(solicitud.nuevo_limite_propuesto) ||
          Number(solicitud.monto_incremento) ||
          0;

        feed.push({
          id: `solicitud-${solicitud.id}`,
          tipo: esAprobada ? "aprobada" : "rechazada",
          prioridad: "CRÉDITO",
          categoriaActividad: "CREDITOS",
          esHoy: false,
          orden: 80 + indice,
          titulo: `Crédito ${solicitud.estatus}`,
          descripcion: `${solicitud.cliente || "Cliente"}: línea de crédito relacionada por $${formatearMoneda(monto)}.`,
          fecha: solicitud.fecha || "Movimiento reciente",
          accionTexto:
            userRole === "SU" ? "Abrir panel SU" : "Abrir directorio",
          ruta: userRole === "SU" ? "/panel-su" : "/clientes",
        });
      });

    if (clientesSinTelefonoConSaldo.length > 0) {
      feed.push({
        id: "clientes-sin-telefono",
        tipo: "dato",
        prioridad: "DATOS",
        categoriaActividad: "DATOS",
        esHoy: false,
        orden: 95,
        titulo: "Datos de contacto incompletos",
        descripcion: `${clientesSinTelefonoConSaldo.length} cliente(s) con saldo pendiente no tienen un teléfono válido para seguimiento.`,
        fecha: "Revisión de expedientes",
        accionTexto: "Completar contactos",
        ruta: "/clientes?filtro=contacto-incompleto",
      });
    }

    return feed.sort((primera, segunda) => primera.orden - segunda.orden);
  }, [
    stats,
    resumenSemana,
    solicitudes,
    userRole,
    solicitudesPendientes,
    recordatoriosHoy,
    recordatoriosAtrasados,
    recordatoriosProximos,
    vencimientosHoy,
    clientesSinTelefonoConSaldo,
    claveHoy,
  ]);

  const conteosActividad = useMemo(
    () => ({
      TODOS: notificacionesFeed.length,
      HOY: recordatoriosHoy.length + vencimientosHoy.length,
      VENCIDAS: Number(stats?.facturas_vencidas) || 0,
      RECORDATORIOS:
        recordatoriosAtrasados.length +
        recordatoriosHoy.length +
        recordatoriosProximos.length,
      PROXIMOS: resumenSemana.POR_VENCER || 0,
      CREDITOS: solicitudesPendientes.length,
    }),
    [
      notificacionesFeed,
      recordatoriosHoy,
      recordatoriosAtrasados,
      recordatoriosProximos,
      vencimientosHoy,
      stats,
      resumenSemana,
      solicitudesPendientes,
    ],
  );

  const notificacionesFiltradas = useMemo(() => {
    if (filtroActividad === "TODOS") {
      return notificacionesFeed;
    }

    if (filtroActividad === "HOY") {
      return notificacionesFeed.filter(
        (notificacion) => notificacion.esHoy,
      );
    }

    return notificacionesFeed.filter(
      (notificacion) =>
        notificacion.categoriaActividad === filtroActividad,
    );
  }, [notificacionesFeed, filtroActividad]);

  const notificacionesVisibles = panelExpandido
    ? notificacionesFiltradas
    : notificacionesFiltradas.slice(0, 4);

  return (
    <div className="flex flex-col space-y-4 md:space-y-6 relative pb-6 text-sm animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mt-2 md:mt-4 gap-2 md:gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-[#0a192f] flex items-center tracking-tight">
            <BarChart3 className="h-5 w-5 md:h-6 md:w-6 mr-2 text-blue-600" />
            Resumen Financiero
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1">
            Estado general de cobranza y agenda operativa de la semana.
          </p>
        </div>

        <div className="hidden sm:block text-left md:text-right">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
            Fecha actual
          </p>
          <p className="text-xs md:text-sm font-black text-[#0a192f] capitalize">
            {fechaActualTexto}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <TarjetaKPI
          etiqueta="Cartera total"
          valor={`$${formatearMoneda(stats?.cartera_total)}`}
          descripcion="Dinero total actualmente colocado."
          icono={DollarSign}
          variante="azul"
        />

        <TarjetaKPI
          etiqueta="Cartera vencida"
          valor={`$${formatearMoneda(stats?.cartera_vencida)}`}
          descripcion={`${
            stats?.cartera_total
              ? (
                  (Number(stats.cartera_vencida) /
                    Number(stats.cartera_total)) *
                  100
                ).toFixed(1)
              : 0
          }% de la cartera total.`}
          icono={AlertTriangle}
          variante="rojo"
          accion={abrirFacturasVencidas}
          textoAccion="Ver Facturación y Cobranza"
        />

        <TarjetaKPI
          etiqueta="Ingresos del mes"
          valor={`$${formatearMoneda(stats?.ingresos_mes)}`}
          descripcion="Flujo de caja recuperado durante el mes."
          icono={TrendingUp}
          variante="verde"
        />

        <TarjetaKPI
          etiqueta="Clientes activos"
          valor={stats?.clientes_activos || 0}
          descripcion="Expedientes comerciales activos."
          icono={Users}
          variante="morado"
          accion={() => navigate("/clientes")}
          textoAccion="Ver directorio completo"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6 items-start">
        <section className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 md:p-5 border-b border-gray-100">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <CalendarDays className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <h2 className="font-black text-[#0a192f] text-base md:text-lg">
                      Flujo semanal
                    </h2>

                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatearRangoSemana(
                        rangoSemana.inicio,
                        new Date(rangoSemana.fin.getTime() - 1),
                      )}
                    </p>

                    <p className="text-[10px] md:text-[11px] text-gray-400 mt-1 leading-relaxed">
                      Selecciona un día para abrir su agenda completa o una
                      categoría para consultar únicamente ese tipo de actividad.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {Object.entries(CATEGORIAS).map(
                    ([categoria, configuracion]) => {
                      const Icono = configuracion.icon;
                      const cantidad = resumenSemana[categoria] || 0;

                      return (
                        <button
                          key={categoria}
                          type="button"
                          onClick={() =>
                            abrirCalendario(
                              rangoSemana.inicio,
                              categoria,
                              "SEMANA",
                            )
                          }
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black ${configuracion.className}`}
                        >
                          <Icono className="h-3.5 w-3.5" />
                          <span>{configuracion.label}</span>
                          <span className="min-w-5 h-5 px-1.5 rounded-full bg-white/90 flex items-center justify-center">
                            {cantidad}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => abrirCalendario(new Date())}
                className="w-full lg:w-auto px-4 py-3 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl text-xs font-black flex items-center justify-center hover:bg-blue-100 shrink-0"
              >
                Ir al calendario
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            </div>
          </div>

          <div className="p-3 md:p-4 bg-gray-50/70">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {diasSemana.map((fecha) => {
                const clave = fechaAClave(fecha);
                const eventosDia = eventosPorDia[clave] || [];
                const conteos = contarCategorias(eventosDia);
                const esHoy = clave === claveHoy;
                const nombreDia = capitalizar(
                  fecha.toLocaleDateString("es-MX", {
                    weekday: "long",
                  }),
                );

                return (
                  <article
                    key={clave}
                    className={`relative overflow-hidden rounded-2xl border bg-white ${
                      esHoy
                        ? "border-blue-200 shadow-sm"
                        : "border-gray-200"
                    }`}
                  >
                    <div
                      className={`h-1 w-full ${
                        esHoy ? "bg-blue-600" : "bg-transparent"
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() => abrirCalendario(fecha, "TODOS", "DIA")}
                      className={`w-full px-4 pt-3 pb-3 text-left border-b ${
                        esHoy
                          ? "border-blue-100 bg-blue-50/45"
                          : "border-gray-100 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">
                            {nombreDia}
                          </p>

                          <div className="flex items-end gap-2 mt-1">
                            <strong className="text-2xl leading-none text-[#0a192f]">
                              {fecha.getDate()}
                            </strong>

                            <span className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">
                              {fecha.toLocaleDateString("es-MX", {
                                month: "short",
                              })}
                            </span>
                          </div>
                        </div>

                        {esHoy && (
                          <span className="text-[9px] bg-blue-600 text-white px-2.5 py-1 rounded-full font-black uppercase tracking-wide">
                            Hoy
                          </span>
                        )}
                      </div>
                    </button>

                    <div className="p-3 min-h-[128px]">
                      {cargando ? (
                        <div className="h-full min-h-[102px] rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-gray-400">
                            Cargando agenda...
                          </span>
                        </div>
                      ) : eventosDia.length ? (
                        <div className="space-y-2">
                          {Object.entries(CATEGORIAS).map(
                            ([categoria, configuracion]) => {
                              const cantidad = conteos[categoria] || 0;
                              if (!cantidad) return null;

                              const Icono = configuracion.icon;

                              return (
                                <button
                                  key={categoria}
                                  type="button"
                                  onClick={() =>
                                    abrirCalendario(fecha, categoria, "DIA")
                                  }
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 border rounded-xl text-left ${configuracion.className}`}
                                >
                                  <span
                                    className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${configuracion.iconClassName}`}
                                  >
                                    <Icono className="h-4 w-4" />
                                  </span>

                                  <span className="min-w-0 flex-1">
                                    <span className="block text-[11px] font-black uppercase leading-tight">
                                      {configuracion.label}
                                    </span>

                                    <span className="block text-[9px] opacity-70 mt-0.5">
                                      Abrir detalle del día
                                    </span>
                                  </span>

                                  <span className="min-w-7 h-7 px-2 rounded-full bg-white/95 border border-white flex items-center justify-center text-[11px] font-black shrink-0">
                                    {cantidad}
                                  </span>
                                </button>
                              );
                            },
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => abrirCalendario(fecha, "TODOS", "DIA")}
                          className="w-full min-h-[102px] rounded-xl border border-dashed border-gray-200 bg-gray-50/70 flex flex-col items-center justify-center text-gray-400"
                        >
                          <CheckCircle className="h-6 w-6 text-gray-300" />
                          <span className="text-[10px] font-black mt-2">
                            Sin pendientes
                          </span>
                          <span className="text-[9px] mt-0.5">
                            Abrir agenda del día
                          </span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-fit">
          <div className="p-4 border-b border-gray-100 bg-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-black text-[#0a192f] flex items-center text-sm md:text-base">
                  <Bell className="h-4 w-4 md:h-5 md:w-5 mr-2 text-blue-600 shrink-0" />
                  Centro de actividad
                </h2>

                <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                  Acciones prioritarias y movimientos recientes.
                </p>
              </div>

              <span className="bg-blue-50 text-blue-700 text-[10px] font-black min-w-7 h-7 px-2 rounded-full border border-blue-100 flex items-center justify-center shrink-0">
                {notificacionesFiltradas.length}
              </span>
            </div>

            <div className="flex gap-2 overflow-x-auto mt-3 pb-1 custom-scrollbar">
              {FILTROS_ACTIVIDAD.map((filtro) => {
                const cantidad = conteosActividad[filtro.id] || 0;

                return (
                  <button
                    key={filtro.id}
                    type="button"
                    onClick={() => {
                      setFiltroActividad(filtro.id);
                      setPanelExpandido(false);
                    }}
                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[9px] font-black transition-colors ${
                      filtroActividad === filtro.id
                        ? "bg-[#0a192f] border-[#0a192f] text-white"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <span>{filtro.label}</span>
                    <span
                      className={`min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center ${
                        filtroActividad === filtro.id
                          ? "bg-white/15 text-white"
                          : "bg-white text-gray-600 border border-gray-200"
                      }`}
                    >
                      {cantidad}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className={
              panelExpandido
                ? "max-h-[620px] overflow-y-auto custom-scrollbar p-3 space-y-2"
                : "p-3 space-y-2"
            }
          >
            {notificacionesVisibles.length ? (
              notificacionesVisibles.map((notificacion) => {
                const estilo =
                  ESTILOS_ACTIVIDAD[notificacion.tipo] ||
                  ESTILOS_ACTIVIDAD.recordatorio;

                const Icono = estilo.componente;

                return (
                  <button
                    key={notificacion.id}
                    type="button"
                    onClick={() => navigate(notificacion.ruta)}
                    className={`w-full relative overflow-hidden rounded-xl border text-left ${estilo.borde} ${estilo.fondo} hover:brightness-[0.99] focus:outline-none focus:ring-2 focus:ring-blue-200`}
                  >
                    <span
                      className={`absolute left-0 top-0 bottom-0 w-1 ${estilo.barra}`}
                    />

                    <span className="flex items-start gap-3 p-3 pl-4">
                      <span
                        className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${estilo.icono}`}
                      >
                        <Icono className="h-4 w-4" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] md:text-xs font-black text-[#0a192f] leading-snug">
                            {notificacion.titulo}
                          </span>

                          {notificacion.prioridad &&
                            ["ALTA", "HOY", "PENDIENTE"].includes(
                              notificacion.prioridad,
                            ) && (
                              <span
                                className={`rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wide ${
                                  ESTILOS_PRIORIDAD[
                                    notificacion.prioridad
                                  ] ||
                                  "bg-gray-100 text-gray-600 border-gray-200"
                                }`}
                              >
                                {notificacion.prioridad}
                              </span>
                            )}
                        </span>

                        <span
                          className={`block text-[10px] text-gray-600 mt-1 leading-relaxed break-words ${
                            panelExpandido
                              ? "whitespace-normal"
                              : "line-clamp-2"
                          }`}
                        >
                          {notificacion.descripcion}
                        </span>

                        <span className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-[8px] text-gray-400 flex items-center min-w-0">
                            <Clock className="h-3 w-3 mr-1 shrink-0" />
                            <span className="truncate">
                              {notificacion.fecha}
                            </span>
                          </span>

                          <span
                            className={`text-[8px] font-black flex items-center shrink-0 ${estilo.accion}`}
                          >
                            {notificacion.accionTexto || "Abrir"}
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </span>
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="py-10 px-4 text-center rounded-xl border border-dashed border-gray-200 bg-gray-50/70 text-gray-400">
                <CheckCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-[11px] font-black">
                  Sin actividades pendientes
                </p>
                <p className="text-[9px] mt-1 leading-relaxed">
                  No existen acciones para el filtro seleccionado.
                </p>

                {filtroActividad !== "TODOS" && (
                  <button
                    type="button"
                    onClick={() => setFiltroActividad("TODOS")}
                    className="mt-3 text-[9px] font-black text-blue-600"
                  >
                    Mostrar todas
                  </button>
                )}
              </div>
            )}
          </div>

          {notificacionesFiltradas.length > 4 && (
            <div className="p-2 border-t border-gray-100 bg-gray-50/70">
              <button
                type="button"
                onClick={() =>
                  setPanelExpandido((actual) => !actual)
                }
                className="w-full py-2 text-[10px] font-black text-gray-500 flex items-center justify-center hover:text-[#0a192f]"
              >
                {panelExpandido ? (
                  <>
                    Contraer
                    <ChevronUp className="h-4 w-4 ml-1" />
                  </>
                ) : (
                  <>
                    Ver todas ({notificacionesFiltradas.length})
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </>
                )}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}