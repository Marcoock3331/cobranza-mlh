This file is a merged representation of a subset of the codebase, containing specifically included files and files not matching ignore patterns, combined into a single document by Repomix.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: src/**/*, public/**/*, package.json, package-lock.json, vite.config.*, firebase.json, .firebaserc, firestore.rules, firestore.indexes.json, storage.rules, functions/**/*
- Files matching these patterns are excluded: node_modules/**, dist/**, coverage/**, .git/**, .env, .env.*, **/*serviceAccount*.json, **/*service-account*.json, **/*.pem, **/*.key, repomix-*.md
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
firebase.json
firestore.indexes.json
firestore.rules
package.json
public/icono.png
src/App.css
src/App.jsx
src/assets/fondo-login.jpg
src/assets/hero.png
src/assets/MHA LOGO.png
src/assets/MLH LOGO1.png
src/assets/react.svg
src/assets/vite.svg
src/components/ProtectedRoute.jsx
src/components/su/AuditoriaSU.jsx
src/components/su/ControlPersonalSU.jsx
src/components/su/CreditoRiesgoSU.jsx
src/components/su/ModalesSU.jsx
src/components/su/PaginacionSU.jsx
src/components/su/ReporteAbonosSU.jsx
src/components/su/ResumenEjecutivoSU.jsx
src/components/su/suUtils.js
src/components/ui/PaginacionGlobal.jsx
src/config/firebase.js
src/context/AuthContext.js
src/context/AuthProvider.jsx
src/context/GlobalContext.js
src/context/GlobalProvider.jsx
src/hooks/useAgendaRango.js
src/hooks/useClientes.js
src/hooks/useFacturas.js
src/hooks/useFacturasCliente.js
src/hooks/useFacturasPaginadas.js
src/index.css
src/layouts/MainLayout.jsx
src/main.jsx
src/pages/Calendario.jsx
src/pages/Clientes.jsx
src/pages/Dashboard.jsx
src/pages/ExpedienteCliente.jsx
src/pages/Facturacion.jsx
src/pages/GestionUsuarios.jsx
src/pages/Login.jsx
src/services/abonosIndexService.js
src/services/auditoriaService.js
src/services/calendarioConsultaService.js
src/services/clientesService.js
src/services/compromisosService.js
src/services/facturasClienteService.js
src/services/facturasConsultaService.js
src/services/facturasService.js
src/services/lineaCreditoService.js
src/services/mock/bitacora.data.js
src/services/mock/clientes.data.js
src/services/mock/facturas.data.js
src/services/mock/solicitudes.data.js
src/services/solicitudesService.js
src/services/usuariosService.js
src/utils/agenda.js
src/utils/fechas.js
src/utils/normalizadores.js
src/utils/normalizarFactura.js
src/utils/whatsapp.js
vite.config.js
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="src/components/su/ReporteAbonosSU.jsx">
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
</file>

<file path="src/services/abonosIndexService.js">
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "../config/firebase";

const FACTURAS_COLLECTION = "facturas";
const ABONOS_INDEX_COLLECTION = "abonos_index";
const STATS_COLLECTION = "metricas_globales";
const STATS_DOC = "stats_actuales";
const TAMANO_BATCH = 400;
const ABONOS_POR_PAGINA = 10;

const redondearMoneda = (valor) =>
  Math.round((Number(valor) || 0) * 100) / 100;

const fechaInicioTimestamp = (fecha) => {
  if (!fecha) return null;
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return Timestamp.fromDate(new Date(anio, mes - 1, dia, 0, 0, 0, 0));
};

const fechaFinTimestamp = (fecha) => {
  if (!fecha) return null;
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return Timestamp.fromDate(new Date(anio, mes - 1, dia, 23, 59, 59, 999));
};

const obtenerDateSeguro = (valor) => {
  if (!valor) return null;
  if (valor?.toDate && typeof valor.toDate === "function") return valor.toDate();
  if (valor instanceof Date) return valor;
  if (typeof valor?.seconds === "number") return new Date(valor.seconds * 1000);

  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

const obtenerTimestampSeguro = (...valores) => {
  for (const valor of valores) {
    if (valor?.toDate && typeof valor.toDate === "function") return valor;
    const fecha = obtenerDateSeguro(valor);
    if (fecha) return Timestamp.fromDate(fecha);
  }

  return Timestamp.now();
};


const esMismoMes = (fechaValor, hoy = new Date()) => {
  const fecha = obtenerDateSeguro(fechaValor);
  return Boolean(
    fecha &&
      fecha.getMonth() === hoy.getMonth() &&
      fecha.getFullYear() === hoy.getFullYear(),
  );
};

const obtenerSemana = (fecha) => {
  const copia = new Date(fecha.getTime());
  copia.setHours(0, 0, 0, 0);
  copia.setDate(copia.getDate() + 4 - (copia.getDay() || 7));
  const inicioAnio = new Date(copia.getFullYear(), 0, 1);
  return Math.ceil(((copia - inicioAnio) / 86400000 + 1) / 7);
};

const esMismaSemana = (fechaValor, hoy = new Date()) => {
  const fecha = obtenerDateSeguro(fechaValor);
  return Boolean(
    fecha &&
      fecha.getFullYear() === hoy.getFullYear() &&
      obtenerSemana(fecha) === obtenerSemana(hoy),
  );
};

const esFacturaVencida = (factura = {}) => {
  const saldo = redondearMoneda(factura.saldo_pendiente);
  if (saldo <= 0) return false;

  const vencimiento = obtenerDateSeguro(factura.vencimiento);
  if (!vencimiento) return factura.estatus === "Vencida";

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  vencimiento.setHours(0, 0, 0, 0);
  return vencimiento < hoy;
};

export const construirAbonoIndexId = (facturaId, idAbono) => {
  const facturaSegura = String(facturaId || "sin_factura").replaceAll("/", "_");
  const abonoSeguro = String(idAbono || "sin_abono").replaceAll("/", "_");
  return `${facturaSegura}_${abonoSeguro}`;
};

export const construirAbonoIndexPayload = ({
  factura = {},
  abono = {},
  actorUid = "",
  userName = "Sistema",
  estado = "ACTIVO",
  activo = true,
  origen = "facturas.abonos",
} = {}) => {
  const facturaId = factura.id || factura.factura_id || "";
  const idAbono = abono.id_abono || `abn-sin-id-${facturaId}`;
  const fecha = obtenerTimestampSeguro(
    abono.fecha,
    abono.createdAt,
    factura.updatedAt,
    factura.createdAt,
    factura.emision,
  );
  const monto = redondearMoneda(abono.monto);
  const registradoPor = String(
    abono.registrado_por || userName || "Usuario",
  );
  const esRegistroMigrado =
    /(migraci[oó]n|importaci[oó]n).*sql/i.test(registradoPor) ||
    String(abono.origen || "").toLowerCase() === "migracion_sql";
  const origenNormalizado = esRegistroMigrado ? "migracion_sql" : origen;
  const registradoPorUid = esRegistroMigrado
    ? ""
    : String(abono.registrado_por_uid || actorUid || "");

  return {
    id: construirAbonoIndexId(facturaId, idAbono),
    id_abono: idAbono,
    factura_id: facturaId,
    folio: String(factura.folio || "S/F"),
    cliente_id: String(factura.cliente_id || ""),
    cliente: String(factura.cliente || "S/N"),
    fecha,
    monto,
    metodo: String(abono.metodo || "No especificado"),
    registrado_por: registradoPor,
    registrado_por_uid: registradoPorUid,
    estado,
    activo,
    origen: origenNormalizado,
    saldo_anterior: redondearMoneda(abono.saldo_anterior),
    saldo_restante: redondearMoneda(abono.saldo_restante),
    indexado_por_uid: String(actorUid || ""),
    updatedAt: serverTimestamp(),
  };
};

const normalizarAbonoIndexSnapshot = (documento) => ({
  id: documento.id,
  ...documento.data(),
});

const coincideBusqueda = (abono = {}, busqueda = "") => {
  const texto = String(busqueda || "").trim().toLowerCase();
  if (!texto) return true;

  return [
    abono.cliente,
    abono.folio,
    abono.factura_id,
    abono.id_abono,
    abono.metodo,
    abono.registrado_por,
  ]
    .join(" ")
    .toLowerCase()
    .includes(texto);
};

const coincideFiltrosLocales = (abono = {}, filtros = {}) => {
  const estado = String(filtros.estado || "TODOS").toUpperCase();
  const metodo = String(filtros.metodo || "TODOS").toLowerCase();
  const registradoPor = String(filtros.registradoPor || "").trim().toLowerCase();

  if (estado !== "TODOS" && String(abono.estado || "ACTIVO").toUpperCase() !== estado) {
    return false;
  }

  if (metodo !== "todos" && String(abono.metodo || "").toLowerCase() !== metodo) {
    return false;
  }

  if (
    registradoPor &&
    !String(abono.registrado_por || "").toLowerCase().includes(registradoPor)
  ) {
    return false;
  }

  return coincideBusqueda(abono, filtros.busqueda);
};

const crearConsultaAbonos = ({ fechaInicio, fechaFin, cursor, limiteConsulta }) => {
  const restricciones = [];
  const inicio = fechaInicioTimestamp(fechaInicio);
  const fin = fechaFinTimestamp(fechaFin);

  if (inicio) restricciones.push(where("fecha", ">=", inicio));
  if (fin) restricciones.push(where("fecha", "<=", fin));

  restricciones.push(orderBy("fecha", "desc"));

  if (cursor) restricciones.push(startAfter(cursor));
  restricciones.push(limit(limiteConsulta));

  return query(collection(db, ABONOS_INDEX_COLLECTION), ...restricciones);
};

const asegurarBatchDisponible = async (estadoBatch) => {
  if (estadoBatch.operaciones < TAMANO_BATCH) return estadoBatch;
  await estadoBatch.batch.commit();
  return {
    batch: writeBatch(db),
    operaciones: 0,
    commits: estadoBatch.commits + 1,
  };
};

export const abonosIndexService = {
  consultarAbonos: async ({
    fechaInicio = "",
    fechaFin = "",
    estado = "TODOS",
    busqueda = "",
    metodo = "TODOS",
    registradoPor = "",
    cursor = null,
    pageSize = ABONOS_POR_PAGINA,
  } = {}) => {
    try {
      const limiteConsulta = Math.min(Math.max(pageSize * 4, pageSize + 1), 250);
      const consulta = crearConsultaAbonos({
        fechaInicio,
        fechaFin,
        cursor,
        limiteConsulta,
      });
      const snapshot = await getDocs(consulta);
      const abonosFiltrados = [];
      let ultimoDocumento = null;
      let documentosProcesados = 0;

      for (const documento of snapshot.docs) {
        documentosProcesados += 1;
        ultimoDocumento = documento;
        const abono = normalizarAbonoIndexSnapshot(documento);

        if (
          coincideFiltrosLocales(abono, {
            estado,
            busqueda,
            metodo,
            registradoPor,
          })
        ) {
          abonosFiltrados.push(abono);
        }

        if (abonosFiltrados.length >= pageSize) break;
      }

      const quedanDocumentosEnLote =
        documentosProcesados < snapshot.docs.length;
      const loteCompleto = snapshot.docs.length === limiteConsulta;

      return {
        success: true,
        data: abonosFiltrados,
        cursorSiguiente: ultimoDocumento,
        haySiguiente: Boolean(
          ultimoDocumento && (quedanDocumentosEnLote || loteCompleto),
        ),
      };
    } catch (error) {
      console.error("Error consultando abonos_index:", error);
      return {
        success: false,
        error: error?.message || "No se pudo consultar el reporte de abonos.",
        data: [],
        cursorSiguiente: null,
        haySiguiente: false,
      };
    }
  },

  reconstruirDesdeFacturas: async ({ actor_uid, userName = "SU" } = {}) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    try {
      const facturasSnap = await getDocs(collection(db, FACTURAS_COLLECTION));
      let estadoBatch = {
        batch: writeBatch(db),
        operaciones: 0,
        commits: 0,
      };

      const hoy = new Date();
      const metricas = {
        cartera_total: 0,
        cartera_vencida: 0,
        ingresos_mes: 0,
        ingresos_semana: 0,
        facturas_vencidas: 0,
        facturas_pendientes: 0,
        facturas_pagadas: 0,
        facturas_total: 0,
        total_facturado: 0,
        total_liquidado: 0,
        cobrado_historico: 0,
        abonos_registrados: 0,
        total_notas_credito: 0,
        monto_recuperado: 0,
      };

      let abonosIndexados = 0;
      let facturasConAbonos = 0;

      for (const documento of facturasSnap.docs) {
        const factura = {
          id: documento.id,
          ...documento.data(),
        };

        const montoTotal = redondearMoneda(factura.monto_total);
        const saldoPendiente = redondearMoneda(factura.saldo_pendiente);
        const totalNotasCredito = redondearMoneda(factura.total_notas_credito);
        const abonos = Array.isArray(factura.abonos) ? factura.abonos : [];
        const pagada = saldoPendiente === 0;
        const vencida = esFacturaVencida(factura);

        metricas.facturas_total += 1;
        metricas.total_facturado += montoTotal;
        metricas.cartera_total += saldoPendiente;
        metricas.total_notas_credito += totalNotasCredito;

        if (pagada) {
          metricas.facturas_pagadas += 1;
          metricas.total_liquidado += montoTotal;
        } else {
          metricas.facturas_pendientes += 1;
        }

        if (vencida) {
          metricas.facturas_vencidas += 1;
          metricas.cartera_vencida += saldoPendiente;
        }

        if (abonos.length > 0) facturasConAbonos += 1;

        for (const abono of abonos) {
          const idAbono = abono.id_abono || `abn-${documento.id}-${abonosIndexados}`;
          const monto = redondearMoneda(abono.monto);
          const payload = construirAbonoIndexPayload({
            factura,
            abono: {
              ...abono,
              id_abono: idAbono,
            },
            actorUid: actor_uid,
            userName,
            estado: "ACTIVO",
            activo: true,
          });

          const ref = doc(
            db,
            ABONOS_INDEX_COLLECTION,
            construirAbonoIndexId(documento.id, idAbono),
          );

          estadoBatch.batch.set(ref, payload, { merge: true });
          estadoBatch.operaciones += 1;
          abonosIndexados += 1;

          metricas.monto_recuperado += monto;
          metricas.cobrado_historico += monto;
          metricas.abonos_registrados += monto;

          if (esMismoMes(payload.fecha, hoy)) metricas.ingresos_mes += monto;
          if (esMismaSemana(payload.fecha, hoy)) metricas.ingresos_semana += monto;

          estadoBatch = await asegurarBatchDisponible(estadoBatch);
        }
      }

      const statsRef = doc(db, STATS_COLLECTION, STATS_DOC);
      const statsPayload = Object.fromEntries(
        Object.entries(metricas).map(([campo, valor]) => [campo, redondearMoneda(valor)]),
      );

      estadoBatch.batch.set(
        statsRef,
        {
          ...statsPayload,
          ultima_actualizacion: serverTimestamp(),
        },
        { merge: true },
      );
      estadoBatch.operaciones += 1;

      if (estadoBatch.operaciones > 0) {
        await estadoBatch.batch.commit();
        estadoBatch.commits += 1;
      }

      return {
        success: true,
        data: {
          facturasRevisadas: facturasSnap.size,
          facturasConAbonos,
          abonosIndexados,
          montoRecuperado: redondearMoneda(metricas.monto_recuperado),
          commits: estadoBatch.commits,
        },
      };
    } catch (error) {
      console.error("Error reconstruyendo abonos_index:", error);
      return {
        success: false,
        error: error?.message || "No se pudo reconstruir el índice de abonos.",
      };
    }
  },
};
</file>

<file path="package.json">
{
  "name": "mlh-cobranza",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "firebase": "^12.13.0",
    "lucide-react": "^1.14.0",
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "react-router-dom": "^7.15.0",
    "react-select": "^5.10.2"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@tailwindcss/vite": "^4.3.0",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "autoprefixer": "^10.5.0",
    "eslint": "^10.3.0",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "globals": "^17.6.0",
    "postcss": "^8.5.14",
    "tailwindcss": "^4.3.0",
    "terser": "^5.48.0",
    "vite": "^8.0.12"
  }
}
</file>

<file path="src/App.css">
.counter {
  font-size: 16px;
  padding: 5px 10px;
  border-radius: 5px;
  color: var(--accent);
  background: var(--accent-bg);
  border: 2px solid transparent;
  transition: border-color 0.3s;
  margin-bottom: 24px;

  &:hover {
    border-color: var(--accent-border);
  }
  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
}

.hero {
  position: relative;

  .base,
  .framework,
  .vite {
    inset-inline: 0;
    margin: 0 auto;
  }

  .base {
    width: 170px;
    position: relative;
    z-index: 0;
  }

  .framework,
  .vite {
    position: absolute;
  }

  .framework {
    z-index: 1;
    top: 34px;
    height: 28px;
    transform: perspective(2000px) rotateZ(300deg) rotateX(44deg) rotateY(39deg)
      scale(1.4);
  }

  .vite {
    z-index: 0;
    top: 107px;
    height: 26px;
    width: auto;
    transform: perspective(2000px) rotateZ(300deg) rotateX(40deg) rotateY(39deg)
      scale(0.8);
  }
}

#center {
  display: flex;
  flex-direction: column;
  gap: 25px;
  place-content: center;
  place-items: center;
  flex-grow: 1;

  @media (max-width: 1024px) {
    padding: 32px 20px 24px;
    gap: 18px;
  }
}

#next-steps {
  display: flex;
  border-top: 1px solid var(--border);
  text-align: left;

  & > div {
    flex: 1 1 0;
    padding: 32px;
    @media (max-width: 1024px) {
      padding: 24px 20px;
    }
  }

  .icon {
    margin-bottom: 16px;
    width: 22px;
    height: 22px;
  }

  @media (max-width: 1024px) {
    flex-direction: column;
    text-align: center;
  }
}

#docs {
  border-right: 1px solid var(--border);

  @media (max-width: 1024px) {
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
}

#next-steps ul {
  list-style: none;
  padding: 0;
  display: flex;
  gap: 8px;
  margin: 32px 0 0;

  .logo {
    height: 18px;
  }

  a {
    color: var(--text-h);
    font-size: 16px;
    border-radius: 6px;
    background: var(--social-bg);
    display: flex;
    padding: 6px 12px;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    transition: box-shadow 0.3s;

    &:hover {
      box-shadow: var(--shadow);
    }
    .button-icon {
      height: 18px;
      width: 18px;
    }
  }

  @media (max-width: 1024px) {
    margin-top: 20px;
    flex-wrap: wrap;
    justify-content: center;

    li {
      flex: 1 1 calc(50% - 8px);
    }

    a {
      width: 100%;
      justify-content: center;
      box-sizing: border-box;
    }
  }
}

#spacer {
  height: 88px;
  border-top: 1px solid var(--border);
  @media (max-width: 1024px) {
    height: 48px;
  }
}

.ticks {
  position: relative;
  width: 100%;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: -4.5px;
    border: 5px solid transparent;
  }

  &::before {
    left: 0;
    border-left-color: var(--border);
  }
  &::after {
    right: 0;
    border-right-color: var(--border);
  }
}
</file>

<file path="src/assets/react.svg">
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="35.93" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 228"><path fill="#00D8FF" d="M210.483 73.824a171.49 171.49 0 0 0-8.24-2.597c.465-1.9.893-3.777 1.273-5.621c6.238-30.281 2.16-54.676-11.769-62.708c-13.355-7.7-35.196.329-57.254 19.526a171.23 171.23 0 0 0-6.375 5.848a155.866 155.866 0 0 0-4.241-3.917C100.759 3.829 77.587-4.822 63.673 3.233C50.33 10.957 46.379 33.89 51.995 62.588a170.974 170.974 0 0 0 1.892 8.48c-3.28.932-6.445 1.924-9.474 2.98C17.309 83.498 0 98.307 0 113.668c0 15.865 18.582 31.778 46.812 41.427a145.52 145.52 0 0 0 6.921 2.165a167.467 167.467 0 0 0-2.01 9.138c-5.354 28.2-1.173 50.591 12.134 58.266c13.744 7.926 36.812-.22 59.273-19.855a145.567 145.567 0 0 0 5.342-4.923a168.064 168.064 0 0 0 6.92 6.314c21.758 18.722 43.246 26.282 56.54 18.586c13.731-7.949 18.194-32.003 12.4-61.268a145.016 145.016 0 0 0-1.535-6.842c1.62-.48 3.21-.974 4.76-1.488c29.348-9.723 48.443-25.443 48.443-41.52c0-15.417-17.868-30.326-45.517-39.844Zm-6.365 70.984c-1.4.463-2.836.91-4.3 1.345c-3.24-10.257-7.612-21.163-12.963-32.432c5.106-11 9.31-21.767 12.459-31.957c2.619.758 5.16 1.557 7.61 2.4c23.69 8.156 38.14 20.213 38.14 29.504c0 9.896-15.606 22.743-40.946 31.14Zm-10.514 20.834c2.562 12.94 2.927 24.64 1.23 33.787c-1.524 8.219-4.59 13.698-8.382 15.893c-8.067 4.67-25.32-1.4-43.927-17.412a156.726 156.726 0 0 1-6.437-5.87c7.214-7.889 14.423-17.06 21.459-27.246c12.376-1.098 24.068-2.894 34.671-5.345a134.17 134.17 0 0 1 1.386 6.193ZM87.276 214.515c-7.882 2.783-14.16 2.863-17.955.675c-8.075-4.657-11.432-22.636-6.853-46.752a156.923 156.923 0 0 1 1.869-8.499c10.486 2.32 22.093 3.988 34.498 4.994c7.084 9.967 14.501 19.128 21.976 27.15a134.668 134.668 0 0 1-4.877 4.492c-9.933 8.682-19.886 14.842-28.658 17.94ZM50.35 144.747c-12.483-4.267-22.792-9.812-29.858-15.863c-6.35-5.437-9.555-10.836-9.555-15.216c0-9.322 13.897-21.212 37.076-29.293c2.813-.98 5.757-1.905 8.812-2.773c3.204 10.42 7.406 21.315 12.477 32.332c-5.137 11.18-9.399 22.249-12.634 32.792a134.718 134.718 0 0 1-6.318-1.979Zm12.378-84.26c-4.811-24.587-1.616-43.134 6.425-47.789c8.564-4.958 27.502 2.111 47.463 19.835a144.318 144.318 0 0 1 3.841 3.545c-7.438 7.987-14.787 17.08-21.808 26.988c-12.04 1.116-23.565 2.908-34.161 5.309a160.342 160.342 0 0 1-1.76-7.887Zm110.427 27.268a347.8 347.8 0 0 0-7.785-12.803c8.168 1.033 15.994 2.404 23.343 4.08c-2.206 7.072-4.956 14.465-8.193 22.045a381.151 381.151 0 0 0-7.365-13.322Zm-45.032-43.861c5.044 5.465 10.096 11.566 15.065 18.186a322.04 322.04 0 0 0-30.257-.006c4.974-6.559 10.069-12.652 15.192-18.18ZM82.802 87.83a323.167 323.167 0 0 0-7.227 13.238c-3.184-7.553-5.909-14.98-8.134-22.152c7.304-1.634 15.093-2.97 23.209-3.984a321.524 321.524 0 0 0-7.848 12.897Zm8.081 65.352c-8.385-.936-16.291-2.203-23.593-3.793c2.26-7.3 5.045-14.885 8.298-22.6a321.187 321.187 0 0 0 7.257 13.246c2.594 4.48 5.28 8.868 8.038 13.147Zm37.542 31.03c-5.184-5.592-10.354-11.779-15.403-18.433c4.902.192 9.899.29 14.978.29c5.218 0 10.376-.117 15.453-.343c-4.985 6.774-10.018 12.97-15.028 18.486Zm52.198-57.817c3.422 7.8 6.306 15.345 8.596 22.52c-7.422 1.694-15.436 3.058-23.88 4.071a382.417 382.417 0 0 0 7.859-13.026a347.403 347.403 0 0 0 7.425-13.565Zm-16.898 8.101a358.557 358.557 0 0 1-12.281 19.815a329.4 329.4 0 0 1-23.444.823c-7.967 0-15.716-.248-23.178-.732a310.202 310.202 0 0 1-12.513-19.846h.001a307.41 307.41 0 0 1-10.923-20.627a310.278 310.278 0 0 1 10.89-20.637l-.001.001a307.318 307.318 0 0 1 12.413-19.761c7.613-.576 15.42-.876 23.31-.876H128c7.926 0 15.743.303 23.354.883a329.357 329.357 0 0 1 12.335 19.695a358.489 358.489 0 0 1 11.036 20.54a329.472 329.472 0 0 1-11 20.722Zm22.56-122.124c8.572 4.944 11.906 24.881 6.52 51.026c-.344 1.668-.73 3.367-1.15 5.09c-10.622-2.452-22.155-4.275-34.23-5.408c-7.034-10.017-14.323-19.124-21.64-27.008a160.789 160.789 0 0 1 5.888-5.4c18.9-16.447 36.564-22.941 44.612-18.3ZM128 90.808c12.625 0 22.86 10.235 22.86 22.86s-10.235 22.86-22.86 22.86s-22.86-10.235-22.86-22.86s10.235-22.86 22.86-22.86Z"></path></svg>
</file>

<file path="src/assets/vite.svg">
<svg xmlns="http://www.w3.org/2000/svg" width="77" height="47" fill="none" aria-labelledby="vite-logo-title" viewBox="0 0 77 47"><title id="vite-logo-title">Vite</title><style>.parenthesis{fill:#000}@media (prefers-color-scheme:dark){.parenthesis{fill:#fff}}</style><path fill="#9135ff" d="M40.151 45.71c-.663.844-2.02.374-2.02-.699V34.708a2.26 2.26 0 0 0-2.262-2.262H24.493c-.92 0-1.457-1.04-.92-1.788l7.479-10.471c1.07-1.498 0-3.578-1.842-3.578H15.443c-.92 0-1.456-1.04-.92-1.788l9.696-13.576c.213-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.472c-1.07 1.497 0 3.578 1.842 3.578h11.376c.944 0 1.474 1.087.89 1.83L40.153 45.712z"/><mask id="a" width="48" height="47" x="14" y="0" maskUnits="userSpaceOnUse" style="mask-type:alpha"><path fill="#000" d="M40.047 45.71c-.663.843-2.02.374-2.02-.699V34.708a2.26 2.26 0 0 0-2.262-2.262H24.389c-.92 0-1.457-1.04-.92-1.788l7.479-10.472c1.07-1.497 0-3.578-1.842-3.578H15.34c-.92 0-1.456-1.04-.92-1.788l9.696-13.575c.213-.297.556-.474.92-.474H53.93c.92 0 1.456 1.04.92 1.788L47.37 13.03c-1.07 1.498 0 3.578 1.842 3.578h11.376c.944 0 1.474 1.088.89 1.831L40.049 45.712z"/></mask><g mask="url(#a)"><g filter="url(#b)"><ellipse cx="5.508" cy="14.704" fill="#eee6ff" rx="5.508" ry="14.704" transform="rotate(269.814 20.96 11.29)scale(-1 1)"/></g><g filter="url(#c)"><ellipse cx="10.399" cy="29.851" fill="#eee6ff" rx="10.399" ry="29.851" transform="rotate(89.814 -16.902 -8.275)scale(1 -1)"/></g><g filter="url(#d)"><ellipse cx="5.508" cy="30.487" fill="#8900ff" rx="5.508" ry="30.487" transform="rotate(89.814 -19.197 -7.127)scale(1 -1)"/></g><g filter="url(#e)"><ellipse cx="5.508" cy="30.599" fill="#8900ff" rx="5.508" ry="30.599" transform="rotate(89.814 -25.928 4.177)scale(1 -1)"/></g><g filter="url(#f)"><ellipse cx="5.508" cy="30.599" fill="#8900ff" rx="5.508" ry="30.599" transform="rotate(89.814 -25.738 5.52)scale(1 -1)"/></g><g filter="url(#g)"><ellipse cx="14.072" cy="22.078" fill="#eee6ff" rx="14.072" ry="22.078" transform="rotate(93.35 31.245 55.578)scale(-1 1)"/></g><g filter="url(#h)"><ellipse cx="3.47" cy="21.501" fill="#8900ff" rx="3.47" ry="21.501" transform="rotate(89.009 35.419 55.202)scale(-1 1)"/></g><g filter="url(#i)"><ellipse cx="3.47" cy="21.501" fill="#8900ff" rx="3.47" ry="21.501" transform="rotate(89.009 35.419 55.202)scale(-1 1)"/></g><g filter="url(#j)"><ellipse cx="14.592" cy="9.743" fill="#8900ff" rx="4.407" ry="29.108" transform="rotate(39.51 14.592 9.743)"/></g><g filter="url(#k)"><ellipse cx="61.728" cy="-5.321" fill="#8900ff" rx="4.407" ry="29.108" transform="rotate(37.892 61.728 -5.32)"/></g><g filter="url(#l)"><ellipse cx="55.618" cy="7.104" fill="#00c2ff" rx="5.971" ry="9.665" transform="rotate(37.892 55.618 7.104)"/></g><g filter="url(#m)"><ellipse cx="12.326" cy="39.103" fill="#8900ff" rx="4.407" ry="29.108" transform="rotate(37.892 12.326 39.103)"/></g><g filter="url(#n)"><ellipse cx="12.326" cy="39.103" fill="#8900ff" rx="4.407" ry="29.108" transform="rotate(37.892 12.326 39.103)"/></g><g filter="url(#o)"><ellipse cx="49.857" cy="30.678" fill="#8900ff" rx="4.407" ry="29.108" transform="rotate(37.892 49.857 30.678)"/></g><g filter="url(#p)"><ellipse cx="52.623" cy="33.171" fill="#00c2ff" rx="5.971" ry="15.297" transform="rotate(37.892 52.623 33.17)"/></g></g><path d="M6.919 0c-9.198 13.166-9.252 33.575 0 46.789h6.215c-9.25-13.214-9.196-33.623 0-46.789zm62.424 0h-6.215c9.198 13.166 9.252 33.575 0 46.789h6.215c9.25-13.214 9.196-33.623 0-46.789" class="parenthesis"/><defs><filter id="b" width="60.045" height="41.654" x="-5.564" y="16.92" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="7.659"/></filter><filter id="c" width="90.34" height="51.437" x="-40.407" y="-6.762" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="7.659"/></filter><filter id="d" width="79.355" height="29.4" x="-35.435" y="2.801" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="e" width="79.579" height="29.4" x="-30.84" y="20.8" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="f" width="79.579" height="29.4" x="-29.307" y="21.949" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="g" width="74.749" height="58.852" x="29.961" y="-17.13" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="7.659"/></filter><filter id="h" width="61.377" height="25.362" x="37.754" y="3.055" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="i" width="61.377" height="25.362" x="37.754" y="3.055" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="j" width="56.045" height="63.649" x="-13.43" y="-22.082" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="k" width="54.814" height="64.646" x="34.321" y="-37.644" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="l" width="33.541" height="35.313" x="38.847" y="-10.552" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="m" width="54.814" height="64.646" x="-15.081" y="6.78" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="n" width="54.814" height="64.646" x="-15.081" y="6.78" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="o" width="54.814" height="64.646" x="22.45" y="-1.645" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="p" width="39.409" height="43.623" x="32.919" y="11.36" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter></defs></svg>
</file>

<file path="src/components/su/AuditoriaSU.jsx">
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
</file>

<file path="src/components/su/ControlPersonalSU.jsx">
import { AlertTriangle, KeyRound, Mail, Power, UserPlus, Users } from "lucide-react";
import PaginacionSU from "./PaginacionSU";
import { textoSeguro } from "../../utils/normalizadores";

function EstadoUsuario({ activo }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${
        activo
          ? "border-green-100 bg-green-50 text-green-700"
          : "border-red-100 bg-red-50 text-red-700"
      }`}
    >
      <span
        className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
          activo ? "bg-green-500" : "bg-red-500"
        }`}
      />
      {activo ? "Activo" : "Suspendido"}
    </span>
  );
}

const puedeRecuperarPassword = (usuario) =>
  Boolean(usuario?.correo) &&
  !String(usuario.correo).toLowerCase().endsWith("@mlh.local");

export default function ControlPersonalSU({
  administradores,
  onCrearUsuario,
  onCambiarEstado,
  onEnviarResetPassword,
  haySuspendidos = false,
  pagina = 1,
  hayAnterior = false,
  haySiguiente = false,
  cargando = false,
  error = "",
  registrosEnPagina = 0,
  onAnterior,
  onSiguiente,
}) {
  return (
    <div className="space-y-4 md:space-y-5">
      {haySuspendidos && (
        <section className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/80 p-4 text-amber-800 shadow-sm">
          <div className="rounded-xl bg-white/80 p-2 text-amber-600 shadow-sm">
            <AlertTriangle className="h-4 w-4" />
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-wide">
              Accesos suspendidos detectados
            </p>
            <p className="mt-1 text-[11px] font-semibold leading-relaxed text-amber-700/80">
              Existen operadores ADMIN inactivos conservados como historial. La tabla está paginada para evitar cargas innecesarias de Firestore.
            </p>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-white bg-white/55 shadow-[8px_10px_28px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-3 border-b border-white/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <Users className="h-5 w-5" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-black text-[#0a192f]">
                  Control de Personal
                </h2>

                {haySuspendidos && (
                  <span className="rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase text-amber-700">
                    Inactivos
                  </span>
                )}
              </div>

              <p className="text-[11px] text-gray-500">
                Administración paginada de accesos ADMIN con alias y correo.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCrearUsuario}
            className="inline-flex w-full items-center justify-center rounded-xl bg-[#0a192f] px-4 py-3 text-xs font-black text-white shadow-sm transition active:scale-[0.98] active:bg-[#112240] sm:w-auto sm:py-2.5"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Crear acceso ADMIN
          </button>
        </div>

        {error && (
          <div className="m-4 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-bold text-red-700">
            {error}
          </div>
        )}

        {cargando && administradores.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="mx-auto h-9 w-9 animate-pulse text-gray-300" />
            <p className="mt-2 text-xs font-bold text-gray-500">
              Cargando operadores ADMIN...
            </p>
          </div>
        ) : administradores.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="mx-auto h-9 w-9 text-gray-300" />
            <p className="mt-2 text-xs font-bold text-gray-500">
              No hay operadores ADMIN registrados.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2 p-3 md:hidden">
              {administradores.map((usuario) => {
                const resetDisponible = puedeRecuperarPassword(usuario);

                return (
                  <article
                    key={usuario.id}
                    className="rounded-2xl border border-white bg-white/70 p-3 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0a192f] text-sm font-black text-white">
                        {textoSeguro(usuario.nombre, "U").charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="max-w-full truncate text-sm font-black text-[#0a192f]">
                            {textoSeguro(usuario.nombre, "Sin nombre")}
                          </p>

                          <EstadoUsuario activo={usuario.activo} />
                        </div>

                        <p className="mt-1 font-mono text-[10px] text-gray-500">
                          Usuario: {textoSeguro(usuario.usuario_alias || usuario.usuarioLimpio, "S/N")}
                        </p>

                        <p className="mt-0.5 truncate font-mono text-[10px] text-gray-400">
                          {textoSeguro(usuario.correo, "Sin correo")}
                        </p>

                        <p className="mt-2 text-[10px] font-black uppercase tracking-wide text-gray-400">
                          Última entrada
                        </p>
                        <p className="font-mono text-[10px] text-gray-500">
                          {textoSeguro(usuario.ultima_entrada, "Nunca")}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        onClick={() => onCambiarEstado(usuario)}
                        className={`inline-flex min-h-10 items-center justify-center rounded-xl px-3 py-2 text-[10px] font-black transition active:scale-[0.98] ${
                          usuario.activo
                            ? "bg-red-50 text-red-600 active:bg-red-100"
                            : "bg-green-50 text-green-700 active:bg-green-100"
                        }`}
                      >
                        <Power className="mr-1.5 h-3.5 w-3.5" />
                        {usuario.activo ? "Suspender acceso" : "Reactivar acceso"}
                      </button>

                      <button
                        type="button"
                        onClick={() => onEnviarResetPassword(usuario)}
                        disabled={!resetDisponible}
                        className={`inline-flex min-h-10 items-center justify-center rounded-xl px-3 py-2 text-[10px] font-black transition active:scale-[0.98] ${
                          resetDisponible
                            ? "bg-blue-50 text-blue-700 active:bg-blue-100"
                            : "cursor-not-allowed border border-gray-200 bg-gray-50 text-gray-400"
                        }`}
                      >
                        <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                        {resetDisponible ? "Enviar recuperación" : "Sin correo válido"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto custom-scrollbar md:block">
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead>
                  <tr className="border-b border-white/70 bg-white/45 text-[10px] uppercase tracking-wide text-gray-400">
                    <th className="px-4 py-3 font-black">Usuario</th>
                    <th className="px-4 py-3 font-black">Correo</th>
                    <th className="px-4 py-3 font-black">Rol</th>
                    <th className="px-4 py-3 font-black">Estado</th>
                    <th className="px-4 py-3 font-black">Última entrada</th>
                    <th className="px-4 py-3 text-right font-black">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/70">
                  {administradores.map((usuario) => {
                    const resetDisponible = puedeRecuperarPassword(usuario);

                    return (
                      <tr key={usuario.id} className="transition hover:bg-white/60">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0a192f] text-sm font-black text-white">
                              {textoSeguro(usuario.nombre, "U").charAt(0).toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <p className="font-black text-[#0a192f]">
                                {textoSeguro(usuario.nombre, "Sin nombre")}
                              </p>
                              <p className="mt-0.5 font-mono text-[10px] text-gray-400">
                                {textoSeguro(usuario.usuario_alias || usuario.usuarioLimpio, "S/N")}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex max-w-[280px] items-center gap-2">
                            <Mail className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                            <span className="truncate font-mono text-[10px] text-gray-500">
                              {textoSeguro(usuario.correo, "Sin correo")}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[9px] font-black text-blue-700">
                            {textoSeguro(usuario.rol, "ADMIN")}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <EstadoUsuario activo={usuario.activo} />
                        </td>

                        <td className="px-4 py-3 font-mono text-[10px] text-gray-500">
                          {textoSeguro(usuario.ultima_entrada, "Nunca")}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => onCambiarEstado(usuario)}
                              className={`inline-flex items-center rounded-lg px-3 py-2 text-[10px] font-black transition ${
                                usuario.activo
                                  ? "bg-red-50 text-red-600 hover:bg-red-100"
                                  : "bg-green-50 text-green-700 hover:bg-green-100"
                              }`}
                            >
                              <Power className="mr-1.5 h-3.5 w-3.5" />
                              {usuario.activo ? "Suspender" : "Reactivar"}
                            </button>

                            <button
                              type="button"
                              onClick={() => onEnviarResetPassword(usuario)}
                              disabled={!resetDisponible}
                              className={`inline-flex items-center rounded-lg px-3 py-2 text-[10px] font-black transition ${
                                resetDisponible
                                  ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                                  : "cursor-not-allowed border border-gray-200 bg-gray-50 text-gray-400"
                              }`}
                            >
                              <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                              {resetDisponible ? "Recuperar" : "Sin correo"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t border-white/70 px-3 py-3">
              <PaginacionSU
                modoCursor
                pagina={pagina}
                hayAnterior={hayAnterior}
                haySiguiente={haySiguiente}
                cargando={cargando}
                etiquetaTotal="usuarios"
                etiquetaPagina="Usuarios por página"
                registrosEnPagina={registrosEnPagina}
                onAnterior={onAnterior}
                onSiguiente={onSiguiente}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
</file>

<file path="src/components/su/CreditoRiesgoSU.jsx">
import { useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle,
  DollarSign,
  FileText,
  Loader2,
  Search,
  Shield,
  X,
} from "lucide-react";

import { textoSeguro } from "../../utils/normalizadores";
import {
  FILTROS_LINEA_CREDITO,
  FILTROS_NOTAS_CREDITO,
  formatearFechaFirestore,
  formatearMoneda,
  normalizarBusqueda,
  obtenerEstiloSolicitud,
} from "./suUtils";
import PaginacionSU from "./PaginacionSU";

function EmptyDetail({ vista }) {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/45 p-8 text-center">
      {vista === "linea" ? (
        <Shield className="h-10 w-10 text-amber-400" />
      ) : (
        <FileText className="h-10 w-10 text-blue-400" />
      )}

      <h3 className="mt-3 text-sm font-black text-[#0a192f]">
        Selecciona un cliente
      </h3>

      <p className="mt-1 max-w-sm text-xs text-gray-500">
        La lista izquierda funciona como índice de clientes. Al seleccionar uno, aquí verás su historial paginado con filtros.
      </p>
    </div>
  );
}

function EstadoBadge({ estado }) {
  const estilo = obtenerEstiloSolicitud(estado);

  return (
    <span
      className={`inline-flex w-fit max-w-max items-center rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-wide ${estilo.badge}`}
    >
      {textoSeguro(estado, "Pendiente")}
    </span>
  );
}

function TipoLineaBadge({ tipo }) {
  const tipoSeguro = textoSeguro(tipo, "Movimiento").toUpperCase();

  const estilos = {
    AUMENTO: "border-green-200 bg-green-50 text-green-700",
    DISMINUCION: "border-red-200 bg-red-50 text-red-700",
    CORRECCION: "border-blue-200 bg-blue-50 text-blue-700",
    ALTA_INICIAL: "border-amber-200 bg-amber-50 text-amber-700",
    SUSPENSION: "border-orange-200 bg-orange-50 text-orange-700",
    REACTIVACION: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  const etiquetas = {
    AUMENTO: "Aumento",
    DISMINUCION: "Disminución",
    CORRECCION: "Corrección",
    ALTA_INICIAL: "Alta inicial",
    SUSPENSION: "Suspensión",
    REACTIVACION: "Reactivación",
  };

  return (
    <span
      className={`inline-flex w-fit max-w-max items-center rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-wide ${
        estilos[tipoSeguro] || "border-amber-200 bg-amber-50 text-amber-700"
      }`}
    >
      {etiquetas[tipoSeguro] || tipoSeguro}
    </span>
  );
}

const resolverEstadoNota = (solicitud = {}) => {
  if (solicitud.nota_anulada === true) return "Anulada";
  return solicitud.estatus || "Pendiente";
};

const calcularSaldoFinalNota = (solicitud = {}) => {
  const estado = resolverEstadoNota(solicitud);
  const saldoAnterior = Number(solicitud.saldo_actual) || 0;
  const montoNota = Number(solicitud.monto_nota) || 0;

  if (Number.isFinite(Number(solicitud.saldo_restante))) {
    return Number(solicitud.saldo_restante) || 0;
  }

  if (estado === "Autorizado") {
    return Math.max(0, saldoAnterior - montoNota);
  }

  return saldoAnterior;
};

const obtenerImpactoNotaCredito = (solicitud = {}) => {
  const estado = resolverEstadoNota(solicitud);
  const saldoActual = Number(solicitud.saldo_actual) || 0;
  const montoNota = Number(solicitud.monto_nota) || 0;
  const saldoCalculado = Math.max(0, saldoActual - montoNota);

  if (estado === "Pendiente") {
    return {
      etiquetaSaldoBase: "Saldo actual",
      etiquetaSaldoImpacto: "Quedaría en",
      saldoImpacto: saldoCalculado,
      ayuda: "Vista previa si el SU autoriza la nota.",
      claseSaldoImpacto: "text-amber-700",
    };
  }

  if (estado === "Autorizado") {
    return {
      etiquetaSaldoBase: "Saldo anterior",
      etiquetaSaldoImpacto: "Saldo final",
      saldoImpacto: calcularSaldoFinalNota(solicitud),
      ayuda: "Nota aplicada al saldo de la factura.",
      claseSaldoImpacto: "text-green-700",
    };
  }

  if (estado === "Rechazado") {
    return {
      etiquetaSaldoBase: "Saldo actual",
      etiquetaSaldoImpacto: "Sin cambio",
      saldoImpacto: saldoActual,
      ayuda: "La nota fue rechazada y no modifica el saldo.",
      claseSaldoImpacto: "text-gray-700",
    };
  }

  return {
    etiquetaSaldoBase: "Saldo actual",
    etiquetaSaldoImpacto: "Sin impacto",
    saldoImpacto: saldoActual,
    ayuda: "La nota está anulada o sin efecto vigente.",
    claseSaldoImpacto: "text-slate-600",
  };
};

export default function CreditoRiesgoSU({
  vistaCredito,
  onCambiarVista,
  clienteNotaSeleccionadoId,
  clienteNotaSeleccionado,
  resumenesNotasCredito,
  historialNotasCliente,
  cargandoResumenesNotasCredito,
  errorResumenesNotasCredito,
  cargandoHistorialNotasCredito,
  errorHistorialNotasCredito,
  paginaNotasCredito,
  hayAnteriorNotasCredito,
  haySiguienteNotasCredito,
  paginaHistorialNotasCredito,
  hayAnteriorHistorialNotasCredito,
  haySiguienteHistorialNotasCredito,
  filtroHistorialNotasCredito,
  clienteLineaSeleccionadoId,
  clienteLineaSeleccionado,
  solicitudesNotasOrdenadas,
  resumenesLineaCredito,
  movimientosClienteLinea,
  cargandoMovimientosLinea,
  cargandoResumenesLineaCredito,
  errorResumenesLineaCredito,
  paginaLineaCredito,
  hayAnteriorLineaCredito,
  haySiguienteLineaCredito,
  onAnteriorNotasCredito,
  onSiguienteNotasCredito,
  onAnteriorHistorialNotasCredito,
  onSiguienteHistorialNotasCredito,
  onCambiarFiltroHistorialNotasCredito,
  onAnteriorLineaCredito,
  onSiguienteLineaCredito,
  onSeleccionarClienteNota,
  onSeleccionarClienteLinea,
  onResolverSolicitudNota,
}) {
  const [busquedaNotas, setBusquedaNotas] = useState("");
  const [busquedaLinea, setBusquedaLinea] = useState("");
  const listaNotasRef = useRef(null);
  const listaLineaRef = useRef(null);

  const resumenesNotasFiltradosPagina = useMemo(() => {
    const texto = normalizarBusqueda(busquedaNotas);

    return (resumenesNotasCredito || []).filter((resumen) => {
      if (!texto) return true;

      return (
        normalizarBusqueda(resumen.cliente).includes(texto) ||
        normalizarBusqueda(resumen.ultimo_folio).includes(texto) ||
        normalizarBusqueda(resumen.ultimo_estado).includes(texto)
      );
    });
  }, [busquedaNotas, resumenesNotasCredito]);

  const resumenesLineaFiltradosPagina = useMemo(() => {
    const texto = normalizarBusqueda(busquedaLinea);

    return (resumenesLineaCredito || []).filter((resumen) => {
      if (!texto) return true;

      return (
        normalizarBusqueda(resumen.cliente).includes(texto) ||
        normalizarBusqueda(resumen.ultimo_personal_autoriza).includes(texto) ||
        normalizarBusqueda(resumen.ultimo_registrado_por).includes(texto) ||
        normalizarBusqueda(resumen.ultimo_tipo_movimiento).includes(texto)
      );
    });
  }, [busquedaLinea, resumenesLineaCredito]);

  const clienteLineaActivo =
    clienteLineaSeleccionado ||
    (resumenesLineaCredito || []).find(
      (resumen) => resumen.cliente_id === clienteLineaSeleccionadoId,
    );

  const clienteNotaActivo =
    clienteNotaSeleccionado ||
    (resumenesNotasCredito || []).find(
      (resumen) => resumen.cliente_id === clienteNotaSeleccionadoId,
    );

  const notasPendientes = solicitudesNotasOrdenadas.filter(
    (solicitud) => solicitud.estatus === "Pendiente",
  ).length;

  const notasAutorizadas = solicitudesNotasOrdenadas.filter(
    (solicitud) => solicitud.estatus === "Autorizado",
  ).length;

  const notasRechazadas = solicitudesNotasOrdenadas.filter(
    (solicitud) => solicitud.estatus === "Rechazado",
  ).length;

  const montoNotas = solicitudesNotasOrdenadas.reduce(
    (total, solicitud) => total + (Number(solicitud.monto_nota) || 0),
    0,
  );

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-white bg-white/65 p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase text-gray-500">
            Notas pendientes
          </p>
          <p className="mt-1 text-2xl font-black text-amber-700">
            {notasPendientes}
          </p>
        </article>

        <article className="rounded-2xl border border-white bg-white/65 p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase text-gray-500">
            Autorizadas
          </p>
          <p className="mt-1 text-2xl font-black text-green-700">
            {notasAutorizadas}
          </p>
        </article>

        <article className="rounded-2xl border border-white bg-white/65 p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase text-gray-500">
            Rechazadas
          </p>
          <p className="mt-1 text-2xl font-black text-red-700">
            {notasRechazadas}
          </p>
        </article>

        <article className="rounded-2xl border border-white bg-white/65 p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase text-gray-500">
            Monto notas
          </p>
          <p className="mt-1 text-2xl font-black text-[#0a192f]">
            ${formatearMoneda(montoNotas)}
          </p>
        </article>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white bg-white/45 shadow-[10px_14px_38px_rgba(0,0,0,0.10)]">
        <div className="flex flex-col gap-3 border-b border-white p-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onCambiarVista("notas")}
              className={`inline-flex items-center rounded-xl border px-4 py-2 text-xs font-black transition-all duration-150 active:scale-[0.98] ${
                vistaCredito === "notas"
                  ? "border-[#0a192f] bg-[#0a192f] text-white"
                  : "border-transparent bg-white/70 text-gray-600 hover:-translate-y-0.5 hover:border-[#ffd700]/60 hover:bg-white hover:shadow-sm"
              }`}
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Notas de crédito
            </button>

            <button
              type="button"
              onClick={() => onCambiarVista("linea")}
              className={`inline-flex items-center rounded-xl border px-4 py-2 text-xs font-black transition-all duration-150 active:scale-[0.98] ${
                vistaCredito === "linea"
                  ? "border-[#0a192f] bg-[#0a192f] text-white"
                  : "border-transparent bg-white/70 text-gray-600 hover:-translate-y-0.5 hover:border-[#ffd700]/60 hover:bg-white hover:shadow-sm"
              }`}
            >
              <Shield className="mr-2 h-4 w-4" />
              Línea de crédito
            </button>
          </div>
        </div>

        <div className="grid min-h-[520px] overflow-hidden xl:h-[640px] xl:grid-cols-[340px_minmax(0,1fr)] 2xl:h-[660px] 2xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col border-b border-white/80 bg-white/30 p-3 xl:border-b-0 xl:border-r">
            {vistaCredito === "notas" ? (
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div className="relative shrink-0">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={busquedaNotas}
                    onChange={(event) => setBusquedaNotas(event.target.value)}
                    placeholder="Buscar cliente en esta página..."
                    className="w-full rounded-xl border border-white bg-white/75 py-2 pl-9 pr-3 text-xs font-bold text-[#0a192f] outline-none transition focus:ring-2 focus:ring-[#ffd700]/50"
                  />
                </div>

                <p className="shrink-0 text-[10px] font-semibold leading-relaxed text-gray-400">
                  Selecciona un cliente para revisar sus solicitudes de nota.
                </p>

                {errorResumenesNotasCredito && (
                  <div className="shrink-0 rounded-xl border border-amber-100 bg-amber-50 p-3 text-[10px] font-bold text-amber-700">
                    {errorResumenesNotasCredito}
                  </div>
                )}

                <div ref={listaNotasRef} className="min-h-0 flex-1 scroll-mt-24 overflow-y-auto pr-1 custom-scrollbar">
                  {cargandoResumenesNotasCredito ? (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-white/50 p-6 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-300" />
                      <p className="mt-2 text-xs font-bold text-gray-500">
                        Cargando clientes con notas...
                      </p>
                    </div>
                  ) : resumenesNotasFiltradosPagina.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-white/50 p-6 text-center">
                      <FileText className="mx-auto h-8 w-8 text-gray-300" />
                      <p className="mt-2 text-xs font-bold text-gray-500">
                        No hay clientes con notas en esta página.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {resumenesNotasFiltradosPagina.map((resumen) => {
                        const seleccionada =
                          resumen.cliente_id === clienteNotaSeleccionadoId;
                        const pendientesCliente = Number(resumen.pendientes) || 0;

                        return (
                          <button
                            type="button"
                            key={resumen.cliente_id}
                            onClick={() => onSeleccionarClienteNota(resumen)}
                            className={`group relative w-full rounded-xl border px-3 py-2.5 pr-9 text-left transition-all duration-150 active:scale-[0.98] ${
                              seleccionada
                                ? "border-[#0a192f] bg-white shadow-sm"
                                : "border-white bg-white/60 hover:-translate-y-0.5 hover:border-[#ffd700]/70 hover:bg-white hover:shadow-[0_12px_24px_rgba(10,25,47,0.10)]"
                            }`}
                          >
                            {pendientesCliente > 0 && (
                              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[9px] font-black text-white shadow-sm ring-2 ring-white">
                                {pendientesCliente}
                              </span>
                            )}

                            <p className="line-clamp-1 text-xs font-black text-[#0a192f]">
                              {textoSeguro(resumen.cliente, "S/N")}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  <PaginacionSU
                    modoCursor
                    pagina={paginaNotasCredito}
                    hayAnterior={hayAnteriorNotasCredito}
                    haySiguiente={haySiguienteNotasCredito}
                    cargando={cargandoResumenesNotasCredito}
                    etiquetaTotal="clientes"
                    etiquetaPagina="Clientes por página"
                    registrosEnPagina={resumenesNotasFiltradosPagina.length}
                    scrollTargetRef={listaNotasRef}
                    onAnterior={onAnteriorNotasCredito}
                    onSiguiente={onSiguienteNotasCredito}
                  />
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div className="relative shrink-0">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={busquedaLinea}
                    onChange={(event) => setBusquedaLinea(event.target.value)}
                    placeholder="Buscar dentro de esta página..."
                    className="w-full rounded-xl border border-white bg-white/75 py-2 pl-9 pr-3 text-xs font-bold text-[#0a192f] outline-none transition focus:ring-2 focus:ring-[#ffd700]/50"
                  />
                </div>

                <p className="shrink-0 text-[10px] font-semibold leading-relaxed text-gray-400">
                  Selecciona un cliente para revisar sus movimientos de línea.
                </p>

                <div ref={listaLineaRef} className="min-h-0 flex-1 scroll-mt-24 overflow-y-auto pr-1 custom-scrollbar">
                  {cargandoResumenesLineaCredito ? (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-white/50 p-6 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-300" />
                      <p className="mt-2 text-xs font-bold text-gray-500">
                        Cargando clientes de línea...
                      </p>
                    </div>
                  ) : errorResumenesLineaCredito ? (
                    <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-xs font-bold text-red-700">
                      {errorResumenesLineaCredito}
                    </div>
                  ) : resumenesLineaFiltradosPagina.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-white/50 p-6 text-center">
                      <CheckCircle className="mx-auto h-8 w-8 text-green-400" />
                      <p className="mt-2 text-xs font-bold text-gray-500">
                        No hay clientes con movimientos para este filtro o página.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {resumenesLineaFiltradosPagina.map((resumen) => {
                        const seleccionada =
                          resumen.cliente_id === clienteLineaSeleccionadoId;

                        return (
                          <button
                            key={resumen.cliente_id}
                            type="button"
                            onClick={() => onSeleccionarClienteLinea(resumen)}
                            className={`group w-full rounded-xl border px-3 py-2.5 text-left transition-all duration-150 active:scale-[0.98] ${
                              seleccionada
                                ? "border-[#0a192f] bg-white shadow-sm"
                                : "border-white bg-white/60 hover:-translate-y-0.5 hover:border-[#ffd700]/70 hover:bg-white hover:shadow-[0_12px_24px_rgba(10,25,47,0.10)]"
                            }`}
                          >
                            <p className="line-clamp-1 text-xs font-black text-[#0a192f]">
                              {textoSeguro(resumen.cliente, "S/N")}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  <PaginacionSU
                    modoCursor
                    pagina={paginaLineaCredito}
                    hayAnterior={hayAnteriorLineaCredito}
                    haySiguiente={haySiguienteLineaCredito}
                    cargando={cargandoResumenesLineaCredito}
                    etiquetaTotal="clientes"
                    etiquetaPagina="Clientes por página"
                    registrosEnPagina={resumenesLineaFiltradosPagina.length}
                    scrollTargetRef={listaLineaRef}
                    onAnterior={onAnteriorLineaCredito}
                    onSiguiente={onSiguienteLineaCredito}
                  />
                </div>
              </div>
            )}
          </aside>

          <main className="min-h-0 overflow-y-auto p-3 custom-scrollbar md:p-4">
            {vistaCredito === "notas" && !clienteNotaActivo && (
              <EmptyDetail vista="notas" />
            )}

            {vistaCredito === "linea" && !clienteLineaActivo && (
              <EmptyDetail vista="linea" />
            )}

            {vistaCredito === "notas" && clienteNotaActivo && (
              <DetalleNotasCreditoCliente
                cliente={clienteNotaActivo}
                historial={historialNotasCliente}
                cargando={cargandoHistorialNotasCredito}
                error={errorHistorialNotasCredito}
                filtroActivo={filtroHistorialNotasCredito}
                pagina={paginaHistorialNotasCredito}
                hayAnterior={hayAnteriorHistorialNotasCredito}
                haySiguiente={haySiguienteHistorialNotasCredito}
                onCambiarFiltro={onCambiarFiltroHistorialNotasCredito}
                onAnterior={onAnteriorHistorialNotasCredito}
                onSiguiente={onSiguienteHistorialNotasCredito}
                onResolverSolicitudNota={onResolverSolicitudNota}
              />
            )}

            {vistaCredito === "linea" && clienteLineaActivo && (
              <DetalleLineaCredito
                cliente={clienteLineaActivo}
                movimientos={movimientosClienteLinea}
                cargando={cargandoMovimientosLinea}
              />
            )}
          </main>
        </div>
      </section>
    </div>
  );
}

function DetalleNotasCreditoCliente({
  cliente,
  historial,
  cargando,
  error,
  filtroActivo,
  pagina,
  hayAnterior,
  haySiguiente,
  onCambiarFiltro,
  onAnterior,
  onSiguiente,
  onResolverSolicitudNota,
}) {
  const historialNotasRef = useRef(null);

  return (
    <article className="flex h-full min-h-[420px] flex-col rounded-2xl border border-white bg-white/65 p-4 shadow-sm">
      <div className="shrink-0 border-b border-white pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h3 className="text-xl font-black text-[#0a192f]">
              {textoSeguro(cliente.cliente, "S/N")}
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 md:min-w-[420px]">
            <div className="rounded-xl bg-white/70 p-3">
              <p className="text-[9px] font-black uppercase text-gray-400">
                Solicitudes
              </p>
              <p className="mt-1 text-sm font-black text-[#0a192f]">
                {Number(cliente.total_solicitudes) || 0}
              </p>
            </div>

            <div className="rounded-xl bg-white/70 p-3">
              <p className="text-[9px] font-black uppercase text-gray-400">
                Pendientes
              </p>
              <p className="mt-1 text-sm font-black text-amber-700">
                {Number(cliente.pendientes) || 0}
              </p>
            </div>

            <div className="rounded-xl bg-white/70 p-3">
              <p className="text-[9px] font-black uppercase text-gray-400">
                Monto notas
              </p>
              <p className="mt-1 text-sm font-black text-blue-700">
                ${formatearMoneda(cliente.monto_total_notas)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-xl border border-white bg-white/60">
        <div className="flex flex-col gap-3 border-b border-white bg-white/80 px-3 py-2">
          <div>
            <p className="text-[10px] font-black uppercase text-[#0a192f]">
              Historial de notas de crédito
            </p>
            <p className="text-[10px] font-semibold text-gray-400">
              Filtra y revisa las solicitudes de este cliente.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTROS_NOTAS_CREDITO.map((filtro) => (
              <button
                key={filtro.id}
                type="button"
                onClick={() => onCambiarFiltro(filtro.id)}
                className={`rounded-xl px-3 py-1.5 text-[10px] font-black transition ${
                  filtroActivo === filtro.id ||
                  (filtro.id === "TODAS" && filtroActivo === "")
                    ? "bg-[#0a192f] text-white"
                    : "bg-white/80 text-gray-600 hover:bg-white"
                }`}
              >
                {filtro.label}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden grid-cols-7 gap-2 border-b border-white bg-white/60 px-3 py-2 text-[9px] font-black uppercase text-gray-400 md:grid">
          <span>Operador</span>
          <span>Estado</span>
          <span>Factura</span>
          <span>Monto nota</span>
          <span>Saldo base</span>
          <span>Impacto</span>
          <span>Resolución</span>
        </div>

        {cargando ? (
          <div className="p-6 text-center text-xs font-bold text-gray-500">
            Cargando historial de notas...
          </div>
        ) : error ? (
          <div className="m-3 rounded-xl border border-red-100 bg-red-50 p-4 text-xs font-bold text-red-700">
            {error}
          </div>
        ) : historial.length === 0 ? (
          <div className="p-6 text-center text-xs font-bold text-gray-500">
            No hay notas de crédito para este filtro.
          </div>
        ) : (
          <div ref={historialNotasRef} className="max-h-[315px] scroll-mt-24 space-y-2 overflow-y-auto p-2 custom-scrollbar md:divide-y md:divide-white/70 md:space-y-0 md:p-0">
            {historial.map((solicitud) => {
              const estado = resolverEstadoNota(solicitud);
              const esPendiente = estado === "Pendiente";
              const saldoAntes = Number(solicitud.saldo_actual) || 0;
              const impactoNota = obtenerImpactoNotaCredito(solicitud);

              return (
                <div
                  key={solicitud.id}
                  className="grid grid-cols-1 gap-2 rounded-xl border border-white bg-white/80 p-3 text-xs shadow-sm md:grid-cols-7 md:items-center md:rounded-none md:border-0 md:bg-transparent md:px-3 md:py-2.5 md:shadow-none"
                >
                  <span className="min-w-0">
                    <span className="block text-[9px] font-black uppercase tracking-wide text-gray-400 md:hidden">
                      Operador
                    </span>
                    <span className="block truncate text-[11px] font-black text-[#0a192f]">
                      {textoSeguro(solicitud.solicitado_por_nombre, "ADMIN")}
                    </span>
                    <span className="block font-mono text-[9px] text-gray-400">
                      {formatearFechaFirestore(solicitud.createdAt)}
                    </span>
                  </span>

                  <span className="justify-self-start">
                    <span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-gray-400 md:hidden">
                      Estado
                    </span>
                    <EstadoBadge estado={estado} />
                  </span>

                  <span className="truncate font-mono text-[10px] font-black text-[#0a192f]">
                    <span className="block font-sans text-[9px] font-black uppercase tracking-wide text-gray-400 md:hidden">
                      Factura
                    </span>
                    {textoSeguro(solicitud.folio, "S/F")}
                  </span>

                  <span className="font-black text-blue-700">
                    <span className="block text-[9px] font-black uppercase tracking-wide text-blue-400 md:hidden">
                      Monto nota
                    </span>
                    ${formatearMoneda(solicitud.monto_nota)}
                  </span>

                  <span className="font-black text-[#0a192f]">
                    <span className="block text-[9px] font-black uppercase tracking-wide text-gray-400 md:hidden">
                      {impactoNota.etiquetaSaldoBase}
                    </span>
                    ${formatearMoneda(saldoAntes)}
                  </span>

                  <span className={`font-black ${impactoNota.claseSaldoImpacto}`}>
                    <span className="block text-[9px] font-black uppercase tracking-wide text-gray-400 md:hidden">
                      {impactoNota.etiquetaSaldoImpacto}
                    </span>
                    ${formatearMoneda(impactoNota.saldoImpacto)}
                    {esPendiente && (
                      <span className="mt-0.5 block text-[9px] font-semibold text-amber-600 md:hidden">
                        {impactoNota.ayuda}
                      </span>
                    )}
                  </span>

                  <span className="min-w-0">
                    <span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-gray-400 md:hidden">
                      Resolución
                    </span>
                    {esPendiente ? (
                      <span className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => onResolverSolicitudNota(solicitud, "Autorizado")}
                          className="inline-flex items-center rounded-lg bg-green-600 px-2 py-1 text-[9px] font-black text-white transition hover:bg-green-700"
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Autorizar
                        </button>

                        <button
                          type="button"
                          onClick={() => onResolverSolicitudNota(solicitud, "Rechazado")}
                          className="inline-flex items-center rounded-lg border border-red-200 bg-white px-2 py-1 text-[9px] font-black text-red-600 transition hover:bg-red-50"
                        >
                          <X className="mr-1 h-3 w-3" />
                          Rechazar
                        </button>
                      </span>
                    ) : (
                      <span>
                        <span className="block truncate text-[10px] font-black text-gray-600">
                          {textoSeguro(solicitud.resolvedBy, estado)}
                        </span>
                        <span className="block font-mono text-[9px] text-gray-400">
                          {formatearFechaFirestore(solicitud.resolvedAt)}
                        </span>
                      </span>
                    )}
                  </span>

                  {solicitud.motivo && (
                    <p className="rounded-lg bg-gray-50 px-2 py-1 text-[10px] text-gray-500 md:col-span-7">
                      <strong>Motivo:</strong> {textoSeguro(solicitud.motivo)}
                    </p>
                  )}

                  {estado === "Rechazado" && solicitud.motivo_resolucion && (
                    <p className="rounded-lg bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700 md:col-span-7">
                      <strong>Motivo de rechazo:</strong>{" "}
                      {textoSeguro(solicitud.motivo_resolucion)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="shrink-0">
        <PaginacionSU
          modoCursor
          pagina={pagina}
          hayAnterior={hayAnterior}
          haySiguiente={haySiguiente}
          cargando={cargando}
          etiquetaTotal="notas"
          etiquetaPagina="Notas por página"
          registrosEnPagina={historial.length}
          scrollTargetRef={historialNotasRef}
          onAnterior={onAnterior}
          onSiguiente={onSiguiente}
        />
      </div>
    </article>
  );
}

function DetalleLineaCredito({ cliente, movimientos, cargando }) {
  const [filtroHistorial, setFiltroHistorial] = useState("TODOS");
  const movimientosVisibles = useMemo(() => {
    const lista = movimientos || [];

    if (filtroHistorial === "TODOS") return lista;

    return lista.filter(
      (movimiento) => movimiento.tipo_movimiento === filtroHistorial,
    );
  }, [filtroHistorial, movimientos]);

  const ultimoMovimiento = (movimientos || [])[0];
  const diferenciaUltima = Number(ultimoMovimiento?.diferencia) || 0;
  const textoUltimoMovimiento = ultimoMovimiento
    ? `${textoSeguro(ultimoMovimiento.tipo_movimiento, "Movimiento")} ${
        diferenciaUltima >= 0 ? "+" : "-"
      }$${formatearMoneda(Math.abs(diferenciaUltima))}`
    : "Sin movimientos cargados";

  return (
    <article className="flex h-full min-h-[420px] flex-col rounded-2xl border border-white bg-white/65 p-4 shadow-sm">
      <div className="shrink-0 border-b border-white pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h3 className="text-xl font-black text-[#0a192f]">
              {textoSeguro(cliente.cliente, "S/N")}
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:min-w-[300px]">
            <div className="rounded-xl bg-white/70 p-3">
              <p className="text-[9px] font-black uppercase text-gray-400">
                Línea actual
              </p>
              <p className="mt-1 text-sm font-black text-[#0a192f]">
                ${formatearMoneda(cliente.limite_actual)}
              </p>
            </div>

            <div className="rounded-xl bg-white/70 p-3">
              <p className="text-[9px] font-black uppercase text-gray-400">
                Último cambio
              </p>
              <p className="mt-1 truncate text-sm font-black text-blue-700">
                {textoUltimoMovimiento}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-xl border border-white bg-white/60">
        <div className="flex flex-col gap-3 border-b border-white bg-white/80 px-3 py-2">
          <div>
            <p className="text-[10px] font-black uppercase text-[#0a192f]">
              Historial de movimientos
            </p>
            <p className="text-[10px] font-semibold text-gray-400">
              Filtra y revisa los movimientos recientes de este cliente.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTROS_LINEA_CREDITO.map((filtro) => (
              <button
                key={filtro.id}
                type="button"
                onClick={() => setFiltroHistorial(filtro.id)}
                className={`rounded-xl px-3 py-1.5 text-[10px] font-black transition ${
                  filtroHistorial === filtro.id
                    ? "bg-[#0a192f] text-white"
                    : "bg-white/80 text-gray-600 hover:bg-white"
                }`}
              >
                {filtro.label}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden grid-cols-6 gap-2 border-b border-white bg-white/60 px-3 py-2 text-[9px] font-black uppercase text-gray-400 md:grid">
          <span>Operador</span>
          <span>Movimiento</span>
          <span>Límite anterior</span>
          <span>Monto aplicado</span>
          <span>Límite final</span>
          <span>Autorizó</span>
        </div>

        {cargando ? (
          <div className="p-6 text-center text-xs font-bold text-gray-500">
            Cargando historial reciente...
          </div>
        ) : movimientosVisibles.length === 0 ? (
          <div className="p-6 text-center text-xs font-bold text-gray-500">
            No hay movimientos para este filtro.
          </div>
        ) : (
          <div className="max-h-[315px] divide-y divide-white/70 overflow-y-auto custom-scrollbar">
            {movimientosVisibles.map((movimiento) => {
              const diferencia = Number(movimiento.diferencia) || 0;
              const esPositivo = diferencia >= 0;

              return (
                <div
                  key={movimiento.id}
                  className="grid grid-cols-1 gap-1.5 px-3 py-2.5 text-xs md:grid-cols-6 md:items-center"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[11px] font-black text-[#0a192f]">
                      {textoSeguro(
                        movimiento.registrado_por_nombre || movimiento.usuario,
                        "Sin operador",
                      )}
                    </span>
                    <span className="block font-mono text-[9px] text-gray-400">
                      {formatearFechaFirestore(movimiento.createdAt)}
                    </span>
                  </span>

                  <span className="justify-self-start">
                    <TipoLineaBadge tipo={movimiento.tipo_movimiento} />
                  </span>

                  <span className="font-black text-[#0a192f]">
                    ${formatearMoneda(movimiento.limite_anterior)}
                  </span>

                  <span
                    className={`font-black ${
                      esPositivo ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {esPositivo ? "+" : "-"}$
                    {formatearMoneda(Math.abs(diferencia))}
                  </span>

                  <span className="font-black text-blue-700">
                    ${formatearMoneda(movimiento.limite_nuevo)}
                  </span>

                  <span className="font-bold text-gray-600">
                    {textoSeguro(movimiento.personal_autoriza, "Sin dato")}
                  </span>

                  {movimiento.motivo && (
                    <p className="rounded-lg bg-gray-50 px-2 py-1 text-[10px] text-gray-500 md:col-span-6">
                      <strong>Motivo:</strong> {textoSeguro(movimiento.motivo)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}
</file>

<file path="src/components/su/ModalesSU.jsx">
import {
  Activity,
  AlertTriangle,
  Check,
  Info,
  Loader2,
  Power,
  UserPlus,
  X,
  XCircle,
} from "lucide-react";

import { textoSeguro } from "../../utils/normalizadores";
import { ETIQUETAS_CAMBIOS_FACTURA, formatearCambioFactura } from "./suUtils";

export default function ModalesSU({
  modalActivo,
  nuevoUsuario,
  setNuevoUsuario,
  usuarioSeleccionado,
  tempSolicitud,
  actividadSeleccionada,
  notificacion,
  motivoRechazoNota,
  setMotivoRechazoNota,
  isSubmitting,
  onCerrarModal,
  onCrearUsuario,
  onAlternarEstadoUsuario,
  onConfirmarSolicitud,
  onConfirmarResetPassword,
}) {
  if (!modalActivo) return null;

  const modalAncho = modalActivo === "detalleEdicionFactura" ? "max-w-2xl" : "max-w-sm";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm md:items-center md:p-4">
      <div className={`m-auto flex max-h-[92dvh] w-full ${modalAncho} flex-col overflow-hidden rounded-t-3xl bg-white pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-slide-up md:m-0 md:rounded-xl md:pb-0 md:animate-zoom-in`}>
        <div className="mx-auto mt-4 h-1.5 w-12 shrink-0 rounded-full bg-gray-200 md:hidden" />

        {modalActivo !== "notificacion" && (
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white p-4 md:bg-gray-50">
            <h2 className="flex items-center text-sm font-black text-[#0a192f]">
              {modalActivo === "nuevoUsuario" && (
                <>
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  Alta de Personal
                </>
              )}

              {modalActivo === "confirmarEstado" && (
                <>
                  <Power className="mr-1.5 h-4 w-4 text-amber-500" />
                  Confirmar Cambio de Estado
                </>
              )}

              {modalActivo === "confirmarResetPassword" && (
                <>
                  <Info className="mr-1.5 h-4 w-4 text-blue-500" />
                  Recuperación de Contraseña
                </>
              )}

              {modalActivo === "confirmarSolicitud" && (
                <>
                  <Info className="mr-1.5 h-4 w-4 text-amber-500" />
                  Resolver Nota de Crédito
                </>
              )}

              {modalActivo === "detalleEdicionFactura" && (
                <>
                  <Activity className="mr-1.5 h-4 w-4 text-amber-500" />
                  Detalle de Edición de Factura
                </>
              )}
            </h2>

            <button
              type="button"
              onClick={onCerrarModal}
              className="rounded-full bg-gray-50 p-1 text-gray-400 active:text-red-500 md:bg-transparent"
            >
              <XCircle className="h-6 w-6 md:h-5 md:w-5" />
            </button>
          </div>
        )}

        <div className="overflow-y-auto p-5 custom-scrollbar">
          {modalActivo === "nuevoUsuario" && (
            <form id="formUsuarioSU" onSubmit={onCrearUsuario} className="space-y-5 md:space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase text-gray-500">
                  Nombre completo
                </label>
                <input
                  type="text"
                  required
                  value={nuevoUsuario.nombre}
                  onChange={(event) =>
                    setNuevoUsuario({
                      ...nuevoUsuario,
                      nombre: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-[#ffd700] md:rounded md:px-3 md:py-1.5"
                  placeholder="Ej. Carlos Mendoza"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase text-gray-500">
                  Usuario de acceso
                </label>

                <input
                  type="text"
                  required
                  value={nuevoUsuario.usuario}
                  onChange={(event) =>
                    setNuevoUsuario({
                      ...nuevoUsuario,
                      usuario: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-xs outline-none focus:bg-white focus:ring-2 focus:ring-[#ffd700] md:rounded md:px-3 md:py-1.5"
                  placeholder="admin"
                />

                <p className="mt-1 text-[10px] text-gray-400">
                  El usuario seguirá escribiendo solo este alias para iniciar sesión.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase text-gray-500">
                  Correo real de recuperación
                </label>
                <input
                  type="email"
                  required
                  value={nuevoUsuario.correo}
                  onChange={(event) =>
                    setNuevoUsuario({
                      ...nuevoUsuario,
                      correo: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-xs outline-none focus:bg-white focus:ring-2 focus:ring-[#ffd700] md:rounded md:px-3 md:py-1.5"
                  placeholder="ejemplo@gmail.com"
                />
                <p className="mt-1 text-[10px] text-gray-400">
                  Firebase usará este correo para recuperación de contraseña.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase text-gray-500">
                  Clave inicial temporal
                </label>
                <input
                  type="password"
                  required
                  minLength="6"
                  value={nuevoUsuario.password}
                  onChange={(event) =>
                    setNuevoUsuario({
                      ...nuevoUsuario,
                      password: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-xs outline-none focus:bg-white focus:ring-2 focus:ring-[#ffd700] md:rounded md:px-3 md:py-1.5"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase text-gray-500">
                  Rol operativo
                </label>
                <input
                  type="text"
                  disabled
                  value="ADMIN - Operativo Ventas"
                  className="w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-xs font-bold text-gray-500 md:rounded md:px-3 md:py-1.5"
                />
              </div>
            </form>
          )}

          {modalActivo === "confirmarEstado" && usuarioSeleccionado && (
            <div className="space-y-4 text-center md:space-y-3">
              <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 md:h-10 md:w-10" />

              <p className="text-base font-medium leading-relaxed text-gray-700 md:text-sm">
                ¿Confirmas que deseas{" "}
                <span
                  className={`font-black uppercase tracking-wider ${
                    usuarioSeleccionado.activo ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {usuarioSeleccionado.activo ? "suspender" : "reactivar"}
                </span>{" "}
                esta cuenta?
              </p>

              <p className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-500 md:rounded md:p-2">
                <strong className="text-[#0a192f]">Usuario:</strong>{" "}
                {textoSeguro(usuarioSeleccionado.nombre)}
              </p>

              <p className="text-[11px] leading-relaxed text-gray-400">
                {usuarioSeleccionado.activo
                  ? "El usuario perderá el acceso al sistema cuando su perfil vuelva a validarse."
                  : "El usuario podrá volver a iniciar sesión con sus credenciales actuales."}
              </p>
            </div>
          )}

          {modalActivo === "confirmarResetPassword" && usuarioSeleccionado && (
            <div className="space-y-4 text-center md:space-y-3">
              <Info className="mx-auto h-12 w-12 text-blue-500 md:h-10 md:w-10" />

              <p className="text-base font-medium leading-relaxed text-gray-700 md:text-sm">
                ¿Enviar correo de recuperación de contraseña?
              </p>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-left text-xs text-gray-500 md:rounded md:p-2">
                <p>
                  <strong className="text-[#0a192f]">Usuario:</strong>{" "}
                  {textoSeguro(usuarioSeleccionado.usuario_alias || usuarioSeleccionado.usuarioLimpio)}
                </p>
                <p className="mt-1 break-all font-mono">
                  <strong className="font-sans text-[#0a192f]">Correo:</strong>{" "}
                  {textoSeguro(usuarioSeleccionado.correo, "Sin correo real")}
                </p>
              </div>

              <p className="text-[11px] leading-relaxed text-gray-400">
                Firebase enviará un enlace al correo real vinculado. La contraseña no se guarda ni se modifica manualmente desde el sistema.
              </p>
            </div>
          )}

          {modalActivo === "confirmarSolicitud" && (
            <div className="space-y-4 text-center md:space-y-3">
              <Info className="mx-auto h-12 w-12 text-amber-500 md:h-10 md:w-10" />

              <p className="text-base font-medium leading-relaxed text-gray-700 md:text-sm">
                ¿Confirmar resolución de nota de crédito como{" "}
                <span
                  className={`font-black uppercase tracking-wider ${
                    tempSolicitud?.nuevoEstatus === "Autorizado"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {textoSeguro(tempSolicitud?.nuevoEstatus)}
                </span>
                ?
              </p>

              <p className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-500 md:rounded md:p-2">
                <strong className="text-[#0a192f]">Afectado:</strong>{" "}
                {textoSeguro(tempSolicitud?.cliente)}
                <span className="mt-1 block">
                  Factura: {textoSeguro(tempSolicitud?.folio, "S/F")} · Monto: $
                  {(Number(tempSolicitud?.monto_nota) || 0).toLocaleString("es-MX")}
                </span>
              </p>

              {tempSolicitud?.nuevoEstatus === "Rechazado" && (
                <div className="text-left">
                  <label className="mb-1.5 block text-[10px] font-black uppercase text-gray-500">
                    Motivo del rechazo
                  </label>

                  <textarea
                    rows={3}
                    value={motivoRechazoNota}
                    onChange={(event) => setMotivoRechazoNota(event.target.value)}
                    placeholder="Ej. Monto no autorizado, documento insuficiente o ajuste no procedente."
                    className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
                  />

                  <p className="mt-1 text-[10px] text-gray-400">
                    Este motivo se mostrará al ADMIN en el historial de solicitudes.
                  </p>
                </div>
              )}
            </div>
          )}

          {modalActivo === "detalleEdicionFactura" && actividadSeleccionada && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <span className="block text-[10px] font-black uppercase text-gray-400">
                    Factura
                  </span>
                  <strong className="font-mono text-[#0a192f]">
                    {textoSeguro(actividadSeleccionada.folio, "S/F")}
                  </strong>
                </div>

                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <span className="block text-[10px] font-black uppercase text-gray-400">
                    Operador
                  </span>
                  <strong className="text-[#0a192f]">
                    {textoSeguro(actividadSeleccionada.usuario)}
                  </strong>
                </div>

                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 sm:col-span-2">
                  <span className="block text-[10px] font-black uppercase text-gray-400">
                    Cliente
                  </span>
                  <strong className="text-[#0a192f]">
                    {textoSeguro(actividadSeleccionada.cliente)}
                  </strong>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200">
                <div className="grid grid-cols-3 bg-gray-100 text-[10px] font-black uppercase text-gray-500">
                  <div className="p-2.5">Campo</div>
                  <div className="border-l border-gray-200 p-2.5">Antes</div>
                  <div className="border-l border-gray-200 p-2.5">Después</div>
                </div>

                {(actividadSeleccionada.campos_modificados || []).map((campo) => {
                  const campoValor = campo === "cliente_id" ? "cliente" : campo;

                  return (
                    <div key={campo} className="grid grid-cols-3 border-t border-gray-100 text-xs">
                      <div className="p-2.5 font-black text-gray-600">
                        {ETIQUETAS_CAMBIOS_FACTURA[campo] || campo}
                      </div>
                      <div className="break-words border-l border-gray-100 p-2.5 text-red-700">
                        {formatearCambioFactura(
                          campo,
                          actividadSeleccionada.valores_anteriores?.[campoValor],
                        )}
                      </div>
                      <div className="break-words border-l border-gray-100 p-2.5 text-green-700">
                        {formatearCambioFactura(
                          campo,
                          actividadSeleccionada.valores_nuevos?.[campoValor],
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="font-mono text-[11px] text-gray-400">
                {textoSeguro(actividadSeleccionada.fechaHora, "Sin fecha")}
              </p>
            </div>
          )}

          {modalActivo === "notificacion" && (
            <div className="py-4 text-center md:py-2">
              <div
                className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full md:mb-3 md:h-12 md:w-12 ${
                  notificacion.tipo === "error" ? "bg-red-100" : "bg-green-100"
                }`}
              >
                {notificacion.tipo === "error" ? (
                  <X className="h-7 w-7 text-red-600 md:h-6 md:w-6" />
                ) : (
                  <Check className="h-7 w-7 text-green-600 md:h-6 md:w-6" />
                )}
              </div>

              <h3 className="mb-1.5 text-lg font-black text-[#0a192f] md:mb-0.5 md:text-base">
                {textoSeguro(notificacion.titulo)}
              </h3>

              <p className="px-2 text-sm leading-relaxed text-gray-500 md:text-xs">
                {textoSeguro(notificacion.descripcion)}
              </p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col-reverse justify-end gap-3 border-t border-gray-100 bg-white p-4 md:flex-row md:gap-2 md:bg-gray-50 md:p-3 md:rounded-b-xl">
          {modalActivo === "notificacion" || modalActivo === "detalleEdicionFactura" ? (
            <button
              type="button"
              onClick={onCerrarModal}
              className={`w-full rounded-xl px-4 py-3.5 text-sm font-black text-white shadow-sm transition-colors md:rounded md:py-2 md:text-xs ${
                modalActivo === "detalleEdicionFactura"
                  ? "bg-[#0a192f] hover:bg-[#112240]"
                  : notificacion.tipo === "error"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {modalActivo === "detalleEdicionFactura" ? "Cerrar" : "Aceptar"}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onCerrarModal}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 md:w-auto md:rounded md:py-1.5 md:text-xs"
              >
                Cancelar
              </button>

              {modalActivo === "confirmarEstado" && usuarioSeleccionado && (
                <button
                  type="button"
                  onClick={onAlternarEstadoUsuario}
                  disabled={isSubmitting}
                  className={`flex w-full items-center justify-center rounded-xl px-6 py-3.5 text-sm font-black text-white shadow-sm transition-colors disabled:opacity-50 md:w-auto md:rounded md:py-1.5 md:text-xs ${
                    usuarioSeleccionado.activo
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Power className="mr-1 h-4 w-4" />
                  )}
                  {isSubmitting
                    ? "Procesando..."
                    : usuarioSeleccionado.activo
                      ? "Sí, suspender"
                      : "Sí, reactivar"}
                </button>
              )}

              {modalActivo === "confirmarResetPassword" && (
                <button
                  type="button"
                  onClick={onConfirmarResetPassword}
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-black text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50 md:w-auto md:rounded md:py-1.5 md:text-xs"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Info className="mr-1 h-4 w-4" />
                  )}
                  {isSubmitting ? "Enviando..." : "Enviar recuperación"}
                </button>
              )}

              {modalActivo === "confirmarSolicitud" && (
                <button
                  type="button"
                  onClick={onConfirmarSolicitud}
                  disabled={isSubmitting}
                  className={`flex w-full items-center justify-center rounded-xl px-6 py-3.5 text-sm font-black text-white shadow-sm transition-colors disabled:opacity-50 md:w-auto md:rounded md:py-1.5 md:text-xs ${
                    tempSolicitud?.nuevoEstatus === "Autorizado"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : tempSolicitud?.nuevoEstatus === "Autorizado" ? (
                    <Check className="mr-1 h-4 w-4" />
                  ) : (
                    <X className="mr-1 h-4 w-4" />
                  )}
                  {isSubmitting ? "Procesando..." : "Aplicar"}
                </button>
              )}

              {modalActivo === "nuevoUsuario" && (
                <button
                  type="submit"
                  form="formUsuarioSU"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center rounded-xl bg-[#ffd700] px-8 py-3.5 text-sm font-black text-[#0a192f] shadow-sm transition-colors hover:bg-[#e6c200] active:bg-[#e6c200] disabled:opacity-50 md:w-auto md:rounded md:py-1.5 md:text-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    "Generar Acceso"
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
</file>

<file path="src/components/su/PaginacionSU.jsx">
import PaginacionGlobal from "../ui/PaginacionGlobal";

export default function PaginacionSU({
  pagina,
  totalPaginas,
  onAnterior,
  onSiguiente,
  onCambiarPagina,
  modoCursor = false,
  hayAnterior = false,
  haySiguiente = false,
  cargando = false,
  etiqueta = "registros",
  etiquetaTotal,
  etiquetaPagina,
  totalRegistros = 0,
  registrosPorPagina = 0,
  registrosEnPagina = 0,
  scrollTargetRef,
  scrollTargetId,
  className = "",
}) {
  return (
    <PaginacionGlobal
      pagina={pagina}
      totalPaginas={totalPaginas}
      totalRegistros={totalRegistros}
      registrosPorPagina={registrosPorPagina}
      registrosEnPagina={registrosEnPagina}
      modoCursor={modoCursor}
      hayAnterior={hayAnterior}
      haySiguiente={haySiguiente}
      cargando={cargando}
      etiquetaTotal={etiquetaTotal || etiqueta}
      etiquetaPagina={etiquetaPagina || etiqueta}
      scrollTargetRef={scrollTargetRef}
      scrollTargetId={scrollTargetId}
      onAnterior={onAnterior}
      onSiguiente={onSiguiente}
      onCambiarPagina={onCambiarPagina}
      className={className}
    />
  );
}
</file>

<file path="src/components/su/ResumenEjecutivoSU.jsx">
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  CreditCard,
  FileText,
  Shield,
  Users,
} from "lucide-react";

import { actividadEsCritica, formatearFechaFirestore } from "./suUtils";
import { textoSeguro } from "../../utils/normalizadores";


const claseCardRedireccionSU =
  "group relative overflow-hidden rounded-xl border border-white bg-white/70 p-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-[#ffd700]/70 hover:bg-white hover:shadow-[0_14px_28px_rgba(10,25,47,0.12)] active:scale-[0.98]";

const claseFlechaRedireccionSU =
  "absolute right-3 top-3 h-3.5 w-3.5 text-gray-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[#ffd700]";

function KpiSU({ titulo, valor, descripcion, icono: Icono, variante = "azul" }) {
  const estilos = {
    azul: "border-blue-100 bg-blue-50/50 text-blue-700",
    verde: "border-green-100 bg-green-50/50 text-green-700",
    amber: "border-amber-100 bg-amber-50/60 text-amber-700",
    rojo: "border-red-100 bg-red-50/60 text-red-700",
    morado: "border-purple-100 bg-purple-50/60 text-purple-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <article className={`rounded-2xl border p-4 shadow-sm ${estilos[variante] || estilos.azul}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wide opacity-80">
            {titulo}
          </p>
          <p className="mt-1 text-2xl font-black text-[#0a192f]">
            {valor}
          </p>
        </div>

        <div className="rounded-xl bg-white/80 p-2 shadow-sm">
          <Icono className="h-5 w-5" />
        </div>
      </div>

      <p className="mt-3 text-[11px] font-semibold text-gray-500">
        {descripcion}
      </p>
    </article>
  );
}

export default function ResumenEjecutivoSU({
  solicitudesNotasOrdenadas,
  actividad,
  onCambiarTab,
  hayUsuariosSuspendidos = false,
}) {
  const solicitudesPendientes = solicitudesNotasOrdenadas.filter(
    (solicitud) => solicitud.estatus === "Pendiente",
  );

  const solicitudesResueltas = solicitudesNotasOrdenadas.filter(
    (solicitud) => solicitud.estatus !== "Pendiente",
  );

  const movimientosCriticos = (actividad || []).filter(actividadEsCritica);
  const movimientosLinea = (actividad || []).filter(
    (item) => item.modulo === "Crédito" && item.tipo === "Movimiento de Línea",
  );

  const alertas = [
    solicitudesPendientes.length > 0 && {
      id: "notas-pendientes",
      titulo: "Notas de crédito pendientes",
      descripcion: `${solicitudesPendientes.length} solicitud(es) requieren revisión del SU.`,
      accion: "Revisar créditos",
      tab: "creditos",
    },
    movimientosCriticos.length > 0 && {
      id: "actividad-critica",
      titulo: "Actividad crítica reciente",
      descripcion: `${movimientosCriticos.length} evento(s) críticos o sensibles en auditoría.`,
      accion: "Abrir auditoría",
      tab: "actividad",
    },
    hayUsuariosSuspendidos && {
      id: "usuarios-suspendidos",
      titulo: "Usuarios suspendidos",
      descripcion: "Existen accesos ADMIN inactivos conservados como historial.",
      accion: "Revisar personal",
      tab: "usuarios",
    },
  ].filter(Boolean);

  const ultimosMovimientos = [...(actividad || [])].slice(0, 5);

  return (
    <div className="space-y-4 md:space-y-6">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KpiSU
          titulo="Pendientes"
          valor={solicitudesPendientes.length}
          descripcion="Notas de crédito en espera."
          icono={FileText}
          variante={solicitudesPendientes.length > 0 ? "amber" : "verde"}
        />

        <KpiSU
          titulo="Notas resueltas"
          valor={solicitudesResueltas.length}
          descripcion="Solicitudes autorizadas, rechazadas o anuladas."
          icono={CheckCircle}
          variante="verde"
        />

        <KpiSU
          titulo="Actividad crítica"
          valor={movimientosCriticos.length}
          descripcion="Eventos sensibles detectados en auditoría."
          icono={AlertTriangle}
          variante={movimientosCriticos.length > 0 ? "rojo" : "slate"}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-white bg-white/55 p-4 shadow-[8px_10px_28px_rgba(0,0,0,0.08)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-[#0a192f]">
                Acciones rápidas
              </h2>
              <p className="text-[11px] text-gray-500">
                Accesos directos para operar el Panel SU sin buscar entre listas.
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onCambiarTab("usuarios")}
              className={claseCardRedireccionSU}
            >
              <ArrowRight className={claseFlechaRedireccionSU} />
              <Users className="h-5 w-5 text-blue-600" />
              <p className="mt-2 text-xs font-black text-[#0a192f]">
                Control de personal
              </p>
              <p className="text-[10px] text-gray-500">
                Crear, suspender o reactivar ADMIN.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onCambiarTab("creditos")}
              className={claseCardRedireccionSU}
            >
              <ArrowRight className={claseFlechaRedireccionSU} />
              <CreditCard className="h-5 w-5 text-amber-600" />
              <p className="mt-2 text-xs font-black text-[#0a192f]">
                Gestión de Créditos
              </p>
              <p className="text-[10px] text-gray-500">
                Revisar notas y líneas de crédito.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onCambiarTab("actividad")}
              className={claseCardRedireccionSU}
            >
              <ArrowRight className={claseFlechaRedireccionSU} />
              <Activity className="h-5 w-5 text-purple-600" />
              <p className="mt-2 text-xs font-black text-[#0a192f]">
                Auditoría completa
              </p>
              <p className="text-[10px] text-gray-500">
                Filtrar movimientos por módulo y evento.
              </p>
            </button>

            <div className="rounded-xl border border-white bg-white/70 p-3 shadow-sm">
              <Shield className="h-5 w-5 text-green-600" />
              <p className="mt-2 text-xs font-black text-[#0a192f]">
                Movimientos de línea
              </p>
              <p className="text-[10px] text-gray-500">
                {movimientosLinea.length} evento(s) registrados.
              </p>
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-white bg-white/55 p-4 shadow-[8px_10px_28px_rgba(0,0,0,0.08)]">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <h2 className="text-sm font-black text-[#0a192f]">
                Alertas ejecutivas
              </h2>
              <p className="text-[11px] text-gray-500">
                Elementos que podrían requerir revisión.
              </p>
            </div>
          </div>

          {alertas.length === 0 ? (
            <div className="rounded-xl border border-green-100 bg-green-50 p-4 text-center">
              <CheckCircle className="mx-auto h-7 w-7 text-green-600" />
              <p className="mt-2 text-xs font-black text-green-700">
                Sin alertas críticas
              </p>
              <p className="text-[10px] text-green-700/70">
                El panel no detecta pendientes urgentes.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {alertas.map((alerta) => (
                <button
                  type="button"
                  key={alerta.id}
                  onClick={() => onCambiarTab(alerta.tab)}
                  className={`${claseCardRedireccionSU} w-full`}
                >
                  <ArrowRight className={claseFlechaRedireccionSU} />
                  <p className="pr-6 text-xs font-black text-[#0a192f]">
                    {alerta.titulo}
                  </p>
                  <p className="mt-1 text-[10px] text-gray-500">
                    {alerta.descripcion}
                  </p>
                  <span className="mt-2 inline-flex items-center text-[10px] font-black text-blue-700">
                    {alerta.accion}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>
      </section>

      <section className="rounded-2xl border border-white bg-white/55 p-4 shadow-[8px_10px_28px_rgba(0,0,0,0.08)]">
        <div className="mb-3">
          <h2 className="text-sm font-black text-[#0a192f]">
            Últimos movimientos relevantes
          </h2>
          <p className="text-[11px] text-gray-500">
            Vista rápida de los eventos más recientes del sistema.
          </p>
        </div>

        {ultimosMovimientos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white/50 p-6 text-center">
            <p className="text-xs font-bold text-gray-500">
              Sin movimientos recientes.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-white bg-white/60">
            {ultimosMovimientos.map((movimiento) => (
              <div key={movimiento.id} className="grid gap-2 p-3 md:grid-cols-[180px_minmax(0,1fr)_170px] md:items-center">
                <div>
                  <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase text-blue-700">
                    {textoSeguro(movimiento.modulo, "Sistema")}
                  </span>
                  <p className="mt-1 text-[10px] font-black uppercase text-gray-500">
                    {textoSeguro(movimiento.tipo, "Movimiento")}
                  </p>
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-black text-[#0a192f]">
                    {textoSeguro(movimiento.cliente, "N/A")}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-gray-600">
                    {textoSeguro(movimiento.detalle, "Sin detalle")}
                  </p>
                </div>

                <div className="text-left md:text-right">
                  <p className="text-[10px] font-mono text-gray-400">
                    {textoSeguro(movimiento.fechaHora, formatearFechaFirestore(movimiento.serverTime))}
                  </p>
                  <p className="mt-1 text-[9px] font-black uppercase text-gray-400">
                    {textoSeguro(movimiento.usuario, "Sistema")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
</file>

<file path="src/components/su/suUtils.js">
import { textoSeguro } from "../../utils/normalizadores";

export const SOLICITUDES_POR_PAGINA = 8;
export const ACTIVIDAD_POR_PAGINA = 10;
export const RESUMENES_LINEA_POR_PAGINA = 10;
export const MOVIMIENTOS_LINEA_POR_PAGINA = 6;
export const NOTAS_CLIENTES_POR_PAGINA = 10;
export const NOTAS_HISTORIAL_POR_PAGINA = 6;
export const ABONOS_REPORTE_POR_PAGINA = 10;


export const TABS_PANEL_SU = [
  {
    id: "resumen",
    label: "Resumen Ejecutivo",
    descripcion: "Vista rápida del estado operativo.",
  },
  {
    id: "usuarios",
    label: "Control de Personal",
    descripcion: "Administración de accesos ADMIN.",
  },
  {
    id: "creditos",
    label: "Gestión de Créditos",
    descripcion: "Notas de crédito y líneas de crédito.",
  },
  {
    id: "actividad",
    label: "Auditoría",
    descripcion: "Registro completo de eventos.",
  },
  {
    id: "abonos",
    label: "Reporte de Abonos",
    descripcion: "Pagos registrados y limpieza de pruebas.",
  },
];

export const FILTROS_SOLICITUDES = [
  { id: "PENDIENTES", label: "Pendientes" },
  { id: "RESUELTAS", label: "Resueltas" },
  { id: "TODAS", label: "Todas" },
];


export const FILTROS_NOTAS_CREDITO = [
  { id: "TODAS", label: "Todas" },
  { id: "Pendiente", label: "Pendientes" },
  { id: "Autorizado", label: "Autorizadas" },
  { id: "Rechazado", label: "Rechazadas" },
  { id: "Anulada", label: "Anuladas" },
];

export const FILTROS_LINEA_CREDITO = [
  { id: "TODOS", label: "Todos" },
  { id: "AUMENTO", label: "Aumentos" },
  { id: "DISMINUCION", label: "Disminuciones" },
  { id: "CORRECCION", label: "Correcciones" },
  { id: "ALTA_INICIAL", label: "Alta inicial" },
  { id: "SUSPENSION", label: "Suspensión" },
  { id: "REACTIVACION", label: "Reactivación" },
];

export const ESTILOS_SOLICITUD = {
  Pendiente: {
    punto: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    monto: "text-amber-700",
  },
  Autorizado: {
    punto: "bg-green-500",
    badge: "bg-green-50 text-green-700 border-green-200",
    monto: "text-green-700",
  },
  Rechazado: {
    punto: "bg-red-500",
    badge: "bg-red-50 text-red-700 border-red-200",
    monto: "text-red-700",
  },
  Anulada: {
    punto: "bg-slate-400",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    monto: "text-slate-600",
  },
};

export const ETIQUETAS_CAMBIOS_FACTURA = {
  cliente_id: "Cliente",
  grupo: "Grupo",
  folio: "Folio",
  monto_total: "Monto total",
  emision: "Emisión",
  vencimiento: "Vencimiento",
  observaciones: "Observaciones",
};

export const formatearMoneda = (valor, decimales = 0) =>
  (Number(valor) || 0).toLocaleString("es-MX", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: 2,
  });

export const obtenerEstiloSolicitud = (estatus = "") =>
  ESTILOS_SOLICITUD[textoSeguro(estatus, "Pendiente")] ||
  ESTILOS_SOLICITUD.Pendiente;

export const formatearCambioFactura = (campo, valor) => {
  if (campo === "monto_total") {
    return `$${formatearMoneda(valor, 2)}`;
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

export const formatearFechaFirestore = (valor) => {
  const fecha =
    valor?.toDate?.() ||
    (typeof valor?.seconds === "number"
      ? new Date(valor.seconds * 1000)
      : valor
        ? new Date(valor)
        : null);

  if (!fecha || Number.isNaN(fecha.getTime())) {
    return "Sin fecha";
  }

  return fecha.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const obtenerTiempoFirestore = (valor) =>
  valor?.toDate?.().getTime?.() ||
  (typeof valor?.seconds === "number" ? valor.seconds * 1000 : 0) ||
  (valor instanceof Date ? valor.getTime() : 0) ||
  new Date(valor || 0).getTime() ||
  0;

export const obtenerTiempoSolicitud = (solicitud = {}) =>
  obtenerTiempoFirestore(solicitud.resolvedAt) ||
  obtenerTiempoFirestore(solicitud.createdAt) ||
  obtenerTiempoFirestore(solicitud.fecha);

export const ordenarSolicitudesOperativas = (lista = []) =>
  [...lista].sort((a, b) => {
    if ((a.estatus === "Pendiente") !== (b.estatus === "Pendiente")) {
      return a.estatus === "Pendiente" ? -1 : 1;
    }

    return obtenerTiempoSolicitud(b) - obtenerTiempoSolicitud(a);
  });

export const coincideFiltroSolicitud = (solicitud, filtro) => {
  if (filtro === "PENDIENTES") return solicitud.estatus === "Pendiente";
  if (filtro === "RESUELTAS") return solicitud.estatus !== "Pendiente";
  return true;
};

export const obtenerConteosSolicitudes = (solicitudes = []) => ({
  PENDIENTES: solicitudes.filter((solicitud) =>
    coincideFiltroSolicitud(solicitud, "PENDIENTES"),
  ).length,
  RESUELTAS: solicitudes.filter((solicitud) =>
    coincideFiltroSolicitud(solicitud, "RESUELTAS"),
  ).length,
  TODAS: solicitudes.length,
});

export const normalizarBusqueda = (valor = "") =>
  valor
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const actividadEsCritica = (actividad = {}) => {
  const tipo = normalizarBusqueda(actividad.tipo);
  const detalle = normalizarBusqueda(actividad.detalle);

  return [
    "eliminacion",
    "eliminación",
    "disminucion",
    "disminución",
    "inactivacion",
    "inactivación",
    "rechazo",
    "suspension",
    "suspensión",
  ].some((palabra) => tipo.includes(palabra) || detalle.includes(palabra));
};
</file>

<file path="src/components/ui/PaginacionGlobal.jsx">
import { ChevronLeft, ChevronRight } from "lucide-react";

const obtenerNumeroSeguro = (valor, respaldo = 0) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : respaldo;
};

const obtenerContenedorConScroll = (elemento) => {
  let actual = elemento?.parentElement || null;

  while (actual) {
    const estilos = window.getComputedStyle(actual);
    const overflowY = estilos.overflowY;

    if (
      ["auto", "scroll"].includes(overflowY) &&
      actual.scrollHeight > actual.clientHeight
    ) {
      return actual;
    }

    actual = actual.parentElement;
  }

  return document.scrollingElement || document.documentElement;
};

const ejecutarScroll = ({ scrollTargetRef, scrollTargetId }) => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const desplazar = () => {
    const destino =
      scrollTargetRef?.current ||
      (scrollTargetId ? document.getElementById(scrollTargetId) : null);

    if (!destino) return;

    const contenedor = obtenerContenedorConScroll(destino);

    if (typeof destino.scrollTo === "function") {
      destino.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
    }

    if (contenedor && contenedor !== destino) {
      const destinoRect = destino.getBoundingClientRect();
      const contenedorRect = contenedor.getBoundingClientRect();
      const offset = destinoRect.top - contenedorRect.top + contenedor.scrollTop - 12;

      contenedor.scrollTo({
        top: Math.max(0, offset),
        behavior: "smooth",
      });
    } else if (typeof destino.scrollIntoView === "function") {
      destino.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  window.requestAnimationFrame(() => {
    desplazar();
    window.setTimeout(desplazar, 80);
  });
};

export default function PaginacionGlobal({
  pagina = 1,
  totalPaginas = 1,
  totalRegistros = 0,
  registrosPorPagina = 0,
  registrosEnPagina = 0,
  indiceInicial,
  indiceFinal,
  modoCursor = false,
  hayAnterior = false,
  haySiguiente = false,
  cargando = false,
  etiquetaTotal = "registros",
  etiquetaPagina = "registros por página",
  textoMostrando = "",
  mostrarSiempre = false,
  scrollTargetRef,
  scrollTargetId,
  onAnterior,
  onSiguiente,
  onCambiarPagina,
  className = "",
}) {
  const paginaActual = Math.max(1, obtenerNumeroSeguro(pagina, 1));
  const totalPaginasSeguro = Math.max(1, obtenerNumeroSeguro(totalPaginas, 1));
  const totalRegistrosSeguro = Math.max(0, obtenerNumeroSeguro(totalRegistros, 0));
  const registrosPorPaginaSeguro = Math.max(
    0,
    obtenerNumeroSeguro(registrosPorPagina, 0),
  );
  const registrosEnPaginaSeguro = Math.max(
    0,
    obtenerNumeroSeguro(registrosEnPagina, 0),
  );

  const anteriorDeshabilitado = modoCursor
    ? !hayAnterior
    : paginaActual <= 1;

  const siguienteDeshabilitado = modoCursor
    ? !haySiguiente
    : paginaActual >= totalPaginasSeguro;

  const puedePaginar = modoCursor
    ? hayAnterior || haySiguiente || mostrarSiempre
    : totalRegistrosSeguro > 0 && (totalPaginasSeguro > 1 || mostrarSiempre);

  if (!puedePaginar) return null;

  const desde = modoCursor
    ? null
    : Math.max(
        1,
        obtenerNumeroSeguro(
          indiceInicial,
          (paginaActual - 1) * registrosPorPaginaSeguro + 1,
        ),
      );

  const hasta = modoCursor
    ? null
    : Math.min(
        totalRegistrosSeguro,
        obtenerNumeroSeguro(
          indiceFinal,
          desde + Math.max(0, registrosEnPaginaSeguro || registrosPorPaginaSeguro) - 1,
        ),
      );

  const textoInformativo =
    textoMostrando ||
    (modoCursor
      ? cargando
        ? "Consultando registros..."
        : registrosEnPaginaSeguro > 0
          ? `Mostrando ${registrosEnPaginaSeguro} ${etiquetaTotal} en esta página`
          : etiquetaPagina
      : `Mostrando ${desde}–${hasta} de ${totalRegistrosSeguro}`);

  const irAnterior = () => {
    if (anteriorDeshabilitado || cargando) return;

    if (modoCursor) {
      onAnterior?.();
    } else {
      onCambiarPagina?.(Math.max(1, paginaActual - 1));
    }

    ejecutarScroll({ scrollTargetRef, scrollTargetId });
  };

  const irSiguiente = () => {
    if (siguienteDeshabilitado || cargando) return;

    if (modoCursor) {
      onSiguiente?.();
    } else {
      onCambiarPagina?.(Math.min(totalPaginasSeguro, paginaActual + 1));
    }

    ejecutarScroll({ scrollTargetRef, scrollTargetId });
  };

  return (
    <div
      className={`mt-3 rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-center text-[10px] font-medium text-gray-500 sm:text-left md:text-xs">
          {textoInformativo}
        </p>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <button
            type="button"
            onClick={irAnterior}
            disabled={anteriorDeshabilitado || cargando}
            className="flex h-10 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition active:scale-[0.97] active:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 md:h-9 md:w-10"
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="min-w-28 text-center text-[10px] font-black text-[#0a192f] md:text-xs">
            {modoCursor ? (
              <>Página {paginaActual}</>
            ) : (
              <>
                Página {paginaActual} de {totalPaginasSeguro}
              </>
            )}
          </span>

          <button
            type="button"
            onClick={irSiguiente}
            disabled={siguienteDeshabilitado || cargando}
            className="flex h-10 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition active:scale-[0.97] active:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 md:h-9 md:w-10"
            aria-label="Página siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
</file>

<file path="src/config/firebase.js">
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export const auth = getAuth(app);
</file>

<file path="src/context/AuthContext.js">
import { createContext } from "react";

export const AuthContext = createContext(null);
</file>

<file path="src/context/GlobalContext.js">
import { createContext } from "react";

export const GlobalContext = createContext(null);
</file>

<file path="src/hooks/useAgendaRango.js">
import { useEffect, useMemo, useState } from "react";

import { calendarioConsultaService } from "../services/calendarioConsultaService";
import { construirEventosAgenda } from "../utils/agenda";

export const useAgendaRango = (inicio, fin) => {
  const inicioMs = inicio.getTime();
  const finMs = fin.getTime();
  const rangoKey = `${inicioMs}-${finMs}`;

  const [resultadoFacturas, setResultadoFacturas] = useState({
    key: "",
    data: [],
    error: "",
  });

  const [resultadoCompromisos, setResultadoCompromisos] = useState({
    key: "",
    data: [],
    error: "",
  });

  useEffect(() => {
    let activo = true;
    const inicioRango = new Date(inicioMs);
    const finRango = new Date(finMs);

    calendarioConsultaService
      .consultarFacturasRango({ inicio: inicioRango, fin: finRango })
      .then((resultado) => {
        if (!activo) return;

        setResultadoFacturas({
          key: rangoKey,
          data: resultado.facturas || [],
          error: resultado.success ? "" : resultado.error || "Error de consulta",
        });
      });

    const unsubscribe = calendarioConsultaService.escucharCompromisosRango({
      inicio: inicioRango,
      fin: finRango,
      onData: (compromisos) => {
        if (!activo) return;

        setResultadoCompromisos({
          key: rangoKey,
          data: compromisos,
          error: "",
        });
      },
      onError: (error) => {
        if (!activo) return;

        setResultadoCompromisos({
          key: rangoKey,
          data: [],
          error: error?.message || "No se pudieron consultar los recordatorios.",
        });
      },
    });

    return () => {
      activo = false;
      unsubscribe();
    };
  }, [inicioMs, finMs, rangoKey]);

  const facturas = useMemo(
    () =>
      resultadoFacturas.key === rangoKey
        ? resultadoFacturas.data
        : [],
    [resultadoFacturas, rangoKey],
  );

  const compromisos = useMemo(
    () =>
      resultadoCompromisos.key === rangoKey
        ? resultadoCompromisos.data
        : [],
    [resultadoCompromisos, rangoKey],
  );

  const eventos = useMemo(
    () => construirEventosAgenda(facturas, compromisos),
    [facturas, compromisos],
  );

  return {
    facturas,
    compromisos,
    eventos,
    cargando:
      resultadoFacturas.key !== rangoKey ||
      resultadoCompromisos.key !== rangoKey,
    error:
      resultadoFacturas.error || resultadoCompromisos.error || "",
  };
};
</file>

<file path="src/hooks/useClientes.js">
import { useState, useContext } from "react";
import { GlobalContext } from "../context/GlobalContext";
import { clientesService } from "../services/clientesService";
import { solicitudesService } from "../services/solicitudesService";

export const useClientes = () => {
  const { userName, currentUser, userRole } = useContext(GlobalContext);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registrarNuevoCliente = async (formData) => {
    if (!currentUser?.uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    setIsSubmitting(true);

    try {
      return await clientesService.crearCliente(
        formData,
        userName,
        currentUser.uid,
        userRole,
      );
    } catch (error) {
      return {
        success: false,
        error: error?.message || "No se pudo registrar el cliente.",
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  const solicitarAumentoCredito = async (datosSolicitud) => {
    if (!currentUser?.uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    setIsSubmitting(true);

    try {
      return await solicitudesService.crearSolicitudAumento({
        ...datosSolicitud,
        solicitado_por_uid: currentUser.uid,
        solicitado_por_nombre: userName || "ADMIN",
      });
    } catch (error) {
      return {
        success: false,
        error: error?.message || "No se pudo crear la solicitud.",
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    registrarNuevoCliente,
    solicitarAumentoCredito,
  };
};
</file>

<file path="src/main.jsx">
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(<App />);
</file>

<file path="src/services/auditoriaService.js">
import { db } from '../config/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

export const auditoriaService = {
    registrarMovimiento: async (movimiento) => {
        // BLINDAJE OBLIGATORIO: Las reglas de Firestore exigen la firma del actor.
        if (!movimiento || !movimiento.actor_uid) {
            console.error("Auditoría rechazada: No se puede registrar una actividad sin el actor_uid.");
            return { success: false, error: "Identidad del usuario no verificada." };
        }

        try {
            const nuevoDocRef = doc(collection(db, 'actividad'));
            
            const payload = {
                ...movimiento,
                id: nuevoDocRef.id,
                serverTime: serverTimestamp() // Registro plano ultra-rápido
            };
            
            await setDoc(nuevoDocRef, payload);
            return { success: true, data: payload };
        } catch (error) {
            // Este log es silencioso para no interrumpir al usuario si el internet falla por un microsegundo
            console.warn("Auditoría diferida (Fallo de conexión):", error);
            return { success: false, error: error.message };
        }
    }
};
</file>

<file path="src/services/calendarioConsultaService.js">
import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";

import { db } from "../config/firebase";
import { normalizarFacturaSnapshot } from "../utils/normalizarFactura";

const FACTURAS_COLLECTION = "facturas";
const COMPROMISOS_COLLECTION = "compromisos";

const aTimestamp = (fecha) => Timestamp.fromDate(new Date(fecha));

const normalizarCompromiso = (documento) => ({
  id: documento.id,
  ...documento.data(),
});

export const calendarioConsultaService = {
  consultarFacturasRango: async ({ inicio, fin }) => {
    try {
      const consulta = query(
        collection(db, FACTURAS_COLLECTION),
        where("vencimiento", ">=", aTimestamp(inicio)),
        where("vencimiento", "<", aTimestamp(fin)),
        where("saldo_pendiente", ">", 0),
        orderBy("vencimiento", "asc"),
        orderBy("saldo_pendiente", "desc"),
      );

      const snapshot = await getDocs(consulta);

      return {
        success: true,
        facturas: snapshot.docs.map(normalizarFacturaSnapshot),
      };
    } catch (error) {
      console.error("Error consultando facturas del calendario:", error);

      return {
        success: false,
        facturas: [],
        error:
          error?.code === "failed-precondition"
            ? "Firestore necesita un índice para consultar los vencimientos del periodo."
            : error?.message || "No se pudieron consultar las facturas.",
      };
    }
  },

  escucharCompromisosRango: ({ inicio, fin, onData, onError }) => {
    const consulta = query(
      collection(db, COMPROMISOS_COLLECTION),
      where("fecha_compromiso", ">=", aTimestamp(inicio)),
      where("fecha_compromiso", "<", aTimestamp(fin)),
      orderBy("fecha_compromiso", "asc"),
    );

    return onSnapshot(
      consulta,
      (snapshot) => {
        onData(snapshot.docs.map(normalizarCompromiso));
      },
      (error) => {
        console.error("Error escuchando compromisos por rango:", error);
        onError?.(error);
      },
    );
  },

  consultarFacturasAbiertasCliente: async (clienteId) => {
    if (!clienteId) {
      return { success: true, facturas: [] };
    }

    try {
      const consulta = query(
        collection(db, FACTURAS_COLLECTION),
        where("cliente_id", "==", clienteId),
        orderBy("emision", "desc"),
      );

      const snapshot = await getDocs(consulta);
      const facturas = snapshot.docs
        .map(normalizarFacturaSnapshot)
        .filter((factura) => Number(factura.saldo_pendiente) > 0);

      return { success: true, facturas };
    } catch (error) {
      console.error("Error consultando facturas del cliente:", error);

      return {
        success: false,
        facturas: [],
        error:
          error?.code === "failed-precondition"
            ? "Firestore necesita el índice cliente_id + emision."
            : error?.message || "No se pudieron consultar las facturas del cliente.",
      };
    }
  },
};
</file>

<file path="src/services/facturasClienteService.js">
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { db } from "../config/firebase";
import { facturasConsultaService } from "./facturasConsultaService";
import { normalizarFacturaSnapshot } from "../utils/normalizarFactura";

const FACTURAS_COLLECTION = "facturas";
const LIMITE_RESUMEN_CLIENTE = 500;

const mapearFiltroExpediente = (filtro = "Historial") => {
  if (filtro === "Vencidas") return "Vencida";
  if (filtro === "Pagadas") return "Pagada";
  return "Todas";
};

const calcularResumenFacturas = (facturas = []) => {
  return facturas.reduce(
    (resumen, factura) => {
      const saldo = Number(factura.saldo_pendiente) || 0;
      const total = Number(factura.monto_total) || 0;
      const estatus = factura.estatus || "Pendiente";

      resumen.totalFacturas += 1;
      resumen.totalFacturado += total;
      resumen.saldoActual += Math.max(0, saldo);

      if (saldo <= 0 || estatus === "Pagada") {
        resumen.facturasPagadas += 1;
        return resumen;
      }

      if (estatus === "Vencida") {
        resumen.facturasVencidas += 1;
        resumen.saldoVencido += Math.max(0, saldo);
        return resumen;
      }

      resumen.facturasPendientes += 1;
      return resumen;
    },
    {
      totalFacturas: 0,
      facturasPagadas: 0,
      facturasPendientes: 0,
      facturasVencidas: 0,
      totalFacturado: 0,
      saldoActual: 0,
      saldoVencido: 0,
      resumenLimitado: false,
    },
  );
};

export const facturasClienteService = {
  consultarPaginaCliente: async ({
    clienteId,
    pageSize = 8,
    cursor = null,
    filtroFacturas = "Historial",
  } = {}) => {
    if (!clienteId) {
      return {
        success: true,
        facturas: [],
        cursorSiguiente: null,
        haySiguiente: false,
        mensaje: "No se identificó el cliente del expediente.",
      };
    }

    return facturasConsultaService.consultarPagina({
      pageSize,
      cursor,
      clienteId,
      filtroEstatus: mapearFiltroExpediente(filtroFacturas),
    });
  },

  consultarResumenCliente: async (clienteId) => {
    try {
      if (!clienteId) {
        return {
          success: true,
          resumen: calcularResumenFacturas([]),
        };
      }

      const consulta = query(
        collection(db, FACTURAS_COLLECTION),
        where("cliente_id", "==", clienteId),
        orderBy("emision", "desc"),
        limit(LIMITE_RESUMEN_CLIENTE),
      );

      const snapshot = await getDocs(consulta);
      const facturas = snapshot.docs.map(normalizarFacturaSnapshot);
      const resumen = calcularResumenFacturas(facturas);

      return {
        success: true,
        resumen: {
          ...resumen,
          resumenLimitado: snapshot.docs.length >= LIMITE_RESUMEN_CLIENTE,
        },
      };
    } catch (error) {
      console.error("Error consultando resumen del expediente:", error);

      return {
        success: false,
        resumen: calcularResumenFacturas([]),
        error:
          error?.code === "failed-precondition"
            ? "Firestore necesita el índice cliente_id + emision para calcular el resumen del expediente."
            : error?.message || "No se pudo calcular el resumen del expediente.",
      };
    }
  },
};
</file>

<file path="src/services/facturasConsultaService.js">
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  Timestamp,
  where,
} from "firebase/firestore";

import { db } from "../config/firebase";
import { normalizarFacturaSnapshot } from "../utils/normalizarFactura";

const FACTURAS_COLLECTION = "facturas";
const TAMANO_LOTE_LOCAL = 50;
const MAX_DOCUMENTOS_ESCANEADOS = 300;

const fechaInicioTimestamp = (fecha) => {
  if (!fecha) return null;

  const [anio, mes, dia] = fecha.split("-").map(Number);
  return Timestamp.fromDate(new Date(anio, mes - 1, dia, 0, 0, 0, 0));
};

const fechaFinTimestamp = (fecha) => {
  if (!fecha) return null;

  const [anio, mes, dia] = fecha.split("-").map(Number);
  return Timestamp.fromDate(new Date(anio, mes - 1, dia, 23, 59, 59, 999));
};

const inicioHoyTimestamp = () => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(hoy);
};

const normalizarFolioBusqueda = (valor = "") =>
  valor.toString().replace(/\s+/g, " ").trim().toUpperCase();

const coincideFiltrosLocales = (
  factura,
  { filtroEstatus, fechaInicio, fechaFin },
) => {
  if (filtroEstatus !== "Todas" && factura.estatus !== filtroEstatus) {
    return false;
  }

  if (fechaInicio && factura.emision < fechaInicio) {
    return false;
  }

  if (fechaFin && factura.emision > fechaFin) {
    return false;
  }

  return true;
};

const crearRestriccionesLocales = ({
  clienteId,
  prefijoFolio,
  fechaInicio,
  fechaFin,
  cursor,
  limiteLote,
}) => {
  const restricciones = [];

  if (clienteId) {
    restricciones.push(where("cliente_id", "==", clienteId));
    restricciones.push(orderBy("emision", "desc"));
  } else if (prefijoFolio) {
    restricciones.push(where("folio", ">=", prefijoFolio));
    restricciones.push(where("folio", "<=", `${prefijoFolio}\uf8ff`));
    restricciones.push(orderBy("folio", "asc"));
  } else {
    const desde = fechaInicioTimestamp(fechaInicio);
    const hasta = fechaFinTimestamp(fechaFin);

    if (desde) {
      restricciones.push(where("emision", ">=", desde));
    }

    if (hasta) {
      restricciones.push(where("emision", "<=", hasta));
    }

    restricciones.push(orderBy("emision", "desc"));
  }

  if (cursor) {
    restricciones.push(startAfter(cursor));
  }

  restricciones.push(limit(limiteLote));
  return restricciones;
};

const consultarConFiltroLocal = async ({
  pageSize,
  cursor,
  clienteId,
  prefijoFolio,
  filtroEstatus,
  fechaInicio,
  fechaFin,
}) => {
  const resultados = [];
  let cursorLote = cursor;
  let cursorSiguiente = null;
  let documentosEscaneados = 0;
  let quedanDocumentos = true;
  let limiteAlcanzado = false;

  while (
    quedanDocumentos &&
    resultados.length <= pageSize &&
    documentosEscaneados < MAX_DOCUMENTOS_ESCANEADOS
  ) {
    const restricciones = crearRestriccionesLocales({
      clienteId,
      prefijoFolio,
      fechaInicio,
      fechaFin,
      cursor: cursorLote,
      limiteLote: TAMANO_LOTE_LOCAL,
    });

    const consulta = query(
      collection(db, FACTURAS_COLLECTION),
      ...restricciones,
    );

    const snapshot = await getDocs(consulta);

    if (snapshot.empty) {
      break;
    }

    for (const documento of snapshot.docs) {
      documentosEscaneados += 1;
      cursorLote = documento;

      const factura = normalizarFacturaSnapshot(documento);
      const coincide = coincideFiltrosLocales(factura, {
        filtroEstatus,
        fechaInicio,
        fechaFin,
      });

      if (coincide) {
        resultados.push({ factura, documento });

        if (resultados.length === pageSize) {
          cursorSiguiente = documento;
        }

        if (resultados.length > pageSize) {
          break;
        }
      }

      if (documentosEscaneados >= MAX_DOCUMENTOS_ESCANEADOS) {
        limiteAlcanzado = true;
        break;
      }
    }

    if (resultados.length > pageSize) {
      break;
    }

    if (snapshot.docs.length < TAMANO_LOTE_LOCAL) {
      quedanDocumentos = false;
    }
  }

  const haySiguiente =
    resultados.length > pageSize ||
    (limiteAlcanzado && Boolean(cursorLote));

  if (!cursorSiguiente && haySiguiente) {
    cursorSiguiente = cursorLote;
  }

  const facturas = resultados
    .slice(0, pageSize)
    .map((resultado) => resultado.factura);

  let mensaje = "";

  if (prefijoFolio) {
    mensaje = facturas.length
      ? `Mostrando folios que comienzan con “${prefijoFolio}”.`
      : `No se encontraron folios que comiencen con “${prefijoFolio}”.`;
  } else if (clienteId) {
    mensaje = facturas.length
      ? "Mostrando las facturas del cliente seleccionado."
      : "El cliente seleccionado no tiene facturas con estos filtros.";
  }

  if (limiteAlcanzado) {
    mensaje = `${mensaje ? `${mensaje} ` : ""}La búsqueda es muy amplia; escribe más caracteres para reducir resultados.`;
  }

  return {
    facturas,
    cursorSiguiente,
    haySiguiente,
    mensaje,
  };
};

const crearRestriccionesEstado = ({
  filtroEstatus,
  fechaInicio,
  fechaFin,
  cursor,
  pageSize,
}) => {
  const restricciones = [];
  const hoy = inicioHoyTimestamp();
  const desde = fechaInicioTimestamp(fechaInicio);
  const hasta = fechaFinTimestamp(fechaFin);
  const usaRangoEmision = Boolean(desde || hasta);

  if (desde) {
    restricciones.push(where("emision", ">=", desde));
  }

  if (hasta) {
    restricciones.push(where("emision", "<=", hasta));
  }

  if (filtroEstatus === "Vencida") {
    restricciones.push(where("vencimiento", "<", hoy));
    restricciones.push(where("saldo_pendiente", ">", 0));

    if (usaRangoEmision) {
      restricciones.push(orderBy("emision", "desc"));
    }

    restricciones.push(orderBy("vencimiento", "desc"));
    restricciones.push(orderBy("saldo_pendiente", "desc"));
  } else if (filtroEstatus === "Pendiente") {
    restricciones.push(where("vencimiento", ">=", hoy));
    restricciones.push(where("saldo_pendiente", ">", 0));

    if (usaRangoEmision) {
      restricciones.push(orderBy("emision", "desc"));
    }

    restricciones.push(orderBy("vencimiento", "asc"));
    restricciones.push(orderBy("saldo_pendiente", "desc"));
  } else if (filtroEstatus === "Pagada") {
    restricciones.push(where("saldo_pendiente", "==", 0));
    restricciones.push(orderBy("emision", "desc"));
  } else {
    restricciones.push(orderBy("emision", "desc"));
  }

  if (cursor) {
    restricciones.push(startAfter(cursor));
  }

  restricciones.push(limit(pageSize + 1));
  return restricciones;
};

const consultarEstadoGlobal = async ({
  pageSize,
  cursor,
  filtroEstatus,
  fechaInicio,
  fechaFin,
}) => {
  const restricciones = crearRestriccionesEstado({
    filtroEstatus,
    fechaInicio,
    fechaFin,
    cursor,
    pageSize,
  });

  const consulta = query(
    collection(db, FACTURAS_COLLECTION),
    ...restricciones,
  );

  const snapshot = await getDocs(consulta);
  const documentosVisibles = snapshot.docs.slice(0, pageSize);

  return {
    facturas: documentosVisibles.map(normalizarFacturaSnapshot),
    cursorSiguiente:
      documentosVisibles[documentosVisibles.length - 1] || null,
    haySiguiente: snapshot.docs.length > pageSize,
    mensaje: "",
  };
};

export const facturasConsultaService = {
  consultarPagina: async ({
    pageSize = 25,
    cursor = null,
    busqueda = "",
    clienteId = "",
    filtroEstatus = "Todas",
    fechaInicio = "",
    fechaFin = "",
  } = {}) => {
    try {
      const prefijoFolio = clienteId
        ? ""
        : normalizarFolioBusqueda(busqueda);

      const requiereFiltroLocal = Boolean(clienteId || prefijoFolio);

      const resultado = requiereFiltroLocal
        ? await consultarConFiltroLocal({
            pageSize,
            cursor,
            clienteId,
            prefijoFolio,
            filtroEstatus,
            fechaInicio,
            fechaFin,
          })
        : await consultarEstadoGlobal({
            pageSize,
            cursor,
            filtroEstatus,
            fechaInicio,
            fechaFin,
          });

      return {
        success: true,
        ...resultado,
      };
    } catch (error) {
      console.error("Error consultando facturas paginadas:", error);

      return {
        success: false,
        facturas: [],
        cursorSiguiente: null,
        haySiguiente: false,
        mensaje: "",
        error:
          error?.code === "failed-precondition"
            ? "Firestore necesita un índice para esta combinación. Publica los índices nuevos de la Fase 4A.1 o abre el enlace de creación mostrado en la consola."
            : error?.message || "No se pudieron consultar las facturas.",
      };
    }
  },
};
</file>

<file path="src/services/lineaCreditoService.js">
import { db } from "../config/firebase";
import {
  collection,
  doc,
  getDoc,
  increment,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

const CLIENTES_COLLECTION = "clientes";
const ACTIVIDAD_COLLECTION = "actividad";
const MOVIMIENTOS_LINEA_COLLECTION = "lineas_credito_movimientos";
const RESUMEN_LINEA_COLLECTION = "lineas_credito_resumen_clientes";

const TIPOS_MOVIMIENTO = [
  "ALTA_INICIAL",
  "AUMENTO",
  "DISMINUCION",
  "CORRECCION",
];

const ESTADOS_LINEA = {
  SIN_LINEA: "Sin línea",
  ACTIVA: "Activa",
};

const mapearErrorFirestore = (error) => {
  if (error?.code === "resource-exhausted") {
    return "La cuota diaria de Firestore fue agotada. El movimiento de línea no pudo registrarse.";
  }

  if (error?.code === "permission-denied") {
    return "Firestore rechazó el movimiento por permisos. Verifica las reglas publicadas.";
  }

  if (error?.code === "unavailable") {
    return "Firestore no está disponible en este momento. Revisa tu conexión.";
  }

  return error?.message || "No se pudo registrar el movimiento de línea de crédito.";
};

const redondearMoneda = (valor) =>
  Math.round((Number(valor) || 0) * 100) / 100;

const textoLimpio = (valor) => String(valor || "").trim();

const resolverEstadoLinea = ({ nuevoLimite }) => {
  if (nuevoLimite <= 0) return ESTADOS_LINEA.SIN_LINEA;
  return ESTADOS_LINEA.ACTIVA;
};

const resolverDisponible = ({ nuevoLimite, deudaActual }) =>
  Math.max(0, redondearMoneda(nuevoLimite - deudaActual));

const calcularNuevoLimite = ({
  tipoMovimiento,
  montoCapturado,
  limiteAnterior,
}) => {
  if (tipoMovimiento === "AUMENTO") {
    return redondearMoneda(limiteAnterior + montoCapturado);
  }

  if (tipoMovimiento === "DISMINUCION") {
    return redondearMoneda(limiteAnterior - montoCapturado);
  }

  return redondearMoneda(montoCapturado);
};

const construirDescripcionMovimiento = ({
  tipoMovimiento,
  limiteAnterior,
  limiteNuevo,
  diferencia,
  personalAutoriza,
}) => {
  const diferenciaTexto =
    diferencia >= 0
      ? `+$${diferencia.toLocaleString("es-MX")}`
      : `-$${Math.abs(diferencia).toLocaleString("es-MX")}`;

  const etiquetas = {
    ALTA_INICIAL: "alta inicial",
    AUMENTO: "aumento",
    DISMINUCION: "disminución",
    CORRECCION: "corrección",
  };

  return `Se registró ${etiquetas[tipoMovimiento] || "movimiento"} de línea de crédito. Antes: $${limiteAnterior.toLocaleString("es-MX")}. Después: $${limiteNuevo.toLocaleString("es-MX")}. Diferencia: ${diferenciaTexto}. Autorizó: ${personalAutoriza}.`;
};

export const lineaCreditoService = {
  registrarMovimientoLineaCredito: async ({
    cliente_id,
    tipo_movimiento,
    monto_movimiento,
    nuevo_limite,
    personal_autoriza,
    referencia_externa,
    motivo,
    actor_uid,
    actor_nombre,
    actor_rol,
  }) => {
    try {
      if (!cliente_id) {
        throw new Error("No se identificó el cliente para registrar la línea de crédito.");
      }

      if (!actor_uid) {
        throw new Error("No se identificó al usuario responsable del movimiento.");
      }

      const tipoMovimiento = textoLimpio(tipo_movimiento).toUpperCase();

      if (!TIPOS_MOVIMIENTO.includes(tipoMovimiento)) {
        throw new Error("El tipo de movimiento de línea no es válido.");
      }

      const personalAutoriza = textoLimpio(
        personal_autoriza || referencia_externa,
      );

      const motivoLimpio = textoLimpio(motivo);

      if (!personalAutoriza) {
        throw new Error("El personal que autoriza es obligatorio.");
      }

      if (!motivoLimpio) {
        throw new Error("El motivo del movimiento es obligatorio.");
      }

      const montoCapturado = redondearMoneda(
        monto_movimiento ?? nuevo_limite,
      );

      if (!Number.isFinite(montoCapturado) || montoCapturado < 0) {
        throw new Error("El monto capturado debe ser mayor o igual a cero.");
      }

      if (
        ["AUMENTO", "DISMINUCION"].includes(tipoMovimiento) &&
        montoCapturado <= 0
      ) {
        throw new Error(
          tipoMovimiento === "AUMENTO"
            ? "El monto a aumentar debe ser mayor a cero."
            : "El monto a disminuir debe ser mayor a cero.",
        );
      }

      const clienteRef = doc(db, CLIENTES_COLLECTION, cliente_id);
      const clienteSnap = await getDoc(clienteRef);

      if (!clienteSnap.exists()) {
        throw new Error("El cliente no existe o ya no está disponible.");
      }

      const clienteData = clienteSnap.data();

      if (clienteData.activo === false || clienteData.estatus === "Inactivo") {
        throw new Error("No se puede modificar la línea de un cliente inactivo.");
      }

      const limiteAnterior = redondearMoneda(clienteData.limite_credito);
      const deudaActual = redondearMoneda(clienteData.deuda_actual);

      const limiteNuevo = calcularNuevoLimite({
        tipoMovimiento,
        montoCapturado,
        limiteAnterior,
      });

      if (limiteNuevo < 0) {
        throw new Error(
          "La disminución no puede dejar la línea de crédito en un valor negativo.",
        );
      }

      if (limiteNuevo < deudaActual) {
        throw new Error(
          `El nuevo límite de crédito no puede ser menor a la deuda actual del cliente. Deuda actual: $${deudaActual.toLocaleString("es-MX")}.`,
        );
      }

      if (tipoMovimiento === "AUMENTO" && limiteNuevo <= limiteAnterior) {
        throw new Error("Para AUMENTO, el movimiento debe incrementar la línea actual.");
      }

      if (tipoMovimiento === "DISMINUCION" && limiteNuevo >= limiteAnterior) {
        throw new Error("Para DISMINUCIÓN, el movimiento debe reducir la línea actual.");
      }

      const diferencia = redondearMoneda(limiteNuevo - limiteAnterior);

      const estadoLinea = resolverEstadoLinea({
        nuevoLimite: limiteNuevo,
      });

      const creditoDisponible = resolverDisponible({
        nuevoLimite: limiteNuevo,
        deudaActual,
      });

      const movimientoRef = doc(collection(db, MOVIMIENTOS_LINEA_COLLECTION));
      const resumenRef = doc(db, RESUMEN_LINEA_COLLECTION, cliente_id);
      const actividadRef = doc(collection(db, ACTIVIDAD_COLLECTION));
      const batch = writeBatch(db);

      const movimientoPayload = {
        id: movimientoRef.id,
        actor_uid,
        cliente_id,
        cliente: String(clienteData.nombre || "S/N"),
        tipo_movimiento: tipoMovimiento,
        limite_anterior: limiteAnterior,
        limite_nuevo: limiteNuevo,
        diferencia,
        deuda_actual: deudaActual,
        credito_disponible_resultante: creditoDisponible,
        estado_resultante: estadoLinea,
        personal_autoriza: personalAutoriza,
        motivo: motivoLimpio,
        registrado_por_uid: actor_uid,
        registrado_por_nombre: actor_nombre || "ADMIN",
        registrado_por_rol: actor_rol || "ADMIN",
        createdAt: serverTimestamp(),
      };

      batch.set(movimientoRef, movimientoPayload);

      batch.set(
        resumenRef,
        {
          id: cliente_id,
          cliente_id,
          cliente: String(clienteData.nombre || "S/N"),
          limite_actual: limiteNuevo,
          deuda_actual: deudaActual,
          credito_disponible_actual: creditoDisponible,
          estado_resultante: estadoLinea,
          ultimo_tipo_movimiento: tipoMovimiento,
          ultimo_personal_autoriza: personalAutoriza,
          ultimo_registrado_por: actor_nombre || "ADMIN",
          ultimo_registrado_por_uid: actor_uid,
          ultimo_registrado_por_rol: actor_rol || "ADMIN",
          ultimo_movimiento_id: movimientoRef.id,
          ultimo_movimiento_at: serverTimestamp(),
          total_movimientos: increment(1),
          activo: true,
        },
        { merge: true },
      );

      batch.update(clienteRef, {
        limite_credito: limiteNuevo,
        credito_disponible: creditoDisponible,
        linea_credito_estado: estadoLinea,
        linea_credito_autorizado_por: personalAutoriza,
        linea_credito_ultimo_movimiento: movimientoRef.id,
        linea_credito_actualizada_en: serverTimestamp(),
        linea_credito_actualizada_por: actor_nombre || "ADMIN",
        linea_credito_actualizada_por_uid: actor_uid,
        updatedAt: serverTimestamp(),
      });

      batch.set(actividadRef, {
        actor_uid,
        usuario: actor_nombre || "ADMIN",
        modulo: "Crédito",
        tipo: "Movimiento de Línea",
        cliente: String(clienteData.nombre || "S/N"),
        cliente_id,
        movimiento_linea_credito_id: movimientoRef.id,
        personal_autoriza: personalAutoriza,
        detalle: construirDescripcionMovimiento({
          tipoMovimiento,
          limiteAnterior,
          limiteNuevo,
          diferencia,
          personalAutoriza,
        }),
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return {
        success: true,
        data: movimientoPayload,
      };
    } catch (error) {
      console.error("Error registrando movimiento de línea de crédito:", error);

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },
};
</file>

<file path="src/services/mock/bitacora.data.js">
export const mockBitacora = [
    {
        id: "bit-001",
        fechaHora: "29/05/2026, 11:00:00 a.m.",
        usuario: "SuperUsuario MLH",
        modulo: "Sistema",
        tipo: "Inicialización",
        cliente: "N/A",
        detalle: "Base de datos local inicializada en modo MOCK (Costo $0)."
    }
];
</file>

<file path="src/services/mock/clientes.data.js">
export const mockClientes = [
    {
        id: "cli-001",
        numero_cliente: "CLI-1024",
        nombre: "Dante Ivan Saucedo Luna",
        rfc: "DNTSLC425",
        limite_credito: 6000,
        debe: 4000,
        grupo: "GENERAL",
        telefono: "4433409896",
        fecha_ultimo_pago: "N/A"
    }
];
</file>

<file path="src/services/mock/facturas.data.js">
export const mockFacturas = [
    {
        id: "fac-001",
        folio: "215816sasd",
        cliente: "Dante Ivan Saucedo Luna",
        monto_total: 5000,
        saldo_pendiente: 4000,
        estatus: "Pendiente",
        emision: "2026-05-28",
        vencimiento: "2027-03-28",
        uso_cfdi: "G03",
        abonos: [
            {
                id_abono: "abn-112233",
                fecha: "29/05/2026, 10:00:00 a.m.",
                monto: 1000,
                metodo: "Efectivo",
                registrado_por: "Admin",
                saldo_anterior: 5000,
                saldo_restante: 4000
            }
        ]
    }
];
</file>

<file path="src/services/mock/solicitudes.data.js">
export const mockSolicitudes = [
    {
        id: "sol-001",
        cliente: "Dante Ivan Saucedo Luna",
        monto_actual: 6000,
        monto_solicitado: 8000,
        motivo: "Aumento para nuevo proyecto de carpintería",
        estatus: "Pendiente", 
        admin: "Admin",
        fecha: "29/05/2026, 10:56:52 a.m."
    }
];
</file>

<file path="src/utils/agenda.js">
const DOS_DIGITOS = (valor) => String(valor).padStart(2, "0");

export const inicioDelDia = (fecha) => {
  const resultado = new Date(fecha);
  resultado.setHours(0, 0, 0, 0);
  return resultado;
};

export const sumarDias = (fecha, dias) => {
  const resultado = new Date(fecha);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
};

export const fechaAClave = (fecha) => {
  if (!fecha) return "";

  let valor = fecha;

  if (typeof fecha?.toDate === "function") {
    valor = fecha.toDate();
  } else if (typeof fecha?.seconds === "number") {
    valor = new Date(fecha.seconds * 1000);
  } else if (typeof fecha === "string") {
    const texto = fecha.trim().split(" ")[0];

    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
      return texto;
    }

    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(texto)) {
      const [dia, mes, anio] = texto.split("/");
      return `${anio}-${DOS_DIGITOS(mes)}-${DOS_DIGITOS(dia)}`;
    }

    valor = new Date(fecha);
  }

  if (!(valor instanceof Date) || Number.isNaN(valor.getTime())) {
    return "";
  }

  return `${valor.getFullYear()}-${DOS_DIGITOS(valor.getMonth() + 1)}-${DOS_DIGITOS(valor.getDate())}`;
};

export const claveAFecha = (clave) => {
  if (!clave || !/^\d{4}-\d{2}-\d{2}$/.test(clave)) {
    return null;
  }

  const [anio, mes, dia] = clave.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  fecha.setHours(0, 0, 0, 0);
  return fecha;
};

export const obtenerInicioSemana = (fecha) => {
  const inicio = inicioDelDia(fecha);
  const dia = inicio.getDay();
  const ajuste = dia === 0 ? -6 : 1 - dia;
  return sumarDias(inicio, ajuste);
};

export const obtenerRangoAgenda = (fechaBase, vista = "SEMANA") => {
  const base = inicioDelDia(fechaBase);

  if (vista === "DIA") {
    return {
      inicio: base,
      fin: sumarDias(base, 1),
    };
  }

  if (vista === "MES") {
    const inicio = new Date(base.getFullYear(), base.getMonth(), 1);
    const fin = new Date(base.getFullYear(), base.getMonth() + 1, 1);
    return { inicio, fin };
  }

  const inicio = obtenerInicioSemana(base);
  return {
    inicio,
    fin: sumarDias(inicio, 7),
  };
};

export const generarDiasRango = (inicio, fin) => {
  const dias = [];
  let cursor = inicioDelDia(inicio);
  const limite = inicioDelDia(fin);

  while (cursor < limite) {
    dias.push(new Date(cursor));
    cursor = sumarDias(cursor, 1);
  }

  return dias;
};

export const clasificarFacturaAgenda = (factura) => {
  const saldo = Number(factura?.saldo_pendiente) || 0;
  if (saldo <= 0) return null;

  const claveVencimiento = fechaAClave(factura?.vencimiento);
  const fechaVencimiento = claveAFecha(claveVencimiento);

  if (!fechaVencimiento) return null;

  const hoy = inicioDelDia(new Date());
  return fechaVencimiento < hoy ? "VENCIDAS" : "POR_VENCER";
};

export const inferirTipoVinculo = (compromiso = {}) => {
  if (compromiso.tipo_vinculo) {
    return compromiso.tipo_vinculo;
  }

  if (compromiso.factura_id) return "FACTURA";
  if (compromiso.cliente_id && compromiso.cliente_id !== "N/A") {
    return "CLIENTE";
  }

  return "GENERAL";
};

export const construirEventosAgenda = (facturas = [], compromisos = []) => {
  const eventosFacturas = facturas
    .map((factura) => {
      const categoria = clasificarFacturaAgenda(factura);
      const fechaClave = fechaAClave(factura.vencimiento);

      if (!categoria || !fechaClave) return null;

      return {
        id: `factura-${factura.id}`,
        origen: "FACTURA",
        categoria,
        fechaClave,
        fecha: claveAFecha(fechaClave),
        titulo: factura.folio || "Factura sin folio",
        cliente: factura.cliente || "Cliente sin nombre",
        cliente_id: factura.cliente_id || "",
        factura_id: factura.id,
        folio: factura.folio || "S/F",
        monto: Number(factura.saldo_pendiente) || 0,
        telefono: factura.telefono || "",
        estatus: categoria === "VENCIDAS" ? "Vencida" : "Por vencer",
        detalle: factura,
      };
    })
    .filter(Boolean);

  const eventosCompromisos = compromisos
    .map((compromiso) => {
      const fechaClave = fechaAClave(compromiso.fecha_compromiso);
      if (!fechaClave) return null;

      return {
        id: `compromiso-${compromiso.id}`,
        origen: "COMPROMISO",
        categoria: "RECORDATORIOS",
        fechaClave,
        fecha: claveAFecha(fechaClave),
        titulo:
          compromiso.titulo ||
          compromiso.motivo ||
          "Recordatorio sin título",
        motivo: compromiso.motivo || "",
        cliente: compromiso.cliente_nombre || "",
        cliente_id:
          compromiso.cliente_id && compromiso.cliente_id !== "N/A"
            ? compromiso.cliente_id
            : "",
        factura_id: compromiso.factura_id || "",
        folio: compromiso.folio_factura || "",
        monto: Number(compromiso.monto) || 0,
        telefono: compromiso.telefono || "",
        tipoVinculo: inferirTipoVinculo(compromiso),
        tipoEvento: compromiso.tipo_evento || "Recordatorio",
        estatus: compromiso.estatus || "Pendiente",
        ultimaAccion: compromiso.ultima_accion || null,
        detalle: compromiso,
      };
    })
    .filter(Boolean);

  return [...eventosFacturas, ...eventosCompromisos].sort((a, b) => {
    if (a.fechaClave !== b.fechaClave) {
      return a.fechaClave.localeCompare(b.fechaClave);
    }

    return a.categoria.localeCompare(b.categoria);
  });
};

export const agruparEventosPorDia = (eventos = []) =>
  eventos.reduce((acumulado, evento) => {
    if (!acumulado[evento.fechaClave]) {
      acumulado[evento.fechaClave] = [];
    }

    acumulado[evento.fechaClave].push(evento);
    return acumulado;
  }, {});

export const contarCategorias = (eventos = []) => ({
  VENCIDAS: eventos.filter((evento) => evento.categoria === "VENCIDAS").length,
  POR_VENCER: eventos.filter(
    (evento) => evento.categoria === "POR_VENCER",
  ).length,
  RECORDATORIOS: eventos.filter(
    (evento) => evento.categoria === "RECORDATORIOS",
  ).length,
});

export const formatearPeriodo = (inicio, fin, vista) => {
  if (vista === "DIA") {
    return inicio.toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  if (vista === "MES") {
    return inicio.toLocaleDateString("es-MX", {
      month: "long",
      year: "numeric",
    });
  }

  const ultimoDia = sumarDias(fin, -1);
  const mismoMes = inicio.getMonth() === ultimoDia.getMonth();

  if (mismoMes) {
    return `${inicio.getDate()}–${ultimoDia.getDate()} de ${inicio.toLocaleDateString("es-MX", {
      month: "long",
      year: "numeric",
    })}`;
  }

  return `${inicio.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  })} – ${ultimoDia.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
};
</file>

<file path="src/utils/fechas.js">
export const calcularDiasVencidos = (fechaString) => {
    if (!fechaString) return 0;
    
    let dia, mes, anio;

    // Traductor Universal: Entiende YYYY-MM-DD o DD/MM/YYYY
    if (fechaString.includes('-')) {
        [anio, mes, dia] = fechaString.split('-');
    } else if (fechaString.includes('/')) {
        [dia, mes, anio] = fechaString.split('/');
    } else {
        return 0; // Formato desconocido
    }

    const fechaVencimiento = new Date(anio, mes - 1, dia);
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Normalizamos a la medianoche
    
    const diffTime = hoy - fechaVencimiento;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
};
</file>

<file path="src/utils/normalizadores.js">
export const formatearFechaSegura = (fecha, fallback = "Nunca") => {
  if (!fecha) return fallback;

  // Firestore Timestamp normal
  if (fecha?.toDate && typeof fecha.toDate === "function") {
    return fecha.toDate().toLocaleString("es-MX");
  }

  // Timestamp serializado: { seconds, nanoseconds }
  if (typeof fecha === "object" && typeof fecha.seconds === "number") {
    return new Date(fecha.seconds * 1000).toLocaleString("es-MX");
  }

  // Timestamp Admin SDK: { _seconds, _nanoseconds }
  if (typeof fecha === "object" && typeof fecha._seconds === "number") {
    return new Date(fecha._seconds * 1000).toLocaleString("es-MX");
  }

  // Date normal
  if (fecha instanceof Date) {
    return fecha.toLocaleString("es-MX");
  }

  // String
  if (typeof fecha === "string") {
    return fecha;
  }

  return fallback;
};

export const textoSeguro = (valor, fallback = "") => {
  if (valor === null || valor === undefined) return fallback;
  if (typeof valor === "object") return fallback;
  return valor.toString();
};

export const rolSeguro = (usuario) => {
  return (usuario?.permisos?.rol || usuario?.rol || usuario?.role || "")
    .toString()
    .trim()
    .toUpperCase();
};
</file>

<file path="src/utils/normalizarFactura.js">
const completarDosDigitos = (valor) => String(valor).padStart(2, "0");

export const fechaAISO = (fecha) => {
  if (!fecha) return "";

  if (fecha?.toDate && typeof fecha.toDate === "function") {
    const valor = fecha.toDate();
    return `${valor.getFullYear()}-${completarDosDigitos(valor.getMonth() + 1)}-${completarDosDigitos(valor.getDate())}`;
  }

  if (fecha instanceof Date) {
    return `${fecha.getFullYear()}-${completarDosDigitos(fecha.getMonth() + 1)}-${completarDosDigitos(fecha.getDate())}`;
  }

  const texto = String(fecha).trim().split(" ")[0];

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return texto;
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(texto)) {
    const [dia, mes, anio] = texto.split("/");
    return `${anio}-${completarDosDigitos(mes)}-${completarDosDigitos(dia)}`;
  }

  return "";
};

const fechaComparable = (fecha) => {
  const iso = fechaAISO(fecha);
  if (!iso) return null;

  const [anio, mes, dia] = iso.split("-").map(Number);
  const valor = new Date(anio, mes - 1, dia);
  valor.setHours(0, 0, 0, 0);
  return valor;
};

export const calcularEstatusVisibleFactura = (factura = {}) => {
  const saldoPendiente = Number(factura.saldo_pendiente) || 0;

  if (saldoPendiente <= 0) {
    return "Pagada";
  }

  const vencimiento = fechaComparable(factura.vencimiento);

  if (!vencimiento) {
    return factura.estatus || "Pendiente";
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return vencimiento < hoy ? "Vencida" : "Pendiente";
};

const normalizarAbono = (abono = {}) => ({
  ...abono,
  fecha: abono.fecha?.toDate
    ? abono.fecha.toDate().toLocaleString("es-MX")
    : abono.fecha,
});

export const normalizarFacturaData = (id, data = {}) => {
  const abonosRaw = Array.isArray(data.abonos) ? data.abonos : [];

  return {
    id,
    ...data,
    estatus: calcularEstatusVisibleFactura(data),
    emision: fechaAISO(data.emision),
    vencimiento: fechaAISO(data.vencimiento),
    _abonos_raw: abonosRaw,
    abonos: abonosRaw.map(normalizarAbono),
  };
};

export const normalizarFacturaSnapshot = (documento) =>
  normalizarFacturaData(documento.id, documento.data());
</file>

<file path="src/utils/whatsapp.js">
export const normalizarTelefonoMX = (telefono) => {
  let numero = (telefono || "").replace(/\D/g, "");

  // Corrige formato viejo tipo +52 1 4431234567
  if (numero.startsWith("521") && numero.length === 13) {
    numero = `52${numero.slice(3)}`;
  }

  // Si ya viene con lada 52 y son 12 dígitos, lo respetamos
  if (numero.startsWith("52") && numero.length === 12) {
    return numero;
  }

  // Si viene como número mexicano normal de 10 dígitos
  if (numero.length === 10) {
    return `52${numero}`;
  }

  return numero;
};

export const generarMensajeWA = (plantilla, factura = {}) => {
  const cliente = factura.cliente || "cliente";
  const folio = factura.folio || "S/F";
  const vencimiento = factura.vencimiento || "los próximos días";

  const saldoNumero = Number(factura.saldo_pendiente || factura.monto || 0);
  const saldo = saldoNumero.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const templates = {
    atrasado: `Hola ${cliente},

Te contactamos para recordarte que tu factura *${folio}* presenta un saldo vencido de *$${saldo} MXN*.

Te invitamos a regularizar tu cuenta lo antes posible para mantener tu historial al corriente.

Quedamos a tus órdenes para cualquier duda.`,

    proximo: `Hola ${cliente},

Este es un recordatorio amigable de que tu factura *${folio}* por el saldo de *$${saldo} MXN* está próxima a vencer el día *${vencimiento}*.

Agradecemos de antemano tu pago puntual.`,

    manual: `Hola ${cliente},

Te contactamos para dar seguimiento a tu cuenta.

Quedamos atentos a cualquier duda o comentario.`,
  };

  return templates[plantilla] || templates.manual;
};
</file>

<file path="vite.config.js">
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()
  ],
build: {
    minify: 'terser',
    sourcemap: false,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
      },
      mangle: {
        toplevel: true,
      },
      format: {
        comments: false,
      },
    },
  },

})
</file>

<file path="firebase.json">
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
</file>

<file path="src/App.jsx">
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthProvider";
import { GlobalProvider } from "./context/GlobalProvider";
import MainLayout from "./layouts/MainLayout";
import Calendario from "./pages/Calendario";
import Clientes from "./pages/Clientes";
import Dashboard from "./pages/Dashboard";
import ExpedienteCliente from "./pages/ExpedienteCliente";
import Facturacion from "./pages/Facturacion";
import GestionUsuarios from "./pages/GestionUsuarios";
import Login from "./pages/Login";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <GlobalProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="clientes/:id" element={<ExpedienteCliente />} />

              <Route
                path="panel-su"
                element={
                  <ProtectedRoute requiredRole="SU">
                    <GestionUsuarios />
                  </ProtectedRoute>
                }
              />

              <Route path="calendario" element={<Calendario />} />
              <Route path="facturas" element={<Facturacion />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </GlobalProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
</file>

<file path="src/components/ProtectedRoute.jsx">
import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { GlobalContext } from "../context/GlobalContext";

export default function ProtectedRoute({ children, requiredRole }) {
  const { currentUser, userRole, authLoading } = useContext(GlobalContext);

  const rolActual = String(userRole || "").trim().toUpperCase();
  const rolRequerido = String(requiredRole || "").trim().toUpperCase();

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f6f8]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0a192f] mb-3" />

        <p className="text-[#0a192f] text-sm font-medium animate-pulse">
          Verificando acceso protegido...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (rolRequerido && rolActual !== rolRequerido) {
    return <Navigate to="/" replace />;
  }

  return children || <Outlet />;
}
</file>

<file path="src/context/AuthProvider.jsx">
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { AuthContext } from "./AuthContext";

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const ultimoAccesoRegistradoRef = useRef(null);

  const limpiarContexto = useCallback(() => {
    ultimoAccesoRegistradoRef.current = null;
    setCurrentUser(null);
    setUserRole(null);
    setUserName("");
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError("");
    localStorage.removeItem("authError");
  }, []);

  const registrarErrorAcceso = useCallback((mensaje) => {
    setAuthError(mensaje);
    localStorage.setItem("authError", mensaje);
  }, []);

  const logoutSesion = useCallback(async () => {
    limpiarContexto();

    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      setLoading(false);
    }
  }, [limpiarContexto]);

  useEffect(() => {
    let unsubscribeSnapshot = null;

    const detenerEscuchaPerfil = () => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }
    };

    const expulsarUsuario = async (mensaje) => {
      registrarErrorAcceso(mensaje);
      detenerEscuchaPerfil();
      await logoutSesion();
    };

    const registrarUltimaEntrada = (userRef, uid) => {
      if (ultimoAccesoRegistradoRef.current === uid) {
        return;
      }

      ultimoAccesoRegistradoRef.current = uid;

      updateDoc(userRef, {
        ultima_entrada: serverTimestamp(),
        ultimoLogin: serverTimestamp(),
        fecha_actualizacion: serverTimestamp(),
      }).catch((error) => {
        console.warn("No se pudo registrar la última entrada:", error);
      });
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      detenerEscuchaPerfil();

      if (!user) {
        limpiarContexto();
        setLoading(false);
        return;
      }

      const userRef = doc(db, "usuarios", user.uid);

      unsubscribeSnapshot = onSnapshot(
        userRef,
        (docSnap) => {
          if (!docSnap.exists()) {
            void expulsarUsuario(
              "Acceso Denegado: No tienes un perfil de acceso registrado en el sistema.",
            );
            return;
          }

          const data = docSnap.data();

          if (data.activo !== true) {
            void expulsarUsuario(
              "Acceso Denegado: Tu cuenta se encuentra inactiva o suspendida por el Súper Usuario.",
            );
            return;
          }

          const rolNormalizado = String(data.rol || "")
            .trim()
            .toUpperCase();

          if (!["SU", "ADMIN"].includes(rolNormalizado)) {
            void expulsarUsuario(
              "Acceso Denegado: Tu perfil no cuenta con permisos operativos válidos.",
            );
            return;
          }

          registrarUltimaEntrada(userRef, user.uid);

          setCurrentUser(user);
          setUserRole(rolNormalizado);
          setUserName(data.nombre || user.displayName || "Usuario");
          setLoading(false);
        },
        (error) => {
          console.error(
            "Error del guardián escuchando al usuario:",
            error,
          );

          void expulsarUsuario(
            "No fue posible validar tu perfil de acceso. Intenta iniciar sesión nuevamente.",
          );
        },
      );
    });

    return () => {
      unsubscribeAuth();
      detenerEscuchaPerfil();
    };
  }, [
    limpiarContexto,
    logoutSesion,
    registrarErrorAcceso,
  ]);

  const contextValue = useMemo(
    () => ({
      currentUser,
      userRole,
      userName,
      loading,
      authError,
      clearAuthError,
      logoutSesion,
    }),
    [
      currentUser,
      userRole,
      userName,
      loading,
      authError,
      clearAuthError,
      logoutSesion,
    ],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f6f8]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0a192f] mb-3" />
        <p className="text-[#0a192f] text-sm font-medium animate-pulse">
          Autenticando sesión segura...
        </p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
</file>

<file path="src/hooks/useFacturasCliente.js">
import { useCallback, useEffect, useRef, useState } from "react";

import { facturasClienteService } from "../services/facturasClienteService";

const RESUMEN_INICIAL = {
  totalFacturas: 0,
  facturasPagadas: 0,
  facturasPendientes: 0,
  facturasVencidas: 0,
  totalFacturado: 0,
  saldoActual: 0,
  saldoVencido: 0,
  resumenLimitado: false,
};

export const useFacturasCliente = ({
  clienteId = "",
  filtroFacturas = "Historial",
  pageSize = 8,
  enabled = true,
} = {}) => {
  const [facturas, setFacturas] = useState([]);
  const [resumen, setResumen] = useState(RESUMEN_INICIAL);
  const [cargando, setCargando] = useState(false);
  const [cargandoResumen, setCargandoResumen] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [pagina, setPagina] = useState(1);
  const [haySiguiente, setHaySiguiente] = useState(false);
  const [cursorSiguiente, setCursorSiguiente] = useState(null);
  const [cursores, setCursores] = useState([null]);

  const solicitudActiva = useRef(0);
  const resumenActivo = useRef(0);

  const cargarResumen = useCallback(async () => {
    if (!enabled || !clienteId) {
      setResumen(RESUMEN_INICIAL);
      setCargandoResumen(false);
      return;
    }

    const numeroResumen = resumenActivo.current + 1;
    resumenActivo.current = numeroResumen;
    setCargandoResumen(true);

    const respuesta = await facturasClienteService.consultarResumenCliente(
      clienteId,
    );

    if (numeroResumen !== resumenActivo.current) return;

    if (respuesta.success) {
      setResumen(respuesta.resumen || RESUMEN_INICIAL);
    } else {
      setResumen(RESUMEN_INICIAL);
      setMensaje(respuesta.error || "No se pudo calcular el resumen.");
    }

    setCargandoResumen(false);
  }, [clienteId, enabled]);

  const ejecutarConsulta = useCallback(
    async ({ paginaDestino = 1, cursoresDestino = [null] } = {}) => {
      if (!enabled || !clienteId) {
        setFacturas([]);
        setHaySiguiente(false);
        setCursorSiguiente(null);
        setPagina(1);
        setCursores([null]);
        setCargando(false);
        return;
      }

      const numeroSolicitud = solicitudActiva.current + 1;
      solicitudActiva.current = numeroSolicitud;
      setCargando(true);
      setError("");

      const cursor = cursoresDestino[paginaDestino - 1] || null;
      const respuesta = await facturasClienteService.consultarPaginaCliente({
        clienteId,
        pageSize,
        cursor,
        filtroFacturas,
      });

      if (numeroSolicitud !== solicitudActiva.current) return;

      if (!respuesta.success) {
        setFacturas([]);
        setHaySiguiente(false);
        setCursorSiguiente(null);
        setMensaje("");
        setError(respuesta.error || "No se pudieron cargar las facturas.");
        setCargando(false);
        return;
      }

      setFacturas(respuesta.facturas || []);
      setHaySiguiente(Boolean(respuesta.haySiguiente));
      setCursorSiguiente(respuesta.cursorSiguiente || null);
      setMensaje(respuesta.mensaje || "");
      setPagina(paginaDestino);
      setCursores(cursoresDestino);
      setCargando(false);
    },
    [clienteId, enabled, filtroFacturas, pageSize],
  );

  useEffect(() => {
    let cancelado = false;

    const temporizador = setTimeout(() => {
      if (cancelado) return;

      ejecutarConsulta({ paginaDestino: 1, cursoresDestino: [null] });
    }, 150);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [ejecutarConsulta]);

  useEffect(() => {
    let cancelado = false;

    const temporizador = setTimeout(() => {
      if (cancelado) return;

      cargarResumen();
    }, 150);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [cargarResumen]);

  const siguientePagina = useCallback(async () => {
    if (cargando || !haySiguiente || !cursorSiguiente || !facturas.length) {
      return false;
    }

    const nuevosCursores = [
      ...cursores.slice(0, pagina),
      cursorSiguiente,
    ];

    await ejecutarConsulta({
      paginaDestino: pagina + 1,
      cursoresDestino: nuevosCursores,
    });

    return true;
  }, [
    cargando,
    haySiguiente,
    cursorSiguiente,
    facturas.length,
    cursores,
    pagina,
    ejecutarConsulta,
  ]);

  const paginaAnterior = useCallback(async () => {
    if (cargando || pagina <= 1) return false;

    const nuevosCursores = cursores.slice(0, pagina - 1);

    await ejecutarConsulta({
      paginaDestino: pagina - 1,
      cursoresDestino: nuevosCursores,
    });

    return true;
  }, [cargando, pagina, cursores, ejecutarConsulta]);

  const recargar = useCallback(async () => {
    await Promise.all([
      ejecutarConsulta({ paginaDestino: pagina, cursoresDestino: cursores }),
      cargarResumen(),
    ]);
  }, [cargarResumen, cursores, ejecutarConsulta, pagina]);

  return {
    facturas,
    resumen,
    cargando,
    cargandoResumen,
    error,
    mensaje,
    pagina,
    hayAnterior: pagina > 1,
    haySiguiente,
    siguientePagina,
    paginaAnterior,
    recargar,
  };
};
</file>

<file path="src/hooks/useFacturasPaginadas.js">
import { useCallback, useEffect, useRef, useState } from "react";

import { facturasConsultaService } from "../services/facturasConsultaService";

export const useFacturasPaginadas = ({
  pageSize = 25,
  busqueda = "",
  clienteId = "",
  filtroEstatus = "Todas",
  fechaInicio = "",
  fechaFin = "",
  enabled = true,
}) => {
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [pagina, setPagina] = useState(1);
  const [haySiguiente, setHaySiguiente] = useState(false);
  const [cursorSiguiente, setCursorSiguiente] = useState(null);
  const [cursores, setCursores] = useState([null]);

  const solicitudActiva = useRef(0);

  const ejecutarConsulta = useCallback(
    async ({ paginaDestino = 1, cursoresDestino = [null] } = {}) => {
      if (!enabled) {
        setFacturas([]);
        setHaySiguiente(false);
        setCursorSiguiente(null);
        setPagina(1);
        setCursores([null]);
        setMensaje("");
        setError("");
        setCargando(false);
        return;
      }

      const numeroSolicitud = solicitudActiva.current + 1;
      solicitudActiva.current = numeroSolicitud;
      setCargando(true);
      setError("");

      const cursor = cursoresDestino[paginaDestino - 1] || null;
      const respuesta = await facturasConsultaService.consultarPagina({
        pageSize,
        cursor,
        busqueda,
        clienteId,
        filtroEstatus,
        fechaInicio,
        fechaFin,
      });

      if (numeroSolicitud !== solicitudActiva.current) {
        return;
      }

      if (!respuesta.success) {
        setFacturas([]);
        setHaySiguiente(false);
        setCursorSiguiente(null);
        setMensaje("");
        setError(respuesta.error || "No se pudieron cargar las facturas.");
        setCargando(false);
        return;
      }

      setFacturas(respuesta.facturas || []);
      setHaySiguiente(Boolean(respuesta.haySiguiente));
      setCursorSiguiente(respuesta.cursorSiguiente || null);
      setMensaje(respuesta.mensaje || "");
      setPagina(paginaDestino);
      setCursores(cursoresDestino);
      setCargando(false);
    },
    [
      enabled,
      pageSize,
      busqueda,
      clienteId,
      filtroEstatus,
      fechaInicio,
      fechaFin,
    ],
  );

  useEffect(() => {
    let cancelado = false;

    const temporizador = setTimeout(() => {
      if (cancelado) return;

      ejecutarConsulta({ paginaDestino: 1, cursoresDestino: [null] });
    }, 200);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [ejecutarConsulta]);

  const siguientePagina = useCallback(async () => {
    if (
      cargando ||
      !haySiguiente ||
      !cursorSiguiente ||
      facturas.length === 0
    ) {
      return false;
    }

    const nuevosCursores = [
      ...cursores.slice(0, pagina),
      cursorSiguiente,
    ];

    await ejecutarConsulta({
      paginaDestino: pagina + 1,
      cursoresDestino: nuevosCursores,
    });

    return true;
  }, [
    cargando,
    haySiguiente,
    cursorSiguiente,
    facturas.length,
    cursores,
    pagina,
    ejecutarConsulta,
  ]);

  const paginaAnterior = useCallback(async () => {
    if (cargando || pagina <= 1) return false;

    const nuevosCursores = cursores.slice(0, pagina - 1);

    await ejecutarConsulta({
      paginaDestino: pagina - 1,
      cursoresDestino: nuevosCursores,
    });

    return true;
  }, [cargando, pagina, cursores, ejecutarConsulta]);

  const recargar = useCallback(async () => {
    await ejecutarConsulta({
      paginaDestino: pagina,
      cursoresDestino: cursores,
    });
  }, [ejecutarConsulta, pagina, cursores]);

  return {
    facturas,
    cargando,
    error,
    mensaje,
    pagina,
    hayAnterior: pagina > 1,
    haySiguiente,
    siguientePagina,
    paginaAnterior,
    recargar,
  };
};
</file>

<file path="src/services/clientesService.js">
import { db } from "../config/firebase";
import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

const normalizarGrupo = (valor = "GENERAL") =>
  valor
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase() || "GENERAL";

const normalizarPagareInicial = (valor) => {
  if (valor === true || valor === "SI" || valor === "Sí" || valor === "si") {
    return true;
  }

  if (valor === false || valor === "NO" || valor === "No" || valor === "no") {
    return false;
  }

  return null;
};

const mapearErrorFirestore = (error) => {
  if (error?.code === "resource-exhausted") {
    return "La cuota diaria de Firestore fue agotada. La operación no pudo completarse.";
  }

  if (error?.code === "permission-denied") {
    return "Firestore rechazó la operación por permisos. Verifica las reglas publicadas.";
  }

  return error?.message || "No se pudo completar la operación del cliente.";
};

export const clientesService = {
  crearCliente: async (
    clienteData,
    userName,
    actor_uid,
    userRole,
  ) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    try {
      const batch = writeBatch(db);
      const rolResponsable = userRole || "ADMIN";

      const limiteAsignado = Math.max(
        0,
        Number(clienteData.limite_credito) || 0,
      );

      const pagareInicial = normalizarPagareInicial(
        clienteData.pagare_inicial,
      );

      const nuevoDocRef = doc(collection(db, "clientes"));
      const movimientoLineaRef = doc(
        collection(db, "lineas_credito_movimientos"),
      );
      const resumenLineaRef = doc(
        db,
        "lineas_credito_resumen_clientes",
        nuevoDocRef.id,
      );

      const folioManual = String(
        clienteData.numero_cliente || clienteData.id || "",
      ).trim();

      const personalAutorizaLinea = String(
        clienteData.linea_credito_autorizado_por ||
          clienteData.personal_autoriza ||
          "",
      ).trim();

      const motivoLinea = String(
        clienteData.linea_credito_motivo ||
          clienteData.motivo_linea_credito ||
          "Línea inicial registrada al crear el expediente.",
      ).trim();

      const estadoLinea = limiteAsignado > 0 ? "Activa" : "Sin línea";
      const autorizadoPor = personalAutorizaLinea || "SIN AUTORIZADOR";

      const clienteProcesado = {
        numero_cliente: folioManual,
        cliente_id: nuevoDocRef.id,
        nombre: String(clienteData.nombre || "").trim(),
        rfc: String(clienteData.rfc || "").trim().toUpperCase(),
        telefono: String(clienteData.telefono || "").trim(),
        correo: String(clienteData.correo || "").trim().toLowerCase(),
        direccion: String(clienteData.direccion || "").trim(),
        ultima_fecha_pago: clienteData.ultima_fecha_pago || "",
        grupo: normalizarGrupo(clienteData.grupo),
        segmentacion: clienteData.segmentacion || "Nuevo",
        dias_mensaje: Number(clienteData.dias_mensaje) || 0,
        pagare_inicial: pagareInicial,
        pagare_monto: Number(clienteData.pagare_monto) || 0,
        pagare_fecha: clienteData.pagare_fecha || "",
        notas_internas: String(
          clienteData.notas || clienteData.notas_internas || "",
        ).trim(),
        limite_credito: limiteAsignado,
        deuda_actual: 0,
        credito_disponible: limiteAsignado,
        linea_credito_estado: estadoLinea,
        linea_credito_autorizado_por: autorizadoPor,
        linea_credito_ultimo_movimiento: movimientoLineaRef.id,
        linea_credito_actualizada_en: serverTimestamp(),
        linea_credito_actualizada_por: userName || "Sistema",
        linea_credito_actualizada_por_uid: actor_uid,
        monto_ultimo_pago: null,
        fecha_ultimo_pago: null,
        clasificacion: "activo",
        activo: true,
        estatus: "Activo",
        createdAt: serverTimestamp(),
        createdBy: userName || "Sistema",
      };

      const camposObligatorios = [
        [clienteProcesado.numero_cliente, "El número de cliente es obligatorio."],
        [clienteProcesado.nombre, "El nombre del cliente es obligatorio."],
        [clienteProcesado.rfc, "El RFC del cliente es obligatorio."],
        [clienteProcesado.telefono, "El teléfono del cliente es obligatorio."],
        [clienteProcesado.direccion, "La dirección del cliente es obligatoria."],
      ];

      const campoFaltante = camposObligatorios.find(
        ([valor]) => !String(valor || "").trim(),
      );

      if (campoFaltante) {
        throw new Error(campoFaltante[1]);
      }

      if (pagareInicial === null) {
        throw new Error("Indica si el cliente cuenta con pagaré inicial.");
      }

      if (limiteAsignado > 0 && !personalAutorizaLinea) {
        throw new Error(
          "El personal que autoriza es obligatorio cuando existe límite inicial.",
        );
      }

      if (limiteAsignado > 0 && !motivoLinea) {
        throw new Error(
          "El motivo de la línea inicial es obligatorio cuando existe límite inicial.",
        );
      }

      batch.set(nuevoDocRef, clienteProcesado);

      batch.set(movimientoLineaRef, {
        id: movimientoLineaRef.id,
        actor_uid,
        cliente_id: nuevoDocRef.id,
        cliente: clienteProcesado.nombre,
        tipo_movimiento: "ALTA_INICIAL",
        limite_anterior: 0,
        limite_nuevo: limiteAsignado,
        diferencia: limiteAsignado,
        deuda_actual: 0,
        credito_disponible_resultante: limiteAsignado,
        estado_resultante: estadoLinea,
        personal_autoriza: autorizadoPor,
        motivo: motivoLinea,
        registrado_por_uid: actor_uid,
        registrado_por_nombre: userName || "Sistema",
        registrado_por_rol: rolResponsable,
        createdAt: serverTimestamp(),
      });

      batch.set(resumenLineaRef, {
        id: nuevoDocRef.id,
        cliente_id: nuevoDocRef.id,
        cliente: clienteProcesado.nombre,
        limite_actual: limiteAsignado,
        deuda_actual: 0,
        credito_disponible_actual: limiteAsignado,
        estado_resultante: estadoLinea,
        ultimo_tipo_movimiento: "ALTA_INICIAL",
        ultimo_personal_autoriza: autorizadoPor,
        ultimo_registrado_por: userName || "Sistema",
        ultimo_registrado_por_uid: actor_uid,
        ultimo_registrado_por_rol: rolResponsable,
        ultimo_movimiento_id: movimientoLineaRef.id,
        ultimo_movimiento_at: serverTimestamp(),
        total_movimientos: 1,
        activo: true,
      });

      const actividadRef = doc(collection(db, "actividad"));

      batch.set(actividadRef, {
        actor_uid,
        usuario: userName || "Sistema",
        modulo: "Clientes",
        tipo: "Creación",
        cliente: clienteProcesado.nombre,
        detalle: `Se registró un nuevo cliente por ${rolResponsable} con un límite de crédito inicial de $${limiteAsignado.toLocaleString("es-MX")} y pagaré inicial: ${pagareInicial ? "Sí" : "No"}.`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return {
        success: true,
        data: {
          ...clienteProcesado,
          id: nuevoDocRef.id,
        },
      };
    } catch (error) {
      console.error("Error al crear cliente:", error);

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  modificarCliente: async (
    id,
    datosActualizados,
    nombreCliente,
    userName,
    actor_uid,
  ) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    try {
      const camposPermitidos = [
        "nombre",
        "numero_cliente",
        "rfc",
        "telefono",
        "correo",
        "direccion",
        "grupo",
        "segmentacion",
        "dias_mensaje",
        "pagare_inicial",
        "pagare_monto",
        "pagare_fecha",
        "notas_internas",
      ];

      const datosSeguros = {};

      camposPermitidos.forEach((campo) => {
        if (Object.prototype.hasOwnProperty.call(datosActualizados, campo)) {
          datosSeguros[campo] = datosActualizados[campo];
        }
      });

      if (Object.prototype.hasOwnProperty.call(datosSeguros, "grupo")) {
        datosSeguros.grupo = normalizarGrupo(datosSeguros.grupo);
      }

      if (Object.prototype.hasOwnProperty.call(datosSeguros, "dias_mensaje")) {
        datosSeguros.dias_mensaje = Number(datosSeguros.dias_mensaje) || 0;
      }

      if (Object.prototype.hasOwnProperty.call(datosSeguros, "pagare_inicial")) {
        const pagareInicial = normalizarPagareInicial(datosSeguros.pagare_inicial);

        if (pagareInicial === null) {
          throw new Error("Indica si el cliente cuenta con pagaré inicial.");
        }

        datosSeguros.pagare_inicial = pagareInicial;
      }

      if (Object.prototype.hasOwnProperty.call(datosSeguros, "pagare_monto")) {
        datosSeguros.pagare_monto = Number(datosSeguros.pagare_monto) || 0;
      }

      if (Object.prototype.hasOwnProperty.call(datosSeguros, "correo")) {
        datosSeguros.correo = String(datosSeguros.correo || "")
          .trim()
          .toLowerCase();
      }

      if (Object.prototype.hasOwnProperty.call(datosSeguros, "rfc")) {
        datosSeguros.rfc = String(datosSeguros.rfc || "")
          .trim()
          .toUpperCase();
      }

      if (Object.keys(datosSeguros).length === 0) {
        throw new Error("No se recibieron campos editables.");
      }

      const batch = writeBatch(db);
      const clienteRef = doc(db, "clientes", id);

      batch.update(clienteRef, {
        ...datosSeguros,
        updatedAt: serverTimestamp(),
      });

      const actividadRef = doc(collection(db, "actividad"));

      batch.set(actividadRef, {
        actor_uid,
        usuario: userName || "Sistema",
        modulo: "Clientes",
        tipo: "Actualización",
        cliente: datosSeguros.nombre || nombreCliente || "S/N",
        detalle: "Se actualizaron los datos generales del expediente del cliente.",
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return { success: true };
    } catch (error) {
      console.error("Error al actualizar cliente:", error);

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  eliminarCliente: async (
    id,
    nombreCliente,
    userName,
    actor_uid,
    motivo = "",
  ) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    try {
      const motivoLimpio = String(motivo || "").trim();

      if (!motivoLimpio) {
        throw new Error("El motivo de inactivación es obligatorio.");
      }

      const batch = writeBatch(db);
      const clienteRef = doc(db, "clientes", id);

      batch.update(clienteRef, {
        activo: false,
        estatus: "Inactivo",
        inactivo_motivo: motivoLimpio,
        inactivo_por: userName || "Sistema",
        inactivo_por_uid: actor_uid,
        inactivo_at: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const actividadRef = doc(collection(db, "actividad"));

      batch.set(actividadRef, {
        actor_uid,
        usuario: userName || "Sistema",
        modulo: "Clientes",
        tipo: "Inactivación",
        cliente: nombreCliente || "S/N",
        motivo: motivoLimpio,
        detalle: `Se inactivó el expediente del cliente. Motivo: ${motivoLimpio}. Sus facturas y abonos fueron conservados.`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return { success: true };
    } catch (error) {
      console.error("Error al inactivar cliente:", error);

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  reactivarCliente: async (
    id,
    nombreCliente,
    userName,
    actor_uid,
    motivo = "",
  ) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    try {
      const motivoLimpio = String(motivo || "").trim();

      if (!motivoLimpio) {
        throw new Error("El motivo de reactivación es obligatorio.");
      }

      const batch = writeBatch(db);
      const clienteRef = doc(db, "clientes", id);

      batch.update(clienteRef, {
        activo: true,
        estatus: "Activo",
        reactivado_motivo: motivoLimpio,
        reactivado_por: userName || "Sistema",
        reactivado_por_uid: actor_uid,
        reactivado_at: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const actividadRef = doc(collection(db, "actividad"));

      batch.set(actividadRef, {
        actor_uid,
        usuario: userName || "Sistema",
        modulo: "Clientes",
        tipo: "Reactivación",
        cliente: nombreCliente || "S/N",
        motivo: motivoLimpio,
        detalle: `Se reactivó el expediente del cliente. Motivo: ${motivoLimpio}.`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return { success: true };
    } catch (error) {
      console.error("Error al reactivar cliente:", error);

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },
};
</file>

<file path="src/services/solicitudesService.js">
import { db } from "../config/firebase";
import { facturasService } from "./facturasService";
import {
  collection,
  doc,
  getDoc,
  increment,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

const SOLICITUDES_COLLECTION = "solicitudes";
const SOLICITUDES_NOTAS_CREDITO_COLLECTION = "solicitudes_notas_credito";
const RESUMEN_NOTAS_CREDITO_COLLECTION = "notas_credito_resumen_clientes";
const CLIENTES_COLLECTION = "clientes";
const ACTIVIDAD_COLLECTION = "actividad";

const mapearErrorFirestore = (error) => {
  if (error?.code === "resource-exhausted") {
    return "La cuota diaria de Firestore fue agotada. La solicitud no pudo procesarse. Espera al restablecimiento de la cuota o utiliza el emulador local.";
  }

  if (error?.code === "permission-denied") {
    return "Firestore rechazó la operación por permisos. Verifica que las reglas publicadas coincidan con firestore.rules.";
  }

  if (error?.code === "aborted") {
    return "La solicitud cambió mientras se procesaba. Recarga la página e intenta nuevamente.";
  }

  if (error?.code === "unavailable") {
    return "Firestore no está disponible en este momento. Revisa tu conexión.";
  }

  return error?.message || "No se pudo completar la operación de crédito.";
};

const resumenNotaRefPorCliente = (clienteId) =>
  doc(db, RESUMEN_NOTAS_CREDITO_COLLECTION, String(clienteId || "sin-cliente"));

const setResumenNuevaSolicitudNota = (batch, payload) => {
  if (!payload.cliente_id) return;

  const resumenRef = resumenNotaRefPorCliente(payload.cliente_id);
  const monto = Number(payload.monto_nota) || 0;

  batch.set(
    resumenRef,
    {
      id: payload.cliente_id,
      cliente_id: payload.cliente_id,
      cliente: payload.cliente || "S/N",
      total_solicitudes: increment(1),
      pendientes: increment(1),
      autorizadas: increment(0),
      rechazadas: increment(0),
      anuladas: increment(0),
      monto_total_notas: increment(monto),
      ultimo_estado: "Pendiente",
      ultimo_monto_nota: monto,
      ultimo_folio: payload.folio || "S/F",
      ultimo_movimiento_at: serverTimestamp(),
      ultimo_solicitado_por: payload.solicitado_por_nombre || "ADMIN",
      activo: true,
    },
    { merge: true },
  );
};

const setResumenResolucionNota = (writer, solicitud, decision, actorNombre) => {
  if (!solicitud?.cliente_id) return;

  const resumenRef = resumenNotaRefPorCliente(solicitud.cliente_id);
  const monto = Number(solicitud.monto_nota) || 0;
  const campoResultado = decision === "Autorizado" ? "autorizadas" : "rechazadas";

  writer.set(
    resumenRef,
    {
      id: solicitud.cliente_id,
      cliente_id: solicitud.cliente_id,
      cliente: solicitud.cliente || "S/N",
      pendientes: increment(-1),
      [campoResultado]: increment(1),
      ultimo_estado: decision,
      ultimo_monto_nota: monto,
      ultimo_folio: solicitud.folio || "S/F",
      ultimo_movimiento_at: serverTimestamp(),
      ultimo_resuelto_por: actorNombre || "SU",
      activo: true,
    },
    { merge: true },
  );
};

const actualizarResumenNotaAutorizada = async (solicitud, actorNombre) => {
  if (!solicitud?.cliente_id) return;

  const batch = writeBatch(db);
  setResumenResolucionNota(batch, solicitud, "Autorizado", actorNombre);
  await batch.commit();
};

export const solicitudesService = {
  crearSolicitudAumento: async ({
    cliente_id,
    cliente,
    monto_incremento,
    limite_anterior,
    motivo,
    solicitado_por_uid,
    solicitado_por_nombre,
  }) => {
    try {
      if (!cliente_id) {
        throw new Error(
          "El identificador del cliente es obligatorio.",
        );
      }

      if (!solicitado_por_uid) {
        throw new Error(
          "No se identificó al usuario solicitante.",
        );
      }

      const monto = Number(monto_incremento);

      if (!Number.isFinite(monto) || monto <= 0) {
        throw new Error(
          "El monto del incremento debe ser mayor a cero.",
        );
      }

      const limiteAnterior =
        Number(limite_anterior) || 0;

      const solicitudRef = doc(
        collection(db, SOLICITUDES_COLLECTION),
      );

      const payload = {
        id: solicitudRef.id,
        cliente_id,
        cliente: String(cliente || "S/N"),
        monto_incremento: monto,
        limite_anterior: limiteAnterior,
        nuevo_limite_propuesto:
          limiteAnterior + monto,
        motivo: String(motivo || "").trim(),
        estatus: "Pendiente",
        solicitado_por_uid,
        solicitado_por_nombre:
          solicitado_por_nombre || "ADMIN",
        createdAt: serverTimestamp(),
      };

      const batch = writeBatch(db);
      batch.set(solicitudRef, payload);

      const actividadRef = doc(
        collection(db, ACTIVIDAD_COLLECTION),
      );

      batch.set(actividadRef, {
        actor_uid: solicitado_por_uid,
        usuario:
          solicitado_por_nombre || "ADMIN",
        modulo: "Crédito",
        tipo: "Solicitud de Aumento",
        cliente: payload.cliente,
        detalle: `Solicitó un aumento de $${monto.toLocaleString("es-MX")} para la línea de crédito. La solicitud quedó pendiente de autorización.`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return {
        success: true,
        data: payload,
      };
    } catch (error) {
      console.error(
        "Error creando solicitud de crédito:",
        error,
      );

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  aplicarAumentoDirectoSU: async ({
    cliente_id,
    cliente_nombre,
    monto_incremento,
    limite_actual,
    actor_uid,
    actor_nombre,
  }) => {
    try {
      if (!cliente_id) {
        throw new Error(
          "El identificador del cliente es obligatorio.",
        );
      }

      if (!actor_uid) {
        throw new Error(
          "No se identificó al Súper Usuario responsable.",
        );
      }

      const monto = Number(monto_incremento);

      if (!Number.isFinite(monto) || monto <= 0) {
        throw new Error(
          "El monto del incremento debe ser mayor a cero.",
        );
      }

      const batch = writeBatch(db);
      const clienteRef = doc(
        db,
        CLIENTES_COLLECTION,
        cliente_id,
      );

      batch.update(clienteRef, {
        limite_credito: increment(monto),
        credito_disponible: increment(monto),
        updatedAt: serverTimestamp(),
      });

      const nuevoLimiteTotal =
        (Number(limite_actual) || 0) + monto;

      const actividadRef = doc(
        collection(db, ACTIVIDAD_COLLECTION),
      );

      batch.set(actividadRef, {
        actor_uid,
        usuario: actor_nombre || "SU",
        modulo: "Crédito",
        tipo: "Aumento Directo",
        cliente: cliente_nombre || "S/N",
        detalle: `El SU autorizó directamente un aumento de $${monto.toLocaleString("es-MX")}. El límite quedó en $${nuevoLimiteTotal.toLocaleString("es-MX")}.`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return { success: true };
    } catch (error) {
      console.error(
        "Error aplicando aumento directo:",
        error,
      );

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },


  crearSolicitudNotaCredito: async ({
    factura,
    montoNota,
    motivo,
    observaciones,
    solicitado_por_uid,
    solicitado_por_nombre,
  }) => {
    try {
      if (!factura?.id) {
        throw new Error("No se identificó la factura para solicitar la nota de crédito.");
      }

      if (!solicitado_por_uid) {
        throw new Error("No se identificó al usuario solicitante.");
      }

      const monto = Number(montoNota);
      const saldoActual = Number(factura.saldo_pendiente) || 0;

      if (!Number.isFinite(monto) || monto <= 0) {
        throw new Error("El monto de la nota de crédito debe ser mayor a cero.");
      }

      if (monto > saldoActual) {
        throw new Error("La nota de crédito no puede superar el saldo pendiente.");
      }

      if (!String(motivo || "").trim()) {
        throw new Error("El motivo de la nota de crédito es obligatorio.");
      }

      const solicitudRef = doc(
        collection(db, SOLICITUDES_NOTAS_CREDITO_COLLECTION),
      );

      const payload = {
        id: solicitudRef.id,
        tipo_solicitud: "NOTA_CREDITO",
        factura_id: factura.id,
        folio: String(factura.folio || "S/F"),
        cliente_id: String(factura.cliente_id || ""),
        cliente: String(factura.cliente || "S/N"),
        monto_nota: monto,
        saldo_actual: saldoActual,
        motivo: String(motivo || "").trim(),
        observaciones: String(observaciones || "").trim(),
        estatus: "Pendiente",
        solicitado_por_uid,
        solicitado_por_nombre: solicitado_por_nombre || "ADMIN",
        createdAt: serverTimestamp(),
      };

      const batch = writeBatch(db);
      batch.set(solicitudRef, payload);
      setResumenNuevaSolicitudNota(batch, payload);

      const actividadRef = doc(
        collection(db, ACTIVIDAD_COLLECTION),
      );

      batch.set(actividadRef, {
        actor_uid: solicitado_por_uid,
        usuario: solicitado_por_nombre || "ADMIN",
        modulo: "Facturación",
        tipo: "Solicitud de Nota de Crédito",
        cliente: payload.cliente,
        factura_id: payload.factura_id,
        folio: payload.folio,
        detalle: `Solicitó una nota de crédito por $${monto.toLocaleString("es-MX")} para la factura ${payload.folio}. Motivo: ${payload.motivo}.`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return {
        success: true,
        data: payload,
      };
    } catch (error) {
      console.error(
        "Error creando solicitud de nota de crédito:",
        error,
      );

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  resolverSolicitudNotaCredito: async ({
    solicitud_id,
    decision,
    actor_uid,
    actor_nombre,
    motivo_resolucion = "",
  }) => {
    try {
      if (!solicitud_id || !decision || !actor_uid) {
        throw new Error("Faltan datos obligatorios para resolver la solicitud.");
      }

      if (!["Autorizado", "Rechazado"].includes(decision)) {
        throw new Error("La decisión indicada no es válida.");
      }

      const solicitudRef = doc(
        db,
        SOLICITUDES_NOTAS_CREDITO_COLLECTION,
        solicitud_id,
      );

      const solicitudSnap = await getDoc(solicitudRef);

      if (!solicitudSnap.exists()) {
        throw new Error("La solicitud de nota de crédito no existe.");
      }

      const solicitudData = {
        id: solicitudSnap.id,
        ...solicitudSnap.data(),
      };

      if (solicitudData.estatus !== "Pendiente") {
        throw new Error(
          `La solicitud ya fue resuelta como ${solicitudData.estatus}.`,
        );
      }

      if (decision === "Autorizado") {
        const resultadoAutorizacion = await facturasService.aplicarNotaCredito({
          factura: { id: solicitudData.factura_id },
          montoNota: solicitudData.monto_nota,
          motivo: solicitudData.motivo,
          observaciones: solicitudData.observaciones,
          userName: actor_nombre || "SU",
          actor_uid,
          solicitudNotaId: solicitudData.id,
        });

        if (resultadoAutorizacion.success) {
          await actualizarResumenNotaAutorizada(
            solicitudData,
            actor_nombre || "SU",
          );
        }

        return resultadoAutorizacion;
      }

      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(solicitudRef);

        if (!snap.exists()) {
          throw new Error("La solicitud de nota de crédito no existe.");
        }

        const solicitud = snap.data();

        if (solicitud.estatus !== "Pendiente") {
          throw new Error(
            `La solicitud ya fue resuelta como ${solicitud.estatus}.`,
          );
        }

        transaction.update(solicitudRef, {
          estatus: "Rechazado",
          resolvedAt: serverTimestamp(),
          resolvedBy: actor_nombre || "SU",
          resolvedByUid: actor_uid,
          motivo_resolucion: String(motivo_resolucion || "").trim(),
        });

        setResumenResolucionNota(
          transaction,
          solicitud,
          "Rechazado",
          actor_nombre || "SU",
        );

        const actividadRef = doc(
          collection(db, ACTIVIDAD_COLLECTION),
        );

        transaction.set(actividadRef, {
          actor_uid,
          usuario: actor_nombre || "SU",
          modulo: "Facturación",
          tipo: "Rechazo de Nota de Crédito",
          cliente: solicitud.cliente || "S/N",
          factura_id: solicitud.factura_id || "",
          folio: solicitud.folio || "S/F",
          motivo_resolucion: String(motivo_resolucion || "").trim(),
          detalle: `El SU rechazó la solicitud de nota de crédito por $${(Number(solicitud.monto_nota) || 0).toLocaleString("es-MX")} de la factura ${solicitud.folio || "S/F"}.${String(motivo_resolucion || "").trim() ? ` Motivo: ${String(motivo_resolucion || "").trim()}.` : ""}`,
          serverTime: serverTimestamp(),
        });
      });

      return { success: true };
    } catch (error) {
      console.error(
        "Fallo al resolver solicitud de nota de crédito:",
        error,
      );

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  resolverSolicitud: async ({
    solicitud_id,
    decision,
    actor_uid,
    actor_nombre,
  }) => {
    try {
      if (!solicitud_id || !decision || !actor_uid) {
        throw new Error("Faltan datos obligatorios para resolver la solicitud.");
      }

      if (!["Autorizado", "Rechazado"].includes(decision)) {
        throw new Error("La decisión indicada no es válida.");
      }

      await runTransaction(
        db,
        async (transaction) => {
          const solicitudRef = doc(db, SOLICITUDES_COLLECTION, solicitud_id);
          const solicitudSnap = await transaction.get(solicitudRef);

          if (!solicitudSnap.exists()) {
            throw new Error("La solicitud no existe.");
          }

          const solicitudData = solicitudSnap.data();

          if (solicitudData.estatus !== "Pendiente") {
            throw new Error(
              `La solicitud ya fue resuelta como ${solicitudData.estatus}.`,
            );
          }

          const montoIncremento = Number(solicitudData.monto_incremento) || 0;

          if (decision === "Autorizado") {
            if (!Number.isFinite(montoIncremento) || montoIncremento <= 0) {
              throw new Error("La solicitud contiene un monto inválido.");
            }

            if (!solicitudData.cliente_id) {
              throw new Error("La solicitud no contiene un cliente_id válido.");
            }

            const clienteRef = doc(
              db,
              CLIENTES_COLLECTION,
              solicitudData.cliente_id,
            );
            const clienteSnap = await transaction.get(clienteRef);

            if (!clienteSnap.exists()) {
              throw new Error("El cliente asociado no existe.");
            }

            const clienteData = clienteSnap.data();

            if (
              clienteData.activo === false ||
              clienteData.estatus === "Inactivo"
            ) {
              throw new Error(
                "No se puede autorizar crédito para un cliente inactivo.",
              );
            }

            transaction.update(clienteRef, {
              limite_credito: increment(montoIncremento),
              credito_disponible: increment(montoIncremento),
              updatedAt: serverTimestamp(),
            });
          }

          transaction.update(solicitudRef, {
            estatus: decision,
            resolvedAt: serverTimestamp(),
            resolvedBy: actor_nombre || "SU",
            resolvedByUid: actor_uid,
          });

          transaction.set(doc(collection(db, ACTIVIDAD_COLLECTION)), {
            actor_uid,
            usuario: actor_nombre || "SU",
            modulo: "Crédito",
            tipo: `Resolución (${decision})`,
            cliente: solicitudData.cliente || "S/N",
            detalle: `El SU resolvió como ${decision.toUpperCase()} la solicitud de aumento por $${montoIncremento.toLocaleString("es-MX")}.`,
            serverTime: serverTimestamp(),
          });
        },
        { maxAttempts: 1 },
      );

      return { success: true };
    } catch (error) {
      console.error("Fallo transaccional al resolver solicitud:", error);

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },
};
</file>

<file path="src/services/usuariosService.js">
import { app, auth, db } from "../config/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  where,
  writeBatch,
} from "firebase/firestore";
import { deleteApp, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import {
  formatearFechaSegura,
  rolSeguro,
} from "../utils/normalizadores";

const ALIAS_COLLECTION = "login_aliases";
const USUARIOS_COLLECTION = "usuarios";
const ACTIVIDAD_COLLECTION = "actividad";

const normalizarAlias = (valor = "") =>
  String(valor || "")
    .trim()
    .toLowerCase();

const normalizarCorreo = (valor = "") =>
  String(valor || "")
    .trim()
    .toLowerCase();

const aliasValido = (valor = "") => /^[a-z0-9._-]+$/.test(valor);

const correoRealValido = (valor = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor) &&
  !valor.endsWith("@mlh.local");


const USUARIOS_POR_PAGINA_DEFAULT = 10;

const obtenerOrdenFechaCreacion = (data = {}) => {
  if (data.fecha_creacion?.toDate) {
    return data.fecha_creacion.toDate().getTime();
  }

  if (data.fecha_creacion?.seconds) {
    return data.fecha_creacion.seconds * 1000;
  }

  return 0;
};

const normalizarUsuarioSnapshot = (docSnap) => {
  const data = docSnap.data();
  const rol = rolSeguro(data);
  const correo = normalizarCorreo(data.correo || data.email || "");
  const usuarioAlias = normalizarAlias(data.usuario_alias || data.usuario || "");
  const fechaCreacionOrden = obtenerOrdenFechaCreacion(data);

  return {
    id: docSnap.id,
    nombre: data.nombre || "Sin Nombre",
    correo,
    correo_auth: normalizarCorreo(data.correo_auth || correo),
    usuario_alias: usuarioAlias,
    usuarioLimpio: usuarioAlias || (correo ? correo.split("@")[0] : "S/N"),
    rol,
    activo: data.activo === true,
    estado: data.activo === true ? "activo" : "inactivo",
    proveedor_acceso: data.proveedor_acceso || "LEGACY_LOCAL",
    requiere_reset_password: data.requiere_reset_password === true,
    ultima_entrada: formatearFechaSegura(
      data.ultima_entrada || data.ultimoLogin,
      "Nunca",
    ),
    fecha_creacion_texto: formatearFechaSegura(
      data.fecha_creacion,
      "Sin fecha",
    ),
    fecha_actualizacion_texto: formatearFechaSegura(
      data.fecha_actualizacion,
      "Sin fecha",
    ),
    _fechaCreacionOrden: fechaCreacionOrden,
    _cursor: docSnap,
  };
};

const mapearErrorAuth = (error) => {
  if (error?.code === "auth/email-already-in-use") {
    return "El correo real ya está registrado en Firebase Authentication.";
  }

  if (error?.code === "auth/invalid-email") {
    return "El correo real no tiene un formato válido.";
  }

  if (error?.code === "auth/weak-password") {
    return "La contraseña temporal debe tener al menos 6 caracteres.";
  }

  if (error?.code === "auth/user-not-found") {
    return "No existe una cuenta de Firebase Auth asociada a ese correo.";
  }

  if (error?.code === "auth/too-many-requests") {
    return "Firebase bloqueó temporalmente la operación por demasiados intentos.";
  }

  return error?.message || "No se pudo completar la operación de usuario.";
};

export const usuariosService = {
  escucharUsuarios: (callback) => {
    return onSnapshot(
      query(
        collection(db, USUARIOS_COLLECTION),
        orderBy("fecha_creacion", "desc"),
        limit(USUARIOS_POR_PAGINA_DEFAULT),
      ),
      (snapshot) => {
        const usuariosNormalizados = snapshot.docs.map(normalizarUsuarioSnapshot);

        callback(usuariosNormalizados);
      },
      (error) => {
        console.error("Error en la escucha de usuarios:", error);
        callback([]);
      },
    );
  },

  cargarAdministradoresPagina: async ({
    cursor = null,
    registrosPorPagina = USUARIOS_POR_PAGINA_DEFAULT,
  } = {}) => {
    try {
      const restricciones = [
        where("rol", "==", "ADMIN"),
        orderBy("fecha_creacion", "desc"),
      ];

      if (cursor) {
        restricciones.push(startAfter(cursor));
      }

      restricciones.push(limit(registrosPorPagina + 1));

      const qAdministradores = query(
        collection(db, USUARIOS_COLLECTION),
        ...restricciones,
      );

      const snap = await getDocs(qAdministradores);
      const documentosVisibles = snap.docs.slice(0, registrosPorPagina);
      const usuarios = documentosVisibles.map(normalizarUsuarioSnapshot);

      return {
        success: true,
        data: usuarios,
        cursorFinal:
          documentosVisibles.length > 0
            ? documentosVisibles[documentosVisibles.length - 1]
            : null,
        haySiguiente: snap.docs.length > registrosPorPagina,
      };
    } catch (error) {
      console.error("Error cargando página de administradores:", error);

      return {
        success: false,
        data: [],
        cursorFinal: null,
        haySiguiente: false,
        error:
          error?.code === "failed-precondition"
            ? "Firestore requiere un índice para paginar usuarios ADMIN. Crea el índice sugerido por Firebase."
            : error?.message || "No se pudo cargar la página de usuarios.",
      };
    }
  },

  existenAdministradoresSuspendidos: async () => {
    try {
      const qSuspendidos = query(
        collection(db, USUARIOS_COLLECTION),
        where("rol", "==", "ADMIN"),
        where("activo", "==", false),
        limit(1),
      );

      const snap = await getDocs(qSuspendidos);

      return {
        success: true,
        existe: !snap.empty,
      };
    } catch (error) {
      console.error("Error verificando usuarios suspendidos:", error);

      return {
        success: false,
        existe: false,
        error: error?.message || "No se pudo verificar usuarios suspendidos.",
      };
    }
  },

  crearAdmin: async ({
    nombre,
    usuario,
    correo,
    password,
    userName,
    actor_uid,
  }) => {
    let appSecundaria;
    let authSecundario;
    let usuarioCreadoEnAuth;

    try {
      if (!actor_uid) {
        throw new Error("No se identificó al Súper Usuario responsable.");
      }

      const nombreLimpio = String(nombre || "").trim();
      const usuarioNormalizado = normalizarAlias(usuario);
      const correoReal = normalizarCorreo(correo);

      if (!nombreLimpio || !usuarioNormalizado || !correoReal || !password) {
        throw new Error("Nombre, usuario, correo real y contraseña temporal son obligatorios.");
      }

      if (password.length < 6) {
        throw new Error("La contraseña temporal debe tener al menos 6 caracteres.");
      }

      if (!aliasValido(usuarioNormalizado)) {
        throw new Error(
          "El usuario solo puede contener letras sin acentos, números, puntos, guiones y guion bajo.",
        );
      }

      if (!correoRealValido(correoReal)) {
        throw new Error(
          "Captura un correo real válido. No uses cuentas @mlh.local para accesos nuevos.",
        );
      }

      const aliasRef = doc(db, ALIAS_COLLECTION, usuarioNormalizado);
      const aliasSnap = await getDoc(aliasRef);

      if (aliasSnap.exists()) {
        throw new Error("El usuario de acceso ya está reservado en el sistema.");
      }

      const adminActivoQuery = query(
        collection(db, USUARIOS_COLLECTION),
        where("rol", "==", "ADMIN"),
        where("activo", "==", true),
        limit(1),
      );
      const adminActivoSnap = await getDocs(adminActivoQuery);

      if (!adminActivoSnap.empty) {
        throw new Error(
          "Ya existe un ADMIN activo. Suspende el acceso anterior antes de crear uno nuevo.",
        );
      }

      appSecundaria = initializeApp(
        app.options,
        `AppSecundaria_${Date.now()}`,
      );

      authSecundario = getAuth(appSecundaria);

      try {
        const userCredential = await createUserWithEmailAndPassword(
          authSecundario,
          correoReal,
          password,
        );

        usuarioCreadoEnAuth = userCredential.user;
      } catch (authError) {
        throw new Error(mapearErrorAuth(authError), { cause: authError });
      }

      const nuevoUID = usuarioCreadoEnAuth.uid;

      try {
        const batch = writeBatch(db);
        const userRef = doc(db, USUARIOS_COLLECTION, nuevoUID);
        const actRef = doc(collection(db, ACTIVIDAD_COLLECTION));

        batch.set(userRef, {
          nombre: nombreLimpio,
          correo: correoReal,
          correo_auth: correoReal,
          usuario_alias: usuarioNormalizado,
          rol: "ADMIN",
          activo: true,
          proveedor_acceso: "EMAIL_REAL_ALIAS",
          requiere_reset_password: true,
          fecha_creacion: serverTimestamp(),
          fecha_actualizacion: serverTimestamp(),
          ultima_entrada: null,
          creado_por: userName || "SU",
          creado_por_uid: actor_uid,
        });

        batch.set(aliasRef, {
          correo_auth: correoReal,
          activo: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        batch.set(actRef, {
          actor_uid,
          usuario: userName || "SU",
          modulo: "Sistema",
          tipo: "Alta de Usuario",
          cliente: "N/A",
          detalle:
            `Se generó un nuevo acceso ADMIN para ${nombreLimpio} ` +
            `(Usuario: ${usuarioNormalizado}, correo real: ${correoReal}).`,
          serverTime: serverTimestamp(),
        });

        await batch.commit();
      } catch (firestoreError) {
        console.error(
          "Error al escribir el perfil en Firestore. Ejecutando rollback:",
          firestoreError,
        );

        let rollbackCompletado = false;

        if (usuarioCreadoEnAuth) {
          try {
            await deleteUser(usuarioCreadoEnAuth);
            rollbackCompletado = true;
          } catch (rollbackError) {
            console.error(
              "No fue posible eliminar la cuenta de Authentication durante el rollback:",
              rollbackError,
            );
          }
        }

        const mensaje = rollbackCompletado
          ? "No se pudo completar el perfil. La cuenta de Authentication fue anulada."
          : "No se pudo completar el perfil y tampoco fue posible confirmar la eliminación de la cuenta de Authentication.";

        throw new Error(mensaje, { cause: firestoreError });
      }

      return {
        success: true,
        uid: nuevoUID,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || "No se pudo crear el usuario.",
      };
    } finally {
      if (authSecundario) {
        try {
          await signOut(authSecundario);
        } catch (cleanupError) {
          console.warn("No fue posible cerrar la sesión secundaria:", cleanupError);
        }
      }

      if (appSecundaria) {
        try {
          await deleteApp(appSecundaria);
        } catch (cleanupError) {
          console.warn("No fue posible eliminar la aplicación secundaria:", cleanupError);
        }
      }
    }
  },

  actualizarEstadoUsuario: async ({
    uid,
    activo,
    correoObjetivo,
    usuarioAlias,
    userName,
    actor_uid,
  }) => {
    try {
      if (!actor_uid) {
        throw new Error("No se identificó al Súper Usuario responsable.");
      }

      if (!uid) {
        throw new Error("ID de usuario requerido.");
      }

      const aliasNormalizado = normalizarAlias(usuarioAlias);
      const batch = writeBatch(db);
      const userRef = doc(db, USUARIOS_COLLECTION, uid);

      batch.update(userRef, {
        activo,
        fecha_actualizacion: serverTimestamp(),
      });

      if (aliasNormalizado) {
        const aliasRef = doc(db, ALIAS_COLLECTION, aliasNormalizado);
        const aliasSnap = await getDoc(aliasRef);

        if (aliasSnap.exists()) {
          batch.update(aliasRef, {
            activo,
            updatedAt: serverTimestamp(),
          });
        }
      }

      const tipoAccion = activo ? "Reactivación de Cuenta" : "Suspensión de Cuenta";
      const estadoVerbo = activo ? "reactivó" : "suspendió";
      const usuarioObjetivo = aliasNormalizado || String(correoObjetivo || uid).split("@")[0];
      const actRef = doc(collection(db, ACTIVIDAD_COLLECTION));

      batch.set(actRef, {
        actor_uid,
        usuario: userName || "SU",
        modulo: "Sistema",
        tipo: tipoAccion,
        cliente: "N/A",
        detalle: `El SU ${estadoVerbo} el perfil de ingreso del usuario: ${usuarioObjetivo}.`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return { success: true };
    } catch (error) {
      console.error("Error al modificar el estado del usuario:", error);

      return {
        success: false,
        error: error.message || "No se pudo actualizar el estado del usuario.",
      };
    }
  },

  enviarRecuperacionPassword: async ({
    correoObjetivo,
    usuarioAlias,
    userName,
    actor_uid,
  }) => {
    try {
      if (!actor_uid) {
        throw new Error("No se identificó al Súper Usuario responsable.");
      }

      const correoReal = normalizarCorreo(correoObjetivo);
      const aliasNormalizado = normalizarAlias(usuarioAlias);

      if (!correoRealValido(correoReal)) {
        throw new Error(
          "Este acceso no tiene correo real configurado. Migra la cuenta antes de enviar recuperación.",
        );
      }

      await sendPasswordResetEmail(auth, correoReal);

      const batch = writeBatch(db);
      const actRef = doc(collection(db, ACTIVIDAD_COLLECTION));

      batch.set(actRef, {
        actor_uid,
        usuario: userName || "SU",
        modulo: "Sistema",
        tipo: "Recuperación de Contraseña",
        cliente: "N/A",
        detalle:
          `El SU envió un correo de recuperación para el acceso ` +
          `${aliasNormalizado || correoReal}.`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return { success: true };
    } catch (error) {
      console.error("Error enviando recuperación de contraseña:", error);

      return {
        success: false,
        error: mapearErrorAuth(error),
      };
    }
  },
};
</file>

<file path="src/hooks/useFacturas.js">
import { useMemo, useState } from "react";

const redondearMoneda = (valor) =>
  Math.round((Number(valor) || 0) * 100) / 100;

const ESTATUS_VALIDOS = new Set([
  "Todas",
  "Pendiente",
  "Vencida",
  "Pagada",
]);

export const useFacturas = (
  stats = {},
  { filtroEstatusInicial = "Todas" } = {},
) => {
  const estatusInicial = ESTATUS_VALIDOS.has(filtroEstatusInicial)
    ? filtroEstatusInicial
    : "Todas";

  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [filtroEstatus, setFiltroEstatus] = useState(estatusInicial);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const kpis = useMemo(
    () => ({
      deuda_activa: redondearMoneda(stats.cartera_total),
      monto_vencido: redondearMoneda(stats.cartera_vencida),
      total_liquidado: redondearMoneda(stats.total_liquidado),
      cobrado_historico: redondearMoneda(stats.cobrado_historico),
      abonos_registrados: redondearMoneda(stats.abonos_registrados),
    }),
    [stats],
  );

  const aplicarBusqueda = () => {
    setBusquedaAplicada(busqueda.trim());
  };

  const limpiarBusquedaAplicada = () => {
    setBusquedaAplicada("");
  };

  const limpiarBusqueda = () => {
    setBusqueda("");
    setBusquedaAplicada("");
  };

  const limpiarFiltros = () => {
    setFechaInicio("");
    setFechaFin("");
    setBusqueda("");
    setBusquedaAplicada("");
    setFiltroEstatus("Todas");
  };

  return {
    busqueda,
    setBusqueda,
    busquedaAplicada,
    aplicarBusqueda,
    limpiarBusquedaAplicada,
    limpiarBusqueda,
    filtroEstatus,
    setFiltroEstatus,
    fechaInicio,
    setFechaInicio,
    fechaFin,
    setFechaFin,
    kpis,
    limpiarFiltros,
  };
};
</file>

<file path="src/index.css">
@import "tailwindcss";

html,
body,
#root {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  background-color: #e8e8e8;
}

* {
  box-sizing: border-box;
}

html,
body {
  overscroll-behavior: none;
}

button,
input,
select,
textarea {
  -webkit-tap-highlight-color: transparent;
}

.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

/* Corrige el fondo blanco del autocompletado en Chrome / Brave / Edge */
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active {
  -webkit-text-fill-color: #ffffff !important;
  caret-color: #ffffff !important;
  box-shadow: 0 0 0 1000px rgba(24, 38, 81, 0.92) inset !important;
  -webkit-box-shadow: 0 0 0 1000px rgba(24, 38, 81, 0.92) inset !important;
  border-color: rgba(252, 219, 50, 0.9) !important;
  transition: background-color 9999s ease-in-out 0s;
}

/* Mantiene el texto del autocompletado con tamaño correcto */
input:-webkit-autofill::first-line {
  color: #ffffff !important;
  font-size: 14px;
}
</file>

<file path="src/layouts/MainLayout.jsx">
import { useContext, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import {
  Calendar,
  FileText,
  Home,
  LogOut,
  Menu,
  Shield,
  Users,
  X,
} from "lucide-react";

import { auth } from "../config/firebase";
import { GlobalContext } from "../context/GlobalContext";
import logoMLH from "../assets/MLH LOGO1.png";

function BotonSalir({ onClick, mobile = false }) {
  if (mobile) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Cerrar sesión"
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-100 transition active:scale-[0.98] active:bg-red-500/20"
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Cerrar sesión"
      title="Cerrar sesión"
      className="group relative flex h-11 w-11 cursor-pointer items-center justify-start overflow-hidden rounded-full border border-red-400/40 bg-red-500/10 shadow-sm transition-all duration-200 hover:w-32 hover:rounded-xl hover:border-red-300/60 hover:bg-red-500/15 active:translate-x-1 active:translate-y-1"
    >
      <div className="flex w-full items-center justify-center transition-all duration-300 group-hover:justify-start group-hover:px-3">
        <LogOut className="h-4 w-4 text-red-300" />
      </div>

      <span className="absolute right-5 translate-x-full text-sm font-black text-red-200 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
        Salir
      </span>
    </button>
  );
}

export default function MainLayout() {
  const navigate = useNavigate();
  const { userName, userRole, stats } = useContext(GlobalContext);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const facturasPendientesCount = Number(stats?.facturas_pendientes) || 0;
  const esSU = userRole === "SU";

  const navItems = [
    {
      name: "Inicio",
      path: "/",
      icon: Home,
    },
    {
      name: "Clientes",
      path: "/clientes",
      icon: Users,
    },
    {
      name: "Facturación",
      path: "/facturas",
      icon: FileText,
      badge: facturasPendientesCount,
    },
    {
      name: "Calendario",
      path: "/calendario",
      icon: Calendar,
    },
    ...(esSU
      ? [
          {
            name: "Panel SU",
            path: "/panel-su",
            icon: Shield,
          },
        ]
      : []),
  ];

  const handleCerrarSesion = async () => {
    try {
      setMenuAbierto(false);
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const renderNavLink = (item, modo = "desktop") => (
    <NavLink
      key={item.path}
      to={item.path}
      end={item.path === "/"}
      onClick={() => setMenuAbierto(false)}
      className={({ isActive }) => {
        if (modo === "mobile") {
          return `group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-black transition-all duration-150 active:scale-[0.98] ${
            isActive
              ? "bg-white/10 text-[#ffd700]"
              : "text-gray-300 active:bg-white/5"
          }`;
        }

        return `group relative flex h-14 items-center gap-2 px-3 text-sm font-black transition-all duration-200 hover:scale-[1.04] active:scale-[0.97] ${
          isActive ? "text-[#ffd700]" : "text-gray-300 hover:text-[#ffd700]"
        }`;
      }}
    >
      {({ isActive }) => (
        <>
          <item.icon
            className={`shrink-0 transition-all duration-200 ${
              modo === "mobile" ? "h-5 w-5" : "h-4 w-4"
            } ${
              isActive
                ? "text-[#ffd700]"
                : "text-gray-400 group-hover:text-[#ffd700]"
            }`}
          />

          <span className="min-w-0 truncate whitespace-nowrap">{item.name}</span>

          {Number(item.badge) > 0 && (
            <span
              className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-black transition-all duration-200 ${
                isActive
                  ? "bg-[#ffd700] text-[#0a192f]"
                  : "bg-[#112240] text-gray-200 group-hover:bg-[#ffd700] group-hover:text-[#0a192f]"
              }`}
            >
              {item.badge}
            </span>
          )}

          <span
            className={`absolute bottom-1 left-1/2 h-[2px] -translate-x-1/2 rounded-full bg-[#ffd700] transition-all duration-300 ${
              isActive && modo !== "mobile" ? "w-[72%]" : "w-0"
            }`}
          />
        </>
      )}
    </NavLink>
  );

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#e8e8e8] font-sans">
      <header className="shrink-0 bg-transparent px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] md:px-5 md:py-3">
        <div className="flex min-h-[58px] items-center justify-between rounded-[1.75rem] bg-[#0a192f] px-3 shadow-[0_10px_24px_rgba(10,25,47,0.14)] md:min-h-[72px] md:px-6">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex min-w-0 items-center transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
            aria-label="Ir al inicio"
          >
            <img
              src={logoMLH}
              alt="MLH Cobranza"
              className="h-14 w-auto object-contain md:h-16"
            />
          </button>

          <nav className="hidden items-center gap-4 lg:flex">
            {navItems.map((item) => renderNavLink(item))}
          </nav>

          <div className="hidden items-center gap-4 lg:flex">
            <div className="text-right">
              <p className="text-sm font-black leading-none text-white">
                {userName || "Usuario MLH"}
              </p>

              <p
                className={`mt-1 text-[10px] font-black uppercase tracking-[0.22em] ${
                  esSU ? "text-[#ffd700]" : "text-blue-300"
                }`}
              >
                {esSU ? "Súper Usuario" : userRole || "Admin"}
              </p>
            </div>

            <BotonSalir onClick={handleCerrarSesion} />
          </div>

          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="truncate text-xs font-black leading-none text-white">
                {userName || "Usuario MLH"}
              </p>

              <p
                className={`mt-1 text-[9px] font-black uppercase tracking-[0.18em] ${
                  esSU ? "text-[#ffd700]" : "text-blue-300"
                }`}
              >
                {esSU ? "SU" : userRole || "Admin"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setMenuAbierto((prev) => !prev)}
              aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuAbierto}
              className="rounded-full border border-white/10 bg-white/5 p-3 text-white transition-all duration-150 active:scale-[0.96] active:bg-white/10"
            >
              {menuAbierto ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {menuAbierto && (
          <div className="mt-2 max-h-[calc(100dvh-84px)] overflow-y-auto rounded-[1.5rem] bg-[#0a192f] p-3 shadow-[0_16px_35px_rgba(10,25,47,0.20)] lg:hidden">
            <div className="mb-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="truncate text-sm font-black text-white">
                {userName || "Usuario MLH"}
              </p>

              <p
                className={`mt-1 text-[10px] font-black uppercase tracking-[0.22em] ${
                  esSU ? "text-[#ffd700]" : "text-blue-300"
                }`}
              >
                {esSU ? "Súper Usuario" : userRole || "Admin"}
              </p>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => renderNavLink(item, "mobile"))}
            </nav>

            <BotonSalir onClick={handleCerrarSesion} mobile />
          </div>
        )}
      </header>

      <main className="custom-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#e8e8e8] px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 md:p-8 md:pt-4">
        <Outlet />
      </main>
    </div>
  );
}
</file>

<file path="src/pages/Dashboard.jsx">
import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  TrendingUp,
  Users,
} from "lucide-react";

import { GlobalContext } from "../context/GlobalContext";
import { useAgendaRango } from "../hooks/useAgendaRango";
import {
  agruparEventosPorDia,
  contarCategorias,
  fechaAClave,
  generarDiasRango,
  obtenerRangoAgenda,
} from "../utils/agenda";

const CATEGORIAS = {
  VENCIDAS: {
    label: "Vencidas",
    className: "bg-red-50 text-red-700 border-red-200",
    iconClassName: "bg-red-100 text-red-600",
    icon: AlertTriangle,
  },
  POR_VENCER: {
    label: "Por vencer",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    iconClassName: "bg-amber-100 text-amber-700",
    icon: Clock,
  },
  RECORDATORIOS: {
    label: "Recordatorios",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    iconClassName: "bg-blue-100 text-blue-600",
    icon: Bell,
  },
};

const STORAGE_NOTIFICACIONES_DESCARTADAS =
  "mlh_cobranza_notificaciones_descartadas";

const DIAS_EXPIRACION_NOTIFICACIONES_OCULTAS = 30;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

const FILTROS_ACTIVIDAD = [
  { id: "TODOS", label: "Todos" },
  { id: "SOLICITUDES", label: "Solicitudes" },
  { id: "HOY", label: "Hoy" },
];

const ESTILOS_CARD_ACTIVIDAD = {
  alerta: {
    punto: "bg-red-500",
    hover: "hover:bg-red-50/70 hover:border-red-300",
    accion: "text-red-700 hover:text-red-900",
  },
  recordatorio: {
    punto: "bg-blue-500",
    hover: "hover:bg-blue-50/80 hover:border-blue-300",
    accion: "text-blue-700 hover:text-blue-900",
  },
  proximo: {
    punto: "bg-amber-500",
    hover: "hover:bg-amber-50/80 hover:border-amber-300",
    accion: "text-amber-700 hover:text-amber-900",
  },
  aprobada: {
    punto: "bg-green-500",
    hover: "hover:bg-green-50/80 hover:border-green-300",
    accion: "text-green-700 hover:text-green-900",
  },
  rechazada: {
    punto: "bg-red-500",
    hover: "hover:bg-red-50/70 hover:border-red-300",
    accion: "text-red-700 hover:text-red-900",
  },
  anulada: {
    punto: "bg-slate-500",
    hover: "hover:bg-slate-50 hover:border-slate-300",
    accion: "text-slate-700 hover:text-slate-900",
  },
  dato: {
    punto: "bg-slate-400",
    hover: "hover:bg-slate-50 hover:border-slate-300",
    accion: "text-slate-700 hover:text-slate-900",
  },
};

const ESTILOS_PRIORIDAD = {
  ALTA: "bg-red-100 text-red-700 border-red-200",
  HOY: "bg-blue-100 text-blue-700 border-blue-200",
  SEMANA: "bg-amber-100 text-amber-700 border-amber-200",
  PENDIENTE: "bg-purple-100 text-purple-700 border-purple-200",
  CRÉDITO: "bg-green-100 text-green-700 border-green-200",
  DATOS: "bg-slate-200 text-slate-700 border-slate-300",
  ANULADA: "bg-slate-100 text-slate-700 border-slate-200",
};

const formatearMoneda = (valor, decimales = 0) =>
  (Number(valor) || 0).toLocaleString("es-MX", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: 2,
  });

const capitalizar = (texto = "") =>
  texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : "";

const formatearRangoSemana = (inicio, fin) => {
  const mismoMes =
    inicio.getMonth() === fin.getMonth() &&
    inicio.getFullYear() === fin.getFullYear();

  if (mismoMes) {
    const mesAnio = fin.toLocaleDateString("es-MX", {
      month: "long",
      year: "numeric",
    });

    return `${inicio.getDate()}–${fin.getDate()} de ${mesAnio}`;
  }

  const inicioTexto = inicio.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });

  const finTexto = fin.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `${inicioTexto}–${finTexto}`;
};

const obtenerTiempoFirestore = (valor) => {
  const tiempo =
    valor?.toDate?.().getTime?.() ||
    (valor instanceof Date ? valor.getTime() : 0) ||
    new Date(valor || 0).getTime();

  return Number.isFinite(tiempo) ? tiempo : 0;
};

const esTiempoReciente = (tiempo, dias = 7) =>
  Boolean(tiempo) && Date.now() - tiempo <= dias * 24 * 60 * 60 * 1000;

const esTiempoDeHoy = (tiempo) => {
  if (!tiempo) return false;

  const fecha = new Date(tiempo);

  return fechaAClave(fecha) === fechaAClave(new Date());
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

const correoValido = (correo = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(correo || "").trim());

const cargarNotificacionesOcultas = () => {
  if (typeof window === "undefined") return {};

  try {
    const valorGuardado = window.localStorage.getItem(
      STORAGE_NOTIFICACIONES_DESCARTADAS,
    );

    if (!valorGuardado) return {};

    const valor = JSON.parse(valorGuardado);
    const ahoraIso = new Date().toISOString();

    if (Array.isArray(valor)) {
      return valor.reduce((acumulado, id) => {
        if (id) {
          acumulado[id] = { hiddenAt: ahoraIso };
        }

        return acumulado;
      }, {});
    }

    if (valor && typeof valor === "object") {
      return Object.entries(valor).reduce((acumulado, [id, detalle]) => {
        if (!id) return acumulado;

        if (detalle && typeof detalle === "object") {
          acumulado[id] = {
            hiddenAt: detalle.hiddenAt || ahoraIso,
          };
        } else {
          acumulado[id] = { hiddenAt: ahoraIso };
        }

        return acumulado;
      }, {});
    }
  } catch {
    return {};
  }

  return {};
};

const depurarNotificacionesOcultas = (ocultas = {}, idsActuales = new Set()) => {
  const ahora = Date.now();
  const maximoOcultoMs = DIAS_EXPIRACION_NOTIFICACIONES_OCULTAS * MS_POR_DIA;

  return Object.entries(ocultas).reduce((acumulado, [id, detalle]) => {
    if (!idsActuales.has(id)) return acumulado;

    const hiddenAt = detalle?.hiddenAt || new Date().toISOString();
    const tiempoOculto = new Date(hiddenAt).getTime();

    if (!Number.isFinite(tiempoOculto)) return acumulado;
    if (ahora - tiempoOculto > maximoOcultoMs) return acumulado;

    acumulado[id] = { hiddenAt };
    return acumulado;
  }, {});
};

const mapasIguales = (primero = {}, segundo = {}) =>
  JSON.stringify(primero) === JSON.stringify(segundo);

const clienteContactoIncompleto = (cliente) =>
  !telefonoValido(cliente?.telefono) || !correoValido(cliente?.correo);

const filtrarActividadPorFiltro = (lista = [], filtro = "TODOS") => {
  if (filtro === "TODOS") return lista;

  if (filtro === "HOY") {
    return lista.filter((notificacion) => notificacion.esHoy);
  }

  return lista.filter(
    (notificacion) => notificacion.categoriaActividad === filtro,
  );
};

function TarjetaKPI({
  etiqueta,
  valor,
  descripcion,
  icono: Icono,
  variante = "azul",
  accion,
  textoAccion,
}) {
  const variantes = {
    azul: {
      tarjeta: "border-blue-100 bg-blue-50/30",
      etiqueta: "text-blue-600",
      valor: "text-[#0a192f]",
      icono: "bg-blue-100 text-blue-600",
    },
    rojo: {
      tarjeta: "border-red-200 bg-red-50/45",
      etiqueta: "text-red-600",
      valor: "text-red-600",
      icono: "bg-red-100 text-red-600",
    },
    verde: {
      tarjeta: "border-green-100 bg-green-50/30",
      etiqueta: "text-green-700",
      valor: "text-green-600",
      icono: "bg-green-100 text-green-600",
    },
    morado: {
      tarjeta: "border-purple-100 bg-purple-50/30",
      etiqueta: "text-purple-700",
      valor: "text-[#0a192f]",
      icono: "bg-purple-100 text-purple-600",
    },
  };

  const estilos = variantes[variante] || variantes.azul;

  return (
    <article
      className={`p-4 md:p-5 rounded-2xl border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${estilos.tarjeta}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`text-[10px] md:text-xs font-black uppercase tracking-wider ${estilos.etiqueta}`}
          >
            {etiqueta}
          </p>
          <h3
            className={`text-xl md:text-2xl font-black mt-1 break-words ${estilos.valor}`}
          >
            {valor}
          </h3>
        </div>

        <div className={`p-2.5 rounded-xl shrink-0 ${estilos.icono}`}>
          <Icono className="h-5 w-5" />
        </div>
      </div>

      <p className="text-[11px] md:text-xs text-gray-500 mt-3 font-medium">
        {descripcion}
      </p>

      {accion && textoAccion && (
        <button
          type="button"
          onClick={accion}
          className="mt-3 text-xs font-black text-blue-700 flex items-center hover:text-blue-900"
        >
          {textoAccion}
          <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </button>
      )}
    </article>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    stats,
    solicitudes,
    solicitudesNotasCredito,
    userRole,
    clientes,
    currentUser,
  } = useContext(GlobalContext);

  const [panelExpandido, setPanelExpandido] = useState(false);
  const [filtroActividad, setFiltroActividad] = useState("TODOS");
  const [notificacionesOcultas, setNotificacionesOcultas] = useState(
    cargarNotificacionesOcultas,
  );

  const guardarNotificacionesOcultas = (ocultas) => {
    setNotificacionesOcultas(ocultas);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        STORAGE_NOTIFICACIONES_DESCARTADAS,
        JSON.stringify(ocultas),
      );
    }
  };

  const descartarNotificacion = (id) => {
    const notificacion = notificacionesFeed.find((item) => item.id === id);

    if (!notificacion || notificacion.bloquearDescartar) {
      return;
    }

    guardarNotificacionesOcultas({
      ...notificacionesOcultasVigentes,
      [id]: { hiddenAt: new Date().toISOString() },
    });
  };

  const restaurarNotificaciones = () => {
    guardarNotificacionesOcultas({});
    setPanelExpandido(false);
  };

  const rangoSemana = useMemo(
    () => obtenerRangoAgenda(new Date(), "SEMANA"),
    [],
  );

  const { eventos, cargando } = useAgendaRango(
    rangoSemana.inicio,
    rangoSemana.fin,
  );

  const eventosActivos = useMemo(
    () =>
      eventos.filter(
        (evento) =>
          evento.origen === "FACTURA" ||
          !["Completado", "Cancelado"].includes(evento.estatus),
      ),
    [eventos],
  );

  const eventosPorDia = useMemo(
    () => agruparEventosPorDia(eventosActivos),
    [eventosActivos],
  );

  const diasSemana = useMemo(
    () => generarDiasRango(rangoSemana.inicio, rangoSemana.fin),
    [rangoSemana],
  );

  const resumenSemana = useMemo(
    () => contarCategorias(eventosActivos),
    [eventosActivos],
  );

  const claveHoy = fechaAClave(new Date());

  const recordatoriosHoy = useMemo(
    () =>
      eventosActivos.filter(
        (evento) =>
          evento.origen === "COMPROMISO" &&
          evento.fechaClave === claveHoy,
      ),
    [eventosActivos, claveHoy],
  );

  const vencimientosHoy = useMemo(
    () =>
      eventosActivos.filter(
        (evento) =>
          evento.categoria === "POR_VENCER" &&
          evento.fechaClave === claveHoy,
      ),
    [eventosActivos, claveHoy],
  );

  const recordatoriosAtrasados = useMemo(
    () =>
      eventosActivos.filter(
        (evento) =>
          evento.origen === "COMPROMISO" &&
          evento.fechaClave < claveHoy,
      ),
    [eventosActivos, claveHoy],
  );

  const recordatoriosProximos = useMemo(
    () =>
      eventosActivos.filter(
        (evento) =>
          evento.origen === "COMPROMISO" &&
          evento.fechaClave > claveHoy,
      ),
    [eventosActivos, claveHoy],
  );

  const clientesContactoIncompletoConSaldo = useMemo(
    () =>
      (clientes || []).filter((cliente) => {
        const activo =
          cliente?.activo !== false &&
          cliente?.estatus !== "Inactivo";

        const tieneSaldo = Number(cliente?.deuda_actual) > 0;

        return activo && tieneSaldo && clienteContactoIncompleto(cliente);
      }),
    [clientes],
  );

  const fechaActualTexto = new Date().toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const solicitudesPendientes = useMemo(
    () =>
      (solicitudes || []).filter(
        (solicitud) => solicitud.estatus === "Pendiente",
      ),
    [solicitudes],
  );

  const solicitudesNotasCreditoVisibles = useMemo(
    () =>
      (solicitudesNotasCredito || []).filter((solicitud) => {
        if (userRole === "SU") return true;
        if (!currentUser?.uid) return true;

        return solicitud.solicitado_por_uid === currentUser.uid;
      }),
    [solicitudesNotasCredito, userRole, currentUser],
  );

  const abrirCalendario = (fecha, filtro = "TODOS", vista = "SEMANA") => {
    navigate(
      `/calendario?fecha=${fechaAClave(fecha)}&vista=${vista}&filtro=${filtro}`,
    );
  };

  const abrirFacturasVencidas = () => {
    navigate("/facturas?estado=Vencida");
  };

  const obtenerTiempoSolicitudNota = (solicitud = {}) =>
    obtenerTiempoFirestore(solicitud.anuladaAt) ||
    obtenerTiempoFirestore(solicitud.resolvedAt) ||
    obtenerTiempoFirestore(solicitud.createdAt) ||
    obtenerTiempoFirestore(solicitud.fecha);

  const notificacionesFeed = useMemo(() => {
    const feed = [];
    const totalVencidas = Number(stats?.facturas_vencidas) || 0;

    recordatoriosAtrasados.forEach((recordatorio, indice) => {
      const descripcion =
        recordatorio.motivo ||
        recordatorio.titulo ||
        "Actividad pendiente de una fecha anterior.";

      feed.push({
        id: `recordatorio-atrasado-${recordatorio.id}`,
        tipo: "alerta",
        prioridad: "ALTA",
        categoriaActividad: "RECORDATORIOS",
        esHoy: false,
        orden: 10 + indice,
        titulo: "Recordatorio atrasado",
        descripcion: [
          descripcion,
          recordatorio.cliente || "",
          recordatorio.folio ? `Folio ${recordatorio.folio}` : "",
        ]
          .filter(Boolean)
          .join(" • "),
        fecha: `Programado para ${recordatorio.fechaClave}`,
        accionTexto: "Atender recordatorio",
        ruta: `/calendario?fecha=${recordatorio.fechaClave}&vista=DIA&filtro=RECORDATORIOS`,
      });
    });

    recordatoriosHoy.forEach((recordatorio, indice) => {
      const contexto = [
        recordatorio.cliente,
        recordatorio.folio ? `Folio ${recordatorio.folio}` : "",
      ]
        .filter(Boolean)
        .join(" • ");

      const descripcionBase =
        recordatorio.motivo ||
        recordatorio.titulo ||
        "Recordatorio programado para hoy.";

      feed.push({
        id: `recordatorio-hoy-${recordatorio.id}`,
        tipo: "recordatorio",
        prioridad: "HOY",
        categoriaActividad: "RECORDATORIOS",
        esHoy: true,
        orden: 30 + indice,
        titulo: recordatorio.titulo || "Recordatorio de hoy",
        descripcion: contexto
          ? `${descripcionBase} • ${contexto}`
          : descripcionBase,
        fecha: "Programado para hoy",
        accionTexto: "Abrir recordatorio",
        ruta: `/calendario?fecha=${claveHoy}&vista=DIA&filtro=RECORDATORIOS`,
      });
    });

    if (vencimientosHoy.length > 0) {
      feed.push({
        id: "vencimientos-hoy",
        tipo: "proximo",
        prioridad: "HOY",
        categoriaActividad: "PROXIMOS",
        esHoy: true,
        orden: 20,
        titulo: "Facturas que vencen hoy",
        descripcion: `${vencimientosHoy.length} factura(s) requieren seguimiento antes de terminar el día.`,
        fecha: "Vencimiento de hoy",
        accionTexto: "Ver vencimientos",
        ruta: `/calendario?fecha=${claveHoy}&vista=DIA&filtro=POR_VENCER`,
      });
    }

    if (totalVencidas > 0) {
      feed.push({
        id: "resumen-vencidas",
        tipo: "alerta",
        prioridad: "ALTA",
        categoriaActividad: "VENCIDAS",
        esHoy: false,
        orden: 5,
        titulo: "Facturas vencidas",
        descripcion: `${totalVencidas} factura(s) requieren seguimiento de cobranza. Abre la bandeja filtrada para registrar pagos o dar seguimiento.`,
        fecha: "Cartera actual",
        accionTexto: "Abrir cobranza vencida",
        ruta: "/facturas?estado=Vencida",
      });
    }

    if (resumenSemana.POR_VENCER > vencimientosHoy.length) {
      const restantes = resumenSemana.POR_VENCER - vencimientosHoy.length;

      feed.push({
        id: "resumen-por-vencer",
        tipo: "proximo",
        prioridad: "SEMANA",
        categoriaActividad: "PROXIMOS",
        esHoy: false,
        orden: 50,
        titulo: "Próximos vencimientos",
        descripcion: `${restantes} factura(s) adicionales vencen durante la semana actual.`,
        fecha: "Semana actual",
        accionTexto: "Abrir agenda semanal",
        ruta: `/calendario?fecha=${claveHoy}&vista=SEMANA&filtro=POR_VENCER`,
      });
    }

    if (recordatoriosProximos.length > 0) {
      feed.push({
        id: "recordatorios-proximos",
        tipo: "recordatorio",
        prioridad: "SEMANA",
        categoriaActividad: "RECORDATORIOS",
        esHoy: false,
        orden: 60,
        titulo: "Recordatorios próximos",
        descripcion: `${recordatoriosProximos.length} actividad(es) manuales permanecen programadas para los próximos días de esta semana.`,
        fecha: "Semana actual",
        accionTexto: "Ver recordatorios",
        ruta: `/calendario?fecha=${claveHoy}&vista=SEMANA&filtro=RECORDATORIOS`,
      });
    }

    solicitudesNotasCreditoVisibles
      .filter((solicitud) => {
        const estatus = solicitud.estatus || "Pendiente";
        const estaPendiente = estatus === "Pendiente";
        const tiempo = obtenerTiempoSolicitudNota(solicitud);

        if (userRole === "SU") {
          return estaPendiente;
        }

        return estaPendiente || esTiempoReciente(tiempo, 7);
      })
      .slice()
      .sort(
        (primera, segunda) =>
          obtenerTiempoSolicitudNota(segunda) -
          obtenerTiempoSolicitudNota(primera),
      )
      .slice(0, 10)
      .forEach((solicitud, indice) => {
        const estatus = solicitud.nota_anulada ? "Anulada" : solicitud.estatus || "Pendiente";
        const estaPendiente = estatus === "Pendiente";
        const estaAutorizada = ["Autorizado", "Aprobado"].includes(estatus);
        const estaAnulada = estatus === "Anulada";
        const monto = Number(solicitud.monto_nota) || 0;
        const cliente = solicitud.cliente || "Cliente";
        const folio = solicitud.folio || "S/F";
        const rutaCliente = solicitud.cliente_id
          ? `/clientes/${solicitud.cliente_id}`
          : "/clientes";
        const rutaFacturaExpediente =
          solicitud.cliente_id && solicitud.factura_id
            ? `/clientes/${solicitud.cliente_id}?facturaId=${encodeURIComponent(
                solicitud.factura_id,
              )}&abrirFactura=1&origen=notaCredito`
            : rutaCliente;
        const tiempo = obtenerTiempoSolicitudNota(solicitud);

        feed.push({
          id: `solicitud-nota-credito-${solicitud.id || indice}-${estatus}`,
          tipo: estaPendiente
            ? "recordatorio"
            : estaAutorizada
              ? "aprobada"
              : estaAnulada
                ? "anulada"
                : "rechazada",
          prioridad: estaPendiente ? "PENDIENTE" : estaAnulada ? "ANULADA" : "CRÉDITO",
          categoriaActividad: "SOLICITUDES",
          esHoy: esTiempoDeHoy(tiempo),
          orden: estaPendiente ? 0 : 35,
          tiempoOrden: tiempo,
          bloquearDescartar: estaPendiente,
          titulo: estaPendiente
            ? "Nota de crédito pendiente"
            : estaAutorizada
              ? "Nota de crédito autorizada"
              : estaAnulada
                ? "Nota de crédito anulada"
                : "Nota de crédito rechazada",
          descripcion: estaPendiente
            ? `Nota de crédito pendiente para ${cliente}, factura ${folio}, por $${formatearMoneda(monto)}.`
            : estaAutorizada
              ? `Nota de crédito autorizada para ${cliente}, factura ${folio}, por $${formatearMoneda(monto)}.`
              : estaAnulada
                ? `Nota de crédito anulada para ${cliente}, factura ${folio}, por $${formatearMoneda(monto)}.`
                : `Nota de crédito rechazada para ${cliente}, factura ${folio}, por $${formatearMoneda(monto)}.${solicitud.motivo_resolucion ? ` Motivo: ${solicitud.motivo_resolucion}.` : ""}`,
          fecha: estaPendiente
            ? "En espera de autorización del SU"
            : solicitud.fecha || "Resolución reciente",
          accionTexto:
            userRole === "SU" ? "Abrir panel SU" : "Ver factura",
          ruta: userRole === "SU" ? "/panel-su?tab=creditos" : rutaFacturaExpediente,
        });
      });

    if (solicitudesPendientes.length > 0) {
      feed.push({
        id: "solicitudes-pendientes",
        tipo: "recordatorio",
        prioridad: "PENDIENTE",
        categoriaActividad: "SOLICITUDES",
        esHoy: false,
        orden: 15,
        bloquearDescartar: true,
        titulo:
          userRole === "SU"
            ? "Solicitudes pendientes de autorización"
            : "Solicitudes de crédito en revisión",
        descripcion:
          userRole === "SU"
            ? `${solicitudesPendientes.length} solicitud(es) necesitan autorización o rechazo.`
            : `${solicitudesPendientes.length} solicitud(es) enviadas esperan resolución del SU.`,
        fecha: "En espera de resolución",
        accionTexto:
          userRole === "SU" ? "Revisar solicitudes" : "Ver clientes",
        ruta: userRole === "SU" ? "/panel-su?tab=creditos" : "/clientes",
      });
    }

    (solicitudes || [])
      .filter((solicitud) => {
        if (solicitud.estatus === "Pendiente") return false;

        const tiempo =
          obtenerTiempoFirestore(solicitud.resolvedAt) ||
          obtenerTiempoFirestore(solicitud.createdAt) ||
          obtenerTiempoFirestore(solicitud.fecha);

        if (userRole === "SU") {
          return false;
        }

        return esTiempoReciente(tiempo, 7);
      })
      .slice(0, 4)
      .forEach((solicitud, indice) => {
        const esAprobada = ["Autorizado", "Aprobado"].includes(
          solicitud.estatus,
        );

        const monto =
          Number(solicitud.nuevo_limite_propuesto) ||
          Number(solicitud.monto_incremento) ||
          0;

        const tiempo =
          obtenerTiempoFirestore(solicitud.resolvedAt) ||
          obtenerTiempoFirestore(solicitud.createdAt) ||
          obtenerTiempoFirestore(solicitud.fecha);

        feed.push({
          id: `solicitud-${solicitud.id}`,
          tipo: esAprobada ? "aprobada" : "rechazada",
          prioridad: "CRÉDITO",
          categoriaActividad: "SOLICITUDES",
          esHoy: esTiempoDeHoy(tiempo),
          orden: 85 + indice,
          tiempoOrden: tiempo,
          titulo: `Crédito ${solicitud.estatus}`,
          descripcion: `${solicitud.cliente || "Cliente"}: línea de crédito relacionada por $${formatearMoneda(monto)}.`,
          fecha: solicitud.fecha || "Movimiento reciente",
          accionTexto: "Abrir directorio",
          ruta: "/clientes",
        });
      });

    if (clientesContactoIncompletoConSaldo.length > 0) {
      feed.push({
        id: "clientes-sin-telefono",
        tipo: "dato",
        prioridad: "DATOS",
        categoriaActividad: "DATOS",
        esHoy: false,
        orden: 95,
        titulo: "Datos de contacto incompletos",
        descripcion: `${clientesContactoIncompletoConSaldo.length} cliente(s) con saldo pendiente tienen teléfono o correo incompleto para seguimiento.`,
        fecha: "Revisión de expedientes",
        accionTexto: "Completar contactos",
        ruta: "/clientes?filtro=contacto-incompleto",
      });
    }

    return feed.sort((primera, segunda) => {
      if (primera.orden !== segunda.orden) {
        return primera.orden - segunda.orden;
      }

      return (segunda.tiempoOrden || 0) - (primera.tiempoOrden || 0);
    });
  }, [
    stats,
    resumenSemana,
    solicitudes,
    userRole,
    solicitudesPendientes,
    solicitudesNotasCreditoVisibles,
    recordatoriosHoy,
    recordatoriosAtrasados,
    recordatoriosProximos,
    vencimientosHoy,
    clientesContactoIncompletoConSaldo,
    claveHoy,
  ]);

  useEffect(() => {
    const idsActuales = new Set(
      notificacionesFeed.map((notificacion) => notificacion.id),
    );
    const ocultasDepuradas = depurarNotificacionesOcultas(
      notificacionesOcultas,
      idsActuales,
    );

    if (mapasIguales(notificacionesOcultas, ocultasDepuradas)) {
      return undefined;
    }

    const temporizador = window.setTimeout(() => {
      setNotificacionesOcultas(ocultasDepuradas);

      window.localStorage.setItem(
        STORAGE_NOTIFICACIONES_DESCARTADAS,
        JSON.stringify(ocultasDepuradas),
      );
    }, 0);

    return () => window.clearTimeout(temporizador);
  }, [notificacionesFeed, notificacionesOcultas]);

  const notificacionesOcultasVigentes = depurarNotificacionesOcultas(
    notificacionesOcultas,
    new Set(notificacionesFeed.map((notificacion) => notificacion.id)),
  );

  const idsDescartados = new Set(Object.keys(notificacionesOcultasVigentes));

  const notificacionesOcultasActuales = notificacionesFeed.filter(
    (notificacion) =>
      !notificacion.bloquearDescartar && idsDescartados.has(notificacion.id),
  );

  const notificacionesActivas = notificacionesFeed.filter(
    (notificacion) =>
      notificacion.bloquearDescartar || !idsDescartados.has(notificacion.id),
  );

  const conteosActividad = {
    TODOS: notificacionesActivas.length,
    SOLICITUDES: filtrarActividadPorFiltro(notificacionesActivas, "SOLICITUDES").length,
    HOY: filtrarActividadPorFiltro(notificacionesActivas, "HOY").length,
  };

  const filtrosActividadVisibles = FILTROS_ACTIVIDAD.filter(
    (filtro) =>
      filtro.id === "TODOS" ||
      conteosActividad[filtro.id] > 0 ||
      filtroActividad === filtro.id,
  );

  const notificacionesFiltradas = filtrarActividadPorFiltro(
    notificacionesActivas,
    filtroActividad,
  );

  const notificacionesOcultasFiltroActual = filtrarActividadPorFiltro(
    notificacionesOcultasActuales,
    filtroActividad,
  );

  const notificacionesVisibles = panelExpandido
    ? notificacionesFiltradas
    : notificacionesFiltradas.slice(0, 4);

  return (
    <div className="flex flex-col space-y-4 md:space-y-6 relative pb-6 text-sm animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mt-2 md:mt-4 gap-2 md:gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-[#0a192f] flex items-center tracking-tight">
            <BarChart3 className="h-5 w-5 md:h-6 md:w-6 mr-2 text-blue-600" />
            Resumen Financiero
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1">
            Estado general de cobranza y agenda operativa de la semana.
          </p>
        </div>

        <div className="hidden sm:block text-left md:text-right">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
            Fecha actual
          </p>
          <p className="text-xs md:text-sm font-black text-[#0a192f] capitalize">
            {fechaActualTexto}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <TarjetaKPI
          etiqueta="Monto recuperado"
          valor={`$${formatearMoneda(
            stats?.monto_recuperado ?? stats?.cobrado_historico,
            2,
          )}`}
          descripcion="Total recuperado en pagos registrados."
          icono={DollarSign}
          variante="azul"
        />

        <TarjetaKPI
          etiqueta="Cartera vencida"
          valor={`$${formatearMoneda(stats?.cartera_vencida)}`}
          descripcion={`${
            stats?.cartera_total
              ? (
                  (Number(stats.cartera_vencida) /
                    Number(stats.cartera_total)) *
                  100
                ).toFixed(1)
              : 0
          }% de la cartera total.`}
          icono={AlertTriangle}
          variante="rojo"
          accion={abrirFacturasVencidas}
          textoAccion="Ver Facturación y Cobranza"
        />

        <TarjetaKPI
          etiqueta="Ingresos del mes"
          valor={`$${formatearMoneda(stats?.ingresos_mes)}`}
          descripcion="Flujo de caja recuperado durante el mes."
          icono={TrendingUp}
          variante="verde"
        />

        <TarjetaKPI
          etiqueta="Clientes activos"
          valor={stats?.clientes_activos || 0}
          descripcion="Expedientes comerciales activos."
          icono={Users}
          variante="morado"
          accion={() => navigate("/clientes")}
          textoAccion="Ver directorio completo"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6 items-start">
        <section className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 md:p-5 border-b border-gray-100">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <CalendarDays className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <h2 className="font-black text-[#0a192f] text-base md:text-lg">
                      Flujo semanal
                    </h2>

                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatearRangoSemana(
                        rangoSemana.inicio,
                        new Date(rangoSemana.fin.getTime() - 1),
                      )}
                    </p>

                    <p className="text-[10px] md:text-[11px] text-gray-400 mt-1 leading-relaxed">
                      Selecciona un día para abrir su agenda completa o una
                      categoría para consultar únicamente ese tipo de actividad.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {Object.entries(CATEGORIAS).map(
                    ([categoria, configuracion]) => {
                      const Icono = configuracion.icon;
                      const cantidad = resumenSemana[categoria] || 0;

                      return (
                        <button
                          key={categoria}
                          type="button"
                          onClick={() =>
                            abrirCalendario(
                              rangoSemana.inicio,
                              categoria,
                              "SEMANA",
                            )
                          }
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black ${configuracion.className}`}
                        >
                          <Icono className="h-3.5 w-3.5" />
                          <span>{configuracion.label}</span>
                          <span className="min-w-5 h-5 px-1.5 rounded-full bg-white/90 flex items-center justify-center">
                            {cantidad}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => abrirCalendario(new Date())}
                className="w-full lg:w-auto px-4 py-3 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl text-xs font-black flex items-center justify-center hover:bg-blue-100 shrink-0"
              >
                Ir al calendario
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            </div>
          </div>

          <div className="p-3 md:p-4 bg-gray-50/70">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {diasSemana.map((fecha) => {
                const clave = fechaAClave(fecha);
                const eventosDia = eventosPorDia[clave] || [];
                const conteos = contarCategorias(eventosDia);
                const esHoy = clave === claveHoy;
                const nombreDia = capitalizar(
                  fecha.toLocaleDateString("es-MX", {
                    weekday: "long",
                  }),
                );

                return (
                  <article
                    key={clave}
                    className={`relative overflow-hidden rounded-2xl border bg-white ${
                      esHoy
                        ? "border-blue-200 shadow-sm"
                        : "border-gray-200"
                    }`}
                  >
                    <div
                      className={`h-1 w-full ${
                        esHoy ? "bg-blue-600" : "bg-transparent"
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() => abrirCalendario(fecha, "TODOS", "DIA")}
                      className={`w-full px-4 pt-3 pb-3 text-left border-b ${
                        esHoy
                          ? "border-blue-100 bg-blue-50/45"
                          : "border-gray-100 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">
                            {nombreDia}
                          </p>

                          <div className="flex items-end gap-2 mt-1">
                            <strong className="text-2xl leading-none text-[#0a192f]">
                              {fecha.getDate()}
                            </strong>

                            <span className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">
                              {fecha.toLocaleDateString("es-MX", {
                                month: "short",
                              })}
                            </span>
                          </div>
                        </div>

                        {esHoy && (
                          <span className="text-[9px] bg-blue-600 text-white px-2.5 py-1 rounded-full font-black uppercase tracking-wide">
                            Hoy
                          </span>
                        )}
                      </div>
                    </button>

                    <div className="p-3 min-h-[128px]">
                      {cargando ? (
                        <div className="h-full min-h-[102px] rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-gray-400">
                            Cargando agenda...
                          </span>
                        </div>
                      ) : eventosDia.length ? (
                        <div className="space-y-2">
                          {Object.entries(CATEGORIAS).map(
                            ([categoria, configuracion]) => {
                              const cantidad = conteos[categoria] || 0;
                              if (!cantidad) return null;

                              const Icono = configuracion.icon;

                              return (
                                <button
                                  key={categoria}
                                  type="button"
                                  onClick={() =>
                                    abrirCalendario(fecha, categoria, "DIA")
                                  }
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 border rounded-xl text-left ${configuracion.className}`}
                                >
                                  <span
                                    className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${configuracion.iconClassName}`}
                                  >
                                    <Icono className="h-4 w-4" />
                                  </span>

                                  <span className="min-w-0 flex-1">
                                    <span className="block text-[11px] font-black uppercase leading-tight">
                                      {configuracion.label}
                                    </span>

                                    <span className="block text-[9px] opacity-70 mt-0.5">
                                      Abrir detalle del día
                                    </span>
                                  </span>

                                  <span className="min-w-7 h-7 px-2 rounded-full bg-white/95 border border-white flex items-center justify-center text-[11px] font-black shrink-0">
                                    {cantidad}
                                  </span>
                                </button>
                              );
                            },
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => abrirCalendario(fecha, "TODOS", "DIA")}
                          className="w-full min-h-[102px] rounded-xl border border-dashed border-gray-200 bg-gray-50/70 flex flex-col items-center justify-center text-gray-400"
                        >
                          <CheckCircle className="h-6 w-6 text-gray-300" />
                          <span className="text-[10px] font-black mt-2">
                            Sin pendientes
                          </span>
                          <span className="text-[9px] mt-0.5">
                            Abrir agenda del día
                          </span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-fit min-h-[520px] flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-black text-[#0a192f] flex items-center text-sm md:text-base">
                  <Bell className="h-4 w-4 md:h-5 md:w-5 mr-2 text-blue-600 shrink-0" />
                  Centro de actividad
                </h2>

                <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                  Acciones prioritarias y movimientos recientes.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {notificacionesOcultasActuales.length > 0 && (
                  <button
                    type="button"
                    onClick={restaurarNotificaciones}
                    className="text-[9px] font-black text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2 py-1 hover:bg-gray-100"
                    title={`Restaurar actividades ocultas en este navegador. Las ocultas se limpian automáticamente después de ${DIAS_EXPIRACION_NOTIFICACIONES_OCULTAS} días.`}
                  >
                    Restaurar {notificacionesOcultasActuales.length}
                  </button>
                )}

                <span className="bg-blue-50 text-blue-700 text-[9px] font-black min-w-7 h-7 px-2 rounded-full border border-blue-100 flex items-center justify-center">
                  {notificacionesActivas.length} activas
                </span>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto mt-3 pb-1 custom-scrollbar">
              {filtrosActividadVisibles.map((filtro) => {
                const cantidad = conteosActividad[filtro.id] || 0;

                return (
                  <button
                    key={filtro.id}
                    type="button"
                    onClick={() => {
                      setFiltroActividad(filtro.id);
                      setPanelExpandido(false);
                    }}
                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[9px] font-black transition-colors ${
                      filtroActividad === filtro.id
                        ? "bg-[#0a192f] border-[#0a192f] text-white"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <span>{filtro.label}</span>
                    <span
                      className={`min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center ${
                        filtroActividad === filtro.id
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
          </div>

          <div
            className={
              panelExpandido
                ? "min-h-[360px] max-h-[620px] flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2"
                : "min-h-[360px] max-h-[360px] flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2"
            }
          >
            {notificacionesVisibles.length ? (
              notificacionesVisibles.map((notificacion) => {
                const tarjeta =
                  ESTILOS_CARD_ACTIVIDAD[notificacion.tipo] ||
                  ESTILOS_CARD_ACTIVIDAD.recordatorio;

                const sePuedeOcultar = !notificacion.bloquearDescartar;

                return (
                  <div
                    key={notificacion.id}
                    className={`w-full rounded-2xl border border-gray-200 bg-[#f2f3f7] transition-all duration-200 shadow-[0.45rem_0.45rem_1rem_rgba(180,185,200,0.35),-0.35rem_-0.35rem_0.9rem_rgba(255,255,255,0.9)] ${tarjeta.hover}`}
                  >
                    <div className="flex gap-3 px-4 py-3.5">
                      <div className="pt-1.5 shrink-0">
                        <span
                          className={`block h-2.5 w-2.5 rounded-full ${tarjeta.punto}`}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => navigate(notificacion.ruta)}
                          className="w-full text-left"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[12px] md:text-[13px] font-black text-[#0a192f] leading-snug">
                                {notificacion.titulo}
                              </p>

                              <p
                                className={`text-[10px] md:text-[11px] text-gray-600 mt-1 leading-relaxed ${
                                  panelExpandido
                                    ? "whitespace-normal"
                                    : "line-clamp-2"
                                }`}
                              >
                                {notificacion.descripcion}
                              </p>
                            </div>

                            {notificacion.prioridad &&
                              ["ALTA", "HOY", "PENDIENTE"].includes(
                                notificacion.prioridad,
                              ) && (
                                <span
                                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[7px] font-black uppercase tracking-wide ${
                                    ESTILOS_PRIORIDAD[
                                      notificacion.prioridad
                                    ] ||
                                    "bg-gray-100 text-gray-600 border-gray-200"
                                  }`}
                                >
                                  {notificacion.prioridad}
                                </span>
                              )}
                          </div>

                          <p className="text-[9px] text-gray-400 mt-1.5 flex items-center">
                            <Clock className="h-3 w-3 mr-1 shrink-0" />
                            <span className="truncate">
                              {notificacion.fecha}
                            </span>
                          </p>
                        </button>

                        <div className="flex items-center gap-4 mt-2">
                          <button
                            type="button"
                            onClick={() => navigate(notificacion.ruta)}
                            className={`text-[10px] md:text-[11px] font-black ${tarjeta.accion}`}
                          >
                            {notificacion.accionTexto || "Abrir"}
                          </button>

                          {sePuedeOcultar && (
                            <button
                              type="button"
                              onClick={() =>
                                descartarNotificacion(notificacion.id)
                              }
                              className="text-[10px] md:text-[11px] font-medium text-gray-500 hover:text-red-600"
                            >
                              Ocultar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex min-h-[330px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/70 px-4 py-10 text-center text-gray-400">
                <CheckCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-[11px] font-black">
                  Sin actividades pendientes
                </p>
                <p className="text-[9px] mt-1 leading-relaxed">
                  {notificacionesOcultasFiltroActual.length > 0
                    ? `Las actividades de este filtro están ocultas en este navegador. Se limpiarán solas después de ${DIAS_EXPIRACION_NOTIFICACIONES_OCULTAS} días.`
                    : "No existen acciones para el filtro seleccionado."}
                </p>

                <div className="mt-3 flex flex-wrap justify-center gap-3">
                  {filtroActividad !== "TODOS" && (
                    <button
                      type="button"
                      onClick={() => setFiltroActividad("TODOS")}
                      className="text-[9px] font-black text-blue-600"
                    >
                      Mostrar todas
                    </button>
                  )}

                  {notificacionesOcultasFiltroActual.length > 0 && (
                    <button
                      type="button"
                      onClick={restaurarNotificaciones}
                      className="text-[9px] font-black text-gray-600"
                    >
                      Restaurar ocultas
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {notificacionesFiltradas.length > 4 && (
            <div className="p-2 border-t border-gray-100 bg-gray-50/70">
              <button
                type="button"
                onClick={() =>
                  setPanelExpandido((actual) => !actual)
                }
                className="w-full py-2 text-[10px] font-black text-gray-500 flex items-center justify-center hover:text-[#0a192f]"
              >
                {panelExpandido ? (
                  <>
                    Contraer
                    <ChevronUp className="h-4 w-4 ml-1" />
                  </>
                ) : (
                  <>
                    Ver todas ({notificacionesFiltradas.length})
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </>
                )}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
</file>

<file path="src/pages/GestionUsuarios.jsx">
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  CreditCard,
  ReceiptText,
  Shield,
  UserCheck,
} from "lucide-react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
} from "firebase/firestore";

import { GlobalContext } from "../context/GlobalContext";
import { db } from "../config/firebase";
import { usuariosService } from "../services/usuariosService";
import { solicitudesService } from "../services/solicitudesService";
import AuditoriaSU from "../components/su/AuditoriaSU";
import ControlPersonalSU from "../components/su/ControlPersonalSU";
import CreditoRiesgoSU from "../components/su/CreditoRiesgoSU";
import ModalesSU from "../components/su/ModalesSU";
import ResumenEjecutivoSU from "../components/su/ResumenEjecutivoSU";
import ReporteAbonosSU from "../components/su/ReporteAbonosSU";
import {
  MOVIMIENTOS_LINEA_POR_PAGINA,
  NOTAS_CLIENTES_POR_PAGINA,
  NOTAS_HISTORIAL_POR_PAGINA,
  RESUMENES_LINEA_POR_PAGINA,
  TABS_PANEL_SU,
  ordenarSolicitudesOperativas,
} from "../components/su/suUtils";

const RESUMEN_LINEA_COLLECTION = "lineas_credito_resumen_clientes";
const MOVIMIENTOS_LINEA_COLLECTION = "lineas_credito_movimientos";
const RESUMEN_NOTAS_COLLECTION = "notas_credito_resumen_clientes";
const SOLICITUDES_NOTAS_COLLECTION = "solicitudes_notas_credito";
const ADMIN_USUARIOS_POR_PAGINA = 10;

const normalizarTab = (tab = "") => {
  if (tab === "solicitudes" || tab === "creditos") return "creditos";
  if (tab === "usuarios") return "usuarios";
  if (tab === "actividad") return "actividad";
  if (tab === "abonos") return "abonos";
  return "resumen";
};

const normalizarVistaCredito = (vista = "") =>
  vista === "linea" ? "linea" : "notas";

const normalizarFiltroNotaCredito = (filtro = "") => {
  const filtroSeguro = String(filtro || "").trim();

  if (["Pendiente", "Autorizado", "Rechazado", "Anulada"].includes(filtroSeguro)) {
    return filtroSeguro;
  }

  return "TODAS";
};

export default function GestionUsuarios() {
  const {
    userRole,
    actividad,
    solicitudesNotasCredito,
    currentUser,
    userName,
  } = useContext(GlobalContext);

  const [searchParams, setSearchParams] = useSearchParams();

  const tabActiva = normalizarTab(searchParams.get("tab"));
  const vistaCredito = normalizarVistaCredito(searchParams.get("vista"));
  const clienteLineaSeleccionadoId = searchParams.get("clienteLinea") || "";
  const clienteNotaSeleccionadoId = searchParams.get("clienteNota") || "";
  const filtroHistorialNotasCredito = normalizarFiltroNotaCredito(
    searchParams.get("filtroNota"),
  );

  const isSuperUser = userRole && userRole.trim().toUpperCase() === "SU";
  const usuarioResponsable = userName || "SU_Admin";

  const [modalActivo, setModalActivo] = useState(null);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [actividadSeleccionada, setActividadSeleccionada] = useState(null);
  const [tempSolicitud, setTempSolicitud] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notificacion, setNotificacion] = useState({
    titulo: "",
    descripcion: "",
    tipo: "exito",
  });
  const [motivoRechazoNota, setMotivoRechazoNota] = useState("");
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    usuario: "",
    correo: "",
    password: "",
  });

  const [administradores, setAdministradores] = useState([]);
  const [cargandoAdministradores, setCargandoAdministradores] = useState(false);
  const [errorAdministradores, setErrorAdministradores] = useState("");
  const [paginaAdministradores, setPaginaAdministradores] = useState(1);
  const [cursoresAdministradores, setCursoresAdministradores] = useState([]);
  const [haySiguienteAdministradores, setHaySiguienteAdministradores] =
    useState(false);
  const [hayAdministradoresSuspendidos, setHayAdministradoresSuspendidos] =
    useState(false);

  const [resumenesLineaCredito, setResumenesLineaCredito] = useState([]);
  const [clienteLineaSeleccionadoDetalle, setClienteLineaSeleccionadoDetalle] =
    useState(null);
  const [movimientosClienteLinea, setMovimientosClienteLinea] = useState([]);
  const [cargandoMovimientosLinea, setCargandoMovimientosLinea] =
    useState(false);
  const [cargandoResumenesLineaCredito, setCargandoResumenesLineaCredito] =
    useState(false);
  const [errorResumenesLineaCredito, setErrorResumenesLineaCredito] =
    useState("");
  const [paginaLineaCredito, setPaginaLineaCredito] = useState(1);
  const [cursoresLineaCredito, setCursoresLineaCredito] = useState([]);
  const [haySiguienteLineaCredito, setHaySiguienteLineaCredito] =
    useState(false);

  const [resumenesNotasCredito, setResumenesNotasCredito] = useState([]);
  const [clienteNotaSeleccionadoDetalle, setClienteNotaSeleccionadoDetalle] =
    useState(null);
  const [historialNotasCliente, setHistorialNotasCliente] = useState([]);
  const [cargandoResumenesNotasCredito, setCargandoResumenesNotasCredito] =
    useState(false);
  const [errorResumenesNotasCredito, setErrorResumenesNotasCredito] =
    useState("");
  const [cargandoHistorialNotasCredito, setCargandoHistorialNotasCredito] =
    useState(false);
  const [errorHistorialNotasCredito, setErrorHistorialNotasCredito] =
    useState("");
  const [paginaNotasCredito, setPaginaNotasCredito] = useState(1);
  const [cursoresNotasCredito, setCursoresNotasCredito] = useState([]);
  const [haySiguienteNotasCredito, setHaySiguienteNotasCredito] =
    useState(false);
  const [paginaHistorialNotasCredito, setPaginaHistorialNotasCredito] =
    useState(1);
  const [cursoresHistorialNotasCredito, setCursoresHistorialNotasCredito] =
    useState([]);
  const [haySiguienteHistorialNotasCredito, setHaySiguienteHistorialNotasCredito] =
    useState(false);
  
  const hayAnteriorLineaCredito = paginaLineaCredito > 1;
  const hayAnteriorNotasCredito = paginaNotasCredito > 1;
  const hayAnteriorHistorialNotasCredito = paginaHistorialNotasCredito > 1;
  const hayAnteriorAdministradores = paginaAdministradores > 1;

  const clienteLineaEnPagina = useMemo(
    () =>
      (resumenesLineaCredito || []).find(
        (resumen) => resumen.cliente_id === clienteLineaSeleccionadoId,
      ) || null,
    [clienteLineaSeleccionadoId, resumenesLineaCredito],
  );

  const clienteLineaSeleccionadoParaVista = clienteLineaSeleccionadoId
    ? clienteLineaEnPagina || clienteLineaSeleccionadoDetalle
    : null;

  const clienteNotaEnPagina = useMemo(
    () =>
      (resumenesNotasCredito || []).find(
        (resumen) => resumen.cliente_id === clienteNotaSeleccionadoId,
      ) || null,
    [clienteNotaSeleccionadoId, resumenesNotasCredito],
  );

  const clienteNotaSeleccionadoParaVista = clienteNotaSeleccionadoId
    ? clienteNotaEnPagina || clienteNotaSeleccionadoDetalle
    : null;

  const actualizarParametros = (cambios = {}, borrar = []) => {
    const nuevosParametros = new URLSearchParams(searchParams);

    Object.entries(cambios).forEach(([clave, valor]) => {
      if (valor === null || valor === undefined || valor === "") {
        nuevosParametros.delete(clave);
      } else {
        nuevosParametros.set(clave, valor);
      }
    });

    borrar.forEach((clave) => nuevosParametros.delete(clave));

    setSearchParams(nuevosParametros);
  };

  const cambiarTab = (tab) => {
    actualizarParametros(
      {
        tab,
      },
      tab === "creditos"
        ? []
        : ["vista", "solicitud", "clienteLinea", "clienteNota", "filtroNota"],
    );
  };

  const cambiarVistaCredito = (vista) => {
    actualizarParametros(
      {
        tab: "creditos",
        vista,
      },
      vista === "linea"
        ? ["solicitud", "clienteNota", "filtroNota"]
        : ["clienteLinea"],
    );
  };

  const cargarIndicadorAdministradoresSuspendidos = useCallback(async () => {
    if (!isSuperUser) {
      return;
    }

    const res = await usuariosService.existenAdministradoresSuspendidos();
    setHayAdministradoresSuspendidos(Boolean(res.existe));
  }, [isSuperUser]);

  const cargarPaginaAdministradores = useCallback(
    async ({ paginaDestino = 1, cursor = null, reiniciarCursores = false } = {}) => {
      if (!isSuperUser) return;

      setCargandoAdministradores(true);
      setErrorAdministradores("");

      try {
        const res = await usuariosService.cargarAdministradoresPagina({
          cursor,
          registrosPorPagina: ADMIN_USUARIOS_POR_PAGINA,
        });

        if (!res.success) {
          setAdministradores([]);
          setHaySiguienteAdministradores(false);
          setErrorAdministradores(res.error || "No se pudo cargar usuarios ADMIN.");
          return;
        }

        setAdministradores(res.data || []);
        setPaginaAdministradores(paginaDestino);
        setHaySiguienteAdministradores(Boolean(res.haySiguiente));

        setCursoresAdministradores((cursoresActuales) => {
          if (reiniciarCursores) {
            return res.cursorFinal ? [res.cursorFinal] : [];
          }

          const cursoresNuevos = cursoresActuales.slice(0, paginaDestino - 1);

          if (res.cursorFinal) {
            cursoresNuevos[paginaDestino - 1] = res.cursorFinal;
          }

          return cursoresNuevos;
        });
      } catch (error) {
        console.error("Error cargando usuarios ADMIN:", error);
        setAdministradores([]);
        setHaySiguienteAdministradores(false);
        setErrorAdministradores("No se pudo cargar la página de usuarios ADMIN.");
      } finally {
        setCargandoAdministradores(false);
      }
    },
    [isSuperUser],
  );

  const solicitudesNotasOrdenadas = useMemo(
    () => ordenarSolicitudesOperativas(solicitudesNotasCredito || []),
    [solicitudesNotasCredito],
  );

  const solicitudesPendientesCount = useMemo(
    () =>
      solicitudesNotasOrdenadas.filter(
        (solicitud) => solicitud.estatus === "Pendiente",
      ).length,
    [solicitudesNotasOrdenadas],
  );

  // EFECTO CORREGIDO - Evitamos setState síncrono si no es SuperUser
  useEffect(() => {
    if (!isSuperUser) return undefined;

    let cancelado = false;

    const timeoutId = window.setTimeout(() => {
      if (cancelado) return;

      cargarPaginaAdministradores({
        paginaDestino: 1,
        cursor: null,
        reiniciarCursores: true,
      });
      cargarIndicadorAdministradoresSuspendidos();
    }, 0);

    return () => {
      cancelado = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    cargarIndicadorAdministradoresSuspendidos,
    cargarPaginaAdministradores,
    isSuperUser,
  ]);

  const irSiguienteAdministradores = () => {
    if (cargandoAdministradores || !haySiguienteAdministradores) return;

    const cursorActual = cursoresAdministradores[paginaAdministradores - 1];

    if (!cursorActual) return;

    cargarPaginaAdministradores({
      paginaDestino: paginaAdministradores + 1,
      cursor: cursorActual,
    });
  };

  const irAnteriorAdministradores = () => {
    if (cargandoAdministradores || paginaAdministradores <= 1) return;

    const paginaDestino = paginaAdministradores - 1;
    const cursorAnterior =
      paginaDestino === 1 ? null : cursoresAdministradores[paginaDestino - 2];

    cargarPaginaAdministradores({
      paginaDestino,
      cursor: cursorAnterior,
    });
  };

  const refrescarPaginaActualAdministradores = async () => {
    await cargarPaginaAdministradores({
      paginaDestino: paginaAdministradores,
      cursor:
        paginaAdministradores === 1
          ? null
          : cursoresAdministradores[paginaAdministradores - 2],
      reiniciarCursores: paginaAdministradores === 1,
    });

    await cargarIndicadorAdministradoresSuspendidos();
  };

  const cargarPaginaResumenesLineaCredito = useCallback(
    async ({ paginaDestino = 1, cursor = null, reiniciarCursores = false } = {}) => {
      if (!isSuperUser) return;

      setCargandoResumenesLineaCredito(true);
      setErrorResumenesLineaCredito("");

      try {
        const restricciones = [];

        restricciones.push(orderBy("ultimo_movimiento_at", "desc"));

        if (cursor) {
          restricciones.push(startAfter(cursor));
        }

        restricciones.push(limit(RESUMENES_LINEA_POR_PAGINA + 1));

        const qResumenes = query(
          collection(db, RESUMEN_LINEA_COLLECTION),
          ...restricciones,
        );

        const snap = await getDocs(qResumenes);
        const documentosVisibles = snap.docs.slice(
          0,
          RESUMENES_LINEA_POR_PAGINA,
        );

        const data = documentosVisibles.map((documento) => ({
          id: documento.id,
          ...documento.data(),
        }));

        setResumenesLineaCredito(data);
        setPaginaLineaCredito(paginaDestino);
        setHaySiguienteLineaCredito(
          snap.docs.length > RESUMENES_LINEA_POR_PAGINA,
        );

        setCursoresLineaCredito((cursoresActuales) => {
          if (reiniciarCursores) {
            return documentosVisibles.length > 0
              ? [documentosVisibles[documentosVisibles.length - 1]]
              : [];
          }

          const cursoresNuevos = cursoresActuales.slice(0, paginaDestino - 1);

          if (documentosVisibles.length > 0) {
            cursoresNuevos[paginaDestino - 1] =
              documentosVisibles[documentosVisibles.length - 1];
          }

          return cursoresNuevos;
        });
      } catch (error) {
        console.error("Error cargando resumen de línea de crédito:", error);
        setResumenesLineaCredito([]);
        setHaySiguienteLineaCredito(false);
        setErrorResumenesLineaCredito(
          error?.code === "failed-precondition"
            ? "Firestore requiere un índice para este filtro. Crea el índice que Firebase indique en consola."
            : "No se pudo cargar la página de líneas de crédito.",
        );
      } finally {
        setCargandoResumenesLineaCredito(false);
      }
    },
    [isSuperUser],
  );

  const cargarPaginaResumenesNotasCredito = useCallback(
    async ({ paginaDestino = 1, cursor = null, reiniciarCursores = false } = {}) => {
      if (!isSuperUser) return;

      setCargandoResumenesNotasCredito(true);
      setErrorResumenesNotasCredito("");

      try {
        const restricciones = [];

        restricciones.push(orderBy("ultimo_movimiento_at", "desc"));

        if (cursor) {
          restricciones.push(startAfter(cursor));
        }

        restricciones.push(limit(NOTAS_CLIENTES_POR_PAGINA + 1));

        const qResumenes = query(
          collection(db, RESUMEN_NOTAS_COLLECTION),
          ...restricciones,
        );

        const snap = await getDocs(qResumenes);
        const documentosVisibles = snap.docs.slice(
          0,
          NOTAS_CLIENTES_POR_PAGINA,
        );

        const resumenesOptimizados = documentosVisibles.map((documento) => ({
          id: documento.id,
          ...documento.data(),
        }));

        setResumenesNotasCredito(resumenesOptimizados);
        setPaginaNotasCredito(paginaDestino);
        setHaySiguienteNotasCredito(
          snap.docs.length > NOTAS_CLIENTES_POR_PAGINA,
        );

        setCursoresNotasCredito((cursoresActuales) => {
          if (reiniciarCursores) {
            return documentosVisibles.length > 0
              ? [documentosVisibles[documentosVisibles.length - 1]]
              : [];
          }

          const cursoresNuevos = cursoresActuales.slice(0, paginaDestino - 1);

          if (documentosVisibles.length > 0) {
            cursoresNuevos[paginaDestino - 1] =
              documentosVisibles[documentosVisibles.length - 1];
          }

          return cursoresNuevos;
        });
      } catch (error) {
        console.error("Error cargando resumen de notas de crédito:", error);
        setResumenesNotasCredito([]);
        setHaySiguienteNotasCredito(false);
        setErrorResumenesNotasCredito(
          error?.code === "failed-precondition"
            ? "Firestore requiere un índice para cargar clientes con notas. Crea el índice que Firebase indique en consola."
            : "No se pudo cargar la página de clientes con notas de crédito.",
        );
      } finally {
        setCargandoResumenesNotasCredito(false);
      }
    },
    [isSuperUser],
  );

  const cargarPaginaHistorialNotasCredito = useCallback(
    async ({ paginaDestino = 1, cursor = null, reiniciarCursores = false } = {}) => {
      if (!isSuperUser || !clienteNotaSeleccionadoId) return;

      setCargandoHistorialNotasCredito(true);
      setErrorHistorialNotasCredito("");

      try {
        const restricciones = [where("cliente_id", "==", clienteNotaSeleccionadoId)];

        if (filtroHistorialNotasCredito === "Anulada") {
          restricciones.push(where("nota_anulada", "==", true));
        } else if (filtroHistorialNotasCredito !== "TODAS") {
          restricciones.push(where("estatus", "==", filtroHistorialNotasCredito));
        }

        restricciones.push(orderBy("createdAt", "desc"));

        if (cursor) {
          restricciones.push(startAfter(cursor));
        }

        restricciones.push(limit(NOTAS_HISTORIAL_POR_PAGINA + 1));

        const qHistorial = query(
          collection(db, SOLICITUDES_NOTAS_COLLECTION),
          ...restricciones,
        );

        const snap = await getDocs(qHistorial);
        const documentosVisibles = snap.docs.slice(
          0,
          NOTAS_HISTORIAL_POR_PAGINA,
        );

        const data = documentosVisibles.map((documento) => ({
          id: documento.id,
          ...documento.data(),
        }));

        setHistorialNotasCliente(data);
        setPaginaHistorialNotasCredito(paginaDestino);
        setHaySiguienteHistorialNotasCredito(
          snap.docs.length > NOTAS_HISTORIAL_POR_PAGINA,
        );

        setCursoresHistorialNotasCredito((cursoresActuales) => {
          if (reiniciarCursores) {
            return documentosVisibles.length > 0
              ? [documentosVisibles[documentosVisibles.length - 1]]
              : [];
          }

          const cursoresNuevos = cursoresActuales.slice(0, paginaDestino - 1);

          if (documentosVisibles.length > 0) {
            cursoresNuevos[paginaDestino - 1] =
              documentosVisibles[documentosVisibles.length - 1];
          }

          return cursoresNuevos;
        });
      } catch (error) {
        console.error("Error cargando historial de notas de crédito:", error);
        setHistorialNotasCliente([]);
        setHaySiguienteHistorialNotasCredito(false);
        setErrorHistorialNotasCredito(
          error?.code === "failed-precondition"
            ? "Firestore requiere un índice para este historial. Crea el índice que Firebase indique en consola."
            : "No se pudo cargar el historial de notas del cliente.",
        );
      } finally {
        setCargandoHistorialNotasCredito(false);
      }
    },
    [clienteNotaSeleccionadoId, filtroHistorialNotasCredito, isSuperUser],
  );

  useEffect(() => {
    if (!isSuperUser || tabActiva !== "creditos" || vistaCredito !== "linea") {
      return undefined;
    }

    let cancelado = false;

    const timeoutId = window.setTimeout(() => {
      if (cancelado) return;

      cargarPaginaResumenesLineaCredito({
        paginaDestino: 1,
        cursor: null,
        reiniciarCursores: true,
      });
    }, 0);

    return () => {
      cancelado = true;
      window.clearTimeout(timeoutId);
    };
  }, [cargarPaginaResumenesLineaCredito, isSuperUser, tabActiva, vistaCredito]);

  useEffect(() => {
    if (!isSuperUser || tabActiva !== "creditos" || vistaCredito !== "notas") {
      return undefined;
    }

    let cancelado = false;

    const timeoutId = window.setTimeout(() => {
      if (cancelado) return;

      cargarPaginaResumenesNotasCredito({
        paginaDestino: 1,
        cursor: null,
        reiniciarCursores: true,
      });
    }, 0);

    return () => {
      cancelado = true;
      window.clearTimeout(timeoutId);
    };
  }, [cargarPaginaResumenesNotasCredito, isSuperUser, tabActiva, vistaCredito]);

  useEffect(() => {
    if (
      !isSuperUser ||
      tabActiva !== "creditos" ||
      vistaCredito !== "linea" ||
      !clienteLineaSeleccionadoId ||
      clienteLineaEnPagina
    ) {
      return undefined;
    }

    let cancelado = false;

    const cargarDetalleSeleccionado = async () => {
      try {
        const resumenRef = doc(
          db,
          RESUMEN_LINEA_COLLECTION,
          clienteLineaSeleccionadoId,
        );
        const resumenSnap = await getDoc(resumenRef);

        if (cancelado) return;

        if (resumenSnap.exists()) {
          setClienteLineaSeleccionadoDetalle({
            id: resumenSnap.id,
            ...resumenSnap.data(),
          });
        } else {
          setClienteLineaSeleccionadoDetalle(null);
        }
      } catch (error) {
        console.error("Error cargando detalle de línea seleccionado:", error);

        if (!cancelado) {
          setClienteLineaSeleccionadoDetalle(null);
        }
      }
    };

    cargarDetalleSeleccionado();

    return () => {
      cancelado = true;
    };
  }, [
    clienteLineaEnPagina,
    clienteLineaSeleccionadoId,
    isSuperUser,
    tabActiva,
    vistaCredito,
  ]);

  useEffect(() => {
    if (
      !isSuperUser ||
      tabActiva !== "creditos" ||
      vistaCredito !== "notas" ||
      !clienteNotaSeleccionadoId ||
      clienteNotaEnPagina
    ) {
      return undefined;
    }

    let cancelado = false;

    const cargarDetalleSeleccionado = async () => {
      try {
        const resumenRef = doc(
          db,
          RESUMEN_NOTAS_COLLECTION,
          clienteNotaSeleccionadoId,
        );
        const resumenSnap = await getDoc(resumenRef);

        if (cancelado) return;

        setClienteNotaSeleccionadoDetalle(
          resumenSnap.exists()
            ? {
                id: resumenSnap.id,
                ...resumenSnap.data(),
              }
            : null,
        );
      } catch (error) {
        console.error("Error cargando detalle de notas seleccionado:", error);

        if (!cancelado) {
          setClienteNotaSeleccionadoDetalle(null);
        }
      }
    };

    cargarDetalleSeleccionado();

    return () => {
      cancelado = true;
    };
  }, [
    clienteNotaEnPagina,
    clienteNotaSeleccionadoId,
    isSuperUser,
    tabActiva,
    vistaCredito,
  ]);

  useEffect(() => {
    if (
      !isSuperUser ||
      tabActiva !== "creditos" ||
      vistaCredito !== "notas" ||
      !clienteNotaSeleccionadoId
    ) {
      return undefined;
    }

    let cancelado = false;

    const timeoutId = window.setTimeout(() => {
      if (cancelado) return;

      cargarPaginaHistorialNotasCredito({
        paginaDestino: 1,
        cursor: null,
        reiniciarCursores: true,
      });
    }, 0);

    return () => {
      cancelado = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    cargarPaginaHistorialNotasCredito,
    clienteNotaSeleccionadoId,
    isSuperUser,
    tabActiva,
    vistaCredito,
  ]);

  useEffect(() => {
    if (
      !isSuperUser ||
      tabActiva !== "creditos" ||
      vistaCredito !== "linea" ||
      !clienteLineaSeleccionadoId
    ) {
      return undefined;
    }

    const qMovimientos = query(
      collection(db, MOVIMIENTOS_LINEA_COLLECTION),
      where("cliente_id", "==", clienteLineaSeleccionadoId),
      orderBy("createdAt", "desc"),
      limit(MOVIMIENTOS_LINEA_POR_PAGINA),
    );

    const unsub = onSnapshot(
      qMovimientos,
      (snap) => {
        const data = snap.docs.map((documento) => ({
          id: documento.id,
          ...documento.data(),
        }));

        setMovimientosClienteLinea(data);
        setCargandoMovimientosLinea(false);
      },
      (error) => {
        console.error("Error cargando historial de línea del cliente:", error);
        setMovimientosClienteLinea([]);
        setCargandoMovimientosLinea(false);
      },
    );

    return () => unsub();
  }, [isSuperUser, clienteLineaSeleccionadoId, tabActiva, vistaCredito]);

  const irSiguienteLineaCredito = () => {
    if (cargandoResumenesLineaCredito || !haySiguienteLineaCredito) return;

    const cursorActual = cursoresLineaCredito[paginaLineaCredito - 1];

    if (!cursorActual) return;

    cargarPaginaResumenesLineaCredito({
      paginaDestino: paginaLineaCredito + 1,
      cursor: cursorActual,
    });
  };

  const irAnteriorLineaCredito = () => {
    if (cargandoResumenesLineaCredito || paginaLineaCredito <= 1) return;

    const paginaDestino = paginaLineaCredito - 1;
    const cursorAnterior =
      paginaDestino === 1 ? null : cursoresLineaCredito[paginaDestino - 2];

    cargarPaginaResumenesLineaCredito({
      paginaDestino,
      cursor: cursorAnterior,
    });
  };

  const irSiguienteNotasCredito = () => {
    if (cargandoResumenesNotasCredito || !haySiguienteNotasCredito) return;

    const cursorActual = cursoresNotasCredito[paginaNotasCredito - 1];

    if (!cursorActual) return;

    cargarPaginaResumenesNotasCredito({
      paginaDestino: paginaNotasCredito + 1,
      cursor: cursorActual,
    });
  };

  const irAnteriorNotasCredito = () => {
    if (cargandoResumenesNotasCredito || paginaNotasCredito <= 1) return;

    const paginaDestino = paginaNotasCredito - 1;
    const cursorAnterior =
      paginaDestino === 1 ? null : cursoresNotasCredito[paginaDestino - 2];

    cargarPaginaResumenesNotasCredito({
      paginaDestino,
      cursor: cursorAnterior,
    });
  };

  const irSiguienteHistorialNotasCredito = () => {
    if (cargandoHistorialNotasCredito || !haySiguienteHistorialNotasCredito) {
      return;
    }

    const cursorActual = cursoresHistorialNotasCredito[paginaHistorialNotasCredito - 1];

    if (!cursorActual) return;

    cargarPaginaHistorialNotasCredito({
      paginaDestino: paginaHistorialNotasCredito + 1,
      cursor: cursorActual,
    });
  };

  const irAnteriorHistorialNotasCredito = () => {
    if (cargandoHistorialNotasCredito || paginaHistorialNotasCredito <= 1) {
      return;
    }

    const paginaDestino = paginaHistorialNotasCredito - 1;
    const cursorAnterior =
      paginaDestino === 1
        ? null
        : cursoresHistorialNotasCredito[paginaDestino - 2];

    cargarPaginaHistorialNotasCredito({
      paginaDestino,
      cursor: cursorAnterior,
    });
  };

  const cerrarModal = () => {
    if (isSubmitting) return;

    setModalActivo(null);
    setUsuarioSeleccionado(null);
    setActividadSeleccionada(null);
    setTempSolicitud(null);
    setMotivoRechazoNota("");
  };

  const mostrarNotificacion = (titulo, descripcion, tipo = "exito") => {
    setNotificacion({ titulo, descripcion, tipo });
    setModalActivo("notificacion");
  };

  const handleCrearUsuario = async (event) => {
    event.preventDefault();

    if (!currentUser?.uid) {
      mostrarNotificacion(
        "Error",
        "No se pudo identificar al Súper Usuario responsable.",
        "error",
      );
      return;
    }

    setIsSubmitting(true);

    const res = await usuariosService.crearAdmin({
      nombre: nuevoUsuario.nombre,
      usuario: nuevoUsuario.usuario,
      correo: nuevoUsuario.correo,
      password: nuevoUsuario.password,
      userName: usuarioResponsable,
      actor_uid: currentUser.uid,
    });

    setIsSubmitting(false);

    if (res.success) {
      mostrarNotificacion(
        "Usuario creado",
        `El acceso para ${nuevoUsuario.nombre} fue generado con alias y correo real.`,
      );

      setNuevoUsuario({
        nombre: "",
        usuario: "",
        correo: "",
        password: "",
      });

      await cargarPaginaAdministradores({
        paginaDestino: 1,
        cursor: null,
        reiniciarCursores: true,
      });
      await cargarIndicadorAdministradoresSuspendidos();

      return;
    }

    mostrarNotificacion("Alerta", res.error, "error");
  };

  const abrirConfirmacionEstado = (usuario) => {
    setUsuarioSeleccionado(usuario);
    setModalActivo("confirmarEstado");
  };

  const abrirConfirmacionResetPassword = (usuario) => {
    setUsuarioSeleccionado(usuario);
    setModalActivo("confirmarResetPassword");
  };

  const confirmarResetPassword = async () => {
    if (!usuarioSeleccionado || !currentUser?.uid) {
      mostrarNotificacion(
        "Error",
        "No se pudo identificar al usuario o al Súper Usuario responsable.",
        "error",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await usuariosService.enviarRecuperacionPassword({
        correoObjetivo: usuarioSeleccionado.correo,
        usuarioAlias: usuarioSeleccionado.usuario_alias || usuarioSeleccionado.usuarioLimpio,
        userName: usuarioResponsable,
        actor_uid: currentUser.uid,
      });

      if (!res.success) {
        mostrarNotificacion(
          "Error",
          res.error || "No se pudo enviar el correo de recuperación.",
          "error",
        );
        return;
      }

      setUsuarioSeleccionado(null);

      mostrarNotificacion(
        "Recuperación enviada",
        "Firebase envió el enlace de recuperación al correo real vinculado.",
      );
    } catch (error) {
      console.error("Error enviando recuperación:", error);

      mostrarNotificacion(
        "Error crítico",
        "Ocurrió un error inesperado al enviar la recuperación.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
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
        usuarioAlias: usuarioSeleccionado.usuario_alias || usuarioSeleccionado.usuarioLimpio,
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

      await refrescarPaginaActualAdministradores();

      mostrarNotificacion(
        nuevoEstado ? "Usuario reactivado" : "Usuario suspendido",
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

  const abrirEvaluarSolicitudNotaCredito = (solicitud, nuevoEstatus) => {
    setMotivoRechazoNota("");
    setTempSolicitud({
      ...solicitud,
      nuevoEstatus,
      tipo_solicitud: "NOTA_CREDITO",
    });
    setModalActivo("confirmarSolicitud");
  };

  const confirmarSolicitud = async () => {
    if (!tempSolicitud?.id || !currentUser?.uid) {
      mostrarNotificacion(
        "Error",
        "No se pudo identificar la solicitud o al Súper Usuario.",
        "error",
      );
      return;
    }

    if (tempSolicitud.nuevoEstatus === "Rechazado" && !motivoRechazoNota.trim()) {
      mostrarNotificacion(
        "Motivo requerido",
        "Ingresa el motivo del rechazo para que el ADMIN pueda consultarlo.",
        "error",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await solicitudesService.resolverSolicitudNotaCredito({
        solicitud_id: tempSolicitud.id,
        decision: tempSolicitud.nuevoEstatus,
        actor_uid: currentUser.uid,
        actor_nombre: usuarioResponsable,
        motivo_resolucion:
          tempSolicitud.nuevoEstatus === "Rechazado"
            ? motivoRechazoNota
            : "",
      });

      if (!res.success) {
        mostrarNotificacion(
          "Error al resolver",
          res.error || "No se pudo procesar la solicitud.",
          "error",
        );
        return;
      }

      mostrarNotificacion(
        tempSolicitud.nuevoEstatus === "Autorizado"
          ? "Solicitud aprobada"
          : "Solicitud rechazada",
        tempSolicitud.nuevoEstatus === "Autorizado"
          ? "La nota de crédito fue aplicada a la factura y quedó registrada en auditoría."
          : "La solicitud de nota de crédito fue rechazada sin modificar la factura.",
      );

      setTempSolicitud(null);
      setMotivoRechazoNota("");

      await cargarPaginaResumenesNotasCredito({
        paginaDestino: paginaNotasCredito,
        cursor: paginaNotasCredito === 1 ? null : cursoresNotasCredito[paginaNotasCredito - 2],
        reiniciarCursores: paginaNotasCredito === 1,
      });

      if (clienteNotaSeleccionadoId) {
        await cargarPaginaHistorialNotasCredito({
          paginaDestino: 1,
          cursor: null,
          reiniciarCursores: true,
        });
      }
    } catch (error) {
      console.error("Error resolviendo solicitud:", error);

      mostrarNotificacion(
        "Error crítico",
        "Ocurrió un error inesperado al resolver la solicitud.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const seleccionarClienteNota = (resumen) => {
    const mismoElemento = clienteNotaSeleccionadoId === resumen.cliente_id;

    if (mismoElemento) {
      setClienteNotaSeleccionadoDetalle(null);
      setHistorialNotasCliente([]);
      setCargandoHistorialNotasCredito(false);
    } else {
      setClienteNotaSeleccionadoDetalle(resumen);
      setHistorialNotasCliente([]);
      setCargandoHistorialNotasCredito(true);
    }

    actualizarParametros(
      {
        tab: "creditos",
        vista: "notas",
        clienteNota: mismoElemento ? "" : resumen.cliente_id,
        filtroNota: mismoElemento ? "" : "TODAS",
      },
      ["clienteLinea", "solicitud"],
    );
  };

  const cambiarFiltroHistorialNotasCredito = (filtro) => {
    actualizarParametros(
      {
        tab: "creditos",
        vista: "notas",
        filtroNota: filtro === "TODAS" ? "" : filtro,
      },
      ["clienteLinea", "solicitud"],
    );
  };

  const seleccionarClienteLinea = (resumen) => {
    const mismoElemento = clienteLineaSeleccionadoId === resumen.cliente_id;

    if (mismoElemento) {
      setClienteLineaSeleccionadoDetalle(null);
      setMovimientosClienteLinea([]);
      setCargandoMovimientosLinea(false);
    } else {
      setClienteLineaSeleccionadoDetalle(resumen);
      setMovimientosClienteLinea([]);
      setCargandoMovimientosLinea(true);
    }

    actualizarParametros(
      {
        tab: "creditos",
        vista: "linea",
        clienteLinea: mismoElemento ? "" : resumen.cliente_id,
      },
      ["solicitud", "clienteNota", "filtroNota"],
    );
  };

  const abrirDetalleEdicionFactura = (actividadSeleccionadaNueva) => {
    setActividadSeleccionada(actividadSeleccionadaNueva);
    setModalActivo("detalleEdicionFactura");
  };

  if (!isSuperUser) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center rounded-xl border border-gray-100 bg-white p-6 text-center shadow-sm animate-in zoom-in duration-300">
        <div className="mb-4 rounded-full bg-red-50 p-4 text-red-500">
          <Shield className="h-10 w-10" />
        </div>

        <h2 className="text-xl font-black text-[#0a192f]">
          Área privada requerida
        </h2>

        <p className="mt-1 max-w-sm text-xs leading-relaxed text-gray-400">
          No posees el rango maestro de Súper Usuario para modificar accesos o auditar operaciones financieras.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col space-y-4 pb-10 text-sm animate-fade-in md:space-y-6">
      <div className="mt-2 flex flex-col items-start justify-between gap-2 md:mt-4 md:flex-row md:items-end md:gap-4">
        <div>
          <h1 className="flex items-center text-xl font-bold text-[#0a192f] md:text-2xl">
            <Shield className="mr-2 h-5 w-5 text-amber-500 md:h-6 md:w-6" />
            Panel de Control SU
          </h1>

          <p className="mt-1 text-xs text-gray-500 md:text-sm">
            Centro ejecutivo de personal, gestión de créditos y auditoría global.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 rounded-2xl border border-white bg-white/55 p-2 shadow-sm sm:grid-cols-2 xl:grid-cols-5">
        {TABS_PANEL_SU.map((tab) => {
          const activa = tabActiva === tab.id;

          const Icono =
            tab.id === "resumen"
              ? Shield
              : tab.id === "usuarios"
                ? UserCheck
                : tab.id === "creditos"
                  ? CreditCard
                  : tab.id === "abonos"
                    ? ReceiptText
                    : Activity;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => cambiarTab(tab.id)}
              className={`group flex min-h-[64px] items-center gap-2 rounded-xl border px-3 py-3 text-left transition-all duration-100 active:scale-[0.98] md:gap-3 md:px-4 ${
                activa
                  ? "border-[#0a192f] bg-[#0a192f] text-white shadow-sm"
                  : "border-transparent text-gray-600 hover:-translate-y-0.5 hover:border-[#ffd700]/60 hover:bg-white hover:shadow-[0_10px_22px_rgba(10,25,47,0.10)]"
              }`}
            >
              <Icono
                className={`h-4 w-4 shrink-0 ${
                  activa ? "text-[#ffd700]" : "text-gray-400 group-hover:text-[#ffd700]"
                }`}
              />

              <span className="min-w-0">
                <span className="block text-xs font-black">
                  {tab.label}
                  {tab.id === "creditos" && solicitudesPendientesCount > 0 && (
                    <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] text-white">
                      {solicitudesPendientesCount}
                    </span>
                  )}
                </span>

                <span
                  className={`hidden text-[10px] font-semibold md:block ${
                    activa ? "text-white/60" : "text-gray-400"
                  }`}
                >
                  {tab.descripcion}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {tabActiva === "resumen" && (
        <ResumenEjecutivoSU
          solicitudesNotasOrdenadas={solicitudesNotasOrdenadas}
          actividad={actividad || []}
          onCambiarTab={cambiarTab}
          hayUsuariosSuspendidos={hayAdministradoresSuspendidos}
        />
      )}

      {tabActiva === "usuarios" && (
        <ControlPersonalSU
          administradores={administradores}
          onCrearUsuario={() => setModalActivo("nuevoUsuario")}
          onCambiarEstado={abrirConfirmacionEstado}
          onEnviarResetPassword={abrirConfirmacionResetPassword}
          haySuspendidos={hayAdministradoresSuspendidos}
          pagina={paginaAdministradores}
          hayAnterior={hayAnteriorAdministradores}
          haySiguiente={haySiguienteAdministradores}
          cargando={cargandoAdministradores}
          error={errorAdministradores}
          registrosEnPagina={administradores.length}
          onAnterior={irAnteriorAdministradores}
          onSiguiente={irSiguienteAdministradores}
        />
      )}

      {tabActiva === "creditos" && (
        <CreditoRiesgoSU
          vistaCredito={vistaCredito}
          onCambiarVista={cambiarVistaCredito}
          clienteNotaSeleccionadoId={clienteNotaSeleccionadoId}
          clienteNotaSeleccionado={clienteNotaSeleccionadoParaVista}
          resumenesNotasCredito={resumenesNotasCredito}
          historialNotasCliente={historialNotasCliente}
          cargandoResumenesNotasCredito={cargandoResumenesNotasCredito}
          errorResumenesNotasCredito={errorResumenesNotasCredito}
          cargandoHistorialNotasCredito={cargandoHistorialNotasCredito}
          errorHistorialNotasCredito={errorHistorialNotasCredito}
          paginaNotasCredito={paginaNotasCredito}
          hayAnteriorNotasCredito={hayAnteriorNotasCredito}
          haySiguienteNotasCredito={haySiguienteNotasCredito}
          paginaHistorialNotasCredito={paginaHistorialNotasCredito}
          hayAnteriorHistorialNotasCredito={hayAnteriorHistorialNotasCredito}
          haySiguienteHistorialNotasCredito={haySiguienteHistorialNotasCredito}
          filtroHistorialNotasCredito={filtroHistorialNotasCredito}
          clienteLineaSeleccionadoId={clienteLineaSeleccionadoId}
          clienteLineaSeleccionado={clienteLineaSeleccionadoParaVista}
          solicitudesNotasOrdenadas={solicitudesNotasOrdenadas}
          resumenesLineaCredito={resumenesLineaCredito}
          movimientosClienteLinea={movimientosClienteLinea}
          cargandoMovimientosLinea={cargandoMovimientosLinea}
          cargandoResumenesLineaCredito={cargandoResumenesLineaCredito}
          errorResumenesLineaCredito={errorResumenesLineaCredito}
          paginaLineaCredito={paginaLineaCredito}
          hayAnteriorLineaCredito={hayAnteriorLineaCredito}
          haySiguienteLineaCredito={haySiguienteLineaCredito}
          onAnteriorNotasCredito={irAnteriorNotasCredito}
          onSiguienteNotasCredito={irSiguienteNotasCredito}
          onAnteriorHistorialNotasCredito={irAnteriorHistorialNotasCredito}
          onSiguienteHistorialNotasCredito={irSiguienteHistorialNotasCredito}
          onCambiarFiltroHistorialNotasCredito={cambiarFiltroHistorialNotasCredito}
          onAnteriorLineaCredito={irAnteriorLineaCredito}
          onSiguienteLineaCredito={irSiguienteLineaCredito}
          onSeleccionarClienteNota={seleccionarClienteNota}
          onSeleccionarClienteLinea={seleccionarClienteLinea}
          onResolverSolicitudNota={abrirEvaluarSolicitudNotaCredito}
        />
      )}

      {tabActiva === "actividad" && (
        <AuditoriaSU
          actividad={actividad || []}
          onVerDetalleEdicionFactura={abrirDetalleEdicionFactura}
        />
      )}


      {tabActiva === "abonos" && (
        <ReporteAbonosSU
          actorUid={currentUser?.uid}
          userName={userName || usuarioResponsable}
        />
      )}

      <ModalesSU
        modalActivo={modalActivo}
        nuevoUsuario={nuevoUsuario}
        setNuevoUsuario={setNuevoUsuario}
        usuarioSeleccionado={usuarioSeleccionado}
        tempSolicitud={tempSolicitud}
        actividadSeleccionada={actividadSeleccionada}
        notificacion={notificacion}
        motivoRechazoNota={motivoRechazoNota}
        setMotivoRechazoNota={setMotivoRechazoNota}
        isSubmitting={isSubmitting}
        onCerrarModal={cerrarModal}
        onCrearUsuario={handleCrearUsuario}
        onAlternarEstadoUsuario={alternarEstadoUsuario}
        onConfirmarSolicitud={confirmarSolicitud}
        onConfirmarResetPassword={confirmarResetPassword}
      />
    </div>
  );
}
</file>

<file path="src/pages/Login.jsx">
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, AlertTriangle, Loader2, Info, Mail } from "lucide-react";
import {
  browserSessionPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { GlobalContext } from "../context/GlobalContext";

import logoMadereria from "../assets/MHA LOGO.png";
import logoMLH from "../assets/MLH LOGO1.png";

const ALIAS_COLLECTION = "login_aliases";

const normalizarAliasLogin = (valor = "") =>
  String(valor || "")
    .trim()
    .toLowerCase();

const esCorreo = (valor = "") => String(valor || "").includes("@");

const aliasValidoLogin = (valor = "") => /^[a-z0-9._-]+$/.test(valor);

const correoRealValido = (valor = "") => {
  const correo = String(valor || "").trim().toLowerCase();

  return (
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) &&
    !correo.endsWith("@mlh.local")
  );
};

const crearErrorAlias = (mensaje) => {
  const error = new Error(mensaje);
  error.name = "AliasLoginError";
  return error;
};

const resolverCorreoAuth = async (usuarioCapturado) => {
  const usuarioNormalizado = normalizarAliasLogin(usuarioCapturado);

  if (!usuarioNormalizado) {
    throw crearErrorAlias("Captura tu usuario de acceso.");
  }

  if (esCorreo(usuarioNormalizado)) {
    throw crearErrorAlias("Escribe solo tu usuario de acceso, no el correo.");
  }

  if (!aliasValidoLogin(usuarioNormalizado)) {
    throw crearErrorAlias(
      "Usuario inválido. Usa solo letras, números, punto, guion o guion bajo.",
    );
  }

  try {
    const aliasRef = doc(db, ALIAS_COLLECTION, usuarioNormalizado);
    const aliasSnap = await getDoc(aliasRef);

    if (!aliasSnap.exists()) {
      throw crearErrorAlias("Usuario no encontrado o sin acceso vigente.");
    }

    const data = aliasSnap.data();

    if (data.activo !== true) {
      throw crearErrorAlias("Este acceso se encuentra suspendido.");
    }

    const correoAuth = String(data.correo_auth || "")
      .trim()
      .toLowerCase();

    if (!correoRealValido(correoAuth)) {
      throw crearErrorAlias(
        "Este usuario no tiene un correo real válido configurado.",
      );
    }

    return correoAuth;
  } catch (error) {
    if (error.name === "AliasLoginError") {
      throw error;
    }

    console.error("Error resolviendo alias de acceso:", error);

    throw crearErrorAlias(
      "No fue posible validar tu usuario. Intenta nuevamente.",
    );
  }
};

function CampoFlotante({
  id,
  label,
  type = "text",
  value,
  onChange,
  disabled,
  autoComplete,
  Icon,
}) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35 transition-colors duration-100 peer-focus:text-[#FCDB32]" />

      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        autoComplete={autoComplete}
        placeholder=" "
        className="peer block w-full rounded-2xl border border-white/10 bg-[#182651]/48 px-4 pb-2.5 pl-11 pt-6 text-sm text-white outline-none transition-all duration-100 placeholder:text-transparent focus:border-transparent focus:bg-[#1D2E5E]/70 focus:ring-2 focus:ring-[#FCDB32] disabled:bg-black/20 disabled:text-white/20"
      />

      <label
        htmlFor={id}
        className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 text-[12px] font-bold tracking-wide text-white/38 transition-all duration-100 ease-out peer-focus:top-2 peer-focus:-translate-y-0 peer-focus:text-[9px] peer-focus:font-black peer-focus:uppercase peer-focus:tracking-[0.18em] peer-focus:text-[#FCDB32] peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:text-[9px] peer-[:not(:placeholder-shown)]:font-black peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-[0.18em] peer-[:not(:placeholder-shown)]:text-white/55"
      >
        {label}
      </label>
    </div>
  );
}

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    () => localStorage.getItem("authError") || "",
  );
  const [info, setInfo] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const navigate = useNavigate();

  const { currentUser, userRole, authError, clearAuthError } =
    useContext(GlobalContext);

  useEffect(() => {
    if (currentUser && userRole) {
      navigate("/");
    }
  }, [currentUser, userRole, navigate]);

  useEffect(() => {
    localStorage.removeItem("authError");
  }, []);

  const errorVisible = error || authError || "";

  const limpiarMensajes = () => {
    setError("");
    setInfo("");
    clearAuthError?.();
    localStorage.removeItem("authError");
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    limpiarMensajes();

    if (!username.trim() || !password) {
      setError("Por favor, ingresa tu usuario y contraseña.");
      return;
    }

    setIsAuthenticating(true);

    try {
      await setPersistence(auth, browserSessionPersistence);

      const correoAuth = await resolverCorreoAuth(username);

      await signInWithEmailAndPassword(auth, correoAuth, password);
    } catch (errorLogin) {
      let mensajeError =
        "Credenciales incorrectas. Verifica tu usuario y contraseña.";

      if (errorLogin.name === "AliasLoginError") {
        mensajeError = errorLogin.message;
      } else if (errorLogin.code === "auth/user-disabled") {
        mensajeError = "Tu acceso ha sido inhabilitado administrativamente.";
      } else if (errorLogin.code === "auth/too-many-requests") {
        mensajeError =
          "Múltiples intentos fallidos. Tu cuenta está bloqueada temporalmente.";
      } else if (errorLogin.code === "auth/network-request-failed") {
        mensajeError =
          "No hay conexión con Firebase. Revisa tu internet e intenta de nuevo.";
      }

      setError(mensajeError);
      console.error("Error de autenticación:", errorLogin);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleRecuperarPassword = async () => {
    limpiarMensajes();

    if (!username.trim()) {
      setError("Primero escribe tu usuario de acceso.");
      return;
    }

    setIsResetting(true);

    try {
      const correoAuth = await resolverCorreoAuth(username);

      await sendPasswordResetEmail(auth, correoAuth);

      setInfo(
        "Se envió un correo de recuperación al correo registrado para este usuario.",
      );
    } catch (errorReset) {
      let mensajeError =
        "No fue posible enviar el correo de recuperación. Verifica tu usuario.";

      if (errorReset.name === "AliasLoginError") {
        mensajeError = errorReset.message;
      } else if (errorReset.code === "auth/user-not-found") {
        mensajeError = "No existe una cuenta vinculada a este usuario.";
      } else if (errorReset.code === "auth/too-many-requests") {
        mensajeError =
          "Firebase bloqueó temporalmente los intentos de recuperación.";
      } else if (errorReset.code === "auth/network-request-failed") {
        mensajeError =
          "No hay conexión con Firebase. Revisa tu internet e intenta de nuevo.";
      }

      setError(mensajeError);
      console.error("Error enviando recuperación:", errorReset);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full select-none flex-col items-center justify-center overflow-hidden bg-[#141D38] font-sans">
      <div className="absolute inset-0 bg-[#050913]" />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#02050D] via-[#0B1330] to-[#141D38]" />

      <div className="pointer-events-none absolute left-1/2 top-[33%] h-[580px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1C2A52] opacity-30 blur-[175px]" />

      <div className="pointer-events-none absolute left-[27%] top-[52%] h-[540px] w-[240px] -rotate-[18deg] rounded-full bg-[#1B2850] opacity-32 blur-[135px]" />

      <div className="pointer-events-none absolute left-1/2 top-[58%] h-[510px] w-[260px] -translate-x-1/2 -rotate-[6deg] rounded-full bg-[#243868] opacity-30 blur-[125px]" />

      <div className="pointer-events-none absolute right-[28%] top-[51%] h-[540px] w-[240px] rotate-[16deg] rounded-full bg-[#1A274D] opacity-30 blur-[135px]" />

      <div className="pointer-events-none absolute bottom-[-220px] left-1/2 h-[540px] w-[900px] -translate-x-1/2 rounded-full bg-[#FCDB32] opacity-75 blur-[145px]" />

      <div className="pointer-events-none absolute bottom-[-165px] left-1/2 h-[700px] w-[1120px] -translate-x-1/2 rounded-full bg-[#FCDB32] opacity-[0.14] blur-[240px]" />

      <div className="pointer-events-none absolute bottom-[-40px] left-1/2 h-[320px] w-[720px] -translate-x-1/2 rounded-full bg-[#233560] opacity-20 blur-[140px]" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.025),transparent_42%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/15" />

      <div className="relative z-10 flex w-full flex-col items-center px-4 py-10">
        <div className="w-full max-w-[360px] rounded-[32px] border border-white/10 bg-[#162349]/45 p-7 shadow-[0_25px_80px_rgba(0,0,0,0.34)] backdrop-blur-[22px] md:p-8">
          <div className="mb-7 flex flex-col items-center gap-4">
            <img
              src={logoMadereria}
              alt="Maderería La Huerta"
              className="h-14 w-auto object-contain opacity-95 drop-shadow-[0_6px_14px_rgba(0,0,0,0.32)] md:h-[62px]"
            />

            <div className="w-[78%] border-t border-white/10" />

            <img
              src={logoMLH}
              alt="MLH Cobranza"
              className="h-[68px] w-auto object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.32)] md:h-[76px]"
            />
          </div>

          <h1 className="mb-7 text-center font-mono text-[11px] font-bold uppercase tracking-[0.34em] text-white/88">
            Control de Acceso
          </h1>

          {errorVisible && (
            <div className="mb-4 rounded-2xl border border-red-400/25 bg-red-500/12 px-4 py-3 text-center text-[11px] font-semibold text-red-100 md:text-xs">
              {errorVisible}
            </div>
          )}

          {info && (
            <div className="mb-4 rounded-2xl border border-[#FCDB32]/30 bg-[#FCDB32]/10 px-4 py-3 text-center text-[11px] font-semibold text-[#FFF4B0] md:text-xs">
              {info}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            <CampoFlotante
              id="usuario"
              label="Usuario"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={isAuthenticating || isResetting}
              autoComplete="username"
              Icon={User}
            />

            <CampoFlotante
              id="password"
              label="Contraseña"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isAuthenticating || isResetting}
              autoComplete="current-password"
              Icon={Lock}
            />

            <div className="pt-2">
              <button
                type="submit"
                disabled={isAuthenticating || isResetting}
                className="flex w-full items-center justify-center rounded-2xl bg-[#FCDB32] px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#141D38] shadow-[0_10px_34px_rgba(252,219,50,0.32)] transition-all hover:brightness-105 hover:shadow-[0_12px_38px_rgba(252,219,50,0.44)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none md:text-xs"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#141D38]" />
                    AUTENTICANDO...
                  </>
                ) : (
                  "INICIAR SESIÓN"
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleRecuperarPassword}
              disabled={isAuthenticating || isResetting}
              className="flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/65 transition hover:bg-white/[0.06] hover:text-white/88 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isResetting ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Mail className="mr-2 h-3.5 w-3.5" />
              )}
              ¿Olvidaste tu contraseña?
            </button>

            <div className="flex items-start gap-2 pt-1">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/28" />
              <p className="text-[9px] leading-relaxed text-white/40">
                Escribe tu usuario y usa la recuperación si necesitas acceso.
              </p>
            </div>

            <div className="mt-2 border-t border-white/6 pt-5 text-center">
              <p className="font-mono text-[9px] font-bold tracking-[0.24em] text-white/32">
                © 2026 MLH COBRANZA
              </p>
            </div>
          </form>
        </div>

        <div className="mt-5 w-full max-w-[360px] text-center">
          <div className="flex items-start rounded-2xl border border-red-500/15 bg-[#2A1620]/30 p-3 text-left backdrop-blur-md">
            <AlertTriangle className="mr-2.5 mt-0.5 h-4 w-4 shrink-0 text-red-400/82" />
            <p className="text-[9px] leading-relaxed text-white/50 md:text-[10px]">
              Sistema privado. Acceso restringido y monitoreado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
</file>

<file path="firestore.indexes.json">
{
  "indexes": [
    {
      "collectionGroup": "facturas",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "cliente_id",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "emision",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "facturas",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "estatus",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "emision",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "facturas",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "cliente_id",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "estatus",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "emision",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "facturas",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "saldo_pendiente",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "emision",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "facturas",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "vencimiento",
          "order": "DESCENDING"
        },
        {
          "fieldPath": "saldo_pendiente",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "facturas",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "vencimiento",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "saldo_pendiente",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "facturas",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "emision",
          "order": "DESCENDING"
        },
        {
          "fieldPath": "vencimiento",
          "order": "DESCENDING"
        },
        {
          "fieldPath": "saldo_pendiente",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "facturas",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "emision",
          "order": "DESCENDING"
        },
        {
          "fieldPath": "vencimiento",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "saldo_pendiente",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "solicitudes_notas_credito",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "estatus",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
</file>

<file path="firestore.rules">
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // ==========================================
    // FUNCIONES GLOBALES DE AUTENTICACIÓN Y ROLES
    // ==========================================
    function isAuthenticated() {
      return request.auth != null;
    }

    function userPath() {
      return /databases/$(database)/documents/usuarios/$(request.auth.uid);
    }

    function userExists() {
      return isAuthenticated() && exists(userPath());
    }

    function userData() {
      return get(userPath()).data;
    }

    function isStaff() {
      return userExists()
        && userData().activo == true
        && userData().rol in ['SU', 'ADMIN'];
    }

    function isSU() {
      return isStaff() && userData().rol == 'SU';
    }

    function isADMIN() {
      return isStaff() && userData().rol == 'ADMIN';
    }

    function actorValido() {
      return isAuthenticated()
        && request.resource.data.actor_uid is string
        && request.resource.data.actor_uid == request.auth.uid;
    }

    // ==========================================
    // FUNCIONES DE VALIDACIÓN FINANCIERA
    // ==========================================
    function totalNotasCreditoActual() {
      return resource.data.keys().hasAny(['total_notas_credito'])
        && resource.data.total_notas_credito is number
          ? resource.data.total_notas_credito
          : 0;
    }

    function totalNotasCreditoNuevo() {
      return request.resource.data.keys().hasAny(['total_notas_credito'])
        && request.resource.data.total_notas_credito is number
          ? request.resource.data.total_notas_credito
          : 0;
    }

    function campoNoCambia(campo) {
      return request.resource.data.get(campo, null) == resource.data.get(campo, null);
    }

    function limiteCreditoClienteNuevo() {
      return request.resource.data.get('limite_credito', 0) is number
        ? request.resource.data.get('limite_credito', 0)
        : 0;
    }

    function sumaFacturaActualizada() {
      return request.resource.data.saldo_pendiente
        + request.resource.data.monto_pagado
        + totalNotasCreditoNuevo();
    }

    function montoTotalActual() {
      return resource.data.monto_total;
    }

    function montosFacturaCuadran() {
      return sumaFacturaActualizada() >= montoTotalActual() - 0.011
        && sumaFacturaActualizada() <= montoTotalActual() + 0.011;
    }

    function saldoFacturaEditadaCuadra() {
      let saldoEsperado = request.resource.data.monto_total - request.resource.data.monto_pagado;

      return request.resource.data.saldo_pendiente >= saldoEsperado - 0.011
        && request.resource.data.saldo_pendiente <= saldoEsperado + 0.011;
    }

    function auditoriaEdicionFacturaValida(facturaId) {
      let auditId = request.resource.data.ultima_edicion_audit_id;
      let auditPath = /databases/$(database)/documents/actividad/$(auditId);

      return auditId is string
        && auditId != ''
        && request.resource.data.ultima_edicion_actor_uid == request.auth.uid
        && request.resource.data.ultima_edicion_at is timestamp
        && existsAfter(auditPath)
        && getAfter(auditPath).data.actor_uid == request.auth.uid
        && getAfter(auditPath).data.modulo == 'Facturación'
        && getAfter(auditPath).data.tipo == 'Edición de Factura'
        && getAfter(auditPath).data.factura_id == facturaId;
    }

    function clientesEdicionFacturaValidos() {
      let clienteAnteriorId = resource.data.cliente_id;
      let clienteNuevoId = request.resource.data.cliente_id;
      let clienteAnteriorPath = /databases/$(database)/documents/clientes/$(clienteAnteriorId);
      let clienteNuevoPath = /databases/$(database)/documents/clientes/$(clienteNuevoId);
      let saldoAnterior = resource.data.saldo_pendiente;
      let saldoNuevo = request.resource.data.saldo_pendiente;

      return exists(clienteAnteriorPath)
        && exists(clienteNuevoPath)
        && get(clienteNuevoPath).data.activo == true
        && (
          (
            clienteAnteriorId == clienteNuevoId
            && getAfter(clienteAnteriorPath).data.deuda_actual
              == get(clienteAnteriorPath).data.deuda_actual + saldoNuevo - saldoAnterior
            && getAfter(clienteAnteriorPath).data.credito_disponible
              == get(clienteAnteriorPath).data.credito_disponible - saldoNuevo + saldoAnterior
          )
          ||
          (
            clienteAnteriorId != clienteNuevoId
            && getAfter(clienteAnteriorPath).data.deuda_actual
              == get(clienteAnteriorPath).data.deuda_actual - saldoAnterior
            && getAfter(clienteAnteriorPath).data.credito_disponible
              == get(clienteAnteriorPath).data.credito_disponible + saldoAnterior
            && getAfter(clienteNuevoPath).data.deuda_actual
              == get(clienteNuevoPath).data.deuda_actual + saldoNuevo
            && getAfter(clienteNuevoPath).data.credito_disponible
              == get(clienteNuevoPath).data.credito_disponible - saldoNuevo
          )
        );
    }

    function movimientoLineaPath(movimientoId) {
      return /databases/$(database)/documents/lineas_credito_movimientos/$(movimientoId);
    }

    function movimientoLineaCreditoValido(clienteId) {
      let movimientoId = request.resource.data.linea_credito_ultimo_movimiento;
      let path = movimientoLineaPath(movimientoId);

      return movimientoId is string
        && movimientoId != ''
        && existsAfter(path)
        && getAfter(path).data.id == movimientoId
        && getAfter(path).data.cliente_id == clienteId
        && getAfter(path).data.actor_uid == request.auth.uid
        && getAfter(path).data.registrado_por_uid == request.auth.uid
        && getAfter(path).data.tipo_movimiento in ['ALTA_INICIAL', 'AUMENTO', 'DISMINUCION', 'CORRECCION'];
    }

    // ==========================================
    // REGLAS POR COLECCIÓN
    // ==========================================

    match /login_aliases/{aliasId} {
      allow get: if true;
      allow list: if false;

      allow create: if isSU()
        && aliasId.matches('^[a-z0-9._-]+$')
        && request.resource.data.keys().hasOnly(['correo_auth', 'activo', 'createdAt', 'updatedAt'])
        && request.resource.data.correo_auth is string
        && request.resource.data.correo_auth.matches('^[^ @]+@[^ @]+[.][^ @]+$')
        && !(request.resource.data.correo_auth.matches('.*@mlh[.]local$'))
        && request.resource.data.activo == true
        && request.resource.data.createdAt is timestamp
        && request.resource.data.updatedAt is timestamp;

      allow update: if isSU()
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['activo', 'updatedAt'])
        && request.resource.data.activo is bool
        && request.resource.data.updatedAt is timestamp;

      allow delete: if false;
    }

    match /usuarios/{userId} {
      allow read: if (isAuthenticated() && request.auth.uid == userId) || isSU();

      allow create: if isSU()
        && userId != request.auth.uid
        && request.resource.data.keys().hasOnly([
          'nombre', 'correo', 'correo_auth', 'usuario_alias', 'rol', 'activo', 
          'proveedor_acceso', 'requiere_reset_password', 'fecha_creacion', 
          'fecha_actualizacion', 'ultima_entrada', 'creado_por', 'creado_por_uid'
        ])
        && request.resource.data.nombre is string
        && request.resource.data.nombre != ''
        && request.resource.data.correo is string
        && request.resource.data.correo.matches('^[^ @]+@[^ @]+[.][^ @]+$')
        && !(request.resource.data.correo.matches('.*@mlh[.]local$'))
        && request.resource.data.correo_auth == request.resource.data.correo
        && request.resource.data.usuario_alias is string
        && request.resource.data.usuario_alias.matches('^[a-z0-9._-]+$')
        && request.resource.data.rol == 'ADMIN'
        && request.resource.data.activo == true
        && request.resource.data.proveedor_acceso == 'EMAIL_REAL_ALIAS'
        && request.resource.data.requiere_reset_password is bool
        && request.resource.data.fecha_creacion is timestamp
        && request.resource.data.fecha_actualizacion is timestamp
        && request.resource.data.creado_por is string
        && request.resource.data.creado_por_uid == request.auth.uid
        && existsAfter(/databases/$(database)/documents/login_aliases/$(request.resource.data.usuario_alias))
        && getAfter(/databases/$(database)/documents/login_aliases/$(request.resource.data.usuario_alias)).data.correo_auth == request.resource.data.correo
        && getAfter(/databases/$(database)/documents/login_aliases/$(request.resource.data.usuario_alias)).data.activo == true;

      // Un usuario solo puede actualizar su propio último login
      allow update: if isAuthenticated()
        && request.auth.uid == userId
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['ultima_entrada', 'ultimoLogin', 'fecha_actualizacion'])
        && request.resource.data.ultima_entrada is timestamp
        && request.resource.data.ultimoLogin is timestamp
        && request.resource.data.fecha_actualizacion is timestamp;

      // SU gestionando a los ADMIN (Suspender/Reactivar)
      allow update: if isSU()
        && userId != request.auth.uid
        && resource.data.rol == 'ADMIN'
        && request.resource.data.rol == resource.data.rol
        && request.resource.data.activo is bool
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['activo', 'fecha_actualizacion', 'updatedAt']);

      allow delete: if false;
    }

    match /clientes/{clienteId} {
      allow read: if isStaff();

      allow create: if isStaff()
        && request.resource.data.cliente_id == clienteId
        && request.resource.data.nombre is string
        && request.resource.data.nombre != ''
        && request.resource.data.numero_cliente is string
        && request.resource.data.numero_cliente != ''
        && request.resource.data.rfc is string
        && request.resource.data.rfc != ''
        && request.resource.data.telefono is string
        && request.resource.data.telefono != ''
        && request.resource.data.direccion is string
        && request.resource.data.direccion != ''
        && request.resource.data.pagare_inicial is bool
        && request.resource.data.limite_credito is number
        && request.resource.data.limite_credito >= 0
        && request.resource.data.credito_disponible == request.resource.data.limite_credito
        && request.resource.data.deuda_actual is number
        && request.resource.data.deuda_actual == 0
        && request.resource.data.activo == true
        && request.resource.data.estatus == 'Activo'
        && request.resource.data.linea_credito_estado in ['Sin línea', 'Activa', 'Excedida']
        && request.resource.data.linea_credito_autorizado_por is string
        && request.resource.data.linea_credito_ultimo_movimiento is string
        && movimientoLineaCreditoValido(clienteId);

      allow update: if isStaff()
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
            'nombre', 'numero_cliente', 'rfc', 'telefono', 'correo', 'direccion', 
            'grupo', 'segmentacion', 'dias_mensaje', 'pagare_inicial', 'pagare_monto', 
            'pagare_fecha', 'notas_internas', 'updatedAt'
          ]);

      allow update: if isStaff()
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
            'deuda_actual', 'credito_disponible', 'monto_ultimo_pago', 'fecha_ultimo_pago', 
            'metodo_ultimo_pago', 'ultimo_deposito_monto', 'ultimo_deposito_fecha', 
            'ultimo_deposito_metodo', 'ultimo_abono_id', 'ultimo_abono_factura_id', 'updatedAt', 
            // ✅ FIX: Permitimos que un abono o anulación cambie el estado de la línea si excede el límite
            'linea_credito_estado', 'ultima_accion' 
          ])
        && campoNoCambia('limite_credito')
        && campoNoCambia('activo')
        && request.resource.data.deuda_actual is number
        && request.resource.data.deuda_actual >= 0
        && request.resource.data.credito_disponible is number
        && request.resource.data.credito_disponible >= 0
        && request.resource.data.credito_disponible <= limiteCreditoClienteNuevo();

      allow update: if isStaff()
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
            'limite_credito', 'credito_disponible', 'linea_credito_estado', 
            'linea_credito_autorizado_por', 'linea_credito_ultimo_movimiento', 
            'linea_credito_actualizada_en', 'linea_credito_actualizada_por', 
            'linea_credito_actualizada_por_uid', 'updatedAt'
          ])
        && request.resource.data.limite_credito is number
        && request.resource.data.limite_credito >= 0
        && request.resource.data.credito_disponible is number
        && request.resource.data.credito_disponible >= 0
        && request.resource.data.credito_disponible <= request.resource.data.limite_credito
        && request.resource.data.deuda_actual == resource.data.deuda_actual
        && request.resource.data.activo == resource.data.activo
        && request.resource.data.estatus == resource.data.estatus
        && request.resource.data.linea_credito_estado in ['Sin línea', 'Activa', 'Excedida']
        && request.resource.data.linea_credito_autorizado_por is string
        && request.resource.data.linea_credito_autorizado_por != ''
        && request.resource.data.linea_credito_actualizada_en is timestamp
        && request.resource.data.linea_credito_actualizada_por is string
        && request.resource.data.linea_credito_actualizada_por_uid == request.auth.uid
        && movimientoLineaCreditoValido(clienteId);

      allow update: if isStaff()
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
            'activo', 'estatus', 'inactivo_motivo', 'inactivo_por', 
            'inactivo_por_uid', 'inactivo_at', 'updatedAt'
          ])
        && resource.data.activo == true
        && request.resource.data.activo == false
        && request.resource.data.estatus == 'Inactivo'
        && request.resource.data.inactivo_motivo is string
        && request.resource.data.inactivo_motivo != ''
        && request.resource.data.inactivo_por is string
        && request.resource.data.inactivo_por_uid == request.auth.uid
        && request.resource.data.inactivo_at is timestamp;

      allow update: if isStaff()
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
            'activo', 'estatus', 'reactivado_motivo', 'reactivado_por', 
            'reactivado_por_uid', 'reactivado_at', 'updatedAt'
          ])
        && resource.data.activo == false
        && request.resource.data.activo == true
        && request.resource.data.estatus == 'Activo'
        && request.resource.data.reactivado_motivo is string
        && request.resource.data.reactivado_motivo != ''
        && request.resource.data.reactivado_por is string
        && request.resource.data.reactivado_por_uid == request.auth.uid
        && request.resource.data.reactivado_at is timestamp;

      allow delete: if false;
    }

    match /facturas/{facturaId} {
      allow read: if isStaff();

      allow create: if isStaff()
        && request.resource.data.id == facturaId
        && request.resource.data.cliente_id is string
        && request.resource.data.cliente_id != ''
        && request.resource.data.cliente is string
        && request.resource.data.folio is string
        && request.resource.data.monto_total is number
        && request.resource.data.monto_total > 0
        && request.resource.data.monto_pagado is number
        && request.resource.data.monto_pagado == 0
        && request.resource.data.saldo_pendiente is number
        && request.resource.data.saldo_pendiente == request.resource.data.monto_total
        && request.resource.data.estatus == 'Pendiente'
        && request.resource.data.abonos is list
        && request.resource.data.abonos.size() == 0
        && request.resource.data.emision is timestamp
        && request.resource.data.vencimiento is timestamp
        && request.resource.data.vencimiento >= request.resource.data.emision
        && request.resource.data.createdAt is timestamp;

      // Registrar abono: SU y ADMIN
      allow update: if isStaff()
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
            'saldo_pendiente',
            'monto_pagado',
            'estatus',
            'abonos',
            'ultima_accion',
            'updatedAt',
            'ultima_edicion_audit_id',
            'ultima_edicion_actor_uid',
            'ultima_edicion_at',
            'abonos_cancelados'
          ])
        && campoNoCambia('id')
        && campoNoCambia('createdAt')
        && campoNoCambia('monto_total')
        && campoNoCambia('cliente_id')
        && request.resource.data.saldo_pendiente is number
        && request.resource.data.saldo_pendiente >= 0
        && request.resource.data.saldo_pendiente <= resource.data.monto_total
        && request.resource.data.monto_pagado is number
        && request.resource.data.monto_pagado >= 0
        && request.resource.data.monto_pagado <= resource.data.monto_total
        && totalNotasCreditoNuevo() == totalNotasCreditoActual()
        && montosFacturaCuadran()
        && request.resource.data.abonos is list
        && resource.data.abonos is list
        && request.resource.data.abonos.size() == resource.data.abonos.size() + 1
        && request.resource.data.estatus in ['Pendiente', 'Vencida', 'Reprogramado', 'Pagada']
        && (
          (request.resource.data.saldo_pendiente == 0 && request.resource.data.estatus == 'Pagada') ||
          (request.resource.data.saldo_pendiente > 0 && request.resource.data.estatus != 'Pagada')
        );

      // Anular abono: solo SU
      allow update: if isSU()
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
            'saldo_pendiente',
            'monto_pagado',
            'estatus',
            'abonos',
            'ultima_accion',
            'updatedAt',
            'ultima_edicion_audit_id',
            'ultima_edicion_actor_uid',
            'ultima_edicion_at',
            'abonos_cancelados'
          ])
        && campoNoCambia('id')
        && campoNoCambia('createdAt')
        && campoNoCambia('monto_total')
        && campoNoCambia('cliente_id')
        && request.resource.data.saldo_pendiente is number
        && request.resource.data.saldo_pendiente >= 0
        && request.resource.data.saldo_pendiente <= resource.data.monto_total
        && request.resource.data.monto_pagado is number
        && request.resource.data.monto_pagado >= 0
        && request.resource.data.monto_pagado <= resource.data.monto_total
        && totalNotasCreditoNuevo() == totalNotasCreditoActual()
        && montosFacturaCuadran()
        && request.resource.data.abonos is list
        && resource.data.abonos is list
        && request.resource.data.abonos.size() == resource.data.abonos.size() - 1
        && request.resource.data.estatus in ['Pendiente', 'Vencida', 'Reprogramado', 'Pagada']
        && (
          (request.resource.data.saldo_pendiente == 0 && request.resource.data.estatus == 'Pagada') ||
          (request.resource.data.saldo_pendiente > 0 && request.resource.data.estatus != 'Pagada')
        );

      // Edición general de factura
      allow update: if isStaff()
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
            'cliente_id', 'cliente', 'grupo', 'folio', 'monto_total', 'moneda', 
            'emision', 'vencimiento', 'observaciones', 'monto_pagado', 
            'saldo_pendiente', 'estatus', 'ultima_edicion_audit_id', 
            'ultima_edicion_actor_uid', 'ultima_edicion_at', 'updatedAt'
          ])
        && campoNoCambia('id')
        && campoNoCambia('createdAt')
        && request.resource.data.abonos == resource.data.abonos
        && request.resource.data.monto_pagado == resource.data.monto_pagado
        && request.resource.data.cliente_id is string
        && request.resource.data.cliente_id != ''
        && request.resource.data.cliente == get(/databases/$(database)/documents/clientes/$(request.resource.data.cliente_id)).data.nombre
        && request.resource.data.folio is string
        && request.resource.data.folio != ''
        && request.resource.data.monto_total is number
        && request.resource.data.monto_total > 0
        && request.resource.data.monto_total >= request.resource.data.monto_pagado
        && request.resource.data.saldo_pendiente is number
        && saldoFacturaEditadaCuadra()
        && request.resource.data.emision is timestamp
        && request.resource.data.vencimiento is timestamp
        && request.resource.data.vencimiento >= request.resource.data.emision
        && request.resource.data.estatus in ['Pendiente', 'Vencida', 'Pagada']
        && (
          (request.resource.data.saldo_pendiente == 0 && request.resource.data.estatus == 'Pagada') || 
          (request.resource.data.saldo_pendiente > 0 && request.resource.data.estatus != 'Pagada')
        )
        && clientesEdicionFacturaValidos()
        && auditoriaEdicionFacturaValida(facturaId);

      // SOLO el SU puede aplicar notas de crédito
      allow update: if isSU()
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
            'saldo_pendiente', 'estatus', 'notas_credito', 'total_notas_credito', 
            'ultima_accion', 'updatedAt'
          ])
        && campoNoCambia('id')
        && campoNoCambia('createdAt')
        && campoNoCambia('cliente_id')
        && request.resource.data.cliente == resource.data.cliente
        && request.resource.data.folio == resource.data.folio
        && campoNoCambia('monto_total')
        && request.resource.data.monto_pagado == resource.data.monto_pagado
        && request.resource.data.abonos == resource.data.abonos
        && request.resource.data.saldo_pendiente is number
        && request.resource.data.saldo_pendiente >= 0
        && request.resource.data.saldo_pendiente <= request.resource.data.monto_total
        && request.resource.data.total_notas_credito is number
        && request.resource.data.total_notas_credito >= 0
        && request.resource.data.notas_credito is list
        && request.resource.data.estatus in ['Pendiente', 'Vencida', 'Pagada']
        && (
          request.resource.data.saldo_pendiente != resource.data.saldo_pendiente
          || request.resource.data.total_notas_credito != resource.data.total_notas_credito
        )
        && (
          (request.resource.data.saldo_pendiente == 0 && request.resource.data.estatus == 'Pagada') || 
          (request.resource.data.saldo_pendiente > 0 && request.resource.data.estatus != 'Pagada')
        );

      allow delete: if isSU();
    }

    match /solicitudes/{solicitudId} {
      allow read: if isStaff();

      allow create: if isADMIN()
        && request.resource.data.keys().hasOnly([
          'id', 'cliente_id', 'cliente', 'monto_incremento', 'limite_anterior', 
          'nuevo_limite_propuesto', 'motivo', 'estatus', 'solicitado_por_uid', 
          'solicitado_por_nombre', 'createdAt'
        ])
        && request.resource.data.id == solicitudId
        && request.resource.data.cliente_id is string
        && request.resource.data.cliente_id != ''
        && request.resource.data.cliente is string
        && request.resource.data.monto_incremento is number
        && request.resource.data.monto_incremento > 0
        && request.resource.data.limite_anterior is number
        && request.resource.data.limite_anterior >= 0
        && request.resource.data.nuevo_limite_propuesto is number
        && request.resource.data.nuevo_limite_propuesto == request.resource.data.limite_anterior + request.resource.data.monto_incremento
        && request.resource.data.estatus == 'Pendiente'
        && request.resource.data.solicitado_por_uid == request.auth.uid
        && request.resource.data.solicitado_por_nombre is string
        && request.resource.data.createdAt is timestamp;

      allow update: if isSU()
        && resource.data.estatus == 'Pendiente'
        && request.resource.data.estatus in ['Autorizado', 'Rechazado']
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
            'estatus', 'resolvedAt', 'resolvedBy', 'resolvedByUid'
          ])
        && request.resource.data.resolvedAt is timestamp
        && request.resource.data.resolvedBy is string
        && request.resource.data.resolvedByUid == request.auth.uid;

      allow delete: if false;
    }

    match /solicitudes_notas_credito/{solicitudId} {
      allow read: if isStaff();

      allow create: if isADMIN()
        && request.resource.data.keys().hasOnly([
          'id', 'tipo_solicitud', 'factura_id', 'folio', 'cliente_id', 'cliente', 
          'monto_nota', 'saldo_actual', 'motivo', 'observaciones', 'estatus', 
          'solicitado_por_uid', 'solicitado_por_nombre', 'createdAt'
        ])
        && request.resource.data.id == solicitudId
        && request.resource.data.tipo_solicitud == 'NOTA_CREDITO'
        && request.resource.data.factura_id is string
        && request.resource.data.factura_id != ''
        && request.resource.data.folio is string
        && request.resource.data.cliente_id is string
        && request.resource.data.cliente_id != ''
        && request.resource.data.cliente is string
        && request.resource.data.monto_nota is number
        && request.resource.data.monto_nota > 0
        && request.resource.data.saldo_actual is number
        && request.resource.data.saldo_actual > 0
        && request.resource.data.monto_nota <= request.resource.data.saldo_actual
        && request.resource.data.motivo is string
        && request.resource.data.motivo != ''
        && request.resource.data.observaciones is string
        && request.resource.data.estatus == 'Pendiente'
        && request.resource.data.solicitado_por_uid == request.auth.uid
        && request.resource.data.solicitado_por_nombre is string
        && request.resource.data.createdAt is timestamp;

      allow update: if isSU()
        && (
          (
            resource.data.estatus == 'Pendiente'
            && request.resource.data.estatus in ['Autorizado', 'Rechazado']
            && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
                'estatus', 'resolvedAt', 'resolvedBy', 'resolvedByUid', 
                'motivo_resolucion', 'nota_credito_id', 'saldo_restante'
              ])
            && request.resource.data.resolvedAt is timestamp
            && request.resource.data.resolvedBy is string
            && request.resource.data.resolvedByUid == request.auth.uid
          )
          ||
          (
            resource.data.estatus in ['Autorizado', 'Aprobado']
            && request.resource.data.estatus == 'Anulada'
            && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
                'estatus', 'nota_anulada', 'anuladaAt', 'anuladaBy', 
                'anuladaByUid', 'motivo_anulacion'
              ])
            && request.resource.data.nota_anulada == true
            && request.resource.data.anuladaAt is timestamp
            && request.resource.data.anuladaBy is string
            && request.resource.data.anuladaByUid == request.auth.uid
            && request.resource.data.motivo_anulacion is string
          )
        );

      allow delete: if false;
    }

    match /notas_credito_resumen_clientes/{clienteId} {
      allow read: if isSU();

      allow create, update: if isStaff()
        && request.resource.data.keys().hasOnly([
          'id', 'cliente_id', 'cliente', 'total_solicitudes', 'pendientes', 
          'autorizadas', 'rechazadas', 'anuladas', 'monto_total_notas', 
          'ultimo_estado', 'ultimo_monto_nota', 'ultimo_folio', 
          'ultimo_movimiento_at', 'ultimo_solicitado_por', 'ultimo_resuelto_por', 'activo'
        ])
        && request.resource.data.id == clienteId
        && request.resource.data.cliente_id == clienteId
        && request.resource.data.cliente is string
        && request.resource.data.cliente != ''
        && (!request.resource.data.keys().hasAny(['total_solicitudes']) || request.resource.data.total_solicitudes is number)
        && (!request.resource.data.keys().hasAny(['pendientes']) || request.resource.data.pendientes is number)
        && (!request.resource.data.keys().hasAny(['autorizadas']) || request.resource.data.autorizadas is number)
        && (!request.resource.data.keys().hasAny(['rechazadas']) || request.resource.data.rechazadas is number)
        && (!request.resource.data.keys().hasAny(['anuladas']) || request.resource.data.anuladas is number)
        && (!request.resource.data.keys().hasAny(['monto_total_notas']) || request.resource.data.monto_total_notas is number)
        && request.resource.data.ultimo_estado in ['Pendiente', 'Autorizado', 'Aprobado', 'Rechazado', 'Anulada']
        && (!request.resource.data.keys().hasAny(['ultimo_monto_nota']) || request.resource.data.ultimo_monto_nota is number)
        && (!request.resource.data.keys().hasAny(['ultimo_folio']) || request.resource.data.ultimo_folio is string)
        && request.resource.data.ultimo_movimiento_at is timestamp
        && (!request.resource.data.keys().hasAny(['ultimo_solicitado_por']) || request.resource.data.ultimo_solicitado_por is string)
        && (!request.resource.data.keys().hasAny(['ultimo_resuelto_por']) || request.resource.data.ultimo_resuelto_por is string)
        && request.resource.data.activo is bool;

      allow delete: if false;
    }

    match /compromisos/{compromisoId} {
      allow read: if isStaff();

      allow create: if isStaff()
        && request.resource.data.keys().hasOnly([
          'tipo_vinculo', 'titulo', 'motivo', 'cliente_id', 'cliente_nombre', 
          'factura_id', 'folio_factura', 'tipo_evento', 'monto', 'telefono', 
          'fecha_compromiso', 'mes_anio', 'estatus', 'ultima_accion', 
          'historial_acciones', 'creado_por', 'creado_por_uid', 'createdAt', 'updatedAt'
        ])
        && request.resource.data.tipo_vinculo in ['GENERAL', 'CLIENTE', 'FACTURA']
        && request.resource.data.titulo is string
        && request.resource.data.titulo != ''
        && request.resource.data.motivo is string
        && request.resource.data.motivo != ''
        && request.resource.data.tipo_evento in ['Recordatorio', 'Seguimiento', 'Promesa']
        && request.resource.data.cliente_nombre is string
        && request.resource.data.folio_factura is string
        && request.resource.data.telefono is string
        && request.resource.data.monto is number
        && request.resource.data.monto >= 0
        && request.resource.data.fecha_compromiso is timestamp
        && request.resource.data.mes_anio is string
        && request.resource.data.estatus == 'Pendiente'
        && request.resource.data.ultima_accion is map
        && request.resource.data.historial_acciones is list
        && request.resource.data.creado_por is string
        && request.resource.data.creado_por_uid == request.auth.uid
        && request.resource.data.createdAt is timestamp
        && request.resource.data.updatedAt is timestamp
        && (
          (request.resource.data.tipo_vinculo == 'GENERAL' && request.resource.data.cliente_id == null && request.resource.data.factura_id == null && request.resource.data.cliente_nombre == '' && request.resource.data.folio_factura == '' && request.resource.data.telefono == '' && request.resource.data.monto == 0)
          ||
          (request.resource.data.tipo_vinculo == 'CLIENTE' && request.resource.data.cliente_id is string && request.resource.data.cliente_id != '' && request.resource.data.factura_id == null && request.resource.data.cliente_nombre != '' && request.resource.data.folio_factura == '' && request.resource.data.monto == 0)
          ||
          (request.resource.data.tipo_vinculo == 'FACTURA' && request.resource.data.cliente_id is string && request.resource.data.cliente_id != '' && request.resource.data.factura_id is string && request.resource.data.factura_id != '' && request.resource.data.cliente_nombre != '' && request.resource.data.folio_factura != '')
        );

      allow update: if isStaff()
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
            'fecha_compromiso', 'mes_anio', 'estatus', 'ultima_accion', 
            'historial_acciones', 'fecha_completado', 'completado_por', 
            'completado_por_uid', 'updatedAt'
          ])
        && request.resource.data.estatus in ['Pendiente', 'Completado', 'Reprogramado', 'Cancelado']
        && (
          (resource.data.estatus in ['Completado', 'Cancelado'] && request.resource.data.estatus == resource.data.estatus)
          ||
          (resource.data.estatus in ['Pendiente', 'Reprogramado'] && (request.resource.data.estatus == resource.data.estatus || request.resource.data.estatus in ['Reprogramado', 'Completado', 'Cancelado']))
        )
        && request.resource.data.ultima_accion is map
        && request.resource.data.historial_acciones is list
        && request.resource.data.updatedAt is timestamp
        && (
          request.resource.data.estatus != 'Completado'
          || resource.data.estatus == 'Completado'
          || (request.resource.data.fecha_completado is timestamp && request.resource.data.completado_por is string && request.resource.data.completado_por_uid == request.auth.uid)
        );

      allow delete: if isSU();
    }

    match /lineas_credito_movimientos/{movimientoId} {
      allow read: if isStaff();

      allow create: if isStaff()
        && actorValido()
        && request.resource.data.keys().hasOnly([
          'id', 'actor_uid', 'cliente_id', 'cliente', 'tipo_movimiento', 
          'limite_anterior', 'limite_nuevo', 'diferencia', 'deuda_actual', 
          'credito_disponible_resultante', 'estado_resultante', 'personal_autoriza', 
          'motivo', 'registrado_por_uid', 'registrado_por_nombre', 
          'registrado_por_rol', 'createdAt'
        ])
        && request.resource.data.id == movimientoId
        && request.resource.data.cliente_id is string
        && request.resource.data.cliente_id != ''
        && request.resource.data.cliente is string
        && request.resource.data.tipo_movimiento in ['ALTA_INICIAL', 'AUMENTO', 'DISMINUCION', 'CORRECCION']
        && request.resource.data.limite_anterior is number
        && request.resource.data.limite_anterior >= 0
        && request.resource.data.limite_nuevo is number
        && request.resource.data.limite_nuevo >= 0
        && request.resource.data.diferencia is number
        && request.resource.data.deuda_actual is number
        && request.resource.data.deuda_actual >= 0
        && request.resource.data.credito_disponible_resultante is number
        && request.resource.data.credito_disponible_resultante >= 0
        && request.resource.data.estado_resultante in ['Sin línea', 'Activa', 'Excedida']
        && request.resource.data.personal_autoriza is string
        && request.resource.data.personal_autoriza != ''
        && request.resource.data.motivo is string
        && request.resource.data.motivo != ''
        && request.resource.data.registrado_por_uid == request.auth.uid
        && request.resource.data.registrado_por_nombre is string
        && request.resource.data.registrado_por_rol in ['SU', 'ADMIN']
        && request.resource.data.createdAt is timestamp;

      allow update, delete: if false;
    }

    match /lineas_credito_resumen_clientes/{clienteId} {
      allow read: if isSU();

      allow create, update: if isStaff()
        && request.resource.data.keys().hasOnly([
          'id', 'cliente_id', 'cliente', 'limite_actual', 'deuda_actual', 
          'credito_disponible_actual', 'estado_resultante', 'ultimo_tipo_movimiento', 
          'ultimo_personal_autoriza', 'ultimo_registrado_por', 'ultimo_registrado_por_uid', 
          'ultimo_registrado_por_rol', 'ultimo_movimiento_id', 'ultimo_movimiento_at', 
          'total_movimientos', 'activo'
        ])
        && request.resource.data.id == clienteId
        && request.resource.data.cliente_id == clienteId
        && request.resource.data.cliente is string
        && request.resource.data.cliente != ''
        && request.resource.data.limite_actual is number
        && request.resource.data.limite_actual >= 0
        && request.resource.data.deuda_actual is number
        && request.resource.data.deuda_actual >= 0
        && request.resource.data.credito_disponible_actual is number
        && request.resource.data.credito_disponible_actual >= 0
        && request.resource.data.estado_resultante in ['Sin línea', 'Activa', 'Excedida']
        && request.resource.data.ultimo_tipo_movimiento in ['ALTA_INICIAL', 'AUMENTO', 'DISMINUCION', 'CORRECCION']
        && request.resource.data.ultimo_personal_autoriza is string
        && request.resource.data.ultimo_personal_autoriza != ''
        && request.resource.data.ultimo_registrado_por is string
        // ✅ FIX: Se permite que el UID sea el del usuario actual o el del registro anterior para no bloquear la anulación de abonos.
        && (request.resource.data.ultimo_registrado_por_uid == request.auth.uid || request.resource.data.ultimo_registrado_por_uid == resource.data.ultimo_registrado_por_uid)
        && request.resource.data.ultimo_registrado_por_rol in ['SU', 'ADMIN']
        && request.resource.data.ultimo_movimiento_id is string
        && request.resource.data.ultimo_movimiento_id != ''
        && request.resource.data.ultimo_movimiento_at is timestamp
        && request.resource.data.total_movimientos is number
        && request.resource.data.total_movimientos >= 1
        && request.resource.data.activo is bool;

      allow delete: if false;
    }


    match /abonos_index/{abonoIndexId} {
      allow read: if isSU();

      allow create, update: if isStaff()
        && request.resource.data.keys().hasOnly([
          'id', 'id_abono', 'factura_id', 'folio', 'cliente_id', 'cliente',
          'fecha', 'monto', 'metodo', 'registrado_por', 'registrado_por_uid',
          'estado', 'activo', 'origen', 'saldo_anterior', 'saldo_restante',
          'indexado_por_uid', 'cancelado_at', 'cancelado_por_uid', 'cancelado_por',
          'createdAt', 'updatedAt'
        ])
        && request.resource.data.id == abonoIndexId
        && request.resource.data.id_abono is string
        && request.resource.data.id_abono != ''
        && request.resource.data.factura_id is string
        && request.resource.data.factura_id != ''
        && request.resource.data.folio is string
        && request.resource.data.cliente_id is string
        && request.resource.data.cliente is string
        && request.resource.data.fecha is timestamp
        && request.resource.data.monto is number
        && request.resource.data.monto >= 0
        && request.resource.data.metodo is string
        && request.resource.data.registrado_por is string
        && request.resource.data.registrado_por_uid is string
        && request.resource.data.estado in ['ACTIVO', 'CANCELADO', 'ELIMINADO_PRUEBA']
        && request.resource.data.activo is bool
        && request.resource.data.origen is string
        && request.resource.data.indexado_por_uid == request.auth.uid
        && request.resource.data.updatedAt is timestamp
        && (
          request.resource.data.estado == 'ACTIVO'
          || isSU()
        );

      allow delete: if false;
    }

    match /actividad/{actividadId} {
      // El Súper Usuario es el único que puede leer la auditoría
      allow read: if isSU();

      allow create: if isStaff()
        && actorValido()
        && request.resource.data.usuario is string
        && request.resource.data.modulo is string
        && request.resource.data.tipo is string
        && request.resource.data.detalle is string
        && request.resource.data.serverTime is timestamp;

      // La auditoría es inmutable, nadie puede borrar ni editar.
      allow update, delete: if false;
    }

    match /metricas_globales/{documentoId} {
      allow read: if isStaff();

      allow create: if isStaff()
        && documentoId == 'stats_actuales'
        && request.resource.data.keys().hasOnly([
          'cartera_total', 'cartera_vencida', 'ingresos_mes', 'ingresos_semana', 
          'clientes_activos', 'facturas_vencidas', 'facturas_pendientes', 
          'facturas_pagadas', 'facturas_total', 'total_facturado', 'total_liquidado', 
          'cobrado_historico', 'abonos_registrados', 'monto_recuperado', 'total_notas_credito', 
          'updatedAt', 'ultima_actualizacion'
        ]);

      allow update: if isStaff()
        && documentoId == 'stats_actuales'
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
            'cartera_total', 'cartera_vencida', 'ingresos_mes', 'ingresos_semana', 
            'clientes_activos', 'facturas_vencidas', 'facturas_pendientes', 
            'facturas_pagadas', 'facturas_total', 'total_facturado', 'total_liquidado', 
            'cobrado_historico', 'abonos_registrados', 'monto_recuperado', 'total_notas_credito', 
            'updatedAt', 'ultima_actualizacion'
          ]);

      allow delete: if false;
    }
  }
}
</file>

<file path="src/pages/Calendario.jsx">
import { useContext, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Select from "react-select";
import {
  AlertTriangle,
  Bell,
  Calendar as CalendarIcon,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Loader2,
  MessageCircle,
  Plus,
  Send,
  Smartphone,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { GlobalContext } from "../context/GlobalContext";
import { useAgendaRango } from "../hooks/useAgendaRango";
import { calendarioConsultaService } from "../services/calendarioConsultaService";
import { compromisosService } from "../services/compromisosService";
import {
  agruparEventosPorDia,
  claveAFecha,
  contarCategorias,
  fechaAClave,
  formatearPeriodo,
  generarDiasRango,
  obtenerRangoAgenda,
  sumarDias,
} from "../utils/agenda";
import { generarMensajeWA, normalizarTelefonoMX } from "../utils/whatsapp";

const VISTAS = [
  { value: "DIA", label: "Día" },
  { value: "SEMANA", label: "Semana" },
  { value: "MES", label: "Mes" },
];

const FILTROS = [
  { value: "TODOS", label: "Todos" },
  { value: "VENCIDAS", label: "Vencidas" },
  { value: "POR_VENCER", label: "Por vencer" },
  { value: "RECORDATORIOS", label: "Recordatorios" },
];

const CATEGORIAS = {
  VENCIDAS: {
    etiqueta: "Vencidas",
    chip: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
    tarjeta: "border-red-200 bg-red-50/40",
    icono: AlertTriangle,
  },
  POR_VENCER: {
    etiqueta: "Por vencer",
    chip: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
    tarjeta: "border-amber-200 bg-amber-50/40",
    icono: Clock3,
  },
  RECORDATORIOS: {
    etiqueta: "Recordatorios",
    chip: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    tarjeta: "border-blue-200 bg-blue-50/40",
    icono: Bell,
  },
};

const ESTADO_FORMULARIO = {
  tipoVinculo: "GENERAL",
  titulo: "",
  motivo: "",
  tipoEvento: "Recordatorio",
  fecha: fechaAClave(new Date()),
  clienteId: "",
  facturaId: "",
};

const formatearMoneda = (valor) =>
  (Number(valor) || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

const mismoDia = (primera, segunda) =>
  fechaAClave(primera) === fechaAClave(segunda);

const esEstadoFinal = (estatus) =>
  ["Completado", "Cancelado"].includes(estatus);

function ContadorCategoria({ categoria, cantidad, onClick, compacto = false }) {
  if (!cantidad) return null;

  const configuracion = CATEGORIAS[categoria];
  const Icono = configuracion.icono;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full flex items-center justify-between gap-2 border rounded-xl shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${configuracion.chip} ${
        compacto
          ? "px-2.5 py-1.5 text-[10px] md:text-[11px]"
          : "px-3.5 py-2.5 text-[11px] md:text-xs"
      } font-black uppercase tracking-wide`}
    >
      <span className="flex items-center min-w-0">
        <span
          className={`mr-2 shrink-0 rounded-lg bg-white/80 border border-current/10 flex items-center justify-center ${
            compacto ? "h-6 w-6" : "h-7 w-7"
          }`}
        >
          <Icono className={compacto ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </span>
        <span className="truncate leading-none">
          {configuracion.etiqueta}
        </span>
      </span>

      <span
        className={`rounded-full bg-white border border-current/10 shadow-sm leading-none ${
          compacto
            ? "min-w-6 px-1.5 py-1 text-[10px]"
            : "min-w-7 px-2 py-1.5 text-[11px]"
        } text-center`}
      >
        {cantidad}
      </span>
    </button>
  );
}

function ModalBase({ children, onClose, maxWidth = "max-w-2xl" }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-3 backdrop-blur-sm md:items-center md:p-4">
      <div
        className={`flex max-h-[92dvh] w-full ${maxWidth} flex-col overflow-hidden rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl md:rounded-2xl md:pb-0`}
      >
        <div className="md:hidden h-1.5 w-12 bg-gray-200 rounded-full mx-auto mt-3 shrink-0" />
        <button
          type="button"
          onClick={onClose}
          className="absolute opacity-0 pointer-events-none"
          aria-label="Cerrar"
        />
        {children}
      </div>
    </div>
  );
}

export default function Calendario() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clientes, userName, userRole, currentUser } = useContext(GlobalContext);

  const fechaInicial = useMemo(() => {
    const fechaURL = claveAFecha(searchParams.get("fecha"));
    return fechaURL || new Date();
  }, [searchParams]);

  const vistaInicial = ["DIA", "SEMANA", "MES"].includes(
    searchParams.get("vista"),
  )
    ? searchParams.get("vista")
    : "SEMANA";

  const filtroInicial = [
    "TODOS",
    "VENCIDAS",
    "POR_VENCER",
    "RECORDATORIOS",
  ].includes(searchParams.get("filtro"))
    ? searchParams.get("filtro")
    : "TODOS";

  const [fechaActual, setFechaActual] = useState(fechaInicial);
  const [vista, setVista] = useState(vistaInicial);
  const [filtro, setFiltro] = useState(filtroInicial);
  const [mostrarResueltos, setMostrarResueltos] = useState(false);

  const [modalActivo, setModalActivo] = useState("");
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("TODOS");
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");

  const [formulario, setFormulario] = useState(ESTADO_FORMULARIO);
  const [facturasCliente, setFacturasCliente] = useState([]);
  const [cargandoFacturasCliente, setCargandoFacturasCliente] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [datosWhatsapp, setDatosWhatsapp] = useState({
    telefono: "",
    plantilla: "manual",
    mensaje: "",
  });

  const rango = useMemo(
    () => obtenerRangoAgenda(fechaActual, vista),
    [fechaActual, vista],
  );

  const { eventos, cargando, error } = useAgendaRango(rango.inicio, rango.fin);

  const eventosBaseVisibles = useMemo(
    () =>
      eventos.filter(
        (evento) =>
          evento.origen === "FACTURA" ||
          mostrarResueltos ||
          !esEstadoFinal(evento.estatus),
      ),
    [eventos, mostrarResueltos],
  );

  const eventosVisibles = useMemo(
    () =>
      eventosBaseVisibles.filter(
        (evento) => filtro === "TODOS" || evento.categoria === filtro,
      ),
    [eventosBaseVisibles, filtro],
  );

  const eventosPorDia = useMemo(
    () => agruparEventosPorDia(eventosVisibles),
    [eventosVisibles],
  );

  const resumenPeriodo = useMemo(
    () => contarCategorias(eventosBaseVisibles),
    [eventosBaseVisibles],
  );

  const diasRango = useMemo(
    () => generarDiasRango(rango.inicio, rango.fin),
    [rango],
  );

  const diasMesGrid = useMemo(() => {
    if (vista !== "MES") return diasRango;

    const inicioMes = rango.inicio;
    const finMes = rango.fin;
    const ajusteInicio = inicioMes.getDay() === 0 ? -6 : 1 - inicioMes.getDay();
    const inicioGrid = sumarDias(inicioMes, ajusteInicio);
    const ultimoMes = sumarDias(finMes, -1);
    const ajusteFin = ultimoMes.getDay() === 0 ? 0 : 7 - ultimoMes.getDay();
    const finGrid = sumarDias(ultimoMes, ajusteFin + 1);

    return generarDiasRango(inicioGrid, finGrid);
  }, [vista, diasRango, rango]);

  const opcionesClientes = useMemo(
    () =>
      (clientes || [])
        .filter(
          (cliente) =>
            cliente.activo !== false && cliente.estatus !== "Inactivo",
        )
        .sort((a, b) =>
          (a.nombre || "").localeCompare(b.nombre || "", "es", {
            sensitivity: "base",
          }),
        )
        .map((cliente) => ({
          value: cliente.id,
          label: `${cliente.nombre}${
            cliente.numero_cliente ? ` - #${cliente.numero_cliente}` : ""
          }`,
        })),
    [clientes],
  );

  const tituloPeriodo = formatearPeriodo(rango.inicio, rango.fin, vista);

  const navegarPeriodo = (direccion) => {
    if (vista === "DIA") {
      setFechaActual((actual) => sumarDias(actual, direccion));
      return;
    }

    if (vista === "SEMANA") {
      setFechaActual((actual) => sumarDias(actual, direccion * 7));
      return;
    }

    setFechaActual(
      (actual) => new Date(actual.getFullYear(), actual.getMonth() + direccion, 1),
    );
  };

  const abrirDetalle = (fechaClave = "", categoria = "TODOS") => {
    setFechaSeleccionada(fechaClave);
    setCategoriaSeleccionada(categoria);
    setModalActivo("DETALLE");
  };

  const abrirGestionFactura = (evento) => {
    if (!evento?.detalle) return;

    navigate("/facturas", {
      state: {
        gestionarFactura: evento.detalle,
      },
    });
  };

  const abrirNuevoRecordatorio = (fechaClave = "") => {
    const fecha = fechaClave || fechaAClave(new Date());

    setFormulario({
      ...ESTADO_FORMULARIO,
      fecha,
    });
    setFacturasCliente([]);
    setFechaSeleccionada(fecha);
    setModalActivo("CREAR");
  };

  const cerrarModal = () => {
    if (isSubmitting) return;
    setModalActivo("");
    setEventoSeleccionado(null);
    setNuevaFecha("");
  };

  const eventosDetalle = useMemo(() => {
    const base = fechaSeleccionada
      ? eventos.filter((evento) => evento.fechaClave === fechaSeleccionada)
      : eventos;

    return base.filter((evento) => {
      if (
        evento.origen === "COMPROMISO" &&
        !mostrarResueltos &&
        esEstadoFinal(evento.estatus)
      ) {
        return false;
      }

      return (
        categoriaSeleccionada === "TODOS" ||
        evento.categoria === categoriaSeleccionada
      );
    });
  }, [eventos, fechaSeleccionada, categoriaSeleccionada, mostrarResueltos]);

  const cambiarTipoVinculo = async (tipoVinculo) => {
    const clienteActualId = formulario.clienteId;

    setFormulario((anterior) => ({
      ...anterior,
      tipoVinculo,
      clienteId: tipoVinculo === "GENERAL" ? "" : anterior.clienteId,
      facturaId: "",
    }));
    setFacturasCliente([]);

    if (tipoVinculo !== "FACTURA" || !clienteActualId) return;

    setCargandoFacturasCliente(true);
    const resultado =
      await calendarioConsultaService.consultarFacturasAbiertasCliente(
        clienteActualId,
      );
    setCargandoFacturasCliente(false);

    if (!resultado.success) {
      window.alert(resultado.error);
      return;
    }

    setFacturasCliente(resultado.facturas);
  };

  const seleccionarCliente = async (opcion) => {
    const clienteId = opcion?.value || "";

    setFormulario((anterior) => ({
      ...anterior,
      clienteId,
      facturaId: "",
    }));
    setFacturasCliente([]);

    if (!clienteId || formulario.tipoVinculo !== "FACTURA") return;

    setCargandoFacturasCliente(true);
    const resultado =
      await calendarioConsultaService.consultarFacturasAbiertasCliente(
        clienteId,
      );
    setCargandoFacturasCliente(false);

    if (!resultado.success) {
      window.alert(resultado.error);
      return;
    }

    setFacturasCliente(resultado.facturas);
  };

  const guardarRecordatorio = async (event) => {
    event.preventDefault();

    if (!currentUser?.uid) {
      window.alert("No se identificó al usuario responsable.");
      return;
    }

    const cliente = clientes.find(
      (item) => item.id === formulario.clienteId,
    );
    const factura = facturasCliente.find(
      (item) => item.id === formulario.facturaId,
    );

    setIsSubmitting(true);

    const resultado = await compromisosService.crearCompromiso(
      {
        fecha: formulario.fecha,
        tipo_vinculo: formulario.tipoVinculo,
        titulo: formulario.titulo,
        motivo: formulario.motivo,
        tipo_evento: formulario.tipoEvento,
        cliente_id: cliente?.id || null,
        cliente_nombre: cliente?.nombre || "",
        telefono: cliente?.telefono || "",
        factura_id: factura?.id || null,
        folio_factura: factura?.folio || "",
        monto: Number(factura?.saldo_pendiente) || 0,
      },
      userName,
      currentUser.uid,
    );

    setIsSubmitting(false);

    if (!resultado.success) {
      window.alert(`No se pudo guardar: ${resultado.error}`);
      return;
    }

    setMensajeExito("El recordatorio quedó registrado y auditado.");
    setModalActivo("EXITO");
  };

  const actualizarEstado = async (evento, accion) => {
    if (!currentUser?.uid || evento.origen !== "COMPROMISO") return;

    if (esEstadoFinal(evento.estatus)) {
      window.alert("Este recordatorio ya tiene un estado final.");
      return;
    }

    if (accion === "REPROGRAMAR") {
      setEventoSeleccionado(evento);
      setNuevaFecha(evento.fechaClave);
      setModalActivo("REPROGRAMAR");
      return;
    }

    setIsSubmitting(true);

    const resultado =
      accion === "COMPLETAR"
        ? await compromisosService.completarCompromiso(
            evento.detalle.id,
            evento.cliente || evento.titulo,
            userName,
            currentUser.uid,
          )
        : await compromisosService.cancelarCompromiso(
            evento.detalle.id,
            evento.cliente || evento.titulo,
            userName,
            currentUser.uid,
          );

    setIsSubmitting(false);

    if (!resultado.success) {
      window.alert(resultado.error);
    }
  };

  const confirmarReprogramacion = async (event) => {
    event.preventDefault();
    if (!eventoSeleccionado || !nuevaFecha || !currentUser?.uid) return;

    setIsSubmitting(true);
    const resultado = await compromisosService.reprogramarCompromiso(
      eventoSeleccionado.detalle.id,
      nuevaFecha,
      eventoSeleccionado.cliente || eventoSeleccionado.titulo,
      userName,
      currentUser.uid,
    );
    setIsSubmitting(false);

    if (!resultado.success) {
      window.alert(resultado.error);
      return;
    }

    setMensajeExito("El recordatorio fue reprogramado correctamente.");
    setModalActivo("EXITO");
  };

  const eliminarRecordatorio = async (evento) => {
    if (
      userRole !== "SU" ||
      !currentUser?.uid ||
      !window.confirm("¿Eliminar permanentemente este recordatorio?")
    ) {
      return;
    }

    setIsSubmitting(true);
    const resultado = await compromisosService.eliminarCompromiso(
      evento.detalle.id,
      evento.cliente || evento.titulo,
      userName,
      currentUser.uid,
    );
    setIsSubmitting(false);

    if (!resultado.success) {
      window.alert(resultado.error);
    }
  };

  const abrirWhatsapp = (evento) => {
    if (!evento.cliente_id) return;

    const cliente = clientes.find((item) => item.id === evento.cliente_id);
    const telefono = cliente?.telefono || evento.telefono || "";
    const plantilla = evento.categoria === "VENCIDAS" ? "atrasado" : "proximo";
    const datos = {
      cliente: evento.cliente,
      folio: evento.folio || "S/F",
      saldo_pendiente: evento.monto,
      vencimiento: evento.fechaClave,
    };

    setEventoSeleccionado(evento);
    setDatosWhatsapp({
      telefono,
      plantilla,
      mensaje: generarMensajeWA(plantilla, datos),
    });
    setModalActivo("WHATSAPP");
  };

  const enviarWhatsapp = async () => {
    if (!eventoSeleccionado || !currentUser?.uid) return;

    const numero = normalizarTelefonoMX(datosWhatsapp.telefono);

    if (!numero.startsWith("52") || numero.length !== 12) {
      window.alert("El teléfono debe contener 10 dígitos válidos.");
      return;
    }

    window.open(
      `https://wa.me/${numero}?text=${encodeURIComponent(datosWhatsapp.mensaje)}`,
      "_blank",
      "noopener,noreferrer",
    );

    setIsSubmitting(true);
    const resultado = await compromisosService.registrarWhatsAppCompromiso({
      idCompromiso:
        eventoSeleccionado.origen === "COMPROMISO"
          ? eventoSeleccionado.detalle.id
          : null,
      esFacturaAuto: eventoSeleccionado.origen === "FACTURA",
      clienteNombre: eventoSeleccionado.cliente,
      tipoMensaje: datosWhatsapp.plantilla,
      userName,
      actor_uid: currentUser.uid,
    });
    setIsSubmitting(false);

    if (!resultado.success) {
      window.alert(resultado.error);
      return;
    }

    setMensajeExito("WhatsApp se abrió y la acción quedó registrada.");
    setModalActivo("EXITO");
  };

  const customSelectStyles = {
    control: (base) => ({
      ...base,
      minHeight: "44px",
      fontSize: "0.8rem",
      borderRadius: "0.75rem",
      borderColor: "#e5e7eb",
      boxShadow: "none",
      "&:hover": { borderColor: "#60a5fa" },
    }),
    menu: (base) => ({ ...base, zIndex: 9999 }),
    option: (base) => ({ ...base, fontSize: "0.8rem" }),
  };

  const renderContadoresDia = (fecha) => {
    const clave = fechaAClave(fecha);
    const eventosDia = eventosPorDia[clave] || [];
    const conteos = contarCategorias(eventosDia);

    return (
      <div className="space-y-1.5">
        <ContadorCategoria
          categoria="VENCIDAS"
          cantidad={conteos.VENCIDAS}
          compacto={vista === "MES"}
          onClick={(event) => {
            event.stopPropagation();
            abrirDetalle(clave, "VENCIDAS");
          }}
        />
        <ContadorCategoria
          categoria="POR_VENCER"
          cantidad={conteos.POR_VENCER}
          compacto={vista === "MES"}
          onClick={(event) => {
            event.stopPropagation();
            abrirDetalle(clave, "POR_VENCER");
          }}
        />
        <ContadorCategoria
          categoria="RECORDATORIOS"
          cantidad={conteos.RECORDATORIOS}
          compacto={vista === "MES"}
          onClick={(event) => {
            event.stopPropagation();
            abrirDetalle(clave, "RECORDATORIOS");
          }}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col space-y-4 md:space-y-6 pb-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mt-2 md:mt-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-[#0a192f] flex items-center">
            <CalendarIcon className="h-5 w-5 md:h-6 md:w-6 mr-2 text-blue-600" />
            Agenda de Cobranza
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1">
            Vencimientos, próximos cobros y recordatorios operativos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => abrirNuevoRecordatorio(fechaAClave(new Date()))}
          className="w-full lg:w-auto px-5 py-3 bg-[#0a192f] text-white rounded-xl font-black text-sm flex items-center justify-center shadow-md hover:bg-[#112240]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo recordatorio
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-4">
        {Object.entries(CATEGORIAS).map(([categoria, configuracion]) => {
          const Icono = configuracion.icono;
          const cantidad = resumenPeriodo[categoria] || 0;

          return (
            <button
              key={categoria}
              type="button"
              onClick={() => abrirDetalle("", categoria)}
              className={`p-3 md:p-4 rounded-xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${configuracion.tarjeta}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] md:text-xs uppercase font-black tracking-wide text-gray-500 truncate">
                  {configuracion.etiqueta}
                </span>
                <Icono className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
              </div>
              <strong className="text-xl md:text-3xl text-[#0a192f] mt-2 block">
                {cantidad}
              </strong>
              <span className="hidden md:block text-[10px] text-gray-500 mt-1">
                Ver detalle del periodo
              </span>
            </button>
          );
        })}
      </div>

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/60 space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Periodo visible
                </p>
                <h2 className="text-sm md:text-base font-black text-[#0a192f] capitalize">
                  {tituloPeriodo}
                </h2>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => navegarPeriodo(-1)}
                  className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100"
                  aria-label="Periodo anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setFechaActual(new Date())}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-black text-blue-600 hover:bg-blue-50"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => navegarPeriodo(1)}
                  className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100"
                  aria-label="Periodo siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 p-1 bg-white border border-gray-200 rounded-xl">
              {VISTAS.map((opcion) => (
                <button
                  key={opcion.value}
                  type="button"
                  onClick={() => setVista(opcion.value)}
                  className={`px-3 py-2 text-xs font-black rounded-lg transition-colors ${
                    vista === opcion.value
                      ? "bg-[#0a192f] text-white"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {opcion.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 hide-scrollbar-mobile">
              <Filter className="h-4 w-4 text-gray-400 shrink-0" />
              {FILTROS.map((opcion) => (
                <button
                  key={opcion.value}
                  type="button"
                  onClick={() => setFiltro(opcion.value)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full border text-[10px] md:text-xs font-black transition-colors ${
                    filtro === opcion.value
                      ? "bg-[#0a192f] text-white border-[#0a192f]"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {opcion.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setMostrarResueltos((actual) => !actual)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 flex items-center justify-center"
            >
              {mostrarResueltos ? (
                <EyeOff className="h-4 w-4 mr-2" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              {mostrarResueltos ? "Ocultar resueltos" : "Mostrar resueltos"}
            </button>
          </div>
        </div>

        {error && (
          <div className="m-4 p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-bold">
            {error}
          </div>
        )}

        {cargando ? (
          <div className="p-10 flex items-center justify-center text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Consultando el periodo visible...
          </div>
        ) : (
          <>
            {vista === "MES" ? (
              <div className="p-2 md:p-0">
                <div className="grid grid-cols-7 bg-[#0a192f] text-white text-[9px] md:text-[10px] font-black uppercase tracking-wider text-center rounded-t-xl md:rounded-none">
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((dia) => (
                    <div key={dia} className="py-2">{dia}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 border-l border-t border-gray-100">
                  {diasMesGrid.map((fecha) => {
                    const fueraMes = fecha.getMonth() !== rango.inicio.getMonth();
                    const esHoy = mismoDia(fecha, new Date());
                    const clave = fechaAClave(fecha);

                    return (
                      <div
                        key={clave}
                        role="button"
                        tabIndex={0}
                        onClick={() => abrirDetalle(clave, "TODOS")}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            abrirDetalle(clave, "TODOS");
                          }
                        }}
                        className={`min-h-20 md:min-h-32 p-1 md:p-2 border-r border-b border-gray-100 text-left align-top transition-colors hover:bg-blue-50/30 cursor-pointer ${
                          fueraMes ? "bg-gray-50 text-gray-300" : "bg-white"
                        }`}
                      >
                        <span
                          className={`h-6 w-6 flex items-center justify-center rounded-full text-[10px] md:text-xs font-black mb-1 ${
                            esHoy ? "bg-blue-600 text-white" : "text-[#0a192f]"
                          }`}
                        >
                          {fecha.getDate()}
                        </span>
                        {!fueraMes && renderContadoresDia(fecha)}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                <div
                  className={`hidden md:grid divide-x divide-gray-100 ${
                    vista === "DIA" ? "md:grid-cols-1" : "md:grid-cols-7"
                  }`}
                >
                  {diasRango.map((fecha) => {
                    const clave = fechaAClave(fecha);
                    const esHoy = mismoDia(fecha, new Date());

                    return (
                      <div
                        key={clave}
                        className={`min-h-72 p-3 ${esHoy ? "bg-blue-50/30" : "bg-white"}`}
                      >
                        <button
                          type="button"
                          onClick={() => abrirDetalle(clave, "TODOS")}
                          className="w-full text-left"
                        >
                          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            {fecha.toLocaleDateString("es-MX", { weekday: "long" })}
                          </p>
                          <div className="flex items-center justify-between mt-1 mb-4">
                            <strong className="text-lg text-[#0a192f]">
                              {fecha.getDate()}
                            </strong>
                            {esHoy && (
                              <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] rounded-full font-black uppercase">
                                Hoy
                              </span>
                            )}
                          </div>
                        </button>
                        {renderContadoresDia(fecha)}
                        <button
                          type="button"
                          onClick={() => abrirNuevoRecordatorio(clave)}
                          className="w-full mt-4 py-2 border border-dashed border-gray-300 text-gray-400 rounded-lg text-[10px] font-bold hover:border-blue-300 hover:text-blue-600"
                        >
                          + Agregar
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="md:hidden p-3 space-y-3">
                  {diasRango.map((fecha) => {
                    const clave = fechaAClave(fecha);
                    const eventosDia = eventosPorDia[clave] || [];
                    const esHoy = mismoDia(fecha, new Date());

                    return (
                      <article
                        key={clave}
                        className={`rounded-2xl border p-4 ${
                          esHoy
                            ? "border-blue-200 bg-blue-50/40"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <button
                            type="button"
                            onClick={() => abrirDetalle(clave, "TODOS")}
                            className="text-left"
                          >
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                              {fecha.toLocaleDateString("es-MX", { weekday: "long" })}
                            </p>
                            <h3 className="text-base font-black text-[#0a192f] capitalize">
                              {fecha.toLocaleDateString("es-MX", {
                                day: "numeric",
                                month: "long",
                              })}
                            </h3>
                          </button>

                          <button
                            type="button"
                            onClick={() => abrirNuevoRecordatorio(clave)}
                            className="h-10 w-10 rounded-xl bg-[#0a192f] text-white flex items-center justify-center"
                            aria-label="Agregar recordatorio"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        {eventosDia.length ? (
                          renderContadoresDia(fecha)
                        ) : (
                          <button
                            type="button"
                            onClick={() => abrirDetalle(clave, "TODOS")}
                            className="w-full py-4 rounded-xl bg-gray-50 text-xs font-bold text-gray-400"
                          >
                            Sin actividades
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </section>

      {modalActivo === "DETALLE" && (
        <ModalBase onClose={cerrarModal} maxWidth="max-w-3xl">
          <div className="p-4 md:p-5 border-b border-gray-100 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                Detalle de agenda
              </p>
              <h2 className="text-lg font-black text-[#0a192f] capitalize">
                {fechaSeleccionada
                  ? claveAFecha(fechaSeleccionada)?.toLocaleDateString("es-MX", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : tituloPeriodo}
              </h2>
            </div>
            <button type="button" onClick={cerrarModal} className="p-2 text-gray-400">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 md:p-5 overflow-y-auto custom-scrollbar space-y-4">
            {eventosDetalle.length === 0 ? (
              <div className="py-10 text-center text-gray-400">
                <CalendarDays className="h-10 w-10 mx-auto mb-3 text-gray-200" />
                <p className="text-sm font-bold">No hay actividades en esta selección.</p>
              </div>
            ) : (
              Object.keys(CATEGORIAS).map((categoria) => {
                const lista = eventosDetalle.filter(
                  (evento) => evento.categoria === categoria,
                );
                if (!lista.length) return null;
                const configuracion = CATEGORIAS[categoria];
                const Icono = configuracion.icono;

                return (
                  <section key={categoria}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center">
                        <Icono className="h-4 w-4 mr-2" />
                        {configuracion.etiqueta}
                      </h3>
                      <span className="text-xs font-black text-[#0a192f]">{lista.length}</span>
                    </div>

                    <div className="space-y-2">
                      {lista.map((evento) => (
                        <article
                          key={evento.id}
                          className={`rounded-xl border p-3 md:p-4 ${configuracion.tarjeta}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] uppercase font-black px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600">
                                  {evento.origen === "FACTURA"
                                    ? "Factura"
                                    : evento.tipoVinculo || "Recordatorio"}
                                </span>

                                {evento.estatus &&
                                  evento.origen === "COMPROMISO" && (
                                    <span className="text-[10px] uppercase font-black text-blue-700">
                                      {evento.estatus}
                                    </span>
                                  )}

                                {evento.origen === "COMPROMISO" &&
                                  evento.tipoVinculo === "FACTURA" &&
                                  evento.folio && (
                                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
                                      Folio {evento.folio}
                                    </span>
                                  )}
                              </div>

                              <h4 className="font-black text-[#0a192f] mt-2 text-base">
                                {evento.origen === "FACTURA"
                                  ? evento.folio
                                  : evento.titulo}
                              </h4>

                              {evento.cliente && (
                                <p className="text-xs font-bold text-gray-600 mt-1">
                                  {evento.cliente}
                                </p>
                              )}

                              {evento.origen === "COMPROMISO" &&
                                evento.tipoVinculo === "FACTURA" &&
                                evento.folio && (
                                  <p className="text-xs font-black text-blue-700 mt-1">
                                    Factura vinculada: {evento.folio}
                                  </p>
                                )}

                              {evento.motivo && (
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                  {evento.motivo}
                                </p>
                              )}
                              {evento.origen === "FACTURA" && (
                                <p className="text-sm font-black text-red-600 mt-2">
                                  {formatearMoneda(evento.monto)}
                                </p>
                              )}
                              <p className="text-[10px] text-gray-400 mt-2">
                                {claveAFecha(evento.fechaClave)?.toLocaleDateString("es-MX")}
                              </p>
                            </div>

                            <div className="flex gap-1 shrink-0">
                              {evento.cliente_id && (
                                <button
                                  type="button"
                                  onClick={() => abrirWhatsapp(evento)}
                                  className="p-2 rounded-lg bg-white border border-gray-200 text-green-600 hover:bg-green-50"
                                  title="WhatsApp"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </button>
                              )}
                              {evento.origen === "FACTURA" && (
                                <button
                                  type="button"
                                  onClick={() => abrirGestionFactura(evento)}
                                  className="px-3 py-2 rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 font-black text-[10px] flex items-center"
                                  title="Abrir Gestión de Factura"
                                >
                                  <FileText className="h-4 w-4 mr-1.5" />
                                  Ir a Facturación
                                </button>
                              )}
                            </div>
                          </div>

                          {evento.origen === "COMPROMISO" && !esEstadoFinal(evento.estatus) && (
                            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-200/70">
                              <button
                                type="button"
                                onClick={() => actualizarEstado(evento, "COMPLETAR")}
                                disabled={isSubmitting}
                                className="py-2 rounded-lg bg-green-600 text-white text-[10px] font-black disabled:opacity-50"
                              >
                                Completar
                              </button>
                              <button
                                type="button"
                                onClick={() => actualizarEstado(evento, "REPROGRAMAR")}
                                disabled={isSubmitting}
                                className="py-2 rounded-lg bg-purple-600 text-white text-[10px] font-black disabled:opacity-50"
                              >
                                Reprogramar
                              </button>
                              <button
                                type="button"
                                onClick={() => actualizarEstado(evento, "CANCELAR")}
                                disabled={isSubmitting}
                                className="py-2 rounded-lg bg-gray-600 text-white text-[10px] font-black disabled:opacity-50"
                              >
                                Cancelar
                              </button>
                            </div>
                          )}

                          {userRole === "SU" && evento.origen === "COMPROMISO" && (
                            <button
                              type="button"
                              onClick={() => eliminarRecordatorio(evento)}
                              disabled={isSubmitting}
                              className="mt-2 text-[10px] font-bold text-red-500 flex items-center"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Eliminar permanentemente
                            </button>
                          )}
                        </article>
                      ))}
                    </div>
                  </section>
                );
              })
            )}
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-2 justify-end">
            {fechaSeleccionada && (
              <button
                type="button"
                onClick={() => abrirNuevoRecordatorio(fechaSeleccionada)}
                className="px-4 py-3 sm:py-2 bg-[#ffd700] text-[#0a192f] rounded-xl font-black text-xs flex items-center justify-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar recordatorio
              </button>
            )}
            <button
              type="button"
              onClick={cerrarModal}
              className="px-4 py-3 sm:py-2 bg-[#0a192f] text-white rounded-xl font-black text-xs"
            >
              Cerrar
            </button>
          </div>
        </ModalBase>
      )}

      {modalActivo === "CREAR" && (
        <ModalBase onClose={cerrarModal} maxWidth="max-w-xl">
          <div className="p-4 md:p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                Nueva actividad
              </p>
              <h2 className="text-lg font-black text-[#0a192f]">Crear recordatorio</h2>
            </div>
            <button type="button" onClick={cerrarModal} className="p-2 text-gray-400">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={guardarRecordatorio} className="p-4 md:p-5 overflow-y-auto custom-scrollbar space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">
                Tipo de vínculo
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "GENERAL", label: "General", icon: Bell },
                  { value: "CLIENTE", label: "Cliente", icon: Users },
                  { value: "FACTURA", label: "Factura", icon: FileText },
                ].map((opcion) => {
                  const Icono = opcion.icon;
                  return (
                    <button
                      key={opcion.value}
                      type="button"
                      onClick={() => cambiarTipoVinculo(opcion.value)}
                      className={`p-3 rounded-xl border text-xs font-black flex flex-col items-center gap-1.5 ${
                        formulario.tipoVinculo === opcion.value
                          ? "bg-[#0a192f] text-white border-[#0a192f]"
                          : "bg-white text-gray-500 border-gray-200"
                      }`}
                    >
                      <Icono className="h-4 w-4" />
                      {opcion.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5">Fecha</label>
                <input
                  type="date"
                  required
                  value={formulario.fecha}
                  onChange={(event) =>
                    setFormulario((anterior) => ({ ...anterior, fecha: event.target.value }))
                  }
                  className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5">Tipo operativo</label>
                <select
                  value={formulario.tipoEvento}
                  onChange={(event) =>
                    setFormulario((anterior) => ({ ...anterior, tipoEvento: event.target.value }))
                  }
                  className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm bg-white"
                >
                  <option value="Recordatorio">Recordatorio</option>
                  <option value="Seguimiento">Seguimiento</option>
                  <option value="Promesa">Promesa de pago</option>
                </select>
              </div>
            </div>

            {formulario.tipoVinculo !== "GENERAL" && (
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5">Cliente</label>
                <Select
                  options={opcionesClientes}
                  value={opcionesClientes.find((opcion) => opcion.value === formulario.clienteId) || null}
                  onChange={seleccionarCliente}
                  placeholder="Buscar cliente..."
                  isClearable
                  styles={customSelectStyles}
                  noOptionsMessage={() => "No se encontraron clientes"}
                />
              </div>
            )}

            {formulario.tipoVinculo === "FACTURA" && (
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5">Factura abierta</label>
                <select
                  required
                  value={formulario.facturaId}
                  onChange={(event) =>
                    setFormulario((anterior) => ({ ...anterior, facturaId: event.target.value }))
                  }
                  disabled={!formulario.clienteId || cargandoFacturasCliente}
                  className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm bg-white disabled:bg-gray-100"
                >
                  <option value="">
                    {cargandoFacturasCliente ? "Consultando facturas..." : "Seleccionar factura"}
                  </option>
                  {facturasCliente.map((factura) => (
                    <option key={factura.id} value={factura.id}>
                      {factura.folio} — {formatearMoneda(factura.saldo_pendiente)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5">Título</label>
              <input
                type="text"
                required
                value={formulario.titulo}
                onChange={(event) =>
                  setFormulario((anterior) => ({ ...anterior, titulo: event.target.value }))
                }
                placeholder="Ej. Revisar reporte semanal"
                className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5">Detalle</label>
              <textarea
                required
                rows="4"
                value={formulario.motivo}
                onChange={(event) =>
                  setFormulario((anterior) => ({ ...anterior, motivo: event.target.value }))
                }
                placeholder="Describe la acción que debe realizarse."
                className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={cerrarModal}
                disabled={isSubmitting}
                className="px-5 py-3 rounded-xl bg-gray-100 text-gray-600 font-black text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-3 rounded-xl bg-[#ffd700] text-[#0a192f] font-black text-xs flex items-center justify-center disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Guardar recordatorio
              </button>
            </div>
          </form>
        </ModalBase>
      )}

      {modalActivo === "REPROGRAMAR" && eventoSeleccionado && (
        <ModalBase onClose={cerrarModal} maxWidth="max-w-sm">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-black text-[#0a192f]">Reprogramar recordatorio</h2>
            <button type="button" onClick={cerrarModal} className="text-gray-400"><X className="h-5 w-5" /></button>
          </div>
          <form onSubmit={confirmarReprogramacion} className="p-5 space-y-4">
            <p className="text-sm font-bold text-gray-600">{eventoSeleccionado.titulo}</p>
            <input
              type="date"
              required
              value={nuevaFecha}
              onChange={(event) => setNuevaFecha(event.target.value)}
              className="w-full px-3 py-3 border border-gray-200 rounded-xl"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-purple-600 text-white rounded-xl font-black text-xs flex items-center justify-center disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar nueva fecha
            </button>
          </form>
        </ModalBase>
      )}

      {modalActivo === "WHATSAPP" && eventoSeleccionado && (
        <ModalBase onClose={cerrarModal} maxWidth="max-w-lg">
          <div className="p-4 md:p-5 bg-[#25D366] text-white flex items-center justify-between">
            <h2 className="font-black flex items-center"><Smartphone className="h-5 w-5 mr-2" /> Gestión vía WhatsApp</h2>
            <button type="button" onClick={cerrarModal}><X className="h-5 w-5" /></button>
          </div>
          <div className="p-4 md:p-5 space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Cliente</label>
              <p className="font-black text-[#0a192f]">{eventoSeleccionado.cliente}</p>
            </div>
            <input
              type="text"
              value={datosWhatsapp.telefono}
              onChange={(event) => setDatosWhatsapp((anterior) => ({ ...anterior, telefono: event.target.value }))}
              placeholder="Teléfono de 10 dígitos"
              className="w-full px-3 py-3 border border-gray-200 rounded-xl"
            />
            <select
              value={datosWhatsapp.plantilla}
              onChange={(event) => {
                const plantilla = event.target.value;
                setDatosWhatsapp((anterior) => ({
                  ...anterior,
                  plantilla,
                  mensaje: generarMensajeWA(plantilla, {
                    cliente: eventoSeleccionado.cliente,
                    folio: eventoSeleccionado.folio || "S/F",
                    saldo_pendiente: eventoSeleccionado.monto,
                    vencimiento: eventoSeleccionado.fechaClave,
                  }),
                }));
              }}
              className="w-full px-3 py-3 border border-gray-200 rounded-xl bg-white"
            >
              <option value="atrasado">Saldo vencido</option>
              <option value="proximo">Vencimiento próximo</option>
              <option value="manual">Seguimiento libre</option>
            </select>
            <textarea
              rows="6"
              value={datosWhatsapp.mensaje}
              onChange={(event) => setDatosWhatsapp((anterior) => ({ ...anterior, mensaje: event.target.value }))}
              className="w-full px-3 py-3 border border-gray-200 rounded-xl resize-none text-sm"
            />
            <button
              type="button"
              onClick={enviarWhatsapp}
              disabled={isSubmitting || !datosWhatsapp.telefono}
              className="w-full py-3 bg-[#25D366] text-white rounded-xl font-black text-xs flex items-center justify-center disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Abrir WhatsApp
            </button>
          </div>
        </ModalBase>
      )}

      {modalActivo === "EXITO" && (
        <ModalBase onClose={cerrarModal} maxWidth="max-w-sm">
          <div className="p-7 text-center">
            <div className="h-14 w-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-black text-[#0a192f]">Operación completada</h2>
            <p className="text-sm text-gray-500 mt-2">{mensajeExito}</p>
            <button
              type="button"
              onClick={cerrarModal}
              className="w-full mt-5 py-3 bg-[#0a192f] text-white rounded-xl font-black text-xs"
            >
              Continuar
            </button>
          </div>
        </ModalBase>
      )}
    </div>
  );
}
</file>

<file path="src/pages/Clientes.jsx">
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
    setMenuAbiertoId(null);
  };

  const confirmarCambioEstadoCliente = async () => {
    if (!clienteEstadoPendiente || !motivoEstadoCliente.trim()) return;

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
                onChange={(event) => setMotivoEstadoCliente(event.target.value)}
                rows="3"
                disabled={isInactivating}
                placeholder={
                  accionEstadoCliente === "reactivar"
                    ? "Motivo de reactivación"
                    : "Motivo de inactivación"
                }
                className="mb-4 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-[#0a192f] outline-none transition focus:border-[#ffd700] focus:bg-white focus:ring-2 focus:ring-[#ffd700]/40 disabled:opacity-60"
              />

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setClienteEstadoPendiente(null);
                    setMotivoEstadoCliente("");
                  }}
                  disabled={isInactivating}
                  className="flex-1 px-4 py-3 md:py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-xl md:rounded-lg active:bg-gray-50 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={confirmarCambioEstadoCliente}
                  disabled={isInactivating || !motivoEstadoCliente.trim()}
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
</file>

<file path="src/services/compromisosService.js">
import {
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "../config/firebase";
import { formatearFechaSegura } from "../utils/normalizadores";

const COMPROMISOS_COLLECTION = "compromisos";
const ACTIVIDAD_COLLECTION = "actividad";
const ESTADOS_FINALES = ["Completado", "Cancelado"];

const validarActor = (actorUid) => {
  if (!actorUid) {
    return {
      success: false,
      error: "No se identificó al usuario responsable de la acción.",
    };
  }

  return null;
};

const crearAccion = (responsable, accion, detalle) => ({
  responsable: responsable || "Operador MLH",
  fecha: Timestamp.now(),
  accion,
  detalle,
});

const crearActividad = ({ actorUid, userName, tipo, cliente, detalle }) => ({
  actor_uid: actorUid,
  usuario: userName || "Operador MLH",
  modulo: "Calendario",
  tipo,
  cliente: cliente || "Recordatorio general",
  detalle,
  serverTime: serverTimestamp(),
});

const fechaDesdeISO = (fechaISO) => {
  if (!fechaISO) {
    throw new Error("La fecha del compromiso es obligatoria.");
  }

  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  fecha.setHours(12, 0, 0, 0);

  if (!anio || !mes || !dia || Number.isNaN(fecha.getTime())) {
    throw new Error("La fecha del compromiso no es válida.");
  }

  return { fecha, anio, mes, dia };
};

const descripcionVinculo = (tipoVinculo) => {
  if (tipoVinculo === "FACTURA") return "recordatorio de factura";
  if (tipoVinculo === "CLIENTE") return "recordatorio de cliente";
  return "recordatorio general";
};

export const compromisosService = {
  escucharCompromisosMes: (mesAnio, callback) => {
    const consulta = query(
      collection(db, COMPROMISOS_COLLECTION),
      where("mes_anio", "==", mesAnio),
    );

    return onSnapshot(
      consulta,
      (snapshot) => {
        callback(
          snapshot.docs.map((documento) => {
            const data = documento.data();

            return {
              id: documento.id,
              ...data,
              fecha_compromiso_texto: formatearFechaSegura(
                data.fecha_compromiso,
                "Sin fecha",
              ),
              ultima_accion_fecha: formatearFechaSegura(
                data.ultima_accion?.fecha,
                "Reciente",
              ),
            };
          }),
        );
      },
      (error) => {
        console.error("Error al escuchar compromisos:", error);
        callback([]);
      },
    );
  },

  crearCompromiso: async (data, userName, actorUid) => {
    const errorActor = validarActor(actorUid);
    if (errorActor) return errorActor;

    try {
      const { fecha, anio, mes, dia } = fechaDesdeISO(data?.fecha);
      const tipoVinculo = data.tipo_vinculo || "GENERAL";
      const titulo = data.titulo?.trim();
      const motivo = data.motivo?.trim();

      if (!titulo) {
        throw new Error("El título del recordatorio es obligatorio.");
      }

      if (!motivo) {
        throw new Error("El detalle del recordatorio es obligatorio.");
      }

      if (tipoVinculo === "CLIENTE" && !data.cliente_id) {
        throw new Error("Selecciona un cliente para este recordatorio.");
      }

      if (
        tipoVinculo === "FACTURA" &&
        (!data.cliente_id || !data.factura_id)
      ) {
        throw new Error("Selecciona un cliente y una factura.");
      }

      const clienteId =
        tipoVinculo === "GENERAL" ? null : data.cliente_id || null;
      const clienteNombre =
        tipoVinculo === "GENERAL" ? "" : data.cliente_nombre || "";
      const facturaId =
        tipoVinculo === "FACTURA" ? data.factura_id || null : null;
      const folioFactura =
        tipoVinculo === "FACTURA" ? data.folio_factura || "" : "";
      const telefono =
        tipoVinculo === "GENERAL" ? "" : data.telefono || "";
      const monto =
        tipoVinculo === "FACTURA" ? Number(data.monto) || 0 : 0;

      const accionInicial = crearAccion(
        userName,
        "Creación",
        `${descripcionVinculo(tipoVinculo)} creado`,
      );

      const nuevoCompromiso = {
        tipo_vinculo: tipoVinculo,
        titulo,
        motivo,
        cliente_id: clienteId,
        cliente_nombre: clienteNombre,
        factura_id: facturaId,
        folio_factura: folioFactura,
        tipo_evento: data.tipo_evento || "Recordatorio",
        monto,
        telefono,
        fecha_compromiso: Timestamp.fromDate(fecha),
        mes_anio: `${anio}-${String(mes).padStart(2, "0")}`,
        estatus: "Pendiente",
        ultima_accion: accionInicial,
        historial_acciones: [accionInicial],
        creado_por: userName || "Operador MLH",
        creado_por_uid: actorUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const batch = writeBatch(db);
      const compromisoRef = doc(collection(db, COMPROMISOS_COLLECTION));
      const actividadRef = doc(collection(db, ACTIVIDAD_COLLECTION));

      batch.set(compromisoRef, nuevoCompromiso);
      batch.set(
        actividadRef,
        crearActividad({
          actorUid,
          userName,
          tipo: "Creación",
          cliente: clienteNombre,
          detalle: `Se agendó un ${descripcionVinculo(tipoVinculo)} para el ${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${anio}. Título: ${titulo}.`,
        }),
      );

      await batch.commit();
      return { success: true, id: compromisoRef.id };
    } catch (error) {
      console.error("Error al crear compromiso:", error);
      return { success: false, error: error.message };
    }
  },

  completarCompromiso: async (id, clienteNombre, userName, actorUid) => {
    const errorActor = validarActor(actorUid);
    if (errorActor) return errorActor;

    try {
      await runTransaction(db, async (transaction) => {
        const compromisoRef = doc(db, COMPROMISOS_COLLECTION, id);
        const snapshot = await transaction.get(compromisoRef);

        if (!snapshot.exists()) {
          throw new Error("El recordatorio ya no existe.");
        }

        const compromiso = snapshot.data();

        if (ESTADOS_FINALES.includes(compromiso.estatus)) {
          throw new Error("Este recordatorio ya tiene un estado final.");
        }

        const accion = crearAccion(
          userName,
          "Completar",
          "Marcado como completado",
        );

        transaction.update(compromisoRef, {
          estatus: "Completado",
          fecha_completado: serverTimestamp(),
          completado_por: userName || "Operador MLH",
          completado_por_uid: actorUid,
          updatedAt: serverTimestamp(),
          ultima_accion: accion,
          historial_acciones: arrayUnion(accion),
        });

        const actividadRef = doc(collection(db, ACTIVIDAD_COLLECTION));
        transaction.set(
          actividadRef,
          crearActividad({
            actorUid,
            userName,
            tipo: "Actualización",
            cliente: clienteNombre,
            detalle: "El recordatorio fue marcado como completado.",
          }),
        );
      });

      return { success: true };
    } catch (error) {
      console.error("Error completando compromiso:", error);
      return { success: false, error: error.message };
    }
  },

  reprogramarCompromiso: async (
    id,
    nuevaFechaISO,
    clienteNombre,
    userName,
    actorUid,
  ) => {
    const errorActor = validarActor(actorUid);
    if (errorActor) return errorActor;

    try {
      const { fecha, anio, mes, dia } = fechaDesdeISO(nuevaFechaISO);
      const fechaLegible = `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${anio}`;

      await runTransaction(db, async (transaction) => {
        const compromisoRef = doc(db, COMPROMISOS_COLLECTION, id);
        const snapshot = await transaction.get(compromisoRef);

        if (!snapshot.exists()) {
          throw new Error("El recordatorio ya no existe.");
        }

        const compromiso = snapshot.data();

        if (ESTADOS_FINALES.includes(compromiso.estatus)) {
          throw new Error("Un recordatorio cerrado no puede reprogramarse.");
        }

        const accion = crearAccion(
          userName,
          "Reprogramación",
          `Reprogramado para el ${fechaLegible}`,
        );

        transaction.update(compromisoRef, {
          fecha_compromiso: Timestamp.fromDate(fecha),
          mes_anio: `${anio}-${String(mes).padStart(2, "0")}`,
          estatus: "Reprogramado",
          updatedAt: serverTimestamp(),
          ultima_accion: accion,
          historial_acciones: arrayUnion(accion),
        });

        const actividadRef = doc(collection(db, ACTIVIDAD_COLLECTION));
        transaction.set(
          actividadRef,
          crearActividad({
            actorUid,
            userName,
            tipo: "Reprogramación",
            cliente: clienteNombre,
            detalle: `El recordatorio fue reprogramado para el ${fechaLegible}.`,
          }),
        );
      });

      return { success: true };
    } catch (error) {
      console.error("Error reprogramando compromiso:", error);
      return { success: false, error: error.message };
    }
  },

  cancelarCompromiso: async (id, clienteNombre, userName, actorUid) => {
    const errorActor = validarActor(actorUid);
    if (errorActor) return errorActor;

    try {
      await runTransaction(db, async (transaction) => {
        const compromisoRef = doc(db, COMPROMISOS_COLLECTION, id);
        const snapshot = await transaction.get(compromisoRef);

        if (!snapshot.exists()) {
          throw new Error("El recordatorio ya no existe.");
        }

        const compromiso = snapshot.data();

        if (ESTADOS_FINALES.includes(compromiso.estatus)) {
          throw new Error("Este recordatorio ya tiene un estado final.");
        }

        const accion = crearAccion(
          userName,
          "Cancelación",
          "Cancelado por el operador",
        );

        transaction.update(compromisoRef, {
          estatus: "Cancelado",
          updatedAt: serverTimestamp(),
          ultima_accion: accion,
          historial_acciones: arrayUnion(accion),
        });

        const actividadRef = doc(collection(db, ACTIVIDAD_COLLECTION));
        transaction.set(
          actividadRef,
          crearActividad({
            actorUid,
            userName,
            tipo: "Cancelación",
            cliente: clienteNombre,
            detalle: "Se canceló el recordatorio del calendario.",
          }),
        );
      });

      return { success: true };
    } catch (error) {
      console.error("Error cancelando compromiso:", error);
      return { success: false, error: error.message };
    }
  },

  registrarWhatsAppCompromiso: async ({
    idCompromiso,
    esFacturaAuto,
    clienteNombre,
    tipoMensaje,
    userName,
    actor_uid: actorUid,
  }) => {
    const errorActor = validarActor(actorUid);
    if (errorActor) return errorActor;

    try {
      const batch = writeBatch(db);

      if (!esFacturaAuto && idCompromiso) {
        const accion = crearAccion(
          userName,
          "WhatsApp",
          `WhatsApp abierto (${tipoMensaje})`,
        );

        batch.update(doc(db, COMPROMISOS_COLLECTION, idCompromiso), {
          updatedAt: serverTimestamp(),
          ultima_accion: accion,
          historial_acciones: arrayUnion(accion),
        });
      }

      batch.set(
        doc(collection(db, ACTIVIDAD_COLLECTION)),
        crearActividad({
          actorUid,
          userName,
          tipo: "WhatsApp",
          cliente: clienteNombre,
          detalle: `Se abrió WhatsApp con una plantilla tipo "${tipoMensaje}".`,
        }),
      );

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Error registrando WhatsApp:", error);
      return { success: false, error: error.message };
    }
  },

  eliminarCompromiso: async (id, clienteNombre, userName, actorUid) => {
    const errorActor = validarActor(actorUid);
    if (errorActor) return errorActor;

    try {
      const batch = writeBatch(db);

      batch.delete(doc(db, COMPROMISOS_COLLECTION, id));
      batch.set(
        doc(collection(db, ACTIVIDAD_COLLECTION)),
        crearActividad({
          actorUid,
          userName,
          tipo: "Eliminación",
          cliente: clienteNombre,
          detalle:
            "El SU eliminó permanentemente un recordatorio del calendario.",
        }),
      );

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Error eliminando compromiso:", error);
      return { success: false, error: error.message };
    }
  },
};
</file>

<file path="src/pages/ExpedienteCliente.jsx">
import {
  useState,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { GlobalContext } from "../context/GlobalContext";
import { db } from "../config/firebase";
import PaginacionGlobal from "../components/ui/PaginacionGlobal";
import { calcularDiasVencidos } from "../utils/fechas";
import { clientesService } from "../services/clientesService";
import { lineaCreditoService } from "../services/lineaCreditoService";
import { useFacturasCliente } from "../hooks/useFacturasCliente";
import {
  ArrowLeft,
  Edit,
  FileText,
  User,
  CheckCircle,
  Pencil,
  X,
  XCircle,
  TrendingUp,
  Shield,
  Mail,
  Tag,
  MessageSquare,
  StickyNote,
  DollarSign,
  Trash2,
  Loader2,
  AlertTriangle,
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

const TIPOS_MOVIMIENTO_LINEA = [
  { value: "ALTA_INICIAL", label: "Alta inicial" },
  { value: "AUMENTO", label: "Aumento" },
  { value: "DISMINUCION", label: "Disminución" },
  { value: "CORRECCION", label: "Corrección" },
];

const estadoInicialLineaCredito = {
  tipo_movimiento: "AUMENTO",
  nuevo_limite: "",
  personal_autoriza: "",
  motivo: "",
};

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

const obtenerTodasNotasCredito = (factura = {}) =>
  Array.isArray(factura.notas_credito) ? factura.notas_credito : [];

const obtenerNotasCredito = (factura = {}) =>
  obtenerTodasNotasCredito(factura).filter(
    (nota) => nota.cancelada !== true && nota.estado !== "Cancelada" && nota.estado !== "Anulada",
  );

const obtenerTotalNotasCredito = (factura = {}) => {
  const totalGuardado = Number(factura.total_notas_credito);

  if (Number.isFinite(totalGuardado) && totalGuardado > 0) {
    return totalGuardado;
  }

  return obtenerNotasCredito(factura).reduce(
    (total, nota) => total + (Number(nota.monto) || 0),
    0,
  );
};

const obtenerMontoAbonadoSeguro = (factura = {}) => {
  const montoGuardado = Number(factura.monto_pagado);

  if (Number.isFinite(montoGuardado)) {
    return Math.max(0, montoGuardado);
  }

  const montoTotal = Number(factura.monto_total) || 0;
  const saldoPendiente = Number(factura.saldo_pendiente) || 0;
  const totalNotasCredito = obtenerTotalNotasCredito(factura);

  return Math.max(0, montoTotal - saldoPendiente - totalNotasCredito);
};

const obtenerResumenFacturaVisual = (factura = {}) => {
  const montoTotal = Number(factura.monto_total) || 0;
  const saldoPendiente = Number(factura.saldo_pendiente) || 0;
  const totalNotasCredito = obtenerTotalNotasCredito(factura);
  const montoAbonado = obtenerMontoAbonadoSeguro(factura);
  const esVencida = factura.estatus === "Vencida";
  const esPagada = saldoPendiente <= 0;
  const diasVencidos = esVencida
    ? calcularDiasVencidos(factura.vencimiento)
    : 0;

  const porcentajeLiquidado =
    montoTotal > 0
      ? Math.min(100, ((montoAbonado + totalNotasCredito) / montoTotal) * 100)
      : 0;

  return {
    montoTotal,
    saldoPendiente,
    totalNotasCredito,
    montoAbonado,
    porcentajeLiquidado,
    esVencida,
    esPagada,
    diasVencidos,
  };
};

const normalizarEstatusNotaCredito = (estatus = "") => {
  const valor = String(estatus || "Pendiente").toLowerCase();

  if (["anulada", "anulado", "cancelada", "cancelado"].includes(valor)) {
    return "Anulada";
  }

  if (["autorizado", "autorizada", "aprobado", "aprobada", "activa"].includes(valor)) {
    return "Autorizada";
  }

  if (["rechazado", "rechazada"].includes(valor)) {
    return "Rechazada";
  }

  return "Pendiente";
};

const obtenerEstiloNotaCredito = (estatus) => {
  const normalizado = normalizarEstatusNotaCredito(estatus);

  if (normalizado === "Anulada") {
    return {
      texto: "text-slate-600",
      etiqueta: "bg-slate-100 text-slate-700 border-slate-200",
      borde: "border-slate-200",
      fondo: "bg-slate-50",
    };
  }

  if (normalizado === "Autorizada") {
    return {
      texto: "text-green-700",
      etiqueta: "bg-green-50 text-green-700 border-green-200",
      borde: "border-green-100",
      fondo: "bg-green-50/30",
    };
  }

  if (normalizado === "Rechazada") {
    return {
      texto: "text-red-600",
      etiqueta: "bg-red-50 text-red-600 border-red-200",
      borde: "border-red-100",
      fondo: "bg-red-50/30",
    };
  }

  return {
    texto: "text-blue-700",
    etiqueta: "bg-blue-50 text-blue-700 border-blue-200",
    borde: "border-blue-100",
    fondo: "bg-blue-50/30",
  };
};

const obtenerTiempoAbono = (abono = {}) => {
  const tiempo =
    abono.fecha?.toDate?.().getTime?.() ||
    (abono.fecha instanceof Date ? abono.fecha.getTime() : 0) ||
    (typeof abono.fecha === "object" && typeof abono.fecha?.seconds === "number"
      ? abono.fecha.seconds * 1000
      : 0) ||
    new Date(abono.fecha || 0).getTime();

  return Number.isFinite(tiempo) ? tiempo : 0;
};

const tieneValorNumerico = (valor) => {
  const numero = Number(valor);

  return Number.isFinite(numero) && numero >= 0;
};

const formatearFechaNotaCredito = (fecha) => {
  if (!fecha) return "Sin fecha";

  if (fecha?.toDate && typeof fecha.toDate === "function") {
    return fecha.toDate().toLocaleString("es-MX");
  }

  if (typeof fecha === "string") return fecha;

  return "Sin fecha";
};

const formatearFechaAbono = (fecha) => {
  if (!fecha) return "Sin fecha";

  if (fecha?.toDate && typeof fecha.toDate === "function") {
    return fecha.toDate().toLocaleDateString("es-MX");
  }

  if (fecha instanceof Date) {
    return fecha.toLocaleDateString("es-MX");
  }

  if (typeof fecha === "object" && typeof fecha.seconds === "number") {
    return new Date(fecha.seconds * 1000).toLocaleDateString("es-MX");
  }

  if (typeof fecha === "object" && typeof fecha._seconds === "number") {
    return new Date(fecha._seconds * 1000).toLocaleDateString("es-MX");
  }

  if (typeof fecha === "string") {
    return fecha.split(",")[0] || fecha;
  }

  return "Sin fecha";
};

const FACTURAS_COLLECTION = "facturas";

const formatearFechaFacturaExpediente = (fecha) => {
  if (!fecha) return "";

  if (fecha?.toDate && typeof fecha.toDate === "function") {
    return fecha.toDate().toISOString().split("T")[0];
  }

  if (typeof fecha === "object" && typeof fecha.seconds === "number") {
    return new Date(fecha.seconds * 1000).toISOString().split("T")[0];
  }

  if (typeof fecha === "object" && typeof fecha._seconds === "number") {
    return new Date(fecha._seconds * 1000).toISOString().split("T")[0];
  }

  if (fecha instanceof Date) {
    return fecha.toISOString().split("T")[0];
  }

  return String(fecha);
};

const normalizarFacturaExpediente = (idFactura, data = {}) => ({
  id: idFactura,
  ...data,
  emision: formatearFechaFacturaExpediente(data.emision),
  vencimiento: formatearFechaFacturaExpediente(data.vencimiento),
  abonos: Array.isArray(data.abonos) ? data.abonos : [],
  notas_credito: Array.isArray(data.notas_credito) ? data.notas_credito : [],
});

const obtenerTiempoItemNotaCredito = (item = {}) => {
  const fechaBase =
    item.fecha_anulacion?.toDate?.().getTime?.() ||
    item.anuladaAt?.toDate?.().getTime?.() ||
    item.fecha?.toDate?.().getTime?.() ||
    item.createdAt?.toDate?.().getTime?.() ||
    item.resolvedAt?.toDate?.().getTime?.() ||
    new Date(item.fechaTexto || item.fecha || 0).getTime();

  return Number.isFinite(fechaBase) ? fechaBase : 0;
};

const obtenerSolicitudesNotasFactura = (factura = {}, solicitudes = []) =>
  (solicitudes || []).filter(
    (solicitud) => solicitud.factura_id === factura.id,
  );

const obtenerHistorialNotasCreditoExpediente = (
  factura = {},
  solicitudes = [],
) => {
  const notasAplicadas = obtenerTodasNotasCredito(factura);
  const solicitudesFactura = obtenerSolicitudesNotasFactura(
    factura,
    solicitudes,
  );
  const notasUsadas = new Set();

  const historialSolicitudes = solicitudesFactura.map((solicitud) => {
    const notaRelacionada = notasAplicadas.find(
      (nota) =>
        nota.solicitud_nota_id === solicitud.id ||
        nota.id_nota === solicitud.nota_credito_id,
    );

    if (notaRelacionada?.id_nota) {
      notasUsadas.add(notaRelacionada.id_nota);
    }

    const estatus =
      notaRelacionada?.cancelada || ["Anulada", "Cancelada"].includes(notaRelacionada?.estado)
        ? "Anulada"
        : normalizarEstatusNotaCredito(solicitud.estatus);

    return {
      ...solicitud,
      ...notaRelacionada,
      id: solicitud.id,
      id_nota: notaRelacionada?.id_nota || solicitud.nota_credito_id || "",
      tipo_historial: "SOLICITUD_NOTA",
      estatus_historial: estatus,
      monto:
        Number(solicitud.monto_nota) ||
        Number(notaRelacionada?.monto) ||
        0,
      motivo: solicitud.motivo || notaRelacionada?.motivo || "Sin motivo",
      observaciones:
        solicitud.observaciones || notaRelacionada?.observaciones || "",
      fechaTexto:
        solicitud.fecha ||
        formatearFechaNotaCredito(
          solicitud.anuladaAt ||
            solicitud.resolvedAt ||
            solicitud.createdAt ||
            notaRelacionada?.fecha_anulacion ||
            notaRelacionada?.fecha,
        ),
      fechaOrden:
        solicitud.anuladaAt ||
        solicitud.resolvedAt ||
        solicitud.createdAt ||
        notaRelacionada?.fecha_anulacion ||
        notaRelacionada?.fecha,
      solicitado_por_nombre:
        solicitud.solicitado_por_nombre || "ADMIN",
      aplicado_por:
        notaRelacionada?.aplicado_por || solicitud.resolvedBy || "SU",
      esDirecta: false,
    };
  }).filter(Boolean);

  const historialDirectas = notasAplicadas
    .filter((nota) => !notasUsadas.has(nota.id_nota))
    .map((nota) => ({
      ...nota,
      tipo_historial: "NOTA_DIRECTA",
      estatus_historial:
        nota.cancelada || ["Anulada", "Cancelada"].includes(nota.estado)
          ? "Anulada"
          : "Autorizada",
      fechaTexto: formatearFechaNotaCredito(nota.fecha_anulacion || nota.fecha),
      fechaOrden: nota.fecha_anulacion || nota.fecha,
      monto: Number(nota.monto) || 0,
      motivo: nota.motivo || "Sin motivo",
      aplicado_por: nota.aplicado_por || "SU",
      esDirecta: true,
    }));

  return [...historialSolicitudes, ...historialDirectas].sort(
    (primera, segunda) =>
      obtenerTiempoItemNotaCredito(
        segunda.fechaOrden ? { ...segunda, fecha: segunda.fechaOrden } : segunda,
      ) -
      obtenerTiempoItemNotaCredito(
        primera.fechaOrden ? { ...primera, fecha: primera.fechaOrden } : primera,
      ),
  );
};

const llevarExpedienteAlInicio = (elementoBase) => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }

  const candidatos = new Set([
    window,
    document.scrollingElement,
    document.documentElement,
    document.body,
    document.getElementById("root"),
    elementoBase,
  ]);

  let nodoActual = elementoBase;

  while (nodoActual) {
    candidatos.add(nodoActual);
    nodoActual = nodoActual.parentElement;
  }

  document
    .querySelectorAll(
      [
        "main",
        "[role='main']",
        "[data-scroll-container]",
        ".overflow-y-auto",
        ".overflow-y-scroll",
        ".overflow-auto",
        ".custom-scrollbar",
      ].join(","),
    )
    .forEach((elemento) => candidatos.add(elemento));

  candidatos.forEach((elemento) => {
    if (!elemento) return;

    if (elemento === window) {
      window.scrollTo(0, 0);
      return;
    }

    if (typeof elemento.scrollTo === "function") {
      elemento.scrollTo(0, 0);
    }

    if ("scrollTop" in elemento) {
      elemento.scrollTop = 0;
    }
  });
};

function TarjetaResumenExpediente({
  etiqueta,
  valor,
  descripcion,
  icono: Icono,
  variante = "azul",
  accion,
  textoAccion,
}) {
  const variantes = {
    azul: {
      tarjeta: "border-blue-100 bg-blue-50/30",
      etiqueta: "text-blue-600",
      valor: "text-[#0a192f]",
      icono: "bg-blue-100 text-blue-600",
      accion: "text-blue-700 hover:text-blue-900",
    },
    rojo: {
      tarjeta: "border-red-200 bg-red-50/45",
      etiqueta: "text-red-600",
      valor: "text-red-600",
      icono: "bg-red-100 text-red-600",
      accion: "text-red-700 hover:text-red-900",
    },
    verde: {
      tarjeta: "border-green-100 bg-green-50/30",
      etiqueta: "text-green-700",
      valor: "text-green-600",
      icono: "bg-green-100 text-green-600",
      accion: "text-green-700 hover:text-green-900",
    },
    morado: {
      tarjeta: "border-purple-100 bg-purple-50/30",
      etiqueta: "text-purple-700",
      valor: "text-[#0a192f]",
      icono: "bg-purple-100 text-purple-600",
      accion: "text-purple-700 hover:text-purple-900",
    },
    amber: {
      tarjeta: "border-amber-200 bg-amber-50/45",
      etiqueta: "text-amber-700",
      valor: "text-amber-600",
      icono: "bg-amber-100 text-amber-700",
      accion: "text-amber-700 hover:text-amber-900",
    },
  };

  const estilos = variantes[variante] || variantes.azul;

  return (
    <article
      className={`p-4 md:p-5 rounded-2xl border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${estilos.tarjeta}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`text-[10px] md:text-xs font-black uppercase tracking-wider ${estilos.etiqueta}`}
          >
            {etiqueta}
          </p>

          <h3
            className={`text-xl md:text-2xl font-black mt-1 break-words ${estilos.valor}`}
          >
            {valor}
          </h3>
        </div>

        <div className={`p-2.5 rounded-xl shrink-0 ${estilos.icono}`}>
          <Icono className="h-5 w-5" />
        </div>
      </div>

      <p className="text-[11px] md:text-xs text-gray-500 mt-3 font-medium">
        {descripcion}
      </p>

      {accion && textoAccion && (
        <button
          type="button"
          onClick={accion}
          className={`mt-3 text-xs font-black flex items-center ${estilos.accion}`}
        >
          {textoAccion}
          <Pencil className="h-3.5 w-3.5 ml-1" />
        </button>
      )}
    </article>
  );
}

export default function ExpedienteCliente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const expedienteTopRef = useRef(null);
  const facturasListaRef = useRef(null);
  const historialAbonosRef = useRef(null);
  const historialNotasRef = useRef(null);

  useLayoutEffect(() => {
    const ejecutarScrollInicial = () => {
      llevarExpedienteAlInicio(expedienteTopRef.current);
    };

    ejecutarScrollInicial();

    const frame = window.requestAnimationFrame(ejecutarScrollInicial);
    const temporizadorCorto = window.setTimeout(ejecutarScrollInicial, 80);
    const temporizadorLargo = window.setTimeout(ejecutarScrollInicial, 250);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(temporizadorCorto);
      window.clearTimeout(temporizadorLargo);
    };
  }, [id]);

  const {
    clientes,
    userRole,
    userName,
    currentUser,
    solicitudesNotasCredito,
    eliminarFacturaEnNube,
  } = useContext(GlobalContext);

  const [filtroFacturas, setFiltroFacturas] = useState("Historial");
  const [modalActivo, setModalActivo] = useState(null);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [lineaCreditoForm, setLineaCreditoForm] = useState(estadoInicialLineaCredito);
  const [notificacion, setNotificacion] = useState({
    titulo: "",
    descripcion: "",
    tipo: "exito",
  });
  const [clienteForm, setClienteForm] = useState({});
  const [procesandoCredito, setProcesandoCredito] = useState(false);
  const [procesandoEliminacionFactura, setProcesandoEliminacionFactura] =
    useState(false);
  const [facturaAutoAbierta, setFacturaAutoAbierta] = useState("");
  const [paginaHistorialNotas, setPaginaHistorialNotas] = useState(1);
  const [paginaHistorialAbonos, setPaginaHistorialAbonos] = useState(1);
  const registrosHistorialModal = 5;
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

  const facturaIdQuery = searchParams.get("facturaId") || "";
  const abrirFacturaQuery = searchParams.get("abrirFactura") === "1";

  const abrirDetalleFactura = (factura) => {
    setFacturaSeleccionada(factura);
    setPaginaHistorialNotas(1);
    setPaginaHistorialAbonos(1);
    setModalActivo("verFactura");
  };

  useEffect(() => {
    if (!abrirFacturaQuery || !facturaIdQuery || !clienteBase?.id) {
      return undefined;
    }

    const llaveApertura = `${clienteBase.id}-${facturaIdQuery}`;

    if (facturaAutoAbierta === llaveApertura) {
      return undefined;
    }

    const abrirFacturaExacta = (factura) => {
      abrirDetalleFactura(factura);
      setFacturaAutoAbierta(llaveApertura);
    };

    const facturaEnPagina = facturasPaginadas.find(
      (factura) => factura.id === facturaIdQuery,
    );

    if (facturaEnPagina) {
      abrirFacturaExacta(facturaEnPagina);
      return undefined;
    }

    let activo = true;

    const cargarFacturaExacta = async () => {
      try {
        const facturaSnap = await getDoc(
          doc(db, FACTURAS_COLLECTION, facturaIdQuery),
        );

        if (!activo) return;

        if (!facturaSnap.exists()) {
          console.warn("Factura solicitada no encontrada:", facturaIdQuery);
          setFacturaAutoAbierta(llaveApertura);
          return;
        }

        const factura = normalizarFacturaExpediente(
          facturaSnap.id,
          facturaSnap.data(),
        );

        if (factura.cliente_id !== clienteBase.id) {
          console.warn(
            "La factura solicitada no pertenece al expediente actual:",
            facturaIdQuery,
          );
          setFacturaAutoAbierta(llaveApertura);
          return;
        }

        abrirFacturaExacta(factura);
      } catch (error) {
        console.error("No se pudo abrir la factura exacta:", error);
        if (activo) {
          setFacturaAutoAbierta(llaveApertura);
        }
      }
    };

    void cargarFacturaExacta();

    return () => {
      activo = false;
    };
  }, [
    abrirFacturaQuery,
    clienteBase?.id,
    facturaAutoAbierta,
    facturaIdQuery,
    facturasPaginadas,
  ]);

  const cambiarFiltroFacturas = (tab) => {
    setFiltroFacturas(tab);
  };

  const deudaReal = Number(clienteBase?.deuda_actual) || 0;
  const saldoVencidoReal = Number(resumenFacturasCliente?.saldoVencido) || 0;

  const limiteCredito = Number(clienteBase?.limite_credito) || 0;
  const tieneLineaCredito = limiteCredito > 0;
  const clienteInactivo =
    clienteBase?.activo === false || clienteBase?.estatus === "Inactivo";
  const estadoLineaCredito = clienteInactivo
    ? "Bloqueada por cliente inactivo"
    : clienteBase?.linea_credito_estado ||
      (tieneLineaCredito ? "Activa" : "Sin línea");
  const creditoDisponibleCalculado = clienteInactivo
    ? 0
    : tieneLineaCredito
      ? Math.max(0, limiteCredito - deudaReal)
      : 0;
  const pagareInicialCliente =
    typeof clienteBase?.pagare_inicial === "boolean"
      ? clienteBase.pagare_inicial
      : Number(clienteBase?.pagare_monto) > 0
        ? true
        : null;

  const baseCombinada = clienteBase
    ? {
        ...clienteBase,
        rfc: clienteBase.rfc || "S/N",
        limite_credito: limiteCredito,
        deuda_actual: deudaReal,
        credito_disponible: creditoDisponibleCalculado,
        linea_credito_estado: estadoLineaCredito,
        linea_credito_autorizado_por:
          clienteBase.linea_credito_autorizado_por ||
          clienteBase.linea_credito_referencia ||
          "Sin autorizador",
        linea_credito_actualizada_por:
          clienteBase.linea_credito_actualizada_por || "Sin registro",
        saldo_vencido: saldoVencidoReal,
        direccion: clienteBase.direccion || "Sin dirección registrada.",
        correo: clienteBase.correo || "S/N",
        segmentacion: clienteBase.segmentacion || "Nuevo",
        dias_mensaje: clienteBase.dias_mensaje || "",
        pagare_inicial: pagareInicialCliente,
        notas_internas: clienteBase.notas_internas || "",
      }
    : null;

  const cliente = baseCombinada;

  const cerrarModal = () => {
    if (procesandoEliminacionFactura) return;

    setModalActivo(null);
    setFacturaSeleccionada(null);
    setLineaCreditoForm(estadoInicialLineaCredito);
  };

  const opcionesSegmentacion = [
    "Cumplidor",
    "Moroso",
    "Riesgo Alto",
    "Nuevo",
    "Suspendido",
  ];

  const obtenerEtiquetaMontoLinea = (tipoMovimiento = "") => {
    if (tipoMovimiento === "AUMENTO") return "Monto a aumentar";
    if (tipoMovimiento === "DISMINUCION") return "Monto a disminuir";
    if (tipoMovimiento === "CORRECCION") return "Nuevo límite correcto";
    return "Límite inicial autorizado";
  };

  const obtenerDescripcionMontoLinea = (tipoMovimiento = "") => {
    if (tipoMovimiento === "AUMENTO") {
      return "El monto capturado se sumará a la línea actual.";
    }

    if (tipoMovimiento === "DISMINUCION") {
      return "El monto capturado se restará de la línea actual.";
    }

    if (tipoMovimiento === "CORRECCION") {
      return "El monto capturado reemplazará el límite actual.";
    }

    return "El monto capturado será la línea inicial del cliente.";
  };

  const calcularNuevoLimitePreview = ({
    tipoMovimiento,
    montoCapturado,
    limiteActual,
  }) => {
    if (!Number.isFinite(montoCapturado)) return null;

    if (tipoMovimiento === "AUMENTO") {
      return limiteActual + montoCapturado;
    }

    if (tipoMovimiento === "DISMINUCION") {
      return limiteActual - montoCapturado;
    }

    return montoCapturado;
  };

  const limiteActualLinea = Number(cliente?.limite_credito) || 0;
  const deudaActualLinea = Number(cliente?.deuda_actual) || 0;
  const montoLineaCapturado = Number(lineaCreditoForm.nuevo_limite);

  const nuevoLimitePreview = calcularNuevoLimitePreview({
    tipoMovimiento: lineaCreditoForm.tipo_movimiento,
    montoCapturado: montoLineaCapturado,
    limiteActual: limiteActualLinea,
  });
  
  const movimientoLineaInvalidoPorDeuda =
    Number.isFinite(nuevoLimitePreview) &&
    nuevoLimitePreview < deudaActualLinea;

  const prepararCambioLineaCredito = () => {
    setLineaCreditoForm({
      ...estadoInicialLineaCredito,
      tipo_movimiento: tieneLineaCredito ? "AUMENTO" : "ALTA_INICIAL",
      nuevo_limite: "",
      personal_autoriza: "",
      motivo: "",
    });

    setModalActivo("registrarLineaCredito");
  };

  const handleRegistrarMovimientoLinea = async (e) => {
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

    const montoMovimiento = Number(lineaCreditoForm.nuevo_limite);
    const tipoMovimiento = lineaCreditoForm.tipo_movimiento;

    if (
      !tipoMovimiento ||
      !Number.isFinite(montoMovimiento) ||
      montoMovimiento < 0 ||
      !lineaCreditoForm.personal_autoriza.trim() ||
      !lineaCreditoForm.motivo.trim()
    ) {
      mostrarNotificacion(
        "Campos incompletos",
        "Selecciona el tipo de movimiento, captura el monto, el personal que autoriza y el motivo.",
        "error",
      );
      return;
    }

    if (["AUMENTO", "DISMINUCION"].includes(tipoMovimiento) && montoMovimiento <= 0) {
      mostrarNotificacion(
        "Monto inválido",
        tipoMovimiento === "AUMENTO"
          ? "El monto a aumentar debe ser mayor a cero."
          : "El monto a disminuir debe ser mayor a cero.",
        "error",
      );
      return;
    }

    const limiteActual = Number(cliente?.limite_credito) || 0;
    const deudaActual = Number(cliente?.deuda_actual) || 0;

    const limiteResultante = calcularNuevoLimitePreview({
      tipoMovimiento,
      montoCapturado: montoMovimiento,
      limiteActual,
    });

    if (!Number.isFinite(limiteResultante) || limiteResultante < 0) {
      mostrarNotificacion(
        "Movimiento inválido",
        "El movimiento no puede dejar la línea de crédito en negativo.",
        "error",
      );
      return;
    }

    if (limiteResultante < deudaActual) {
      mostrarNotificacion(
        "Límite menor a la deuda",
        `El nuevo límite resultante no puede ser menor a la deuda actual del cliente. Deuda actual: $${deudaActual.toLocaleString("es-MX")}.`,
        "error",
      );
      return;
    }

    setProcesandoCredito(true);

    try {
      const res = await lineaCreditoService.registrarMovimientoLineaCredito({
        cliente_id: cliente.id,
        tipo_movimiento: tipoMovimiento,
        monto_movimiento: montoMovimiento,
        personal_autoriza: lineaCreditoForm.personal_autoriza.trim(),
        motivo: lineaCreditoForm.motivo.trim(),
        actor_uid: currentUser.uid,
        actor_nombre: userName || userRole || "ADMIN",
        actor_rol: userRole || "ADMIN",
      });

      if (!res?.success) {
        mostrarNotificacion(
          "No se pudo registrar",
          res?.error || "El movimiento de línea fue rechazado.",
          "error",
        );
        return;
      }

      cerrarModal();
      mostrarNotificacion(
        "Movimiento registrado",
        "La línea de crédito fue actualizada y el cambio quedó guardado en historial y actividad del sistema.",
        "exito",
      );
    } catch (error) {
      console.error("Error registrando línea de crédito:", error);
      mostrarNotificacion(
        "Error",
        "Ocurrió un error inesperado al registrar la línea de crédito.",
        "error",
      );
    } finally {
      setProcesandoCredito(false);
    }
  };

  const handleGuardarEdicionCliente = async (e) => {
    e.preventDefault();

    if (!currentUser?.uid) {
      mostrarNotificacion(
        "Error",
        "No se identificó al usuario responsable.",
        "error",
      );
      return;
    }

    const respuesta = await clientesService.modificarCliente(
      cliente.id,
      clienteForm,
      cliente.nombre,
      userName,
      currentUser.uid,
    );

    if (respuesta.success) {
      cerrarModal();
      mostrarNotificacion(
        "Cambios Guardados",
        "Los datos del cliente han sido actualizados en la nube con éxito.",
        "exito",
      );
    } else {
      mostrarNotificacion(
        "Error",
        respuesta.error || "Fallo de conexión al guardar en la nube.",
        "error",
      );
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
      const respuesta = await eliminarFacturaEnNube(facturaSeleccionada.id);

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
    return (
      <div className="p-8 text-center font-bold text-gray-500">
        Cargando expediente o cliente no encontrado...
      </div>
    );
  }

  return (
    <div
      ref={expedienteTopRef}
      className="flex flex-col space-y-4 md:space-y-6 animate-fade-in relative pb-6 text-sm"
    >
      <div className="flex items-center mt-2 md:mt-4">
        <button
          onClick={() => navigate("/clientes")}
          className="text-gray-500 hover:text-[#0a192f] active:text-[#0a192f] active:bg-gray-100 font-bold flex items-center transition-colors py-2 md:py-0 px-2 md:px-0 rounded-lg -ml-2 md:ml-0"
        >
          <ArrowLeft className="h-5 w-5 md:h-4 md:w-4 mr-1.5" /> Regresar a
          Clientes
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
          <Edit className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1.5 text-gray-500" />{" "}
          Editar Perfil
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <TarjetaResumenExpediente
          etiqueta="Deuda actual"
          valor={`$${(cliente.deuda_actual || 0).toLocaleString("es-MX")}`}
          descripcion="Suma de saldos pendientes."
          icono={DollarSign}
          variante="azul"
        />

        <TarjetaResumenExpediente
          etiqueta="Límite crédito"
          valor={
            tieneLineaCredito
              ? `$${(cliente.limite_credito || 0).toLocaleString("es-MX")}`
              : "Sin línea asignada"
          }
          descripcion={
            tieneLineaCredito
              ? `${estadoLineaCredito}. Autorizó: ${cliente.linea_credito_autorizado_por}`
              : "Pendiente de registro externo."
          }
          icono={Shield}
          variante={tieneLineaCredito ? "morado" : "amber"}
          accion={clienteInactivo ? undefined : prepararCambioLineaCredito}
          textoAccion="Registrar cambio"
        />

        <TarjetaResumenExpediente
          etiqueta="Crédito disponible"
          valor={
            tieneLineaCredito
              ? `$${(cliente.credito_disponible || 0).toLocaleString("es-MX")}`
              : "N/A"
          }
          descripcion={
            tieneLineaCredito
              ? cliente.credito_disponible > 0
                ? "Margen operativo disponible."
                : "Límite excedido."
              : "Registra la línea autorizada externa."
          }
          icono={CheckCircle}
          variante={
            !tieneLineaCredito
              ? "morado"
              : cliente.credito_disponible > 0
                ? "verde"
                : "rojo"
          }
        />

        <TarjetaResumenExpediente
          etiqueta="Saldo vencido"
          valor={`$${(cliente.saldo_vencido || 0).toLocaleString("es-MX")}`}
          descripcion={
            cliente.saldo_vencido > 0
              ? "Fuera del plazo permitido."
              : "Sin vencimientos activos."
          }
          icono={AlertTriangle}
          variante={cliente.saldo_vencido > 0 ? "rojo" : "azul"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 items-start">
        {" "}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden h-fit">
          <div className="p-4 border-b border-gray-50 bg-gray-50/30">
            <h3 className="font-bold text-[#0a192f] flex items-center">
              <User className="h-4 w-4 mr-2 text-blue-600" /> Datos de Cliente
            </h3>
          </div>
          <div className="p-4 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                  No. Cliente
                </span>
                <strong className="text-gray-800 font-mono text-sm">
                  #{cliente.numero_cliente || "SIN-FOLIO"}
                </strong>
              </div>
              <div>
                <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                  Grupo
                </span>
                <strong className="text-gray-800 text-sm">
                  {obtenerEtiquetaGrupo(cliente.grupo)}
                </strong>
              </div>
            </div>
            <div>
              <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                RFC Comercial
              </span>
              <strong className="text-sm font-mono text-gray-800">
                {cliente.rfc}
              </strong>
            </div>
            <div>
              <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                Correo Electrónico
              </span>
              <strong className="text-gray-700 font-medium flex items-center gap-1">
                <Mail className="h-3 w-3 text-gray-400" /> {cliente.correo}
              </strong>
            </div>
            <div>
              <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                Teléfono
              </span>
              <strong className="text-gray-700 block">
                {cliente.telefono}
              </strong>
            </div>
            <div>
              <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                Dirección Fiscal / Entrega
              </span>
              <strong className="text-gray-700 leading-relaxed block font-normal">
                {cliente.direccion}
              </strong>
            </div>
            <div>
              <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                Segmentación
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100 mt-1">
                <Tag className="h-3 w-3 mr-1" /> {cliente.segmentacion}
              </span>
            </div>

            <div>
              <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                Pagaré inicial
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border mt-1 ${
                  cliente.pagare_inicial === true
                    ? "bg-green-50 text-green-700 border-green-100"
                    : cliente.pagare_inicial === false
                      ? "bg-gray-50 text-gray-600 border-gray-200"
                      : "bg-amber-50 text-amber-700 border-amber-100"
                }`}
              >
                <Shield className="h-3 w-3 mr-1" />
                {cliente.pagare_inicial === true
                  ? "Sí"
                  : cliente.pagare_inicial === false
                    ? "No"
                    : "No registrado"}
              </span>
            </div>
            {cliente.dias_mensaje && cliente.dias_mensaje !== "" && (
              <div>
                <span className="block font-bold text-amber-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> Días de Mensaje
                </span>
                <strong className="text-gray-800 text-sm">
                  Avisar {cliente.dias_mensaje} días antes del vencimiento.
                </strong>
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 mt-2">
              <span className="block font-bold text-green-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                <DollarSign className="h-4 w-4" /> Último Abono Registrado
              </span>
              <div className="bg-green-50/50 p-3 rounded-lg border border-green-100">
                <p className="text-lg font-black text-green-700">
                  $
                  {(
                    cliente.monto_ultimo_pago ||
                    cliente.ultimo_deposito_monto ||
                    0
                  ).toLocaleString("es-MX")}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Fecha:{" "}
                  {cliente.fecha_ultimo_pago?.toDate
                    ? cliente.fecha_ultimo_pago.toDate().toLocaleDateString()
                    : cliente.ultimo_deposito_fecha?.toDate
                      ? cliente.ultimo_deposito_fecha
                          .toDate()
                          .toLocaleDateString()
                      : "Sin registros"}
                </p>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">
                  Método:{" "}
                  {cliente.metodo_ultimo_pago ||
                    cliente.ultimo_deposito_metodo ||
                    "N/A"}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-50">
              <span className="block font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <StickyNote className="h-3 w-3" /> Notas Internas
              </span>
              <p className="text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 leading-relaxed font-serif italic text-xs">
                {cliente.notas_internas
                  ? `"${cliente.notas_internas}"`
                  : "Sin notas registradas."}
              </p>
            </div>
          </div>
        </div>
        <div ref={facturasListaRef} className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden h-fit self-start">
          {" "}
          <div className="p-4 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="font-bold text-[#0a192f] flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" /> Historial de
              Facturas
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
          <div className="border-t border-gray-100 bg-white">
            {facturasPaginadas.length > 0 ? (
              <>
                <div className="hidden md:block overflow-x-auto custom-scrollbar w-full">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-gray-50 text-[11px] font-black text-gray-500 uppercase border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-3 whitespace-nowrap">Folio</th>
                        <th className="px-4 py-3 whitespace-nowrap">Fechas</th>
                        <th className="px-4 py-3 text-right whitespace-nowrap">
                          Total
                        </th>
                        <th className="px-4 py-3 text-right whitespace-nowrap">
                          Saldo
                        </th>
                        <th className="px-4 py-3 text-center whitespace-nowrap">
                          Estado
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-50">
                      {facturasPaginadas.map((fac) => {
                        const {
                          saldoPendiente,
                          montoTotal,
                          esVencida,
                          esPagada,
                          diasVencidos,
                        } = obtenerResumenFacturaVisual(fac);

                        return (
                          <tr
                            key={fac.id}
                            onClick={() => {
                              abrirDetalleFactura(fac);
                            }}
                            className="hover:bg-blue-50/40 cursor-pointer transition-colors text-xs"
                          >
                            <td className="px-4 py-3 font-mono font-black text-blue-600 whitespace-nowrap">
                              {fac.folio}
                            </td>

                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                              <div className="font-medium">
                                Emi: {fac.emision}
                              </div>
                              <div className="text-[11px] text-red-500 font-mono">
                                Vence: {fac.vencimiento}
                              </div>
                            </td>

                            <td className="px-4 py-3 font-black text-gray-900 text-right whitespace-nowrap">
                              ${montoTotal.toLocaleString("es-MX")}
                            </td>

                            <td className="px-4 py-3 font-black text-right whitespace-nowrap">
                              {saldoPendiente > 0 ? (
                                <span
                                  className={
                                    esVencida
                                      ? "text-red-600"
                                      : "text-[#0a192f]"
                                  }
                                >
                                  ${saldoPendiente.toLocaleString("es-MX")}
                                </span>
                              ) : (
                                <span className="text-green-600">$0.00</span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <span
                                className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase border inline-flex items-center justify-center ${
                                  esPagada
                                    ? "bg-green-50 border-green-200 text-green-700"
                                    : esVencida
                                      ? "bg-red-50 border-red-200 text-red-700"
                                      : "bg-blue-50 border-blue-200 text-blue-700"
                                }`}
                              >
                                {esPagada
                                  ? "Pagada"
                                  : esVencida
                                    ? `Vencida (${diasVencidos}d)`
                                    : fac.estatus}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-gray-100">
                  {facturasPaginadas.map((fac) => {
                    const saldoPendiente = Number(fac.saldo_pendiente) || 0;
                    const montoTotal = Number(fac.monto_total) || 0;
                    const esVencida = fac.estatus === "Vencida";
                    const esPagada = saldoPendiente <= 0;
                    const diasVencidos = esVencida
                      ? calcularDiasVencidos(fac.vencimiento)
                      : 0;

                    return (
                      <button
                        key={fac.id}
                        type="button"
                        onClick={() => {
                          abrirDetalleFactura(fac);
                        }}
                        className="w-full p-4 text-left active:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-mono font-black text-blue-600 text-sm truncate">
                              {fac.folio}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-1">
                              Emi: {fac.emision}
                            </p>
                            <p className="text-[11px] text-red-500 font-mono">
                              Vence: {fac.vencimiento}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 px-2 py-1 rounded-md text-[9px] font-black uppercase border ${
                              esPagada
                                ? "bg-green-50 border-green-200 text-green-700"
                                : esVencida
                                  ? "bg-red-50 border-red-200 text-red-700"
                                  : "bg-blue-50 border-blue-200 text-blue-700"
                            }`}
                          >
                            {esPagada
                              ? "Pagada"
                              : esVencida
                                ? `${diasVencidos}d`
                                : fac.estatus}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div className="rounded-lg bg-gray-50 border border-gray-100 p-2">
                            <p className="text-[9px] font-black uppercase text-gray-400">
                              Total
                            </p>
                            <p className="text-sm font-black text-[#0a192f] mt-0.5">
                              ${montoTotal.toLocaleString("es-MX")}
                            </p>
                          </div>

                          <div className="rounded-lg bg-gray-50 border border-gray-100 p-2">
                            <p className="text-[9px] font-black uppercase text-gray-400">
                              Saldo
                            </p>
                            <p
                              className={`text-sm font-black mt-0.5 ${
                                saldoPendiente > 0
                                  ? esVencida
                                    ? "text-red-600"
                                    : "text-[#0a192f]"
                                  : "text-green-600"
                              }`}
                            >
                              ${saldoPendiente.toLocaleString("es-MX")}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="px-4 py-10 text-center text-gray-400">
                {cargandoFacturasCliente ? (
                  <>
                    <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-blue-500" />
                    <p className="text-xs font-bold uppercase tracking-wider">
                      Cargando facturas del expediente...
                    </p>
                  </>
                ) : (
                  <>
                    <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-xs font-bold uppercase tracking-wider">
                      {errorFacturasCliente ||
                        "No se encontraron facturas para este filtro."}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
          <PaginacionGlobal
            modoCursor
            pagina={paginaFacturas}
            hayAnterior={hayPaginaAnterior}
            haySiguiente={hayPaginaSiguiente}
            cargando={cargandoFacturasCliente}
            registrosEnPagina={facturasPaginadas.length}
            etiquetaTotal="factura(s)"
            etiquetaPagina="Facturas del cliente"
            mostrarSiempre={facturasPaginadas.length > 0}
            scrollTargetRef={facturasListaRef}
            onAnterior={paginaAnterior}
            onSiguiente={siguientePagina}
            className="m-0 rounded-none border-x-0 border-b-0 bg-gray-50 shadow-none"
          />
        </div>
      </div>

      {modalActivo && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm md:items-center md:p-4">
          <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-slide-up md:rounded-xl md:pb-0 md:animate-fade-in">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden shrink-0"></div>

            {modalActivo !== "notificacion" && (
              <div className="flex justify-between items-center p-4 md:p-4 border-b border-gray-100 bg-white md:bg-gray-50 shrink-0">
                <h2 className="text-sm font-black text-[#0a192f] flex items-center">
                  {modalActivo === "registrarLineaCredito" && (
                    <>
                      <TrendingUp className="h-5 w-5 md:h-4 md:w-4 mr-2 text-blue-600" />{" "}
                      Línea de Crédito
                    </>
                  )}
                  {modalActivo === "editarCliente" && (
                    <>
                      <Edit className="h-5 w-5 md:h-4 md:w-4 mr-2 text-blue-600" />{" "}
                      Editar Cliente
                    </>
                  )}
                  {modalActivo === "verFactura" && (
                    <>
                      <FileText className="h-5 w-5 md:h-4 md:w-4 mr-2 text-gray-600" />{" "}
                      Factura:{" "}
                      <span className="font-mono text-blue-600 ml-1">
                        {facturaSeleccionada?.folio}
                      </span>
                    </>
                  )}
                  {modalActivo === "confirmarEliminarFactura" && (
                    <>
                      <AlertTriangle className="h-5 w-5 md:h-4 md:w-4 mr-2 text-red-600" />{" "}
                      Eliminar Factura
                    </>
                  )}
                </h2>
                <button
                  onClick={cerrarModal}
                  className="text-gray-400 active:text-red-500 p-1 bg-gray-50 md:bg-transparent rounded-full"
                >
                  <X className="h-6 w-6 md:h-5 md:w-5" />
                </button>
              </div>
            )}

            <div className="p-5 overflow-y-auto custom-scrollbar">
              {modalActivo === "verFactura" &&
                facturaSeleccionada &&
                (() => {
                  const fac = facturaSeleccionada;
                  const {
                    montoTotal,
                    saldoPendiente,
                    totalNotasCredito,
                    montoAbonado,
                    porcentajeLiquidado,
                    esVencida,
                    esPagada,
                    diasVencidos,
                  } = obtenerResumenFacturaVisual(fac);
                  const observacionLimpia = String(fac.observaciones || "")
                    .replace(/^observaciones\s*:\s*/i, "")
                    .trim();
                  const historialNotasCredito =
                    obtenerHistorialNotasCreditoExpediente(
                      fac,
                      solicitudesNotasCredito,
                    );
                  const totalPaginasNotas = Math.max(
                    1,
                    Math.ceil(historialNotasCredito.length / registrosHistorialModal),
                  );
                  const historialNotasPaginado = historialNotasCredito.slice(
                    (paginaHistorialNotas - 1) * registrosHistorialModal,
                    paginaHistorialNotas * registrosHistorialModal,
                  );
                  const historialAbonosOrdenado = Array.isArray(fac.abonos)
                    ? [...fac.abonos].sort(
                        (primero, segundo) =>
                          obtenerTiempoAbono(segundo) - obtenerTiempoAbono(primero),
                      )
                    : [];
                  const totalPaginasAbonos = Math.max(
                    1,
                    Math.ceil(historialAbonosOrdenado.length / registrosHistorialModal),
                  );
                  const historialAbonosPaginado = historialAbonosOrdenado.slice(
                    (paginaHistorialAbonos - 1) * registrosHistorialModal,
                    paginaHistorialAbonos * registrosHistorialModal,
                  );

                  return (
                    <div className="flex flex-col space-y-5 md:space-y-4">
                      <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 md:p-3 rounded-xl md:rounded-lg border border-gray-100 text-xs">
                        <div>
                          <span className="block font-black text-[10px] text-gray-400 uppercase tracking-wider mb-1 md:mb-0.5">
                            Emisión / Vcto
                          </span>
                          <strong className="text-gray-800 text-sm md:text-xs block md:inline">
                            {fac.emision}{" "}
                            <span className="hidden md:inline text-gray-400 font-normal mx-1">
                              |
                            </span>{" "}
                            <span
                              className={`block md:inline mt-0.5 md:mt-0 ${esVencida ? "text-red-500" : ""}`}
                            >
                              {fac.vencimiento}
                            </span>
                          </strong>
                        </div>
                        <div>
                          <span className="block font-black text-[10px] text-gray-400 uppercase tracking-wider mb-1 md:mb-0.5">
                            Estatus Actual
                          </span>
                          <span
                            className={`inline-block px-2.5 py-1 md:py-0.5 font-black uppercase rounded text-[10px] md:text-[10px] ${esPagada ? "bg-green-100 text-green-800" : esVencida ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}
                          >
                            {esPagada
                              ? "Pagada"
                              : esVencida
                                ? `Vencida (${diasVencidos}d)`
                                : fac.estatus}
                          </span>
                        </div>
                      </div>

                      <div className="bg-white p-4 md:p-3 rounded-xl md:rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase mb-2 md:mb-1.5">
                          <span>Progreso de Pago</span>
                          <span className={esPagada ? "text-green-600" : ""}>
                            {porcentajeLiquidado.toFixed(1)}% Liquidado
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 md:h-2">
                          <div
                            className={`h-2.5 md:h-2 rounded-full transition-all duration-500 ${esPagada ? "bg-green-500" : esVencida ? "bg-red-500" : "bg-blue-500"}`}
                            style={{ width: `${porcentajeLiquidado}%` }}
                          ></div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-[10px] font-bold mt-3 md:mt-2 pt-3 md:pt-2 border-t border-gray-50">
                          <div className="flex flex-col">
                            <span className="text-gray-400 uppercase">
                              Facturado
                            </span>
                            <span className="text-gray-800 text-sm md:text-xs font-black">
                              ${montoTotal.toLocaleString("es-MX")}
                            </span>
                          </div>
                          <div className="flex flex-col md:border-l border-gray-100">
                            <span className="text-gray-400 uppercase">
                              Abonado
                            </span>
                            <span className="text-green-600 text-sm md:text-xs font-black">
                              ${montoAbonado.toLocaleString("es-MX")}
                            </span>
                          </div>
                          <div className="flex flex-col md:border-l border-gray-100">
                            <span className="text-gray-400 uppercase">
                              Notas crédito
                            </span>
                            <span className="text-purple-600 text-sm md:text-xs font-black">
                              ${totalNotasCredito.toLocaleString("es-MX")}
                            </span>
                          </div>
                          <div className="flex flex-col md:border-l border-gray-100">
                            <span className="text-gray-400 uppercase">
                              Faltante
                            </span>
                            <span
                              className={`text-sm md:text-xs font-black ${esPagada ? "text-green-600" : esVencida ? "text-red-600" : "text-[#0a192f]"}`}
                            >
                              ${saldoPendiente.toLocaleString("es-MX")}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-amber-100 bg-amber-50/45 px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-black uppercase tracking-wide text-amber-700 flex items-center">
                            <StickyNote className="h-3.5 w-3.5 mr-1.5" />
                            Observaciones
                          </p>

                          <span
                            className={`shrink-0 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase ${
                              observacionLimpia
                                ? "bg-white border-amber-200 text-amber-700"
                                : "bg-gray-50 border-gray-200 text-gray-500"
                            }`}
                          >
                            {observacionLimpia ? "Registrada" : "Sin registro"}
                          </span>
                        </div>

                        <p
                          className={`mt-1.5 text-[11px] leading-relaxed whitespace-pre-wrap break-words ${
                            observacionLimpia
                              ? "text-gray-700 font-medium"
                              : "text-gray-400 italic"
                          }`}
                        >
                          {observacionLimpia ||
                            "Sin observaciones registradas."}
                        </p>
                      </div>

                      <div ref={historialAbonosRef}>
                        <span className="block font-black text-[#0a192f] text-xs md:text-xs flex items-center mb-2 md:mb-2">
                          <FileText className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1 text-blue-600" />{" "}
                          Historial de Abonos
                        </span>

                        <div className="space-y-2">
                          {historialAbonosOrdenado.length > 0 ? (
                            <>
                              {historialAbonosPaginado.map((abono, indice) => {
                                const montoAbono = Number(abono.monto) || 0;
                                const tieneSaldoAnterior = tieneValorNumerico(
                                  abono.saldo_anterior,
                                );
                                const tieneSaldoRestante = tieneValorNumerico(
                                  abono.saldo_restante,
                                );

                                return (
                                  <article
                                    key={
                                      abono.id_abono ||
                                      `${abono.fecha}-${indice}`
                                    }
                                    className="rounded-xl border border-green-100 bg-green-50/25 p-3 text-xs"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-base font-black text-green-700">
                                          $
                                          {montoAbono.toLocaleString("es-MX")}
                                        </p>
                                        <p className="text-[10px] font-black uppercase text-gray-400">
                                          Abono registrado
                                        </p>
                                      </div>

                                      <p className="text-[10px] text-gray-500 font-bold text-right shrink-0">
                                        {formatearFechaAbono(abono.fecha)}
                                      </p>
                                    </div>

                                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-gray-600">
                                      {abono.metodo && (
                                        <p>
                                          <span className="font-black text-gray-400 uppercase tracking-wider">
                                            Método:
                                          </span>{" "}
                                          <span className="font-bold">
                                            {abono.metodo}
                                          </span>
                                        </p>
                                      )}

                                      {abono.registrado_por && (
                                        <p>
                                          <span className="font-black text-gray-400 uppercase tracking-wider">
                                            Registró:
                                          </span>{" "}
                                          <span className="font-bold">
                                            {abono.registrado_por}
                                          </span>
                                        </p>
                                      )}

                                      {tieneSaldoAnterior && (
                                        <p>
                                          <span className="font-black text-gray-400 uppercase tracking-wider">
                                            Saldo anterior:
                                          </span>{" "}
                                          <span className="font-bold">
                                            $
                                            {Number(
                                              abono.saldo_anterior,
                                            ).toLocaleString("es-MX")}
                                          </span>
                                        </p>
                                      )}

                                      {tieneSaldoRestante && (
                                        <p>
                                          <span className="font-black text-gray-400 uppercase tracking-wider">
                                            Restante:
                                          </span>{" "}
                                          <span className="font-bold">
                                            $
                                            {Number(
                                              abono.saldo_restante,
                                            ).toLocaleString("es-MX")}
                                          </span>
                                        </p>
                                      )}
                                    </div>

                                    {abono.observaciones && (
                                      <p className="mt-2 text-[11px] text-gray-600 bg-white/75 border border-gray-100 rounded-lg p-2">
                                        {abono.observaciones}
                                      </p>
                                    )}
                                  </article>
                                );
                              })}

                              <PaginacionGlobal
                                pagina={paginaHistorialAbonos}
                                totalPaginas={totalPaginasAbonos}
                                totalRegistros={historialAbonosOrdenado.length}
                                registrosPorPagina={registrosHistorialModal}
                                registrosEnPagina={historialAbonosPaginado.length}
                                etiquetaTotal="abono(s)"
                                scrollTargetRef={historialAbonosRef}
                                onCambiarPagina={setPaginaHistorialAbonos}
                              />
                            </>
                          ) : (
                            <p className="px-3 py-6 text-center text-gray-400 font-medium italic text-xs rounded-xl border border-gray-200 bg-gray-50/70">
                              No se han registrado pagos.
                            </p>
                          )}
                        </div>
                      </div>

                      <div ref={historialNotasRef}>
                        <span className="block font-black text-[#0a192f] text-xs md:text-xs flex items-center mb-2 md:mb-2">
                          <FileText className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1 text-blue-600" />{" "}
                          Historial de Notas de Crédito
                        </span>

                        <div className="space-y-2">
                          {historialNotasCredito.length > 0 ? (
                            <>
                              {historialNotasPaginado.map((nota) => {
                                const estatus = normalizarEstatusNotaCredito(
                                  nota.estatus_historial,
                                );
                                const estilosNota =
                                  obtenerEstiloNotaCredito(estatus);
                                const esPendiente = estatus === "Pendiente";
                                const esRechazada = estatus === "Rechazada";
                                const esAnulada = estatus === "Anulada";

                                return (
                                  <article
                                    key={`${nota.id || nota.id_nota}-${estatus}`}
                                    className={`rounded-xl border ${estilosNota.borde} ${estilosNota.fondo} p-3 text-xs`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <p
                                            className={`font-black ${estilosNota.texto}`}
                                          >
                                            $
                                            {(
                                              Number(nota.monto) || 0
                                            ).toLocaleString("es-MX")}
                                          </p>

                                          <span
                                            className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase ${estilosNota.etiqueta}`}
                                          >
                                            {estatus}
                                          </span>
                                        </div>

                                        <p className="font-bold text-gray-700 mt-1">
                                          {nota.motivo || "Sin motivo"}
                                        </p>
                                      </div>

                                      <p className="text-[10px] text-gray-500 font-bold text-right shrink-0">
                                        {nota.fechaTexto ||
                                          formatearFechaNotaCredito(nota.fecha)}
                                      </p>
                                    </div>

                                    <div className="mt-2 space-y-1 text-[11px] text-gray-500">
                                      {nota.esDirecta ? (
                                        <p>
                                          Aplicada directamente por:{" "}
                                          <strong>
                                            {nota.aplicado_por || "SU"}
                                          </strong>
                                        </p>
                                      ) : (
                                        <>
                                          <p>
                                            Solicitó:{" "}
                                            <strong>
                                              {nota.solicitado_por_nombre ||
                                                "ADMIN"}
                                            </strong>
                                          </p>

                                          {esPendiente ? (
                                            <p className="text-blue-700 font-bold">
                                              En espera de autorización del SU.
                                            </p>
                                          ) : (
                                            <p>
                                              Resolvió:{" "}
                                              <strong>
                                                {nota.resolvedBy ||
                                                  nota.aplicado_por ||
                                                  "SU"}
                                              </strong>
                                            </p>
                                          )}
                                        </>
                                      )}
                                    </div>

                                    {esRechazada && (
                                      <div className="mt-2 bg-red-50 border border-red-100 rounded-lg p-2 text-[11px] text-red-700 leading-relaxed">
                                        <strong>Motivo de rechazo:</strong>{" "}
                                        {nota.motivo_resolucion ||
                                          "El SU rechazó la solicitud sin capturar motivo adicional."}
                                      </div>
                                    )}

                                    {esAnulada && (
                                      <div className="mt-2 bg-slate-100 border border-slate-200 rounded-lg p-2 text-[11px] text-slate-700 leading-relaxed">
                                        <strong>Nota anulada:</strong>{" "}
                                        {nota.motivo_cancelacion ||
                                          nota.motivo_anulacion ||
                                          "Reversión aplicada por SU."}
                                      </div>
                                    )}

                                    {nota.observaciones && (
                                      <p className="text-[11px] text-gray-600 mt-2 bg-white/75 border border-gray-100 rounded-lg p-2">
                                        {nota.observaciones}
                                      </p>
                                    )}
                                  </article>
                                );
                              })}

                              <PaginacionGlobal
                                pagina={paginaHistorialNotas}
                                totalPaginas={totalPaginasNotas}
                                totalRegistros={historialNotasCredito.length}
                                registrosPorPagina={registrosHistorialModal}
                                registrosEnPagina={historialNotasPaginado.length}
                                etiquetaTotal="nota(s)"
                                scrollTargetRef={historialNotasRef}
                                onCambiarPagina={setPaginaHistorialNotas}
                              />
                            </>
                          ) : (
                            <p className="px-3 py-6 text-center text-gray-400 font-medium italic text-xs rounded-xl border border-gray-200 bg-gray-50/70">
                              No se han aplicado ni solicitado notas de crédito.
                            </p>
                          )}
                        </div>
                      </div>

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
                  );
                })()}

              {modalActivo === "confirmarEliminarFactura" &&
                facturaSeleccionada && (
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
                <form
                  id="formEditarCliente"
                  onSubmit={handleGuardarEdicionCliente}
                  className="space-y-5 md:space-y-4 text-sm md:text-xs"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-3">
                    <div>
                      <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">
                        No. Cliente
                      </label>
                      <input
                        type="text"
                        value={clienteForm.numero_cliente || ""}
                        onChange={(e) =>
                          setClienteForm({
                            ...clienteForm,
                            numero_cliente: e.target.value,
                          })
                        }
                        placeholder="Ej. CLI-007"
                        className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md font-bold uppercase focus:ring-2 focus:ring-[#ffd700] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={clienteForm.nombre || ""}
                        onChange={(e) =>
                          setClienteForm({
                            ...clienteForm,
                            nombre: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md font-bold focus:ring-2 focus:ring-[#ffd700] outline-none"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:gap-3">
                    <div>
                      <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">
                        RFC
                      </label>
                      <input
                        type="text"
                        value={clienteForm.rfc || ""}
                        onChange={(e) =>
                          setClienteForm({
                            ...clienteForm,
                            rfc: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md font-mono uppercase focus:ring-2 focus:ring-[#ffd700] outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        value={clienteForm.telefono || ""}
                        onChange={(e) =>
                          setClienteForm({
                            ...clienteForm,
                            telefono: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md focus:ring-2 focus:ring-[#ffd700] outline-none"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">
                      Correo
                    </label>
                    <input
                      type="email"
                      value={clienteForm.correo || ""}
                      onChange={(e) =>
                        setClienteForm({
                          ...clienteForm,
                          correo: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md focus:ring-2 focus:ring-[#ffd700] outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">
                      Dirección
                    </label>
                    <textarea
                      value={clienteForm.direccion || ""}
                      onChange={(e) =>
                        setClienteForm({
                          ...clienteForm,
                          direccion: e.target.value,
                        })
                      }
                      rows="2"
                      className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md resize-none focus:ring-2 focus:ring-[#ffd700] outline-none"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:gap-3">
                    <div>
                      <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">
                        Grupo
                      </label>
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
                      <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">
                        Segmentación
                      </label>
                      <select
                        value={clienteForm.segmentacion || ""}
                        onChange={(e) =>
                          setClienteForm({
                            ...clienteForm,
                            segmentacion: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md outline-none"
                      >
                        {opcionesSegmentacion.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">
                      Días de Mensaje (Aviso)
                    </label>
                    <input
                      type="number"
                      value={clienteForm.dias_mensaje || ""}
                      onChange={(e) =>
                        setClienteForm({
                          ...clienteForm,
                          dias_mensaje: e.target.value,
                        })
                      }
                      placeholder="Ej. 5"
                      className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md focus:ring-2 focus:ring-[#ffd700] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">
                      Notas Internas
                    </label>
                    <textarea
                      value={clienteForm.notas_internas || ""}
                      onChange={(e) =>
                        setClienteForm({
                          ...clienteForm,
                          notas_internas: e.target.value,
                        })
                      }
                      rows="2"
                      className="w-full px-4 py-3 md:px-3 md:py-2 bg-yellow-50/50 focus:bg-yellow-50 border border-yellow-200 rounded-xl md:rounded-md resize-none font-serif focus:ring-2 focus:ring-[#ffd700] outline-none"
                    />
                  </div>
                </form>
              )}

              {modalActivo === "registrarLineaCredito" && (
                <form
                  onSubmit={handleRegistrarMovimientoLinea}
                  className="space-y-5 md:space-y-4"
                >
                  <div className="bg-blue-50 p-4 md:p-3 rounded-xl border border-blue-100 text-blue-800 text-xs flex items-start gap-3">
                    <Shield className="h-5 w-5 md:h-4 md:w-4 shrink-0 mt-0.5" />

                    <p className="leading-relaxed">
                      Registra aquí únicamente cambios ya aprobados. El movimiento quedará en historial y actividad para auditoría del SU.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                        Tipo de movimiento
                      </label>

                      <select
                        required
                        value={lineaCreditoForm.tipo_movimiento}
                        onChange={(e) =>
                          setLineaCreditoForm({
                            ...lineaCreditoForm,
                            tipo_movimiento: e.target.value,
                            nuevo_limite: "",
                          })
                        }
                        className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md focus:ring-2 focus:ring-[#ffd700] outline-none font-bold"
                      >
                        {TIPOS_MOVIMIENTO_LINEA.map((tipo) => (
                          <option key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                        Límite actual
                      </label>

                      <input
                        type="text"
                        disabled
                        value={`$${limiteActualLinea.toLocaleString("es-MX")}`}
                        className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-100 border rounded-xl md:rounded-md font-bold text-gray-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                      {obtenerEtiquetaMontoLinea(lineaCreditoForm.tipo_movimiento)}
                    </label>

                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black">
                        $
                      </span>

                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={lineaCreditoForm.nuevo_limite}
                        onChange={(e) =>
                          setLineaCreditoForm({
                            ...lineaCreditoForm,
                            nuevo_limite: e.target.value,
                          })
                        }
                        placeholder={
                          lineaCreditoForm.tipo_movimiento === "AUMENTO"
                            ? "Ej. 1000 para sumar a la línea actual"
                            : lineaCreditoForm.tipo_movimiento === "DISMINUCION"
                              ? "Ej. 1000 para restar a la línea actual"
                              : "Ej. 3000 como límite final correcto"
                        }
                        className="w-full pl-8 pr-4 py-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md focus:ring-2 focus:ring-[#ffd700] outline-none font-black text-[#0a192f]"
                      />
                    </div>

                    <p className="mt-1 text-[10px] text-gray-500">
                      {obtenerDescripcionMontoLinea(lineaCreditoForm.tipo_movimiento)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-wide text-blue-500">
                      Resultado
                    </p>

                    <p className="mt-1 text-xl font-black text-[#0a192f]">
                      $
                      {Number.isFinite(nuevoLimitePreview)
                        ? nuevoLimitePreview.toLocaleString("es-MX")
                        : "0"}
                    </p>

                    {movimientoLineaInvalidoPorDeuda && (
                      <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700">
                        El límite resultante no puede quedar por debajo de la deuda actual.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                      Personal que autoriza
                    </label>

                    <input
                      type="text"
                      required
                      value={lineaCreditoForm.personal_autoriza}
                      onChange={(e) =>
                        setLineaCreditoForm({
                          ...lineaCreditoForm,
                          personal_autoriza: e.target.value,
                        })
                      }
                      placeholder="Ej. Lic. Flor"
                      className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md focus:ring-2 focus:ring-[#ffd700] outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                      Motivo / comentario de respaldo
                    </label>

                    <textarea
                      required
                      value={lineaCreditoForm.motivo}
                      onChange={(e) =>
                        setLineaCreditoForm({
                          ...lineaCreditoForm,
                          motivo: e.target.value,
                        })
                      }
                      rows="3"
                      placeholder="Indica por qué se registra este cambio y quién lo autorizó."
                      className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md resize-none focus:ring-2 focus:ring-[#ffd700] outline-none"
                    />
                  </div>

                  <div className="pt-4 md:border-t flex flex-col-reverse md:flex-row justify-end gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={cerrarModal}
                      disabled={procesandoCredito}
                      className="w-full md:w-auto px-4 py-3.5 md:py-2 text-sm md:text-xs font-bold text-gray-700 bg-white border rounded-xl md:rounded-lg active:bg-gray-100 disabled:opacity-50"
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      disabled={procesandoCredito || movimientoLineaInvalidoPorDeuda}
                      className="w-full md:w-auto px-5 py-3.5 md:py-2 text-sm md:text-xs font-black text-[#0a192f] bg-[#ffd700] rounded-xl md:rounded-lg active:bg-[#e6c200] flex items-center justify-center disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1.5" />
                      {procesandoCredito ? "Registrando..." : "Registrar movimiento"}
                    </button>
                  </div>
                </form>
              )}

              {modalActivo === "notificacion" && (
                <div className="text-center py-4 md:py-2 animate-fade-in">
                  <div
                    className={`h-16 w-16 md:h-14 md:w-14 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-3 ring-4 ${notificacion.tipo === "error" ? "bg-red-100 ring-red-50 text-red-600" : "bg-green-100 ring-green-50 text-green-600"}`}
                  >
                    {notificacion.tipo === "error" ? (
                      <XCircle className="h-8 w-8 md:h-7 md:w-7" />
                    ) : (
                      <CheckCircle className="h-8 w-8 md:h-7 md:w-7" />
                    )}
                  </div>
                  <h3 className="text-xl md:text-lg font-black text-[#0a192f] mb-2 md:mb-1">
                    {notificacion.titulo}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed px-2">
                    {notificacion.descripcion}
                  </p>
                </div>
              )}
            </div>

            {modalActivo !== "registrarLineaCredito" && (
              <div className="p-4 md:p-4 border-t border-gray-100 bg-white md:bg-gray-50 flex flex-col-reverse md:flex-row justify-end gap-3 md:gap-3 rounded-b-xl shrink-0">
                {modalActivo === "notificacion" ? (
                  <button
                    onClick={cerrarModal}
                    className={`w-full md:w-auto px-6 py-3.5 md:py-2 text-sm md:text-xs font-black text-white rounded-xl md:rounded-lg active:opacity-80 transition-colors ${notificacion.tipo === "error" ? "bg-red-600" : "bg-green-600"}`}
                  >
                    Aceptar
                  </button>
                ) : modalActivo === "editarCliente" ? (
                  <>
                    <button
                      type="button"
                      onClick={cerrarModal}
                      className="w-full md:w-auto px-4 py-3.5 md:py-2 text-sm md:text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-xl md:rounded-lg active:bg-gray-100"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      form="formEditarCliente"
                      className="w-full md:w-auto px-8 py-3.5 md:py-2 text-sm md:text-xs font-black text-[#0a192f] bg-[#ffd700] rounded-xl md:rounded-lg active:bg-[#e6c200]"
                    >
                      Guardar
                    </button>
                  </>
                ) : modalActivo === "verFactura" && facturaSeleccionada ? (
                  <button
                    type="button"
                    onClick={() =>
                      navigate("/facturas", {
                        state: { editarFactura: facturaSeleccionada },
                      })
                    }
                    className="w-full md:w-auto px-8 py-3.5 md:py-2 bg-amber-50 text-amber-700 border border-amber-200 font-black text-sm md:text-xs rounded-xl md:rounded-lg hover:bg-amber-100 active:bg-amber-100"
                  >
                    Editar esta factura
                  </button>
                ) : (
                  <button
                    onClick={cerrarModal}
                    className="w-full md:w-auto px-8 py-3.5 md:py-2 bg-gray-100 md:bg-[#0a192f] text-gray-800 md:text-white font-black text-sm md:text-xs rounded-xl md:rounded-lg active:bg-gray-200"
                  >
                    Cerrar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
</file>

<file path="src/pages/Facturacion.jsx">
import { useState, useMemo, useContext, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GlobalContext } from "../context/GlobalContext";
import { useFacturas } from "../hooks/useFacturas";
import { useFacturasPaginadas } from "../hooks/useFacturasPaginadas";
import PaginacionGlobal from "../components/ui/PaginacionGlobal";
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
  Loader2,
  RefreshCw,
  UserRound,
  Hash,
  X,
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

const normalizarTextoBusqueda = (valor = "") =>
  valor
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const obtenerTodasNotasCredito = (factura = {}) =>
  Array.isArray(factura.notas_credito) ? factura.notas_credito : [];

const obtenerNotasCredito = (factura = {}) =>
  obtenerTodasNotasCredito(factura).filter(
    (nota) => nota.cancelada !== true && nota.estado !== "Cancelada" && nota.estado !== "Anulada",
  );

const obtenerTiempoItemNota = (item = {}) => {
  const fechaBase =
    item.fecha_anulacion?.toDate?.().getTime?.() ||
    item.anuladaAt?.toDate?.().getTime?.() ||
    item.fecha?.toDate?.().getTime?.() ||
    item.createdAt?.toDate?.().getTime?.() ||
    item.resolvedAt?.toDate?.().getTime?.() ||
    new Date(item.fechaTexto || item.fecha || 0).getTime();

  return Number.isFinite(fechaBase) ? fechaBase : 0;
};

const obtenerTotalNotasCredito = (factura = {}) => {
  const totalGuardado = Number(factura.total_notas_credito);

  if (Number.isFinite(totalGuardado) && totalGuardado > 0) {
    return totalGuardado;
  }

  return obtenerNotasCredito(factura).reduce(
    (total, nota) => total + (Number(nota.monto) || 0),
    0,
  );
};

const obtenerMontoPagadoSeguro = (factura = {}) => {
  const montoPagadoGuardado = Number(factura.monto_pagado);

  if (Number.isFinite(montoPagadoGuardado)) {
    return montoPagadoGuardado;
  }

  const montoTotal = Number(factura.monto_total) || 0;
  const saldoPendiente = Number(factura.saldo_pendiente) || 0;
  const totalNotasCredito = obtenerTotalNotasCredito(factura);

  return Math.max(0, montoTotal - saldoPendiente - totalNotasCredito);
};

const formatearFechaNotaCredito = (fecha) => {
  if (!fecha) return "Sin fecha";

  if (fecha?.toDate && typeof fecha.toDate === "function") {
    return fecha.toDate().toLocaleString("es-MX");
  }

  if (typeof fecha === "string") return fecha;

  return "Sin fecha";
};

const formatearFechaAbono = (fecha) => {
  if (!fecha) return "Sin fecha";

  if (fecha?.toDate && typeof fecha.toDate === "function") {
    return fecha.toDate().toLocaleString("es-MX");
  }

  if (fecha instanceof Date) {
    return fecha.toLocaleString("es-MX");
  }

  if (typeof fecha === "object" && typeof fecha.seconds === "number") {
    return new Date(fecha.seconds * 1000).toLocaleString("es-MX");
  }

  if (typeof fecha === "object" && typeof fecha._seconds === "number") {
    return new Date(fecha._seconds * 1000).toLocaleString("es-MX");
  }

  if (typeof fecha === "string") {
    return fecha;
  }

  return "Sin fecha";
};

const obtenerTiempoAbono = (abono = {}) => {
  const tiempo =
    abono.fecha?.toDate?.().getTime?.() ||
    (abono.fecha instanceof Date ? abono.fecha.getTime() : 0) ||
    (typeof abono.fecha === "object" && typeof abono.fecha?.seconds === "number"
      ? abono.fecha.seconds * 1000
      : 0) ||
    new Date(abono.fecha || 0).getTime();

  return Number.isFinite(tiempo) ? tiempo : 0;
};

const normalizarEstatusNotaCredito = (estatus = "") => {
  const valor = String(estatus || "Pendiente").toLowerCase();

  if (["anulada", "anulado", "cancelada", "cancelado"].includes(valor)) {
    return "Anulada";
  }

  if (["autorizado", "autorizada", "aprobado", "aprobada", "activa"].includes(valor)) {
    return "Autorizada";
  }

  if (["rechazado", "rechazada"].includes(valor)) {
    return "Rechazada";
  }

  return "Pendiente";
};

const obtenerEstiloNotaCredito = (estatus) => {
  const normalizado = normalizarEstatusNotaCredito(estatus);

  if (normalizado === "Anulada") {
    return {
      texto: "text-slate-600",
      etiqueta: "bg-slate-100 text-slate-700 border-slate-200",
      borde: "border-slate-200",
      fondo: "bg-slate-50",
    };
  }

  if (normalizado === "Autorizada") {
    return {
      texto: "text-green-700",
      etiqueta: "bg-green-50 text-green-700 border-green-200",
      borde: "border-green-100",
      fondo: "bg-green-50/30",
    };
  }

  if (normalizado === "Rechazada") {
    return {
      texto: "text-red-600",
      etiqueta: "bg-red-50 text-red-600 border-red-200",
      borde: "border-red-100",
      fondo: "bg-red-50/30",
    };
  }

  return {
    texto: "text-blue-700",
    etiqueta: "bg-blue-50 text-blue-700 border-blue-200",
    borde: "border-blue-100",
    fondo: "bg-blue-50/30",
  };
};

const tieneValorNumerico = (valor) => {
  const numero = Number(valor);

  return Number.isFinite(numero) && numero >= 0;
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

function TarjetaResumenFacturacion({
  etiqueta,
  valor,
  descripcion,
  icono: Icono,
  variante = "azul",
}) {
  const estilos = {
    azul: {
      tarjeta: "border-blue-200 bg-blue-50/40",
      etiqueta: "text-blue-700",
      valor: "text-[#0a192f]",
      icono: "bg-white/80 text-blue-600 border-blue-100",
    },
    rojo: {
      tarjeta: "border-red-200 bg-red-50/40",
      etiqueta: "text-red-700",
      valor: "text-red-600",
      icono: "bg-white/80 text-red-600 border-red-100",
    },
    verde: {
      tarjeta: "border-green-200 bg-green-50/40",
      etiqueta: "text-green-700",
      valor: "text-green-700",
      icono: "bg-white/80 text-green-600 border-green-100",
    },
  };

  const configuracion = estilos[variante] || estilos.azul;

  return (
    <article
      className={`p-4 md:p-5 rounded-xl border text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${configuracion.tarjeta}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`text-[10px] md:text-xs uppercase font-black tracking-wide ${configuracion.etiqueta}`}
          >
            {etiqueta}
          </p>
          <strong
            className={`text-xl md:text-3xl mt-2 block break-words ${configuracion.valor}`}
          >
            {valor}
          </strong>
        </div>

        <span
          className={`h-9 w-9 md:h-10 md:w-10 rounded-xl border flex items-center justify-center shrink-0 ${configuracion.icono}`}
        >
          <Icono className="h-4 w-4 md:h-5 md:w-5" />
        </span>
      </div>

      <p className="text-[10px] md:text-xs text-gray-500 mt-2 leading-relaxed">
        {descripcion}
      </p>
    </article>
  );
}

export default function Facturacion() {
  const {
    stats,
    userRole,
    clientes,
    crearFacturaEnNube,
    modificarFacturaEnNube,
    eliminarFacturaEnNube,
    registrarAbonoEnNube,
    eliminarAbonoEnNube,
    aplicarNotaCreditoEnNube,
    solicitarNotaCreditoEnNube,
    cancelarNotaCreditoEnNube,
    solicitudesNotasCredito,
  } = useContext(GlobalContext);

  const location = useLocation();
  const navigate = useNavigate();

  const parametrosURL = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const estadoSolicitado = parametrosURL.get("estado");
  const filtroEstatusInicial = [
    "Todas",
    "Pendiente",
    "Vencida",
    "Pagada",
  ].includes(estadoSolicitado)
    ? estadoSolicitado
    : "Todas";

  const facturaInicialEdicion = location.state?.editarFactura || null;
  const facturaInicialGestion = location.state?.gestionarFactura || null;
  const facturaInicial = facturaInicialGestion || facturaInicialEdicion;

  const {
    busqueda,
    setBusqueda,
    busquedaAplicada,
    aplicarBusqueda,
    limpiarBusquedaAplicada,
    limpiarBusqueda,
    filtroEstatus,
    setFiltroEstatus,
    fechaInicio,
    setFechaInicio,
    fechaFin,
    setFechaFin,
    kpis,
    limpiarFiltros,
  } = useFacturas(stats, { filtroEstatusInicial });

  const [clienteBusqueda, setClienteBusqueda] = useState(null);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const contenedorTablaRef = useRef(null);
  const historialNotasRef = useRef(null);
  const historialAbonosRef = useRef(null);
  const paginaRenderizadaRef = useRef(1);

  const {
    facturas: facturasPaginadas,
    cargando: cargandoFacturas,
    error: errorFacturas,
    mensaje: mensajeFacturas,
    pagina: paginaActualFacturas,
    hayAnterior,
    haySiguiente,
    siguientePagina,
    paginaAnterior,
    recargar: recargarFacturas,
  } = useFacturasPaginadas({
    pageSize: FACTURAS_POR_PAGINA,
    busqueda: busquedaAplicada,
    clienteId: clienteBusqueda?.id || "",
    filtroEstatus,
    fechaInicio,
    fechaFin,
  });

  const [modalActivo, setModalActivo] = useState(() => {
    if (facturaInicialGestion) return "opcionesFactura";
    if (facturaInicialEdicion) return "editarFactura";
    return null;
  });
  const [facturaSeleccionada, setFacturaSeleccionada] =
    useState(facturaInicial);
  const [notificacion, setNotificacion] = useState({
    titulo: "",
    descripcion: "",
    tipo: "exito",
  });

  const [invoiceForm, setInvoiceForm] = useState(() =>
    crearFormularioFactura(facturaInicialEdicion),
  );

  const [pagoForm, setPagoForm] = useState({ monto: "", metodo: "Efectivo" });
  const [notaCreditoForm, setNotaCreditoForm] = useState({
    monto: "",
    motivo: "",
    observaciones: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemAEliminar, setItemAEliminar] = useState(null);
  const [notaCreditoACancelar, setNotaCreditoACancelar] = useState(null);
  const [paginaHistorialNotas, setPaginaHistorialNotas] = useState(1);
  const registrosPorPaginaNotas = 5;
  const [paginaHistorialAbonos, setPaginaHistorialAbonos] = useState(1);
  const registrosPorPaginaAbonos = 5;
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

  const clientesSugeridos = useMemo(() => {
    const texto = normalizarTextoBusqueda(busqueda);

    if (texto.length < 2 || clienteBusqueda) {
      return [];
    }

    return (clientes || [])
      .filter(
        (cliente) => cliente.activo !== false && cliente.estatus !== "Inactivo",
      )
      .filter((cliente) => {
        const nombre = normalizarTextoBusqueda(cliente.nombre);
        const numero = normalizarTextoBusqueda(cliente.numero_cliente);
        const rfc = normalizarTextoBusqueda(cliente.rfc);

        return (
          nombre.includes(texto) ||
          numero.includes(texto) ||
          rfc.includes(texto)
        );
      })
      .sort((a, b) =>
        (a.nombre || "").localeCompare(b.nombre || "", "es", {
          sensitivity: "base",
        }),
      )
      .slice(0, 8);
  }, [busqueda, clienteBusqueda, clientes]);

  useLayoutEffect(() => {
    if (cargandoFacturas) return;

    if (paginaRenderizadaRef.current === paginaActualFacturas) {
      return;
    }

    paginaRenderizadaRef.current = paginaActualFacturas;

    const contenedor = contenedorTablaRef.current;

    if (!contenedor) return;

    contenedor.scrollTop = 0;
    contenedor.scrollLeft = 0;
  }, [paginaActualFacturas, cargandoFacturas]);

  const moverAInicioTabla = () => {
    const contenedor = contenedorTablaRef.current;

    if (!contenedor) return;

    window.requestAnimationFrame(() => {
      contenedor.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
    });
  };

  const handleCambioBusqueda = (valor) => {
    setBusqueda(valor);
    limpiarBusquedaAplicada();

    if (clienteBusqueda && valor !== clienteBusqueda.nombre) {
      setClienteBusqueda(null);
    }

    setMostrarSugerencias(valor.trim().length >= 2);
  };

  const seleccionarClienteBusqueda = (cliente) => {
    setClienteBusqueda(cliente);
    setBusqueda(cliente.nombre || "");
    limpiarBusquedaAplicada();
    setMostrarSugerencias(false);
    moverAInicioTabla();
  };

  const buscarPorFolio = () => {
    const folio = busqueda.trim();

    if (!folio) {
      setClienteBusqueda(null);
      limpiarBusqueda();
      setMostrarSugerencias(false);
      return;
    }

    setClienteBusqueda(null);
    aplicarBusqueda();
    setMostrarSugerencias(false);
    moverAInicioTabla();
  };

  const limpiarBusquedaCompleta = () => {
    setClienteBusqueda(null);
    limpiarBusqueda();
    setMostrarSugerencias(false);
    moverAInicioTabla();
  };

  const limpiarTodosLosFiltros = () => {
    setClienteBusqueda(null);
    limpiarFiltros();
    setMostrarSugerencias(false);
    moverAInicioTabla();
  };

  const abrirMenuOpciones = (factura) => {
    setFacturaSeleccionada(factura);
    setModalActivo("opcionesFactura");
  };

  const abrirFormulario = (tipo) => {
    if (tipo === "nuevoPago") setPagoForm({ monto: "", metodo: "Efectivo" });
    else if (tipo === "notaCredito") {
      setNotaCreditoForm({ monto: "", motivo: "", observaciones: "" });
    } else if (tipo === "historialNotasCredito") {
      setPaginaHistorialNotas(1);
    } else if (tipo === "historialPagos") {
      setPaginaHistorialAbonos(1);
    } else if (tipo === "whatsapp") {
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

    if (location.state?.editarFactura || location.state?.gestionarFactura) {
      navigate(`${location.pathname}${location.search}`, {
        replace: true,
        state: null,
      });
    }
    if (
      [
        "notificacion",
        "opcionesFactura",
        "confirmarEliminar",
        "whatsapp",
        "notaCredito",
        "historialNotasCredito",
        "confirmarCancelarNotaCredito",
      ].includes(modalActivo)
    ) {
      setFacturaSeleccionada(null);
      setItemAEliminar(null);
      setNotaCreditoACancelar(null);
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

        await recargarFacturas();

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

        await recargarFacturas();

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
        await recargarFacturas();
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

  const handleMontoNotaCredito = (event) => {
    const valor = parseFloat(event.target.value);
    const maximo = Number(facturaSeleccionada?.saldo_pendiente) || 0;

    if (valor > maximo) {
      setNotaCreditoForm((previo) => ({
        ...previo,
        monto: maximo,
      }));
      return;
    }

    setNotaCreditoForm((previo) => ({
      ...previo,
      monto: event.target.value,
    }));
  };

  const obtenerSolicitudesNotasFactura = (factura = {}) =>
    (solicitudesNotasCredito || []).filter(
      (solicitud) => solicitud.factura_id === factura.id,
    );

  const obtenerHistorialNotasCredito = (factura = {}) => {
    const notasAplicadas = obtenerTodasNotasCredito(factura);
    const solicitudesFactura = obtenerSolicitudesNotasFactura(factura);

    const notasUsadas = new Set();

    const historialSolicitudes = solicitudesFactura.map((solicitud) => {
      const notaRelacionada = notasAplicadas.find(
        (nota) =>
          nota.solicitud_nota_id === solicitud.id ||
          nota.id_nota === solicitud.nota_credito_id,
      );

      if (notaRelacionada?.id_nota) {
        notasUsadas.add(notaRelacionada.id_nota);
      }

      const estatus =
        notaRelacionada?.cancelada || ["Anulada", "Cancelada"].includes(notaRelacionada?.estado)
          ? "Anulada"
          : normalizarEstatusNotaCredito(solicitud.estatus);

      if (
        estatus === "Autorizada" &&
        solicitud.nota_credito_id &&
        !notaRelacionada
      ) {
        return null;
      }

      return {
        ...solicitud,
        ...notaRelacionada,
        id: solicitud.id,
        id_nota: notaRelacionada?.id_nota || solicitud.nota_credito_id || "",
        tipo_historial: "SOLICITUD_NOTA",
        estatus_historial: estatus,
        monto:
          Number(solicitud.monto_nota) ||
          Number(notaRelacionada?.monto) ||
          0,
        motivo: solicitud.motivo || notaRelacionada?.motivo || "Sin motivo",
        observaciones:
          solicitud.observaciones || notaRelacionada?.observaciones || "",
        fechaTexto:
          solicitud.fecha ||
          formatearFechaNotaCredito(
            solicitud.anuladaAt ||
              solicitud.resolvedAt ||
              solicitud.createdAt ||
              notaRelacionada?.fecha_anulacion ||
              notaRelacionada?.fecha,
          ),
        fechaOrden:
          solicitud.anuladaAt ||
          solicitud.resolvedAt ||
          solicitud.createdAt ||
          notaRelacionada?.fecha_anulacion ||
          notaRelacionada?.fecha,
        solicitado_por_nombre:
          solicitud.solicitado_por_nombre || "ADMIN",
        aplicado_por:
          notaRelacionada?.aplicado_por || solicitud.resolvedBy || "SU",
        esDirecta: false,
      };
    }).filter(Boolean);

    const historialDirectas = notasAplicadas
      .filter((nota) => !notasUsadas.has(nota.id_nota))
      .map((nota) => ({
        ...nota,
        tipo_historial: "NOTA_DIRECTA",
        estatus_historial:
          nota.cancelada || ["Anulada", "Cancelada"].includes(nota.estado)
            ? "Anulada"
            : "Autorizada",
        fechaTexto: formatearFechaNotaCredito(nota.fecha_anulacion || nota.fecha),
        fechaOrden: nota.fecha_anulacion || nota.fecha,
        monto: Number(nota.monto) || 0,
        motivo: nota.motivo || "Sin motivo",
        aplicado_por: nota.aplicado_por || "SU",
        esDirecta: true,
      }));

    return [...historialSolicitudes, ...historialDirectas].sort(
      (primera, segunda) =>
        obtenerTiempoItemNota(segunda.fechaOrden ? { ...segunda, fecha: segunda.fechaOrden } : segunda) -
        obtenerTiempoItemNota(primera.fechaOrden ? { ...primera, fecha: primera.fechaOrden } : primera),
    );
  };

  const historialNotasCredito = obtenerHistorialNotasCredito(
    facturaSeleccionada || {},
  );

  const totalPaginasNotas = Math.max(
    1,
    Math.ceil(historialNotasCredito.length / registrosPorPaginaNotas),
  );

  const historialNotasPaginado = historialNotasCredito.slice(
    (paginaHistorialNotas - 1) * registrosPorPaginaNotas,
    paginaHistorialNotas * registrosPorPaginaNotas,
  );

  const historialAbonosOrdenado = Array.isArray(facturaSeleccionada?.abonos)
    ? [...facturaSeleccionada.abonos].sort(
        (primero, segundo) =>
          obtenerTiempoAbono(segundo) - obtenerTiempoAbono(primero),
      )
    : [];

  const totalPaginasAbonos = Math.max(
    1,
    Math.ceil(historialAbonosOrdenado.length / registrosPorPaginaAbonos),
  );

  const historialAbonosPaginado = historialAbonosOrdenado.slice(
    (paginaHistorialAbonos - 1) * registrosPorPaginaAbonos,
    paginaHistorialAbonos * registrosPorPaginaAbonos,
  );

  const handleAplicarNotaCredito = async () => {
    if (isSubmitting) return;

    const monto = Number(notaCreditoForm.monto);
    const saldoActual = Number(facturaSeleccionada?.saldo_pendiente) || 0;

    if (!Number.isFinite(monto) || monto <= 0) {
      mostrarNotificacion(
        "Monto inválido",
        "Ingresa un monto mayor a cero.",
        "error",
      );
      return;
    }

    if (monto > saldoActual) {
      mostrarNotificacion(
        "Monto excedido",
        "La nota de crédito no puede superar el saldo pendiente.",
        "error",
      );
      return;
    }

    if (!notaCreditoForm.motivo.trim()) {
      mostrarNotificacion(
        "Motivo requerido",
        "Ingresa el motivo de la nota de crédito.",
        "error",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const respuesta =
        userRole === "SU"
          ? await aplicarNotaCreditoEnNube(
              facturaSeleccionada,
              monto,
              notaCreditoForm.motivo,
              notaCreditoForm.observaciones,
            )
          : await solicitarNotaCreditoEnNube(
              facturaSeleccionada,
              monto,
              notaCreditoForm.motivo,
              notaCreditoForm.observaciones,
            );

      if (!respuesta?.success) {
        mostrarNotificacion(
          "Error",
          respuesta?.error ||
            (userRole === "SU"
              ? "No se pudo aplicar la nota de crédito."
              : "No se pudo solicitar la nota de crédito."),
          "error",
        );
        return;
      }

      await recargarFacturas();
      setNotaCreditoForm({ monto: "", motivo: "", observaciones: "" });
      setFacturaSeleccionada(null);

      mostrarNotificacion(
        userRole === "SU" ? "Nota de crédito aplicada" : "Solicitud enviada",
        userRole === "SU"
          ? "Se redujo el saldo de la factura, el saldo del cliente y la cartera correspondiente. No se registró como ingreso."
          : "La solicitud de nota de crédito quedó pendiente de autorización del SU.",
      );
    } catch (error) {
      console.error("Error procesando nota de crédito:", error);
      mostrarNotificacion(
        "Error",
        "Ocurrió un error inesperado al procesar la nota de crédito.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelarNotaCredito = async () => {
    if (isSubmitting) return;

    if (userRole !== "SU") {
      mostrarNotificacion(
        "Acción no permitida",
        "Solo el SU puede cancelar notas de crédito.",
        "error",
      );
      return;
    }

    if (!facturaSeleccionada?.id || !notaCreditoACancelar?.id_nota) {
      mostrarNotificacion(
        "Error",
        "No se identificó la factura o la nota de crédito.",
        "error",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const respuesta = await cancelarNotaCreditoEnNube(
        facturaSeleccionada,
        notaCreditoACancelar.id_nota,
        "Cancelación manual desde gestión de factura",
      );

      if (!respuesta?.success) {
        mostrarNotificacion(
          "Error",
          respuesta?.error || "No se pudo cancelar la nota de crédito.",
          "error",
        );
        return;
      }

      await recargarFacturas();
      setNotaCreditoACancelar(null);
      setFacturaSeleccionada(null);

      mostrarNotificacion(
        "Nota de crédito anulada",
        "Se restauró el saldo y la nota quedó marcada como anulada en el historial.",
      );
    } catch (error) {
      console.error("Error anulando nota de crédito:", error);
      mostrarNotificacion(
        "Error",
        "Ocurrió un error inesperado al anular la nota de crédito.",
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
    if (!itemAEliminar || isSubmitting) return;

    setIsSubmitting(true);

    try {
      if (itemAEliminar.tipo === "factura") {
        if (userRole !== "SU") {
          mostrarNotificacion(
            "Acción no permitida",
            "Solo el SU puede eliminar facturas.",
            "error",
          );
          return;
        }

        const res = await eliminarFacturaEnNube(itemAEliminar.data.id);

        if (!res?.success) {
          mostrarNotificacion(
            "Error",
            res?.error || "No se pudo eliminar la factura.",
            "error",
          );
          return;
        }

        await recargarFacturas();

        setFacturaSeleccionada(null);

        mostrarNotificacion(
          "Factura eliminada",
          "Se eliminó la factura y se ajustaron saldo, crédito, métricas y auditoría.",
        );
      } else if (itemAEliminar.tipo === "abono") {
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

        await recargarFacturas();

        mostrarNotificacion(
          "Pago anulado",
          "Abono revertido. La deuda regresó al saldo del cliente.",
        );
      }
    } catch (error) {
      console.error(error);
      mostrarNotificacion("Error", "Ocurrió un error inesperado.", "error");
    } finally {
      setIsSubmitting(false);
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
            Control integral de facturas emitidas, saldos pendientes y pagos con
            carga paginada y operaciones seguras.
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
        <TarjetaResumenFacturacion
          etiqueta="Deuda activa"
          valor={`$${kpis.deuda_activa.toLocaleString("es-MX")}`}
          descripcion="Saldo total pendiente actualmente colocado."
          icono={DollarSign}
          variante="azul"
        />

        <TarjetaResumenFacturacion
          etiqueta="Saldo vencido"
          valor={`$${kpis.monto_vencido.toLocaleString("es-MX")}`}
          descripcion="Cartera vencida que requiere seguimiento."
          icono={AlertTriangle}
          variante="rojo"
        />

        <TarjetaResumenFacturacion
          etiqueta="Total liquidado"
          valor={`$${(Number(kpis.total_liquidado) || 0).toLocaleString("es-MX")}`}
          descripcion="Facturas cerradas mediante pagos registrados."
          icono={TrendingUp}
          variante="verde"
        />
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
          <div className="relative w-full md:max-w-xl">
            <div className="flex w-full">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 md:h-4 md:w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Escribe un cliente o el inicio del folio..."
                  value={busqueda}
                  onChange={(e) => handleCambioBusqueda(e.target.value)}
                  onFocus={() =>
                    setMostrarSugerencias(
                      busqueda.trim().length >= 2 && !clienteBusqueda,
                    )
                  }
                  onBlur={() =>
                    window.setTimeout(() => setMostrarSugerencias(false), 150)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !clienteBusqueda) {
                      e.preventDefault();
                      buscarPorFolio();
                    }
                  }}
                  className="w-full pl-10 pr-10 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-l-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                />

                {(busqueda || clienteBusqueda) && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={limpiarBusquedaCompleta}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-500 rounded"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={buscarPorFolio}
                disabled={Boolean(clienteBusqueda)}
                className="px-4 py-2.5 bg-[#0a192f] text-white text-xs font-black rounded-r-lg hover:bg-[#112240] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center shrink-0"
                title={
                  clienteBusqueda
                    ? "Quita el cliente seleccionado para buscar por folio"
                    : "Buscar folio por inicio"
                }
              >
                <Search className="h-4 w-4 mr-1.5" />
                Buscar
              </button>
            </div>

            {clienteBusqueda && (
              <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-700">
                <UserRound className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{clienteBusqueda.nombre}</span>
                <button
                  type="button"
                  onClick={limpiarBusquedaCompleta}
                  className="text-blue-400 hover:text-red-500"
                  aria-label="Quitar cliente seleccionado"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {mostrarSugerencias && !clienteBusqueda && (
              <div className="absolute left-0 right-0 top-full mt-2 z-30 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                {clientesSugeridos.length > 0 ? (
                  <>
                    <p className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gray-400 bg-gray-50 border-b">
                      Clientes encontrados
                    </p>
                    {clientesSugeridos.map((cliente) => (
                      <button
                        key={cliente.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => seleccionarClienteBusqueda(cliente)}
                        className="w-full px-3 py-2.5 text-left hover:bg-blue-50 border-b border-gray-50 last:border-0 flex items-center gap-3"
                      >
                        <UserRound className="h-4 w-4 text-blue-500 shrink-0" />
                        <span className="min-w-0">
                          <span className="block text-xs font-bold text-[#0a192f] truncate">
                            {cliente.nombre}
                          </span>
                          <span className="block text-[10px] text-gray-400 truncate">
                            {cliente.numero_cliente || "Sin número"}
                            {cliente.rfc ? ` • ${cliente.rfc}` : ""}
                          </span>
                        </span>
                      </button>
                    ))}
                  </>
                ) : (
                  <p className="px-3 py-3 text-xs text-gray-500">
                    No hay clientes coincidentes. Puedes buscar el texto como
                    inicio de folio.
                  </p>
                )}

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={buscarPorFolio}
                  className="w-full px-3 py-3 bg-gray-50 text-left text-xs font-bold text-blue-700 hover:bg-blue-50 flex items-center"
                >
                  <Hash className="h-4 w-4 mr-2" />
                  Buscar folios que comiencen con “
                  {busqueda.trim().toUpperCase()}”
                </button>
              </div>
            )}

            <p className="mt-2 text-[10px] text-gray-400 leading-relaxed">
              Selecciona un cliente sugerido sin escribir su nombre completo, o
              escribe el inicio del folio y presiona Enter.
            </p>
          </div>
          <div className="flex overflow-x-auto hide-scrollbar-mobile w-full md:w-auto bg-gray-50 p-1.5 md:p-1 rounded-xl md:rounded-lg border border-gray-200 gap-1 md:gap-0 shrink-0">
            {[
              { value: "Todas", label: "Todas" },
              { value: "Pendiente", label: "Pendientes" },
              { value: "Vencida", label: "Vencidas" },
              { value: "Pagada", label: "Pagadas" },
            ].map((opcion) => (
              <button
                key={opcion.value}
                onClick={() => {
                  setFiltroEstatus(opcion.value);
                  moverAInicioTabla();
                }}
                className={`whitespace-nowrap px-4 py-2 md:py-1.5 text-xs font-bold rounded-lg md:rounded-md transition-colors flex-1 md:flex-none ${filtroEstatus === opcion.value ? "bg-white text-[#0a192f] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                {opcion.label}
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
                moverAInicioTabla();
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
                moverAInicioTabla();
              }}
              className="flex-1 sm:flex-none px-3 md:px-2 py-2.5 md:py-1.5 border border-gray-200 rounded-lg md:rounded text-xs focus:ring-2 focus:ring-blue-500 text-gray-600 outline-none"
            />
          </div>
          {(fechaInicio ||
            fechaFin ||
            busqueda ||
            clienteBusqueda ||
            filtroEstatus !== "Todas") && (
            <button
              onClick={limpiarTodosLosFiltros}
              className="flex items-center justify-center px-4 md:px-3 py-3 md:py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors w-full sm:w-auto mt-2 sm:mt-0"
            >
              <FilterX className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1.5 md:mr-1" />{" "}
              Limpiar Filtros
            </button>
          )}

          <button
            type="button"
            onClick={recargarFacturas}
            disabled={cargandoFacturas}
            className="flex items-center justify-center px-4 md:px-3 py-3 md:py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors w-full sm:w-auto mt-2 sm:mt-0"
          >
            {cargandoFacturas ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1.5" />
            )}
            Actualizar
          </button>
        </div>

        {(mensajeFacturas || errorFacturas) && (
          <div
            className={`rounded-lg border px-3 py-2 text-xs font-medium ${
              errorFacturas
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {errorFacturas || mensajeFacturas}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col flex-1 overflow-hidden">
        <div
          ref={contenedorTablaRef}
          className="overflow-y-auto max-h-[calc(100dvh-280px)] pb-20 custom-scrollbar w-full md:max-h-[calc(100vh-350px)]"
        >
          <div className="space-y-3 p-3 md:hidden">
            {cargandoFacturas ? (
              Array.from({ length: 5 }).map((_, indice) => (
                <article
                  key={`factura-mobile-skeleton-${indice}`}
                  className="animate-pulse rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
                >
                  <div className="h-4 w-32 rounded bg-gray-100" />
                  <div className="mt-2 h-3 w-48 rounded bg-gray-100" />
                  <div className="mt-3 grid grid-cols-3 gap-1.5">
                    <div className="h-14 rounded-lg bg-gray-100" />
                    <div className="h-14 rounded-lg bg-gray-100" />
                    <div className="h-14 rounded-lg bg-gray-100" />
                  </div>
                </article>
              ))
            ) : errorFacturas ? (
              <div className="rounded-xl border border-red-100 bg-red-50 p-5 text-center text-red-700">
                <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-red-300" />
                <p className="text-xs font-black">No se pudieron cargar las facturas.</p>
                <p className="mt-1 text-[11px] font-semibold">{errorFacturas}</p>
              </div>
            ) : facturasPaginadas.length > 0 ? (
              facturasPaginadas.map((fac) => {
                const montoTotal = Number(fac.monto_total) || 0;
                const saldoPendiente = Number(fac.saldo_pendiente) || 0;
                const montoPagado = obtenerMontoPagadoSeguro(fac);
                const totalNotas = obtenerTotalNotasCredito(fac);
                const estaVencida = fac.estatus === "Vencida";

                return (
                  <article
                    key={fac.id}
                    className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-wide text-blue-500">
                          Folio
                        </p>
                        <p className="truncate font-mono text-base font-black text-[#0a192f]">
                          {fac.folio || "S/F"}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs font-black uppercase leading-tight text-gray-600">
                          {fac.cliente || "Cliente sin nombre"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => abrirMenuOpciones(fac)}
                        className="shrink-0 rounded-lg bg-gray-50 p-2 text-gray-500 active:bg-gray-200"
                        aria-label="Opciones de factura"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <BadgeEstatus estatus={fac.estatus} />
                      {estaVencida && (
                        <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[9px] font-black text-red-700">
                          Hace {calcularDiasVencidos(fac.vencimiento)} días
                        </span>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-1.5">
                      <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-2 min-w-0">
                        <p className="text-[7px] font-black uppercase tracking-wide text-blue-400">
                          Total
                        </p>
                        <p className="mt-0.5 break-words text-[11px] font-black text-[#0a192f]">
                          ${montoTotal.toLocaleString("es-MX")}
                        </p>
                      </div>

                      <div className="rounded-lg border border-green-100 bg-green-50/60 p-2 min-w-0">
                        <p className="text-[7px] font-black uppercase tracking-wide text-green-500">
                          Pagado
                        </p>
                        <p className="mt-0.5 break-words text-[11px] font-black text-green-600">
                          ${montoPagado.toLocaleString("es-MX")}
                        </p>
                      </div>

                      <div className="rounded-lg border border-red-100 bg-red-50/60 p-2 min-w-0">
                        <p className="text-[7px] font-black uppercase tracking-wide text-red-400">
                          Saldo
                        </p>
                        <p
                          className={`mt-0.5 break-words text-[11px] font-black ${
                            saldoPendiente > 0
                              ? estaVencida
                                ? "text-red-600"
                                : "text-[#0a192f]"
                              : "text-green-600"
                          }`}
                        >
                          ${saldoPendiente.toLocaleString("es-MX")}
                        </p>
                      </div>

                      <div className="rounded-lg border border-purple-100 bg-purple-50/60 p-2 min-w-0">
                        <p className="text-[7px] font-black uppercase tracking-wide text-purple-400">
                          Notas crédito
                        </p>
                        <p className="mt-0.5 break-words text-[11px] font-black text-purple-700">
                          ${totalNotas.toLocaleString("es-MX")}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-gray-100 bg-gray-50 p-2 text-[10px]">
                      <div>
                        <p className="font-black uppercase tracking-wide text-gray-400">Emisión</p>
                        <p className="mt-0.5 font-mono font-bold text-gray-700">{fac.emision || "S/F"}</p>
                      </div>
                      <div>
                        <p className="font-black uppercase tracking-wide text-gray-400">Vence</p>
                        <p className={`mt-0.5 font-mono font-black ${estaVencida ? "text-red-600" : "text-[#0a192f]"}`}>
                          {fac.vencimiento || "S/F"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => abrirMenuOpciones(fac)}
                      className="mt-3 flex w-full items-center justify-center rounded-lg bg-[#0a192f] py-2 text-[10px] font-black text-white active:bg-[#112240]"
                    >
                      Gestionar factura
                      <MoreVertical className="ml-1 h-3.5 w-3.5" />
                    </button>
                  </article>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-gray-400">
                <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-xs font-bold uppercase tracking-wider">
                  No se encontraron facturas con los filtros seleccionados.
                </p>
              </div>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
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
              {cargandoFacturas ? (
                Array.from({ length: 6 }).map((_, indice) => (
                  <tr key={`skeleton-${indice}`} className="animate-pulse">
                    {Array.from({ length: 7 }).map((__, columna) => (
                      <td
                        key={`skeleton-${indice}-${columna}`}
                        className="px-4 py-4 bg-white"
                      >
                        <div className="h-4 bg-gray-100 rounded w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : errorFacturas ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-10 text-center text-red-600 bg-red-50/30"
                  >
                    <AlertTriangle className="h-10 w-10 mx-auto mb-2 text-red-300" />
                    <p className="font-bold">
                      No se pudieron cargar las facturas.
                    </p>
                    <p className="text-xs mt-1">{errorFacturas}</p>
                  </td>
                </tr>
              ) : facturasPaginadas.length > 0 ? (
                facturasPaginadas.map((fac) => {
                  const montoTotal = Number(fac.monto_total) || 0;
                  const saldoPendiente = Number(fac.saldo_pendiente) || 0;
                  const montoPagado = obtenerMontoPagadoSeguro(fac);

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
                        ${montoTotal.toLocaleString("es-MX")}
                      </td>
                      <td className="px-4 py-4 md:py-3 text-right font-semibold text-green-600 bg-white whitespace-nowrap">
                        ${montoPagado.toLocaleString("es-MX")}
                      </td>
                      <td className="px-4 py-4 md:py-3 text-right bg-white whitespace-nowrap">
                        <span
                          className={`text-base font-black ${
                            saldoPendiente > 0
                              ? fac.estatus === "Vencida"
                                ? "text-red-600"
                                : "text-[#0a192f]"
                              : "text-green-600"
                          }`}
                        >
                          ${saldoPendiente.toLocaleString("es-MX")}
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
                      No se encontraron facturas con los filtros seleccionados.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
            </table>
          </div>
        </div>

        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
          <PaginacionGlobal
            modoCursor
            mostrarSiempre
            pagina={paginaActualFacturas}
            hayAnterior={hayAnterior}
            haySiguiente={haySiguiente}
            cargando={cargandoFacturas}
            registrosEnPagina={facturasPaginadas.length}
            etiquetaTotal="facturas"
            etiquetaPagina="Facturas por página"
            textoMostrando={
              cargandoFacturas
                ? "Consultando facturas..."
                : `Mostrando ${facturasPaginadas.length} factura(s) en esta página`
            }
            scrollTargetRef={contenedorTablaRef}
            onAnterior={paginaAnterior}
            onSiguiente={siguientePagina}
            className="mt-0"
          />
        </div>
      </div>

      {modalActivo && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm md:items-center md:p-4">
          {modalActivo === "opcionesFactura" && (
            <div className="flex max-h-[92dvh] w-full max-w-sm flex-col overflow-hidden rounded-t-3xl bg-white pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-slide-up md:m-0 md:rounded-xl md:pb-0 md:animate-zoom-in">
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
                  onClick={() => abrirFormulario("historialNotasCredito")}
                  className="w-full p-3.5 md:p-3 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-xl md:rounded-lg flex items-center justify-center font-bold text-sm transition-colors"
                >
                  <FileText className="h-4 w-4 md:h-4 md:w-4 mr-2" /> Historial
                  de Notas ({obtenerHistorialNotasCredito(facturaSeleccionada).length})
                </button>
                {["SU", "ADMIN"].includes(userRole) &&
                  Number(facturaSeleccionada?.saldo_pendiente) > 0 && (
                    <button
                      onClick={() => abrirFormulario("notaCredito")}
                      className="w-full p-3.5 md:p-3 bg-purple-600 text-white active:bg-purple-700 hover:bg-purple-700 rounded-xl md:rounded-lg flex items-center justify-center font-black text-sm shadow-sm transition-colors"
                    >
                      <DollarSign className="h-4 w-4 md:h-4 md:w-4 mr-2" />
                      {userRole === "SU"
                        ? "Aplicar nota de crédito"
                        : "Solicitar nota de crédito"}
                    </button>
                  )}
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
                      type="button"
                      onClick={() =>
                        confirmarEliminacion("factura", facturaSeleccionada)
                      }
                      className="p-3 md:p-2 bg-red-50 text-red-700 border border-red-200 rounded-xl md:rounded-lg flex flex-col items-center justify-center font-bold text-xs hover:bg-red-100 active:bg-red-100 transition-colors"
                    >
                      <Trash2 className="h-5 w-5 md:h-4 md:w-4 mb-1" /> Eliminar
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {modalActivo === "notaCredito" && (
            <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-slide-up md:m-0 md:rounded-xl md:pb-0 md:animate-zoom-in">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden shrink-0" />
              <div className="p-4 border-b border-gray-100 bg-white md:bg-purple-50 flex justify-between items-center shrink-0">
                <h2 className="text-sm md:text-base font-black text-purple-800 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />{" "}
                  {userRole === "SU"
                    ? "Aplicar nota de crédito"
                    : "Solicitar nota de crédito"}
                </h2>
                <button
                  onClick={() => setModalActivo("opcionesFactura")}
                  className="text-gray-400 active:text-gray-700 bg-gray-50 md:bg-transparent rounded-full p-1 md:p-0"
                >
                  <XCircle className="h-6 w-6 md:h-5 md:w-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-purple-700">
                    Factura seleccionada
                  </p>
                  <p className="font-mono font-black text-[#0a192f] mt-1">
                    {facturaSeleccionada?.folio}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Saldo disponible para nota:{" "}
                    <strong>
                      $
                      {(
                        Number(facturaSeleccionada?.saldo_pendiente) || 0
                      ).toLocaleString("es-MX")}
                    </strong>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                    Monto de la nota <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={notaCreditoForm.monto}
                    onChange={handleMontoNotaCredito}
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 text-sm font-black text-[#0a192f]"
                    placeholder="Ej. 500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                    Motivo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={notaCreditoForm.motivo}
                    onChange={(event) =>
                      setNotaCreditoForm((previo) => ({
                        ...previo,
                        motivo: event.target.value,
                      }))
                    }
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 text-sm"
                    placeholder="Ej. Descuento autorizado"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                    Observaciones
                  </label>
                  <textarea
                    value={notaCreditoForm.observaciones}
                    onChange={(event) =>
                      setNotaCreditoForm((previo) => ({
                        ...previo,
                        observaciones: event.target.value,
                      }))
                    }
                    rows="3"
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 text-sm resize-none"
                    placeholder="Detalle interno de la autorización"
                  />
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 leading-relaxed">
                  {userRole === "SU"
                    ? "Esta operación reduce cartera y saldo pendiente, pero no cuenta como ingreso ni como abono cobrado."
                    : "La solicitud quedará pendiente y solo el SU podrá autorizarla."}
                </div>
              </div>

              <div className="p-4 md:p-3 border-t border-gray-100 bg-white md:bg-gray-50 flex flex-col-reverse md:flex-row justify-end gap-2 shrink-0 md:rounded-b-xl">
                <button
                  onClick={() => setModalActivo("opcionesFactura")}
                  disabled={isSubmitting}
                  className="w-full md:w-auto px-4 py-3 md:py-2 text-sm md:text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-xl md:rounded active:bg-gray-100 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAplicarNotaCredito}
                  disabled={isSubmitting}
                  className="w-full md:w-auto px-4 py-3 md:py-2 text-sm md:text-xs font-black text-white bg-purple-600 rounded-xl md:rounded active:bg-purple-700 disabled:opacity-70 flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {userRole === "SU" ? "Aplicando..." : "Enviando..."}
                    </>
                  ) : userRole === "SU" ? (
                    "Aplicar nota"
                  ) : (
                    "Solicitar nota"
                  )}
                </button>
              </div>
            </div>
          )}

          {modalActivo === "historialNotasCredito" && (
            <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-slide-up md:m-0 md:rounded-xl md:pb-0 md:animate-zoom-in">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden shrink-0" />
              <div className="p-4 border-b border-gray-100 bg-white md:bg-blue-50 flex justify-between items-center shrink-0">
                <h2 className="text-sm md:text-base font-black text-blue-800 flex items-center">
                  <FileText className="h-5 w-5 mr-2" /> Historial de notas
                </h2>
                <button
                  onClick={() => setModalActivo("opcionesFactura")}
                  className="text-gray-400 active:text-gray-700 bg-gray-50 md:bg-transparent rounded-full p-1 md:p-0"
                  aria-label="Cerrar historial de notas"
                >
                  <XCircle className="h-6 w-6 md:h-5 md:w-5" />
                </button>
              </div>

              <div ref={historialNotasRef} className="p-3 flex-1 overflow-y-auto custom-scrollbar space-y-3">
                {historialNotasCredito.length > 0 ? (
                  <>
                    {historialNotasPaginado.map((nota) => {
                      const estatus = normalizarEstatusNotaCredito(
                        nota.estatus_historial,
                      );
                      const estilosNota = obtenerEstiloNotaCredito(estatus);
                      const esPendiente = estatus === "Pendiente";
                      const esRechazada = estatus === "Rechazada";
                      const esAutorizada = estatus === "Autorizada";
                      const esAnulada = estatus === "Anulada";

                      return (
                        <article
                          key={`${nota.id || nota.id_nota}-${estatus}`}
                          className={`rounded-2xl border ${estilosNota.borde} ${estilosNota.fondo} p-3.5`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p
                                  className={`text-base font-black ${estilosNota.texto}`}
                                >
                                  $
                                  {(Number(nota.monto) || 0).toLocaleString(
                                    "es-MX",
                                  )}
                                </p>

                                <span
                                  className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase ${estilosNota.etiqueta}`}
                                >
                                  {estatus}
                                </span>
                              </div>

                              <p className="text-xs font-black text-[#0a192f] mt-1">
                                {nota.motivo || "Sin motivo"}
                              </p>
                            </div>

                            <p className="text-[10px] text-gray-500 font-bold text-right shrink-0">
                              {nota.fechaTexto ||
                                formatearFechaNotaCredito(nota.fecha)}
                            </p>
                          </div>

                          <div className="mt-2 space-y-1 text-[11px] text-gray-500">
                            {nota.esDirecta ? (
                              <p>
                                Aplicada directamente por:{" "}
                                <strong>{nota.aplicado_por || "SU"}</strong>
                              </p>
                            ) : (
                              <>
                                <p>
                                  Solicitó:{" "}
                                  <strong>
                                    {nota.solicitado_por_nombre || "ADMIN"}
                                  </strong>
                                </p>

                                {esPendiente ? (
                                  <p className="text-blue-700 font-bold">
                                    En espera de autorización del SU.
                                  </p>
                                ) : (
                                  <p>
                                    Resolvió:{" "}
                                    <strong>
                                      {nota.resolvedBy ||
                                        nota.aplicado_por ||
                                        "SU"}
                                    </strong>
                                  </p>
                                )}
                              </>
                            )}
                          </div>

                          {esRechazada && (
                            <div className="mt-2 bg-red-50 border border-red-100 rounded-xl p-2 text-[11px] text-red-700 leading-relaxed">
                              <strong>Motivo de rechazo:</strong>{" "}
                              {nota.motivo_resolucion ||
                                "El SU rechazó la solicitud sin capturar motivo adicional."}
                            </div>
                          )}

                          {esAnulada && (
                            <div className="mt-2 bg-slate-100 border border-slate-200 rounded-xl p-2 text-[11px] text-slate-700 leading-relaxed">
                              <strong>Nota anulada:</strong>{" "}
                              {nota.motivo_cancelacion ||
                                nota.motivo_anulacion ||
                                "Reversión aplicada por SU."}
                            </div>
                          )}

                          {nota.observaciones && (
                            <p className="text-[11px] text-gray-600 mt-2 bg-white/75 border border-gray-100 rounded-xl p-2 leading-relaxed">
                              {nota.observaciones}
                            </p>
                          )}

                          {esAutorizada && nota.id_nota && userRole === "SU" && (
                            <button
                              type="button"
                              onClick={() => {
                                setNotaCreditoACancelar(nota);
                                setModalActivo("confirmarCancelarNotaCredito");
                              }}
                              className="mt-3 w-full px-3 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs font-black hover:bg-red-100 active:bg-red-100 transition-colors"
                            >
                              Anular / revertir nota
                            </button>
                          )}
                        </article>
                      );
                    })}

                    <PaginacionGlobal
                      pagina={paginaHistorialNotas}
                      totalPaginas={totalPaginasNotas}
                      totalRegistros={historialNotasCredito.length}
                      registrosPorPagina={registrosPorPaginaNotas}
                      registrosEnPagina={historialNotasPaginado.length}
                      etiquetaTotal="notas"
                      scrollTargetRef={historialNotasRef}
                      onCambiarPagina={setPaginaHistorialNotas}
                    />
                  </>
                ) : (
                  <div className="p-10 text-center text-gray-400 rounded-2xl border border-dashed border-gray-200 bg-gray-50/70">
                    <AlertTriangle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-bold uppercase tracking-wider">
                      No hay notas o solicitudes para esta factura.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {modalActivo === "confirmarCancelarNotaCredito" && (
            <div className="flex max-h-[92dvh] w-full max-w-sm flex-col overflow-hidden rounded-t-3xl bg-white pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-slide-up md:m-0 md:rounded-xl md:pb-0 md:animate-zoom-in">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden shrink-0" />
              <div className="p-5 text-center space-y-4">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
                <div>
                  <h2 className="text-base font-black text-[#0a192f]">
                    Eliminar nota de crédito
                  </h2>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    Esta acción revertirá el efecto financiero y conservará la nota
                    como ANULADA dentro del historial de la factura.
                  </p>
                </div>

                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs">
                  <p className="font-black text-red-700">
                    $
                    {(Number(notaCreditoACancelar?.monto) || 0).toLocaleString(
                      "es-MX",
                    )}
                  </p>
                  <p className="text-red-600 mt-1">
                    {notaCreditoACancelar?.motivo || "Sin motivo"}
                  </p>
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col-reverse md:flex-row gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setModalActivo("historialNotasCredito")}
                  className="w-full px-4 py-3 md:py-2 text-sm md:text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-xl md:rounded active:bg-gray-100 disabled:opacity-50"
                >
                  Regresar
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleCancelarNotaCredito}
                  className="w-full px-4 py-3 md:py-2 text-sm md:text-xs font-black text-white bg-red-600 rounded-xl md:rounded active:bg-red-700 disabled:opacity-70 flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    "Sí, anular nota"
                  )}
                </button>
              </div>
            </div>
          )}

          {modalActivo === "whatsapp" && (
            <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-slide-up md:m-0 md:rounded-xl md:pb-0 md:animate-zoom-in">
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
            <div className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-slide-up md:m-0 md:rounded-xl md:pb-0 md:animate-zoom-in">
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
            <div className="bg-white rounded-t-3xl md:rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-slide-up md:animate-zoom-in mt-auto mb-auto md:mt-10 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-0">
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
                        Estás a punto de eliminar la factura{" "}
                        <span className="font-bold text-[#0a192f]">
                          {itemAEliminar.data?.folio}
                        </span>{" "}
                        de{" "}
                        <span className="font-bold text-[#0a192f]">
                          {itemAEliminar.data?.cliente}
                        </span>
                        . Esta operación también ajustará el saldo del cliente,
                        el crédito disponible, las métricas globales y la
                        bitácora.
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
                      ? "Solo el SU puede eliminar facturas. La factura dejará de existir en el listado activo y su movimiento quedará auditado."
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
                  disabled={isSubmitting}
                  className="w-full md:w-auto px-5 py-3.5 md:py-2 text-sm md:text-xs font-black text-white bg-red-600 active:bg-red-700 rounded-xl md:rounded-lg shadow-sm flex items-center justify-center transition-colors disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 md:mr-1 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-1.5 md:mr-1" />
                      Sí, eliminar
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {modalActivo === "nuevoPago" && (
            <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-slide-up md:m-0 md:rounded-xl md:pb-0 md:animate-zoom-in">
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
            <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-slide-up md:m-0 md:rounded-xl md:pb-0 md:animate-zoom-in">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden shrink-0"></div>
              <div className="p-4 border-b border-gray-100 bg-white md:bg-blue-50 flex justify-between items-center shrink-0">
                <h2 className="text-sm md:text-base font-black text-blue-800 flex items-center">
                  <Clock className="h-5 w-5 md:h-5 md:w-5 mr-2" /> Historial de
                  Abonos
                </h2>
                <button
                  onClick={() => setModalActivo("opcionesFactura")}
                  className="text-gray-400 active:text-gray-700 bg-gray-50 md:bg-transparent rounded-full p-1 md:p-0"
                  aria-label="Cerrar historial de abonos"
                >
                  <XCircle className="h-6 w-6 md:h-5 md:w-5" />
                </button>
              </div>

              <div ref={historialAbonosRef} className="p-3 flex-1 overflow-y-auto custom-scrollbar space-y-3">
                {historialAbonosOrdenado.length > 0 ? (
                  <>
                    {historialAbonosPaginado.map((abono, indice) => {
                      const montoAbono = Number(abono.monto) || 0;
                      const tieneSaldoAnterior = tieneValorNumerico(
                        abono.saldo_anterior,
                      );
                      const tieneSaldoRestante = tieneValorNumerico(
                        abono.saldo_restante,
                      );

                      return (
                        <article
                          key={abono.id_abono || `${abono.fecha}-${indice}`}
                          className="rounded-2xl border border-green-100 bg-green-50/25 p-3.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-lg font-black text-green-700">
                                ${montoAbono.toLocaleString("es-MX")}
                              </p>
                              <p className="text-[11px] font-black uppercase text-gray-400 mt-0.5">
                                Abono registrado
                              </p>
                            </div>

                            <p className="text-[10px] font-bold text-gray-500 text-right shrink-0">
                              {formatearFechaAbono(abono.fecha)}
                            </p>
                          </div>

                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-600">
                            {abono.metodo && (
                              <p>
                                <span className="font-black text-gray-400 uppercase tracking-wider">
                                  Método:
                                </span>{" "}
                                <span className="font-bold">{abono.metodo}</span>
                              </p>
                            )}

                            {abono.registrado_por && (
                              <p>
                                <span className="font-black text-gray-400 uppercase tracking-wider">
                                  Registró:
                                </span>{" "}
                                <span className="font-bold">
                                  {abono.registrado_por}
                                </span>
                              </p>
                            )}

                            {tieneSaldoAnterior && (
                              <p>
                                <span className="font-black text-gray-400 uppercase tracking-wider">
                                  Saldo anterior:
                                </span>{" "}
                                <span className="font-bold">
                                  $
                                  {Number(abono.saldo_anterior).toLocaleString(
                                    "es-MX",
                                  )}
                                </span>
                              </p>
                            )}

                            {tieneSaldoRestante && (
                              <p>
                                <span className="font-black text-gray-400 uppercase tracking-wider">
                                  Restante:
                                </span>{" "}
                                <span className="font-bold">
                                  $
                                  {Number(abono.saldo_restante).toLocaleString(
                                    "es-MX",
                                  )}
                                </span>
                              </p>
                            )}
                          </div>

                          {abono.observaciones && (
                            <p className="mt-2 text-[11px] text-gray-600 bg-white/75 border border-gray-100 rounded-xl p-2">
                              {abono.observaciones}
                            </p>
                          )}

                          {userRole === "SU" && (
                            <button
                              type="button"
                              onClick={() =>
                                confirmarEliminacion("abono", abono)
                              }
                              className="mt-3 w-full px-3 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs font-black hover:bg-red-100 active:bg-red-100 transition-colors"
                            >
                              Anular abono
                            </button>
                          )}
                        </article>
                      );
                    })}

                    <PaginacionGlobal
                      pagina={paginaHistorialAbonos}
                      totalPaginas={totalPaginasAbonos}
                      totalRegistros={historialAbonosOrdenado.length}
                      registrosPorPagina={registrosPorPaginaAbonos}
                      registrosEnPagina={historialAbonosPaginado.length}
                      etiquetaTotal="abonos"
                      scrollTargetRef={historialAbonosRef}
                      onCambiarPagina={setPaginaHistorialAbonos}
                    />
                  </>
                ) : (
                  <div className="p-10 text-center text-gray-400 rounded-2xl border border-dashed border-gray-200 bg-gray-50/70">
                    <AlertTriangle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-bold uppercase tracking-wider">
                      No se han registrado abonos a esta factura.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {modalActivo === "notificacion" && (
            <div className="bg-white rounded-t-3xl md:rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-slide-up md:animate-zoom-in mt-auto mb-auto pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-0">
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
</file>

<file path="src/services/facturasService.js">
import { auth, db } from "../config/firebase";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  increment,
  runTransaction,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from "firebase/firestore";

import {
  construirAbonoIndexId,
  construirAbonoIndexPayload,
} from "./abonosIndexService";

const FACTURAS_COLLECTION = "facturas";
const CLIENTES_COLLECTION = "clientes";
const STATS_COLLECTION = "metricas_globales";
const STATS_DOC = "stats_actuales";
const ACTIVIDAD_COLLECTION = "actividad";
const ABONOS_INDEX_COLLECTION = "abonos_index";
const SOLICITUDES_NOTAS_CREDITO_COLLECTION = "solicitudes_notas_credito";

const redondearMoneda = (valor) =>
  Math.round((Number(valor) || 0) * 100) / 100;

const obtenerActorUidSeguro = (actor_uid) => {
  const uidSesion = auth.currentUser?.uid || "";
  const uidRecibido = String(actor_uid || "").trim();

  if (!uidSesion) {
    throw new Error("No hay una sesión activa de Firebase Authentication.");
  }

  if (uidRecibido && uidRecibido !== uidSesion) {
    console.warn("actor_uid distinto al UID autenticado. Se usará el UID real de Firebase Auth.", {
      actor_uid_recibido: uidRecibido,
      uid_auth_real: uidSesion,
    });
  }

  return uidSesion;
};

const obtenerResumenPagoCliente = (cliente = {}) => ({
  monto_ultimo_pago: cliente.monto_ultimo_pago ?? null,
  fecha_ultimo_pago: cliente.fecha_ultimo_pago ?? null,
  metodo_ultimo_pago: cliente.metodo_ultimo_pago ?? null,
  ultimo_deposito_monto: cliente.ultimo_deposito_monto ?? null,
  ultimo_deposito_fecha: cliente.ultimo_deposito_fecha ?? null,
  ultimo_deposito_metodo: cliente.ultimo_deposito_metodo ?? null,
  ultimo_abono_id: cliente.ultimo_abono_id ?? null,
  ultimo_abono_factura_id: cliente.ultimo_abono_factura_id ?? null,
});

const aplicarResumenPagoCliente = (payload, resumen = {}) => {
  payload.monto_ultimo_pago = resumen?.monto_ultimo_pago ?? null;
  payload.fecha_ultimo_pago = resumen?.fecha_ultimo_pago ?? null;
  payload.metodo_ultimo_pago = resumen?.metodo_ultimo_pago ?? null;
  payload.ultimo_deposito_monto = resumen?.ultimo_deposito_monto ?? null;
  payload.ultimo_deposito_fecha = resumen?.ultimo_deposito_fecha ?? null;
  payload.ultimo_deposito_metodo = resumen?.ultimo_deposito_metodo ?? null;
  payload.ultimo_abono_id = resumen?.ultimo_abono_id ?? null;
  payload.ultimo_abono_factura_id = resumen?.ultimo_abono_factura_id ?? null;

  return payload;
};

const abonoCoincideConResumenClienteLegacy = (cliente = {}, abono = {}) => {
  const clienteSinPunteroAbono =
    !cliente.ultimo_abono_id &&
    !cliente.ultimo_abono_factura_id;

  if (!clienteSinPunteroAbono) {
    return false;
  }

  const montoAbono = redondearMoneda(abono.monto);
  const mismoMonto =
    redondearMoneda(cliente.monto_ultimo_pago) === montoAbono ||
    redondearMoneda(cliente.ultimo_deposito_monto) === montoAbono;

  const mismoMetodo =
    !cliente.metodo_ultimo_pago ||
    !abono.metodo ||
    String(cliente.metodo_ultimo_pago) === String(abono.metodo);

  return mismoMonto && mismoMetodo;
};

const mapearErrorFirestore = (error) => {
  if (error?.code === "resource-exhausted") {
    return "La cuota diaria de Firestore fue agotada. La operación no pudo completarse. Espera al restablecimiento de la cuota o utiliza el emulador local.";
  }

  if (error?.code === "permission-denied") {
    return "Firestore rechazó la operación por permisos. Verifica que las reglas publicadas coincidan con el archivo firestore.rules del proyecto.";
  }

  if (error?.code === "unavailable") {
    return "Firestore no está disponible en este momento. Revisa tu conexión e intenta nuevamente.";
  }

  return error?.message || "No se pudo completar la operación de facturación.";
};

const convertirFechaFormulario = (fecha) => {
  if (!fecha || typeof fecha !== "string") {
    throw new Error("Las fechas de emisión y vencimiento son obligatorias.");
  }

  const [anio, mes, dia] = fecha.split("-").map(Number);
  const fechaConvertida = new Date(anio, mes - 1, dia);

  if (
    !anio ||
    !mes ||
    !dia ||
    Number.isNaN(fechaConvertida.getTime())
  ) {
    throw new Error("La fecha indicada no es válida.");
  }

  return fechaConvertida;
};

const convertirFechaAString = (fecha) => {
  if (!fecha) return "";

  if (fecha?.toDate && typeof fecha.toDate === "function") {
    const valor = fecha.toDate();
    return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, "0")}-${String(valor.getDate()).padStart(2, "0")}`;
  }

  if (fecha instanceof Date) {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
  }

  const texto = String(fecha).split(" ")[0];

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return texto;
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(texto)) {
    const [dia, mes, anio] = texto.split("/");
    return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  }

  return "";
};

const calcularEstatusFinanciero = ({ saldo, vencimiento }) => {
  if (redondearMoneda(saldo) === 0) return "Pagada";

  const fecha = vencimiento?.toDate
    ? vencimiento.toDate()
    : vencimiento instanceof Date
      ? new Date(vencimiento)
      : convertirFechaFormulario(convertirFechaAString(vencimiento));

  fecha.setHours(0, 0, 0, 0);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return fecha < hoy ? "Vencida" : "Pendiente";
};

const valoresIguales = (anterior, nuevo) => {
  if (typeof anterior === "number" || typeof nuevo === "number") {
    return redondearMoneda(anterior) === redondearMoneda(nuevo);
  }

  return String(anterior ?? "") === String(nuevo ?? "");
};

const ETIQUETAS_EDICION = {
  cliente_id: "Cliente",
  grupo: "Grupo",
  folio: "Folio",
  monto_total: "Monto total",
  emision: "Emisión",
  vencimiento: "Vencimiento",
  observaciones: "Observaciones",
};

const formatearValorAuditoria = (campo, valor) => {
  if (campo === "monto_total" || campo === "saldo_pendiente" || campo === "monto_pagado") {
    return `$${redondearMoneda(valor).toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  if (campo === "emision" || campo === "vencimiento") {
    const fecha = convertirFechaAString(valor);
    if (!fecha) return "Sin fecha";
    const [anio, mes, dia] = fecha.split("-");
    return `${dia}/${mes}/${anio}`;
  }

  return String(valor ?? "").trim() || "Sin datos";
};

const esFacturaVencida = (factura) => {
  if (factura.estatus === "Vencida") return true;
  if (!factura.vencimiento) return false;

  let fechaVencimiento;

  if (factura.vencimiento?.toDate) {
    fechaVencimiento = factura.vencimiento.toDate();
  } else {
    const fechaParte = factura.vencimiento.toString().split(" ")[0];

    if (fechaParte.includes("-")) {
      const [anio, mes, dia] = fechaParte.split("-").map(Number);
      fechaVencimiento = new Date(anio, mes - 1, dia);
    } else if (fechaParte.includes("/")) {
      const [dia, mes, anio] = fechaParte.split("/").map(Number);
      fechaVencimiento = new Date(anio, mes - 1, dia);
    } else {
      return false;
    }
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  fechaVencimiento.setHours(0, 0, 0, 0);

  return fechaVencimiento < hoy;
};

const esMismoMes = (fechaTarget) => {
  if (!fechaTarget) return false;

  const fecha = fechaTarget.toDate
    ? fechaTarget.toDate()
    : new Date(fechaTarget);

  const hoy = new Date();

  return (
    fecha.getMonth() === hoy.getMonth() &&
    fecha.getFullYear() === hoy.getFullYear()
  );
};

const esMismaSemana = (fechaTarget) => {
  if (!fechaTarget) return false;

  const fecha = fechaTarget.toDate
    ? fechaTarget.toDate()
    : new Date(fechaTarget);

  const hoy = new Date();

  const obtenerSemana = (date) => {
    const fechaUTC = new Date(
      Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      ),
    );

    const numeroDia = fechaUTC.getUTCDay() || 7;
    fechaUTC.setUTCDate(fechaUTC.getUTCDate() + 4 - numeroDia);

    const inicioAnio = new Date(
      Date.UTC(fechaUTC.getUTCFullYear(), 0, 1),
    );

    return Math.ceil(
      (((fechaUTC - inicioAnio) / 86400000) + 1) / 7,
    );
  };

  return (
    fecha.getFullYear() === hoy.getFullYear() &&
    obtenerSemana(fecha) === obtenerSemana(hoy)
  );
};

export const facturasService = {
  crearFactura: async ({
    formData,
    clientes,
    userName,
    actor_uid,
  }) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    try {
      const actorUid = obtenerActorUidSeguro(actor_uid);
      const clienteBD = clientes.find(
        (cliente) => cliente.id === formData.cliente_id,
      );

      if (!clienteBD) {
        throw new Error(
          "El cliente seleccionado no está enlazado correctamente mediante cliente_id.",
        );
      }

      if (
        clienteBD.activo === false ||
        clienteBD.estatus === "Inactivo"
      ) {
        throw new Error(
          "No se pueden crear facturas para un cliente inactivo.",
        );
      }

      const montoTotal = redondearMoneda(formData.monto_total);

      if (montoTotal <= 0) {
        throw new Error(
          "El monto total de la factura debe ser mayor a cero.",
        );
      }

      const limiteCredito =
        Number(clienteBD.limite_credito) || 0;

      const deudaActual =
        Number(clienteBD.deuda_actual) || 0;

      const creditoDisponibleGuardado = Number(
        clienteBD.credito_disponible,
      );

      const creditoDisponible = Number.isFinite(
        creditoDisponibleGuardado,
      )
        ? creditoDisponibleGuardado
        : Math.max(0, limiteCredito - deudaActual);

      if (limiteCredito <= 0) {
        throw new Error(
          "El cliente no tiene una línea de crédito asignada.",
        );
      }

      if (montoTotal > creditoDisponible) {
        throw new Error(
          `El cliente solo dispone de $${Math.max(
            0,
            creditoDisponible,
          ).toLocaleString("es-MX")} de crédito.`,
        );
      }

      const fechaEmision = convertirFechaFormulario(
        formData.emision,
      );

      const fechaVencimiento = convertirFechaFormulario(
        formData.vencimiento,
      );

      if (fechaVencimiento < fechaEmision) {
        throw new Error(
          "La fecha de vencimiento no puede ser anterior a la fecha de emisión.",
        );
      }

      const batch = writeBatch(db);
      const facturaRef = doc(
        collection(db, FACTURAS_COLLECTION),
      );

      const payload = {
        id: facturaRef.id,
        cliente_id: clienteBD.id,
        cliente: clienteBD.nombre || formData.cliente || "S/N",
        grupo: String(
          formData.grupo || clienteBD.grupo || "General",
        ),
        folio: String(formData.folio || "").trim(),
        monto_total: montoTotal,
        monto_pagado: 0,
        saldo_pendiente: montoTotal,
        moneda: "MXN",
        emision: Timestamp.fromDate(fechaEmision),
        vencimiento: Timestamp.fromDate(fechaVencimiento),
        observaciones: String(
          formData.observaciones || "",
        ).trim(),
        estatus: "Pendiente",
        abonos: [],
        notas_credito: [],
        total_notas_credito: 0,
        createdAt: serverTimestamp(),
      };

      if (!payload.folio) {
        throw new Error(
          "El número o folio de la factura es obligatorio.",
        );
      }

      batch.set(facturaRef, payload);

      const clienteRef = doc(
        db,
        CLIENTES_COLLECTION,
        clienteBD.id,
      );

      batch.update(clienteRef, {
        deuda_actual: increment(montoTotal),
        credito_disponible: increment(-montoTotal),
        updatedAt: serverTimestamp(),
      });

      const naceVencida = esFacturaVencida(payload);

      const statsPayload = {
        facturas_total: increment(1),
        facturas_pendientes: increment(1),
        cartera_total: increment(montoTotal),
        total_facturado: increment(montoTotal),
        ultima_actualizacion: serverTimestamp(),
      };

      if (naceVencida) {
        statsPayload.facturas_vencidas = increment(1);
        statsPayload.cartera_vencida = increment(montoTotal);
      }

      const statsRef = doc(
        db,
        STATS_COLLECTION,
        STATS_DOC,
      );

      batch.set(statsRef, statsPayload, { merge: true });

      const auditRef = doc(
        collection(db, ACTIVIDAD_COLLECTION),
      );

      batch.set(auditRef, {
        actor_uid: actorUid,
        usuario: userName || "Usuario",
        modulo: "Facturación",
        tipo: "Creación",
        cliente: payload.cliente,
        detalle: `Se generó la factura ${payload.folio} por $${montoTotal.toLocaleString("es-MX")}.`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return {
        success: true,
        data: {
          ...payload,
          id: facturaRef.id,
        },
      };
    } catch (error) {
      console.error(
        "Error crítico al emitir factura:",
        error,
      );

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  registrarAbono: async ({
    factura,
    montoAbonado,
    metodoPago,
    clientes,
    userName,
    actor_uid,
  }) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    try {
      const actorUid = obtenerActorUidSeguro(actor_uid);
      const saldoActual = Number(factura.saldo_pendiente) || 0;
      const montoTotal = Number(factura.monto_total) || 0;
      const monto = redondearMoneda(montoAbonado);

      if (monto <= 0) {
        throw new Error("El monto del abono debe ser mayor a cero.");
      }

      if (monto > saldoActual) {
        throw new Error(
          `El abono no puede superar el saldo pendiente de $${saldoActual.toLocaleString("es-MX")}.`,
        );
      }

      const clienteBD = clientes.find(
        (cliente) => cliente.id === factura.cliente_id,
      );

      if (!clienteBD) {
        throw new Error("No se encontró el cliente enlazado mediante cliente_id.");
      }

      const nuevoSaldo = redondearMoneda(saldoActual - monto);

      const montoPagadoActual = Number.isFinite(Number(factura.monto_pagado))
        ? Number(factura.monto_pagado)
        : Math.max(0, montoTotal - saldoActual);

      const nuevoMontoPagado = redondearMoneda(montoPagadoActual + monto);

      const nuevoEstatus =
        nuevoSaldo === 0
          ? "Pagada"
          : factura.estatus === "Vencida"
            ? "Vencida"
            : factura.estatus === "Reprogramado"
              ? "Reprogramado"
              : esFacturaVencida(factura)
                ? "Vencida"
                : "Pendiente";

      const fechaAbono = Timestamp.now();
      const resumenPagoAnteriorCliente = obtenerResumenPagoCliente(clienteBD);

      const nuevoAbono = {
        id_abono: `abn-${Date.now()}`,
        fecha: fechaAbono,
        monto,
        metodo: metodoPago,
        registrado_por: userName || "Usuario",
        registrado_por_uid: actorUid,
        saldo_anterior: saldoActual,
        saldo_restante: nuevoSaldo,
        resumen_pago_anterior_cliente: resumenPagoAnteriorCliente,
      };

      const limiteCredito = redondearMoneda(clienteBD.limite_credito);
      const creditoDisponibleActual = redondearMoneda(clienteBD.credito_disponible);
      const nuevoCreditoDisponible =
        limiteCredito > 0
          ? Math.min(
              limiteCredito,
              Math.max(0, redondearMoneda(creditoDisponibleActual + monto)),
            )
          : 0;

      const batch = writeBatch(db);
      const auditRef = doc(collection(db, ACTIVIDAD_COLLECTION));

      batch.set(auditRef, {
        actor_uid: actorUid,
        usuario: userName || "Usuario",
        modulo: "Facturación",
        tipo: "Registro de Abono",
        factura_id: factura.id,
        folio: factura.folio || "S/F",
        cliente: factura.cliente || clienteBD.nombre,
        cliente_id: factura.cliente_id,
        campos_modificados: ["saldo_pendiente", "monto_pagado", "estatus"],
        valores_anteriores: {
          saldo_pendiente: saldoActual,
          monto_pagado: montoPagadoActual,
          estatus: factura.estatus,
        },
        valores_nuevos: {
          saldo_pendiente: nuevoSaldo,
          monto_pagado: nuevoMontoPagado,
          estatus: nuevoEstatus,
        },
        detalle: `Abono de $${monto.toLocaleString("es-MX")} registrado vía ${metodoPago} a la factura ${factura.folio}.`,
        serverTime: serverTimestamp(),
      });

      const facturaRef = doc(db, FACTURAS_COLLECTION, factura.id);

      batch.update(facturaRef, {
        saldo_pendiente: nuevoSaldo,
        monto_pagado: nuevoMontoPagado,
        estatus: nuevoEstatus,
        abonos: arrayUnion(nuevoAbono),
        ultima_edicion_audit_id: auditRef.id,
        ultima_edicion_actor_uid: actorUid,
        ultima_edicion_at: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const abonoIndexRef = doc(
        db,
        ABONOS_INDEX_COLLECTION,
        construirAbonoIndexId(factura.id, nuevoAbono.id_abono),
      );

      batch.set(
        abonoIndexRef,
        {
          ...construirAbonoIndexPayload({
            factura,
            abono: nuevoAbono,
            actorUid,
            userName: userName || "Usuario",
            estado: "ACTIVO",
            activo: true,
          }),
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );

      const clienteRef = doc(db, CLIENTES_COLLECTION, clienteBD.id);

      batch.update(clienteRef, {
        deuda_actual: increment(-monto),
        credito_disponible: nuevoCreditoDisponible,
        monto_ultimo_pago: monto,
        fecha_ultimo_pago: fechaAbono,
        metodo_ultimo_pago: metodoPago,
        ultimo_deposito_monto: monto,
        ultimo_deposito_fecha: fechaAbono,
        ultimo_deposito_metodo: metodoPago,
        ultimo_abono_id: nuevoAbono.id_abono,
        ultimo_abono_factura_id: factura.id,
        updatedAt: serverTimestamp(),
      });

      const statsPayload = {
        cartera_total: increment(-monto),
        ingresos_mes: increment(monto),
        ingresos_semana: increment(monto),
        cobrado_historico: increment(monto),
        abonos_registrados: increment(monto),
        monto_recuperado: increment(monto),
        ultima_actualizacion: serverTimestamp(),
      };

      const estabaVencida = esFacturaVencida(factura);

      if (estabaVencida) {
        statsPayload.cartera_vencida = increment(-monto);
      }

      if (nuevoSaldo === 0) {
        statsPayload.facturas_pagadas = increment(1);
        statsPayload.facturas_pendientes = increment(-1);
        statsPayload.total_liquidado = increment(montoTotal);

        if (estabaVencida) {
          statsPayload.facturas_vencidas = increment(-1);
        }
      }

      const statsRef = doc(db, STATS_COLLECTION, STATS_DOC);
      batch.set(statsRef, statsPayload, { merge: true });

      await batch.commit();

      return {
        success: true,
        data: nuevoAbono,
      };
    } catch (error) {
      console.error("Error al registrar el abono:", error);

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },
  eliminarAbono: async ({
    idFactura,
    idAbono,
    userName,
    actor_uid,
  }) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    try {
      const actorUid = obtenerActorUidSeguro(actor_uid);
      const facturaRef = doc(db, FACTURAS_COLLECTION, idFactura);
      const facturaSnapshot = await getDoc(facturaRef);

      if (!facturaSnapshot.exists()) {
        throw new Error("La factura no fue encontrada.");
      }

      const factura = {
        id: facturaSnapshot.id,
        ...facturaSnapshot.data(),
      };

      const abonosFactura = Array.isArray(factura.abonos) ? factura.abonos : [];

      const abonoTarget = abonosFactura.find((abono) => abono.id_abono === idAbono);

      if (!abonoTarget) {
        throw new Error("El abono no fue encontrado.");
      }

      if (!factura.cliente_id) {
        throw new Error("La factura no contiene un cliente_id válido.");
      }

      const clienteRef = doc(db, CLIENTES_COLLECTION, factura.cliente_id);
      const clienteSnapshot = await getDoc(clienteRef);

      if (!clienteSnapshot.exists()) {
        throw new Error("No se encontró el cliente enlazado mediante cliente_id.");
      }

      const clienteBD = {
        id: clienteSnapshot.id,
        ...clienteSnapshot.data(),
      };

      const montoAbono = Number(abonoTarget.monto) || 0;

      if (montoAbono <= 0) {
        throw new Error("El abono seleccionado contiene un monto inválido.");
      }

      const saldoActual = Number(factura.saldo_pendiente) || 0;
      const montoTotal = Number(factura.monto_total) || 0;

      const nuevoSaldo = redondearMoneda(saldoActual + montoAbono);

      if (nuevoSaldo > montoTotal) {
        throw new Error("La reversión produciría un saldo superior al monto total de la factura.");
      }

      const montoPagadoActual = Number.isFinite(Number(factura.monto_pagado))
        ? Number(factura.monto_pagado)
        : Math.max(0, montoTotal - saldoActual);

      const nuevoMontoPagado = redondearMoneda(Math.max(0, montoPagadoActual - montoAbono));

      const totalNotasCredito = Number(factura.total_notas_credito) || 0;
      const validacionFinanciera = redondearMoneda(
        nuevoSaldo + nuevoMontoPagado + totalNotasCredito,
      ) === redondearMoneda(montoTotal);

      if (!validacionFinanciera) {
        throw new Error(
          "La anulación dejaría la factura descuadrada: saldo + pagado + notas no coincide con el total.",
        );
      }

      const pasaAVencida = nuevoSaldo > 0 && esFacturaVencida(factura);

      const nuevoEstatus = pasaAVencida
        ? "Vencida"
        : nuevoSaldo > 0
          ? "Pendiente"
          : "Pagada";

      const limiteCredito = redondearMoneda(clienteBD.limite_credito);
      const creditoDisponibleActual = redondearMoneda(clienteBD.credito_disponible);
      const nuevoCreditoDisponible =
        limiteCredito > 0
          ? Math.min(
              limiteCredito,
              Math.max(0, redondearMoneda(creditoDisponibleActual - montoAbono)),
            )
          : 0;

      const resumenAnterior = abonoTarget.resumen_pago_anterior_cliente || null;

      const esUltimoAbonoDelCliente =
        clienteBD.ultimo_abono_id === idAbono &&
        clienteBD.ultimo_abono_factura_id === idFactura;

      const esAbonoLegacyQuePareceResumenActual =
        abonoCoincideConResumenClienteLegacy(clienteBD, abonoTarget);

      const debeRestaurarResumenPago =
        esUltimoAbonoDelCliente || esAbonoLegacyQuePareceResumenActual;

      const batch = writeBatch(db);
      const auditRef = doc(collection(db, ACTIVIDAD_COLLECTION));

      batch.set(auditRef, {
        actor_uid: actorUid,
        usuario: userName || "SU",
        modulo: "Facturación",
        tipo: "Anulación de Abono",
        factura_id: idFactura,
        folio: factura.folio || "S/F",
        cliente: factura.cliente || clienteBD.nombre,
        cliente_id: factura.cliente_id,
        campos_modificados: ["saldo_pendiente", "monto_pagado", "estatus"],
        valores_anteriores: {
          saldo_pendiente: saldoActual,
          monto_pagado: montoPagadoActual,
          estatus: factura.estatus,
        },
        valores_nuevos: {
          saldo_pendiente: nuevoSaldo,
          monto_pagado: nuevoMontoPagado,
          estatus: nuevoEstatus,
        },
        detalle: `Se canceló un pago de $${montoAbono.toLocaleString("es-MX")} aplicado a la factura ${factura.folio}. Ese monto volvió a quedar como saldo pendiente del cliente.`,
        serverTime: serverTimestamp(),
      });

      batch.update(facturaRef, {
        saldo_pendiente: nuevoSaldo,
        monto_pagado: nuevoMontoPagado,
        estatus: nuevoEstatus,
        abonos: arrayRemove(abonoTarget),
        ultima_edicion_audit_id: auditRef.id,
        ultima_edicion_actor_uid: actorUid,
        ultima_edicion_at: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const abonoIndexRef = doc(
        db,
        ABONOS_INDEX_COLLECTION,
        construirAbonoIndexId(idFactura, idAbono),
      );

      batch.set(
        abonoIndexRef,
        {
          ...construirAbonoIndexPayload({
            factura,
            abono: abonoTarget,
            actorUid,
            userName: userName || "SU",
            estado: "CANCELADO",
            activo: false,
          }),
          estado: "CANCELADO",
          activo: false,
          cancelado_at: serverTimestamp(),
          cancelado_por_uid: actorUid,
          cancelado_por: userName || "SU",
        },
        { merge: true },
      );

      const clienteUpdatePayload = {
        deuda_actual: increment(montoAbono),
        credito_disponible: nuevoCreditoDisponible,
        updatedAt: serverTimestamp(),
      };

      if (debeRestaurarResumenPago) {
        aplicarResumenPagoCliente(clienteUpdatePayload, resumenAnterior);
      }

      batch.update(clienteRef, clienteUpdatePayload);

      const statsPayload = {
        cartera_total: increment(montoAbono),
        cobrado_historico: increment(-montoAbono),
        abonos_registrados: increment(-montoAbono),
        monto_recuperado: increment(-montoAbono),
        ultima_actualizacion: serverTimestamp(),
      };

      if (esMismoMes(abonoTarget.fecha)) {
        statsPayload.ingresos_mes = increment(-montoAbono);
      }

      if (esMismaSemana(abonoTarget.fecha)) {
        statsPayload.ingresos_semana = increment(-montoAbono);
      }

      if (pasaAVencida) {
        statsPayload.cartera_vencida = increment(montoAbono);
      }

      if (factura.estatus === "Pagada" && nuevoSaldo > 0) {
        statsPayload.facturas_pagadas = increment(-1);
        statsPayload.facturas_pendientes = increment(1);
        statsPayload.total_liquidado = increment(-montoTotal);

        if (pasaAVencida) {
          statsPayload.facturas_vencidas = increment(1);
        }
      }

      const statsRef = doc(db, STATS_COLLECTION, STATS_DOC);
      batch.set(statsRef, statsPayload, { merge: true });

      await batch.commit();

      return { success: true };
    } catch (error) {
      console.error("Error al eliminar el abono:", error);

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },
  modificarFactura: async ({
    idFactura,
    formData,
    userName,
    actor_uid,
  }) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    if (!idFactura) {
      return {
        success: false,
        error: "No se identificó la factura que será modificada.",
      };
    }

    try {
      const actorUid = obtenerActorUidSeguro(actor_uid);
      const facturaRef = doc(db, FACTURAS_COLLECTION, idFactura);
      const statsRef = doc(db, STATS_COLLECTION, STATS_DOC);
      const auditRef = doc(collection(db, ACTIVIDAD_COLLECTION));

      const resultado = await runTransaction(db, async (transaction) => {
        const facturaSnap = await transaction.get(facturaRef);

        if (!facturaSnap.exists()) {
          throw new Error("La factura ya no existe en Firestore.");
        }

        const facturaAnterior = facturaSnap.data();

        if (facturaAnterior.estatus === "Cancelada") {
          throw new Error(
            "Las facturas canceladas no pueden editarse desde este formulario.",
          );
        }

        const clienteAnteriorId = facturaAnterior.cliente_id;
        const clienteNuevoId = String(formData?.cliente_id || "").trim();

        if (!clienteAnteriorId || !clienteNuevoId) {
          throw new Error(
            "La factura debe conservar un cliente enlazado mediante cliente_id.",
          );
        }

        const clienteAnteriorRef = doc(
          db,
          CLIENTES_COLLECTION,
          clienteAnteriorId,
        );
        const clienteNuevoRef = doc(
          db,
          CLIENTES_COLLECTION,
          clienteNuevoId,
        );

        const clienteAnteriorSnap = await transaction.get(clienteAnteriorRef);
        const clienteNuevoSnap =
          clienteNuevoId === clienteAnteriorId
            ? clienteAnteriorSnap
            : await transaction.get(clienteNuevoRef);

        if (!clienteAnteriorSnap.exists()) {
          throw new Error(
            "No se encontró el cliente original enlazado a la factura.",
          );
        }

        if (!clienteNuevoSnap.exists()) {
          throw new Error("El nuevo cliente seleccionado no existe.");
        }

        const clienteAnterior = clienteAnteriorSnap.data();
        const clienteNuevo = clienteNuevoSnap.data();
        const cambiaCliente = clienteAnteriorId !== clienteNuevoId;

        if (
          clienteNuevo.activo === false ||
          clienteNuevo.estatus === "Inactivo"
        ) {
          throw new Error(
            "No se puede asignar la factura a un cliente inactivo.",
          );
        }

        const montoAnterior = redondearMoneda(
          facturaAnterior.monto_total,
        );
        const saldoAnterior = redondearMoneda(
          facturaAnterior.saldo_pendiente,
        );
        const montoPagado = redondearMoneda(
          Number.isFinite(Number(facturaAnterior.monto_pagado))
            ? facturaAnterior.monto_pagado
            : montoAnterior - saldoAnterior,
        );
        const abonos = Array.isArray(facturaAnterior.abonos)
          ? facturaAnterior.abonos
          : [];

        if (cambiaCliente && (montoPagado > 0 || abonos.length > 0)) {
          throw new Error(
            "No se puede cambiar el cliente de una factura que ya tiene abonos. Corrige los demás datos o revierte primero sus pagos.",
          );
        }

        const montoNuevo = redondearMoneda(formData?.monto_total);

        if (montoNuevo <= 0) {
          throw new Error(
            "El monto total de la factura debe ser mayor a cero.",
          );
        }

        if (montoNuevo < montoPagado) {
          throw new Error(
            `El nuevo monto no puede ser menor a los $${montoPagado.toLocaleString("es-MX")} que ya fueron pagados.`,
          );
        }

        const fechaEmision = convertirFechaFormulario(formData?.emision);
        const fechaVencimiento = convertirFechaFormulario(
          formData?.vencimiento,
        );

        if (fechaVencimiento < fechaEmision) {
          throw new Error(
            "La fecha de vencimiento no puede ser anterior a la fecha de emisión.",
          );
        }

        const folioNuevo = String(formData?.folio || "").trim();

        if (!folioNuevo) {
          throw new Error("El folio de la factura es obligatorio.");
        }

        const saldoNuevo = redondearMoneda(montoNuevo - montoPagado);
        const estatusAnteriorReal = calcularEstatusFinanciero({
          saldo: saldoAnterior,
          vencimiento: facturaAnterior.vencimiento,
        });
        const estatusNuevo = calcularEstatusFinanciero({
          saldo: saldoNuevo,
          vencimiento: fechaVencimiento,
        });

        const limiteAnterior = redondearMoneda(
          clienteAnterior.limite_credito,
        );
        const deudaAnteriorGuardada = redondearMoneda(
          clienteAnterior.deuda_actual,
        );
        const disponibleAnteriorGuardado = redondearMoneda(
          clienteAnterior.credito_disponible,
        );

        if (!cambiaCliente) {
          const diferenciaSaldo = redondearMoneda(
            saldoNuevo - saldoAnterior,
          );
          const nuevaDeuda = redondearMoneda(
            deudaAnteriorGuardada + diferenciaSaldo,
          );
          const nuevoDisponible = redondearMoneda(
            disponibleAnteriorGuardado - diferenciaSaldo,
          );

          if (nuevaDeuda < 0) {
            throw new Error(
              "La edición produciría una deuda negativa en el cliente.",
            );
          }

          if (
            nuevoDisponible < 0 ||
            nuevoDisponible > limiteAnterior
          ) {
            throw new Error(
              `El cliente no cuenta con crédito suficiente. Disponible actual: $${disponibleAnteriorGuardado.toLocaleString("es-MX")}.`,
            );
          }

          if (diferenciaSaldo !== 0) {
            transaction.update(clienteAnteriorRef, {
              deuda_actual: nuevaDeuda,
              credito_disponible: nuevoDisponible,
              updatedAt: serverTimestamp(),
            });
          }
        } else {
          const limiteNuevoCliente = redondearMoneda(
            clienteNuevo.limite_credito,
          );
          const deudaNuevoCliente = redondearMoneda(
            clienteNuevo.deuda_actual,
          );
          const disponibleNuevoCliente = redondearMoneda(
            clienteNuevo.credito_disponible,
          );

          const deudaRestauradaAnterior = redondearMoneda(
            deudaAnteriorGuardada - saldoAnterior,
          );
          const disponibleRestauradoAnterior = redondearMoneda(
            disponibleAnteriorGuardado + saldoAnterior,
          );
          const deudaAplicadaNuevo = redondearMoneda(
            deudaNuevoCliente + saldoNuevo,
          );
          const disponibleAplicadoNuevo = redondearMoneda(
            disponibleNuevoCliente - saldoNuevo,
          );

          if (
            deudaRestauradaAnterior < 0 ||
            disponibleRestauradoAnterior > limiteAnterior
          ) {
            throw new Error(
              "Los datos financieros del cliente original no permiten mover la factura de forma segura.",
            );
          }

          if (
            limiteNuevoCliente <= 0 ||
            disponibleAplicadoNuevo < 0 ||
            disponibleAplicadoNuevo > limiteNuevoCliente
          ) {
            throw new Error(
              `El nuevo cliente no tiene crédito suficiente para recibir un saldo de $${saldoNuevo.toLocaleString("es-MX")}.`,
            );
          }

          transaction.update(clienteAnteriorRef, {
            deuda_actual: deudaRestauradaAnterior,
            credito_disponible: disponibleRestauradoAnterior,
            updatedAt: serverTimestamp(),
          });

          transaction.update(clienteNuevoRef, {
            deuda_actual: deudaAplicadaNuevo,
            credito_disponible: disponibleAplicadoNuevo,
            updatedAt: serverTimestamp(),
          });
        }

        const valoresAnteriores = {
          cliente_id: clienteAnteriorId,
          cliente: facturaAnterior.cliente || clienteAnterior.nombre || "S/N",
          grupo: String(facturaAnterior.grupo || "General"),
          folio: String(facturaAnterior.folio || ""),
          monto_total: montoAnterior,
          emision: convertirFechaAString(facturaAnterior.emision),
          vencimiento: convertirFechaAString(
            facturaAnterior.vencimiento,
          ),
          observaciones: String(facturaAnterior.observaciones || ""),
        };

        const valoresNuevos = {
          cliente_id: clienteNuevoId,
          cliente: clienteNuevo.nombre || "S/N",
          grupo: String(formData?.grupo || clienteNuevo.grupo || "General"),
          folio: folioNuevo,
          monto_total: montoNuevo,
          emision: convertirFechaAString(fechaEmision),
          vencimiento: convertirFechaAString(fechaVencimiento),
          observaciones: String(formData?.observaciones || "").trim(),
        };

        const camposComparables = [
          "cliente_id",
          "grupo",
          "folio",
          "monto_total",
          "emision",
          "vencimiento",
          "observaciones",
        ];

        const camposModificados = camposComparables.filter((campo) => {
          if (campo === "cliente_id") {
            return valoresAnteriores.cliente_id !== valoresNuevos.cliente_id;
          }

          return !valoresIguales(
            valoresAnteriores[campo],
            valoresNuevos[campo],
          );
        });

        if (camposModificados.length === 0) {
          return {
            sinCambios: true,
            factura: facturaAnterior,
          };
        }

        const detalleCambios = camposModificados.map((campo) => {
          const valorAnterior =
            campo === "cliente_id"
              ? valoresAnteriores.cliente
              : valoresAnteriores[campo];
          const valorNuevo =
            campo === "cliente_id"
              ? valoresNuevos.cliente
              : valoresNuevos[campo];

          return `${ETIQUETAS_EDICION[campo]}: ${formatearValorAuditoria(
            campo,
            valorAnterior,
          )} → ${formatearValorAuditoria(campo, valorNuevo)}`;
        });

        const facturaUpdate = {
          cliente_id: clienteNuevoId,
          cliente: valoresNuevos.cliente,
          grupo: valoresNuevos.grupo,
          folio: valoresNuevos.folio,
          monto_total: montoNuevo,
          moneda: "MXN",
          emision: Timestamp.fromDate(fechaEmision),
          vencimiento: Timestamp.fromDate(fechaVencimiento),
          observaciones: valoresNuevos.observaciones,
          monto_pagado: montoPagado,
          saldo_pendiente: saldoNuevo,
          estatus: estatusNuevo,
          ultima_edicion_audit_id: auditRef.id,
          ultima_edicion_actor_uid: actorUid,
          ultima_edicion_at: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        transaction.update(facturaRef, facturaUpdate);

        const estabaVencida = estatusAnteriorReal === "Vencida";
        const quedaVencida = estatusNuevo === "Vencida";
        const estabaPagada = saldoAnterior === 0;
        const quedaPagada = saldoNuevo === 0;
        const estabaPendiente = saldoAnterior > 0;
        const quedaPendiente = saldoNuevo > 0;

        const diferenciaCartera = redondearMoneda(
          saldoNuevo - saldoAnterior,
        );
        const diferenciaTotalFacturado = redondearMoneda(
          montoNuevo - montoAnterior,
        );
        const diferenciaCarteraVencida = redondearMoneda(
          (quedaVencida ? saldoNuevo : 0) -
            (estabaVencida ? saldoAnterior : 0),
        );
        const diferenciaPendientes =
          Number(quedaPendiente) - Number(estabaPendiente);
        const diferenciaPagadas =
          Number(quedaPagada) - Number(estabaPagada);
        const diferenciaVencidas =
          Number(quedaVencida) - Number(estabaVencida);
        const diferenciaLiquidado = redondearMoneda(
          (quedaPagada ? montoNuevo : 0) -
            (estabaPagada ? montoAnterior : 0),
        );

        const statsUpdate = {
          ultima_actualizacion: serverTimestamp(),
        };

        if (diferenciaCartera !== 0) {
          statsUpdate.cartera_total = increment(diferenciaCartera);
        }
        if (diferenciaTotalFacturado !== 0) {
          statsUpdate.total_facturado = increment(
            diferenciaTotalFacturado,
          );
        }
        if (diferenciaCarteraVencida !== 0) {
          statsUpdate.cartera_vencida = increment(
            diferenciaCarteraVencida,
          );
        }
        if (diferenciaPendientes !== 0) {
          statsUpdate.facturas_pendientes = increment(
            diferenciaPendientes,
          );
        }
        if (diferenciaPagadas !== 0) {
          statsUpdate.facturas_pagadas = increment(diferenciaPagadas);
        }
        if (diferenciaVencidas !== 0) {
          statsUpdate.facturas_vencidas = increment(
            diferenciaVencidas,
          );
        }
        if (diferenciaLiquidado !== 0) {
          statsUpdate.total_liquidado = increment(
            diferenciaLiquidado,
          );
        }

        transaction.set(statsRef, statsUpdate, { merge: true });

        const anterioresAudit = {};
        const nuevosAudit = {};

        camposModificados.forEach((campo) => {
          if (campo === "cliente_id") {
            anterioresAudit.cliente_id = valoresAnteriores.cliente_id;
            anterioresAudit.cliente = valoresAnteriores.cliente;
            nuevosAudit.cliente_id = valoresNuevos.cliente_id;
            nuevosAudit.cliente = valoresNuevos.cliente;
          } else {
            anterioresAudit[campo] = valoresAnteriores[campo];
            nuevosAudit[campo] = valoresNuevos[campo];
          }
        });

        transaction.set(auditRef, {
          actor_uid: actorUid,
          usuario: userName || "Usuario",
          modulo: "Facturación",
          tipo: "Edición de Factura",
          factura_id: idFactura,
          folio: valoresNuevos.folio,
          cliente: valoresNuevos.cliente,
          cliente_anterior_id: valoresAnteriores.cliente_id,
          cliente_nuevo_id: valoresNuevos.cliente_id,
          campos_modificados: camposModificados,
          valores_anteriores: anterioresAudit,
          valores_nuevos: nuevosAudit,
          detalle: detalleCambios.join(" | "),
          serverTime: serverTimestamp(),
        });

        return {
          sinCambios: false,
          camposModificados,
          factura: {
            id: idFactura,
            ...facturaAnterior,
            ...facturaUpdate,
          },
        };
      });

      return {
        success: true,
        ...resultado,
      };
    } catch (error) {
      console.error("Error al modificar la factura:", error);

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  aplicarNotaCredito: async ({
    factura,
    montoNota,
    motivo,
    observaciones,
    userName,
    actor_uid,
    solicitudNotaId = "",
  }) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    if (!factura?.id) {
      return {
        success: false,
        error: "No se identificó la factura para aplicar la nota de crédito.",
      };
    }

    try {
      const actorUid = obtenerActorUidSeguro(actor_uid);
      const monto = redondearMoneda(montoNota);

      if (monto <= 0) {
        throw new Error("La nota de crédito debe ser mayor a cero.");
      }

      if (!String(motivo || "").trim()) {
        throw new Error("El motivo de la nota de crédito es obligatorio.");
      }

      const facturaRef = doc(db, FACTURAS_COLLECTION, factura.id);
      const statsRef = doc(db, STATS_COLLECTION, STATS_DOC);
      const auditRef = doc(collection(db, ACTIVIDAD_COLLECTION));
      const solicitudNotaRef = solicitudNotaId
        ? doc(db, SOLICITUDES_NOTAS_CREDITO_COLLECTION, solicitudNotaId)
        : null;

      const resultado = await runTransaction(db, async (transaction) => {
        let solicitudNota = null;

        if (solicitudNotaRef) {
          const solicitudSnap = await transaction.get(solicitudNotaRef);

          if (!solicitudSnap.exists()) {
            throw new Error("La solicitud de nota de crédito ya no existe.");
          }

          solicitudNota = {
            id: solicitudSnap.id,
            ...solicitudSnap.data(),
          };

          if (solicitudNota.estatus !== "Pendiente") {
            throw new Error(
              `La solicitud ya fue resuelta como ${solicitudNota.estatus}.`,
            );
          }
        }

        const facturaSnap = await transaction.get(facturaRef);

        if (!facturaSnap.exists()) {
          throw new Error("La factura ya no existe en Firestore.");
        }

        const facturaActual = {
          id: facturaSnap.id,
          ...facturaSnap.data(),
        };

        if (!facturaActual.cliente_id) {
          throw new Error(
            "La factura no tiene cliente_id y no puede ajustarse de forma segura.",
          );
        }

        const clienteRef = doc(
          db,
          CLIENTES_COLLECTION,
          facturaActual.cliente_id,
        );

        const clienteSnap = await transaction.get(clienteRef);

        if (!clienteSnap.exists()) {
          throw new Error("No se encontró el cliente enlazado a la factura.");
        }

        const cliente = clienteSnap.data();
        const saldoAnterior = redondearMoneda(facturaActual.saldo_pendiente);

        if (saldoAnterior <= 0) {
          throw new Error("No se puede aplicar nota de crédito a una factura liquidada.");
        }

        if (monto > saldoAnterior) {
          throw new Error(
            `La nota de crédito no puede superar el saldo pendiente de $${saldoAnterior.toLocaleString("es-MX")}.`,
          );
        }

        if (solicitudNota) {
          const montoSolicitud = redondearMoneda(solicitudNota.monto_nota);
          if (solicitudNota.factura_id !== facturaActual.id) {
            throw new Error("La solicitud no pertenece a esta factura.");
          }

          if (montoSolicitud !== monto) {
            throw new Error("El monto solicitado no coincide con el monto autorizado.");
          }
        }

        const saldoRestante = redondearMoneda(saldoAnterior - monto);
        const montoPagado = redondearMoneda(facturaActual.monto_pagado);
        const totalNotasActual = redondearMoneda(
          facturaActual.total_notas_credito || 0,
        );
        const totalNotasNuevo = redondearMoneda(totalNotasActual + monto);

        const nuevoEstatus =
          saldoRestante === 0
            ? "Pagada"
            : esFacturaVencida(facturaActual)
              ? "Vencida"
              : "Pendiente";

        const nuevaNota = {
          id_nota: `nc-${Date.now()}`,
          fecha: Timestamp.now(),
          monto,
          motivo: String(motivo || "").trim(),
          observaciones: String(observaciones || "").trim(),
          aplicado_por_uid: actorUid,
          aplicado_por: userName || "SU",
          origen: solicitudNota ? "Solicitud ADMIN autorizada" : "Aplicación directa SU",
          solicitud_nota_id: solicitudNota?.id || "",
          saldo_anterior: saldoAnterior,
          saldo_restante: saldoRestante,
          cancelada: false,
          estado: "Activa",
        };

        transaction.update(facturaRef, {
          saldo_pendiente: saldoRestante,
          estatus: nuevoEstatus,
          notas_credito: arrayUnion(nuevaNota),
          total_notas_credito: totalNotasNuevo,
          ultima_accion: {
            tipo: "Nota de crédito",
            monto,
            fecha: Timestamp.now(),
            usuario: userName || "SU",
          },
          updatedAt: serverTimestamp(),
        });

        const limiteCredito = redondearMoneda(cliente.limite_credito);
        const deudaActual = redondearMoneda(cliente.deuda_actual);
        const creditoDisponible = redondearMoneda(cliente.credito_disponible);

        transaction.update(clienteRef, {
          deuda_actual: Math.max(0, redondearMoneda(deudaActual - monto)),
          credito_disponible:
            limiteCredito > 0
              ? Math.min(
                  limiteCredito,
                  Math.max(0, redondearMoneda(creditoDisponible + monto)),
                )
              : 0,
          updatedAt: serverTimestamp(),
        });

        const estabaVencida =
          saldoAnterior > 0 && esFacturaVencida(facturaActual);

        const statsUpdate = {
          cartera_total: increment(-monto),
          total_notas_credito: increment(monto),
          ultima_actualizacion: serverTimestamp(),
        };

        if (estabaVencida) {
          statsUpdate.cartera_vencida = increment(-monto);
        }

        if (saldoRestante === 0) {
          statsUpdate.facturas_pagadas = increment(1);
          statsUpdate.facturas_pendientes = increment(-1);

          if (estabaVencida) {
            statsUpdate.facturas_vencidas = increment(-1);
          }
        }

        transaction.set(statsRef, statsUpdate, { merge: true });

        if (solicitudNotaRef && solicitudNota) {
          transaction.update(solicitudNotaRef, {
            estatus: "Autorizado",
            resolvedAt: serverTimestamp(),
            resolvedBy: userName || "SU",
            resolvedByUid: actorUid,
            nota_credito_id: nuevaNota.id_nota,
            saldo_restante: saldoRestante,
          });
        }

        transaction.set(auditRef, {
          actor_uid: actorUid,
          usuario: userName || "SU",
          modulo: "Facturación",
          tipo: "Nota de Crédito",
          factura_id: facturaActual.id,
          folio: facturaActual.folio || "S/F",
          cliente: facturaActual.cliente || cliente.nombre || "S/N",
          cliente_id: facturaActual.cliente_id,
          detalle: `El SU aplicó una nota de crédito por $${monto.toLocaleString("es-MX")} a la factura ${facturaActual.folio || "S/F"}. Motivo: ${String(motivo || "").trim()}.`,
          serverTime: serverTimestamp(),
        });

        return {
          nota: nuevaNota,
          factura: {
            ...facturaActual,
            saldo_pendiente: saldoRestante,
            estatus: nuevoEstatus,
            total_notas_credito: totalNotasNuevo,
            monto_pagado: montoPagado,
          },
        };
      });

      return {
        success: true,
        data: resultado,
      };
    } catch (error) {
      console.error("Error al aplicar nota de crédito:", error);

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  cancelarNotaCredito: async ({
    factura,
    idNota,
    motivoCancelacion = "",
    userName,
    actor_uid,
  }) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    if (!factura?.id || !idNota) {
      return {
        success: false,
        error: "No se identificó la factura o la nota de crédito.",
      };
    }

    try {
      const actorUid = obtenerActorUidSeguro(actor_uid);
      const facturaRef = doc(db, FACTURAS_COLLECTION, factura.id);
      const statsRef = doc(db, STATS_COLLECTION, STATS_DOC);
      const auditRef = doc(collection(db, ACTIVIDAD_COLLECTION));

      const resultado = await runTransaction(db, async (transaction) => {
        const facturaSnap = await transaction.get(facturaRef);

        if (!facturaSnap.exists()) {
          throw new Error("La factura ya no existe en Firestore.");
        }

        const facturaActual = {
          id: facturaSnap.id,
          ...facturaSnap.data(),
        };

        if (!facturaActual.cliente_id) {
          throw new Error(
            "La factura no tiene cliente_id y no puede ajustarse de forma segura.",
          );
        }

        const notasCredito = Array.isArray(facturaActual.notas_credito)
          ? facturaActual.notas_credito
          : [];

        const notaObjetivo = notasCredito.find(
          (nota) => nota.id_nota === idNota,
        );

        if (!notaObjetivo) {
          throw new Error("No se encontró la nota de crédito seleccionada.");
        }

        const montoNota = redondearMoneda(notaObjetivo.monto);

        if (montoNota <= 0) {
          throw new Error("La nota de crédito contiene un monto inválido.");
        }

        if (notaObjetivo.cancelada === true || ["Anulada", "Cancelada"].includes(notaObjetivo.estado)) {
          throw new Error("La nota de crédito ya está anulada.");
        }

        const solicitudNotaRef = notaObjetivo.solicitud_nota_id
          ? doc(db, SOLICITUDES_NOTAS_CREDITO_COLLECTION, notaObjetivo.solicitud_nota_id)
          : null;

        const solicitudNotaSnap = solicitudNotaRef
          ? await transaction.get(solicitudNotaRef)
          : null;

        const clienteRef = doc(
          db,
          CLIENTES_COLLECTION,
          facturaActual.cliente_id,
        );

        const clienteSnap = await transaction.get(clienteRef);

        if (!clienteSnap.exists()) {
          throw new Error("No se encontró el cliente enlazado a la factura.");
        }

        const cliente = clienteSnap.data();

        const montoTotal = redondearMoneda(facturaActual.monto_total);
        const montoPagado = redondearMoneda(facturaActual.monto_pagado);
        const saldoActual = redondearMoneda(facturaActual.saldo_pendiente);
        const totalNotasActual = redondearMoneda(
          facturaActual.total_notas_credito || 0,
        );
        const totalNotasNuevo = Math.max(
          0,
          redondearMoneda(totalNotasActual - montoNota),
        );

        const saldoNuevo = Math.max(
          0,
          redondearMoneda(montoTotal - montoPagado - totalNotasNuevo),
        );

        if (saldoNuevo < saldoActual) {
          throw new Error("La eliminación calculó un saldo inválido.");
        }

        const nuevoEstatus =
          saldoNuevo === 0
            ? "Pagada"
            : esFacturaVencida(facturaActual)
              ? "Vencida"
              : "Pendiente";

        const fechaAnulacion = Timestamp.now();
        const motivoAnulacion = String(motivoCancelacion || "").trim();

        const notasActualizadas = notasCredito.map((nota) =>
          nota.id_nota === idNota
            ? {
                ...nota,
                cancelada: true,
                estado: "Anulada",
                fecha_anulacion: fechaAnulacion,
                anulada_por: userName || "SU",
                anulada_por_uid: actorUid,
                motivo_cancelacion: motivoAnulacion,
                saldo_revertido: saldoNuevo,
              }
            : nota,
        );

        transaction.update(facturaRef, {
          saldo_pendiente: saldoNuevo,
          estatus: nuevoEstatus,
          notas_credito: notasActualizadas,
          total_notas_credito: totalNotasNuevo,
          ultima_accion: {
            tipo: "Eliminación de nota de crédito",
            monto: montoNota,
            fecha: Timestamp.now(),
            usuario: userName || "SU",
          },
          updatedAt: serverTimestamp(),
        });

        const limiteCredito = redondearMoneda(cliente.limite_credito);
        const deudaActual = redondearMoneda(cliente.deuda_actual);
        const creditoDisponible = redondearMoneda(cliente.credito_disponible);

        transaction.update(clienteRef, {
          deuda_actual: redondearMoneda(deudaActual + montoNota),
          credito_disponible:
            limiteCredito > 0
              ? Math.max(0, redondearMoneda(creditoDisponible - montoNota))
              : 0,
          updatedAt: serverTimestamp(),
        });

        const quedaVencida = saldoNuevo > 0 && esFacturaVencida(facturaActual);
        const estabaPagada = saldoActual === 0;

        const statsUpdate = {
          cartera_total: increment(montoNota),
          total_notas_credito: increment(-montoNota),
          ultima_actualizacion: serverTimestamp(),
        };

        if (quedaVencida) {
          statsUpdate.cartera_vencida = increment(montoNota);
        }

        if (estabaPagada && saldoNuevo > 0) {
          statsUpdate.facturas_pagadas = increment(-1);

          if (quedaVencida) {
            statsUpdate.facturas_vencidas = increment(1);
          } else {
            statsUpdate.facturas_pendientes = increment(1);
          }
        }

        transaction.set(statsRef, statsUpdate, { merge: true });

        if (solicitudNotaRef && solicitudNotaSnap?.exists()) {
          transaction.update(solicitudNotaRef, {
            estatus: "Anulada",
            nota_anulada: true,
            anuladaAt: serverTimestamp(),
            anuladaBy: userName || "SU",
            anuladaByUid: actorUid,
            motivo_anulacion: String(motivoCancelacion || "").trim(),
          });
        }

        transaction.set(auditRef, {
          actor_uid: actorUid,
          usuario: userName || "SU",
          modulo: "Facturación",
          tipo: "Anulación de Nota de Crédito",
          factura_id: facturaActual.id,
          folio: facturaActual.folio || "S/F",
          cliente: facturaActual.cliente || cliente.nombre || "S/N",
          cliente_id: facturaActual.cliente_id,
          monto: montoNota,
          motivo: notaObjetivo.motivo || "Sin motivo",
          motivo_cancelacion: String(motivoCancelacion || "").trim(),
          detalle: `El SU anuló/revirtió una nota de crédito por $${montoNota.toLocaleString("es-MX")} de la factura ${facturaActual.folio || "S/F"}. La nota quedó visible como ANULADA en el historial.`,
          serverTime: serverTimestamp(),
        });

        return {
          factura: {
            ...facturaActual,
            saldo_pendiente: saldoNuevo,
            estatus: nuevoEstatus,
            total_notas_credito: totalNotasNuevo,
            notas_credito: notasActualizadas,
          },
        };
      });

      return {
        success: true,
        data: resultado,
      };
    } catch (error) {
      console.error("Error al eliminar nota de crédito:", error);

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  eliminarFactura: async ({
    idFactura,
    userName,
    actor_uid,
  }) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    if (!idFactura) {
      return {
        success: false,
        error: "No se identificó la factura que será eliminada.",
      };
    }

    try {
      const actorUid = obtenerActorUidSeguro(actor_uid);
      const facturaRef = doc(db, FACTURAS_COLLECTION, idFactura);
      const statsRef = doc(db, STATS_COLLECTION, STATS_DOC);
      const auditRef = doc(collection(db, ACTIVIDAD_COLLECTION));

      const resultado = await runTransaction(db, async (transaction) => {
        const facturaSnap = await transaction.get(facturaRef);

        if (!facturaSnap.exists()) {
          throw new Error("La factura ya no existe en Firestore.");
        }

        const factura = {
          id: facturaSnap.id,
          ...facturaSnap.data(),
        };

        if (!factura.cliente_id) {
          throw new Error(
            "La factura no tiene cliente_id y no puede eliminarse de forma segura.",
          );
        }

        const clienteRef = doc(
          db,
          CLIENTES_COLLECTION,
          factura.cliente_id,
        );

        const clienteSnap = await transaction.get(clienteRef);

        if (!clienteSnap.exists()) {
          throw new Error(
            "No se encontró el cliente enlazado a la factura.",
          );
        }

        const cliente = clienteSnap.data();

        const montoTotal = redondearMoneda(factura.monto_total);
        const saldoPendiente = redondearMoneda(
          factura.saldo_pendiente,
        );
        const montoPagado = redondearMoneda(
          Number.isFinite(Number(factura.monto_pagado))
            ? factura.monto_pagado
            : Math.max(0, montoTotal - saldoPendiente),
        );

        const abonos = Array.isArray(factura.abonos)
          ? factura.abonos
          : [];

        const totalAbonosRegistrados = redondearMoneda(
          abonos.reduce(
            (total, abono) => total + (Number(abono.monto) || 0),
            0,
          ),
        );

        const abonosMes = redondearMoneda(
          abonos.reduce(
            (total, abono) =>
              total +
              (esMismoMes(abono.fecha) ? Number(abono.monto) || 0 : 0),
            0,
          ),
        );

        const abonosSemana = redondearMoneda(
          abonos.reduce(
            (total, abono) =>
              total +
              (esMismaSemana(abono.fecha)
                ? Number(abono.monto) || 0
                : 0),
            0,
          ),
        );

        const estabaVencida =
          saldoPendiente > 0 && esFacturaVencida(factura);
        const estabaPagada = saldoPendiente === 0;
        const estabaPendiente = saldoPendiente > 0;

        const limiteCredito = redondearMoneda(cliente.limite_credito);
        const deudaActual = redondearMoneda(cliente.deuda_actual);
        const creditoDisponible = redondearMoneda(
          cliente.credito_disponible,
        );

        const nuevaDeuda = Math.max(
          0,
          redondearMoneda(deudaActual - saldoPendiente),
        );

        const nuevoCreditoDisponible =
          limiteCredito > 0
            ? Math.min(
                limiteCredito,
                Math.max(
                  0,
                  redondearMoneda(
                    creditoDisponible + saldoPendiente,
                  ),
                ),
              )
            : 0;

        transaction.update(clienteRef, {
          deuda_actual: nuevaDeuda,
          credito_disponible: nuevoCreditoDisponible,
          updatedAt: serverTimestamp(),
        });

        const statsUpdate = {
          facturas_total: increment(-1),
          total_facturado: increment(-montoTotal),
          ultima_actualizacion: serverTimestamp(),
        };

        if (saldoPendiente > 0) {
          statsUpdate.cartera_total = increment(-saldoPendiente);
        }

        if (estabaPendiente) {
          statsUpdate.facturas_pendientes = increment(-1);
        }

        if (estabaPagada) {
          statsUpdate.facturas_pagadas = increment(-1);
          statsUpdate.total_liquidado = increment(-montoTotal);
        }

        if (estabaVencida) {
          statsUpdate.facturas_vencidas = increment(-1);
          statsUpdate.cartera_vencida = increment(-saldoPendiente);
        }

        if (montoPagado > 0) {
          statsUpdate.cobrado_historico = increment(-montoPagado);
        }

        const totalAbonosARevertir =
          totalAbonosRegistrados > 0
            ? totalAbonosRegistrados
            : montoPagado;

        if (totalAbonosARevertir > 0) {
          statsUpdate.abonos_registrados = increment(
            -totalAbonosARevertir,
          );
        }

        if (abonosMes > 0) {
          statsUpdate.ingresos_mes = increment(-abonosMes);
        }

        if (abonosSemana > 0) {
          statsUpdate.ingresos_semana = increment(-abonosSemana);
        }

        transaction.set(statsRef, statsUpdate, { merge: true });

        transaction.set(auditRef, {
          actor_uid: actorUid,
          usuario: userName || "SU",
          modulo: "Facturación",
          tipo: "Eliminación de Factura",
          factura_id: idFactura,
          folio: factura.folio || "S/F",
          cliente: factura.cliente || cliente.nombre || "S/N",
          cliente_id: factura.cliente_id,
          valores_eliminados: {
            folio: factura.folio || "",
            cliente: factura.cliente || "",
            cliente_id: factura.cliente_id || "",
            monto_total: montoTotal,
            monto_pagado: montoPagado,
            saldo_pendiente: saldoPendiente,
            estatus: factura.estatus || "",
            abonos: abonos.length,
          },
          detalle: `El SU eliminó la factura ${factura.folio || "S/F"} de ${factura.cliente || cliente.nombre || "S/N"}. Se ajustaron saldo del cliente, crédito disponible, métricas globales y auditoría.`,
          serverTime: serverTimestamp(),
        });

        transaction.delete(facturaRef);

        return {
          folio: factura.folio || "S/F",
          cliente: factura.cliente || cliente.nombre || "S/N",
        };
      });

      return {
        success: true,
        data: resultado,
      };
    } catch (error) {
      console.error("Error al eliminar la factura:", error);

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },
};
</file>

<file path="src/context/GlobalProvider.jsx">
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { useLocation } from "react-router-dom";

import { db } from "../config/firebase";
import { clientesService } from "../services/clientesService";
import { facturasService } from "../services/facturasService";
import { solicitudesService } from "../services/solicitudesService";
import { formatearFechaSegura } from "../utils/normalizadores";
import { normalizarFacturaSnapshot } from "../utils/normalizarFactura";
import { AuthContext } from "./AuthContext";
import { GlobalContext } from "./GlobalContext";

const AUTH_DATA_VACIO = Object.freeze({});
const CLIENTES_COLLECTION = "clientes";
const FACTURAS_COLLECTION = "facturas";
const STATS_COLLECTION = "metricas_globales";
const STATS_DOC = "stats_actuales";
const ACTIVIDAD_COLLECTION = "actividad";
const SOLICITUDES_COLLECTION = "solicitudes";
const SOLICITUDES_NOTAS_CREDITO_COLLECTION = "solicitudes_notas_credito";

const ordenarFacturas = (lista) =>
  [...lista].sort((primera, segunda) => {
    const fechaPrimera =
      primera.emision?.toDate?.().getTime?.() ||
      new Date(primera.emision || 0).getTime() ||
      0;

    const fechaSegunda =
      segunda.emision?.toDate?.().getTime?.() ||
      new Date(segunda.emision || 0).getTime() ||
      0;

    return fechaSegunda - fechaPrimera;
  });

const rutaNecesitaFacturasGlobales = () => false;

export const GlobalProvider = ({ children }) => {
  const authContextValue = useContext(AuthContext);
  const authData = authContextValue ?? AUTH_DATA_VACIO;

  const valorSinSesion = useMemo(
    () => ({
      ...authData,
      authLoading: authData.loading,
      stats: {
        cartera_total: 0,
        cartera_vencida: 0,
        ingresos_mes: 0,
        ingresos_semana: 0,
        clientes_activos: 0,
        facturas_pendientes: 0,
        facturas_pagadas: 0,
        facturas_vencidas: 0,
        facturas_total: 0,
        total_facturado: 0,
        total_liquidado: 0,
        cobrado_historico: 0,
        abonos_registrados: 0,
        monto_recuperado: 0,
        total_notas_credito: 0,
      },
      clientes: [],
      facturas: [],
      actividad: [],
      solicitudes: [],
      solicitudesNotasCredito: [],
      usuarios: [],
    }),
    [authData],
  );

  if (!authData.currentUser) {
    return (
      <GlobalContext.Provider value={valorSinSesion}>
        {children}
      </GlobalContext.Provider>
    );
  }

  return (
    <GlobalDataProvider authData={authData}>{children}</GlobalDataProvider>
  );
};

function GlobalDataProvider({ authData, children }) {
  const location = useLocation();
  const { currentUser, userName, userRole } = authData;
  const actorUid = currentUser.uid;
  const necesitaFacturasGlobales = rutaNecesitaFacturasGlobales(
    location.pathname,
  );

  const [clientes, setClientes] = useState([]);
  const [facturasGlobales, setFacturasGlobales] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [solicitudesNotasCredito, setSolicitudesNotasCredito] = useState([]);
  const [actividad, setActividad] = useState([]);
  const [statsDB, setStatsDB] = useState({
    cartera_total: 0,
    cartera_vencida: 0,
    ingresos_mes: 0,
    ingresos_semana: 0,
    clientes_activos: 0,
    facturas_pendientes: 0,
    facturas_pagadas: 0,
    facturas_vencidas: 0,
    facturas_total: 0,
    total_facturado: 0,
    total_liquidado: 0,
    cobrado_historico: 0,
    abonos_registrados: 0,
    monto_recuperado: 0,
    total_notas_credito: 0,
  });

  useEffect(() => {
    if (!actorUid) {
      return undefined;
    }

    let unsubActividad = () => {};

    if (userRole === "SU") {
      const qActividad = query(
        collection(db, ACTIVIDAD_COLLECTION),
        orderBy("serverTime", "desc"),
        limit(100),
      );

      unsubActividad = onSnapshot(
        qActividad,
        (snap) => {
          setActividad(
            snap.docs.map((documento) => {
              const data = documento.data();

              return {
                id: documento.id,
                ...data,
                fechaHora: formatearFechaSegura(
                  data.serverTime || data.fechaHora,
                  "Sin fecha",
                ),
              };
            }),
          );
        },
        (error) => {
          console.error("Error escuchando la actividad:", error);
        },
      );
    }

    const unsubClientes = onSnapshot(
      collection(db, CLIENTES_COLLECTION),
      (snap) => {
        setClientes(
          snap.docs.map((documento) => ({
            id: documento.id,
            ...documento.data(),
          })),
        );
      },
      (error) => {
        console.error("Error escuchando clientes:", error);
      },
    );

    const unsubStats = onSnapshot(
      doc(db, STATS_COLLECTION, STATS_DOC),
      (docSnap) => {
        if (docSnap.exists()) {
          setStatsDB(docSnap.data());
        }
      },
      (error) => {
        console.error("Error escuchando métricas:", error);
      },
    );

    const qSolicitudes = query(
      collection(db, SOLICITUDES_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(100),
    );

    const unsubSolicitudes = onSnapshot(
      qSolicitudes,
      (snap) => {
        const dataNormalizada = snap.docs.map((documento) => {
          const data = documento.data();

          return {
            id: documento.id,
            ...data,
            fecha: formatearFechaSegura(
              data.createdAt || data.fecha,
              "Sin fecha",
            ),
          };
        });

        setSolicitudes(dataNormalizada);
      },
      (error) => {
        console.error("Error escuchando solicitudes:", error);
      },
    );

    const qSolicitudesNotasCredito = query(
      collection(db, SOLICITUDES_NOTAS_CREDITO_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(100),
    );

    const unsubSolicitudesNotasCredito = onSnapshot(
      qSolicitudesNotasCredito,
      (snap) => {
        const dataNormalizada = snap.docs.map((documento) => {
          const data = documento.data();

          return {
            id: documento.id,
            ...data,
            fecha: formatearFechaSegura(
              data.createdAt || data.fecha,
              "Sin fecha",
            ),
          };
        });

        setSolicitudesNotasCredito(dataNormalizada);
      },
      (error) => {
        console.error("Error escuchando solicitudes de notas de crédito:", error);
      },
    );

    return () => {
      unsubClientes();
      unsubStats();
      unsubActividad();
      unsubSolicitudes();
      unsubSolicitudesNotasCredito();
    };
  }, [actorUid, userRole]);

  useEffect(() => {
    if (!actorUid || !necesitaFacturasGlobales) {
      return undefined;
    }

    const unsubFacturas = onSnapshot(
      collection(db, FACTURAS_COLLECTION),
      (snap) => {
        const facturasNormalizadas = snap.docs.map((documento) =>
          normalizarFacturaSnapshot(documento),
        );

        setFacturasGlobales(ordenarFacturas(facturasNormalizadas));
      },
      (error) => {
        console.error("Error escuchando facturas globales:", error);
      },
    );

    return () => {
      unsubFacturas();
    };
  }, [actorUid, necesitaFacturasGlobales]);

  const facturas = useMemo(
    () => (necesitaFacturasGlobales ? facturasGlobales : []),
    [necesitaFacturasGlobales, facturasGlobales],
  );

  const stats = useMemo(() => {
    const clientesReales = clientes.filter(
      (cliente) => cliente.activo !== false && cliente.estatus !== "Inactivo",
    );

    return {
      ...statsDB,
      cartera_total: Number(statsDB.cartera_total) || 0,
      cartera_vencida: Number(statsDB.cartera_vencida) || 0,
      ingresos_mes: Number(statsDB.ingresos_mes) || 0,
      ingresos_semana: Number(statsDB.ingresos_semana) || 0,
      clientes_activos:
        Number(statsDB.clientes_activos) || clientesReales.length,
      facturas_pendientes: Number(statsDB.facturas_pendientes) || 0,
      facturas_pagadas: Number(statsDB.facturas_pagadas) || 0,
      facturas_vencidas: Number(statsDB.facturas_vencidas) || 0,
      facturas_total: Number(statsDB.facturas_total) || 0,
      total_facturado: Number(statsDB.total_facturado) || 0,
      total_liquidado: Number(statsDB.total_liquidado) || 0,
      cobrado_historico: Number(statsDB.cobrado_historico) || 0,
      abonos_registrados: Number(statsDB.abonos_registrados) || 0,
      monto_recuperado:
        Number(statsDB.monto_recuperado) || Number(statsDB.cobrado_historico) || 0,
      total_notas_credito: Number(statsDB.total_notas_credito) || 0,
    };
  }, [clientes, statsDB]);

  const crearFacturaEnNube = useCallback(
    async (formData) => {
      if (!actorUid) {
        return {
          success: false,
          error: "No se identificó al usuario responsable.",
        };
      }

      return facturasService.crearFactura({
        formData,
        clientes,
        userName,
        actor_uid: actorUid,
      });
    },
    [clientes, actorUid, userName],
  );

  const registrarAbonoEnNube = useCallback(
    async (factura, montoAbonado, metodoPago) => {
      if (!actorUid) {
        return {
          success: false,
          error: "No se identificó al usuario responsable.",
        };
      }

      return facturasService.registrarAbono({
        factura,
        montoAbonado,
        metodoPago,
        clientes,
        userName,
        actor_uid: actorUid,
      });
    },
    [clientes, actorUid, userName],
  );

  const eliminarAbonoEnNube = useCallback(
    async (idFactura, idAbono) => {
      if (!actorUid) {
        return {
          success: false,
          error: "No se identificó al usuario responsable.",
        };
      }

      return facturasService.eliminarAbono({
        idFactura,
        idAbono,
        userName,
        actor_uid: actorUid,
      });
    },
    [actorUid, userName],
  );


  const aplicarNotaCreditoEnNube = useCallback(
    async (factura, montoNota, motivo, observaciones = "") => {
      if (userRole !== "SU") {
        return {
          success: false,
          error: "Solo el SU puede aplicar notas de crédito.",
        };
      }

      if (!actorUid) {
        return {
          success: false,
          error: "No se identificó al usuario responsable.",
        };
      }

      return facturasService.aplicarNotaCredito({
        factura,
        montoNota,
        motivo,
        observaciones,
        userName,
        actor_uid: actorUid,
      });
    },
    [actorUid, userName, userRole],
  );


  const solicitarNotaCreditoEnNube = useCallback(
    async (factura, montoNota, motivo, observaciones = "") => {
      if (userRole !== "ADMIN") {
        return {
          success: false,
          error: "Solo el ADMIN puede solicitar notas de crédito.",
        };
      }

      if (!actorUid) {
        return {
          success: false,
          error: "No se identificó al usuario responsable.",
        };
      }

      return solicitudesService.crearSolicitudNotaCredito({
        factura,
        montoNota,
        motivo,
        observaciones,
        solicitado_por_uid: actorUid,
        solicitado_por_nombre: userName || "ADMIN",
      });
    },
    [actorUid, userName, userRole],
  );

  const cancelarNotaCreditoEnNube = useCallback(
    async (factura, idNota, motivoCancelacion = "") => {
      if (userRole !== "SU") {
        return {
          success: false,
          error: "Solo el SU puede cancelar notas de crédito.",
        };
      }

      if (!actorUid) {
        return {
          success: false,
          error: "No se identificó al usuario responsable.",
        };
      }

      return facturasService.cancelarNotaCredito({
        factura,
        idNota,
        motivoCancelacion,
        userName,
        actor_uid: actorUid,
      });
    },
    [actorUid, userName, userRole],
  );

  const modificarFacturaEnNube = useCallback(
    async (idFactura, formData) => {
      if (!actorUid) {
        return {
          success: false,
          error: "No se identificó al usuario responsable.",
        };
      }

      return facturasService.modificarFactura({
        idFactura,
        formData,
        userName,
        actor_uid: actorUid,
      });
    },
    [actorUid, userName],
  );

  const eliminarFacturaEnNube = useCallback(
    async (idFactura) => {
      if (userRole !== "SU") {
        return {
          success: false,
          error: "Solo el SU puede eliminar facturas.",
        };
      }

      if (!actorUid) {
        return {
          success: false,
          error: "No se identificó al usuario responsable.",
        };
      }

      return facturasService.eliminarFactura({
        idFactura,
        userName,
        actor_uid: actorUid,
      });
    },
    [actorUid, userName, userRole],
  );

  const eliminarClienteEnNube = useCallback(
    async (id, nombreCliente, motivo) => {
      if (!actorUid) {
        return {
          success: false,
          error: "No se identificó al usuario responsable.",
        };
      }

      return clientesService.eliminarCliente(
        id,
        nombreCliente,
        userName,
        actorUid,
        motivo,
      );
    },
    [actorUid, userName],
  );

  const reactivarClienteEnNube = useCallback(
    async (id, nombreCliente, motivo) => {
      if (!actorUid) {
        return {
          success: false,
          error: "No se identificó al usuario responsable.",
        };
      }

      return clientesService.reactivarCliente(
        id,
        nombreCliente,
        userName,
        actorUid,
        motivo,
      );
    },
    [actorUid, userName],
  );

  const actividadVisible = useMemo(
    () => (userRole === "SU" ? actividad : []),
    [actividad, userRole],
  );

  const contextValue = useMemo(
    () => ({
      ...authData,
      authLoading: authData.loading,
      stats,
      clientes,
      setClientes,
      eliminarClienteEnNube,
      reactivarClienteEnNube,
      facturas,
      setFacturas: setFacturasGlobales,
      crearFacturaEnNube,
      modificarFacturaEnNube,
      eliminarFacturaEnNube,
      registrarAbonoEnNube,
      eliminarAbonoEnNube,
      aplicarNotaCreditoEnNube,
      solicitarNotaCreditoEnNube,
      cancelarNotaCreditoEnNube,
      actividad: actividadVisible,
      setActividad,
      solicitudes,
      setSolicitudes,
      solicitudesNotasCredito,
      setSolicitudesNotasCredito,
      usuarios: [],
    }),
    [
      authData,
      stats,
      clientes,
      eliminarClienteEnNube,
      reactivarClienteEnNube,
      facturas,
      crearFacturaEnNube,
      modificarFacturaEnNube,
      eliminarFacturaEnNube,
      registrarAbonoEnNube,
      eliminarAbonoEnNube,
      aplicarNotaCreditoEnNube,
      solicitarNotaCreditoEnNube,
      cancelarNotaCreditoEnNube,
      actividadVisible,
      solicitudes,
      solicitudesNotasCredito,
    ],
  );

  return (
    <GlobalContext.Provider value={contextValue}>
      {children}
    </GlobalContext.Provider>
  );
}
</file>

</files>
