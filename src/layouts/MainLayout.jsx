import { useContext, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import {
  Calendar,
  FileText,
  Home,
  LogOut,
  Menu,
  Shield,
  Users,
  BarChart3,
  X,
} from "lucide-react";

import { auth } from "../config/firebase";
import { GlobalContext } from "../context/GlobalContext";
import logoMLH from "../assets/MLH LOGO1.png";

function BotonSalir({ onClick, mobile = false }) {
  if (mobile) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Cerrar sesión"
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-100 transition active:scale-[0.98] active:bg-red-500/20"
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Cerrar sesión"
      title="Cerrar sesión"
      className="group relative flex h-11 w-11 cursor-pointer items-center justify-start overflow-hidden rounded-full border border-red-400/40 bg-red-500/10 shadow-sm transition-all duration-200 hover:w-32 hover:rounded-xl hover:border-red-300/60 hover:bg-red-500/15 active:translate-x-1 active:translate-y-1"
    >
      <div className="flex w-full items-center justify-center transition-all duration-300 group-hover:justify-start group-hover:px-3">
        <LogOut className="h-4 w-4 text-red-300" />
      </div>

      <span className="absolute right-5 translate-x-full text-sm font-black text-red-200 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
        Salir
      </span>
    </button>
  );
}

export default function MainLayout() {
  const navigate = useNavigate();
  const { userName, userRole, stats } = useContext(GlobalContext);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const facturasPendientesCount = Number(stats?.facturas_pendientes) || 0;
  const esSU = userRole === "SU";

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
      name: "Facturación",
      path: "/facturas",
      icon: FileText,
      badge: facturasPendientesCount,
    },
    {
      name: "Calendario",
      path: "/calendario",
      icon: Calendar,
    },
    {
    name: "Reportes",
    path: "/reportes",
    icon: BarChart3,
    },
    ...(esSU
      ? [
          {
            name: "Panel SU",
            path: "/panel-su",
            icon: Shield,
          },
        ]
      : []),
  ];

  const handleCerrarSesion = async () => {
    try {
      setMenuAbierto(false);
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const renderNavLink = (item, modo = "desktop") => (
    <NavLink
      key={item.path}
      to={item.path}
      end={item.path === "/"}
      onClick={() => setMenuAbierto(false)}
      className={({ isActive }) => {
        if (modo === "mobile") {
          return `group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-black transition-all duration-150 active:scale-[0.98] ${
            isActive
              ? "bg-white/10 text-[#ffd700]"
              : "text-gray-300 active:bg-white/5"
          }`;
        }

        return `group relative flex h-14 items-center gap-2 px-3 text-sm font-black transition-all duration-200 hover:scale-[1.04] active:scale-[0.97] ${
          isActive ? "text-[#ffd700]" : "text-gray-300 hover:text-[#ffd700]"
        }`;
      }}
    >
      {({ isActive }) => (
        <>
          <item.icon
            className={`shrink-0 transition-all duration-200 ${
              modo === "mobile" ? "h-5 w-5" : "h-4 w-4"
            } ${
              isActive
                ? "text-[#ffd700]"
                : "text-gray-400 group-hover:text-[#ffd700]"
            }`}
          />

          <span className="min-w-0 truncate whitespace-nowrap">{item.name}</span>

          {Number(item.badge) > 0 && (
            <span
              className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-black transition-all duration-200 ${
                isActive
                  ? "bg-[#ffd700] text-[#0a192f]"
                  : "bg-[#112240] text-gray-200 group-hover:bg-[#ffd700] group-hover:text-[#0a192f]"
              }`}
            >
              {item.badge}
            </span>
          )}

          <span
            className={`absolute bottom-1 left-1/2 h-[2px] -translate-x-1/2 rounded-full bg-[#ffd700] transition-all duration-300 ${
              isActive && modo !== "mobile" ? "w-[72%]" : "w-0"
            }`}
          />
        </>
      )}
    </NavLink>
  );

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#e8e8e8] font-sans">
      <header className="shrink-0 bg-transparent px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] md:px-5 md:py-3">
        <div className="flex min-h-[58px] items-center justify-between rounded-[1.75rem] bg-[#0a192f] px-3 shadow-[0_10px_24px_rgba(10,25,47,0.14)] md:min-h-[72px] md:px-6">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex min-w-0 items-center transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
            aria-label="Ir al inicio"
          >
            <img
              src={logoMLH}
              alt="MLH Cobranza"
              className="h-14 w-auto object-contain md:h-16"
            />
          </button>

          <nav className="hidden items-center gap-4 lg:flex">
            {navItems.map((item) => renderNavLink(item))}
          </nav>

          <div className="hidden items-center gap-4 lg:flex">
            <div className="text-right">
              <p className="text-sm font-black leading-none text-white">
                {userName || "Usuario MLH"}
              </p>

              <p
                className={`mt-1 text-[10px] font-black uppercase tracking-[0.22em] ${
                  esSU ? "text-[#ffd700]" : "text-blue-300"
                }`}
              >
                {esSU ? "Súper Usuario" : userRole || "Admin"}
              </p>
            </div>

            <BotonSalir onClick={handleCerrarSesion} />
          </div>

          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="truncate text-xs font-black leading-none text-white">
                {userName || "Usuario MLH"}
              </p>

              <p
                className={`mt-1 text-[9px] font-black uppercase tracking-[0.18em] ${
                  esSU ? "text-[#ffd700]" : "text-blue-300"
                }`}
              >
                {esSU ? "SU" : userRole || "Admin"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setMenuAbierto((prev) => !prev)}
              aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuAbierto}
              className="rounded-full border border-white/10 bg-white/5 p-3 text-white transition-all duration-150 active:scale-[0.96] active:bg-white/10"
            >
              {menuAbierto ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {menuAbierto && (
          <div className="mt-2 max-h-[calc(100dvh-84px)] overflow-y-auto rounded-[1.5rem] bg-[#0a192f] p-3 shadow-[0_16px_35px_rgba(10,25,47,0.20)] lg:hidden">
            <div className="mb-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="truncate text-sm font-black text-white">
                {userName || "Usuario MLH"}
              </p>

              <p
                className={`mt-1 text-[10px] font-black uppercase tracking-[0.22em] ${
                  esSU ? "text-[#ffd700]" : "text-blue-300"
                }`}
              >
                {esSU ? "Súper Usuario" : userRole || "Admin"}
              </p>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => renderNavLink(item, "mobile"))}
            </nav>

            <BotonSalir onClick={handleCerrarSesion} mobile />
          </div>
        )}
      </header>

      <main className="custom-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#e8e8e8] px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 md:p-8 md:pt-4">
        <Outlet />
      </main>
    </div>
  );
}
