import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  FilterX,
  Loader2,
  RefreshCcw,
  Search,
  WalletCards,
} from "lucide-react";

import { abonosIndexService } from "../../services/abonosIndexService";
import { textoSeguro } from "../../utils/normalizadores";
import PaginacionSU from "./PaginacionSU";
import {
  ABONOS_REPORTE_POR_PAGINA,
  formatearFechaFirestore,
  formatearMoneda,
} from "./suUtils";

const ESTADOS_ABONO = [
  { id: "TODOS", label: "Todos" },
  { id: "ACTIVO", label: "Activos" },
  { id: "CANCELADO", label: "Cancelados" },
  { id: "ELIMINADO_PRUEBA", label: "Eliminados de prueba" },
];

const METODOS_ABONO = [
  "TODOS",
  "Efectivo",
  "Transferencia",
  "Cheque",
  "Tarjeta",
  "Otro",
];

const filtrosIniciales = {
  fechaInicio: "",
  fechaFin: "",
  busqueda: "",
  estado: "ACTIVO",
  metodo: "TODOS",
  registradoPor: "",
};

const formatearFechaCsv = (valor) =>
  formatearFechaFirestore(valor).replaceAll(",", " ");

const escaparCsv = (valor = "") => {
  const texto = String(valor ?? "").replaceAll('"', '""');
  return `"${texto}"`;
};

const generarCsv = (abonos = []) => {
  const encabezados = [
    "Fecha",
    "Folio",
    "Cliente",
    "Monto",
    "Método",
    "Registrado por",
    "Estado",
    "ID abono",
    "ID factura",
  ];

  const filas = abonos.map((abono) => [
    formatearFechaCsv(abono.fecha),
    abono.folio,
    abono.cliente,
    Number(abono.monto) || 0,
    abono.metodo,
    abono.registrado_por,
    abono.estado,
    abono.id_abono,
    abono.factura_id,
  ]);

  return [encabezados, ...filas]
    .map((fila) => fila.map(escaparCsv).join(","))
    .join("\n");
};

const clasesEstado = (estado = "ACTIVO") => {
  if (estado === "CANCELADO") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  if (estado === "ELIMINADO_PRUEBA") {
    return "border-red-100 bg-red-50 text-red-700";
  }

  return "border-green-100 bg-green-50 text-green-700";
};

function EstadoAbono({ estado }) {
  const estadoSeguro = textoSeguro(estado, "ACTIVO");

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${clasesEstado(
        estadoSeguro,
      )}`}
    >
      {estadoSeguro}
    </span>
  );
}

function CampoFiltro({ etiqueta, children, className = "" }) {
  return (
    <label className={`min-w-0 ${className}`}>
      <span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-gray-400">
        {etiqueta}
      </span>
      {children}
    </label>
  );
}

function TarjetaAbonoMovil({ abono }) {
  return (
    <article className="rounded-xl border border-white bg-white/80 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-wide text-gray-400">
            Factura
          </p>
          <p className="truncate text-sm font-black text-[#0a192f]">
            {textoSeguro(abono.folio, "S/F")}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[9px] font-black uppercase tracking-wide text-gray-400">
            Monto
          </p>
          <p className="text-sm font-black text-green-700">
            ${formatearMoneda(abono.monto, 2)}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-[9px] font-black uppercase tracking-wide text-gray-400">
          Cliente
        </p>
        <p className="truncate text-xs font-black text-[#0a192f]">
          {textoSeguro(abono.cliente, "S/N")}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-wide text-gray-400">
            Fecha
          </p>
          <p className="text-[10px] font-semibold text-gray-600">
            {formatearFechaFirestore(abono.fecha)}
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-wide text-gray-400">
            Método
          </p>
          <p className="truncate text-[10px] font-semibold capitalize text-gray-600">
            {textoSeguro(abono.metodo, "No especificado")}
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-wide text-gray-400">
            Registró
          </p>
          <p className="truncate text-[10px] font-semibold text-gray-600">
            {textoSeguro(abono.registrado_por, "Sistema")}
          </p>
        </div>

        <div>
          <p className="text-[9px] font-black uppercase tracking-wide text-gray-400">
            Estado
          </p>
          <div className="mt-0.5">
            <EstadoAbono estado={abono.estado} />
          </div>
        </div>
      </div>

      <div className="mt-3 border-t border-gray-100 pt-2">
        <p className="truncate font-mono text-[9px] text-gray-400">
          Abono: {textoSeguro(abono.id_abono, "Sin id_abono")}
        </p>
        <p className="mt-0.5 truncate font-mono text-[9px] text-gray-400">
          Factura: {textoSeguro(abono.factura_id, "Sin factura_id")}
        </p>
      </div>
    </article>
  );
}

export default function ReporteAbonosSU({ actorUid, userName }) {
  const listaRef = useRef(null);
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [abonos, setAbonos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [reconstruyendo, setReconstruyendo] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cursorSiguiente, setCursorSiguiente] = useState(null);
  const [cursores, setCursores] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [haySiguiente, setHaySiguiente] = useState(false);

  const totalPagina = useMemo(
    () =>
      abonos.reduce(
        (total, abono) => total + (Number(abono.monto) || 0),
        0,
      ),
    [abonos],
  );

  const cargarAbonos = useCallback(
    async ({
      cursor = null,
      nuevaPagina = 1,
      nuevosCursores = cursores,
      filtrosConsulta = filtros,
      conservarMensaje = false,
    } = {}) => {
      setCargando(true);
      setError("");

      if (!conservarMensaje) {
        setMensaje("");
      }

      const res = await abonosIndexService.consultarAbonos({
        ...filtrosConsulta,
        cursor,
        pageSize: ABONOS_REPORTE_POR_PAGINA,
      });

      if (!res.success) {
        setAbonos([]);
        setError(res.error || "No se pudo cargar el reporte de abonos.");
        setHaySiguiente(false);
        setCursorSiguiente(null);
      } else {
        setAbonos(res.data || []);
        setHaySiguiente(Boolean(res.haySiguiente));
        setCursorSiguiente(res.cursorSiguiente || null);
        setPagina(nuevaPagina);
        setCursores(nuevosCursores);

        if ((res.data || []).length === 0) {
          setMensaje(
            "No hay abonos con estos filtros. Ajusta los criterios o avanza a la siguiente página.",
          );
        }
      }

      setCargando(false);
    },
    [cursores, filtros],
  );

  useEffect(() => {
    let componenteActivo = true;

    const cargarAbonosIniciales = async () => {
      const res = await abonosIndexService.consultarAbonos({
        ...filtrosIniciales,
        cursor: null,
        pageSize: ABONOS_REPORTE_POR_PAGINA,
      });

      if (!componenteActivo) return;

      if (!res.success) {
        setAbonos([]);
        setError(res.error || "No se pudo cargar el reporte de abonos.");
        setHaySiguiente(false);
        setCursorSiguiente(null);
      } else {
        setAbonos(res.data || []);
        setHaySiguiente(Boolean(res.haySiguiente));
        setCursorSiguiente(res.cursorSiguiente || null);
        setPagina(1);
        setCursores([]);

        if ((res.data || []).length === 0) {
          setMensaje(
            "No hay abonos para mostrar. Verifica los filtros o reconstruye el índice.",
          );
        }
      }

      setCargando(false);
    };

    cargarAbonosIniciales();

    return () => {
      componenteActivo = false;
    };
  }, []);

  const actualizarFiltro = (campo, valor) => {
    setFiltros((previo) => ({
      ...previo,
      [campo]: valor,
    }));
  };

  const aplicarFiltros = () => {
    cargarAbonos({
      cursor: null,
      nuevaPagina: 1,
      nuevosCursores: [],
      filtrosConsulta: filtros,
    });
  };

  const limpiarFiltros = () => {
    setFiltros(filtrosIniciales);
    cargarAbonos({
      cursor: null,
      nuevaPagina: 1,
      nuevosCursores: [],
      filtrosConsulta: filtrosIniciales,
    });
  };

  const irSiguiente = () => {
    if (!haySiguiente || !cursorSiguiente || cargando) return;

    cargarAbonos({
      cursor: cursorSiguiente,
      nuevaPagina: pagina + 1,
      nuevosCursores: [...cursores, cursorSiguiente],
    });
  };

  const irAnterior = () => {
    if (pagina <= 1 || cargando) return;

    const nuevosCursores = cursores.slice(0, -1);
    const cursorAnterior =
      nuevosCursores[nuevosCursores.length - 1] || null;

    cargarAbonos({
      cursor: cursorAnterior,
      nuevaPagina: pagina - 1,
      nuevosCursores,
    });
  };

  const reconstruirIndice = async () => {
    const confirmar = window.confirm(
      "Esto reconstruirá abonos_index desde todas las facturas y recalculará Monto Recuperado. No elimina pagos. ¿Continuar?",
    );

    if (!confirmar) return;

    setReconstruyendo(true);
    setError("");
    setMensaje("");

    const res = await abonosIndexService.reconstruirDesdeFacturas({
      actor_uid: actorUid,
      userName,
    });

    if (!res.success) {
      setError(res.error || "No se pudo reconstruir el índice.");
    } else {
      const data = res.data || {};

      await cargarAbonos({
        cursor: null,
        nuevaPagina: 1,
        nuevosCursores: [],
        conservarMensaje: true,
      });

      setMensaje(
        `Índice reconstruido: ${data.abonosIndexados || 0} abono(s), ${
          data.facturasRevisadas || 0
        } factura(s) revisadas. Monto recuperado: $${formatearMoneda(
          data.montoRecuperado,
          2,
        )}.`,
      );
    }

    setReconstruyendo(false);
  };

  const exportarCsv = () => {
    if (abonos.length === 0) return;

    const csv = generarCsv(abonos);
    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `reporte-abonos-pagina-${pagina}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-white bg-white/65 shadow-[8px_10px_28px_rgba(0,0,0,0.08)]">
      <div className="border-b border-white p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-xl bg-green-50 p-2 text-green-700">
              <WalletCards className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h2 className="text-sm font-black text-[#0a192f]">
                Reporte de Abonos
              </h2>
              <p className="text-[10px] leading-relaxed text-gray-500 sm:text-[11px]">
                Consulta pagos registrados, valida pruebas y exporta la página
                actual.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row">
            <button
              type="button"
              onClick={exportarCsv}
              disabled={abonos.length === 0 || cargando}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-white px-3 py-2 text-[10px] font-black text-[#0a192f] shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:text-gray-300 sm:text-xs"
            >
              <Download className="mr-1.5 h-4 w-4" />
              Exportar CSV
            </button>

            <button
              type="button"
              onClick={reconstruirIndice}
              disabled={reconstruyendo || cargando}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#0a192f] px-3 py-2 text-[10px] font-black text-white shadow-sm transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 sm:text-xs"
            >
              {reconstruyendo ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="mr-1.5 h-4 w-4" />
              )}
              Reconstruir
              <span className="hidden sm:inline">&nbsp;índice</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 border-b border-white bg-white/35 p-3 sm:grid-cols-2 xl:grid-cols-6">
        <CampoFiltro
          etiqueta="Buscar"
          className="sm:col-span-2 xl:col-span-2"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={filtros.busqueda}
              onChange={(event) =>
                actualizarFiltro("busqueda", event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") aplicarFiltros();
              }}
              placeholder="Cliente, folio, ID o usuario..."
              className="min-h-10 w-full rounded-xl border border-white bg-white/80 py-2 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-[#ffd700]/50"
            />
          </div>
        </CampoFiltro>

        <CampoFiltro etiqueta="Desde">
          <input
            type="date"
            value={filtros.fechaInicio}
            onChange={(event) =>
              actualizarFiltro("fechaInicio", event.target.value)
            }
            className="min-h-10 w-full rounded-xl border border-white bg-white/80 px-3 py-2 text-xs text-gray-600 outline-none focus:ring-2 focus:ring-[#ffd700]/50"
          />
        </CampoFiltro>

        <CampoFiltro etiqueta="Hasta">
          <input
            type="date"
            value={filtros.fechaFin}
            onChange={(event) =>
              actualizarFiltro("fechaFin", event.target.value)
            }
            className="min-h-10 w-full rounded-xl border border-white bg-white/80 px-3 py-2 text-xs text-gray-600 outline-none focus:ring-2 focus:ring-[#ffd700]/50"
          />
        </CampoFiltro>

        <CampoFiltro etiqueta="Estado">
          <select
            value={filtros.estado}
            onChange={(event) =>
              actualizarFiltro("estado", event.target.value)
            }
            className="min-h-10 w-full rounded-xl border border-white bg-white/80 px-3 py-2 text-xs text-gray-600 outline-none focus:ring-2 focus:ring-[#ffd700]/50"
          >
            {ESTADOS_ABONO.map((estado) => (
              <option key={estado.id} value={estado.id}>
                {estado.label}
              </option>
            ))}
          </select>
        </CampoFiltro>

        <CampoFiltro etiqueta="Método">
          <select
            value={filtros.metodo}
            onChange={(event) =>
              actualizarFiltro("metodo", event.target.value)
            }
            className="min-h-10 w-full rounded-xl border border-white bg-white/80 px-3 py-2 text-xs capitalize text-gray-600 outline-none focus:ring-2 focus:ring-[#ffd700]/50"
          >
            {METODOS_ABONO.map((metodo) => (
              <option key={metodo} value={metodo}>
                {metodo === "TODOS" ? "Todos los métodos" : metodo}
              </option>
            ))}
          </select>
        </CampoFiltro>
      </div>

      <div className="flex flex-col gap-2 border-b border-white bg-white/35 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[10px] font-bold text-gray-500 sm:text-[11px]">
          Página {pagina} · {abonos.length} abono(s) · Total página: $
          {formatearMoneda(totalPagina, 2)}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            type="button"
            onClick={limpiarFiltros}
            disabled={cargando}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-red-50 px-3 py-2 text-[10px] font-black text-red-600 transition active:scale-[0.98] disabled:opacity-50"
          >
            <FilterX className="mr-1.5 h-3.5 w-3.5" />
            Limpiar
          </button>

          <button
            type="button"
            onClick={aplicarFiltros}
            disabled={cargando}
            className="min-h-10 rounded-xl bg-blue-50 px-3 py-2 text-[10px] font-black text-blue-700 transition active:scale-[0.98] disabled:opacity-50"
          >
            Aplicar filtros
          </button>
        </div>
      </div>

      {error && (
        <div className="m-3 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-bold text-red-700">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="m-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs font-bold text-blue-700">
          {mensaje}
        </div>
      )}

      <div
        ref={listaRef}
        className="max-h-[58vh] min-h-[300px] scroll-mt-24 overflow-auto bg-white/25 custom-scrollbar sm:max-h-[520px]"
      >
        {cargando ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center text-gray-400">
            <Loader2 className="mb-2 h-8 w-8 animate-spin" />
            <span className="text-xs font-bold">Cargando abonos...</span>
          </div>
        ) : abonos.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center text-gray-400">
            <WalletCards className="mb-2 h-8 w-8 opacity-40" />
            <span className="text-xs font-bold">
              No hay abonos para mostrar.
            </span>
          </div>
        ) : (
          <>
            <div className="space-y-2 p-3 md:hidden">
              {abonos.map((abono) => (
                <TarjetaAbonoMovil key={abono.id} abono={abono} />
              ))}
            </div>

            <table className="hidden w-full min-w-[980px] table-fixed text-left text-xs md:table">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-white bg-white/95 text-[10px] uppercase tracking-wide text-gray-400 shadow-sm backdrop-blur">
                  <th className="w-[145px] px-3 py-3 font-black">Fecha</th>
                  <th className="w-[100px] px-3 py-3 font-black">Folio</th>
                  <th className="px-3 py-3 font-black">Cliente</th>
                  <th className="w-[130px] px-3 py-3 text-right font-black">
                    Monto
                  </th>
                  <th className="w-[120px] px-3 py-3 font-black">Método</th>
                  <th className="w-[130px] px-3 py-3 font-black">Registró</th>
                  <th className="w-[105px] px-3 py-3 font-black">Estado</th>
                  <th className="w-[190px] px-3 py-3 font-black">IDs</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/70 bg-white/30">
                {abonos.map((abono) => (
                  <tr
                    key={abono.id}
                    className="h-[56px] transition hover:bg-white/70"
                  >
                    <td className="px-3 py-2 font-mono text-[10px] text-gray-500">
                      {formatearFechaFirestore(abono.fecha)}
                    </td>
                    <td className="truncate px-3 py-2 font-black text-[#0a192f]">
                      {textoSeguro(abono.folio, "S/F")}
                    </td>
                    <td className="min-w-0 px-3 py-2">
                      <p className="truncate font-black text-[#0a192f]">
                        {textoSeguro(abono.cliente, "S/N")}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[9px] text-gray-400">
                        {textoSeguro(
                          abono.cliente_id,
                          "Sin cliente_id",
                        )}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-right font-black text-green-700">
                      ${formatearMoneda(abono.monto, 2)}
                    </td>
                    <td className="truncate px-3 py-2 capitalize text-gray-600">
                      {textoSeguro(abono.metodo, "No especificado")}
                    </td>
                    <td className="truncate px-3 py-2 text-gray-600">
                      {textoSeguro(abono.registrado_por, "Sistema")}
                    </td>
                    <td className="px-3 py-2">
                      <EstadoAbono estado={abono.estado} />
                    </td>
                    <td className="px-3 py-2 font-mono text-[9px] text-gray-400">
                      <p className="truncate">
                        {textoSeguro(
                          abono.id_abono,
                          "Sin id_abono",
                        )}
                      </p>
                      <p className="mt-1 truncate">
                        {textoSeguro(
                          abono.factura_id,
                          "Sin factura_id",
                        )}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      <div className="border-t border-white bg-white/45 p-3">
        <PaginacionSU
          modoCursor
          pagina={pagina}
          hayAnterior={pagina > 1}
          haySiguiente={haySiguiente}
          cargando={cargando}
          etiquetaTotal="abonos"
          etiquetaPagina="Abonos por página"
          registrosEnPagina={abonos.length}
          scrollTargetRef={listaRef}
          onAnterior={irAnterior}
          onSiguiente={irSiguiente}
          className="mt-0"
        />
      </div>
    </section>
  );
}
