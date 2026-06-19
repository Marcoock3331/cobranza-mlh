import { useContext } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import {
  Home,
  Users,
  FileText,
  Calendar,
  LogOut,
  Shield,
} from "lucide-react";

import { auth } from "../config/firebase";
import { GlobalContext } from "../context/GlobalContext";
import logoMLH from "../assets/MLH LOGO1.png";

export default function MainLayout() {
  const navigate = useNavigate();

  const { userName, userRole, stats } = useContext(GlobalContext);

  const facturasPendientesCount =
    Number(stats?.facturas_pendientes) || 0;

  const handleCerrarSesion = async () => {
    try {
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error(
        "Error al cerrar sesión:",
        error,
      );
    }
  };

  const navItems = [
    {
      name: "Inicio",
      path: "/",
      icon: Home,
    },
    {
      name: "Clientes",
      path: "/clientes",
      icon: Users,
    },
    {
      name: "Facturas",
      path: "/facturas",
      icon: FileText,
      badge: facturasPendientesCount,
    },
    {
      name: "Agenda",
      path: "/calendario",
      icon: Calendar,
    },
    ...(userRole === "SU"
      ? [
          {
            name: "Panel SU",
            path: "/panel-su",
            icon: Shield,
          },
        ]
      : []),
  ];

  const obtenerNombreVisible = (itemName) => {
    if (itemName === "Facturas") {
      return "Facturación y Pagos";
    }

    if (itemName === "Agenda") {
      return "Calendario";
    }

    return itemName;
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f4f6f8] font-sans relative">
      <aside className="hidden md:flex w-64 bg-[#0a192f] flex-col flex-shrink-0 z-20 shadow-xl">
        <div className="h-28 flex items-center justify-center p-4 shrink-0">
          <img
            src={logoMLH}
            alt="MLH Cobranza"
            className="max-h-full object-contain"
          />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-1 custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-md transition-all ${
                  isActive
                    ? "bg-[#ffd700] text-[#0a192f] font-bold shadow-md shadow-[#ffd700]/10"
                    : "text-gray-300 hover:bg-[#112240] hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={`h-5 w-5 mr-3 shrink-0 ${
                      isActive
                        ? "text-[#0a192f]"
                        : "text-gray-400"
                    }`}
                  />

                  <span className="flex-1 text-sm">
                    {obtenerNombreVisible(item.name)}
                  </span>

                  {Number(item.badge) > 0 && (
                    <span
                      className={`px-2 py-0.5 text-[10px] rounded-full font-black ${
                        isActive
                          ? "bg-[#0a192f] text-[#ffd700]"
                          : "bg-[#112240] text-gray-300"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-[#112240] shrink-0 bg-black/10">
          <button
            type="button"
            onClick={handleCerrarSesion}
            className="flex items-center justify-center w-full px-3 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-md transition-colors uppercase tracking-wider font-bold text-xs"
          >
            <LogOut className="h-4 w-4 mr-2 shrink-0" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0 bg-[#f4f6f8]">
        <header className="h-20 md:h-16 bg-white border-b border-gray-200 flex items-center justify-between md:justify-end px-4 md:px-8 shrink-0 shadow-sm z-10">
          <div className="flex md:hidden items-center">
            <img
              src={logoMLH}
              alt="MLH Cobranza"
              className="h-12 sm:h-14 object-contain"
            />
          </div>

          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="text-right flex flex-col justify-center">
              <span className="text-sm font-black text-[#0a192f] leading-none">
                {userName || "Usuario"}
              </span>

              <span
                className={`text-[9px] font-black uppercase tracking-widest mt-1.5 md:mt-1 w-fit ml-auto px-1.5 py-0.5 rounded border ${
                  userRole === "SU"
                    ? "bg-amber-50 text-amber-600 border-amber-200 shadow-sm"
                    : "bg-blue-50 text-blue-600 border-blue-200 shadow-sm"
                }`}
              >
                {userRole === "SU"
                  ? "SÚPER USUARIO"
                  : userRole || "ADMIN"}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCerrarSesion}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className="md:hidden ml-1 p-2.5 rounded-xl bg-red-50 text-red-500 active:bg-red-100 transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 pb-24 md:pb-8 custom-scrollbar">
          <Outlet />
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0a192f] shadow-[0_-4px_15px_rgba(0,0,0,0.15)] z-40 flex justify-around items-center px-1 safe-area-pb">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 relative transition-colors ${
                isActive
                  ? "text-[#ffd700]"
                  : "text-gray-400 hover:text-gray-200"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <item.icon
                    className={`h-5 w-5 transition-transform duration-200 ${
                      isActive
                        ? "scale-110"
                        : "scale-100"
                    }`}
                  />

                  {Number(item.badge) > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-black px-1.5 rounded-full border-2 border-[#0a192f]">
                      {item.badge}
                    </span>
                  )}
                </div>

                <span
                  className={`text-[9px] font-bold tracking-wider uppercase transition-all ${
                    isActive
                      ? "opacity-100"
                      : "opacity-70"
                  }`}
                >
                  {item.name}
                </span>

                {isActive && (
                  <div className="absolute bottom-0 w-8 h-0.5 bg-[#ffd700] rounded-t-full" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}