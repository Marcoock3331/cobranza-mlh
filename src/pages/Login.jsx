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
