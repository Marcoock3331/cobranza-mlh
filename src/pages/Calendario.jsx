import { useContext, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Select from "react-select";
import {
  AlertTriangle,
  Bell,
  Calendar as CalendarIcon,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Loader2,
  MessageCircle,
  Plus,
  Send,
  Smartphone,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { GlobalContext } from "../context/GlobalContext";
import { useAgendaRango } from "../hooks/useAgendaRango";
import { calendarioConsultaService } from "../services/calendarioConsultaService";
import { compromisosService } from "../services/compromisosService";
import {
  agruparEventosPorDia,
  claveAFecha,
  contarCategorias,
  fechaAClave,
  formatearPeriodo,
  generarDiasRango,
  obtenerRangoAgenda,
  sumarDias,
} from "../utils/agenda";
import { generarMensajeWA, normalizarTelefonoMX } from "../utils/whatsapp";

const VISTAS = [
  { value: "DIA", label: "Día" },
  { value: "SEMANA", label: "Semana" },
  { value: "MES", label: "Mes" },
];

const FILTROS = [
  { value: "TODOS", label: "Todos" },
  { value: "VENCIDAS", label: "Vencidas" },
  { value: "POR_VENCER", label: "Por vencer" },
  { value: "RECORDATORIOS", label: "Recordatorios" },
];

const CATEGORIAS = {
  VENCIDAS: {
    etiqueta: "Vencidas",
    chip: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
    tarjeta: "border-red-200 bg-red-50/40",
    icono: AlertTriangle,
  },
  POR_VENCER: {
    etiqueta: "Por vencer",
    chip: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
    tarjeta: "border-amber-200 bg-amber-50/40",
    icono: Clock3,
  },
  RECORDATORIOS: {
    etiqueta: "Recordatorios",
    chip: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    tarjeta: "border-blue-200 bg-blue-50/40",
    icono: Bell,
  },
};

const ESTADO_FORMULARIO = {
  tipoVinculo: "GENERAL",
  titulo: "",
  motivo: "",
  tipoEvento: "Recordatorio",
  fecha: fechaAClave(new Date()),
  clienteId: "",
  facturaId: "",
};

const formatearMoneda = (valor) =>
  (Number(valor) || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

const mismoDia = (primera, segunda) =>
  fechaAClave(primera) === fechaAClave(segunda);

const esEstadoFinal = (estatus) =>
  ["Completado", "Cancelado"].includes(estatus);

function ContadorCategoria({ categoria, cantidad, onClick, compacto = false }) {
  if (!cantidad) return null;

  const configuracion = CATEGORIAS[categoria];
  const Icono = configuracion.icono;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full flex items-center justify-between gap-2 border rounded-xl shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${configuracion.chip} ${
        compacto
          ? "px-2.5 py-1.5 text-[10px] md:text-[11px]"
          : "px-3.5 py-2.5 text-[11px] md:text-xs"
      } font-black uppercase tracking-wide`}
    >
      <span className="flex items-center min-w-0">
        <span
          className={`mr-2 shrink-0 rounded-lg bg-white/80 border border-current/10 flex items-center justify-center ${
            compacto ? "h-6 w-6" : "h-7 w-7"
          }`}
        >
          <Icono className={compacto ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </span>
        <span className="truncate leading-none">
          {configuracion.etiqueta}
        </span>
      </span>

      <span
        className={`rounded-full bg-white border border-current/10 shadow-sm leading-none ${
          compacto
            ? "min-w-6 px-1.5 py-1 text-[10px]"
            : "min-w-7 px-2 py-1.5 text-[11px]"
        } text-center`}
      >
        {cantidad}
      </span>
    </button>
  );
}

function ModalBase({ children, onClose, maxWidth = "max-w-2xl" }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-3 backdrop-blur-sm md:items-center md:p-4">
      <div
        className={`flex max-h-[92dvh] w-full ${maxWidth} flex-col overflow-hidden rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl md:rounded-2xl md:pb-0`}
      >
        <div className="md:hidden h-1.5 w-12 bg-gray-200 rounded-full mx-auto mt-3 shrink-0" />
        <button
          type="button"
          onClick={onClose}
          className="absolute opacity-0 pointer-events-none"
          aria-label="Cerrar"
        />
        {children}
      </div>
    </div>
  );
}

export default function Calendario() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clientes, userName, userRole, currentUser } = useContext(GlobalContext);

  const fechaInicial = useMemo(() => {
    const fechaURL = claveAFecha(searchParams.get("fecha"));
    return fechaURL || new Date();
  }, [searchParams]);

  const vistaInicial = ["DIA", "SEMANA", "MES"].includes(
    searchParams.get("vista"),
  )
    ? searchParams.get("vista")
    : "SEMANA";

  const filtroInicial = [
    "TODOS",
    "VENCIDAS",
    "POR_VENCER",
    "RECORDATORIOS",
  ].includes(searchParams.get("filtro"))
    ? searchParams.get("filtro")
    : "TODOS";

  const [fechaActual, setFechaActual] = useState(fechaInicial);
  const [vista, setVista] = useState(vistaInicial);
  const [filtro, setFiltro] = useState(filtroInicial);
  const [mostrarResueltos, setMostrarResueltos] = useState(false);

  const [modalActivo, setModalActivo] = useState("");
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("TODOS");
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");

  const [formulario, setFormulario] = useState(ESTADO_FORMULARIO);
  const [facturasCliente, setFacturasCliente] = useState([]);
  const [cargandoFacturasCliente, setCargandoFacturasCliente] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [datosWhatsapp, setDatosWhatsapp] = useState({
    telefono: "",
    plantilla: "manual",
    mensaje: "",
  });

  const rango = useMemo(
    () => obtenerRangoAgenda(fechaActual, vista),
    [fechaActual, vista],
  );

  const { eventos, cargando, error } = useAgendaRango(rango.inicio, rango.fin);

  const eventosBaseVisibles = useMemo(
    () =>
      eventos.filter(
        (evento) =>
          evento.origen === "FACTURA" ||
          mostrarResueltos ||
          !esEstadoFinal(evento.estatus),
      ),
    [eventos, mostrarResueltos],
  );

  const eventosVisibles = useMemo(
    () =>
      eventosBaseVisibles.filter(
        (evento) => filtro === "TODOS" || evento.categoria === filtro,
      ),
    [eventosBaseVisibles, filtro],
  );

  const eventosPorDia = useMemo(
    () => agruparEventosPorDia(eventosVisibles),
    [eventosVisibles],
  );

  const resumenPeriodo = useMemo(
    () => contarCategorias(eventosBaseVisibles),
    [eventosBaseVisibles],
  );

  const diasRango = useMemo(
    () => generarDiasRango(rango.inicio, rango.fin),
    [rango],
  );

  const diasMesGrid = useMemo(() => {
    if (vista !== "MES") return diasRango;

    const inicioMes = rango.inicio;
    const finMes = rango.fin;
    const ajusteInicio = inicioMes.getDay() === 0 ? -6 : 1 - inicioMes.getDay();
    const inicioGrid = sumarDias(inicioMes, ajusteInicio);
    const ultimoMes = sumarDias(finMes, -1);
    const ajusteFin = ultimoMes.getDay() === 0 ? 0 : 7 - ultimoMes.getDay();
    const finGrid = sumarDias(ultimoMes, ajusteFin + 1);

    return generarDiasRango(inicioGrid, finGrid);
  }, [vista, diasRango, rango]);

  const opcionesClientes = useMemo(
    () =>
      (clientes || [])
        .filter(
          (cliente) =>
            cliente.activo !== false && cliente.estatus !== "Inactivo",
        )
        .sort((a, b) =>
          (a.nombre || "").localeCompare(b.nombre || "", "es", {
            sensitivity: "base",
          }),
        )
        .map((cliente) => ({
          value: cliente.id,
          label: `${cliente.nombre}${
            cliente.numero_cliente ? ` - #${cliente.numero_cliente}` : ""
          }`,
        })),
    [clientes],
  );

  const tituloPeriodo = formatearPeriodo(rango.inicio, rango.fin, vista);

  const navegarPeriodo = (direccion) => {
    if (vista === "DIA") {
      setFechaActual((actual) => sumarDias(actual, direccion));
      return;
    }

    if (vista === "SEMANA") {
      setFechaActual((actual) => sumarDias(actual, direccion * 7));
      return;
    }

    setFechaActual(
      (actual) => new Date(actual.getFullYear(), actual.getMonth() + direccion, 1),
    );
  };

  const abrirDetalle = (fechaClave = "", categoria = "TODOS") => {
    setFechaSeleccionada(fechaClave);
    setCategoriaSeleccionada(categoria);
    setModalActivo("DETALLE");
  };

  const abrirGestionFactura = (evento) => {
    if (!evento?.detalle) return;

    navigate("/facturas", {
      state: {
        gestionarFactura: evento.detalle,
      },
    });
  };

  const abrirNuevoRecordatorio = (fechaClave = "") => {
    const fecha = fechaClave || fechaAClave(new Date());

    setFormulario({
      ...ESTADO_FORMULARIO,
      fecha,
    });
    setFacturasCliente([]);
    setFechaSeleccionada(fecha);
    setModalActivo("CREAR");
  };

  const cerrarModal = () => {
    if (isSubmitting) return;
    setModalActivo("");
    setEventoSeleccionado(null);
    setNuevaFecha("");
  };

  const eventosDetalle = useMemo(() => {
    const base = fechaSeleccionada
      ? eventos.filter((evento) => evento.fechaClave === fechaSeleccionada)
      : eventos;

    return base.filter((evento) => {
      if (
        evento.origen === "COMPROMISO" &&
        !mostrarResueltos &&
        esEstadoFinal(evento.estatus)
      ) {
        return false;
      }

      return (
        categoriaSeleccionada === "TODOS" ||
        evento.categoria === categoriaSeleccionada
      );
    });
  }, [eventos, fechaSeleccionada, categoriaSeleccionada, mostrarResueltos]);

  const cambiarTipoVinculo = async (tipoVinculo) => {
    const clienteActualId = formulario.clienteId;

    setFormulario((anterior) => ({
      ...anterior,
      tipoVinculo,
      clienteId: tipoVinculo === "GENERAL" ? "" : anterior.clienteId,
      facturaId: "",
    }));
    setFacturasCliente([]);

    if (tipoVinculo !== "FACTURA" || !clienteActualId) return;

    setCargandoFacturasCliente(true);
    const resultado =
      await calendarioConsultaService.consultarFacturasAbiertasCliente(
        clienteActualId,
      );
    setCargandoFacturasCliente(false);

    if (!resultado.success) {
      window.alert(resultado.error);
      return;
    }

    setFacturasCliente(resultado.facturas);
  };

  const seleccionarCliente = async (opcion) => {
    const clienteId = opcion?.value || "";

    setFormulario((anterior) => ({
      ...anterior,
      clienteId,
      facturaId: "",
    }));
    setFacturasCliente([]);

    if (!clienteId || formulario.tipoVinculo !== "FACTURA") return;

    setCargandoFacturasCliente(true);
    const resultado =
      await calendarioConsultaService.consultarFacturasAbiertasCliente(
        clienteId,
      );
    setCargandoFacturasCliente(false);

    if (!resultado.success) {
      window.alert(resultado.error);
      return;
    }

    setFacturasCliente(resultado.facturas);
  };

  const guardarRecordatorio = async (event) => {
    event.preventDefault();

    if (!currentUser?.uid) {
      window.alert("No se identificó al usuario responsable.");
      return;
    }

    const cliente = clientes.find(
      (item) => item.id === formulario.clienteId,
    );
    const factura = facturasCliente.find(
      (item) => item.id === formulario.facturaId,
    );

    setIsSubmitting(true);

    const resultado = await compromisosService.crearCompromiso(
      {
        fecha: formulario.fecha,
        tipo_vinculo: formulario.tipoVinculo,
        titulo: formulario.titulo,
        motivo: formulario.motivo,
        tipo_evento: formulario.tipoEvento,
        cliente_id: cliente?.id || null,
        cliente_nombre: cliente?.nombre || "",
        telefono: cliente?.telefono || "",
        factura_id: factura?.id || null,
        folio_factura: factura?.folio || "",
        monto: Number(factura?.saldo_pendiente) || 0,
      },
      userName,
      currentUser.uid,
    );

    setIsSubmitting(false);

    if (!resultado.success) {
      window.alert(`No se pudo guardar: ${resultado.error}`);
      return;
    }

    setMensajeExito("El recordatorio quedó registrado y auditado.");
    setModalActivo("EXITO");
  };

  const actualizarEstado = async (evento, accion) => {
    if (!currentUser?.uid || evento.origen !== "COMPROMISO") return;

    if (esEstadoFinal(evento.estatus)) {
      window.alert("Este recordatorio ya tiene un estado final.");
      return;
    }

    if (accion === "REPROGRAMAR") {
      setEventoSeleccionado(evento);
      setNuevaFecha(evento.fechaClave);
      setModalActivo("REPROGRAMAR");
      return;
    }

    setIsSubmitting(true);

    const resultado =
      accion === "COMPLETAR"
        ? await compromisosService.completarCompromiso(
            evento.detalle.id,
            evento.cliente || evento.titulo,
            userName,
            currentUser.uid,
          )
        : await compromisosService.cancelarCompromiso(
            evento.detalle.id,
            evento.cliente || evento.titulo,
            userName,
            currentUser.uid,
          );

    setIsSubmitting(false);

    if (!resultado.success) {
      window.alert(resultado.error);
    }
  };

  const confirmarReprogramacion = async (event) => {
    event.preventDefault();
    if (!eventoSeleccionado || !nuevaFecha || !currentUser?.uid) return;

    setIsSubmitting(true);
    const resultado = await compromisosService.reprogramarCompromiso(
      eventoSeleccionado.detalle.id,
      nuevaFecha,
      eventoSeleccionado.cliente || eventoSeleccionado.titulo,
      userName,
      currentUser.uid,
    );
    setIsSubmitting(false);

    if (!resultado.success) {
      window.alert(resultado.error);
      return;
    }

    setMensajeExito("El recordatorio fue reprogramado correctamente.");
    setModalActivo("EXITO");
  };

  const eliminarRecordatorio = async (evento) => {
    if (
      userRole !== "SU" ||
      !currentUser?.uid ||
      !window.confirm("¿Eliminar permanentemente este recordatorio?")
    ) {
      return;
    }

    setIsSubmitting(true);
    const resultado = await compromisosService.eliminarCompromiso(
      evento.detalle.id,
      evento.cliente || evento.titulo,
      userName,
      currentUser.uid,
    );
    setIsSubmitting(false);

    if (!resultado.success) {
      window.alert(resultado.error);
    }
  };

  const abrirWhatsapp = (evento) => {
    if (!evento.cliente_id) return;

    const cliente = clientes.find((item) => item.id === evento.cliente_id);
    const telefono = cliente?.telefono || evento.telefono || "";
    const plantilla = evento.categoria === "VENCIDAS" ? "atrasado" : "proximo";
    const datos = {
      cliente: evento.cliente,
      folio: evento.folio || "S/F",
      saldo_pendiente: evento.monto,
      vencimiento: evento.fechaClave,
    };

    setEventoSeleccionado(evento);
    setDatosWhatsapp({
      telefono,
      plantilla,
      mensaje: generarMensajeWA(plantilla, datos),
    });
    setModalActivo("WHATSAPP");
  };

  const enviarWhatsapp = async () => {
    if (!eventoSeleccionado || !currentUser?.uid) return;

    const numero = normalizarTelefonoMX(datosWhatsapp.telefono);

    if (!numero.startsWith("52") || numero.length !== 12) {
      window.alert("El teléfono debe contener 10 dígitos válidos.");
      return;
    }

    window.open(
      `https://wa.me/${numero}?text=${encodeURIComponent(datosWhatsapp.mensaje)}`,
      "_blank",
      "noopener,noreferrer",
    );

    setIsSubmitting(true);
    const resultado = await compromisosService.registrarWhatsAppCompromiso({
      idCompromiso:
        eventoSeleccionado.origen === "COMPROMISO"
          ? eventoSeleccionado.detalle.id
          : null,
      esFacturaAuto: eventoSeleccionado.origen === "FACTURA",
      clienteNombre: eventoSeleccionado.cliente,
      tipoMensaje: datosWhatsapp.plantilla,
      userName,
      actor_uid: currentUser.uid,
    });
    setIsSubmitting(false);

    if (!resultado.success) {
      window.alert(resultado.error);
      return;
    }

    setMensajeExito("WhatsApp se abrió y la acción quedó registrada.");
    setModalActivo("EXITO");
  };

  const customSelectStyles = {
    control: (base) => ({
      ...base,
      minHeight: "44px",
      fontSize: "0.8rem",
      borderRadius: "0.75rem",
      borderColor: "#e5e7eb",
      boxShadow: "none",
      "&:hover": { borderColor: "#60a5fa" },
    }),
    menu: (base) => ({ ...base, zIndex: 9999 }),
    option: (base) => ({ ...base, fontSize: "0.8rem" }),
  };

  const renderContadoresDia = (fecha) => {
    const clave = fechaAClave(fecha);
    const eventosDia = eventosPorDia[clave] || [];
    const conteos = contarCategorias(eventosDia);

    return (
      <div className="space-y-1.5">
        <ContadorCategoria
          categoria="VENCIDAS"
          cantidad={conteos.VENCIDAS}
          compacto={vista === "MES"}
          onClick={(event) => {
            event.stopPropagation();
            abrirDetalle(clave, "VENCIDAS");
          }}
        />
        <ContadorCategoria
          categoria="POR_VENCER"
          cantidad={conteos.POR_VENCER}
          compacto={vista === "MES"}
          onClick={(event) => {
            event.stopPropagation();
            abrirDetalle(clave, "POR_VENCER");
          }}
        />
        <ContadorCategoria
          categoria="RECORDATORIOS"
          cantidad={conteos.RECORDATORIOS}
          compacto={vista === "MES"}
          onClick={(event) => {
            event.stopPropagation();
            abrirDetalle(clave, "RECORDATORIOS");
          }}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col space-y-4 md:space-y-6 pb-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mt-2 md:mt-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-[#0a192f] flex items-center">
            <CalendarIcon className="h-5 w-5 md:h-6 md:w-6 mr-2 text-blue-600" />
            Agenda de Cobranza
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1">
            Vencimientos, próximos cobros y recordatorios operativos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => abrirNuevoRecordatorio(fechaAClave(new Date()))}
          className="w-full lg:w-auto px-5 py-3 bg-[#0a192f] text-white rounded-xl font-black text-sm flex items-center justify-center shadow-md hover:bg-[#112240]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo recordatorio
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-4">
        {Object.entries(CATEGORIAS).map(([categoria, configuracion]) => {
          const Icono = configuracion.icono;
          const cantidad = resumenPeriodo[categoria] || 0;

          return (
            <button
              key={categoria}
              type="button"
              onClick={() => abrirDetalle("", categoria)}
              className={`p-3 md:p-4 rounded-xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${configuracion.tarjeta}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] md:text-xs uppercase font-black tracking-wide text-gray-500 truncate">
                  {configuracion.etiqueta}
                </span>
                <Icono className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
              </div>
              <strong className="text-xl md:text-3xl text-[#0a192f] mt-2 block">
                {cantidad}
              </strong>
              <span className="hidden md:block text-[10px] text-gray-500 mt-1">
                Ver detalle del periodo
              </span>
            </button>
          );
        })}
      </div>

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/60 space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Periodo visible
                </p>
                <h2 className="text-sm md:text-base font-black text-[#0a192f] capitalize">
                  {tituloPeriodo}
                </h2>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => navegarPeriodo(-1)}
                  className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100"
                  aria-label="Periodo anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setFechaActual(new Date())}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-black text-blue-600 hover:bg-blue-50"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => navegarPeriodo(1)}
                  className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100"
                  aria-label="Periodo siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 p-1 bg-white border border-gray-200 rounded-xl">
              {VISTAS.map((opcion) => (
                <button
                  key={opcion.value}
                  type="button"
                  onClick={() => setVista(opcion.value)}
                  className={`px-3 py-2 text-xs font-black rounded-lg transition-colors ${
                    vista === opcion.value
                      ? "bg-[#0a192f] text-white"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {opcion.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 hide-scrollbar-mobile">
              <Filter className="h-4 w-4 text-gray-400 shrink-0" />
              {FILTROS.map((opcion) => (
                <button
                  key={opcion.value}
                  type="button"
                  onClick={() => setFiltro(opcion.value)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full border text-[10px] md:text-xs font-black transition-colors ${
                    filtro === opcion.value
                      ? "bg-[#0a192f] text-white border-[#0a192f]"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {opcion.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setMostrarResueltos((actual) => !actual)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 flex items-center justify-center"
            >
              {mostrarResueltos ? (
                <EyeOff className="h-4 w-4 mr-2" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              {mostrarResueltos ? "Ocultar resueltos" : "Mostrar resueltos"}
            </button>
          </div>
        </div>

        {error && (
          <div className="m-4 p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-bold">
            {error}
          </div>
        )}

        {cargando ? (
          <div className="p-10 flex items-center justify-center text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Consultando el periodo visible...
          </div>
        ) : (
          <>
            {vista === "MES" ? (
              <div className="p-2 md:p-0">
                <div className="grid grid-cols-7 bg-[#0a192f] text-white text-[9px] md:text-[10px] font-black uppercase tracking-wider text-center rounded-t-xl md:rounded-none">
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((dia) => (
                    <div key={dia} className="py-2">{dia}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 border-l border-t border-gray-100">
                  {diasMesGrid.map((fecha) => {
                    const fueraMes = fecha.getMonth() !== rango.inicio.getMonth();
                    const esHoy = mismoDia(fecha, new Date());
                    const clave = fechaAClave(fecha);

                    return (
                      <div
                        key={clave}
                        role="button"
                        tabIndex={0}
                        onClick={() => abrirDetalle(clave, "TODOS")}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            abrirDetalle(clave, "TODOS");
                          }
                        }}
                        className={`min-h-20 md:min-h-32 p-1 md:p-2 border-r border-b border-gray-100 text-left align-top transition-colors hover:bg-blue-50/30 cursor-pointer ${
                          fueraMes ? "bg-gray-50 text-gray-300" : "bg-white"
                        }`}
                      >
                        <span
                          className={`h-6 w-6 flex items-center justify-center rounded-full text-[10px] md:text-xs font-black mb-1 ${
                            esHoy ? "bg-blue-600 text-white" : "text-[#0a192f]"
                          }`}
                        >
                          {fecha.getDate()}
                        </span>
                        {!fueraMes && renderContadoresDia(fecha)}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                <div
                  className={`hidden md:grid divide-x divide-gray-100 ${
                    vista === "DIA" ? "md:grid-cols-1" : "md:grid-cols-7"
                  }`}
                >
                  {diasRango.map((fecha) => {
                    const clave = fechaAClave(fecha);
                    const esHoy = mismoDia(fecha, new Date());

                    return (
                      <div
                        key={clave}
                        className={`min-h-72 p-3 ${esHoy ? "bg-blue-50/30" : "bg-white"}`}
                      >
                        <button
                          type="button"
                          onClick={() => abrirDetalle(clave, "TODOS")}
                          className="w-full text-left"
                        >
                          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            {fecha.toLocaleDateString("es-MX", { weekday: "long" })}
                          </p>
                          <div className="flex items-center justify-between mt-1 mb-4">
                            <strong className="text-lg text-[#0a192f]">
                              {fecha.getDate()}
                            </strong>
                            {esHoy && (
                              <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] rounded-full font-black uppercase">
                                Hoy
                              </span>
                            )}
                          </div>
                        </button>
                        {renderContadoresDia(fecha)}
                        <button
                          type="button"
                          onClick={() => abrirNuevoRecordatorio(clave)}
                          className="w-full mt-4 py-2 border border-dashed border-gray-300 text-gray-400 rounded-lg text-[10px] font-bold hover:border-blue-300 hover:text-blue-600"
                        >
                          + Agregar
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="md:hidden p-3 space-y-3">
                  {diasRango.map((fecha) => {
                    const clave = fechaAClave(fecha);
                    const eventosDia = eventosPorDia[clave] || [];
                    const esHoy = mismoDia(fecha, new Date());

                    return (
                      <article
                        key={clave}
                        className={`rounded-2xl border p-4 ${
                          esHoy
                            ? "border-blue-200 bg-blue-50/40"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <button
                            type="button"
                            onClick={() => abrirDetalle(clave, "TODOS")}
                            className="text-left"
                          >
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                              {fecha.toLocaleDateString("es-MX", { weekday: "long" })}
                            </p>
                            <h3 className="text-base font-black text-[#0a192f] capitalize">
                              {fecha.toLocaleDateString("es-MX", {
                                day: "numeric",
                                month: "long",
                              })}
                            </h3>
                          </button>

                          <button
                            type="button"
                            onClick={() => abrirNuevoRecordatorio(clave)}
                            className="h-10 w-10 rounded-xl bg-[#0a192f] text-white flex items-center justify-center"
                            aria-label="Agregar recordatorio"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        {eventosDia.length ? (
                          renderContadoresDia(fecha)
                        ) : (
                          <button
                            type="button"
                            onClick={() => abrirDetalle(clave, "TODOS")}
                            className="w-full py-4 rounded-xl bg-gray-50 text-xs font-bold text-gray-400"
                          >
                            Sin actividades
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </section>

      {modalActivo === "DETALLE" && (
        <ModalBase onClose={cerrarModal} maxWidth="max-w-3xl">
          <div className="p-4 md:p-5 border-b border-gray-100 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                Detalle de agenda
              </p>
              <h2 className="text-lg font-black text-[#0a192f] capitalize">
                {fechaSeleccionada
                  ? claveAFecha(fechaSeleccionada)?.toLocaleDateString("es-MX", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : tituloPeriodo}
              </h2>
            </div>
            <button type="button" onClick={cerrarModal} className="p-2 text-gray-400">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 md:p-5 overflow-y-auto custom-scrollbar space-y-4">
            {eventosDetalle.length === 0 ? (
              <div className="py-10 text-center text-gray-400">
                <CalendarDays className="h-10 w-10 mx-auto mb-3 text-gray-200" />
                <p className="text-sm font-bold">No hay actividades en esta selección.</p>
              </div>
            ) : (
              Object.keys(CATEGORIAS).map((categoria) => {
                const lista = eventosDetalle.filter(
                  (evento) => evento.categoria === categoria,
                );
                if (!lista.length) return null;
                const configuracion = CATEGORIAS[categoria];
                const Icono = configuracion.icono;

                return (
                  <section key={categoria}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center">
                        <Icono className="h-4 w-4 mr-2" />
                        {configuracion.etiqueta}
                      </h3>
                      <span className="text-xs font-black text-[#0a192f]">{lista.length}</span>
                    </div>

                    <div className="space-y-2">
                      {lista.map((evento) => (
                        <article
                          key={evento.id}
                          className={`rounded-xl border p-3 md:p-4 ${configuracion.tarjeta}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] uppercase font-black px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600">
                                  {evento.origen === "FACTURA"
                                    ? "Factura"
                                    : evento.tipoVinculo || "Recordatorio"}
                                </span>

                                {evento.estatus &&
                                  evento.origen === "COMPROMISO" && (
                                    <span className="text-[10px] uppercase font-black text-blue-700">
                                      {evento.estatus}
                                    </span>
                                  )}

                                {evento.origen === "COMPROMISO" &&
                                  evento.tipoVinculo === "FACTURA" &&
                                  evento.folio && (
                                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
                                      Folio {evento.folio}
                                    </span>
                                  )}
                              </div>

                              <h4 className="font-black text-[#0a192f] mt-2 text-base">
                                {evento.origen === "FACTURA"
                                  ? evento.folio
                                  : evento.titulo}
                              </h4>

                              {evento.cliente && (
                                <p className="text-xs font-bold text-gray-600 mt-1">
                                  {evento.cliente}
                                </p>
                              )}

                              {evento.origen === "COMPROMISO" &&
                                evento.tipoVinculo === "FACTURA" &&
                                evento.folio && (
                                  <p className="text-xs font-black text-blue-700 mt-1">
                                    Factura vinculada: {evento.folio}
                                  </p>
                                )}

                              {evento.motivo && (
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                  {evento.motivo}
                                </p>
                              )}
                              {evento.origen === "FACTURA" && (
                                <p className="text-sm font-black text-red-600 mt-2">
                                  {formatearMoneda(evento.monto)}
                                </p>
                              )}
                              <p className="text-[10px] text-gray-400 mt-2">
                                {claveAFecha(evento.fechaClave)?.toLocaleDateString("es-MX")}
                              </p>
                            </div>

                            <div className="flex gap-1 shrink-0">
                              {evento.cliente_id && (
                                <button
                                  type="button"
                                  onClick={() => abrirWhatsapp(evento)}
                                  className="p-2 rounded-lg bg-white border border-gray-200 text-green-600 hover:bg-green-50"
                                  title="WhatsApp"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </button>
                              )}
                              {evento.origen === "FACTURA" && (
                                <button
                                  type="button"
                                  onClick={() => abrirGestionFactura(evento)}
                                  className="px-3 py-2 rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 font-black text-[10px] flex items-center"
                                  title="Abrir Gestión de Factura"
                                >
                                  <FileText className="h-4 w-4 mr-1.5" />
                                  Ir a Facturación
                                </button>
                              )}
                            </div>
                          </div>

                          {evento.origen === "COMPROMISO" && !esEstadoFinal(evento.estatus) && (
                            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-200/70">
                              <button
                                type="button"
                                onClick={() => actualizarEstado(evento, "COMPLETAR")}
                                disabled={isSubmitting}
                                className="py-2 rounded-lg bg-green-600 text-white text-[10px] font-black disabled:opacity-50"
                              >
                                Completar
                              </button>
                              <button
                                type="button"
                                onClick={() => actualizarEstado(evento, "REPROGRAMAR")}
                                disabled={isSubmitting}
                                className="py-2 rounded-lg bg-purple-600 text-white text-[10px] font-black disabled:opacity-50"
                              >
                                Reprogramar
                              </button>
                              <button
                                type="button"
                                onClick={() => actualizarEstado(evento, "CANCELAR")}
                                disabled={isSubmitting}
                                className="py-2 rounded-lg bg-gray-600 text-white text-[10px] font-black disabled:opacity-50"
                              >
                                Cancelar
                              </button>
                            </div>
                          )}

                          {userRole === "SU" && evento.origen === "COMPROMISO" && (
                            <button
                              type="button"
                              onClick={() => eliminarRecordatorio(evento)}
                              disabled={isSubmitting}
                              className="mt-2 text-[10px] font-bold text-red-500 flex items-center"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Eliminar permanentemente
                            </button>
                          )}
                        </article>
                      ))}
                    </div>
                  </section>
                );
              })
            )}
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-2 justify-end">
            {fechaSeleccionada && (
              <button
                type="button"
                onClick={() => abrirNuevoRecordatorio(fechaSeleccionada)}
                className="px-4 py-3 sm:py-2 bg-[#ffd700] text-[#0a192f] rounded-xl font-black text-xs flex items-center justify-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar recordatorio
              </button>
            )}
            <button
              type="button"
              onClick={cerrarModal}
              className="px-4 py-3 sm:py-2 bg-[#0a192f] text-white rounded-xl font-black text-xs"
            >
              Cerrar
            </button>
          </div>
        </ModalBase>
      )}

      {modalActivo === "CREAR" && (
        <ModalBase onClose={cerrarModal} maxWidth="max-w-xl">
          <div className="p-4 md:p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                Nueva actividad
              </p>
              <h2 className="text-lg font-black text-[#0a192f]">Crear recordatorio</h2>
            </div>
            <button type="button" onClick={cerrarModal} className="p-2 text-gray-400">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={guardarRecordatorio} className="p-4 md:p-5 overflow-y-auto custom-scrollbar space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">
                Tipo de vínculo
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "GENERAL", label: "General", icon: Bell },
                  { value: "CLIENTE", label: "Cliente", icon: Users },
                  { value: "FACTURA", label: "Factura", icon: FileText },
                ].map((opcion) => {
                  const Icono = opcion.icon;
                  return (
                    <button
                      key={opcion.value}
                      type="button"
                      onClick={() => cambiarTipoVinculo(opcion.value)}
                      className={`p-3 rounded-xl border text-xs font-black flex flex-col items-center gap-1.5 ${
                        formulario.tipoVinculo === opcion.value
                          ? "bg-[#0a192f] text-white border-[#0a192f]"
                          : "bg-white text-gray-500 border-gray-200"
                      }`}
                    >
                      <Icono className="h-4 w-4" />
                      {opcion.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5">Fecha</label>
                <input
                  type="date"
                  required
                  value={formulario.fecha}
                  onChange={(event) =>
                    setFormulario((anterior) => ({ ...anterior, fecha: event.target.value }))
                  }
                  className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5">Tipo operativo</label>
                <select
                  value={formulario.tipoEvento}
                  onChange={(event) =>
                    setFormulario((anterior) => ({ ...anterior, tipoEvento: event.target.value }))
                  }
                  className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm bg-white"
                >
                  <option value="Recordatorio">Recordatorio</option>
                  <option value="Seguimiento">Seguimiento</option>
                  <option value="Promesa">Promesa de pago</option>
                </select>
              </div>
            </div>

            {formulario.tipoVinculo !== "GENERAL" && (
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5">Cliente</label>
                <Select
                  options={opcionesClientes}
                  value={opcionesClientes.find((opcion) => opcion.value === formulario.clienteId) || null}
                  onChange={seleccionarCliente}
                  placeholder="Buscar cliente..."
                  isClearable
                  styles={customSelectStyles}
                  noOptionsMessage={() => "No se encontraron clientes"}
                />
              </div>
            )}

            {formulario.tipoVinculo === "FACTURA" && (
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5">Factura abierta</label>
                <select
                  required
                  value={formulario.facturaId}
                  onChange={(event) =>
                    setFormulario((anterior) => ({ ...anterior, facturaId: event.target.value }))
                  }
                  disabled={!formulario.clienteId || cargandoFacturasCliente}
                  className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm bg-white disabled:bg-gray-100"
                >
                  <option value="">
                    {cargandoFacturasCliente ? "Consultando facturas..." : "Seleccionar factura"}
                  </option>
                  {facturasCliente.map((factura) => (
                    <option key={factura.id} value={factura.id}>
                      {factura.folio} — {formatearMoneda(factura.saldo_pendiente)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5">Título</label>
              <input
                type="text"
                required
                value={formulario.titulo}
                onChange={(event) =>
                  setFormulario((anterior) => ({ ...anterior, titulo: event.target.value }))
                }
                placeholder="Ej. Revisar reporte semanal"
                className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5">Detalle</label>
              <textarea
                required
                rows="4"
                value={formulario.motivo}
                onChange={(event) =>
                  setFormulario((anterior) => ({ ...anterior, motivo: event.target.value }))
                }
                placeholder="Describe la acción que debe realizarse."
                className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={cerrarModal}
                disabled={isSubmitting}
                className="px-5 py-3 rounded-xl bg-gray-100 text-gray-600 font-black text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-3 rounded-xl bg-[#ffd700] text-[#0a192f] font-black text-xs flex items-center justify-center disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Guardar recordatorio
              </button>
            </div>
          </form>
        </ModalBase>
      )}

      {modalActivo === "REPROGRAMAR" && eventoSeleccionado && (
        <ModalBase onClose={cerrarModal} maxWidth="max-w-sm">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-black text-[#0a192f]">Reprogramar recordatorio</h2>
            <button type="button" onClick={cerrarModal} className="text-gray-400"><X className="h-5 w-5" /></button>
          </div>
          <form onSubmit={confirmarReprogramacion} className="p-5 space-y-4">
            <p className="text-sm font-bold text-gray-600">{eventoSeleccionado.titulo}</p>
            <input
              type="date"
              required
              value={nuevaFecha}
              onChange={(event) => setNuevaFecha(event.target.value)}
              className="w-full px-3 py-3 border border-gray-200 rounded-xl"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-purple-600 text-white rounded-xl font-black text-xs flex items-center justify-center disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar nueva fecha
            </button>
          </form>
        </ModalBase>
      )}

      {modalActivo === "WHATSAPP" && eventoSeleccionado && (
        <ModalBase onClose={cerrarModal} maxWidth="max-w-lg">
          <div className="p-4 md:p-5 bg-[#25D366] text-white flex items-center justify-between">
            <h2 className="font-black flex items-center"><Smartphone className="h-5 w-5 mr-2" /> Gestión vía WhatsApp</h2>
            <button type="button" onClick={cerrarModal}><X className="h-5 w-5" /></button>
          </div>
          <div className="p-4 md:p-5 space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Cliente</label>
              <p className="font-black text-[#0a192f]">{eventoSeleccionado.cliente}</p>
            </div>
            <input
              type="text"
              value={datosWhatsapp.telefono}
              onChange={(event) => setDatosWhatsapp((anterior) => ({ ...anterior, telefono: event.target.value }))}
              placeholder="Teléfono de 10 dígitos"
              className="w-full px-3 py-3 border border-gray-200 rounded-xl"
            />
            <select
              value={datosWhatsapp.plantilla}
              onChange={(event) => {
                const plantilla = event.target.value;
                setDatosWhatsapp((anterior) => ({
                  ...anterior,
                  plantilla,
                  mensaje: generarMensajeWA(plantilla, {
                    cliente: eventoSeleccionado.cliente,
                    folio: eventoSeleccionado.folio || "S/F",
                    saldo_pendiente: eventoSeleccionado.monto,
                    vencimiento: eventoSeleccionado.fechaClave,
                  }),
                }));
              }}
              className="w-full px-3 py-3 border border-gray-200 rounded-xl bg-white"
            >
              <option value="atrasado">Saldo vencido</option>
              <option value="proximo">Vencimiento próximo</option>
              <option value="manual">Seguimiento libre</option>
            </select>
            <textarea
              rows="6"
              value={datosWhatsapp.mensaje}
              onChange={(event) => setDatosWhatsapp((anterior) => ({ ...anterior, mensaje: event.target.value }))}
              className="w-full px-3 py-3 border border-gray-200 rounded-xl resize-none text-sm"
            />
            <button
              type="button"
              onClick={enviarWhatsapp}
              disabled={isSubmitting || !datosWhatsapp.telefono}
              className="w-full py-3 bg-[#25D366] text-white rounded-xl font-black text-xs flex items-center justify-center disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Abrir WhatsApp
            </button>
          </div>
        </ModalBase>
      )}

      {modalActivo === "EXITO" && (
        <ModalBase onClose={cerrarModal} maxWidth="max-w-sm">
          <div className="p-7 text-center">
            <div className="h-14 w-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-black text-[#0a192f]">Operación completada</h2>
            <p className="text-sm text-gray-500 mt-2">{mensajeExito}</p>
            <button
              type="button"
              onClick={cerrarModal}
              className="w-full mt-5 py-3 bg-[#0a192f] text-white rounded-xl font-black text-xs"
            >
              Continuar
            </button>
          </div>
        </ModalBase>
      )}
    </div>
  );
}