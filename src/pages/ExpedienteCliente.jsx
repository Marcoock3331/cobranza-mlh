import { useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GlobalContext } from "../context/GlobalContext";
import { calcularDiasVencidos } from "../utils/fechas";
import { clientesService } from "../services/clientesService";
import { solicitudesService } from "../services/solicitudesService";
import { useFacturasCliente } from "../hooks/useFacturasCliente";
import {
  ArrowLeft, Edit, FileText, User, CheckCircle, Pencil, X, XCircle, TrendingUp,
  Shield, Mail, Tag, MessageSquare, StickyNote, ChevronLeft, ChevronRight, DollarSign,
  Trash2, Loader2, AlertTriangle
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

export default function ExpedienteCliente() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    clientes,
    userRole,
    userName,
    currentUser,
    eliminarFacturaEnNube,
  } = useContext(GlobalContext);

  const [filtroFacturas, setFiltroFacturas] = useState("Historial");
  const [modalActivo, setModalActivo] = useState(null);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [aumentoData, setAumentoData] = useState({ monto: "", motivo: "" });
  const [notificacion, setNotificacion] = useState({ titulo: "", descripcion: "", tipo: "exito" });
  const [clienteForm, setClienteForm] = useState({});
  const [procesandoCredito, setProcesandoCredito] = useState(false);
  const [procesandoEliminacionFactura, setProcesandoEliminacionFactura] =
    useState(false);
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
    mensaje: mensajeFacturasCliente,
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

  const cambiarFiltroFacturas = (tab) => {
    setFiltroFacturas(tab);
  };

  const cambiarPagina = async (direccion) => {
    if (direccion > 0) {
      await siguientePagina();
      return;
    }

    await paginaAnterior();
  };

  const deudaReal = Number(clienteBase?.deuda_actual) || 0;
  const saldoVencidoReal = Number(resumenFacturasCliente?.saldoVencido) || 0;

  const limiteCredito = Number(clienteBase?.limite_credito) || 0;
  const tieneLineaCredito = limiteCredito > 0;

  const baseCombinada = clienteBase ? {
    ...clienteBase,
    rfc: clienteBase.rfc || "S/N",
    limite_credito: limiteCredito,
    deuda_actual: deudaReal,
    credito_disponible: tieneLineaCredito ? Math.max(0, limiteCredito - deudaReal) : 0,
    saldo_vencido: saldoVencidoReal,
    direccion: clienteBase.direccion || "Sin dirección registrada.",
    correo: clienteBase.correo || "S/N",
    segmentacion: clienteBase.segmentacion || "Nuevo",
    dias_mensaje: clienteBase.dias_mensaje || "",
    notas_internas: clienteBase.notas_internas || "",
  } : null;

  const cliente = baseCombinada;

  const cerrarModal = () => {
    if (procesandoEliminacionFactura) return;

    setModalActivo(null);
    setFacturaSeleccionada(null);
    setAumentoData({ monto: "", motivo: "" });
  };

  const opcionesSegmentacion = ["Cumplidor", "Moroso", "Riesgo Alto", "Nuevo", "Suspendido"];

  const handleEnviarSolicitud = async (e) => {
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

    const montoSolicitado = Number(aumentoData.monto);

    if (
      !Number.isFinite(montoSolicitado) ||
      montoSolicitado <= 0 ||
      !aumentoData.motivo.trim()
    ) {
      mostrarNotificacion(
        "Campos Incompletos",
        "Ingresa un monto mayor a cero y una justificación.",
        "error",
      );
      return;
    }

    setProcesandoCredito(true);

    try {
      const res =
        userRole !== "SU"
          ? await solicitudesService.crearSolicitudAumento({
              cliente_id: cliente.id,
              cliente: cliente.nombre,
              monto_incremento: montoSolicitado,
              limite_anterior: cliente.limite_credito,
              motivo: aumentoData.motivo.trim(),
              solicitado_por_uid: currentUser.uid,
              solicitado_por_nombre: userName || "ADMIN",
            })
          : await solicitudesService.aplicarAumentoDirectoSU({
              cliente_id: cliente.id,
              cliente_nombre: cliente.nombre,
              monto_incremento: montoSolicitado,
              limite_actual: cliente.limite_credito,
              actor_uid: currentUser.uid,
              actor_nombre: userName || "SU",
            });

      if (!res?.success) {
        mostrarNotificacion(
          "Error",
          res?.error || "No se pudo procesar el aumento de crédito.",
          "error",
        );
        return;
      }

      mostrarNotificacion(
        userRole === "SU" ? "Aumento Aplicado" : "Solicitud Enviada",
        userRole === "SU"
          ? `Se sumaron $${montoSolicitado.toLocaleString("es-MX")} a la línea de crédito.`
          : `Petición por $${montoSolicitado.toLocaleString("es-MX")} en espera de autorización del SU.`,
        "exito",
      );

      setAumentoData({ monto: "", motivo: "" });
    } catch (error) {
      console.error("Error procesando aumento de crédito:", error);
      mostrarNotificacion(
        "Error",
        "Ocurrió un error inesperado al procesar la operación.",
        "error",
      );
    } finally {
      setProcesandoCredito(false);
    }
  };

  const handleGuardarEdicionCliente = async (e) => {
    e.preventDefault();
    
    if (!currentUser?.uid) {
      mostrarNotificacion("Error", "No se identificó al usuario responsable.", "error");
      return;
    }

    const respuesta = await clientesService.modificarCliente(
      cliente.id, 
      clienteForm, 
      cliente.nombre, 
      userName,
      currentUser.uid
    );

    if (respuesta.success) {
      cerrarModal();
      mostrarNotificacion("Cambios Guardados", "Los datos del cliente han sido actualizados en la nube con éxito.", "exito");
    } else {
      mostrarNotificacion("Error", respuesta.error || "Fallo de conexión al guardar en la nube.", "error");
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
      const respuesta = await eliminarFacturaEnNube(
        facturaSeleccionada.id,
      );

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
    return <div className="p-8 text-center font-bold text-gray-500">Cargando expediente o cliente no encontrado...</div>;
  }

  return (
    <div className="flex flex-col space-y-4 md:space-y-6 animate-fade-in relative pb-6 text-sm">
      <div className="flex items-center mt-2 md:mt-4">
        <button
          onClick={() => navigate("/clientes")}
          className="text-gray-500 hover:text-[#0a192f] active:text-[#0a192f] active:bg-gray-100 font-bold flex items-center transition-colors py-2 md:py-0 px-2 md:px-0 rounded-lg -ml-2 md:ml-0"
        >
          <ArrowLeft className="h-5 w-5 md:h-4 md:w-4 mr-1.5" /> Regresar a Clientes
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
          <Edit className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1.5 text-gray-500" /> Editar Perfil
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">Deuda Actual</p>
          <h3 className="text-xl md:text-2xl font-black text-[#0a192f] mt-1">
            ${(cliente.deuda_actual || 0).toLocaleString("es-MX")}
          </h3>
          <p className="text-[10px] md:text-[11px] text-gray-500 mt-1.5 md:mt-2 font-medium">Suma de saldos pendientes</p>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">Límite Crédito</p>
            <button
              onClick={() => setModalActivo("solicitarAumento")}
              className="text-[11px] md:text-xs font-bold text-blue-600 active:text-blue-800 hover:text-blue-800 flex items-center transition-colors p-1 md:p-0 -mr-1 md:mr-0"
            >
              <Pencil className="h-3.5 w-3.5 md:h-3 md:w-3 mr-0.5" /> Modificar
            </button>
          </div>
          {tieneLineaCredito ? (
            <>
              <h3 className="text-xl md:text-2xl font-black text-[#0a192f] mt-1">
                ${(cliente.limite_credito || 0).toLocaleString("es-MX")}
              </h3>
              <p className="text-[10px] md:text-[11px] text-gray-500 mt-1.5 md:mt-2 font-medium">Evaluado por SU</p>
            </>
          ) : (
            <>
              <h3 className="text-lg md:text-xl font-black text-amber-600 mt-1">Sin línea asignada</h3>
              <p className="text-[10px] md:text-[11px] text-amber-600 mt-1.5 md:mt-2 font-medium">Pendiente de evaluación</p>
            </>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">Crédito Disponible</p>
          {tieneLineaCredito ? (
            <>
              <h3 className={`text-xl md:text-2xl font-black mt-1 ${cliente.credito_disponible <= 0 ? "text-red-600" : "text-green-600"}`}>
                ${(cliente.credito_disponible || 0).toLocaleString("es-MX")}
              </h3>
              <p className={`text-[10px] md:text-[11px] mt-1.5 md:mt-2 font-medium px-2 py-0.5 rounded w-fit ${cliente.credito_disponible > 0 ? "text-green-700/80 bg-green-50" : "text-red-700/80 bg-red-50"}`}>
                {cliente.credito_disponible > 0 ? "Margen operativo disponible" : "Límite excedido"}
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg md:text-xl font-black text-gray-400 mt-1">N/A</h3>
              <p className="text-[10px] md:text-[11px] text-gray-500 mt-1.5 md:mt-2 font-medium bg-gray-100 px-2 py-0.5 rounded w-fit">
                El SU debe asignar una línea
              </p>
            </>
          )}
        </div>

        <div className={`p-4 rounded-xl border shadow-sm ${cliente.saldo_vencido > 0 ? "bg-red-50/30 border-red-100" : "bg-white border-gray-100"}`}>
          <p className={`text-[10px] md:text-xs font-bold uppercase tracking-wider ${cliente.saldo_vencido > 0 ? "text-red-500" : "text-gray-400"}`}>Saldo Vencido</p>
          <h3 className={`text-xl md:text-2xl font-black mt-1 ${cliente.saldo_vencido > 0 ? "text-red-600" : "text-[#0a192f]"}`}>
            ${(cliente.saldo_vencido || 0).toLocaleString("es-MX")}
          </h3>
          <p className="text-[10px] md:text-[11px] text-gray-500 mt-1.5 md:mt-2 font-medium">Fuera del plazo permitido</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden h-fit">
          <div className="p-4 border-b border-gray-50 bg-gray-50/30">
            <h3 className="font-bold text-[#0a192f] flex items-center">
              <User className="h-4 w-4 mr-2 text-blue-600" /> Datos de Cliente
            </h3>
          </div>
          <div className="p-4 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">No. Cliente</span>
                <strong className="text-gray-800 font-mono text-sm">#{cliente.numero_cliente || "SIN-FOLIO"}</strong>
              </div>
              <div>
                <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">Grupo</span>
                <strong className="text-gray-800 text-sm">{obtenerEtiquetaGrupo(cliente.grupo)}</strong>
              </div>
            </div>
            <div>
              <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">RFC Comercial</span>
              <strong className="text-sm font-mono text-gray-800">{cliente.rfc}</strong>
            </div>
            <div>
              <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">Correo Electrónico</span>
              <strong className="text-gray-700 font-medium flex items-center gap-1">
                <Mail className="h-3 w-3 text-gray-400" /> {cliente.correo}
              </strong>
            </div>
            <div>
              <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">Teléfono</span>
              <strong className="text-gray-700 block">{cliente.telefono}</strong>
            </div>
            <div>
              <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">Dirección Fiscal / Entrega</span>
              <strong className="text-gray-700 leading-relaxed block font-normal">{cliente.direccion}</strong>
            </div>
            <div>
              <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">Segmentación</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100 mt-1">
                <Tag className="h-3 w-3 mr-1" /> {cliente.segmentacion}
              </span>
            </div>
            {cliente.dias_mensaje && cliente.dias_mensaje !== "" && (
              <div>
                <span className="block font-bold text-amber-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> Días de Mensaje
                </span>
                <strong className="text-gray-800 text-sm">Avisar {cliente.dias_mensaje} días antes del vencimiento.</strong>
              </div>
            )}
            
            <div className="pt-3 border-t border-gray-100 mt-2">
              <span className="block font-bold text-green-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                <DollarSign className="h-4 w-4" /> Último Abono Registrado
              </span>
              <div className="bg-green-50/50 p-3 rounded-lg border border-green-100">
                <p className="text-lg font-black text-green-700">
                  ${(cliente.monto_ultimo_pago || cliente.ultimo_deposito_monto || 0).toLocaleString("es-MX")}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Fecha: {cliente.fecha_ultimo_pago?.toDate ? cliente.fecha_ultimo_pago.toDate().toLocaleDateString() : (cliente.ultimo_deposito_fecha?.toDate ? cliente.ultimo_deposito_fecha.toDate().toLocaleDateString() : 'Sin registros')}
                </p>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">
                  Método: {cliente.metodo_ultimo_pago || cliente.ultimo_deposito_metodo || 'N/A'}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-50">
              <span className="block font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <StickyNote className="h-3 w-3" /> Notas Internas
              </span>
              <p className="text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 leading-relaxed font-serif italic text-xs">
                {cliente.notas_internas ? `"${cliente.notas_internas}"` : "Sin notas registradas."}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="font-bold text-[#0a192f] flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" /> Historial de Facturas
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

          <div className="overflow-x-auto custom-scrollbar w-full min-h-[300px]">
            <table className="w-full text-left text-sm border-collapse min-w-[700px]">
              <thead className="bg-gray-50 text-[11px] md:text-xs font-bold text-gray-500 uppercase border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">Folio</th>
                  <th className="px-4 py-3 whitespace-nowrap">Fechas (Emi / Vcto)</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Total</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Saldo</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {facturasPaginadas.length > 0 ? (
                  facturasPaginadas.map((fac) => {
                    const esVencida = fac.estatus === "Vencida";
                    const esPagada = (fac.saldo_pendiente || 0) <= 0;
                    const diasVencidos = esVencida ? calcularDiasVencidos(fac.vencimiento) : 0;

                    return (
                      <tr
                        key={fac.id}
                        onClick={() => { setFacturaSeleccionada(fac); setModalActivo("verFactura"); }}
                        className="hover:bg-gray-50/80 active:bg-gray-100 cursor-pointer transition-colors text-xs"
                      >
                        <td className="px-4 py-4 md:py-3 font-mono font-bold text-blue-600 text-sm whitespace-nowrap">{fac.folio}</td>
                        <td className="px-4 py-4 md:py-3 text-gray-600 whitespace-nowrap">
                          <div className="font-medium">Emi: {fac.emision}</div>
                          <div className="text-[11px] text-red-500/90 font-mono">Vence: {fac.vencimiento}</div>
                        </td>
                        <td className="px-4 py-4 md:py-3 font-bold text-gray-900 text-right whitespace-nowrap">
                          ${(Number(fac.monto_total) || 0).toLocaleString("es-MX")}
                        </td>
                        <td className="px-4 py-4 md:py-3 font-black text-gray-900 text-right whitespace-nowrap">
                          {(Number(fac.saldo_pendiente) || 0) > 0 ? (
                            <span className={esVencida ? "text-red-600" : "text-[#0a192f]"}>
                              ${(Number(fac.saldo_pendiente) || 0).toLocaleString("es-MX")}
                            </span>
                          ) : (
                            <span className="text-green-600">$0.00</span>
                          )}
                        </td>
                        <td className="px-4 py-4 md:py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-end md:justify-center">
                            <span className={`px-2 py-1 md:py-0.5 rounded text-[10px] font-black uppercase border block whitespace-nowrap ${esPagada ? "bg-green-50 border-green-200 text-green-700" : esVencida ? "bg-red-50 border-red-200 text-red-700" : "bg-blue-50 border-blue-200 text-blue-700"}`}>
                              {esPagada ? "Pagada" : esVencida ? `Vencida (${diasVencidos}d)` : fac.estatus}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-400 font-medium text-sm">
                      {cargandoFacturasCliente
                        ? "Cargando facturas del expediente..."
                        : errorFacturasCliente || "No se encontraron facturas para este filtro."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {(hayPaginaAnterior || hayPaginaSiguiente || facturasPaginadas.length > 0 || cargandoFacturasCliente) && (
            <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center px-4 shrink-0">
              <div className="min-w-0">
                <span className="text-[11px] font-medium text-gray-500 block">
                  Página <strong className="text-gray-700">{paginaFacturas}</strong>
                  {resumenFacturasCliente?.totalFacturas > 0 && (
                    <> · {resumenFacturasCliente.totalFacturas} factura(s) del cliente</>
                  )}
                </span>
                {mensajeFacturasCliente && (
                  <span className="text-[10px] text-blue-600 font-bold block mt-0.5">
                    {mensajeFacturasCliente}
                  </span>
                )}
              </div>
              <div className="flex space-x-2 md:space-x-1 shrink-0">
                <button
                  type="button"
                  onClick={() => cambiarPagina(-1)}
                  disabled={!hayPaginaAnterior || cargandoFacturasCliente}
                  className="p-2 md:p-1 border bg-white rounded-lg md:rounded text-gray-500 hover:bg-gray-50 active:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-5 w-5 md:h-4 md:w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => cambiarPagina(1)}
                  disabled={!hayPaginaSiguiente || cargandoFacturasCliente}
                  className="p-2 md:p-1 border bg-white rounded-lg md:rounded text-gray-500 hover:bg-gray-50 active:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="h-5 w-5 md:h-4 md:w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {modalActivo && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm md:p-4">
          <div className="bg-white rounded-t-3xl md:rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-slide-up md:animate-fade-in max-h-[90vh] pb-6 md:pb-0">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden shrink-0"></div>

            {modalActivo !== "notificacion" && (
              <div className="flex justify-between items-center p-4 md:p-4 border-b border-gray-100 bg-white md:bg-gray-50 shrink-0">
                <h2 className="text-sm font-black text-[#0a192f] flex items-center">
                  {modalActivo === "solicitarAumento" && <><TrendingUp className="h-5 w-5 md:h-4 md:w-4 mr-2 text-blue-600" /> Aumento de Crédito</>}
                  {modalActivo === "editarCliente" && <><Edit className="h-5 w-5 md:h-4 md:w-4 mr-2 text-blue-600" /> Editar Cliente</>}
                  {modalActivo === "verFactura" && <><FileText className="h-5 w-5 md:h-4 md:w-4 mr-2 text-gray-600" /> Factura: <span className="font-mono text-blue-600 ml-1">{facturaSeleccionada?.folio}</span></>}
                  {modalActivo === "confirmarEliminarFactura" && <><AlertTriangle className="h-5 w-5 md:h-4 md:w-4 mr-2 text-red-600" /> Eliminar Factura</>}
                </h2>
                <button onClick={cerrarModal} className="text-gray-400 active:text-red-500 p-1 bg-gray-50 md:bg-transparent rounded-full"><X className="h-6 w-6 md:h-5 md:w-5" /></button>
              </div>
            )}

            <div className="p-5 overflow-y-auto custom-scrollbar">
              {modalActivo === "verFactura" && facturaSeleccionada && (() => {
                const fac = facturaSeleccionada;
                const esVencida = fac.estatus === "Vencida";
                const esPagada = (fac.saldo_pendiente || 0) <= 0;
                const diasVencidos = esVencida ? calcularDiasVencidos(fac.vencimiento) : 0;
                const montoTotal = Number(fac.monto_total) || 0;
                const saldoPendiente = Number(fac.saldo_pendiente) || 0;
                const montoAbonado = montoTotal - saldoPendiente;
                const porcentajeLiquidado = montoTotal > 0 ? (montoAbonado / montoTotal) * 100 : 0;
                const observacionLimpia = String(fac.observaciones || "")
                  .replace(/^observaciones\s*:\s*/i, "")
                  .trim();

                return (
                  <div className="flex flex-col space-y-5 md:space-y-4">
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 md:p-3 rounded-xl md:rounded-lg border border-gray-100 text-xs">
                      <div>
                        <span className="block font-black text-[10px] text-gray-400 uppercase tracking-wider mb-1 md:mb-0.5">Emisión / Vcto</span>
                        <strong className="text-gray-800 text-sm md:text-xs block md:inline">
                          {fac.emision} <span className="hidden md:inline text-gray-400 font-normal mx-1">|</span> <span className={`block md:inline mt-0.5 md:mt-0 ${esVencida ? "text-red-500" : ""}`}>{fac.vencimiento}</span>
                        </strong>
                      </div>
                      <div>
                        <span className="block font-black text-[10px] text-gray-400 uppercase tracking-wider mb-1 md:mb-0.5">Estatus Actual</span>
                        <span className={`inline-block px-2.5 py-1 md:py-0.5 font-black uppercase rounded text-[10px] md:text-[10px] ${esPagada ? "bg-green-100 text-green-800" : esVencida ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}>
                          {esPagada ? "Pagada" : esVencida ? `Vencida (${diasVencidos}d)` : fac.estatus}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-4 md:p-3 rounded-xl md:rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase mb-2 md:mb-1.5">
                        <span>Progreso de Pago</span><span className={esPagada ? "text-green-600" : ""}>{porcentajeLiquidado.toFixed(1)}% Liquidado</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 md:h-2">
                        <div className={`h-2.5 md:h-2 rounded-full transition-all duration-500 ${esPagada ? "bg-green-500" : esVencida ? "bg-red-500" : "bg-blue-500"}`} style={{ width: `${porcentajeLiquidado}%` }}></div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold mt-3 md:mt-2 pt-3 md:pt-2 border-t border-gray-50">
                        <div className="flex flex-col"><span className="text-gray-400 uppercase">Facturado</span><span className="text-gray-800 text-sm md:text-xs font-black">${montoTotal.toLocaleString("es-MX")}</span></div>
                        <div className="flex flex-col border-l border-r border-gray-100"><span className="text-gray-400 uppercase">Abonado</span><span className="text-green-600 text-sm md:text-xs font-black">${montoAbonado.toLocaleString("es-MX")}</span></div>
                        <div className="flex flex-col"><span className="text-gray-400 uppercase">Faltante</span><span className={`text-sm md:text-xs font-black ${esPagada ? "text-green-600" : esVencida ? "text-red-600" : "text-[#0a192f]"}`}>${saldoPendiente.toLocaleString("es-MX")}</span></div>
                      </div>
                    </div>

                    <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-sm">
                      <div className="absolute inset-y-0 left-0 w-1 bg-amber-400" />

                      <div className="p-4 pl-5 md:p-3 md:pl-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center min-w-0">
                            <div className="h-8 w-8 shrink-0 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center">
                              <StickyNote className="h-4 w-4 text-amber-700" />
                            </div>

                            <div className="ml-2.5 min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-amber-700">
                                Observaciones de la factura
                              </p>
                              <p className="text-[10px] text-amber-600/80 mt-0.5">
                                Nota interna para seguimiento operativo
                              </p>
                            </div>
                          </div>

                          <span
                            className={`shrink-0 px-2 py-1 rounded-full border text-[9px] font-black uppercase tracking-wide ${
                              observacionLimpia
                                ? "bg-amber-100 border-amber-200 text-amber-700"
                                : "bg-gray-100 border-gray-200 text-gray-500"
                            }`}
                          >
                            {observacionLimpia ? "Registrada" : "Sin registro"}
                          </span>
                        </div>

                        <div className="mt-3 rounded-lg border border-amber-100 bg-white/80 px-3 py-3">
                          <p
                            className={`text-xs leading-relaxed whitespace-pre-wrap break-words ${
                              observacionLimpia
                                ? "text-gray-700 font-medium"
                                : "text-gray-400 italic"
                            }`}
                          >
                            {observacionLimpia || "Sin observaciones registradas para esta factura."}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="block font-black text-[#0a192f] text-xs md:text-xs flex items-center mb-2 md:mb-2">
                        <FileText className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1 text-blue-600" /> Historial de Abonos
                      </span>
                      <div className="bg-white rounded-xl md:rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left text-xs md:text-[11px]">
                          <thead className="bg-gray-100 text-gray-500 uppercase font-bold tracking-wider">
                            <tr><th className="px-3 py-2.5 md:py-2">Fecha</th><th className="px-3 py-2.5 md:py-2 text-right">Monto</th><th className="px-3 py-2.5 md:py-2 text-center">Método</th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {fac.abonos && fac.abonos.length > 0 ? (
                              fac.abonos.map((abn, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-3 py-3 md:py-2 font-mono text-gray-600">{abn.fecha?.split(",")[0] || abn.fecha}</td>
                                  <td className="px-3 py-3 md:py-2 font-black text-green-600 text-right">${(Number(abn.monto) || 0).toLocaleString("es-MX")}</td>
                                  <td className="px-3 py-3 md:py-2 text-gray-600 font-medium text-center">{abn.metodo}</td>
                                </tr>
                              ))
                            ) : (
                              <tr><td colSpan="3" className="px-3 py-6 text-center text-gray-400 font-medium italic">No se han registrado pagos.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className={`grid gap-3 ${userRole === "SU" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                      <button
                        type="button"
                        onClick={() => navigate("/facturas", { state: { editarFactura: fac } })}
                        className="w-full px-4 py-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-black text-xs flex items-center justify-center hover:bg-amber-100 active:bg-amber-100 transition-colors"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar esta factura
                      </button>

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
                  </div>
                );
              })()}

              {modalActivo === "confirmarEliminarFactura" && facturaSeleccionada && (
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
                <form id="formEditarCliente" onSubmit={handleGuardarEdicionCliente} className="space-y-5 md:space-y-4 text-sm md:text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-3">
                    <div>
                      <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">No. Cliente</label>
                      <input type="text" value={clienteForm.numero_cliente || ""} onChange={(e) => setClienteForm({ ...clienteForm, numero_cliente: e.target.value })} placeholder="Ej. CLI-007" className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md font-bold uppercase focus:ring-2 focus:ring-[#ffd700] outline-none" />
                    </div>
                    <div>
                      <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">Razón Social</label>
                      <input type="text" value={clienteForm.nombre || ""} onChange={(e) => setClienteForm({ ...clienteForm, nombre: e.target.value })} className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md font-bold focus:ring-2 focus:ring-[#ffd700] outline-none" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:gap-3">
                    <div>
                      <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">RFC</label>
                      <input type="text" value={clienteForm.rfc || ""} onChange={(e) => setClienteForm({ ...clienteForm, rfc: e.target.value })} className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md font-mono uppercase focus:ring-2 focus:ring-[#ffd700] outline-none" required />
                    </div>
                    <div>
                      <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">Teléfono</label>
                      <input type="tel" value={clienteForm.telefono || ""} onChange={(e) => setClienteForm({ ...clienteForm, telefono: e.target.value })} className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md focus:ring-2 focus:ring-[#ffd700] outline-none" required />
                    </div>
                  </div>
                  <div>
                    <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">Correo</label>
                    <input type="email" value={clienteForm.correo || ""} onChange={(e) => setClienteForm({ ...clienteForm, correo: e.target.value })} className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md focus:ring-2 focus:ring-[#ffd700] outline-none" required />
                  </div>
                  <div>
                    <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">Dirección</label>
                    <textarea value={clienteForm.direccion || ""} onChange={(e) => setClienteForm({ ...clienteForm, direccion: e.target.value })} rows="2" className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md resize-none focus:ring-2 focus:ring-[#ffd700] outline-none" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:gap-3">
                    <div>
                      <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">Grupo</label>
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
                      <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">Segmentación</label>
                      <select value={clienteForm.segmentacion || ""} onChange={(e) => setClienteForm({ ...clienteForm, segmentacion: e.target.value })} className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md outline-none">
                        {opcionesSegmentacion.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">Días de Mensaje (Aviso)</label>
                    <input type="number" value={clienteForm.dias_mensaje || ""} onChange={(e) => setClienteForm({ ...clienteForm, dias_mensaje: e.target.value })} placeholder="Ej. 5" className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md focus:ring-2 focus:ring-[#ffd700] outline-none" />
                  </div>
                  <div>
                    <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">Notas Internas</label>
                    <textarea value={clienteForm.notas_internas || ""} onChange={(e) => setClienteForm({ ...clienteForm, notas_internas: e.target.value })} rows="2" className="w-full px-4 py-3 md:px-3 md:py-2 bg-yellow-50/50 focus:bg-yellow-50 border border-yellow-200 rounded-xl md:rounded-md resize-none font-serif focus:ring-2 focus:ring-[#ffd700] outline-none" />
                  </div>
                </form>
              )}

              {modalActivo === "solicitarAumento" && (
                <form onSubmit={handleEnviarSolicitud} className="space-y-5 md:space-y-4">
                  {userRole === "SU" ? (
                    <div className="bg-amber-50 p-4 md:p-3 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-start gap-3">
                      <Shield className="h-5 w-5 md:h-4 md:w-4 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">Al ser <strong>Súper Usuario</strong>, el aumento se sumará inmediatamente a la línea de crédito y quedará registrado en bitácora.</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-xl">Se enviará una solicitud al SU para aprobación remota.</p>
                  )}

                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Límite Actual</label>
                    <input type="text" disabled value={`$${(cliente.limite_credito || 0).toLocaleString("es-MX")}`} className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-100 border rounded-xl md:rounded-md font-bold text-gray-600" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Monto de Aumento (+)</label>
                    <input type="number" required min="1" value={aumentoData.monto} onChange={(e) => setAumentoData({ ...aumentoData, monto: e.target.value })} placeholder="Ej. 5000" className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md focus:ring-2 focus:ring-[#ffd700] outline-none font-bold" />
                    {aumentoData.monto && (
                      <p className="text-[10px] md:text-[10px] text-blue-600 mt-1.5 font-black uppercase">
                        Límite final esperado: ${(cliente.limite_credito + Number(aumentoData.monto)).toLocaleString("es-MX")}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Justificación</label>
                    <textarea required value={aumentoData.motivo} onChange={(e) => setAumentoData({ ...aumentoData, motivo: e.target.value })} rows="2" className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md resize-none focus:ring-2 focus:ring-[#ffd700] outline-none" />
                  </div>

                  <div className="pt-4 md:border-t flex flex-col-reverse md:flex-row justify-end gap-3 shrink-0">
                    <button type="button" onClick={cerrarModal} disabled={procesandoCredito} className="w-full md:w-auto px-4 py-3.5 md:py-2 text-sm md:text-xs font-bold text-gray-700 bg-white border rounded-xl md:rounded-lg active:bg-gray-100 disabled:opacity-50">Cancelar</button>
                    {userRole === "SU" ? (
                      <button type="submit" disabled={procesandoCredito} className="w-full md:w-auto px-5 py-3.5 md:py-2 text-sm md:text-xs font-black text-white bg-green-600 rounded-xl md:rounded-lg active:bg-green-700 flex items-center justify-center disabled:opacity-50">
                        <CheckCircle className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1.5" />
                        {procesandoCredito ? "Procesando..." : "Aplicar Directo"}
                      </button>
                    ) : (
                      <button type="submit" disabled={procesandoCredito} className="w-full md:w-auto px-5 py-3.5 md:py-2 text-sm md:text-xs font-black text-[#0a192f] bg-[#ffd700] rounded-xl md:rounded-lg active:bg-[#e6c200] flex items-center justify-center disabled:opacity-50">
                        {procesandoCredito ? "Enviando..." : "Enviar Petición"}
                      </button>
                    )}
                  </div>
                </form>
              )}

              {modalActivo === "notificacion" && (
                <div className="text-center py-4 md:py-2 animate-fade-in">
                  <div className={`h-16 w-16 md:h-14 md:w-14 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-3 ring-4 ${notificacion.tipo === "error" ? "bg-red-100 ring-red-50 text-red-600" : "bg-green-100 ring-green-50 text-green-600"}`}>
                    {notificacion.tipo === "error" ? <XCircle className="h-8 w-8 md:h-7 md:w-7" /> : <CheckCircle className="h-8 w-8 md:h-7 md:w-7" />}
                  </div>
                  <h3 className="text-xl md:text-lg font-black text-[#0a192f] mb-2 md:mb-1">{notificacion.titulo}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed px-2">{notificacion.descripcion}</p>
                </div>
              )}
            </div>

            {modalActivo !== "solicitarAumento" && (
              <div className="p-4 md:p-4 border-t border-gray-100 bg-white md:bg-gray-50 flex flex-col-reverse md:flex-row justify-end gap-3 md:gap-3 rounded-b-xl shrink-0">
                {modalActivo === "notificacion" ? (
                  <button onClick={cerrarModal} className={`w-full md:w-auto px-6 py-3.5 md:py-2 text-sm md:text-xs font-black text-white rounded-xl md:rounded-lg active:opacity-80 transition-colors ${notificacion.tipo === "error" ? "bg-red-600" : "bg-green-600"}`}>Aceptar</button>
                ) : modalActivo === "editarCliente" ? (
                  <>
                    <button type="button" onClick={cerrarModal} className="w-full md:w-auto px-4 py-3.5 md:py-2 text-sm md:text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-xl md:rounded-lg active:bg-gray-100">Cancelar</button>
                    <button type="submit" form="formEditarCliente" className="w-full md:w-auto px-8 py-3.5 md:py-2 text-sm md:text-xs font-black text-[#0a192f] bg-[#ffd700] rounded-xl md:rounded-lg active:bg-[#e6c200]">Guardar</button>
                  </>
                ) : (
                  <button onClick={cerrarModal} className="w-full md:w-auto px-8 py-3.5 md:py-2 bg-gray-100 md:bg-[#0a192f] text-gray-800 md:text-white font-black text-sm md:text-xs rounded-xl md:rounded-lg active:bg-gray-200">Cerrar</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}