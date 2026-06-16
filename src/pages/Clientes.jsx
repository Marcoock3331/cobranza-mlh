import { useState, useContext } from "react";
import {
  Search,
  Plus,
  MoreVertical,
  X,
  Trash2,
  Users,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GlobalContext } from "../context/GlobalContext";
import { useClientes } from "../hooks/useClientes";

const normalizarGrupo = (valor = "") => {
  return valor
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
};

export default function Clientes() {
  const navigate = useNavigate();
  const { userRole, userName, clientes, eliminarClienteEnNube } =
    useContext(GlobalContext);
  const { registrarNuevoCliente, isSubmitting } = useClientes();

  // Sistema de Notificaciones
  const [notificacion, setNotificacion] = useState({ visible: false, titulo: "", mensaje: "", tipo: "success" });

  const mostrarNotificacion = (titulo, mensaje, tipo = "success") => {
    setNotificacion({ visible: true, titulo, mensaje, tipo });
    setTimeout(() => {
      setNotificacion({ visible: false, titulo: "", mensaje: "", tipo: "success" });
    }, 5000);
  };

  const gruposFiltro = [
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
  const [grupoActivo, setGrupoActivo] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [menuAbiertoId, setMenuAbiertoId] = useState(null);

  const [clienteAInactivar, setClienteAInactivar] = useState(null);
  const [isInactivating, setIsInactivating] = useState(false);

  const initialState = {
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
    pagare_monto: 0.0,
    pagare_fecha: "",
    notas: "",
  };

  const [formData, setFormData] = useState(initialState);

  const opcionesGrupo = [
    "GENERAL",
    "CARPINTERIA",
    "CRUCE",
    "FAMILIARES",
    "PRIORIDAD",
    "IHB",
    "RC INTERCOMERCE",
    "TORRE LAS AMERICAS",
  ];

  const opcionesSegmentacion = [
    "Cumplidor",
    "Moroso",
    "Riesgo Alto",
    "Nuevo",
    "Suspendido",
  ];

  const clientesFiltrados = clientes.filter((cliente) => {
    // Evitar que el buscador rompa si el cliente es nulo o inactivo lógicamente
    if (cliente.activo === false || cliente.estatus === "Inactivo") return false;

    const coincideGrupo =
      grupoActivo === "Todos" ||
      normalizarGrupo(cliente.grupo) === normalizarGrupo(grupoActivo);

    const coincideBusqueda =
      (cliente.nombre &&
        cliente.nombre.toLowerCase().includes(busqueda.toLowerCase())) ||
      (cliente.rfc &&
        cliente.rfc.toLowerCase().includes(busqueda.toLowerCase())) ||
      (cliente.numero_cliente &&
        cliente.numero_cliente.toLowerCase().includes(busqueda.toLowerCase()));
    
    return coincideGrupo && coincideBusqueda;
  });

  const handleInputChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCerrarModalAlta = () => {
    setIsModalOpen(false);
    setFormData(initialState);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const response = await registrarNuevoCliente(formData, userName);
    if (response.success) {
      mostrarNotificacion("Éxito", "Cliente registrado correctamente.", "success");
      handleCerrarModalAlta();
    } else {
      mostrarNotificacion("Error al guardar", response.error || "Revisa la consola para más detalles.", "error");
    }
  };

  const confirmarInactivacion = async () => {
    if (!clienteAInactivar) return;
    setIsInactivating(true);
    
    // Este método en GlobalContext ahora apunta de forma segura a clientesService.eliminarCliente
    // que bajo el capó realiza un update lógico y auditable.
    const res = await eliminarClienteEnNube(
      clienteAInactivar.id,
      clienteAInactivar.nombre
    );
    setIsInactivating(false);
    
    if (res.success) {
      mostrarNotificacion("Inactivado", "Cliente inactivado correctamente.", "success");
      setClienteAInactivar(null);
    } else {
      mostrarNotificacion("Error", res.error || "No se pudo inactivar el expediente.", "error");
    }
  };

  const getBadgeColor = (clase) => {
    switch (clase) {
      case "Cumplidor":
        return "bg-green-100 text-green-800 border-green-200";
      case "Moroso":
        return "bg-red-100 text-red-800 border-red-200";
      case "Irregular":
      case "Riesgo Alto":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div
      className="h-full flex flex-col space-y-4 md:space-y-6 relative"
      onClick={() => setMenuAbiertoId(null)}
    >
      {/* NOTIFICACIONES FLOTANTES */}
      {notificacion.visible && (
        <div className={`fixed top-4 right-4 z-[100] p-4 rounded shadow-lg border flex items-start gap-3 w-80 animate-slide-in-right ${notificacion.tipo === "error" ? "bg-red-50 border-red-200 text-red-800" : "bg-green-50 border-green-200 text-green-800"}`}>
          {notificacion.tipo === "error" ? <XCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600" /> : <CheckCircle className="h-5 w-5 shrink-0 mt-0.5 text-green-600" />}
          <div>
            <h4 className="font-bold text-sm">{notificacion.titulo}</h4>
            <p className="text-xs mt-1 opacity-90">{notificacion.mensaje}</p>
          </div>
        </div>
      )}

      {/* HEADER ADAPTATIVO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mt-2 md:mt-4 gap-4">
        <div className="w-full md:w-auto">
          <h1 className="text-xl md:text-2xl font-bold text-[#0a192f] flex items-center">
            <Users className="h-5 w-5 md:h-6 md:w-6 mr-2 text-blue-600" />{" "}
            Directorio de Clientes
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1">
            Administración de cuentas, líneas de crédito, estatus de saldos y
            expedientes clínicos.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full md:w-auto px-5 py-3 md:py-2.5 bg-[#0a192f] text-white font-bold text-sm rounded-xl md:rounded-lg hover:bg-[#1a2b45] flex items-center justify-center shadow-md transition-all active:scale-[0.98]"
        >
          <Plus className="h-4 w-4 mr-2" /> Nuevo Cliente
        </button>
      </div>

      {/* FILTROS DESLIZABLES EN MÓVIL */}
      <div className="flex overflow-x-auto pb-2 md:pb-0 md:flex-wrap gap-2 custom-scrollbar hide-scrollbar-mobile w-full">
        {gruposFiltro.map((grupo) => (
          <button
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

      {/* BUSCADOR */}
      <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 md:h-4 md:w-4 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ffd700]/50 focus:border-[#ffd700] transition-all"
            placeholder="Buscar cliente, RFC o ID..."
          />
        </div>
      </div>

      {/* TABLA UNIFICADA */}
      <div className="flex bg-white border border-gray-100 rounded-xl shadow-sm flex-col overflow-hidden flex-1">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] md:max-h-[calc(100vh-350px)] pb-20 custom-scrollbar w-full">
          <table className="w-full min-w-[1000px] text-left text-sm border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <th className="px-6 py-4 border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                  No. Cliente
                </th>
                <th className="px-6 py-4 border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                  Razón Social / RFC
                </th>
                <th className="px-6 py-4 border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                  Segmentación
                </th>
                <th className="px-6 py-4 border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                  Último Depósito
                </th>
                <th className="px-6 py-4 text-right border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                  Debe (Saldo)
                </th>
                <th className="px-6 py-4 text-right border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                  Límite Crédito
                </th>
                {userRole === "SU" && (
                  <th className="px-6 py-4 text-center border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clientesFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-8 text-center text-gray-500 font-medium"
                  >
                    No hay clientes registrados o no coinciden con la búsqueda.
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <tr
                    key={cliente.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-bold text-[#0a192f]">
                      {cliente.numero_cliente || "SIN-FOLIO"}
                    </td>
                    <td
                      className="px-6 py-4 cursor-pointer group"
                      onClick={() => navigate(`/clientes/${cliente.id}`)}
                    >
                      <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors whitespace-nowrap">
                        {cliente.nombre}
                      </div>
                      <div className="text-xs text-gray-400 font-mono uppercase">
                        {cliente.rfc}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getBadgeColor(cliente.segmentacion)}`}
                      >
                        {cliente.segmentacion || "Nuevo"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-green-600">
                        $
                        {(cliente.monto_ultimo_pago || 0).toLocaleString(
                          "es-MX",
                        )}
                      </div>
                      <div className="text-xs text-gray-500 font-medium whitespace-nowrap">
                        {cliente.fecha_ultimo_pago?.toDate
                          ? cliente.fecha_ultimo_pago
                              .toDate()
                              .toLocaleDateString("es-MX")
                          : cliente.fecha_ultimo_pago || "---"}
                      </div>
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-bold whitespace-nowrap ${(cliente.deuda_actual || 0) > 0 ? "text-red-600" : "text-gray-900"}`}
                    >
                      $
                      {(cliente.deuda_actual || 0).toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500 italic whitespace-nowrap">
                      ${(cliente.limite_credito || 0).toLocaleString("es-MX")}
                    </td>
                    {userRole === "SU" && (
                      <td className="px-6 py-4 text-center relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuAbiertoId(
                              menuAbiertoId === cliente.id ? null : cliente.id,
                            );
                          }}
                          className="p-3 md:p-1 hover:bg-gray-200 active:bg-gray-300 rounded-full text-gray-500 transition-colors"
                        >
                          <MoreVertical className="h-5 w-5 mx-auto" />
                        </button>
                        {menuAbiertoId === cliente.id && (
                          <div
                            className="absolute right-12 md:right-8 top-10 w-48 bg-white rounded-lg shadow-[0_4px_25px_rgba(0,0,0,0.15)] border border-gray-100 z-[100] overflow-hidden text-left"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setClienteAInactivar(cliente);
                                setMenuAbiertoId(null);
                              }}
                              className="w-full px-4 py-3 md:py-2.5 text-sm font-bold md:font-normal text-red-600 active:bg-red-50 hover:bg-red-50 flex items-center transition-colors"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Inactivar
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

      {/* Modal de Inactivación */}
      {clienteAInactivar && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm md:p-4 animate-fade-in">
          <div className="bg-white rounded-t-3xl md:rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-slide-up md:animate-fade-in pb-8 md:pb-0">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden"></div>

            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 md:h-14 md:w-14 rounded-full bg-red-100 mb-4 ring-4 ring-red-50">
                <AlertTriangle className="h-8 w-8 md:h-7 md:w-7 text-red-600" />
              </div>
              <h3 className="text-xl font-black text-[#0a192f] mb-2">
                Inactivar Cliente
              </h3>
              <p className="text-sm text-gray-600 mb-6 md:mb-6 leading-relaxed">
                ¿Está totalmente seguro de inactivar a{" "}
                <span className="font-bold text-gray-900">
                  {clienteAInactivar.nombre}
                </span>
                ? El historial y las facturas se conservarán.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setClienteAInactivar(null)}
                  disabled={isInactivating}
                  className="flex-1 px-4 py-3 md:py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-xl md:rounded-lg active:bg-gray-50 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarInactivacion}
                  disabled={isInactivating}
                  className="flex-1 px-4 py-3 md:py-2 text-sm font-bold text-white bg-red-600 rounded-xl md:rounded-lg active:bg-red-700 hover:bg-red-700 disabled:opacity-70 flex items-center justify-center transition-colors shadow-sm"
                >
                  {isInactivating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
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

      {/* Modal de Alta de Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-xl shadow-2xl w-full max-w-4xl h-[95vh] md:h-auto md:max-h-[90vh] flex flex-col animate-slide-up md:animate-fade-in overflow-hidden">
            <div className="flex justify-between items-center p-5 md:p-6 border-b border-gray-100 shrink-0 bg-white z-10">
              <h2 className="text-xl font-black text-[#0a192f]">
                Nuevo Cliente
              </h2>
              <button
                onClick={handleCerrarModalAlta}
                className="text-gray-400 active:text-red-500 hover:text-red-500 bg-gray-50 p-2 rounded-full transition-colors disabled:opacity-50"
                disabled={isSubmitting}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 md:p-6 overflow-y-auto flex-1 custom-scrollbar pb-24 md:pb-6">
              <form
                id="altaClienteForm"
                onSubmit={handleSubmit}
                className="space-y-6 md:space-y-6"
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
                      Grupo
                    </label>
                    <select
                      name="grupo"
                      value={formData.grupo}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-xl md:rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm font-medium"
                    >
                      {opcionesGrupo.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                      Segmentación
                    </label>
                    <select
                      name="segmentacion"
                      value={formData.segmentacion}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-xl md:rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm font-medium"
                    >
                      {opcionesSegmentacion.map((s) => (
                        <option key={s} value={s}>
                          {s}
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
                      className={`w-full px-4 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-xl md:rounded-md focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm font-bold ${userRole !== 'SU' ? 'text-gray-400 cursor-not-allowed' : 'text-gray-900 focus:bg-white'}`}
                    />
                    <p className="text-[10px] text-gray-400 mt-1.5 leading-tight">
                      {userRole === "SU" 
                         ? "Monto de apertura. Futuros aumentos requerirán autorización." 
                         : "Los perfiles operativos no tienen permisos para asignar crédito inicial."}
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
                    ></textarea>
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
                    ></textarea>
                  </div>
                </div>
              </form>
            </div>

            <div className="p-4 md:p-5 border-t border-gray-100 bg-white md:bg-gray-50 md:rounded-b-xl flex flex-col-reverse md:flex-row justify-end gap-3 md:gap-3 shrink-0">
              <button
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
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />{" "}
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