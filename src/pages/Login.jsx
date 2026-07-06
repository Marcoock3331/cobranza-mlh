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
import fondoLogin from "../assets/fondo-login.jpg";

const ALIAS_COLLECTION = "login_aliases";

const normalizarAliasLogin = (valor = "") =>
  String(valor || "")
    .trim()
    .toLowerCase();

const esCorreo = (valor = "") => String(valor || "").includes("@");

const aliasValido = (valor = "") => /^[a-z0-9._-]+$/.test(valor);

const correoRealValido = (valor = "") => {
  const correoNormalizado = String(valor || "")
    .trim()
    .toLowerCase();

  return (
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoNormalizado) &&
    !correoNormalizado.endsWith("@mlh.local")
  );
};

const crearErrorAlias = (mensaje) => {
  const errorAlias = new Error(mensaje);
  errorAlias.name = "AliasLoginError";
  return errorAlias;
};

const resolverCorreoAuth = async (usuarioCapturado) => {
  const usuarioNormalizado = normalizarAliasLogin(usuarioCapturado);

  if (!usuarioNormalizado) {
    throw crearErrorAlias("Captura tu usuario de acceso.");
  }

  if (esCorreo(usuarioNormalizado)) {
    throw crearErrorAlias("Escribe solo tu usuario de acceso, no el correo.");
  }

  if (!aliasValido(usuarioNormalizado)) {
    throw crearErrorAlias(
      "El usuario de acceso solo puede contener letras, números, puntos, guiones y guion bajo.",
    );
  }

  try {
    const aliasRef = doc(db, ALIAS_COLLECTION, usuarioNormalizado);
    const aliasSnap = await getDoc(aliasRef);

    if (!aliasSnap.exists()) {
      throw crearErrorAlias("Usuario no encontrado o sin alias activo.");
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

    console.warn("No fue posible validar el alias de acceso:", error);

    throw crearErrorAlias(
      "No fue posible validar tu usuario de acceso. Intenta nuevamente.",
    );
  }
};

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

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setInfo("");
    clearAuthError?.();
    localStorage.removeItem("authError");

    if (!username.trim() || !password) {
      setError("Por favor, ingrese su usuario y contraseña.");
      return;
    }

    setIsAuthenticating(true);

    try {
      await setPersistence(auth, browserSessionPersistence);

      const correoAuth = await resolverCorreoAuth(username);

      await signInWithEmailAndPassword(auth, correoAuth, password);
    } catch (errorLogin) {
      let mensajeError =
        "Credenciales incorrectas. Verifique su usuario y contraseña.";

      if (errorLogin.name === "AliasLoginError") {
        mensajeError = errorLogin.message;
      } else if (errorLogin.code === "auth/user-disabled") {
        mensajeError = "Su acceso ha sido inhabilitado administrativamente.";
      } else if (errorLogin.code === "auth/too-many-requests") {
        mensajeError =
          "Múltiples intentos fallidos. Su cuenta está bloqueada temporalmente.";
      } else if (errorLogin.code === "auth/invalid-credential") {
        mensajeError =
          "Credenciales incorrectas. Verifique su usuario y contraseña.";
      } else if (errorLogin.message) {
        mensajeError = errorLogin.message;
      }

      setError(mensajeError);

      console.error("Error de autenticación:", errorLogin);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleRecuperarPassword = async () => {
    setError("");
    setInfo("");
    clearAuthError?.();
    localStorage.removeItem("authError");

    if (!username.trim()) {
      setError("Primero escribe tu usuario de acceso.");
      return;
    }

    setIsResetting(true);

    try {
      const correoAuth = await resolverCorreoAuth(username);

      await sendPasswordResetEmail(auth, correoAuth);

      setInfo(
        "Se envió un correo de recuperación al correo real vinculado con este usuario.",
      );
    } catch (errorReset) {
      let mensajeError =
        "No fue posible enviar el correo de recuperación. Verifica el usuario.";

      if (errorReset.name === "AliasLoginError") {
        mensajeError = errorReset.message;
      } else if (errorReset.code === "auth/user-not-found") {
        mensajeError = "No existe una cuenta vinculada a este usuario.";
      } else if (errorReset.code === "auth/too-many-requests") {
        mensajeError =
          "Firebase bloqueó temporalmente los intentos de recuperación.";
      } else if (errorReset.message) {
        mensajeError = errorReset.message;
      }

      setError(mensajeError);
      console.error("Error enviando recuperación:", errorReset);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full relative flex flex-col items-center justify-center font-sans select-none bg-[#0a192f] overflow-x-hidden">
      <div
        className="fixed inset-0 w-full h-full bg-cover bg-no-repeat z-0 pointer-events-none"
        style={{
          backgroundImage: `url(${fondoLogin})`,
          backgroundPosition: "center 20%",
        }}
      ></div>

      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/50 z-0 pointer-events-none"></div>

      <div className="relative z-10 w-full flex flex-col items-center p-4 py-8">
        <div className="bg-white/[0.06] backdrop-blur-2xl rounded-3xl p-6 md:p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)] w-full max-w-xs md:max-w-sm border border-white/15 transition-all">
          <div className="flex flex-col items-center mb-6 md:mb-7 space-y-3">
            <img
              src={logoMadereria}
              alt="Maderería La Huerta"
              className="h-14 md:h-16 w-auto object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]"
            />
            <div className="w-4/5 border-t border-white/10"></div>
            <img
              src={logoMLH}
              alt="MLH Cobranza"
              className="h-[70px] md:h-[80px] w-auto object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]"
            />
          </div>

          <h1 className="text-lg font-bold text-center text-white/90 mb-5 md:mb-6 tracking-widest uppercase font-mono text-xs">
            Control de Acceso
          </h1>

          {errorVisible && (
            <div className="mb-4 md:mb-5 p-3 bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-200 text-[11px] md:text-xs font-semibold rounded-xl text-center animate-fade-in shadow-md">
              {errorVisible}
            </div>
          )}

          {info && (
            <div className="mb-4 md:mb-5 p-3 bg-green-500/15 backdrop-blur-md border border-green-500/25 text-green-100 text-[11px] md:text-xs font-semibold rounded-xl text-center animate-fade-in shadow-md">
              {info}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-[10px] font-black uppercase text-white/60 tracking-widest mb-1.5">
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-white/40" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isAuthenticating || isResetting}
                  className="block w-full pl-10 pr-3 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-[#ffd700] focus:bg-white/[0.08] focus:border-transparent transition-all disabled:bg-black/30 disabled:text-white/20"
                  placeholder="Ingresa tu usuario"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-white/60 tracking-widest mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-white/40" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isAuthenticating || isResetting}
                  className="block w-full pl-10 pr-3 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-[#ffd700] focus:bg-white/[0.08] focus:border-transparent transition-all disabled:bg-black/30 disabled:text-white/20"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className="pt-3 md:pt-4">
              <button
                type="submit"
                disabled={isAuthenticating || isResetting}
                className="w-full bg-[#ffd700] text-[#0a192f] font-black py-3 px-4 rounded-xl hover:bg-[#ffed4a] transition-all flex justify-center items-center shadow-[0_4px_20px_rgba(255,215,0,0.2)] hover:shadow-[0_4px_30px_rgba(255,215,0,0.4)] text-[11px] md:text-xs tracking-widest uppercase disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin text-[#0a192f]" />
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
              className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white/55 transition hover:bg-white/[0.06] hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isResetting ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Mail className="mr-2 h-3.5 w-3.5" />
              )}
              ¿Olvidaste tu contraseña?
            </button>

            <div className="flex items-center justify-center pt-2">
              <Info className="h-3 w-3 text-white/30 mr-1.5" />
              <p className="text-[9px] text-white/30 font-medium tracking-wide">
                <p className="text-[9px] text-white/30 font-medium tracking-wide">
                  Para recuperar tu contraseña, escribe tu usuario y usa
                  “¿Olvidaste tu contraseña?”. Posteriormente solicita tu nuevo
                  acceso a el administrador responsable del sistema.
                </p>
              </p>
            </div>

            <div className="mt-5 md:mt-6 pt-4 border-t border-white/5 text-center">
              <p className="text-[9px] md:text-[10px] font-bold text-white/30 tracking-widest font-mono">
                © 2026 MLH COBRANZA
              </p>
            </div>
          </form>
        </div>

        <div className="mt-4 text-center w-full max-w-xs md:max-w-sm">
          <div className="bg-red-950/20 backdrop-blur-md border border-red-500/15 rounded-2xl p-3 flex items-start text-left shadow-lg">
            <AlertTriangle className="h-4 w-4 text-red-400/80 mr-2.5 shrink-0 mt-0.5" />
            <p className="text-[9px] md:text-[10px] text-white/50 leading-relaxed font-medium font-sans">
              SISTEMA PRIVADO INTERNO. El acceso no autorizado está
              estrictamente prohibido, registrado y monitoreado por seguridad
              corporativa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
