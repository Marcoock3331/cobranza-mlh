import { KeyRound, Mail, Power, UserPlus, Users } from "lucide-react";
import { textoSeguro } from "../../utils/normalizadores";

function KpiPersonal({ etiqueta, valor, descripcion }) {
  return (
    <article className="rounded-2xl border border-white bg-white/65 p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-wide text-gray-500">
        {etiqueta}
      </p>
      <p className="mt-1 text-2xl font-black text-[#0a192f]">
        {valor}
      </p>
      <p className="mt-1 text-[11px] text-gray-500">
        {descripcion}
      </p>
    </article>
  );
}

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
      {activo ? "Operativo" : "Suspendido"}
    </span>
  );
}

function AccesoBadge({ usuario }) {
  const esCorreoReal =
    usuario.correo && !String(usuario.correo).toLowerCase().endsWith("@mlh.local");

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${
        esCorreoReal
          ? "border-blue-100 bg-blue-50 text-blue-700"
          : "border-amber-100 bg-amber-50 text-amber-700"
      }`}
    >
      {esCorreoReal ? "Correo real" : "Legacy local"}
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
}) {
  const activos = administradores.filter((usuario) => usuario.activo);
  const suspendidos = administradores.filter((usuario) => !usuario.activo);
  const conCorreoReal = administradores.filter(puedeRecuperarPassword);
  const ultimoAcceso = administradores.find(
    (usuario) => usuario.ultima_entrada && usuario.ultima_entrada !== "Nunca",
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiPersonal
          etiqueta="ADMIN activos"
          valor={activos.length}
          descripcion="Cuentas operativas con acceso al sistema."
        />

        <KpiPersonal
          etiqueta="Suspendidos"
          valor={suspendidos.length}
          descripcion="Cuentas sin operación activa."
        />

        <KpiPersonal
          etiqueta="Correo real"
          valor={conCorreoReal.length}
          descripcion={
            ultimoAcceso
              ? `Último acceso: ${textoSeguro(ultimoAcceso.nombre)}`
              : "Accesos listos para recuperación por correo."
          }
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-white bg-white/55 shadow-[8px_10px_28px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-3 border-b border-white/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <Users className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-sm font-black text-[#0a192f]">
                Control de Personal
              </h2>
              <p className="text-[11px] text-gray-500">
                Administración de accesos ADMIN con alias y correo real.
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

        {administradores.length === 0 ? (
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
                          <AccesoBadge usuario={usuario} />
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
                        {resetDisponible ? "Enviar recuperación" : "Requiere migración"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto custom-scrollbar md:block">
              <table className="w-full min-w-[880px] text-left text-xs">
                <thead>
                  <tr className="border-b border-white/70 bg-white/45 text-[10px] uppercase tracking-wide text-gray-400">
                    <th className="px-4 py-3 font-black">Usuario</th>
                    <th className="px-4 py-3 font-black">Correo real</th>
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
                          <div className="flex max-w-[260px] items-center gap-2">
                            <Mail className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                            <span className="truncate font-mono text-[10px] text-gray-500">
                              {textoSeguro(usuario.correo, "Sin correo")}
                            </span>
                          </div>
                          <div className="mt-1">
                            <AccesoBadge usuario={usuario} />
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
                              {resetDisponible ? "Recuperar" : "Migrar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
