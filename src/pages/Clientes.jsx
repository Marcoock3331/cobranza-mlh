import { useContext, useMemo, useState } from "react";
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
import { useNavigate } from "react-router-dom";

import { GlobalContext } from "../context/GlobalContext";
import { useClientes } from "../hooks/useClientes";

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

const ESTADO_INICIAL = {
  numero_cliente: "",
  nombre: "",
  rfc: "",
  telefono: "",
  correo: "",
  direccion: "",
  ultima_fecha_pago: "",
  limite_credito: "",
  segmentacion: "Nuevo",
  grupo: "GENERAL",
  dias_mensaje: "",
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

export default function Clientes() {
  const navigate = useNavigate();

  const { userRole, userName, clientes, eliminarClienteEnNube } =
    useContext(GlobalContext);

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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [menuAbiertoId, setMenuAbiertoId] = useState(null);

  const [clienteAInactivar, setClienteAInactivar] = useState(null);
  const [isInactivating, setIsInactivating] = useState(false);

  const [formData, setFormData] = useState(ESTADO_INICIAL);

  const mostrarNotificacion = (titulo, mensaje, tipo = "success") => {
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

  const clientesFiltrados = useMemo(() => {
    const textoBusqueda = normalizarTexto(busqueda);

    const lista = (Array.isArray(clientes) ? clientes : []).filter(
      (cliente) => {
        if (cliente?.activo === false || cliente?.estatus === "Inactivo") {
          return false;
        }

        const coincideGrupo =
          grupoActivo === "Todos" ||
          normalizarGrupo(cliente?.grupo) === normalizarGrupo(grupoActivo);

        const coincideBusqueda =
          textoBusqueda === "" ||
          normalizarTexto(cliente?.nombre).includes(textoBusqueda) ||
          normalizarTexto(cliente?.rfc).includes(textoBusqueda) ||
          normalizarTexto(cliente?.numero_cliente).includes(textoBusqueda) ||
          normalizarTexto(cliente?.segmentacion).includes(textoBusqueda) ||
          normalizarTexto(formatearGrupo(cliente?.grupo)).includes(
            textoBusqueda,
          );

        return coincideGrupo && coincideBusqueda;
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
  }, [clientes, grupoActivo, busqueda, ordenClientes]);

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

    const response = await registrarNuevoCliente(formData, userName);

    if (response?.success) {
      mostrarNotificacion("Éxito", "Cliente registrado correctamente.");
      handleCerrarModalAlta();
      return;
    }

    mostrarNotificacion(
      "Error al guardar",
      response?.error || "Revisa la consola para más detalles.",
      "error",
    );
  };

  const confirmarInactivacion = async () => {
    if (!clienteAInactivar) return;

    setIsInactivating(true);

    try {
      const respuesta = await eliminarClienteEnNube(
        clienteAInactivar.id,
        clienteAInactivar.nombre,
      );

      if (respuesta?.success) {
        mostrarNotificacion("Inactivado", "Cliente inactivado correctamente.");
        setClienteAInactivar(null);
        return;
      }

      mostrarNotificacion(
        "Error",
        respuesta?.error || "No se pudo inactivar el expediente.",
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

    setMenuAbiertoId((actual) => (actual === clienteId ? null : clienteId));
  };

  return (
    <div
      className="min-h-full flex flex-col space-y-4 md:space-y-6 relative pb-4"
      onClick={() => setMenuAbiertoId(null)}
    >
      {notificacion.visible && (
        <div
          className={`fixed top-4 right-4 left-4 sm:left-auto z-[100] p-4 rounded-xl shadow-lg border flex items-start gap-3 sm:w-80 animate-slide-in-right ${
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
            <h4 className="font-bold text-sm">{notificacion.titulo}</h4>
            <p className="text-xs mt-1 opacity-90">{notificacion.mensaje}</p>
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
            Administración de cuentas, líneas de crédito, saldos y expedientes
            comerciales.
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
            onClick={() => setGrupoActivo(grupo)}
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
              onChange={(event) => setBusqueda(event.target.value)}
              className="w-full pl-10 pr-4 py-3 md:py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ffd700]/50 focus:border-[#ffd700] transition-all"
              placeholder="Buscar cliente, RFC, ID, grupo o clasificación..."
            />
          </div>

          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />

            <select
              value={ordenClientes}
              onChange={(event) => setOrdenClientes(event.target.value)}
              className="w-full appearance-none pl-10 pr-10 py-3 md:py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-[#0a192f] focus:outline-none focus:ring-2 focus:ring-[#ffd700]/50 focus:border-[#ffd700]"
            >
              {OPCIONES_ORDEN.map((opcion) => (
                <option key={opcion.value} value={opcion.value}>
                  {opcion.label}
                </option>
              ))}
            </select>

            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <p className="text-[10px] md:text-xs text-gray-400 mt-3">
          {clientesFiltrados.length} cliente(s) visibles. La clasificación
          describe el comportamiento de pago y el grupo identifica la cartera
          comercial.
        </p>
      </div>

      <div className="md:hidden space-y-3">
        {clientesFiltrados.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
            <Users className="h-9 w-9 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-600">
              No se encontraron clientes.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Cambia el grupo, el orden o la búsqueda.
            </p>
          </div>
        ) : (
          clientesFiltrados.map((cliente) => (
            <article
              key={cliente.id}
              className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-visible"
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => abrirExpediente(cliente.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                        Cliente
                      </span>
                      <span className="font-mono text-xs font-black text-blue-600">
                        #{cliente.numero_cliente || "SIN-ID"}
                      </span>
                    </div>

                    <h2 className="text-base font-black text-[#0a192f] mt-1 leading-snug">
                      {cliente.nombre || "Cliente sin nombre"}
                    </h2>

                    <p className="text-[11px] text-gray-400 font-mono uppercase mt-1 break-all">
                      {cliente.rfc || "RFC no registrado"}
                    </p>
                  </button>

                  {userRole === "SU" && (
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={(event) => abrirMenuCliente(event, cliente.id)}
                        className="p-2.5 rounded-xl bg-gray-50 text-gray-500 active:bg-gray-200"
                        aria-label="Opciones del cliente"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>

                      {menuAbiertoId === cliente.id && (
                        <div
                          className="absolute right-0 top-12 w-44 bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.18)] border border-gray-100 z-30 overflow-hidden"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setClienteAInactivar(cliente);
                              setMenuAbiertoId(null);
                            }}
                            className="w-full px-4 py-3 text-sm font-bold text-red-600 active:bg-red-50 flex items-center"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Inactivar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border ${obtenerColorClasificacion(
                      cliente.segmentacion,
                    )}`}
                  >
                    Clasificación: {cliente.segmentacion || "Nuevo"}
                  </span>

                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border ${obtenerColorGrupo(
                      cliente.grupo,
                    )}`}
                  >
                    {formatearGrupo(cliente.grupo)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="rounded-xl bg-red-50/60 border border-red-100 p-3">
                    <p className="text-[9px] uppercase tracking-wider font-black text-red-400">
                      Saldo pendiente
                    </p>
                    <p
                      className={`text-sm font-black mt-1 ${
                        Number(cliente.deuda_actual) > 0
                          ? "text-red-600"
                          : "text-[#0a192f]"
                      }`}
                    >
                      ${formatearMoneda(cliente.deuda_actual)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-3">
                    <p className="text-[9px] uppercase tracking-wider font-black text-blue-400">
                      Límite de crédito
                    </p>
                    <p className="text-sm font-black text-[#0a192f] mt-1">
                      ${formatearMoneda(cliente.limite_credito, 0)}
                    </p>
                  </div>

                  <div className="col-span-2 rounded-xl bg-gray-50 border border-gray-200 p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[9px] uppercase tracking-wider font-black text-gray-400">
                        Último depósito
                      </p>
                      <p className="text-sm font-black text-green-600 mt-1">
                        ${formatearMoneda(cliente.monto_ultimo_pago, 0)}
                      </p>
                    </div>

                    <p className="text-xs font-bold text-gray-500 text-right">
                      {formatearFechaUltimoPago(cliente.fecha_ultimo_pago)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => abrirExpediente(cliente.id)}
                  className="w-full mt-4 py-3 rounded-xl bg-[#0a192f] text-white text-xs font-black flex items-center justify-center active:bg-[#112240]"
                >
                  Ver expediente
                  <ChevronRight className="h-4 w-4 ml-1.5" />
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="hidden md:flex bg-white border border-gray-100 rounded-xl shadow-sm flex-col overflow-hidden flex-1">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)] pb-16 custom-scrollbar w-full">
          <table className="w-full min-w-[1280px] text-left text-sm border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 text-gray-600 font-semibold">
                <th className="px-5 py-4 border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                  No. Cliente
                </th>
                <th className="px-5 py-4 border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                  Razón Social / RFC
                </th>
                <th className="px-5 py-4 border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                  Clasificación
                </th>
                <th className="px-5 py-4 border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                  Grupo
                </th>
                <th className="px-5 py-4 border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                  Último Depósito
                </th>
                <th className="px-5 py-4 text-right border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                  Debe (Saldo)
                </th>
                <th className="px-5 py-4 text-right border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                  Límite Crédito
                </th>
                {userRole === "SU" && (
                  <th className="px-5 py-4 text-center border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {clientesFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={userRole === "SU" ? 8 : 7}
                    className="px-6 py-12 text-center text-gray-500 font-medium"
                  >
                    No hay clientes registrados o no coinciden con la búsqueda.
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <tr
                    key={cliente.id}
                    className="hover:bg-gray-50/70 transition-colors"
                  >
                    <td className="px-5 py-4 font-bold text-[#0a192f] whitespace-nowrap">
                      {cliente.numero_cliente || "SIN-ID"}
                    </td>

                    <td
                      className="px-5 py-4 cursor-pointer group"
                      onClick={() => abrirExpediente(cliente.id)}
                    >
                      <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors whitespace-nowrap max-w-[360px] truncate">
                        {cliente.nombre}
                      </div>
                      <div className="text-xs text-gray-400 font-mono uppercase">
                        {cliente.rfc || "RFC no registrado"}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap ${obtenerColorClasificacion(
                          cliente.segmentacion,
                        )}`}
                      >
                        {cliente.segmentacion || "Nuevo"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap ${obtenerColorGrupo(
                          cliente.grupo,
                        )}`}
                      >
                        {formatearGrupo(cliente.grupo)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-bold text-green-600">
                        ${formatearMoneda(cliente.monto_ultimo_pago, 0)}
                      </div>
                      <div className="text-xs text-gray-500 font-medium whitespace-nowrap">
                        {formatearFechaUltimoPago(cliente.fecha_ultimo_pago)}
                      </div>
                    </td>

                    <td
                      className={`px-5 py-4 text-right font-bold whitespace-nowrap ${
                        Number(cliente.deuda_actual) > 0
                          ? "text-red-600"
                          : "text-gray-900"
                      }`}
                    >
                      ${formatearMoneda(cliente.deuda_actual)}
                    </td>

                    <td className="px-5 py-4 text-right text-gray-500 italic whitespace-nowrap">
                      ${formatearMoneda(cliente.limite_credito, 0)}
                    </td>

                    {userRole === "SU" && (
                      <td className="px-5 py-4 text-center relative">
                        <button
                          type="button"
                          onClick={(event) =>
                            abrirMenuCliente(event, cliente.id)
                          }
                          className="p-2 hover:bg-gray-200 active:bg-gray-300 rounded-full text-gray-500 transition-colors"
                          aria-label="Opciones del cliente"
                        >
                          <MoreVertical className="h-5 w-5 mx-auto" />
                        </button>

                        {menuAbiertoId === cliente.id && (
                          <div
                            className="absolute right-8 top-12 w-48 bg-white rounded-lg shadow-[0_4px_25px_rgba(0,0,0,0.15)] border border-gray-100 z-[100] overflow-hidden text-left"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setClienteAInactivar(cliente);
                                setMenuAbiertoId(null);
                              }}
                              className="w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Inactivar
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
      </div>

      {clienteAInactivar && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm md:p-4 animate-fade-in">
          <div className="bg-white rounded-t-3xl md:rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-slide-up md:animate-fade-in pb-8 md:pb-0">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden" />

            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 md:h-14 md:w-14 rounded-full bg-red-100 mb-4 ring-4 ring-red-50">
                <AlertTriangle className="h-8 w-8 md:h-7 md:w-7 text-red-600" />
              </div>

              <h3 className="text-xl font-black text-[#0a192f] mb-2">
                Inactivar Cliente
              </h3>

              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                ¿Está totalmente seguro de inactivar a{" "}
                <span className="font-bold text-gray-900">
                  {clienteAInactivar.nombre}
                </span>
                ? El historial y las facturas se conservarán.
              </p>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setClienteAInactivar(null)}
                  disabled={isInactivating}
                  className="flex-1 px-4 py-3 md:py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-xl md:rounded-lg active:bg-gray-50 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={confirmarInactivacion}
                  disabled={isInactivating}
                  className="flex-1 px-4 py-3 md:py-2 text-sm font-bold text-white bg-red-600 rounded-xl md:rounded-lg active:bg-red-700 hover:bg-red-700 disabled:opacity-70 flex items-center justify-center transition-colors shadow-sm"
                >
                  {isInactivating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Inactivando...
                    </>
                  ) : (
                    "Sí, inactivar"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-xl shadow-2xl w-full max-w-4xl h-[95vh] md:h-auto md:max-h-[90vh] flex flex-col animate-slide-up md:animate-fade-in overflow-hidden">
            <div className="flex justify-between items-center p-5 md:p-6 border-b border-gray-100 shrink-0 bg-white z-10">
              <h2 className="text-xl font-black text-[#0a192f]">
                Nuevo Cliente
              </h2>

              <button
                type="button"
                onClick={handleCerrarModalAlta}
                className="text-gray-400 active:text-red-500 hover:text-red-500 bg-gray-50 p-2 rounded-full transition-colors disabled:opacity-50"
                disabled={isSubmitting}
                aria-label="Cerrar formulario"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 md:p-6 overflow-y-auto flex-1 custom-scrollbar pb-24 md:pb-6">
              <form
                id="altaClienteForm"
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                      ID del Cliente (Opcional)
                    </label>
                    <input
                      type="text"
                      name="numero_cliente"
                      value={formData.numero_cliente}
                      onChange={handleInputChange}
                      placeholder="ID de otro sistema"
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-xl md:rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                      Razón Social <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      required
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-xl md:rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                      RFC
                    </label>
                    <input
                      type="text"
                      name="rfc"
                      value={formData.rfc}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-xl md:rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-xl md:rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      name="correo"
                      value={formData.correo}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-xl md:rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 border-t border-gray-100 pt-6">
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                      Grupo comercial
                    </label>
                    <select
                      name="grupo"
                      value={formData.grupo}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-xl md:rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm font-medium"
                    >
                      {OPCIONES_GRUPO.map((grupo) => (
                        <option key={grupo} value={grupo}>
                          {formatearGrupo(grupo)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                      Clasificación del cliente
                    </label>
                    <select
                      name="segmentacion"
                      value={formData.segmentacion}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-xl md:rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm font-medium"
                    >
                      {OPCIONES_CLASIFICACION.map((clasificacion) => (
                        <option key={clasificacion} value={clasificacion}>
                          {clasificacion}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                      Límite de Crédito
                    </label>
                    <input
                      type="number"
                      name="limite_credito"
                      value={userRole === "SU" ? formData.limite_credito : 0}
                      onChange={handleInputChange}
                      placeholder="Ej. 6000"
                      disabled={isSubmitting || userRole !== "SU"}
                      className={`w-full px-4 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-xl md:rounded-md focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm font-bold ${
                        userRole !== "SU"
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-gray-900 focus:bg-white"
                      }`}
                    />

                    <p className="text-[10px] text-gray-400 mt-1.5 leading-tight">
                      {userRole === "SU"
                        ? "Monto de apertura. Futuros aumentos requerirán autorización."
                        : "Los perfiles operativos no pueden asignar crédito inicial."}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 border-t border-gray-100 pt-6">
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                      Días de Mensaje (Aviso)
                    </label>
                    <input
                      type="number"
                      name="dias_mensaje"
                      value={formData.dias_mensaje}
                      onChange={handleInputChange}
                      placeholder="Ej. 5"
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-xl md:rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-gray-50/50 p-4 rounded-xl border border-gray-200">
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                        Pagaré - Monto
                      </label>
                      <input
                        type="number"
                        name="pagare_monto"
                        value={formData.pagare_monto}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 md:py-2 bg-white border border-gray-200 rounded-xl md:rounded-md focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm"
                      />
                    </div>

                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                        Pagaré - Fecha
                      </label>
                      <input
                        type="date"
                        name="pagare_fecha"
                        value={formData.pagare_fecha}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 md:py-2 bg-white border border-gray-200 rounded-xl md:rounded-md focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:gap-6 border-t border-gray-100 pt-6 pb-4">
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                      Dirección Completa
                    </label>
                    <textarea
                      name="direccion"
                      value={formData.direccion}
                      onChange={handleInputChange}
                      rows="2"
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-xl md:rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                      Notas Internas
                    </label>
                    <textarea
                      name="notas"
                      value={formData.notas}
                      onChange={handleInputChange}
                      rows="2"
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 md:py-2 bg-yellow-50/30 border border-yellow-200 rounded-xl md:rounded-md focus:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm resize-none"
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="p-4 md:p-5 border-t border-gray-100 bg-white md:bg-gray-50 md:rounded-b-xl flex flex-col-reverse md:flex-row justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={handleCerrarModalAlta}
                disabled={isSubmitting}
                className="w-full md:w-auto px-6 py-3.5 md:py-2.5 text-sm font-bold text-gray-600 bg-gray-100 border border-transparent rounded-xl md:rounded-lg active:bg-gray-200 hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                form="altaClienteForm"
                disabled={isSubmitting}
                className="w-full md:w-auto px-8 py-3.5 md:py-2.5 text-sm font-black text-[#0a192f] bg-[#ffd700] rounded-xl md:rounded-lg active:bg-[#e6c200] hover:bg-[#ffed4a] disabled:opacity-70 flex items-center justify-center shadow-md transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Cliente"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
