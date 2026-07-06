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
                  placeholder="mlhcobranza.admin@gmail.com"
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

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-[11px] leading-relaxed text-blue-700">
                El acceso se creará con correo real y alias de usuario. Ya no se generarán nuevas cuentas @mlh.local.
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