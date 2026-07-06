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