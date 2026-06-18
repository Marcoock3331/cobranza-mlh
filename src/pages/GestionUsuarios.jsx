import { useState, useContext, useMemo } from "react";
import { GlobalContext } from "../context/GlobalContext";
import { usuariosService } from "../services/usuariosService";
import { solicitudesService } from "../services/solicitudesService";
import { textoSeguro } from "../utils/normalizadores";

import {
  Shield, UserPlus, Key, Power, AlertTriangle, CheckCircle, XCircle, Clock, Search,
  User, Users, Check, X, Info, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  FilterX, Activity, Loader2
} from "lucide-react";


const ETIQUETAS_CAMBIOS_FACTURA = {
  cliente_id: "Cliente",
  grupo: "Grupo",
  folio: "Folio",
  monto_total: "Monto total",
  emision: "Emisión",
  vencimiento: "Vencimiento",
  observaciones: "Observaciones",
};

const formatearCambioFactura = (campo, valor) => {
  if (campo === "monto_total") {
    return `$${(Number(valor) || 0).toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
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

export default function GestionUsuarios() {
  // BLINDAJE: Extracción rigurosa para uso en servicios
  const {
    userRole,
    actividad,
    solicitudes,
    currentUser,
    usuarios, 
    userName
  } = useContext(GlobalContext);

  const [tabActiva, setTabActiva] = useState("usuarios");
  const isSuperUser = userRole && userRole.trim().toUpperCase() === "SU";
  const usuarioResponsable = userName || "SU_Admin";

  const [modalActivo, setModalActivo] = useState(null);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [actividadSeleccionada, setActividadSeleccionada] = useState(null);
  const [tempSolicitud, setTempSolicitud] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notificacion, setNotificacion] = useState({ titulo: "", descripcion: "", tipo: "exito" });
  
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    usuario: "",
    password: "",
  });
  const [solicitudesExpandidas, setSolicitudesExpandidas] = useState({});

  const administradores = useMemo(() => {
    return (usuarios || []).filter((u) => u.rol === "ADMIN");
  }, [usuarios]);

  const solicitudesPendientesCount = useMemo(() => {
    return (solicitudes || []).filter((s) => s.estatus === "Pendiente").length;
  }, [solicitudes]);

  const [filtroActividad, setFiltroActividad] = useState({
    busqueda: "", modulo: "Todos", tipo: "Todos", fecha: "",
  });
  const [paginaActividad, setPaginaActividad] = useState(1);
  const registrosPorPaginaAct = 10;

  const actividadFiltrada = useMemo(() => {
    const busquedaLimpia = filtroActividad.busqueda.toLowerCase().trim();
    return (actividad || []).filter((act) => {
      const matchBusqueda =
        (act.cliente || "").toLowerCase().includes(busquedaLimpia) ||
        (act.detalle || "").toLowerCase().includes(busquedaLimpia) ||
        (act.folio || "").toLowerCase().includes(busquedaLimpia);
      const matchModulo = filtroActividad.modulo === "Todos" || act.modulo === filtroActividad.modulo;
      const matchTipo = filtroActividad.tipo === "Todos" || act.tipo === filtroActividad.tipo;

      let matchFecha = true;
      if (filtroActividad.fecha) {
        const [y, m, d] = filtroActividad.fecha.split("-");
        const fechaCorta = `${d}/${m}/${y}`;
        matchFecha = act.fechaHora?.startsWith(fechaCorta);
      }
      return matchBusqueda && matchModulo && matchTipo && matchFecha;
    });
  }, [actividad, filtroActividad]);

  const actividadPaginada = useMemo(() => {
    const inicio = (paginaActividad - 1) * registrosPorPaginaAct;
    return actividadFiltrada.slice(inicio, inicio + registrosPorPaginaAct);
  }, [actividadFiltrada, paginaActividad]);

  const totalPaginasAct = Math.ceil(actividadFiltrada.length / registrosPorPaginaAct);

  const actualizarFiltroActividad = (campo, valor) => {
    setFiltroActividad((prev) => ({ ...prev, [campo]: valor }));
    setPaginaActividad(1);
  };

  const cerrarModal = () => {
    if (isSubmitting) return;
    setModalActivo(null);
    setUsuarioSeleccionado(null);
    setActividadSeleccionada(null);
    setTempSolicitud(null);
  };

  const mostrarNotificacion = (titulo, descripcion, tipo = "exito") => {
    setNotificacion({ titulo, descripcion, tipo });
    setModalActivo("notificacion");
  };

  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    if (!currentUser?.uid) {
        mostrarNotificacion("Error", "No se pudo identificar al Súper Usuario responsable.", "error");
        return;
    }

    setIsSubmitting(true);
    const res = await usuariosService.crearAdmin({
        nombre: nuevoUsuario.nombre,
        usuario: nuevoUsuario.usuario,
        password: nuevoUsuario.password,
        userName: usuarioResponsable,
        actor_uid: currentUser.uid
    });
    setIsSubmitting(false);

    if (res.success) {
        mostrarNotificacion("Usuario Creado", `Las credenciales para ${nuevoUsuario.nombre} han sido generadas y registradas.`);
        setNuevoUsuario({ nombre: "", usuario: "", password: "" });
    } else {
        mostrarNotificacion("Alerta", res.error, "error");
    }
  };

  const abrirConfirmacionEstado = (usuario) => {
    setUsuarioSeleccionado(usuario);
    setModalActivo("confirmarEstado");
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
        nuevoEstado ? "Usuario Reactivado" : "Usuario Suspendido",
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

  const toggleSolicitud = (id) => {
    setSolicitudesExpandidas((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const abrirEvaluarSolicitud = (solicitud, nuevoEstatus) => {
    setTempSolicitud({ ...solicitud, nuevoEstatus });
    setModalActivo("confirmarSolicitud");
  };

  const confirmarSolicitud = async () => {
    if (!tempSolicitud?.id || !currentUser?.uid) {
        mostrarNotificacion("Error", "No se pudo identificar la solicitud o al Súper Usuario.", "error");
        return;
    }

    setIsSubmitting(true);

    try {
        const res = await solicitudesService.resolverSolicitud({
            solicitud_id: tempSolicitud.id,
            decision: tempSolicitud.nuevoEstatus,
            actor_uid: currentUser.uid,
            actor_nombre: usuarioResponsable,
        });

        if (!res.success) {
            mostrarNotificacion("Error al resolver", res.error || "No se pudo procesar la solicitud.", "error");
            return;
        }

        mostrarNotificacion(
            tempSolicitud.nuevoEstatus === "Autorizado" ? "Solicitud Aprobada" : "Solicitud Rechazada",
            tempSolicitud.nuevoEstatus === "Autorizado"
                ? "El aumento fue aplicado al límite y al crédito disponible del cliente."
                : "La solicitud fue rechazada sin modificar la línea de crédito."
        );

        setTempSolicitud(null);
    } catch (error) {
        console.error("Error resolviendo solicitud:", error);
        mostrarNotificacion("Error crítico", "Ocurrió un error inesperado al resolver la solicitud.", "error");
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4 md:space-y-6 animate-fade-in relative pb-10 text-sm">
      {!isSuperUser ? (
        <div className="h-[60vh] flex flex-col items-center justify-center text-center p-6 bg-white rounded-xl border border-gray-100 shadow-sm animate-in zoom-in duration-300">
          <div className="bg-red-50 p-4 rounded-full text-red-500 mb-4"><Shield className="h-10 w-10" /></div>
          <h2 className="text-xl font-black text-[#0a192f]">Área Privada Requerida</h2>
          <p className="text-gray-400 max-w-sm text-xs mt-1 leading-relaxed">
            No posees el rango maestro de SuperUsuario para modificar accesos de personal o auditar operaciones financieras.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mt-2 md:mt-4 gap-2 md:gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-[#0a192f] flex items-center">
                <Shield className="h-5 w-5 md:h-6 md:w-6 mr-2 text-amber-500" /> Panel de Control SU
              </h1>
              <p className="text-xs md:text-sm text-gray-500 mt-1">Gestión interna de credenciales, bandeja de riesgo y monitor de actividad global.</p>
            </div>
          </div>

          <div className="flex border-b border-gray-200 bg-white p-1.5 md:p-1 rounded-xl md:rounded-lg border w-full md:w-fit shadow-sm overflow-x-auto custom-scrollbar hide-scrollbar-mobile shrink-0">
            <button onClick={() => setTabActiva("usuarios")} className={`whitespace-nowrap px-5 py-3 md:py-2 text-xs font-bold rounded-lg md:rounded-md transition-all flex-1 md:flex-none ${tabActiva === "usuarios" ? "bg-[#0a192f] text-white shadow-sm" : "text-gray-500 hover:text-[#0a192f] active:bg-gray-100"}`}>Control de Personal</button>
            <button onClick={() => setTabActiva("solicitudes")} className={`whitespace-nowrap px-5 py-3 md:py-2 text-xs font-bold rounded-lg md:rounded-md transition-all flex items-center justify-center flex-1 md:flex-none ${tabActiva === "solicitudes" ? "bg-[#0a192f] text-white shadow-sm" : "text-gray-500 hover:text-[#0a192f] active:bg-gray-100"}`}>
              Bandeja de Créditos
              {solicitudesPendientesCount > 0 && <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 md:py-0.2 rounded-full font-mono">{solicitudesPendientesCount}</span>}
            </button>
            <button onClick={() => setTabActiva("actividad")} className={`whitespace-nowrap px-5 py-3 md:py-2 text-xs font-bold rounded-lg md:rounded-md transition-all flex-1 md:flex-none ${tabActiva === "actividad" ? "bg-[#0a192f] text-white shadow-sm" : "text-gray-500 hover:text-[#0a192f] active:bg-gray-100"}`}>Actividad del Sistema</button>
          </div>

          {tabActiva === "usuarios" && (
            <div className="space-y-4 md:space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-white p-4 md:p-4 rounded-xl shadow-sm border border-gray-100 gap-3">
                <div className="flex items-center text-gray-600 text-xs font-bold uppercase tracking-wider">
                  <Users className="h-4 w-4 mr-2 text-blue-600" />
                  Operadores Registrados: <span className="font-black ml-1 text-[#0a192f] text-sm md:text-sm">{administradores.length}</span>
                </div>
                <button onClick={() => setModalActivo("nuevoUsuario")} className="w-full sm:w-auto px-4 py-3 md:py-2 bg-[#0a192f] text-white font-bold text-xs rounded-xl md:rounded-md hover:bg-[#1a2b45] active:bg-[#1a2b45] flex items-center justify-center shadow-sm">
                  <UserPlus className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1.5" /> Crear Acceso Admin
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {administradores.map((usuario) => (
                  <div key={usuario.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${!usuario.activo ? "border-red-100 opacity-75" : "border-gray-100 hover:shadow-md"}`}>
                    <div className={`p-4 border-b flex justify-between items-start ${!usuario.activo ? "bg-red-50/20" : "bg-gray-50/40"}`}>
                      <div className="flex items-center min-w-0">
                        <div className={`h-10 w-10 md:h-9 md:w-9 rounded-full flex items-center justify-center font-black text-white shrink-0 text-sm bg-[#0a192f]`}>
                          {textoSeguro(usuario.nombre).charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-3 min-w-0">
                          <p className="font-bold text-[#0a192f] text-base md:text-sm truncate">{textoSeguro(usuario.nombre)}</p>
                          <p className="text-[11px] text-gray-400 font-mono mt-0.5 truncate">{textoSeguro(usuario.correo)}</p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 md:py-0.2 rounded border shrink-0 bg-blue-50 text-blue-700 border-blue-100`}>
                        {textoSeguro(usuario.rol)}
                      </span>
                    </div>
                    <div className="p-4 space-y-2 md:space-y-2 bg-white">
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="h-4 w-4 md:h-3.5 md:w-3.5 mr-2 text-gray-400 shrink-0" />
                        <span className="truncate">Última entrada: <strong className="text-gray-700 font-mono">{textoSeguro(usuario.ultima_entrada, "Nunca")}</strong></span>
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <div className={`h-2 w-2 md:h-1.5 md:w-1.5 rounded-full mr-2.5 shrink-0 ${usuario.activo ? "bg-green-500" : "bg-red-500"}`}></div>
                        <span>Estatus: <strong className={usuario.activo ? "text-green-700" : "text-red-600"}>{usuario.activo ? "OPERATIVO" : "SUSPENDIDO"}</strong></span>
                      </div>
                    </div>
                    <div className="p-2 md:p-2 bg-gray-50 border-t border-gray-100 flex flex-col gap-2">
                      <button
                        onClick={() => abrirConfirmacionEstado(usuario)}
                        className={`w-full flex items-center justify-center py-2.5 md:py-1.5 rounded-lg md:rounded text-xs font-bold transition-all ${usuario.activo ? "text-red-600 bg-white md:bg-transparent border border-gray-200 md:border-transparent active:bg-red-50 hover:bg-red-50" : "text-green-600 bg-white md:bg-transparent border border-gray-200 md:border-transparent active:bg-green-50 hover:bg-green-50"}`}
                      >
                        <Power className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1.5 md:mr-1" /> {usuario.activo ? "Suspender" : "Reactivar"}
                      </button>
                      
                      <div className="w-full flex items-center justify-center py-2 text-xs font-bold text-gray-400 bg-gray-100/50 rounded-lg cursor-not-allowed border border-gray-200/50 select-none">
                        <Key className="h-4 w-4 mr-1.5 opacity-50" /> Cambio manual
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tabActiva === "solicitudes" && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-100 p-4 md:p-3 rounded-xl flex items-start">
                <AlertTriangle className="h-5 w-5 md:h-4 md:w-4 text-amber-600 mr-3 md:mr-2.5 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 font-medium leading-relaxed">Bandeja de riesgo activa. Las decisiones tomadas en este panel impactan de manera inmediata las carteras y líneas autorizadas.</p>
              </div>
              {(solicitudes || []).length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <CheckCircle className="h-10 w-10 md:h-9 md:w-9 text-green-400 mx-auto mb-3 md:mb-2" />
                  <p className="text-gray-400 font-medium text-xs">No existen trámites de crédito en espera.</p>
                </div>
              ) : (
                <div className="grid gap-3 md:gap-3">
                  {(solicitudes || []).map((solicitud) => {
                    const estaExpandida = !!solicitudesExpandidas[solicitud.id];
                    return (
                      <div key={solicitud.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden relative shadow-sm">
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 md:w-1 ${solicitud.estatus === "Pendiente" ? "bg-amber-400" : solicitud.estatus === "Autorizado" ? "bg-green-500" : "bg-red-500"}`}></div>
                        <div onClick={() => toggleSolicitud(solicitud.id)} className="p-4 md:p-4 pl-5 md:pl-5 flex justify-between items-center cursor-pointer active:bg-gray-50/50 hover:bg-gray-50/20 select-none">
                          <div className="min-w-0 flex-1 pr-3">
                            <div className="flex items-center space-x-2.5 mb-1.5 md:mb-1 flex-wrap gap-y-1.5">
                              <span className={`text-[9px] font-black uppercase px-2 md:px-1.5 py-0.5 md:py-0.2 rounded border ${solicitud.estatus === "Pendiente" ? "bg-amber-50 text-amber-700 border-amber-200" : solicitud.estatus === "Autorizado" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                                {textoSeguro(solicitud.estatus)}
                              </span>
                              <span className="text-[11px] text-gray-400 flex items-center font-mono"><Clock className="h-3 w-3 mr-1" />{textoSeguro(solicitud.fecha, "Sin fecha")}</span>
                            </div>
                            <h3 className="font-bold text-sm md:text-sm text-[#0a192f] truncate">
                              Aumento de Límite de Crédito <span className="font-normal text-gray-400 text-xs hidden sm:inline">— solicitado por {textoSeguro(solicitud.solicitado_por_nombre)}</span>
                            </h3>
                          </div>
                          {estaExpandida ? <ChevronUp className="h-5 w-5 md:h-4 md:w-4 text-gray-400" /> : <ChevronDown className="h-5 w-5 md:h-4 md:w-4 text-gray-400" />}
                        </div>
                        {estaExpandida && (
                          <div className="p-4 md:p-4 pl-5 md:pl-5 border-t border-gray-50 bg-gray-50/30 flex flex-col md:flex-row justify-between md:items-center gap-4 md:gap-4 animate-in fade-in duration-200">
                            <div className="flex-1 text-xs md:text-xs">
                              <p className="font-black text-gray-700 text-sm md:text-sm uppercase tracking-tight">{textoSeguro(solicitud.cliente)}</p>
                              <div className="mt-2.5 md:mt-2 bg-white p-3 md:p-3 rounded-lg border border-gray-100 leading-relaxed text-gray-600 shadow-sm">
                                <p><strong className="text-gray-800">Argumento de Alta:</strong> "{textoSeguro(solicitud.motivo)}"</p>
                                <p className="mt-1.5 font-medium">
                                  Límite actual: ${(Number(solicitud.limite_anterior) || 0).toLocaleString("es-MX")}
                                  {" → "}
                                  <strong className="text-blue-600 font-bold block sm:inline mt-0.5 sm:mt-0">
                                    Nuevo límite: ${(Number(solicitud.nuevo_limite_propuesto) || 0).toLocaleString("es-MX")}
                                  </strong>
                                </p>
                                <p className="mt-1 text-gray-500">
                                  Incremento solicitado: <strong>${(Number(solicitud.monto_incremento) || 0).toLocaleString("es-MX")}</strong>
                                </p>
                              </div>
                            </div>
                            {solicitud.estatus === "Pendiente" && (
                              <div className="flex md:flex-col gap-3 md:gap-2 shrink-0 w-full md:w-auto">
                                <button onClick={() => abrirEvaluarSolicitud(solicitud, "Autorizado")} className="flex-1 px-4 py-3 md:py-2 bg-green-600 active:bg-green-700 hover:bg-green-700 text-white text-xs md:text-xs font-bold rounded-xl md:rounded shadow-sm flex items-center justify-center transition-colors"><Check className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1" /> Aprobar</button>
                                <button onClick={() => abrirEvaluarSolicitud(solicitud, "Rechazado")} className="flex-1 px-4 py-3 md:py-2 bg-white border border-red-200 text-red-600 text-xs md:text-xs font-bold rounded-xl md:rounded active:bg-red-50 hover:bg-red-50 flex items-center justify-center transition-colors"><X className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1" /> Denegar</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tabActiva === "actividad" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center space-x-2.5 md:space-x-2">
                  <Activity className="h-5 w-5 md:h-5 md:w-5 text-blue-600" />
                  <div>
                    <h2 className="font-black text-[#0a192f] text-sm md:text-sm tracking-tight">Registro Unificado de Actividad</h2>
                    <p className="text-[11px] md:text-[11px] text-gray-400 font-medium">Auditoría inmutable de eventos clave operativos.</p>
                  </div>
                </div>
                {(filtroActividad.busqueda || filtroActividad.modulo !== "Todos" || filtroActividad.tipo !== "Todos" || filtroActividad.fecha) && (
                  <button onClick={() => setFiltroActividad({ busqueda: "", modulo: "Todos", tipo: "Todos", fecha: "" })} className="flex items-center px-3 md:px-2.5 py-2.5 md:py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg md:rounded active:bg-red-100 hover:bg-red-100 transition-colors w-full sm:w-auto justify-center"><FilterX className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1.5 md:mr-1" /> Limpiar Filtros</button>
                )}
              </div>
              <div className="p-4 border-b border-gray-100 bg-white grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-3">
                <div className="relative">
                  <Search className="absolute left-3 md:left-2.5 top-3 md:top-2.5 h-4 w-4 md:h-4 md:w-4 text-gray-400" />
                  <input type="text" value={filtroActividad.busqueda} onChange={(e) => actualizarFiltroActividad("busqueda", e.target.value)} placeholder="Filtrar cliente o nota..." className="w-full pl-9 md:pl-8 pr-3 py-3 md:py-1.5 bg-gray-50 border border-gray-200 rounded-lg md:rounded text-xs focus:outline-none focus:border-blue-400 focus:bg-white transition-all" />
                </div>
                <select value={filtroActividad.modulo} onChange={(e) => actualizarFiltroActividad("modulo", e.target.value)} className="w-full px-3 md:px-2 py-3 md:py-1.5 bg-gray-50 border border-gray-200 rounded-lg md:rounded text-xs text-gray-600 outline-none">
                  <option value="Todos">Todos los Módulos</option><option value="Facturación">Facturación</option><option value="Calendario">Calendario</option><option value="Clientes">Clientes</option><option value="Sistema">Sistema Base</option>
                </select>
                <select value={filtroActividad.tipo} onChange={(e) => actualizarFiltroActividad("tipo", e.target.value)} className="w-full px-3 md:px-2 py-3 md:py-1.5 bg-gray-50 border border-gray-200 rounded-lg md:rounded text-xs text-gray-600 outline-none">
                  <option value="Todos">Todos los Eventos</option><option value="Creación">Creación</option><option value="Edición de Factura">Edición de Factura</option><option value="Abono">Abono</option><option value="Eliminación de Abono">Eliminación de Abono</option><option value="Actualización">Actualización</option><option value="Reprogramación">Reprogramación</option><option value="Cancelación">Cancelación</option><option value="WhatsApp">WhatsApp</option><option value="Eliminación">Eliminación</option>
                </select>
                <input type="date" value={filtroActividad.fecha} onChange={(e) => actualizarFiltroActividad("fecha", e.target.value)} className="w-full px-3 md:px-2 py-3 md:py-1.5 bg-gray-50 border border-gray-200 rounded-lg md:rounded text-xs text-gray-500 outline-none" />
              </div>
              <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto custom-scrollbar">
                {actividadPaginada.length > 0 ? (
                  actividadPaginada.map((act) => (
                    <div key={act.id} className="p-4 md:p-3.5 hover:bg-gray-50/40 active:bg-gray-50/40 transition-colors flex flex-col md:flex-row justify-between items-start gap-3">
                      <div className="flex-1 min-w-0 space-y-1.5 md:space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5 md:gap-1.5">
                          <span className="text-[9px] font-black uppercase px-2 md:px-1.5 py-0.5 md:py-0.2 rounded border bg-gray-50 text-gray-500">{textoSeguro(act.modulo)}</span>
                          <span className="text-[9px] font-black uppercase px-2 md:px-1.5 py-0.5 md:py-0.2 rounded border bg-blue-50 text-blue-600 border-blue-100">{textoSeguro(act.tipo)}</span>
                          {act.cliente !== "N/A" && <span className="text-xs md:text-xs font-black text-[#0a192f] uppercase tracking-tight ml-1 truncate max-w-[220px]">{textoSeguro(act.cliente)}</span>}
                        </div>
                        <p className="text-xs md:text-xs text-gray-600 font-medium leading-relaxed">{textoSeguro(act.detalle)}</p>
                        {act.tipo === "Edición de Factura" && (
                          <button
                            type="button"
                            onClick={() => {
                              setActividadSeleccionada(act);
                              setModalActivo("detalleEdicionFactura");
                            }}
                            className="mt-2 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-black hover:bg-amber-100 active:bg-amber-100 transition-colors"
                          >
                            Ver cambios detallados
                          </button>
                        )}
                      </div>
                      <div className="shrink-0 text-left md:text-right flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center w-full md:w-auto border-t md:border-0 pt-2 md:pt-0 border-gray-100 gap-2">
                        <span className="text-[11px] font-mono text-gray-400 flex items-center"><Clock className="h-3.5 w-3.5 md:h-3 md:w-3 mr-1.5 md:mr-1" />{textoSeguro(act.fechaHora, "Sin fecha")}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center"><User className="h-3.5 w-3.5 md:h-3 md:w-3 mr-1.5 md:mr-1" />{textoSeguro(act.usuario)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-400"><Activity className="h-9 w-9 mx-auto mb-2 opacity-25" /><p className="text-xs italic">Ningún movimiento coincide con los filtros establecidos.</p></div>
                )}
              </div>
              {totalPaginasAct > 1 && (
                <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center px-4 shrink-0">
                  <span className="text-[11px] font-medium text-gray-400">Pág. <strong className="text-gray-600">{paginaActividad}</strong> de {totalPaginasAct}</span>
                  <div className="flex space-x-2 md:space-x-1">
                    <button disabled={paginaActividad === 1} onClick={() => setPaginaActividad((p) => Math.max(p - 1, 1))} className="p-2 md:p-1 border bg-white rounded-lg md:rounded text-gray-500 hover:bg-gray-50 active:bg-gray-200 disabled:opacity-40 transition-all"><ChevronLeft className="h-4 w-4 md:h-3.5 md:w-3.5" /></button>
                    <button disabled={paginaActividad === totalPaginasAct} onClick={() => setPaginaActividad((p) => Math.min(p + 1, totalPaginasAct))} className="p-2 md:p-1 border bg-white rounded-lg md:rounded text-gray-500 hover:bg-gray-50 active:bg-gray-200 disabled:opacity-40 transition-all"><ChevronRight className="h-4 w-4 md:h-3.5 md:w-3.5" /></button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODALES "BOTTOM SHEET" DE SEGURIDAD */}
      {modalActivo && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm md:p-4">
          <div className={`bg-white rounded-t-3xl md:rounded-xl shadow-2xl w-full flex flex-col overflow-hidden animate-slide-up md:animate-zoom-in max-h-[90vh] pb-6 md:pb-0 m-auto md:m-0 ${modalActivo === "detalleEdicionFactura" ? "max-w-2xl" : "max-w-sm"}`}>
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden shrink-0"></div>

            {modalActivo !== "notificacion" && (
              <div className="flex justify-between items-center p-4 md:p-4 border-b border-gray-100 bg-white md:bg-gray-50 shrink-0">
                <h2 className="text-sm md:text-sm font-black text-[#0a192f] flex items-center">
                  {modalActivo === "nuevoUsuario" && <><UserPlus className="h-4 w-4 md:h-4 md:w-4 mr-1.5" /> Alta de Personal</>}
                  {modalActivo === "confirmarEstado" && <><Power className="h-4 w-4 md:h-4 md:w-4 mr-1.5 text-amber-500" /> Confirmar Cambio de Estado</>}
                  {modalActivo === "confirmarSolicitud" && <><Shield className="h-4 w-4 md:h-4 md:w-4 mr-1.5 text-amber-500" /> Resolver Movimiento</>}
                  {modalActivo === "detalleEdicionFactura" && <><Activity className="h-4 w-4 mr-1.5 text-amber-500" /> Detalle de Edición de Factura</>}
                </h2>
                <button onClick={cerrarModal} className="text-gray-400 active:text-red-500 bg-gray-50 md:bg-transparent p-1 md:p-0 rounded-full"><XCircle className="h-6 w-6 md:h-5 md:w-5" /></button>
              </div>
            )}

            <div className="p-5 overflow-y-auto custom-scrollbar">
              {modalActivo === "nuevoUsuario" && (
                <form id="formUsuarioSU" onSubmit={handleCrearUsuario} className="space-y-5 md:space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Nombre Completo</label>
                    <input type="text" required value={nuevoUsuario.nombre} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })} className="w-full px-4 py-3 md:px-3 md:py-1.5 bg-gray-50 focus:bg-white border border-gray-200 rounded-xl md:rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#ffd700]" placeholder="Ej. Carlos Mendoza" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">ID Usuario (Acceso)</label>
                    <div className="flex">
                      <input type="text" required value={nuevoUsuario.usuario} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, usuario: e.target.value })} className="w-full px-4 py-3 md:px-3 md:py-1.5 bg-gray-50 focus:bg-white border border-r-0 border-gray-200 rounded-l-xl md:rounded-l text-xs focus:outline-none focus:ring-2 focus:ring-[#ffd700] font-mono" placeholder="carlos.m" />
                      <span className="px-4 py-3 md:px-3 md:py-1.5 bg-gray-100 border border-l-0 border-gray-200 rounded-r-xl md:rounded-r text-xs text-gray-400 font-mono select-none flex items-center">@mlh.local</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Clave Inicial Temporal</label>
                    <input type="password" required minLength="6" value={nuevoUsuario.password} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })} className="w-full px-4 py-3 md:px-3 md:py-1.5 bg-gray-50 focus:bg-white border border-gray-200 rounded-xl md:rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#ffd700] font-mono" placeholder="Mínimo 6 caracteres" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Rol Operativo</label>
                    <input type="text" disabled value="ADMIN - Operativo Ventas" className="w-full px-4 py-3 md:px-3 md:py-1.5 bg-gray-100 border border-gray-200 rounded-xl md:rounded text-xs font-bold text-gray-500 cursor-not-allowed" />
                  </div>
                </form>
              )}

              {modalActivo === "confirmarEstado" && usuarioSeleccionado && (
                <div className="text-center space-y-4 md:space-y-3">
                  <AlertTriangle className="h-12 w-12 md:h-10 md:w-10 text-amber-500 mx-auto" />
                  <p className="text-gray-700 font-medium text-base md:text-sm leading-relaxed">
                    ¿Confirmas que deseas{" "}
                    <span
                      className={`font-black uppercase tracking-wider ${
                        usuarioSeleccionado.activo
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {usuarioSeleccionado.activo ? "suspender" : "reactivar"}
                    </span>{" "}
                    esta cuenta?
                  </p>
                  <p className="text-xs text-gray-500 bg-gray-50 p-3 md:p-2 rounded-xl md:rounded border border-gray-100">
                    <strong className="text-[#0a192f]">Usuario:</strong>{" "}
                    {textoSeguro(usuarioSeleccionado.nombre)}
                  </p>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    {usuarioSeleccionado.activo
                      ? "El usuario perderá el acceso al sistema cuando su perfil vuelva a validarse."
                      : "El usuario podrá volver a iniciar sesión con sus credenciales actuales."}
                  </p>
                </div>
              )}

              {modalActivo === "confirmarSolicitud" && (
                <div className="text-center space-y-4 md:space-y-3">
                  <Info className="h-12 w-12 md:h-10 md:w-10 text-amber-500 mx-auto" />
                  <p className="text-gray-700 font-medium text-base md:text-sm leading-relaxed">
                    ¿Confirmar resolución de trámite comercial como <span className={`font-black uppercase tracking-wider ${tempSolicitud?.nuevoEstatus === "Autorizado" ? "text-green-600" : "text-red-600"}`}>{textoSeguro(tempSolicitud?.nuevoEstatus)}</span>?
                  </p>
                  <p className="text-xs text-gray-500 bg-gray-50 p-3 md:p-2 rounded-xl md:rounded border border-gray-100">
                    <strong className="text-[#0a192f]">Afectado:</strong> {textoSeguro(tempSolicitud?.cliente)}
                  </p>
                </div>
              )}

              {modalActivo === "detalleEdicionFactura" && actividadSeleccionada && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                      <span className="block text-[10px] font-black uppercase text-gray-400">Factura</span>
                      <strong className="font-mono text-[#0a192f]">{textoSeguro(actividadSeleccionada.folio, "S/F")}</strong>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                      <span className="block text-[10px] font-black uppercase text-gray-400">Operador</span>
                      <strong className="text-[#0a192f]">{textoSeguro(actividadSeleccionada.usuario)}</strong>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 sm:col-span-2">
                      <span className="block text-[10px] font-black uppercase text-gray-400">Cliente</span>
                      <strong className="text-[#0a192f]">{textoSeguro(actividadSeleccionada.cliente)}</strong>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-3 bg-gray-100 text-[10px] font-black uppercase text-gray-500">
                      <div className="p-2.5">Campo</div>
                      <div className="p-2.5 border-l border-gray-200">Antes</div>
                      <div className="p-2.5 border-l border-gray-200">Después</div>
                    </div>
                    {(actividadSeleccionada.campos_modificados || []).map((campo) => {
                      const campoValor = campo === "cliente_id" ? "cliente" : campo;
                      return (
                        <div key={campo} className="grid grid-cols-3 text-xs border-t border-gray-100">
                          <div className="p-2.5 font-black text-gray-600">{ETIQUETAS_CAMBIOS_FACTURA[campo] || campo}</div>
                          <div className="p-2.5 border-l border-gray-100 text-red-700 break-words">{formatearCambioFactura(campo, actividadSeleccionada.valores_anteriores?.[campoValor])}</div>
                          <div className="p-2.5 border-l border-gray-100 text-green-700 break-words">{formatearCambioFactura(campo, actividadSeleccionada.valores_nuevos?.[campoValor])}</div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-gray-400 font-mono">{textoSeguro(actividadSeleccionada.fechaHora, "Sin fecha")}</p>
                </div>
              )}

              {modalActivo === "notificacion" && (
                <div className="text-center py-4 md:py-2">
                  <div className={`h-14 w-14 md:h-12 md:w-12 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-3 ${notificacion.tipo === 'error' ? 'bg-red-100' : 'bg-green-100'}`}>
                    {notificacion.tipo === 'error' ? <X className="h-7 w-7 md:h-6 md:w-6 text-red-600" /> : <Check className="h-7 w-7 md:h-6 md:w-6 text-green-600" />}
                  </div>
                  <h3 className="text-lg md:text-base font-black text-[#0a192f] mb-1.5 md:mb-0.5">{textoSeguro(notificacion.titulo)}</h3>
                  <p className="text-sm md:text-xs text-gray-500 leading-relaxed px-2">{textoSeguro(notificacion.descripcion)}</p>
                </div>
              )}
            </div>

            <div className="p-4 md:p-3 border-t border-gray-100 bg-white md:bg-gray-50 flex flex-col-reverse md:flex-row justify-end gap-3 md:gap-2 md:rounded-b-xl shrink-0">
              {modalActivo === "notificacion" || modalActivo === "detalleEdicionFactura" ? (
                <button onClick={cerrarModal} className={`w-full px-4 py-3.5 md:py-2 text-sm md:text-xs font-black text-white rounded-xl md:rounded shadow-sm transition-colors ${modalActivo === "detalleEdicionFactura" ? "bg-[#0a192f] hover:bg-[#112240]" : notificacion.tipo === "error" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}>{modalActivo === "detalleEdicionFactura" ? "Cerrar" : "Aceptar"}</button>
              ) : (
                <>
                  <button onClick={cerrarModal} disabled={isSubmitting} className="w-full md:w-auto px-4 py-3.5 md:py-1.5 text-sm md:text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-xl md:rounded active:bg-gray-100 hover:bg-gray-50 transition-colors disabled:opacity-50">Cancelar</button>
                  {modalActivo === "confirmarEstado" && usuarioSeleccionado && (
                    <button
                      onClick={alternarEstadoUsuario}
                      disabled={isSubmitting}
                      className={`w-full md:w-auto px-6 py-3.5 md:py-1.5 text-sm md:text-xs font-black text-white rounded-xl md:rounded shadow-sm transition-colors flex items-center justify-center disabled:opacity-50 ${
                        usuarioSeleccionado.activo
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-green-600 hover:bg-green-700"
                      }`}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Power className="h-4 w-4 mr-1" />
                      )}
                      {isSubmitting
                        ? "Procesando..."
                        : usuarioSeleccionado.activo
                          ? "Sí, suspender"
                          : "Sí, reactivar"}
                    </button>
                  )}
                  {modalActivo === "confirmarSolicitud" && (
                    <button onClick={confirmarSolicitud} disabled={isSubmitting} className={`w-full md:w-auto px-6 py-3.5 md:py-1.5 text-sm md:text-xs font-black text-white rounded-xl md:rounded shadow-sm transition-colors flex items-center justify-center disabled:opacity-50 ${tempSolicitud?.nuevoEstatus === "Autorizado" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : (tempSolicitud?.nuevoEstatus === "Autorizado" ? <Check className="h-4 w-4 mr-1" /> : <X className="h-4 w-4 mr-1" />)}
                      {isSubmitting ? "Procesando..." : "Aplicar"}
                    </button>
                  )}
                  {modalActivo === "nuevoUsuario" && (
                    <button type="submit" form="formUsuarioSU" disabled={isSubmitting} className="w-full md:w-auto px-8 py-3.5 md:py-1.5 text-sm md:text-xs font-black text-[#0a192f] bg-[#ffd700] rounded-xl md:rounded hover:bg-[#e6c200] active:bg-[#e6c200] shadow-sm transition-colors flex items-center justify-center disabled:opacity-50">
                      {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creando...</> : "Generar Acceso"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}