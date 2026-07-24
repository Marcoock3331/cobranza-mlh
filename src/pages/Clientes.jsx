import { useContext, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle,
  ChevronRight,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GlobalContext } from "../context/GlobalContext";
import { useClientes } from "../hooks/useClientes";
import PaginacionGlobal from "../components/ui/PaginacionGlobal";

const CLIENTES_POR_PAGINA = 12;

const GRUPOS_FILTRO = [
  "Todos",
  "Carpintería",
  "Cruce",
  "Familiares",
  "General",
  "Prioridad",
  "IHB",
  "RC Intercomerce",
  "Torre Las Americas",
];

const OPCIONES_GRUPO = [
  "GENERAL",
  "CARPINTERIA",
  "CRUCE",
  "FAMILIARES",
  "PRIORIDAD",
  "IHB",
  "RC INTERCOMERCE",
  "TORRE LAS AMERICAS",
];

const OPCIONES_CLASIFICACION = [
  "Cumplidor",
  "Moroso",
  "Riesgo Alto",
  "Nuevo",
  "Suspendido",
];

const OPCIONES_ORDEN = [
  { value: "nombre_asc", label: "Nombre: A–Z" },
  { value: "nombre_desc", label: "Nombre: Z–A" },
  { value: "recientes", label: "Más recientes" },
  { value: "antiguos", label: "Más antiguos" },
];

const FILTROS_RAPIDOS = [
  { value: "con-deuda", label: "Con deuda", descripcion: "Saldo pendiente" },
  {
    value: "contacto-incompleto",
    label: "Contacto incompleto",
    descripcion: "Sin teléfono o correo",
  },
  { value: "inactivos", label: "Inactivos", descripcion: "Clientes dados de baja" },
];

const ESTADO_INICIAL = {
  numero_cliente: "",
  nombre: "",
  rfc: "",
  telefono: "",
  correo: "",
  direccion: "",
  ultima_fecha_pago: "",
  limite_credito: "",
  linea_credito_autorizado_por: "",
  linea_credito_motivo: "",
  segmentacion: "Nuevo",
  grupo: "GENERAL",
  dias_mensaje: "",
  pagare_inicial: "",
  pagare_monto: 0,
  pagare_fecha: "",
  notas: "",
};

const normalizarTexto = (valor = "") =>
  valor
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

const normalizarGrupo = (valor = "") => normalizarTexto(valor);

const obtenerFechaMilisegundos = (valor) => {
  if (!valor) return null;

  if (typeof valor?.toDate === "function") {
    return valor.toDate().getTime();
  }

  if (typeof valor?.seconds === "number") {
    return valor.seconds * 1000;
  }

  if (valor instanceof Date) {
    return valor.getTime();
  }

  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha.getTime();
};

const formatearGrupo = (grupo) => {
  const grupoNormalizado = normalizarGrupo(grupo);

  const grupos = {
    GENERAL: "General",
    CARPINTERIA: "Carpintería",
    CRUCE: "Cruce",
    FAMILIARES: "Familiares",
    PRIORIDAD: "Prioridad",
    IHB: "IHB",
    "RC INTERCOMERCE": "RC Intercomerce",
    "TORRE LAS AMERICAS": "Torre Las Americas",
  };

  return grupos[grupoNormalizado] || grupo?.toString().trim() || "Sin grupo";
};

const formatearMoneda = (valor, decimales = 2) =>
  (Number(valor) || 0).toLocaleString("es-MX", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });

const formatearFechaUltimoPago = (fecha) => {
  if (!fecha) return "---";

  if (typeof fecha?.toDate === "function") {
    return fecha.toDate().toLocaleDateString("es-MX");
  }

  if (typeof fecha?.seconds === "number") {
    return new Date(fecha.seconds * 1000).toLocaleDateString("es-MX");
  }

  if (fecha instanceof Date) {
    return fecha.toLocaleDateString("es-MX");
  }

  return fecha.toString();
};

const limpiarTelefono = (telefono = "") =>
  telefono.toString().replace(/\D/g, "");

const telefonoValido = (telefono = "") => {
  const numero = limpiarTelefono(telefono);

  if (numero.length === 10) return true;
  if (numero.startsWith("52") && numero.length === 12) return true;
  if (numero.startsWith("521") && numero.length === 13) return true;

  return false;
};

const clienteTieneDeuda = (cliente) => Number(cliente?.deuda_actual) > 0;

const correoValido = (correo = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(correo || "").trim());

const clienteContactoIncompleto = (cliente) =>
  !telefonoValido(cliente?.telefono) || !correoValido(cliente?.correo);

const clienteInactivo = (cliente) =>
  cliente?.activo === false || cliente?.estatus === "Inactivo";

export default function Clientes() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filtroInicialUrl = searchParams.get("filtro") || "";

  const {
    userRole,
    userName,
    clientes,
    eliminarClienteEnNube,
    reactivarClienteEnNube,
  } = useContext(GlobalContext);

  const rolActual = String(userRole || "").trim().toUpperCase();

  const puedeGestionarEstadoCliente =
    rolActual === "SU" || rolActual === "ADMIN";

  const { registrarNuevoCliente, isSubmitting } = useClientes();

  const [notificacion, setNotificacion] = useState({
    visible: false,
    titulo: "",
    mensaje: "",
    tipo: "success",
  });

  const [grupoActivo, setGrupoActivo] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [ordenClientes, setOrdenClientes] = useState("nombre_asc");
  const [paginaActual, setPaginaActual] = useState(1);
  const listaClientesRef = useRef(null);
  const [filtrosRapidosActivos, setFiltrosRapidosActivos] = useState(() => {
    if (["con-deuda", "contacto-incompleto", "inactivos"].includes(filtroInicialUrl)) {
      return [filtroInicialUrl];
    }

    return [];
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [menuAbiertoId, setMenuAbiertoId] = useState(null);

  const [clienteEstadoPendiente, setClienteEstadoPendiente] = useState(null);
  const [accionEstadoCliente, setAccionEstadoCliente] = useState("inactivar");
  const [motivoEstadoCliente, setMotivoEstadoCliente] = useState("");
  const [isInactivating, setIsInactivating] = useState(false);
  const [errorMotivoEstado, setErrorMotivoEstado] = useState("");
  const [formData, setFormData] = useState(ESTADO_INICIAL);

  const cambiarFiltroRapido = (nuevoFiltro) => {
    setFiltrosRapidosActivos((previos) =>
      previos.includes(nuevoFiltro)
        ? previos.filter((filtro) => filtro !== nuevoFiltro)
        : [...previos, nuevoFiltro],
    );
    setPaginaActual(1);
  };

  const mostrarNotificacion = (
    titulo,
    mensaje,
    tipo = "success",
  ) => {
    setNotificacion({
      visible: true,
      titulo,
      mensaje,
      tipo,
    });

    window.setTimeout(() => {
      setNotificacion({
        visible: false,
        titulo: "",
        mensaje: "",
        tipo: "success",
      });
    }, 5000);
  };

  const resumenFiltrosRapidos = useMemo(() => {
    const activos = (Array.isArray(clientes) ? clientes : []).filter(
      (cliente) =>
        cliente?.activo !== false && cliente?.estatus !== "Inactivo",
    );

    return {
      "con-deuda": activos.filter(clienteTieneDeuda).length,
      "contacto-incompleto": activos.filter(clienteContactoIncompleto).length,
      inactivos: (Array.isArray(clientes) ? clientes : []).filter(clienteInactivo).length,
    };
  }, [clientes]);

  const clientesFiltrados = useMemo(() => {
    const textoBusqueda = normalizarTexto(busqueda);

    const lista = (Array.isArray(clientes) ? clientes : []).filter(
      (cliente) => {
        const mostrarInactivos = filtrosRapidosActivos.includes("inactivos");

        if (mostrarInactivos) {
          if (!clienteInactivo(cliente)) return false;
        } else if (clienteInactivo(cliente)) {
          return false;
        }

        const coincideGrupo =
          grupoActivo === "Todos" ||
          normalizarGrupo(cliente?.grupo) ===
            normalizarGrupo(grupoActivo);

        const coincideBusqueda =
          textoBusqueda === "" ||
          normalizarTexto(cliente?.nombre).includes(textoBusqueda) ||
          normalizarTexto(cliente?.rfc).includes(textoBusqueda) ||
          normalizarTexto(cliente?.numero_cliente).includes(
            textoBusqueda,
          ) ||
          normalizarTexto(cliente?.segmentacion).includes(
            textoBusqueda,
          ) ||
          normalizarTexto(formatearGrupo(cliente?.grupo)).includes(
            textoBusqueda,
          );

        const coincideFiltroRapido = filtrosRapidosActivos.every((filtro) => {
          if (filtro === "inactivos") return true;
          if (filtro === "con-deuda") return clienteTieneDeuda(cliente);
          if (filtro === "contacto-incompleto") {
            return clienteContactoIncompleto(cliente);
          }

          return true;
        });

        return coincideGrupo && coincideBusqueda && coincideFiltroRapido;
      },
    );

    return [...lista].sort((clienteA, clienteB) => {
      const nombreA = clienteA?.nombre?.toString().trim() || "";
      const nombreB = clienteB?.nombre?.toString().trim() || "";

      if (ordenClientes === "nombre_desc") {
        return nombreB.localeCompare(nombreA, "es", {
          sensitivity: "base",
        });
      }

      if (ordenClientes === "recientes") {
        const fechaA = obtenerFechaMilisegundos(clienteA?.createdAt);
        const fechaB = obtenerFechaMilisegundos(clienteB?.createdAt);

        if (fechaA === null && fechaB === null) {
          return nombreA.localeCompare(nombreB, "es", {
            sensitivity: "base",
          });
        }

        if (fechaA === null) return 1;
        if (fechaB === null) return -1;

        return fechaB - fechaA;
      }

      if (ordenClientes === "antiguos") {
        const fechaA = obtenerFechaMilisegundos(clienteA?.createdAt);
        const fechaB = obtenerFechaMilisegundos(clienteB?.createdAt);

        if (fechaA === null && fechaB === null) {
          return nombreA.localeCompare(nombreB, "es", {
            sensitivity: "base",
          });
        }

        if (fechaA === null) return 1;
        if (fechaB === null) return -1;

        return fechaA - fechaB;
      }

      return nombreA.localeCompare(nombreB, "es", {
        sensitivity: "base",
      });
    });
  }, [clientes, grupoActivo, busqueda, filtrosRapidosActivos, ordenClientes]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(clientesFiltrados.length / CLIENTES_POR_PAGINA),
  );

  const paginaSegura = Math.min(paginaActual, totalPaginas);
  const indiceInicial = (paginaSegura - 1) * CLIENTES_POR_PAGINA;
  const clientesPagina = clientesFiltrados.slice(
    indiceInicial,
    indiceInicial + CLIENTES_POR_PAGINA,
  );

  const cambiarPagina = (nuevaPagina) => {
    const destino = Math.min(Math.max(nuevaPagina, 1), totalPaginas);
    setPaginaActual(destino);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((previo) => ({
      ...previo,
      [name]: value,
    }));
  };

  const handleCerrarModalAlta = () => {
    setIsModalOpen(false);
    setFormData(ESTADO_INICIAL);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const response = await registrarNuevoCliente(
      formData,
      userName,
    );

    if (response?.success) {
      mostrarNotificacion(
        "Éxito",
        "Cliente registrado correctamente.",
      );
      handleCerrarModalAlta();
      return;
    }

    mostrarNotificacion(
      "Error al guardar",
      response?.error ||
        "Revisa la consola para más detalles.",
      "error",
    );
  };

  const abrirCambioEstadoCliente = (cliente, accion) => {
    setClienteEstadoPendiente(cliente);
    setAccionEstadoCliente(accion);
    setMotivoEstadoCliente("");
    setErrorMotivoEstado("");
    setMenuAbiertoId(null);
  };

  const confirmarCambioEstadoCliente = async () => {
    if (!clienteEstadoPendiente) return;

    if (!motivoEstadoCliente.trim()) {
      setErrorMotivoEstado(
        accionEstadoCliente === "reactivar"
          ? "Debes escribir el motivo de la reactivación."
          : "Debes escribir el motivo de la inactivación."
      );
      return;
    }

    setIsInactivating(true);

    try {
      const servicio =
        accionEstadoCliente === "reactivar"
          ? reactivarClienteEnNube
          : eliminarClienteEnNube;

      const respuesta = await servicio(
        clienteEstadoPendiente.id,
        clienteEstadoPendiente.nombre,
        motivoEstadoCliente.trim(),
      );

      if (respuesta?.success) {
        mostrarNotificacion(
          accionEstadoCliente === "reactivar" ? "Reactivado" : "Inactivado",
          accionEstadoCliente === "reactivar"
            ? "Cliente reactivado correctamente."
            : "Cliente inactivado correctamente.",
        );
        setClienteEstadoPendiente(null);
        setMotivoEstadoCliente("");
        setErrorMotivoEstado("");
        return;
      }

      mostrarNotificacion(
        "Error",
        respuesta?.error ||
          `No se pudo ${accionEstadoCliente === "reactivar" ? "reactivar" : "inactivar"} el expediente.`,
        "error",
      );
    } finally {
      setIsInactivating(false);
    }
  };

  const obtenerColorClasificacion = (clasificacion) => {
    switch (clasificacion) {
      case "Cumplidor":
        return "bg-green-100 text-green-800 border-green-200";
      case "Moroso":
        return "bg-red-100 text-red-800 border-red-200";
      case "Irregular":
      case "Riesgo Alto":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Suspendido":
        return "bg-gray-200 text-gray-700 border-gray-300";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  const obtenerColorGrupo = (grupo) => {
    switch (normalizarGrupo(grupo)) {
      case "CARPINTERIA":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "CRUCE":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "FAMILIARES":
        return "bg-violet-50 text-violet-700 border-violet-200";
      case "PRIORIDAD":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "IHB":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "RC INTERCOMERCE":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      case "TORRE LAS AMERICAS":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const abrirExpediente = (clienteId) => {
    navigate(`/clientes/${clienteId}`);
  };

  const abrirMenuCliente = (event, clienteId) => {
    event.stopPropagation();

    setMenuAbiertoId((actual) =>
      actual === clienteId ? null : clienteId,
    );
  };

  return (
    <div
      className="min-h-full flex flex-col space-y-4 md:space-y-6 relative pb-4"
      onClick={() => setMenuAbiertoId(null)}
    >
      {notificacion.visible && (
        <div
          className={`fixed left-4 right-4 top-[calc(1rem+env(safe-area-inset-top))] sm:left-auto z-[100] p-4 rounded-xl shadow-lg border flex items-start gap-3 sm:w-80 animate-slide-in-right ${
            notificacion.tipo === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-green-50 border-green-200 text-green-800"
          }`}
        >
          {notificacion.tipo === "error" ? (
            <XCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600" />
          ) : (
            <CheckCircle className="h-5 w-5 shrink-0 mt-0.5 text-green-600" />
          )}

          <div>
            <h4 className="font-bold text-sm">
              {notificacion.titulo}
            </h4>
            <p className="text-xs mt-1 opacity-90">
              {notificacion.mensaje}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mt-2 md:mt-4 gap-4">
        <div className="w-full md:w-auto">
          <h1 className="text-xl md:text-2xl font-bold text-[#0a192f] flex items-center">
            <Users className="h-5 w-5 md:h-6 md:w-6 mr-2 text-blue-600" />
            Directorio de Clientes
          </h1>

          <p className="text-xs md:text-sm text-gray-500 mt-1">
            Administración de cuentas, líneas de crédito, saldos y
            expedientes comerciales.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full md:w-auto px-5 py-3 md:py-2.5 bg-[#0a192f] text-white font-bold text-sm rounded-xl md:rounded-lg hover:bg-[#1a2b45] flex items-center justify-center shadow-md transition-all active:scale-[0.98]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </button>
      </div>

      <div className="flex overflow-x-auto pb-2 md:pb-0 md:flex-wrap gap-2 custom-scrollbar hide-scrollbar-mobile w-full">
        {GRUPOS_FILTRO.map((grupo) => (
          <button
            type="button"
            key={grupo}
            onClick={() => {
              setGrupoActivo(grupo);
              setPaginaActual(1);
            }}
            className={`whitespace-nowrap px-4 py-2 md:py-1.5 rounded-full text-xs md:text-sm font-bold md:font-medium border transition-all shrink-0 ${
              grupoActivo === grupo
                ? "bg-[#0a192f] text-white border-[#0a192f] shadow-md"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {grupo}
          </button>
        ))}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_260px] gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 md:h-4 md:w-4 text-gray-400" />

            <input
              type="text"
              value={busqueda}
              onChange={(event) => {
                setBusqueda(event.target.value);
                setPaginaActual(1);
              }}
              className="w-full pl-10 pr-4 py-3 md:py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ffd700]/50 focus:border-[#ffd700] transition-all"
              placeholder="Buscar cliente, RFC, ID, grupo o clasificación..."
            />
          </div>

          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />

            <select
              value={ordenClientes}
              onChange={(event) => {
                setOrdenClientes(event.target.value);
                setPaginaActual(1);
              }}
              className="w-full appearance-none pl-10 pr-10 py-3 md:py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-[#0a192f] focus:outline-none focus:ring-2 focus:ring-[#ffd700]/50 focus:border-[#ffd700]"
            >
              {OPCIONES_ORDEN.map((opcion) => (
                <option
                  key={opcion.value}
                  value={opcion.value}
                >
                  {opcion.label}
                </option>
              ))}
            </select>

            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto mt-3 pb-1 custom-scrollbar">
          {FILTROS_RAPIDOS.map((filtro) => {
            const activo = filtrosRapidosActivos.includes(filtro.value);
            const cantidad = resumenFiltrosRapidos[filtro.value] || 0;

            return (
              <button
                key={filtro.value}
                type="button"
                onClick={() => cambiarFiltroRapido(filtro.value)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[9px] md:text-[10px] font-black flex items-center gap-2 transition-colors ${
                  activo
                    ? "bg-[#0a192f] border-[#0a192f] text-white"
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                }`}
                title={filtro.descripcion}
              >
                <span>{filtro.label}</span>
                <span
                  className={`min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center ${
                    activo
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

        <p className="text-[10px] md:text-xs text-gray-400 mt-3">
          {clientesFiltrados.length} cliente(s) visibles. El grupo superior inicia en Todos y los filtros rápidos se activan o desactivan manualmente.
        </p>
      </div>

      <div id="lista-clientes" ref={listaClientesRef} className="scroll-mt-24">
        <div className="md:hidden space-y-2.5">
          {clientesFiltrados.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-7 text-center shadow-sm">
              <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-600">
                No se encontraron clientes.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Cambia el grupo, el orden o la búsqueda.
              </p>
            </div>
          ) : (
            clientesPagina.map((cliente) => (
              <article
                key={cliente.id}
                className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-visible"
              >
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => abrirExpediente(cliente.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wide text-gray-400">
                        <span>Cliente</span>
                        <span className="font-mono text-blue-600 normal-case tracking-normal">
                          #{cliente.numero_cliente || "SIN-ID"}
                        </span>
                      </div>

                      <h2 className="text-sm font-black text-[#0a192f] mt-1 leading-snug break-words">
                        {cliente.nombre || "Cliente sin nombre"}
                      </h2>

                      <p className="text-[10px] text-gray-400 font-mono uppercase mt-0.5 break-all">
                        {cliente.rfc || "RFC no registrado"}
                      </p>
                    </button>

                    {puedeGestionarEstadoCliente && (
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={(event) =>
                            abrirMenuCliente(event, cliente.id)
                          }
                          className="p-2 rounded-lg bg-gray-50 text-gray-500 active:bg-gray-200"
                          aria-label="Opciones del cliente"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {menuAbiertoId === cliente.id && (
                          <div
                            className="absolute right-0 top-10 w-40 bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.18)] border border-gray-100 z-30 overflow-hidden"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                abrirCambioEstadoCliente(
                                  cliente,
                                  clienteInactivo(cliente) ? "reactivar" : "inactivar",
                                );
                              }}
                              className={`w-full px-3 py-2.5 text-xs font-bold flex items-center ${
                                clienteInactivo(cliente)
                                  ? "text-green-600 active:bg-green-50"
                                  : "text-red-600 active:bg-red-50"
                              }`}
                            >
                              {clienteInactivo(cliente) ? (
                                <CheckCircle className="h-3.5 w-3.5 mr-2" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                              )}
                              {clienteInactivo(cliente) ? "Reactivar" : "Inactivar"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-[9px] font-black border ${obtenerColorClasificacion(
                        cliente.segmentacion,
                      )}`}
                    >
                      {cliente.segmentacion || "Nuevo"}
                    </span>

                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-[9px] font-black border ${obtenerColorGrupo(
                        cliente.grupo,
                      )}`}
                    >
                      {formatearGrupo(cliente.grupo)}
                    </span>

                    {clienteContactoIncompleto(cliente) && (
                      <span className="inline-flex px-2 py-1 rounded-full text-[9px] font-black border bg-red-50 text-red-700 border-red-200">
                        Contacto incompleto
                      </span>
                    )}

                    {clienteInactivo(cliente) && (
                      <span className="inline-flex px-2 py-1 rounded-full text-[9px] font-black border bg-gray-100 text-gray-700 border-gray-200">
                        Inactivo
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 mt-3">
                    <div className="rounded-lg bg-red-50/60 border border-red-100 p-2 min-w-0">
                      <p className="text-[7px] uppercase tracking-wide font-black text-red-400">
                        Saldo
                      </p>
                      <p
                        className={`text-[11px] font-black mt-0.5 break-words ${
                          Number(cliente.deuda_actual) > 0
                            ? "text-red-600"
                            : "text-[#0a192f]"
                        }`}
                      >
                        ${formatearMoneda(cliente.deuda_actual)}
                      </p>
                    </div>

                    <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-2 min-w-0">
                      <p className="text-[7px] uppercase tracking-wide font-black text-blue-400">
                        Crédito
                      </p>
                      <p className="text-[11px] font-black text-[#0a192f] mt-0.5 break-words">
                        ${formatearMoneda(cliente.limite_credito, 0)}
                      </p>
                    </div>

                    <div className="rounded-lg bg-green-50/60 border border-green-100 p-2 min-w-0">
                      <p className="text-[7px] uppercase tracking-wide font-black text-green-500">
                        Depósito
                      </p>
                      <p className="text-[11px] font-black text-green-600 mt-0.5 break-words">
                        ${formatearMoneda(cliente.monto_ultimo_pago, 0)}
                      </p>
                      <p className="text-[8px] text-gray-400 mt-0.5">
                        {formatearFechaUltimoPago(cliente.fecha_ultimo_pago)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => abrirExpediente(cliente.id)}
                    className="w-full mt-3 py-2 rounded-lg bg-[#0a192f] text-white text-[10px] font-black flex items-center justify-center active:bg-[#112240]"
                  >
                    Ver expediente
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="hidden md:block bg-white border border-gray-100 rounded-xl shadow-sm overflow-visible">
          <table className="w-full table-fixed text-left text-xs lg:text-sm border-separate border-spacing-0">
            <colgroup>
              <col className="w-[36%]" />
              <col className="w-[20%]" />
              <col className="w-[16%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              {puedeGestionarEstadoCliente && <col className="w-[4%]" />}
            </colgroup>

            <thead>
              <tr className="bg-[#0a192f] text-white font-black uppercase tracking-wide">
                <th className="px-3 lg:px-4 py-3.5 border-b border-[#0a192f] rounded-tl-xl text-[10px] lg:text-xs">
                  Cliente / RFC
                </th>
                <th className="px-3 lg:px-4 py-3.5 border-b border-[#0a192f] text-[10px] lg:text-xs">
                  Clasificación / Grupo
                </th>
                <th className="px-3 lg:px-4 py-3.5 border-b border-[#0a192f] text-[10px] lg:text-xs">
                  Último depósito
                </th>
                <th className="px-3 lg:px-4 py-3.5 text-right border-b border-[#0a192f] text-[10px] lg:text-xs">
                  Saldo
                </th>
                <th className="px-3 lg:px-4 py-3.5 text-right border-b border-[#0a192f] text-[10px] lg:text-xs">
                  Crédito
                </th>
                {puedeGestionarEstadoCliente && (
                  <th className="px-2 py-3.5 text-center border-b border-[#0a192f] rounded-tr-xl">
                    <span className="sr-only">Acciones</span>
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {clientesFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={puedeGestionarEstadoCliente ? 6 : 5}
                    className="px-6 py-12 text-center text-gray-500 font-medium"
                  >
                    No hay clientes registrados o no coinciden con la búsqueda.
                  </td>
                </tr>
              ) : (
                clientesPagina.map((cliente) => (
                  <tr
                    key={cliente.id}
                    className="hover:bg-gray-50/70 transition-colors align-top"
                  >
                    <td
                      className="px-3 lg:px-4 py-3 cursor-pointer group"
                      onClick={() => abrirExpediente(cliente.id)}
                    >
                      <div className="flex items-start gap-2">
                        <span className="shrink-0 rounded-md bg-blue-50 border border-blue-100 px-1.5 py-1 text-[9px] lg:text-[10px] font-black font-mono text-blue-700">
                          {cliente.numero_cliente || "SIN-ID"}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors whitespace-normal break-words leading-snug">
                            {cliente.nombre || "Cliente sin nombre"}
                          </div>
                          <div className="text-[10px] lg:text-xs text-gray-400 font-mono uppercase break-all mt-0.5">
                            {cliente.rfc || "RFC no registrado"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 lg:px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-[9px] lg:text-[10px] font-bold border whitespace-normal ${obtenerColorClasificacion(
                            cliente.segmentacion,
                          )}`}
                        >
                          {cliente.segmentacion || "Nuevo"}
                        </span>
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-[9px] lg:text-[10px] font-bold border whitespace-normal ${obtenerColorGrupo(
                            cliente.grupo,
                          )}`}
                        >
                          {formatearGrupo(cliente.grupo)}
                        </span>
                      </div>
                    </td>

                    <td className="px-3 lg:px-4 py-3">
                      <div className="font-black text-green-600 break-words">
                        ${formatearMoneda(cliente.monto_ultimo_pago, 0)}
                      </div>
                      <div className="text-[10px] lg:text-xs text-gray-500 font-medium mt-0.5 break-words">
                        {formatearFechaUltimoPago(cliente.fecha_ultimo_pago)}
                      </div>
                    </td>

                    <td
                      className={`px-3 lg:px-4 py-3 text-right font-black break-words ${
                        Number(cliente.deuda_actual) > 0
                          ? "text-red-600"
                          : "text-gray-900"
                      }`}
                    >
                      ${formatearMoneda(cliente.deuda_actual)}
                    </td>

                    <td className="px-3 lg:px-4 py-3 text-right text-gray-600 font-bold break-words">
                      ${formatearMoneda(cliente.limite_credito, 0)}
                    </td>

                    {puedeGestionarEstadoCliente && (
                      <td className="px-1 py-3 text-center relative">
                        <button
                          type="button"
                          onClick={(event) =>
                            abrirMenuCliente(event, cliente.id)
                          }
                          className="p-1.5 hover:bg-gray-200 active:bg-gray-300 rounded-full text-gray-500 transition-colors"
                          aria-label="Opciones del cliente"
                        >
                          <MoreVertical className="h-4 w-4 mx-auto" />
                        </button>

                        {menuAbiertoId === cliente.id && (
                          <div
                            className="absolute right-2 top-10 w-40 bg-white rounded-lg shadow-[0_4px_25px_rgba(0,0,0,0.15)] border border-gray-100 z-[100] overflow-hidden text-left"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                abrirCambioEstadoCliente(
                                  cliente,
                                  clienteInactivo(cliente) ? "reactivar" : "inactivar",
                                );
                              }}
                              className={`w-full px-3 py-2.5 text-xs flex items-center transition-colors ${
                                clienteInactivo(cliente)
                                  ? "text-green-600 hover:bg-green-50"
                                  : "text-red-600 hover:bg-red-50"
                              }`}
                            >
                              {clienteInactivo(cliente) ? (
                                <CheckCircle className="h-3.5 w-3.5 mr-2" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                              )}
                              {clienteInactivo(cliente) ? "Reactivar" : "Inactivar"}
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginacionGlobal
          pagina={paginaSegura}
          totalPaginas={totalPaginas}
          totalRegistros={clientesFiltrados.length}
          registrosPorPagina={CLIENTES_POR_PAGINA}
          registrosEnPagina={clientesPagina.length}
          etiquetaTotal="clientes"
          scrollTargetRef={listaClientesRef}
          onCambiarPagina={cambiarPagina}
        />
      </div>

      {clienteEstadoPendiente && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm animate-fade-in md:items-center md:p-4">
          <div className="flex max-h-[92dvh] w-full max-w-sm flex-col overflow-hidden rounded-t-3xl bg-white pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-slide-up md:rounded-xl md:pb-0 md:animate-fade-in">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden" />

            <div className="p-6 text-center">
              <div
                className={`mx-auto flex items-center justify-center h-16 w-16 md:h-14 md:w-14 rounded-full mb-4 ring-4 ${
                  accionEstadoCliente === "reactivar"
                    ? "bg-green-100 ring-green-50"
                    : "bg-red-100 ring-red-50"
                }`}
              >
                {accionEstadoCliente === "reactivar" ? (
                  <CheckCircle className="h-8 w-8 md:h-7 md:w-7 text-green-600" />
                ) : (
                  <AlertTriangle className="h-8 w-8 md:h-7 md:w-7 text-red-600" />
                )}
              </div>

              <h3 className="text-xl font-black text-[#0a192f] mb-2">
                {accionEstadoCliente === "reactivar"
                  ? "Reactivar Cliente"
                  : "Inactivar Cliente"}
              </h3>

              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                Confirma el cambio de estado de{" "}
                <span className="font-bold text-gray-900">
                  {clienteEstadoPendiente.nombre}
                </span>
                . El historial, facturas y abonos se conservarán.
              </p>

              <textarea
  value={motivoEstadoCliente}
  onChange={(event) => {
    setMotivoEstadoCliente(event.target.value);

    if (errorMotivoEstado) {
      setErrorMotivoEstado("");
    }
  }}
  rows="3"
  disabled={isInactivating}
  placeholder={
    accionEstadoCliente === "reactivar"
      ? "Motivo de reactivación"
      : "Motivo de inactivación"
  }
  className={`mb-4 w-full rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-[#0a192f] outline-none transition focus:border-[#ffd700] focus:bg-white focus:ring-2 focus:ring-[#ffd700]/40 disabled:opacity-60 ${
    errorMotivoEstado
      ? "border border-red-500 ring-2 ring-red-200"
      : "border border-gray-200"
  }`}
/>

{errorMotivoEstado && (
  <p className="mb-4 text-left text-xs font-bold text-red-600">
    {errorMotivoEstado}
  </p>
)}

<div className="flex space-x-3">
  <button
    type="button"
    onClick={() => {
      setClienteEstadoPendiente(null);
      setMotivoEstadoCliente("");
      setErrorMotivoEstado("");
    }}
    disabled={isInactivating}
    className="flex-1 px-4 py-3 md:py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-xl md:rounded-lg active:bg-gray-50 hover:bg-gray-50 disabled:opacity-50 transition-colors"
  >
    Cancelar
  </button>

                <button
                  type="button"
                  onClick={confirmarCambioEstadoCliente}
                  ddisabled={isInactivating}
                  className={`flex-1 px-4 py-3 md:py-2 text-sm font-bold text-white rounded-xl md:rounded-lg disabled:opacity-70 flex items-center justify-center transition-colors shadow-sm ${
                    accionEstadoCliente === "reactivar"
                      ? "bg-green-600 active:bg-green-700 hover:bg-green-700"
                      : "bg-red-600 active:bg-red-700 hover:bg-red-700"
                  }`}
                >
                  {isInactivating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : accionEstadoCliente === "reactivar" ? (
                    "Reactivar"
                  ) : (
                    "Inactivar"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm md:items-center md:p-4">
          <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92dvh] md:max-h-[92vh] flex flex-col animate-slide-up md:animate-fade-in overflow-hidden">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden shrink-0" />

            <div className="flex items-start justify-between gap-4 px-5 py-5 md:px-6 md:py-5 border-b border-gray-100 shrink-0 bg-white">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
                  Alta de cliente
                </p>
                <h2 className="text-xl md:text-2xl font-black text-[#0a192f] mt-1">
                  Nuevo cliente
                </h2>
                <p className="text-xs md:text-sm text-gray-500 mt-1 max-w-2xl">
                  Registra la información obligatoria, la línea de crédito inicial y si cuenta con pagaré inicial.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCerrarModalAlta}
                className="text-gray-400 active:text-red-500 hover:text-red-500 bg-gray-50 p-2 rounded-full transition-colors disabled:opacity-50 shrink-0"
                disabled={isSubmitting}
                aria-label="Cerrar formulario"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              id="altaClienteForm"
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/50"
            >
              <div className="p-5 md:p-6 space-y-5 md:space-y-6 pb-28 md:pb-8">
                <section className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-4 py-3 md:px-5 md:py-4 border-b border-gray-100 bg-[#0a192f] text-white">
                    <h3 className="text-sm font-black">
                      1. Identificación del cliente
                    </h3>
                    <p className="text-[11px] text-white/70 mt-0.5">
                      Datos principales para localizar el expediente.
                    </p>
                  </div>

                  <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-black uppercase text-gray-500 tracking-wider mb-1.5">
                        Número de cliente <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="numero_cliente"
                        value={formData.numero_cliente}
                        onChange={handleInputChange}
                        placeholder="Ej. C-001"
                        required
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-gray-500 tracking-wider mb-1.5">
                        Nombre <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleInputChange}
                        placeholder="Nombre comercial o cliente"
                        required
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-gray-500 tracking-wider mb-1.5">
                        RFC <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="rfc"
                        value={formData.rfc}
                        onChange={handleInputChange}
                        placeholder="RFC del cliente"
                        required
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm font-bold uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-gray-500 tracking-wider mb-1.5">
                        Teléfono <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="telefono"
                        value={formData.telefono}
                        onChange={handleInputChange}
                        placeholder="10 dígitos"
                        required
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm font-bold"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-black uppercase text-gray-500 tracking-wider mb-1.5">
                        Dirección <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="direccion"
                        value={formData.direccion}
                        onChange={handleInputChange}
                        placeholder="Calle, número, colonia, ciudad o referencia de entrega"
                        required
                        disabled={isSubmitting}
                        rows="3"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm resize-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-black uppercase text-gray-500 tracking-wider mb-1.5">
                        Correo electrónico
                      </label>
                      <input
                        type="email"
                        name="correo"
                        value={formData.correo}
                        onChange={handleInputChange}
                        placeholder="correo@ejemplo.com"
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm"
                      />
                    </div>
                  </div>
                </section>

                <section className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-4 py-3 md:px-5 md:py-4 border-b border-gray-100 bg-white">
                    <h3 className="text-sm font-black text-[#0a192f]">
                      2. Crédito y pagaré
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Registra la línea autorizada y la persona que aprobó el límite.
                    </p>
                  </div>

                  <div className="p-4 md:p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                      <label className="block text-[11px] font-black uppercase text-blue-700 tracking-wider mb-1.5">
                        Línea de crédito principal <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black">
                          $
                        </span>
                        <input
                          type="number"
                          name="limite_credito"
                          value={formData.limite_credito}
                          onChange={handleInputChange}
                          placeholder="Ej. 10000"
                          min="0"
                          step="0.01"
                          required
                          disabled={isSubmitting}
                          className="w-full pl-8 pr-4 py-3 bg-white border border-blue-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm font-black text-[#0a192f]"
                        />
                      </div>
                      <p className="text-[10px] text-blue-700/70 mt-2 leading-relaxed">
                        Esta línea debe venir autorizada desde el sistema principal. Aquí solo se registra y se audita.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 lg:col-span-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-black uppercase text-slate-600 tracking-wider mb-1.5">
                            Personal que autoriza
                            {Number(formData.limite_credito) > 0 && (
                              <span className="text-red-500"> *</span>
                            )}
                          </label>
                          <input
                            type="text"
                            name="linea_credito_autorizado_por"
                            value={formData.linea_credito_autorizado_por}
                            onChange={handleInputChange}
                            placeholder="Ej. Juan Pérez"
                            required={Number(formData.limite_credito) > 0}
                            disabled={isSubmitting}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm font-bold text-[#0a192f]"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-black uppercase text-slate-600 tracking-wider mb-1.5">
                            Motivo o respaldo de línea
                            {Number(formData.limite_credito) > 0 && (
                              <span className="text-red-500"> *</span>
                            )}
                          </label>
                          <textarea
                            name="linea_credito_motivo"
                            value={formData.linea_credito_motivo}
                            onChange={handleInputChange}
                            disabled={isSubmitting}
                            rows="2"
                            required={Number(formData.limite_credito) > 0}
                            placeholder="Ej. Límite autorizado por administración."
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm resize-none"
                          />
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">
                        Este registro crea un movimiento histórico de línea de crédito. No se elimina; si hay error, se corrige con un nuevo movimiento desde el expediente.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                      <label className="block text-[11px] font-black uppercase text-amber-700 tracking-wider mb-2">
                        Cuenta con pagaré inicial? <span className="text-red-500">*</span>
                      </label>

                      <div className="grid grid-cols-2 gap-3">
                        <label className={`cursor-pointer rounded-xl border p-3 text-center transition-all ${
                          formData.pagare_inicial === "SI"
                            ? "bg-[#0a192f] border-[#0a192f] text-white shadow-md"
                            : "bg-white border-amber-200 text-gray-600 hover:border-amber-400"
                        }`}>
                          <input
                            type="radio"
                            name="pagare_inicial"
                            value="SI"
                            checked={formData.pagare_inicial === "SI"}
                            onChange={handleInputChange}
                            required
                            disabled={isSubmitting}
                            className="sr-only"
                          />
                          <span className="block text-sm font-black">Sí</span>
                          <span className="block text-[10px] opacity-75 mt-0.5">
                            Cuenta con respaldo
                          </span>
                        </label>

                        <label className={`cursor-pointer rounded-xl border p-3 text-center transition-all ${
                          formData.pagare_inicial === "NO"
                            ? "bg-[#0a192f] border-[#0a192f] text-white shadow-md"
                            : "bg-white border-amber-200 text-gray-600 hover:border-amber-400"
                        }`}>
                          <input
                            type="radio"
                            name="pagare_inicial"
                            value="NO"
                            checked={formData.pagare_inicial === "NO"}
                            onChange={handleInputChange}
                            required
                            disabled={isSubmitting}
                            className="sr-only"
                          />
                          <span className="block text-sm font-black">No</span>
                          <span className="block text-[10px] opacity-75 mt-0.5">
                            Sin pagaré inicial
                          </span>
                        </label>
                      </div>

                      <p className="text-[10px] text-amber-700/80 mt-2 leading-relaxed">
                        Esta respuesta se mostrará dentro del expediente del cliente.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-4 py-3 md:px-5 md:py-4 border-b border-gray-100 bg-white">
                    <h3 className="text-sm font-black text-[#0a192f]">
                      3. Clasificación y seguimiento
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Información operativa para organizar la cartera.
                    </p>
                  </div>

                  <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-black uppercase text-gray-500 tracking-wider mb-1.5">
                        Grupo comercial
                      </label>
                      <select
                        name="grupo"
                        value={formData.grupo}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm font-bold"
                      >
                        {OPCIONES_GRUPO.map((grupo) => (
                          <option key={grupo} value={grupo}>
                            {formatearGrupo(grupo)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-gray-500 tracking-wider mb-1.5">
                        Clasificación
                      </label>
                      <select
                        name="segmentacion"
                        value={formData.segmentacion}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm font-bold"
                      >
                        {OPCIONES_CLASIFICACION.map((clasificacion) => (
                          <option key={clasificacion} value={clasificacion}>
                            {clasificacion}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-gray-500 tracking-wider mb-1.5">
                        Días de mensaje
                      </label>
                      <input
                        type="number"
                        name="dias_mensaje"
                        value={formData.dias_mensaje}
                        onChange={handleInputChange}
                        placeholder="Ej. 5"
                        min="0"
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-black uppercase text-gray-500 tracking-wider mb-1.5">
                        Notas internas
                      </label>
                      <textarea
                        name="notas"
                        value={formData.notas}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        rows="3"
                        placeholder="Observaciones internas, referencias o acuerdos iniciales."
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm resize-none"
                      />
                    </div>
                  </div>
                </section>
              </div>
            </form>

            <div className="fixed bottom-0 left-0 right-0 z-[70] flex shrink-0 flex-col justify-end gap-3 border-t border-gray-100 bg-white/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur md:static md:flex-row md:px-6 md:py-4">
              <button
                type="button"
                onClick={handleCerrarModalAlta}
                disabled={isSubmitting}
                className="w-full md:w-auto px-6 py-3 md:py-2.5 text-sm font-bold text-gray-600 bg-gray-100 border border-transparent rounded-xl active:bg-gray-200 hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                form="altaClienteForm"
                disabled={isSubmitting}
                className="w-full md:w-auto px-8 py-3 md:py-2.5 text-sm font-black text-[#0a192f] bg-[#ffd700] rounded-xl active:bg-[#e6c200] hover:bg-[#ffed4a] disabled:opacity-70 flex items-center justify-center shadow-md transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar cliente"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}