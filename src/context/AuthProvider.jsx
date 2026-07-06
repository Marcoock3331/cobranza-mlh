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