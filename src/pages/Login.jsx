import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, AlertTriangle, Loader2, Info } from "lucide-react";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { auth } from "../config/firebase";
import { GlobalContext } from "../context/GlobalContext";

import logoMadereria from "../assets/MHA LOGO.png";
import logoMLH from "../assets/MLH LOGO1.png";
import fondoLogin from "../assets/fondo-login.jpg";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    () => localStorage.getItem("authError") || "",
  );
  const [isAuthenticating, setIsAuthenticating] = useState(false);
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
    clearAuthError?.();
    localStorage.removeItem("authError");

    if (!username.trim() || !password) {
      setError("Por favor, ingrese su usuario y contraseña.");
      return;
    }

    setIsAuthenticating(true);

    try {
      await setPersistence(auth, browserSessionPersistence);

      const emailFantasma = `${username.trim().toLowerCase()}@mlh.local`;

      await signInWithEmailAndPassword(auth, emailFantasma, password);
    } catch (errorLogin) {
      let mensajeError =
        "Credenciales incorrectas. Verifique su usuario y contraseña.";

      if (errorLogin.code === "auth/user-disabled") {
        mensajeError = "Su acceso ha sido inhabilitado administrativamente.";
      } else if (errorLogin.code === "auth/too-many-requests") {
        mensajeError =
          "Múltiples intentos fallidos. Su cuenta está bloqueada temporalmente.";
      }

      setError(mensajeError);

      console.error("Error de autenticación:", errorLogin);
    } finally {
      setIsAuthenticating(false);
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
                  disabled={isAuthenticating}
                  className="block w-full pl-10 pr-3 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-[#ffd700] focus:bg-white/[0.08] focus:border-transparent transition-all disabled:bg-black/30 disabled:text-white/20"
                  placeholder="Ingresa tu usuario"
                  autoComplete="off"
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
                  disabled={isAuthenticating}
                  className="block w-full pl-10 pr-3 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-[#ffd700] focus:bg-white/[0.08] focus:border-transparent transition-all disabled:bg-black/30 disabled:text-white/20"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pt-3 md:pt-4">
              <button
                type="submit"
                disabled={isAuthenticating}
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

            {/* Aviso de cuentas corporativas locales */}
            <div className="flex items-center justify-center pt-2">
              <Info className="h-3 w-3 text-white/30 mr-1.5" />
              <p className="text-[9px] text-white/30 font-medium tracking-wide">
                ¿Problemas de acceso? Contacta al Súper Usuario.
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
