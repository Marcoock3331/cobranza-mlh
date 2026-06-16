import { Navigate, Outlet } from 'react-router-dom';
import { useContext } from 'react';
import { GlobalContext } from '../context/GlobalContext';

export default function ProtectedRoute({ children, requiredRole }) {
    // FIX A-6: Extraemos authLoading para evitar el race condition
    const { currentUser, userRole, authLoading } = useContext(GlobalContext);

    // 1. CAPA DE ESPERA: Evita expulsar al usuario mientras Firebase valida el token de seguridad
    if (authLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f6f8]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0a192f] mb-3"></div>
                <p className="text-[#0a192f] text-sm font-medium animate-pulse">Verificando acceso protegido...</p>
            </div>
        );
    }

    // 2. CAPA DE AUTENTICACIÓN: Si no existe un usuario logueado, patada al Login
    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    // 3. CAPA DE AUTORIZACIÓN: Si la ruta exige un rol (ej. "SU") y el usuario no lo tiene
    if (requiredRole && userRole !== requiredRole) {
        // Redirigimos al Dashboard para que no vea la pantalla prohibida
        return <Navigate to="/" replace />;
    }

    // 4. RENDERIZADO: Si pasa todas las capas de seguridad, mostramos el componente
    return children ? children : <Outlet />;
}