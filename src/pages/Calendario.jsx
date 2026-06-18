import { useState, useMemo, useContext, useEffect } from "react";
import Select from "react-select";
import { GlobalContext } from "../context/GlobalContext";
import { generarMensajeWA, normalizarTelefonoMX } from "../utils/whatsapp";
import { compromisosService } from "../services/compromisosService";
import { textoSeguro } from "../utils/normalizadores";

import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Send,
  XCircle,
  Check,
  Plus,
  User,
  Smartphone,
  Eye,
  EyeOff,
  PhoneCall,
  Handshake,
  Loader2,
  CalendarDays,
} from "lucide-react";

export default function Calendario() {
  // BLINDAJE: Extracción de currentUser para firmar las operaciones
  const { facturas, clientes, userName, userRole, currentUser } = useContext(GlobalContext);

  const [fechaActual, setFechaActual] = useState(new Date());
  const añoActual = fechaActual.getFullYear();
  const mesActualNum = fechaActual.getMonth();
  const nombresMeses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  const mesActualTexto = `${nombresMeses[mesActualNum]} ${añoActual}`;
  const primerDiaDelMes = new Date(añoActual, mesActualNum, 1).getDay();
  const diasEnElMes = new Date(añoActual, mesActualNum + 1, 0).getDate();

  const fechaHoy = new Date();
  const hoyDiaExacto = fechaHoy.getDate();
  const hoyMesExacto = fechaHoy.getMonth();
  const hoyAnioExacto = fechaHoy.getFullYear();

  const [modalActivo, setModalActivo] = useState(null);
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
  const [mensajeExito, setMensajeExito] = useState({ titulo: "", descripcion: "" });
  const [mostrarCompletados, setMostrarCompletados] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formClienteId, setFormClienteId] = useState(null);
  const [formFacturaSeleccionada, setFormFacturaSeleccionada] = useState("");
  const [formMotivo, setFormMotivo] = useState("");
  const [formTipoEvento, setFormTipoEvento] = useState("Recordatorio");
  const [nuevaFechaReprogramacion, setNuevaFechaReprogramacion] = useState("");

  const [datosWhatsapp, setDatosWhatsapp] = useState({ telefono: "", plantilla: "atrasado", mensaje: "" });
  const [compromisos, setCompromisos] = useState([]);

  useEffect(() => {
    const mesAnioFormat = `${añoActual}-${String(mesActualNum + 1).padStart(2, "0")}`;
    const unsub = compromisosService.escucharCompromisosMes(
      mesAnioFormat,
      (data) => {
        setCompromisos(data);
      },
    );
    return () => unsub();
  }, [mesActualNum, añoActual]);

  const eventosMes = (() => {
    const mapeo = {};
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (facturas) {
      facturas.forEach((f) => {
        if (f.vencimiento) {
          const [fechaParte] = f.vencimiento.split(" ");
          let dia, mes, año;

          if (fechaParte.includes("-")) {
            [año, mes, dia] = fechaParte.split("-").map(Number);
          } else {
            [dia, mes, año] = fechaParte.split("/").map(Number);
          }

          const fechaVencimientoObj = new Date(año, mes - 1, dia);

          if (mes - 1 === mesActualNum && año === añoActual) {
            let estatusEvento = "Pendiente";

            if (f.estatus === "Pagada") estatusEvento = "Completado";
            else if (f.estatus === "Cancelada") estatusEvento = "Cancelado";
            else if (f.estatus === "Reprogramado")
              estatusEvento = "Reprogramado";
            else if (
              f.estatus === "Vencida" ||
              (f.estatus === "Pendiente" && fechaVencimientoObj < hoy)
            ) {
              estatusEvento = "Vencido";
            }

            if (
              !mostrarCompletados &&
              (estatusEvento === "Completado" || estatusEvento === "Cancelado")
            )
              return;

            if (!mapeo[dia]) mapeo[dia] = [];
            mapeo[dia].push({
              id: f.id,
              tipo: "VENCIMIENTO",
              titulo: `Vence ${textoSeguro(f.folio)}`,
              cliente: f.cliente,
              cliente_id: f.cliente_id,
              monto: f.saldo_pendiente ?? f.monto_total ?? 0,
              estatus_evento: estatusEvento,
              telefono: f.telefono || "",
              detalle: f,
              ultima_accion_fecha: f.ultima_accion?.fecha
                ? textoSeguro(f.ultima_accion.fecha)
                : "Reciente",
              responsable_accion: f.ultima_accion?.responsable
                ? textoSeguro(f.ultima_accion.responsable)
                : "Sistema",
            });
          }
        }
      });
    }

    compromisos.forEach((c) => {
      let dia = 1;
      if (c.fecha_compromiso && c.fecha_compromiso.toDate) {
        dia = c.fecha_compromiso.toDate().getDate();
      } else if (c.fecha_compromiso && c.fecha_compromiso.seconds) {
        dia = new Date(c.fecha_compromiso.seconds * 1000).getDate();
      }

      const estatusEvento = c.estatus || "Pendiente";

      if (
        !mostrarCompletados &&
        (estatusEvento === "Completado" || estatusEvento === "Cancelado")
      )
        return;

      if (!mapeo[dia]) mapeo[dia] = [];
      mapeo[dia].push({
        id: c.id,
        tipo: c.tipo_evento || "COMPROMISO",
        titulo: c.motivo,
        cliente: c.cliente_nombre,
        cliente_id: c.cliente_id,
        monto: c.monto,
        telefono: c.telefono || "",
        estatus_evento: estatusEvento,
        detalle: { folio: c.folio_factura, cliente: c.cliente_nombre },
        ultima_accion_fecha: c.ultima_accion_fecha,
        responsable_accion: c.ultima_accion?.responsable
          ? textoSeguro(c.ultima_accion.responsable)
          : "Admin",
      });
    });

    return mapeo;
  })();

  const opcionesClientes = useMemo(() => {
    return clientes
      .filter(
        (c) => c.activo !== false && c.estatus !== "Inactivo",
      )
      .map((c) => ({
        value: c.id,
        label:
          c.nombre +
          (c.numero_cliente ? " - #" + c.numero_cliente : ""),
      }));
  }, [clientes]);

  const facturasClienteSeleccionado = useMemo(() => {
    if (!formClienteId) return [];
    return facturas.filter(
      (f) =>
        f.cliente_id === formClienteId &&
        f.estatus !== "Pagada" &&
        f.estatus !== "Cancelada",
    );
  }, [facturas, formClienteId]);

  const cambiarMes = (direccion) => {
    const nuevaFecha = new Date(fechaActual);
    nuevaFecha.setMonth(nuevaFecha.getMonth() + direccion);
    setFechaActual(nuevaFecha);
  };

  const abrirDia = (dia) => {
    setDiaSeleccionado(dia);
    setModalActivo("verDia");
  };

  const cerrarModal = () => {
    if (isSubmitting) return;
    setModalActivo(null);
    setFormClienteId(null);
    setFormFacturaSeleccionada("");
    setFormMotivo("");
    setFormTipoEvento("Recordatorio");
    setNuevaFechaReprogramacion("");
  };

  const abrirModalWhatsapp = (ev) => {
    setEventoSeleccionado(ev);
    const plantillaInicial =
      ev.estatus_evento === "Vencido"
        ? "atrasado"
        : ev.tipo === "VENCIMIENTO"
          ? "proximo"
          : "manual";

    const datosFacturaFalsa = {
      cliente: ev.cliente,
      folio: ev.detalle?.folio || "S/F",
      saldo_pendiente: ev.monto || 0,
      vencimiento: ev.detalle?.vencimiento || "los próximos días",
    };

    const clienteDB =
      clientes.find((c) => c.id === ev.cliente_id) ||
      clientes.find((c) => c.nombre === ev.cliente);
    const telefonoReal =
      clienteDB?.telefono || ev.telefono || ev.detalle?.telefono || "";

    setDatosWhatsapp({
      telefono: telefonoReal,
      plantilla: plantillaInicial,
      mensaje: generarMensajeWA(plantillaInicial, datosFacturaFalsa),
    });
    setModalActivo("whatsapp");
  };

  const enviarWhatsApp = async () => {
    if (!currentUser?.uid) {
      alert("Error: No se identificó al usuario responsable de la acción.");
      return;
    }

    setIsSubmitting(true);
    try {
      const numeroLimpio = normalizarTelefonoMX(datosWhatsapp.telefono);

      if (!numeroLimpio.startsWith("52") || numeroLimpio.length !== 12) {
        alert(
          "El número de teléfono no parece válido. Revisa que tenga 10 dígitos.",
        );
        setIsSubmitting(false);
        return;
      }

      const mensajeCodificado = encodeURIComponent(datosWhatsapp.mensaje);
      const url = `https://wa.me/${numeroLimpio}?text=${mensajeCodificado}`;

      window.open(url, "_blank", "noopener,noreferrer");

      const res = await compromisosService.registrarWhatsAppCompromiso({
        idCompromiso:
          eventoSeleccionado.tipo !== "VENCIMIENTO"
            ? eventoSeleccionado.id
            : null,
        esFacturaAuto: eventoSeleccionado.tipo === "VENCIMIENTO",
        clienteNombre: eventoSeleccionado.cliente,
        tipoMensaje: datosWhatsapp.plantilla,
        userName: userName,
        actor_uid: currentUser.uid // BLINDAJE INYECTADO
      });

      if (res.success) {
        setMensajeExito({
          titulo: "WhatsApp Abierto",
          descripcion: "WhatsApp se abrió y la acción quedó registrada en la bitácora.",
        });
        setModalActivo("exito");
      } else {
        alert(
          "Aviso abierto, pero falló el registro en base de datos: " +
            res.error,
        );
      }
    } catch (error) {
      console.error(error);
      alert("Error inesperado al registrar WhatsApp.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAgregarRecordatorio = async (e) => {
    e.preventDefault();

    if (!currentUser?.uid) {
      alert("Error: No se identificó al usuario responsable de la acción.");
      return;
    }

    if (!formClienteId) {
      alert("Por favor seleccione un cliente desde el buscador.");
      return;
    }

    if (!formMotivo.trim()) {
      alert("Escriba un motivo válido.");
      return;
    }

    setIsSubmitting(true);

    const clienteSeleccionado = clientes.find((c) => c.id === formClienteId);

    if (!clienteSeleccionado) {
      setIsSubmitting(false);
      alert(
        "No se pudo enlazar el cliente seleccionado. Recarga la página e intenta de nuevo.",
      );
      return;
    }

    const mesFormat = String(mesActualNum + 1).padStart(2, "0");
    const diaFormat = String(diaSeleccionado).padStart(2, "0");
    const fechaArmada = `${añoActual}-${mesFormat}-${diaFormat}`;

    let facturaIdReal = null;
    let folioFacturaReal = "S/F";
    let montoReal = 0;

    if (formFacturaSeleccionada) {
      const facObj = facturas.find((f) => f.id === formFacturaSeleccionada);
      if (facObj) {
        facturaIdReal = facObj.id;
        folioFacturaReal = facObj.folio || "S/F";
        montoReal = Number(facObj.saldo_pendiente || facObj.monto_total || 0);
      }
    }

    const dataCompromiso = {
      fecha: fechaArmada,
      cliente_id: clienteSeleccionado.id,
      cliente_nombre: clienteSeleccionado.nombre,
      factura_id: facturaIdReal,
      folio_factura: folioFacturaReal,
      tipo_evento: formTipoEvento,
      motivo: formMotivo,
      monto: montoReal,
      telefono: clienteSeleccionado.telefono || "",
    };

    const res = await compromisosService.crearCompromiso(
      dataCompromiso,
      userName,
      currentUser.uid // BLINDAJE INYECTADO
    );
    setIsSubmitting(false);

    if (res.success) {
      cerrarModal();
      setMensajeExito({
        titulo: "Seguimiento Guardado",
        descripcion: `El evento ha sido clasificado y agendado exitosamente en la nube.`,
      });
      setModalActivo("exito");
    } else {
      alert("Error al guardar el compromiso: " + res.error);
    }
  };

  const procesarReprogramacion = async (e) => {
    e.preventDefault();

    if (!currentUser?.uid) {
      alert("Error: No se identificó al usuario responsable de la acción.");
      return;
    }

    if (!nuevaFechaReprogramacion) return;

    setIsSubmitting(true);
    const res = await compromisosService.reprogramarCompromiso(
      eventoSeleccionado.id,
      nuevaFechaReprogramacion,
      eventoSeleccionado.cliente,
      userName,
      currentUser.uid // BLINDAJE INYECTADO
    );
    setIsSubmitting(false);

    if (res.success) {
      cerrarModal();
      setMensajeExito({
        titulo: "Compromiso Reprogramado",
        descripcion: `La nueva fecha ha sido pactada y guardada en el historial.`,
      });
      setModalActivo("exito");
    } else {
      alert("Error al reprogramar: " + res.error);
    }
  };

  const handleActualizarEstado = async (evento, nuevoEstatus) => {
    if (!currentUser?.uid) {
      alert("Error: No se identificó al usuario responsable de la acción.");
      return;
    }

    if (evento.tipo === "VENCIMIENTO") {
      alert(
        "Acción denegada: El estado de las facturas automáticas solo puede modificarse ingresando un abono en el módulo de Facturación.",
      );
      return;
    }

    if (nuevoEstatus === evento.estatus_evento) return;

    if (["Completado", "Cancelado"].includes(evento.estatus_evento)) {
      alert(
        "Este compromiso ya fue cerrado y no puede cambiar nuevamente de estado.",
      );
      return;
    }

    if (nuevoEstatus === "Completado") {
      const res = await compromisosService.completarCompromiso(
        evento.id,
        evento.cliente,
        userName,
        currentUser.uid // BLINDAJE INYECTADO
      );
      if (!res.success)
        alert("No se pudo actualizar el compromiso: " + res.error);
    } else if (nuevoEstatus === "Cancelado") {
      const res = await compromisosService.cancelarCompromiso(
        evento.id,
        evento.cliente,
        userName,
        currentUser.uid // BLINDAJE INYECTADO
      );
      if (!res.success)
        alert("No se pudo cancelar el compromiso: " + res.error);
    } else if (nuevoEstatus === "Reprogramado") {
      setEventoSeleccionado(evento);
      setModalActivo("reprogramar");
    }
  };

  const handleEliminarCompromiso = async (evento) => {
    if (!currentUser?.uid) {
      alert("Error: No se identificó al usuario responsable de la acción.");
      return;
    }

    if (
      window.confirm(
        `¿Estás seguro de eliminar permanentemente este registro del sistema?`,
      )
    ) {
      const res = await compromisosService.eliminarCompromiso(
        evento.id,
        evento.cliente,
        userName,
        currentUser.uid // BLINDAJE INYECTADO
      );
      if (!res.success)
        alert("No se pudo eliminar el compromiso: " + res.error);
    }
  };

  const customSelectStyles = {
    control: (base) => ({
      ...base,
      fontSize: "0.75rem",
      borderColor: "#e5e7eb",
      boxShadow: "none",
      "&:hover": { borderColor: "#60a5fa" },
    }),
    option: (base) => ({
      ...base,
      fontSize: "0.75rem",
    }),
    menu: (base) => ({
      ...base,
      zIndex: 9999,
    }),
  };

  return (
    <div className="flex flex-col space-y-6 animate-fade-in text-sm relative pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0a192f] flex items-center">
            <CalendarIcon className="h-6 w-6 mr-2 text-blue-600" /> Agenda de
            Cobros y Compromisos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitoreo de promesas pactadas y vencimientos automáticos de cuentas
            por cobrar.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-2">
            <h2 className="font-black text-[#0a192f] text-base tracking-tight uppercase font-mono">
              {mesActualTexto}
            </h2>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={() => setMostrarCompletados(!mostrarCompletados)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center transition-colors flex-1 sm:flex-none justify-center border ${mostrarCompletados ? "bg-gray-100 text-gray-700 border-gray-200" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
            >
              {mostrarCompletados ? (
                <EyeOff className="h-3.5 w-3.5 mr-1.5" />
              ) : (
                <Eye className="h-3.5 w-3.5 mr-1.5" />
              )}
              {mostrarCompletados ? "Ocultar Resueltos" : "Mostrar Resueltos"}
            </button>

            <div className="flex items-center space-x-1 shrink-0">
              <button
                onClick={() => cambiarMes(-1)}
                className="p-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-md transition-all text-gray-600"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setFechaActual(new Date())}
                className="px-3 py-1.5 text-[11px] font-bold text-blue-600 border border-transparent hover:bg-blue-50 rounded-md transition-all"
              >
                Hoy
              </button>
              <button
                onClick={() => cambiarMes(1)}
                className="p-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-md transition-all text-gray-600"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar w-full">
          <div className="min-w-[800px] md:min-w-full">
            <div className="grid grid-cols-7 bg-[#0a192f] text-white text-[10px] font-black uppercase tracking-wider text-center py-2 border-b border-gray-200">
              <div>Dom</div>
              <div>Lun</div>
              <div>Mar</div>
              <div>Mié</div>
              <div>Jue</div>
              <div>Vie</div>
              <div>Sáb</div>
            </div>

            <div className="p-0">
              <div className="grid grid-cols-7 gap-0 bg-gray-100 border-l border-t border-gray-100">
                {Array.from({ length: primerDiaDelMes }).map((_, idx) => (
                  <div
                    key={`empty-${idx}`}
                    className="bg-gray-50/50 min-h-[90px] border-b border-r border-gray-100"
                  />
                ))}
                {Array.from({ length: diasEnElMes }).map((_, idx) => {
                  const dia = idx + 1;
                  const listaEventos = eventosMes[dia] || [];
                  const esHoy =
                    dia === hoyDiaExacto &&
                    mesActualNum === hoyMesExacto &&
                    añoActual === hoyAnioExacto;

                  return (
                    <div
                      key={`dia-${dia}`}
                      onClick={() => abrirDia(dia)}
                      className={`min-h-[90px] bg-white border-b border-r border-gray-100 p-1.5 flex flex-col justify-between transition-colors hover:bg-gray-50/60 cursor-pointer ${esHoy ? "bg-blue-50/30" : ""}`}
                    >
                      <div className="flex justify-between items-center">
                        <span
                          className={`text-xs font-bold font-mono h-5 w-5 flex items-center justify-center rounded-full ${esHoy ? "bg-blue-600 text-white shadow-sm" : "text-gray-700"}`}
                        >
                          {dia}
                        </span>
                      </div>
                      <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                        {listaEventos.slice(0, 3).map((ev) => {
                          let badgeColor =
                            "bg-blue-50 text-blue-600 border-blue-100";
                          if (ev.estatus_evento === "Completado")
                            badgeColor =
                              "bg-green-50 text-green-600 border-green-100";
                          else if (ev.estatus_evento === "Vencido")
                            badgeColor =
                              "bg-red-50 text-red-600 border-red-100";
                          else if (ev.estatus_evento === "Reprogramado")
                            badgeColor =
                              "bg-purple-50 text-purple-600 border-purple-100";
                          else if (ev.estatus_evento === "Cancelado")
                            badgeColor =
                              "bg-gray-100 text-gray-500 border-gray-200 opacity-60 line-through";

                          return (
                            <div
                              key={ev.id}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold truncate border flex items-center ${badgeColor}`}
                              title={`${textoSeguro(ev.titulo)} - ${textoSeguro(ev.cliente)}`}
                            >
                              {ev.tipo === "Seguimiento" && (
                                <PhoneCall className="h-2.5 w-2.5 mr-1 shrink-0" />
                              )}
                              {ev.tipo === "Promesa" && (
                                <Handshake className="h-2.5 w-2.5 mr-1 shrink-0" />
                              )}
                              {textoSeguro(ev.titulo)}
                            </div>
                          );
                        })}
                        {listaEventos.length > 3 && (
                          <span className="text-[9px] font-bold text-gray-400 block pl-1 mt-1">
                            +{listaEventos.length - 3} actividades
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {modalActivo === "verDia" && diaSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border animate-scale-up flex flex-col max-h-[90vh]">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center shrink-0">
              <h3 className="font-black text-[#0a192f] text-sm flex items-center gap-1.5">
                <CalendarIcon className="h-4 w-4 text-blue-600" />
                Gestión Operativa: {diaSeleccionado} de{" "}
                {nombresMeses[mesActualNum]}
              </h3>
              <button
                onClick={cerrarModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 bg-white space-y-3 custom-scrollbar">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Comentarios y Vencimientos
              </h4>
              {(eventosMes[diaSeleccionado] || []).length > 0 ? (
                (eventosMes[diaSeleccionado] || []).map((ev) => {
                  const coloresSelector = {
                    Pendiente: "bg-blue-50 text-blue-700 border-blue-200",
                    Completado: "bg-green-50 text-green-700 border-green-200",
                    Reprogramado:
                      "bg-purple-50 text-purple-700 border-purple-200",
                    Vencido: "bg-red-50 text-red-700 border-red-200",
                    Cancelado: "bg-gray-50 text-gray-500 border-gray-200",
                  };

                  return (
                    <div
                      key={ev.id}
                      className={`p-3 border rounded-lg transition-colors flex flex-col gap-2 ${ev.estatus_evento === "Cancelado" ? "bg-gray-50/30 border-gray-100 opacity-70" : "bg-gray-50/50 border-gray-200"}`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {ev.tipo === "VENCIMIENTO" ? (
                              <span
                                className={`text-[9px] font-black uppercase border rounded px-1.5 py-0.5 ${coloresSelector[ev.estatus_evento]}`}
                              >
                                {ev.estatus_evento}
                              </span>
                            ) : (
                              <select
                                value={ev.estatus_evento}
                                onChange={(e) =>
                                  handleActualizarEstado(ev, e.target.value)
                                }
                                disabled={["Completado", "Cancelado"].includes(
                                  ev.estatus_evento,
                                )}
                                title={
                                  ["Completado", "Cancelado"].includes(
                                    ev.estatus_evento,
                                  )
                                    ? "Estado final: no admite más cambios"
                                    : "Cambiar estado del compromiso"
                                }
                                className={`text-[9px] font-black uppercase border rounded px-1.5 py-0.5 outline-none transition-colors ${
                                  ["Completado", "Cancelado"].includes(
                                    ev.estatus_evento,
                                  )
                                    ? "cursor-not-allowed opacity-70"
                                    : "cursor-pointer"
                                } ${coloresSelector[ev.estatus_evento]}`}
                              >
                                <option value="Pendiente">Pendiente</option>
                                <option value="Completado">Completado</option>
                                <option value="Reprogramado">
                                  Reprogramado
                                </option>
                                <option value="Cancelado">Cancelado</option>
                              </select>
                            )}

                            <span className="text-[9px] font-bold text-gray-400 border border-gray-200 px-1 rounded uppercase tracking-wider bg-white">
                              {ev.tipo === "VENCIMIENTO"
                                ? "FACTURA"
                                : textoSeguro(ev.tipo)}
                            </span>
                            <strong className="text-gray-800 font-bold text-xs">
                              {textoSeguro(ev.detalle?.folio, "S/F")}
                            </strong>
                          </div>
                          <p
                            className={`text-xs font-black mt-1.5 uppercase tracking-tight ${ev.estatus_evento === "Cancelado" ? "text-gray-400 line-through" : "text-gray-700"}`}
                          >
                            {textoSeguro(ev.cliente)}
                          </p>
                          <p className="text-[11px] font-medium text-gray-600 mt-0.5">
                            {textoSeguro(ev.titulo)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            onClick={() => abrirModalWhatsapp(ev)}
                            className="p-1.5 bg-white border border-gray-200 text-[#25D366] hover:bg-[#25D366] hover:text-white rounded-md transition-all shadow-sm"
                            title="Contactar vía WhatsApp"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                          {userRole === "SU" && ev.tipo !== "VENCIMIENTO" && (
                            <button
                              onClick={() => handleEliminarCompromiso(ev)}
                              className="p-1.5 bg-white border border-gray-200 text-red-500 hover:bg-red-500 hover:text-white rounded-md transition-all shadow-sm ml-1"
                              title="Eliminar Permanente"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-1 pt-2 border-t border-gray-200/60 flex items-center justify-between text-[9px] text-gray-500">
                        <span className="truncate pr-2">
                          Actualizado: {ev.ultima_accion_fecha}
                        </span>
                        <span className="font-bold text-gray-600 shrink-0 bg-white px-1.5 py-0.5 rounded border border-gray-100 flex items-center">
                          <User className="h-2.5 w-2.5 mr-1" />{" "}
                          {ev.responsable_accion}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-gray-400 py-6 text-center italic">
                  Agenda operativa despejada.
                </p>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0">
              <h4 className="text-xs font-bold text-[#0a192f] uppercase tracking-wider mb-3 flex items-center gap-1">
                <Plus className="h-3.5 w-3.5 text-blue-600" /> Agendar Acción
                Comercial
              </h4>
              <form onSubmit={handleAgregarRecordatorio} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative z-50">
                    <Select
                      options={opcionesClientes}
                      value={
                        opcionesClientes.find(
                          (op) => op.value === formClienteId,
                        ) || null
                      }
                      onChange={(op) => {
                        setFormClienteId(op ? op.value : null);
                        setFormFacturaSeleccionada("");
                      }}
                      placeholder="Buscar Cliente..."
                      isClearable
                      isDisabled={isSubmitting}
                      styles={customSelectStyles}
                      noOptionsMessage={() => "No se encontraron clientes"}
                    />
                  </div>
                  <select
                    value={formTipoEvento}
                    onChange={(e) => setFormTipoEvento(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded text-gray-700 font-bold disabled:opacity-50 bg-white outline-none focus:border-blue-400"
                  >
                    <option value="Recordatorio">Recordatorio Simple</option>
                    <option value="Seguimiento">Llamada de Seguimiento</option>
                    <option value="Promesa">Promesa de Pago</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Motivo o detalle de la acción *"
                      required
                      value={formMotivo}
                      onChange={(e) => setFormMotivo(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded bg-white focus:outline-none focus:border-blue-400 transition-all disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <select
                      value={formFacturaSeleccionada}
                      onChange={(e) =>
                        setFormFacturaSeleccionada(e.target.value)
                      }
                      disabled={
                        isSubmitting || facturasClienteSeleccionado.length === 0
                      }
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded bg-white focus:outline-none focus:border-blue-400 transition-all disabled:opacity-50"
                    >
                      <option value="">SIN FACTURA</option>
                      {facturasClienteSeleccionado.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.folio}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2 bg-[#0a192f] hover:bg-[#1a2b45] text-white font-bold text-xs rounded transition-colors shadow-sm flex items-center justify-center gap-1 mt-1 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  {isSubmitting ? "Guardando..." : "Registrar Compromiso"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {modalActivo === "reprogramar" && eventoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-scale-up">
            <div className="p-4 border-b border-gray-100 bg-purple-50 flex justify-between items-center">
              <h2 className="text-sm font-bold text-purple-900 flex items-center">
                <CalendarDays className="h-4 w-4 mr-2" /> Reprogramar Fecha
              </h2>
              <button
                onClick={cerrarModal}
                className="text-purple-400 hover:text-purple-600 transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={procesarReprogramacion} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                  Cliente / Motivo
                </label>
                <p className="font-bold text-[#0a192f] text-sm">
                  {textoSeguro(eventoSeleccionado.cliente)}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {textoSeguro(eventoSeleccionado.titulo)}
                </p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                  Nueva Fecha de Compromiso
                </label>
                <input
                  type="date"
                  required
                  value={nuevaFechaReprogramacion}
                  onChange={(e) => setNuevaFechaReprogramacion(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 text-sm font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !nuevaFechaReprogramacion}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5 mr-2" />
                )}
                {isSubmitting ? "Procesando..." : "Confirmar Reprogramación"}
              </button>
            </form>
          </div>
        </div>
      )}

      {modalActivo === "whatsapp" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-scale-up mt-10 mb-auto">
            <div className="p-4 border-b border-gray-100 bg-[#25D366] text-white flex justify-between items-center">
              <h2 className="text-base font-bold flex items-center">
                <Smartphone className="h-5 w-5 mr-2" /> Gestión vía WhatsApp
              </h2>
              <button
                onClick={() => setModalActivo("verDia")}
                className="text-green-100 hover:text-white transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col md:flex-row gap-5">
              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">
                    Cliente a Contactar
                  </label>
                  <p className="font-bold text-[#0a192f] text-sm">
                    {textoSeguro(eventoSeleccionado?.cliente)}
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
                    className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 font-mono text-sm"
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
                    onChange={(e) => {
                      const nuevaPlantilla = e.target.value;
                      const datosFacturaFalsa = {
                        cliente: eventoSeleccionado?.cliente,
                        folio: eventoSeleccionado?.detalle?.folio || "S/F",
                        saldo_pendiente: eventoSeleccionado?.monto || 0,
                        vencimiento: "los próximos días",
                      };
                      setDatosWhatsapp({
                        ...datosWhatsapp,
                        plantilla: nuevaPlantilla,
                        mensaje: generarMensajeWA(
                          nuevaPlantilla,
                          datosFacturaFalsa,
                        ),
                      });
                    }}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 bg-white text-sm font-medium"
                  >
                    <option value="atrasado">Cobro: Saldo Vencido</option>
                    <option value="proximo">Aviso: Vencimiento Próximo</option>
                    <option value="manual">Seguimiento Libre</option>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 text-xs resize-none"
                    rows="6"
                  ></textarea>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => setModalActivo("verDia")}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Volver a Agenda
              </button>
              <button
                onClick={enviarWhatsApp}
                disabled={!datosWhatsapp.telefono || isSubmitting}
                className="px-5 py-2 bg-[#25D366] hover:bg-[#1DA851] text-white text-xs font-bold rounded-lg shadow-sm flex items-center transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5 mr-2" />
                )}
                {isSubmitting ? "Registrando..." : "Abrir WhatsApp"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalActivo === "exito" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden text-center p-6 border animate-scale-up">
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-base font-black text-[#0a192f]">
              {textoSeguro(mensajeExito.titulo)}
            </h3>
            <p className="text-xs text-gray-500 mt-1 px-2 leading-relaxed">
              {textoSeguro(mensajeExito.descripcion)}
            </p>
            <button
              onClick={cerrarModal}
              className="w-full mt-5 py-2 bg-green-600 text-white font-bold text-xs rounded-lg hover:bg-green-700 shadow-sm transition-colors"
            >
              Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}