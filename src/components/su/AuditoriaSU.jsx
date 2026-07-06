import { useMemo, useRef, useState } from "react";
import {
  Activity,
  Clock,
  FilterX,
  Search,
  User,
  Zap,
} from "lucide-react";

import PaginacionGlobal from "../ui/PaginacionGlobal";
import { textoSeguro } from "../../utils/normalizadores";
import { ACTIVIDAD_POR_PAGINA, actividadEsCritica, normalizarBusqueda } from "./suUtils";

const FILTROS_RAPIDOS_BASE_AUDITORIA = [
  { id: "Crédito", label: "Crédito" },
  { id: "Clientes", label: "Clientes" },
  { id: "Facturación", label: "Facturación" },
  { id: "Calendario", label: "Calendario" },
  { id: "Sistema", label: "Sistema" },
];

const obtenerValoresUnicos = (lista = [], campo) => {
  const valores = new Set();

  lista.forEach((item) => {
    const valor = textoSeguro(item?.[campo], "").trim();

    if (valor) {
      valores.add(valor);
    }
  });

  return [...valores].sort((a, b) => a.localeCompare(b, "es"));
};

export default function AuditoriaSU({
  actividad,
  onVerDetalleEdicionFactura,
}) {
  const [filtroRapido, setFiltroRapido] = useState("TODOS");
  const [filtros, setFiltros] = useState({
    busqueda: "",
    modulo: "Todos",
    tipo: "Todos",
    fecha: "",
  });
  const [pagina, setPagina] = useState(1);
  const listaAuditoriaRef = useRef(null);

  const modulosAuditoria = useMemo(() => {
    const modulos = ["Todos", ...obtenerValoresUnicos(actividad || [], "modulo")];

    if (filtros.modulo !== "Todos" && !modulos.includes(filtros.modulo)) {
      return [...modulos, filtros.modulo];
    }

    return modulos;
  }, [actividad, filtros.modulo]);

  const eventosAuditoria = useMemo(() => {
    const actividadBase =
      filtros.modulo === "Todos"
        ? actividad || []
        : (actividad || []).filter((act) => act.modulo === filtros.modulo);

    const eventos = ["Todos", ...obtenerValoresUnicos(actividadBase, "tipo")];

    if (filtros.tipo !== "Todos" && !eventos.includes(filtros.tipo)) {
      return [...eventos, filtros.tipo];
    }

    return eventos;
  }, [actividad, filtros.modulo, filtros.tipo]);

  const filtrosRapidosDisponibles = useMemo(() => {
    const modulosExistentes = new Set(
      (actividad || [])
        .map((item) => textoSeguro(item.modulo, "").trim())
        .filter(Boolean),
    );

    const filtrosBase = FILTROS_RAPIDOS_BASE_AUDITORIA.filter((filtro) =>
      modulosExistentes.has(filtro.id),
    );

    const tieneCriticos = (actividad || []).some(actividadEsCritica);

    return [
      { id: "TODOS", label: "Todos" },
      ...(tieneCriticos ? [{ id: "CRITICOS", label: "Críticos" }] : []),
      ...filtrosBase,
    ];
  }, [actividad]);

  const actividadFiltrada = useMemo(() => {
    const busqueda = normalizarBusqueda(filtros.busqueda);

    return (actividad || []).filter((act) => {
      const matchBusqueda =
        !busqueda ||
        normalizarBusqueda(act.cliente).includes(busqueda) ||
        normalizarBusqueda(act.detalle).includes(busqueda) ||
        normalizarBusqueda(act.folio).includes(busqueda) ||
        normalizarBusqueda(act.usuario).includes(busqueda);

      const matchModulo =
        filtros.modulo === "Todos" || act.modulo === filtros.modulo;

      const matchTipo =
        filtros.tipo === "Todos" || act.tipo === filtros.tipo;

      let matchFecha = true;

      if (filtros.fecha) {
        const [anio, mes, dia] = filtros.fecha.split("-");
        const fechaCorta = `${dia}/${mes}/${anio}`;
        matchFecha = act.fechaHora?.startsWith(fechaCorta);
      }

      const matchRapido =
        filtroRapido === "TODOS" ||
        (filtroRapido === "CRITICOS" && actividadEsCritica(act)) ||
        act.modulo === filtroRapido;

      return matchBusqueda && matchModulo && matchTipo && matchFecha && matchRapido;
    });
  }, [actividad, filtroRapido, filtros]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(actividadFiltrada.length / ACTIVIDAD_POR_PAGINA),
  );

  const actividadPaginada = actividadFiltrada.slice(
    (pagina - 1) * ACTIVIDAD_POR_PAGINA,
    pagina * ACTIVIDAD_POR_PAGINA,
  );

  const actualizarFiltro = (campo, valor) => {
    setFiltros((previo) => ({
      ...previo,
      [campo]: valor,
      ...(campo === "modulo" ? { tipo: "Todos" } : {}),
    }));
    setPagina(1);
  };

  const limpiarFiltros = () => {
    setFiltroRapido("TODOS");
    setFiltros({
      busqueda: "",
      modulo: "Todos",
      tipo: "Todos",
      fecha: "",
    });
    setPagina(1);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white bg-white/65 shadow-[8px_10px_28px_rgba(0,0,0,0.08)]">
      <div className="border-b border-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <Activity className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-sm font-black text-[#0a192f]">
                Auditoría del Sistema
              </h2>
              <p className="text-[11px] text-gray-500">
                Registro completo con filtros ejecutivos y búsqueda avanzada.
              </p>
            </div>
          </div>

          {(filtros.busqueda ||
            filtros.modulo !== "Todos" ||
            filtros.tipo !== "Todos" ||
            filtros.fecha ||
            filtroRapido !== "TODOS") && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="inline-flex items-center justify-center rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-100"
            >
              <FilterX className="mr-1.5 h-4 w-4" />
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {filtrosRapidosDisponibles.map((filtro) => (
            <button
              type="button"
              key={filtro.id}
              onClick={() => {
                setFiltroRapido(filtro.id);
                setPagina(1);
              }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black transition ${
                filtroRapido === filtro.id
                  ? "bg-[#0a192f] text-white"
                  : "bg-white/70 text-gray-600 hover:bg-white"
              }`}
            >
              {filtro.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 border-b border-white bg-white/35 p-3 md:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filtros.busqueda}
            onChange={(event) => actualizarFiltro("busqueda", event.target.value)}
            placeholder="Buscar cliente, nota o usuario..."
            className="w-full rounded-xl border border-white bg-white/75 py-2 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-[#ffd700]/50"
          />
        </div>

        <select
          value={filtros.modulo}
          onChange={(event) => actualizarFiltro("modulo", event.target.value)}
          className="w-full rounded-xl border border-white bg-white/75 px-3 py-2 text-xs text-gray-600 outline-none focus:ring-2 focus:ring-[#ffd700]/50"
        >
          {modulosAuditoria.map((modulo) => (
            <option key={modulo} value={modulo}>
              {modulo === "Todos" ? "Todos los módulos" : modulo}
            </option>
          ))}
        </select>

        <select
          value={filtros.tipo}
          onChange={(event) => actualizarFiltro("tipo", event.target.value)}
          className="w-full rounded-xl border border-white bg-white/75 px-3 py-2 text-xs text-gray-600 outline-none focus:ring-2 focus:ring-[#ffd700]/50"
        >
          {eventosAuditoria.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo === "Todos" ? "Todos los eventos" : tipo}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={filtros.fecha}
          onChange={(event) => actualizarFiltro("fecha", event.target.value)}
          className="w-full rounded-xl border border-white bg-white/75 px-3 py-2 text-xs text-gray-600 outline-none focus:ring-2 focus:ring-[#ffd700]/50"
        />
      </div>

      <div ref={listaAuditoriaRef} className="max-h-[560px] scroll-mt-24 divide-y divide-white/80 overflow-y-auto custom-scrollbar bg-white/30">
        {actividadPaginada.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Zap className="mx-auto mb-2 h-9 w-9 opacity-40" />
            <p className="text-xs font-bold">
              Ningún movimiento coincide con los filtros.
            </p>
          </div>
        ) : (
          actividadPaginada.map((act) => {
            const esCritico = actividadEsCritica(act);

            return (
              <div
                key={act.id}
                className={`grid gap-3 p-4 transition hover:bg-white/65 md:grid-cols-[minmax(0,1fr)_190px] ${
                  esCritico ? "bg-red-50/20" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded border bg-gray-50 px-2 py-0.5 text-[9px] font-black uppercase text-gray-500">
                      {textoSeguro(act.modulo, "Sistema")}
                    </span>

                    <span
                      className={`rounded border px-2 py-0.5 text-[9px] font-black uppercase ${
                        esCritico
                          ? "border-red-100 bg-red-50 text-red-700"
                          : "border-blue-100 bg-blue-50 text-blue-600"
                      }`}
                    >
                      {textoSeguro(act.tipo, "Movimiento")}
                    </span>

                    {act.cliente !== "N/A" && (
                      <span className="ml-1 max-w-[280px] truncate text-xs font-black uppercase tracking-tight text-[#0a192f]">
                        {textoSeguro(act.cliente)}
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-xs font-medium leading-relaxed text-gray-600">
                    {textoSeguro(act.detalle, "Sin detalle")}
                  </p>

                  {act.tipo === "Edición de Factura" && (
                    <button
                      type="button"
                      onClick={() => onVerDetalleEdicionFactura(act)}
                      className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-black text-amber-700 transition hover:bg-amber-100"
                    >
                      Ver cambios detallados
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-white pt-2 md:flex-col md:items-end md:justify-center md:border-t-0 md:pt-0">
                  <span className="flex items-center text-[11px] font-mono text-gray-400">
                    <Clock className="mr-1.5 h-3.5 w-3.5" />
                    {textoSeguro(act.fechaHora, "Sin fecha")}
                  </span>

                  <span className="flex items-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    <User className="mr-1.5 h-3.5 w-3.5" />
                    {textoSeguro(act.usuario, "Sistema")}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {totalPaginas > 1 && (
        <div className="border-t border-white bg-white/45 px-4 py-3">
          <PaginacionGlobal
            pagina={pagina}
            totalPaginas={totalPaginas}
            totalRegistros={actividadFiltrada.length}
            registrosPorPagina={ACTIVIDAD_POR_PAGINA}
            registrosEnPagina={actividadPaginada.length}
            etiquetaTotal="eventos"
            scrollTargetRef={listaAuditoriaRef}
            onCambiarPagina={setPagina}
            className="mt-0"
          />
        </div>
      )}
    </div>
  );
}