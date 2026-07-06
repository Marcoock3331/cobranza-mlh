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