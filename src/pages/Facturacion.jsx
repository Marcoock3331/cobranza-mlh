import { useState, useMemo, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GlobalContext } from "../context/GlobalContext";
import { useFacturas } from "../hooks/useFacturas";
import { calcularDiasVencidos } from "../utils/fechas";
import { generarMensajeWA, normalizarTelefonoMX } from "../utils/whatsapp";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const FACTURAS_POR_PAGINA = 25;

const GRUPOS_FACTURA = [
  "Carpintería",
  "Cruce",
  "Familiares",
  "General",
  "Prioridad",
  "IHB",
  "RC Intercomerce",
  "Torre Las Americas",
  "Nuevo",
];

const normalizarGrupoFactura = (valor = "") => {
  const normalizado = valor
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  return (
    GRUPOS_FACTURA.find(
      (grupo) =>
        grupo
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toUpperCase() === normalizado,
    ) || "General"
  );
};

const crearFormularioFactura = (factura = null) => {
  if (!factura) {
    return {
      cliente_id: "",
      cliente: "",
      grupo: "General",
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
    grupo: normalizarGrupoFactura(factura.grupo),
    folio: factura.folio || "",
    monto_total: factura.monto_total ?? "",
    moneda: "MXN",
    emision: factura.emision || "",
    vencimiento: factura.vencimiento || "",
    observaciones: factura.observaciones || "",
  };
};

export default function Facturacion() {
  const {
    facturas,
    userRole,
    clientes,
    crearFacturaEnNube,
    modificarFacturaEnNube,
    eliminarFacturaEnNube,
    registrarAbonoEnNube,
    eliminarAbonoEnNube,
  } = useContext(GlobalContext);

  const location = useLocation();
  const navigate = useNavigate();
  const facturaInicialEdicion = location.state?.editarFactura || null;

  const {
    busqueda,
    setBusqueda,
    filtroEstatus,
    setFiltroEstatus,
    fechaInicio,
    setFechaInicio,
    fechaFin,
    setFechaFin,
    facturasFiltradas,
    kpis,
    limpiarFiltros,
  } = useFacturas(facturas);

  const [modalActivo, setModalActivo] = useState(
    facturaInicialEdicion ? "editarFactura" : null,
  );
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(
    facturaInicialEdicion,
  );
  const [notificacion, setNotificacion] = useState({
    titulo: "",
    descripcion: "",
    tipo: "exito",
  });

  const [invoiceForm, setInvoiceForm] = useState(() =>
    crearFormularioFactura(facturaInicialEdicion),
  );

  const [pagoForm, setPagoForm] = useState({ monto: "", metodo: "Efectivo" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paginaFacturas, setPaginaFacturas] = useState(1);
  const [itemAEliminar, setItemAEliminar] = useState(null);
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

  const totalPaginasFacturas = Math.max(
    1,
    Math.ceil(facturasFiltradas.length / FACTURAS_POR_PAGINA),
  );

  const paginaActualFacturas = Math.min(paginaFacturas, totalPaginasFacturas);

  const facturasPaginadas = useMemo(() => {
    const inicio = (paginaActualFacturas - 1) * FACTURAS_POR_PAGINA;

    return facturasFiltradas.slice(inicio, inicio + FACTURAS_POR_PAGINA);
  }, [facturasFiltradas, paginaActualFacturas]);

  const abrirMenuOpciones = (factura) => {
    setFacturaSeleccionada(factura);
    setModalActivo("opcionesFactura");
  };

  const abrirFormulario = (tipo) => {
    if (tipo === "nuevoPago") setPagoForm({ monto: "", metodo: "Efectivo" });
    else if (tipo === "whatsapp") {
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

    if (location.state?.editarFactura) {
      navigate("/facturas", { replace: true, state: null });
    }
    if (
      [
        "notificacion",
        "opcionesFactura",
        "confirmarEliminar",
        "whatsapp",
      ].includes(modalActivo)
    ) {
      setFacturaSeleccionada(null);
      setItemAEliminar(null);
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
        grupo: normalizarGrupoFactura(invoiceForm.grupo),
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

  const confirmarEliminacion = (tipo, data) => {
    setItemAEliminar({ tipo, data });
    setModalActivo("confirmarEliminar");
  };

  const ejecutarEliminacion = async () => {
    try {
      if (itemAEliminar?.tipo === "factura") {
        const res = await eliminarFacturaEnNube(itemAEliminar.data.id);

        if (!res?.success) {
          mostrarNotificacion(
            "Acción pendiente",
            res?.error ||
              "La eliminación/anulación de facturas aún no está habilitada.",
            "error",
          );
          return;
        }

        mostrarNotificacion(
          "Factura Eliminada",
          "La factura fue procesada correctamente.",
        );
      } else if (itemAEliminar?.tipo === "abono") {
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

        mostrarNotificacion(
          "Pago Anulado",
          "Abono revertido. La deuda regresó al saldo del cliente.",
        );
      }
    } catch (error) {
      console.error(error);
      mostrarNotificacion("Error", "Ocurrió un error inesperado.", "error");
    } finally {
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

  const BadgeEstatus = ({ estatus }) => {
    const configs = {
      Pagada: "bg-green-100 text-green-800 border-green-200",
      Pendiente: "bg-blue-100 text-blue-800 border-blue-200",
      Vencida: "bg-red-100 text-red-800 border-red-200",
    };
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap ${configs[estatus]}`}
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
            Control integral de facturas emitidas, saldos pendientes y pagos
            recibidos en tiempo real.
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
        <div className="bg-white p-4 md:p-5 rounded-xl border border-blue-100 shadow-sm flex flex-col border-l-4 border-l-blue-500">
          <p className="text-[10px] md:text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center">
            <DollarSign className="h-4 w-4 md:h-4 md:w-4 mr-1 text-blue-500" />{" "}
            Deuda Activa en Calle
          </p>
          <h3 className="text-xl md:text-2xl font-black text-[#0a192f]">
            ${kpis.deuda_activa.toLocaleString("es-MX")}
          </h3>
        </div>
        <div className="bg-white p-4 md:p-5 rounded-xl border border-red-100 shadow-sm flex flex-col border-l-4 border-l-red-500 bg-red-50/20">
          <p className="text-[10px] md:text-[11px] font-bold text-red-500 uppercase tracking-wider mb-1 flex items-center">
            <AlertTriangle className="h-4 w-4 md:h-4 md:w-4 mr-1" /> Saldo
            Vencido Urgente
          </p>
          <h3 className="text-xl md:text-2xl font-black text-red-600">
            ${kpis.monto_vencido.toLocaleString("es-MX")}
          </h3>
        </div>
        <div className="bg-white p-4 md:p-5 rounded-xl border border-green-100 shadow-sm flex flex-col border-l-4 border-l-green-500">
          <p className="text-[10px] md:text-[11px] font-bold text-green-600 uppercase tracking-wider mb-1 flex items-center">
            <TrendingUp className="h-4 w-4 md:h-4 md:w-4 mr-1" /> Total
            Liquidado
          </p>
          <h3 className="text-xl md:text-2xl font-black text-green-700">
            ${(Number(kpis.total_liquidado) || 0).toLocaleString("es-MX")}
          </h3>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 md:h-4 md:w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por Folio (F-1025) o Cliente..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPaginaFacturas(1);
              }}
              className="w-full pl-10 pr-4 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
            />
          </div>
          <div className="flex overflow-x-auto hide-scrollbar-mobile w-full md:w-auto bg-gray-50 p-1.5 md:p-1 rounded-xl md:rounded-lg border border-gray-200 gap-1 md:gap-0 shrink-0">
            {["Todas", "Pendiente", "Vencida", "Pagada"].map((estatus) => (
              <button
                key={estatus}
                onClick={() => {
                  setFiltroEstatus(estatus);
                  setPaginaFacturas(1);
                }}
                className={`whitespace-nowrap px-4 py-2 md:py-1.5 text-xs font-bold rounded-lg md:rounded-md transition-colors flex-1 md:flex-none ${filtroEstatus === estatus ? "bg-white text-[#0a192f] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                {estatus}
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
                setPaginaFacturas(1);
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
                setPaginaFacturas(1);
              }}
              className="flex-1 sm:flex-none px-3 md:px-2 py-2.5 md:py-1.5 border border-gray-200 rounded-lg md:rounded text-xs focus:ring-2 focus:ring-blue-500 text-gray-600 outline-none"
            />
          </div>
          {(fechaInicio || fechaFin || busqueda) && (
            <button
              onClick={() => {
                limpiarFiltros();
                setPaginaFacturas(1);
              }}
              className="flex items-center justify-center px-4 md:px-3 py-3 md:py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors w-full sm:w-auto mt-2 sm:mt-0"
            >
              <FilterX className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1.5 md:mr-1" />{" "}
              Limpiar Filtros
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col flex-1 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)] pb-20 custom-scrollbar w-full">
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
                  Monto Pagado
                </th>
                <th className="px-4 py-3 text-right border-b border-gray-200 whitespace-nowrap">
                  Saldo
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
              {facturasPaginadas.length > 0 ? (
                facturasPaginadas.map((fac) => {
                  const montoTotal = Number(fac.monto_total) || 0;
                  const saldoPendiente = Number(fac.saldo_pendiente) || 0;
                  const montoPagado = Math.max(0, montoTotal - saldoPendiente);
                  return (
                    <tr
                      key={fac.id}
                      className="hover:bg-blue-50/30 active:bg-blue-50/50 transition-colors group"
                    >
                      <td
                        className="px-4 py-4 md:py-3 bg-white cursor-pointer"
                        onClick={() => abrirMenuOpciones(fac)}
                      >
                        <div className="flex flex-col">
                          <span className="font-black text-[#0a192f] text-base">
                            {fac.folio}
                          </span>
                          <span
                            className="text-gray-600 font-medium truncate max-w-[200px]"
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
                        {fac.estatus === "Vencida" && (
                          <span className="block text-[11px] font-black text-red-500 mt-0.5">
                            (Hace {calcularDiasVencidos(fac.vencimiento)} días)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 md:py-3 text-right font-semibold text-gray-700 bg-white whitespace-nowrap">
                        $
                        {(Number(fac.monto_total) || 0).toLocaleString("es-MX")}
                      </td>
                      <td className="px-4 py-4 md:py-3 text-right font-semibold text-green-600 bg-white whitespace-nowrap">
                        ${(Number(montoPagado) || 0).toLocaleString("es-MX")}
                      </td>
                      <td className="px-4 py-4 md:py-3 text-right bg-white whitespace-nowrap">
                        <span
                          className={`text-base font-black ${fac.saldo_pendiente > 0 ? (fac.estatus === "Vencida" ? "text-red-600" : "text-[#0a192f]") : "text-green-600"}`}
                        >
                          $
                          {(Number(fac.saldo_pendiente) || 0).toLocaleString(
                            "es-MX",
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-4 md:py-3 text-center bg-white">
                        <BadgeEstatus estatus={fac.estatus} />
                      </td>
                      <td className="px-4 py-4 md:py-3 text-center bg-white">
                        <button
                          onClick={() => abrirMenuOpciones(fac)}
                          className="p-3 md:p-1.5 text-gray-400 active:text-blue-600 hover:text-blue-600 active:bg-blue-50 hover:bg-blue-50 rounded-full md:rounded-lg transition-colors border border-transparent"
                          title="Ver Opciones"
                        >
                          <MoreVertical className="h-5 w-5 md:h-5 md:w-5 mx-auto" />
                        </button>
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
                      No se encontraron facturas que coincidan con la búsqueda.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs font-medium text-gray-500">
            Mostrando{" "}
            {facturasFiltradas.length === 0
              ? 0
              : (paginaActualFacturas - 1) * FACTURAS_POR_PAGINA + 1}
            {" - "}
            {Math.min(
              paginaActualFacturas * FACTURAS_POR_PAGINA,
              facturasFiltradas.length,
            )}{" "}
            de {facturasFiltradas.length} facturas
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setPaginaFacturas((pagina) => Math.max(1, pagina - 1))
              }
              disabled={paginaActualFacturas <= 1}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="text-xs font-black text-[#0a192f] min-w-20 text-center">
              Página {paginaActualFacturas} de {totalPaginasFacturas}
            </span>

            <button
              type="button"
              onClick={() =>
                setPaginaFacturas((pagina) =>
                  Math.min(totalPaginasFacturas, pagina + 1),
                )
              }
              disabled={paginaActualFacturas >= totalPaginasFacturas}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
              aria-label="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {modalActivo && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm md:p-4">
          {modalActivo === "opcionesFactura" && (
            <div className="bg-white rounded-t-3xl md:rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-slide-up md:animate-zoom-in m-auto md:m-0 pb-6 md:pb-0 max-h-[90vh]">
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
                {facturaSeleccionada?.saldo_pendiente > 0 && (
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
                  <button
                    type="button"
                    onClick={() => abrirFormulario("editarFactura")}
                    className="p-3 md:p-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl md:rounded-lg flex flex-col items-center justify-center font-bold text-xs hover:bg-amber-100 active:bg-amber-100 transition-colors"
                  >
                    <Edit className="h-5 w-5 md:h-4 md:w-4 mb-1" /> Editar
                  </button>
                  {userRole === "SU" && (
                    <button
                      disabled
                      title="La anulación financiera se implementará en un flujo separado"
                      className="p-3 md:p-2 bg-gray-100 text-gray-400 border border-gray-200 rounded-xl md:rounded-lg flex flex-col items-center justify-center font-bold text-xs cursor-not-allowed"
                    >
                      <Trash2 className="h-5 w-5 md:h-4 md:w-4 mb-1" /> Anular
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {modalActivo === "whatsapp" && (
            <div className="bg-white rounded-t-3xl md:rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-slide-up md:animate-zoom-in max-h-[90vh] pb-6 md:pb-0 m-auto md:m-0">
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
            <div className="bg-white rounded-t-3xl md:rounded-xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden animate-slide-up md:animate-zoom-in max-h-[90vh] pb-6 md:pb-0 m-auto md:m-0">
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
                              grupo: selected
                                ? normalizarGrupoFactura(selected.cliente.grupo)
                                : invoiceForm.grupo,
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
                          Grupo
                        </label>
                        <select
                          value={invoiceForm.grupo}
                          onChange={(e) =>
                            setInvoiceForm({
                              ...invoiceForm,
                              grupo: e.target.value,
                            })
                          }
                          className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-xl md:rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffd700] bg-gray-50 focus:bg-white font-medium text-sm"
                        >
                          {GRUPOS_FACTURA.map((grupo) => (
                            <option key={grupo} value={grupo}>
                              {grupo}
                            </option>
                          ))}
                        </select>
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
            <div className="bg-white rounded-t-3xl md:rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-slide-up md:animate-zoom-in mt-auto mb-auto md:mt-10 pb-6 md:pb-0">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden shrink-0"></div>
              <div className="p-6 text-center space-y-4">
                <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto ring-4 ring-red-50">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl md:text-lg font-black text-[#0a192f]">
                    {itemAEliminar?.tipo === "factura"
                      ? "¿Eliminar Factura?"
                      : "¿Eliminar Abono?"}
                  </h3>
                  <p className="text-sm md:text-sm text-gray-600 mt-2">
                    {itemAEliminar?.tipo === "factura" ? (
                      <>
                        Estás a punto de eliminar permanentemente la factura{" "}
                        <span className="font-bold text-[#0a192f]">
                          {itemAEliminar.data?.folio}
                        </span>{" "}
                        de{" "}
                        <span className="font-bold text-[#0a192f]">
                          {itemAEliminar.data?.cliente}
                        </span>
                        .
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
                      ? `Esta acción borrará la factura y todo su historial de abonos.`
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
                  className="w-full md:w-auto px-5 py-3.5 md:py-2 text-sm md:text-xs font-black text-white bg-red-600 active:bg-red-700 rounded-xl md:rounded-lg shadow-sm flex items-center justify-center transition-colors"
                >
                  <Trash2 className="h-4 w-4 mr-1.5 md:mr-1" /> Sí, Eliminar
                </button>
              </div>
            </div>
          )}

          {modalActivo === "nuevoPago" && (
            <div className="bg-white rounded-t-3xl md:rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-slide-up md:animate-zoom-in m-auto md:m-0 pb-6 md:pb-0 max-h-[90vh]">
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
            <div className="bg-white rounded-t-3xl md:rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-slide-up md:animate-zoom-in m-auto md:m-0 pb-6 md:pb-0 max-h-[90vh]">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden shrink-0"></div>
              <div className="p-4 border-b border-gray-100 bg-white md:bg-blue-50 flex justify-between items-center shrink-0">
                <h2 className="text-sm md:text-base font-black text-blue-800 flex items-center">
                  <Clock className="h-5 w-5 md:h-5 md:w-5 mr-2" /> Historial de
                  Abonos
                </h2>
                <button
                  onClick={() => setModalActivo("opcionesFactura")}
                  className="text-gray-400 active:text-gray-700 bg-gray-50 md:bg-transparent rounded-full p-1 md:p-0"
                >
                  <XCircle className="h-6 w-6 md:h-5 md:w-5" />
                </button>
              </div>
              <div className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                {facturaSeleccionada?.abonos?.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {facturaSeleccionada.abonos.map((abono) => (
                      <div
                        key={abono.id_abono}
                        className="p-5 md:p-4 flex justify-between items-center active:bg-gray-50 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex flex-col flex-1 pr-4">
                          <div className="flex justify-between items-start mb-1.5 md:mb-1">
                            <p className="font-black text-[#0a192f] text-lg md:text-base">
                              ${abono.monto.toLocaleString("es-MX")}{" "}
                              <span className="text-[10px] md:text-xs text-gray-500 font-bold uppercase ml-1">
                                Abonado
                              </span>
                            </p>
                            <span className="text-[10px] md:text-[11px] font-bold text-gray-500 uppercase">
                              {abono.fecha}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 md:gap-y-1 mt-1 text-[11px] md:text-[11px]">
                            <p className="text-gray-600">
                              <span className="font-black text-gray-400 uppercase tracking-wider">
                                Cajero:
                              </span>{" "}
                              <span className="font-bold">
                                {abono.registrado_por}
                              </span>
                            </p>
                            <p className="text-gray-600">
                              <span className="font-black text-gray-400 uppercase tracking-wider">
                                Método:
                              </span>{" "}
                              <span className="font-bold">{abono.metodo}</span>
                            </p>
                            <p className="text-gray-600">
                              <span className="font-black text-gray-400 uppercase tracking-wider">
                                Saldo Ant:
                              </span>{" "}
                              <span className="font-bold">
                                ${abono.saldo_anterior?.toLocaleString("es-MX")}
                              </span>
                            </p>
                            <p className="text-gray-600">
                              <span className="font-black text-gray-400 uppercase tracking-wider">
                                Restante:
                              </span>{" "}
                              <span className="font-bold">
                                ${abono.saldo_restante?.toLocaleString("es-MX")}
                              </span>
                            </p>
                          </div>
                        </div>
                        {userRole === "SU" && (
                          <button
                            onClick={() => confirmarEliminacion("abono", abono)}
                            className="p-3 md:p-2 shrink-0 text-red-400 active:text-red-600 hover:text-red-600 active:bg-red-50 hover:bg-red-50 rounded-xl md:rounded-lg transition-colors border border-transparent active:border-red-100 hover:border-red-100"
                          >
                            <Trash2 className="h-4 w-4 md:h-4 md:w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 text-center text-gray-400">
                    <AlertTriangle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-bold uppercase tracking-wider">
                      No se han registrado abonos a esta factura.
                    </p>
                  </div>
                )}
              </div>
              <div className="p-4 md:p-3 border-t border-gray-100 bg-white md:bg-gray-50 flex justify-end shrink-0 md:rounded-b-xl">
                <button
                  onClick={() => setModalActivo("opcionesFactura")}
                  className="w-full px-4 py-3.5 md:py-2 text-sm md:text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-xl md:rounded active:bg-gray-100 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {modalActivo === "notificacion" && (
            <div className="bg-white rounded-t-3xl md:rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-slide-up md:animate-zoom-in mt-auto mb-auto pb-6 md:pb-0">
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