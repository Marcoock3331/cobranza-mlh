import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  CreditCard,
  FileText,
  Shield,
  UserCheck,
  Users,
} from "lucide-react";

import { actividadEsCritica, formatearMoneda, formatearFechaFirestore } from "./suUtils";
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
  administradores,
  solicitudesNotasOrdenadas,
  resumenesLineaCredito,
  actividad,
  onCambiarTab,
}) {
  const solicitudesPendientes = solicitudesNotasOrdenadas.filter(
    (solicitud) => solicitud.estatus === "Pendiente",
  );

  const solicitudesResueltas = solicitudesNotasOrdenadas.filter(
    (solicitud) => solicitud.estatus !== "Pendiente",
  );

  const usuariosActivos = administradores.filter((usuario) => usuario.activo);
  const usuariosSuspendidos = administradores.filter((usuario) => !usuario.activo);

  const movimientosCriticos = (actividad || []).filter(actividadEsCritica);
  const movimientosLinea = (actividad || []).filter(
    (item) => item.modulo === "Crédito" && item.tipo === "Movimiento de Línea",
  );

  const montoNetoLinea = (resumenesLineaCredito || []).reduce(
    (total, resumen) => total + (Number(resumen.limite_actual) || 0),
    0,
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
    usuariosSuspendidos.length > 0 && {
      id: "usuarios-suspendidos",
      titulo: "Usuarios suspendidos",
      descripcion: `${usuariosSuspendidos.length} cuenta(s) ADMIN sin acceso operativo.`,
      accion: "Revisar personal",
      tab: "usuarios",
    },
  ].filter(Boolean);

  const ultimosMovimientos = [...(actividad || [])].slice(0, 5);

  return (
    <div className="space-y-4 md:space-y-6">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
          titulo="Clientes con línea"
          valor={(resumenesLineaCredito || []).length}
          descripcion={`Líneas auditadas. Total visible: $${formatearMoneda(montoNetoLinea)}.`}
          icono={CreditCard}
          variante="azul"
        />

        <KpiSU
          titulo="Usuarios activos"
          valor={usuariosActivos.length}
          descripcion={`${usuariosSuspendidos.length} suspendido(s).`}
          icono={UserCheck}
          variante="morado"
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