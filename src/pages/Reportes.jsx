import { useContext, useMemo, useState, useEffect, useRef } from "react";
import {
  BarChart3,
  Calendar,
  Download,
  FileSpreadsheet,
  Users,
  Receipt,
  Search,
  X,
  XCircle,
  CheckCircle
} from "lucide-react";

import { GlobalContext } from "../context/GlobalContext";
import { reportesService } from "../services/reportesService";
import { exportarResumenClientes } from "../utils/excel/exportarResumenClientes";
import { exportarDetalleFacturas } from "../utils/excel/exportarDetalleFacturas";
import { exportarReporteGeneralClientes } from "../utils/excel/exportarReporteGeneralClientes";

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function TarjetaKPI({ etiqueta, valor, descripcion, icono: Icono, variante = "azul" }) {
  const variantes = {
    azul: { tarjeta: "border-blue-100 bg-blue-50/30", etiqueta: "text-blue-600", valor: "text-[#0a192f]", icono: "bg-blue-100 text-blue-600" },
    rojo: { tarjeta: "border-red-100 bg-red-50/30", etiqueta: "text-red-600", valor: "text-red-600", icono: "bg-red-100 text-red-600" },
    verde: { tarjeta: "border-green-100 bg-green-50/30", etiqueta: "text-green-700", valor: "text-green-600", icono: "bg-green-100 text-green-600" },
    morado: { tarjeta: "border-purple-100 bg-purple-50/30", etiqueta: "text-purple-700", valor: "text-[#0a192f]", icono: "bg-purple-100 text-purple-600" },
  };

  const estilos = variantes[variante];

  return (
    <article className={`rounded-2xl border shadow-sm p-5 ${estilos.tarjeta}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className={`text-xs uppercase font-black tracking-wider ${estilos.etiqueta}`}>{etiqueta}</p>
          <h3 className={`text-2xl font-black mt-1 ${estilos.valor}`}>{valor}</h3>
        </div>
        <div className={`p-3 rounded-xl ${estilos.icono}`}>
          <Icono size={22} />
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-3">{descripcion}</p>
    </article>
  );
}

export default function Reportes() {
  const { stats, userName, clientes } = useContext(GlobalContext);

  const [tipoReporte, setTipoReporte] = useState("RESUMEN_CLIENTES");
  const [periodo, setPeriodo] = useState("TODOS");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [grupo, setGrupo] = useState("TODOS");
  const [grupos, setGrupos] = useState([]);
  const [generando, setGenerando] = useState(false);
  
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

  // Reemplazo de alert()
  const [notificacion, setNotificacion] = useState({
    visible: false,
    titulo: "",
    mensaje: "",
    tipo: "success",
  });

  const ultimoRangoPersonalizado = useRef({ inicio: "", fin: "" });

  const mostrarNotificacion = (titulo, mensaje, tipo = "error") => {
    setNotificacion({ visible: true, titulo, mensaje, tipo });
    setTimeout(() => {
      setNotificacion({ visible: false, titulo: "", mensaje: "", tipo: "success" });
    }, 5000);
  };

const cambiarPeriodo = (nuevoPeriodo) => {
  setPeriodo(nuevoPeriodo);

  const hoy = new Date();

  switch (nuevoPeriodo) {
    case "SEMANA": {
      const dia = hoy.getDay();

      const lunes = new Date(hoy);
      lunes.setDate(hoy.getDate() - (dia === 0 ? 6 : dia - 1));

      const domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);

      setFechaInicio(formatLocalDate(lunes));
      setFechaFin(formatLocalDate(domingo));
      break;
    }

    case "MES":
      setFechaInicio(
        formatLocalDate(
          new Date(hoy.getFullYear(), hoy.getMonth(), 1)
        )
      );
      setFechaFin(
        formatLocalDate(
          new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
        )
      );
      break;

    case "AÑO":
      setFechaInicio(`${hoy.getFullYear()}-01-01`);
      setFechaFin(`${hoy.getFullYear()}-12-31`);
      break;

    case "PERSONALIZADO":
      setFechaInicio(ultimoRangoPersonalizado.current.inicio);
      setFechaFin(ultimoRangoPersonalizado.current.fin);
      break;

    default:
      setFechaInicio("");
      setFechaFin("");
      break;
  }
};

  useEffect(() => {
    const cargarGrupos = async () => {
      try {
        const listaGrupos = await reportesService.obtenerGrupos();
        setGrupos(listaGrupos);
      } catch (error) {
        console.error("Error al cargar dependencias de reportes:", error);
      }
    };
    cargarGrupos();
  }, []);

  useEffect(() => {
    if (periodo === "PERSONALIZADO") {
      ultimoRangoPersonalizado.current = { inicio: fechaInicio, fin: fechaFin };
    }
  }, [fechaInicio, fechaFin, periodo]);

  // Se filtra utilizando el contexto global de clientes
  const sugerenciasClientes = useMemo(() => {
    if (!busquedaCliente.trim() || !clientes) return [];
    
    const query = busquedaCliente.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    return clientes.filter(c => {
      const nombre = (c.nombre || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const num = (c.numero_cliente || "").toLowerCase();
      const rfc = (c.rfc || "").toLowerCase();
      const correo = (c.correo || "").toLowerCase();
      
      return nombre.includes(query) || num.includes(query) || rfc.includes(query) || correo.includes(query);
    }).slice(0, 8);
  }, [busquedaCliente, clientes]);

  const indicadores = useMemo(() => {
    if (tipoReporte === "RESUMEN_CLIENTES") {
      return [
        { etiqueta: "Deuda por vencer", valor: `$${Number(stats.cartera_total - stats.cartera_vencida).toLocaleString("es-MX")}`, descripcion: "Facturas aún vigentes.", icono: Calendar, variante: "azul" },
        { etiqueta: "Deuda vencida", valor: `$${Number(stats.cartera_vencida).toLocaleString("es-MX")}`, descripcion: "Facturas vencidas.", icono: Receipt, variante: "rojo" },
        { etiqueta: "Monto recuperado", valor: `$${Number(stats.monto_recuperado).toLocaleString("es-MX")}`, descripcion: "Pagos registrados.", icono: Users, variante: "verde" },
      ];
    }
    return [
      { etiqueta: "Monto Facturado", valor: `$${Number(stats.total_facturado).toLocaleString("es-MX")}`, descripcion: "Facturación histórica.", icono: Receipt, variante: "azul" },
      { etiqueta: "Monto Recuperado", valor: `$${Number(stats.monto_recuperado).toLocaleString("es-MX")}`, descripcion: "Pagos registrados.", icono: Users, variante: "verde" },
      { etiqueta: "Notas Crédito", valor: `$${Number(stats.total_notas_credito).toLocaleString("es-MX")}`, descripcion: "Notas aplicadas.", icono: FileSpreadsheet, variante: "morado" },
    ];
  }, [stats, tipoReporte]);

  const generarExcel = async () => {
    if (periodo === "PERSONALIZADO") {
      if (!fechaInicio || !fechaFin) {
        mostrarNotificacion("Período incompleto", "Seleccione ambas fechas (inicio y fin).");
        return;
      }
      if (fechaInicio > fechaFin) {
        mostrarNotificacion("Fechas inválidas", "La fecha de inicio no puede ser mayor que la fecha final.");
        return;
      }
    }

    try {
      setGenerando(true);

      if (tipoReporte === "RESUMEN_CLIENTES") {
        if (!clienteSeleccionado) {
          mostrarNotificacion("Cliente requerido", "Por favor seleccione un cliente desde el buscador inteligente.");
          return;
        }

        const expediente = await reportesService.obtenerExpedienteFinancieroCliente({
          cliente: clienteSeleccionado,
          fechaInicio,
          fechaFin,
        });

        await exportarResumenClientes({
          expediente,
          fechaInicio,
          fechaFin,
          userName: userName || "Usuario",
        });

      } else if (tipoReporte === "DETALLE_FACTURAS") {
        const datos = await reportesService.obtenerDetalleFacturas({ fechaInicio, fechaFin, grupo });
        await exportarDetalleFacturas({
          datos, fechaInicio, fechaFin, grupo,
          metricas: {
            totalFacturado: Number(stats.total_facturado || 0),
            montoRecuperado: Number(stats.monto_recuperado || 0),
            notasCredito: Number(stats.total_notas_credito || 0),
          },
        });
      } else if (tipoReporte === "REPORTE_GENERAL_CLIENTES") {
        const datos = await reportesService.obtenerReporteGeneralClientes({ fechaInicio, fechaFin, grupo });
        await exportarReporteGeneralClientes({ datos, fechaInicio, fechaFin, grupo });
      }
    } catch (error) {
      console.error(error);
      mostrarNotificacion("Error al generar", error.message || "Ocurrió un error al generar el reporte.");
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6 pb-6 animate-fade-in relative" onClick={() => setMostrarSugerencias(false)}>
      
      {/* Notificación flotante nativa */}
      {notificacion.visible && (
        <div className={`fixed left-4 right-4 top-[calc(1rem+env(safe-area-inset-top))] sm:left-auto z-[100] p-4 rounded-xl shadow-lg border flex items-start gap-3 sm:w-80 animate-slide-in-right ${notificacion.tipo === "error" ? "bg-red-50 border-red-200 text-red-800" : "bg-green-50 border-green-200 text-green-800"}`}>
          {notificacion.tipo === "error" ? <XCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600" /> : <CheckCircle className="h-5 w-5 shrink-0 mt-0.5 text-green-600" />}
          <div>
            <h4 className="font-bold text-sm">{notificacion.titulo}</h4>
            <p className="text-xs mt-1 opacity-90">{notificacion.mensaje}</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-[#0a192f] flex items-center">
            <BarChart3 className="mr-2 text-blue-600" />
            Reportes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Exportación de información financiera en Excel.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {indicadores.map((item) => (
          <TarjetaKPI key={item.etiqueta} {...item} />
        ))}
      </div>

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-black text-[#0a192f] mb-5">Configuración del reporte</h2>

        <div className="grid lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-xs font-bold text-gray-500">Tipo de reporte</label>
            <select
              value={tipoReporte}
              onChange={(e) => {
                setTipoReporte(e.target.value);
                setClienteSeleccionado(null);
                setBusquedaCliente("");
              }}
              className="mt-1 w-full rounded-xl border p-3 focus:outline-none focus:ring-2 focus:ring-[#ffd700]/50 focus:border-[#ffd700]"
            >
              <option value="RESUMEN_CLIENTES">Expediente Financiero del Cliente</option>
              <option value="DETALLE_FACTURAS">Detalle de Facturas</option>
              <option value="REPORTE_GENERAL_CLIENTES">Reporte General de Clientes</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500">Período</label>
            <select
  value={periodo}
  onChange={(e) => cambiarPeriodo(e.target.value)}
  className="mt-1 w-full rounded-xl border p-3 focus:outline-none focus:ring-2 focus:ring-[#ffd700]/50 focus:border-[#ffd700]"
>
              <option value="TODOS">Todos</option>
              <option value="SEMANA">Semana</option>
              <option value="MES">Mes</option>
              <option value="AÑO">Año</option>
              <option value="PERSONALIZADO">Personalizado</option>
            </select>
          </div>

          {periodo === "PERSONALIZADO" && (
            <>
              <div>
                <label className="text-xs font-bold text-gray-500">Fecha inicial</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="mt-1 w-full rounded-xl border p-3 focus:outline-none focus:ring-2 focus:ring-[#ffd700]/50"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">Fecha final</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="mt-1 w-full rounded-xl border p-3 focus:outline-none focus:ring-2 focus:ring-[#ffd700]/50"
                />
              </div>
            </>
          )}

          {tipoReporte !== "RESUMEN_CLIENTES" && (
            <div>
              <label className="text-xs font-bold text-gray-500">Grupo</label>
              <select
                value={grupo}
                onChange={(e) => setGrupo(e.target.value)}
                className="mt-1 w-full rounded-xl border p-3 focus:outline-none focus:ring-2 focus:ring-[#ffd700]/50 focus:border-[#ffd700]"
              >
                <option value="TODOS">Todos</option>
                {grupos.map((grupoItem) => (
                  <option key={grupoItem} value={grupoItem}>{grupoItem}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {tipoReporte === "RESUMEN_CLIENTES" && (
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 mb-4" onClick={(e) => e.stopPropagation()}>
            <label className="text-xs font-bold text-[#0a192f] block mb-2">
              Buscar y seleccionar expediente
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={busquedaCliente}
                onChange={(e) => {
                  setBusquedaCliente(e.target.value);
                  setClienteSeleccionado(null);
                  setMostrarSugerencias(true);
                }}
                onFocus={() => setMostrarSugerencias(true)}
                placeholder="Nombre, No. Cliente, RFC o Correo..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#ffd700] focus:border-[#ffd700] text-sm font-medium outline-none transition-all"
              />
              {clienteSeleccionado && (
                <button
                  type="button"
                  onClick={() => {
                    setClienteSeleccionado(null);
                    setBusquedaCliente("");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 p-1 bg-gray-50 rounded-full"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {mostrarSugerencias && busquedaCliente && !clienteSeleccionado && sugerenciasClientes.length > 0 && (
              <div className="absolute z-10 w-full max-w-2xl mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {sugerenciasClientes.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setClienteSeleccionado(c);
                      setBusquedaCliente(`${c.numero_cliente} - ${c.nombre}`);
                      setMostrarSugerencias(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#0a192f]">{c.nombre}</p>
                      <p className="text-[11px] text-gray-500 font-mono mt-0.5">{c.rfc} • {c.correo}</p>
                    </div>
                    <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                      #{c.numero_cliente}
                    </span>
                  </button>
                ))}
              </div>
            )}
            
            {mostrarSugerencias && busquedaCliente && !clienteSeleccionado && sugerenciasClientes.length === 0 && (
              <div className="absolute z-10 w-full max-w-2xl mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-center text-sm text-gray-500">
                No se encontraron clientes coincidentes.
              </div>
            )}
          </div>
        )}

        <div className="mt-6 border-t border-gray-100 pt-6">
          <button
            type="button"
            onClick={generarExcel}
            disabled={generando || (tipoReporte === "RESUMEN_CLIENTES" && !clienteSeleccionado)}
            className={`px-8 py-3.5 rounded-xl text-white font-black flex items-center transition-all shadow-sm ${
              generando || (tipoReporte === "RESUMEN_CLIENTES" && !clienteSeleccionado)
                ? "bg-gray-300 cursor-not-allowed text-gray-500"
                : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
            }`}
          >
            <Download className="mr-2 h-5 w-5" />
            {generando ? "Procesando Documento..." : "Generar Excel"}
          </button>
        </div>
      </section>
    </div>
  );
}