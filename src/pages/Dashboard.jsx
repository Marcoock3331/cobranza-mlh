import { useState, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GlobalContext } from "../context/GlobalContext";
import {
  DollarSign, AlertTriangle, TrendingUp, Users, ArrowRight,
  Clock, CheckCircle, CalendarDays, BarChart3, Bell, ArrowUpRight,
  ChevronDown, ChevronUp
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { stats, facturas, solicitudes, userRole } = useContext(GlobalContext);

  const [panelExpandido, setPanelExpandido] = useState(false);

  const fechaActualTexto = new Date().toLocaleDateString('es-MX', {
      day: 'numeric', month: 'long', year: 'numeric'
  });

  const solicitudesPendientes = useMemo(() => {
      return (solicitudes || []).filter(s => s.estatus === 'Pendiente');
  }, [solicitudes]);

  const cronogramaDias = useMemo(() => {
      if (!facturas) return [];
      const diasGenerados = [];
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      for (let i = 0; i < 7; i++) {
          const fechaIterada = new Date(hoy);
          fechaIterada.setDate(hoy.getDate() + i);
          
          const formatoCrudo = fechaIterada.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
          const fechaStrCorta = formatoCrudo.replace(/\./g, '').split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

          const diaPad = String(fechaIterada.getDate()).padStart(2, '0');
          const mesPad = String(fechaIterada.getMonth() + 1).padStart(2, '0');
          // Formato YYYY-MM-DD construido localmente para evitar el desfase de zona horaria de toISOString()
          const fechaFormateada = `${fechaIterada.getFullYear()}-${mesPad}-${diaPad}`;

          const eventosDelDia = [];
          facturas.forEach(f => {
              if (f.estatus !== 'Pagada' && f.estatus !== 'Cancelada') {
                  if (i === 0 && (f.estatus === 'Vencida' || f.estatus === 'vencida')) {
                      eventosDelDia.push({ id: f.id, type: 'vencida', cliente: f.cliente, folio: f.folio, monto: f.saldo_pendiente });
                  } else if (f.vencimiento === fechaFormateada) {
                      eventosDelDia.push({ id: f.id, type: i === 0 ? 'hoy' : 'proximo', cliente: f.cliente, folio: f.folio, monto: f.saldo_pendiente });
                  }
              }
          });

          diasGenerados.push({ id: `dia-${i}`, fechaStr: fechaStrCorta, esHoy: i === 0, eventos: eventosDelDia });
      }
      return diasGenerados;
  }, [facturas]);

  const notificacionesFeed = useMemo(() => {
    let feed = [];

    if (facturas) {
      facturas.filter(f => f.estatus === "Vencida").forEach(f => {
        feed.push({
          id: `venc-${f.id}`, tipo: "alerta", titulo: "Factura Vencida",
          descripcion: `${f.cliente} • Folio ${f.folio}`, fecha: f.vencimiento, isRedireccionable: true, ruta: "/facturas"
        });
      });
    }

   if (solicitudes) {
      solicitudes.filter(s => s.estatus !== 'Pendiente').forEach(s => {
         const montoSolicitado = Number(s.monto_solicitado) || 0;
         const nombreCliente = s.cliente || 'Cliente Comercial';
         const esAprobado = s.estatus === 'Autorizado' || s.estatus === 'Aprobado';

         feed.push({
           id: `solRes-${s.id}`,
           tipo: esAprobado ? 'aprobada' : 'rechazada',
           titulo: `Crédito ${s.estatus}`,
           descripcion: `${nombreCliente}: Línea ajustada a $${montoSolicitado.toLocaleString('es-MX')}`,
           fecha: s.fecha || new Date().toLocaleDateString('es-MX'),
           isRedireccionable: true, ruta: "/clientes"
         });
      });
    }

    if (userRole === "ADMIN" && solicitudesPendientes.length > 0) {
        feed.unshift({
            id: 'admin-alert-pending', tipo: 'alerta', titulo: 'Pendientes por revisar',
            descripcion: `Existen ${solicitudesPendientes.length} solicitudes de crédito en espera de dictamen del SU.`,
            fecha: new Date().toLocaleDateString('es-MX'), isRedireccionable: false
        });
    }

    return feed.sort((a, b) => (b.fecha > a.fecha ? 1 : -1));
  }, [facturas, solicitudes, userRole, solicitudesPendientes]);

  const notificacionesVisibles = panelExpandido ? notificacionesFeed : notificacionesFeed.slice(0, 4);

  return (
    <div className="flex flex-col space-y-4 md:space-y-6 relative pb-6 text-sm animate-fade-in">
      
      {/* HEADER ADAPTATIVO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mt-2 md:mt-4 gap-2 md:gap-4">
        <div className="w-full md:w-auto">
          <h1 className="text-xl md:text-2xl font-bold text-[#0a192f] flex items-center tracking-tight">
            <BarChart3 className="h-5 w-5 md:h-6 md:w-6 mr-2 text-blue-600" /> Resumen Financiero
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1">Visualización global del estado de cobranza, métricas clave y rendimiento mensual.</p>
        </div>
        <div className="text-left md:text-right w-full md:w-auto md:pb-1 hidden sm:block">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Fecha Actual</p>
          <p className="text-xs md:text-sm font-bold text-[#0a192f] capitalize">{fechaActualTexto}</p>
        </div>
      </div>

      {/* TARJETAS FINANCIERAS (1 COLUMNA EN MÓVIL, 4 EN PC) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        
        <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">Cartera Total</p>
              <h3 className="text-xl md:text-2xl font-black text-[#0a192f] mt-1">${stats?.cartera_total?.toLocaleString("es-MX") || 0}</h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 shrink-0"><DollarSign className="h-4 w-4 md:h-5 md:w-5" /></div>
          </div>
          <p className="text-[11px] md:text-xs text-gray-500 mt-2 md:mt-3 font-medium">Dinero total en la calle</p>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-xl border border-red-100 shadow-sm flex flex-col bg-red-50/20">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] md:text-xs font-bold text-red-500 uppercase tracking-wider">Cartera Vencida</p>
              <h3 className="text-xl md:text-2xl font-black text-red-600 mt-1">${stats?.cartera_vencida?.toLocaleString("es-MX") || 0}</h3>
            </div>
            <div className="p-2 bg-red-100 rounded-lg text-red-600 shrink-0"><AlertTriangle className="h-4 w-4 md:h-5 md:w-5" /></div>
          </div>
          <p className="text-[11px] md:text-xs text-red-500 mt-2 md:mt-3 font-medium">
            {stats?.cartera_total ? ((stats?.cartera_vencida / stats?.cartera_total) * 100).toFixed(1) : 0}% de la cartera total
          </p>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">Ingresos del Mes</p>
              <h3 className="text-xl md:text-2xl font-black text-green-600 mt-1">${stats?.ingresos_mes?.toLocaleString("es-MX") || 0}</h3>
            </div>
            <div className="p-2 bg-green-50 rounded-lg text-green-600 shrink-0"><TrendingUp className="h-4 w-4 md:h-5 md:w-5" /></div>
          </div>
          <p className="text-[11px] md:text-xs text-gray-500 mt-2 md:mt-3 font-medium">Flujo de caja recuperado</p>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">Clientes Activos</p>
              <h3 className="text-xl md:text-2xl font-black text-[#0a192f] mt-1">{stats?.clientes_activos || 0}</h3>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600 shrink-0"><Users className="h-4 w-4 md:h-5 md:w-5" /></div>
          </div>
          <button 
            onClick={() => navigate("/clientes")} 
            className="text-[11px] md:text-xs text-blue-600 hover:text-blue-800 active:bg-blue-50 py-1 -ml-1 px-1 rounded mt-2 md:mt-3 font-bold flex items-center transition-colors w-fit"
          >
            Ver directorio completo <ArrowRight className="h-3 w-3 ml-1" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          
          {/* CALENDARIO DE FLUJO: CARRUSEL MAGNÉTICO MÓVIL */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-50 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="font-bold text-[#0a192f] flex items-center text-sm md:text-sm">
                <CalendarDays className="h-5 w-5 mr-2 text-blue-600" /> Flujo Semanal
              </h3>
              <button 
                onClick={() => navigate("/calendario")} 
                className="w-full sm:w-auto px-3 py-2.5 md:py-1.5 bg-blue-50 text-blue-700 active:bg-blue-100 hover:bg-blue-100 border border-blue-100 text-xs font-bold rounded-lg md:rounded-md flex items-center justify-center transition-colors"
              >
                Ir al Calendario <ArrowRight className="h-3.5 w-3.5 md:h-3 md:w-3 ml-1.5" />
              </button>
            </div>
            
            {/* Contenedor snap-x (Imantado) */}
            <div className="p-4 flex gap-3 md:gap-4 overflow-x-auto pb-4 custom-scrollbar hide-scrollbar-mobile snap-x snap-mandatory">
              {cronogramaDias.map((dia) => (
                <div key={dia.id} className="min-w-[240px] md:min-w-[260px] max-w-[240px] md:max-w-[260px] bg-gray-50/50 border border-gray-200 rounded-xl flex flex-col snap-start shrink-0">
                  <div className={`p-2.5 md:p-3 border-b rounded-t-xl font-bold text-xs md:text-sm flex justify-between items-center ${dia.esHoy ? "bg-blue-50 border-blue-100 text-blue-800" : "bg-gray-100/80 border-gray-200 text-gray-700"}`}>
                    <span>{dia.fechaStr}</span>
                    {dia.esHoy && <span className="text-[9px] md:text-[10px] uppercase bg-blue-200 px-1.5 py-0.5 rounded font-black tracking-wider">Hoy</span>}
                  </div>
                  <div className="p-3 flex flex-col gap-2.5 md:gap-3 min-h-[120px] max-h-[280px] overflow-y-auto custom-scrollbar">
                    {dia.eventos.length > 0 ? (
                      dia.eventos.map((ev) => (
                        <div key={`${dia.id}-${ev.id}`} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm relative active:border-blue-300 hover:border-blue-300 transition-all group/card">
                          <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${ev.type === "vencida" ? "bg-red-500" : ev.type === "hoy" ? "bg-blue-500" : "bg-gray-300"}`}></div>
                          <div className="pl-2 flex justify-between items-start">
                            <div className="flex-1 pr-2">
                              <p className={`text-base md:text-lg font-black leading-tight mb-1 ${ev.type === "vencida" ? "text-red-600" : "text-[#0a192f]"}`}>${ev.monto.toLocaleString("es-MX")}</p>
                              <p className="text-[11px] md:text-xs font-bold text-gray-700 line-clamp-1">{ev.cliente}</p>
                              <p className="text-[9px] md:text-[10px] text-gray-500 font-mono mt-1">{ev.folio}</p>
                            </div>
                            <button 
                              onClick={() => navigate('/facturas')} 
                              className="p-2 md:p-1.5 rounded-lg md:rounded bg-gray-50 text-gray-400 hover:bg-blue-50 active:bg-blue-50 hover:text-blue-600 active:text-blue-600 border border-gray-200 md:opacity-0 group-hover/card:opacity-100 transition-all" 
                              title="Ir a Gestión"
                            >
                                <ArrowUpRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-4">
                        <CheckCircle className="h-5 w-5 md:h-6 md:w-6 mb-1 text-gray-300" />
                        <p className="text-[11px] md:text-xs font-medium">Libre</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FEED DE ACTIVIDAD */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col h-fit overflow-hidden transition-all duration-300 mb-6 lg:mb-0">
          <div className="p-3.5 md:p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-bold text-[#0a192f] flex items-center text-xs md:text-sm">
              <Bell className="h-4 w-4 mr-2 text-blue-600" /> Centro de Actividad
            </h3>
            {notificacionesFeed.length > 0 && (
              <span className="bg-blue-100 text-blue-700 text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                {notificacionesFeed.length} Alertas
              </span>
            )}
          </div>

          <div className={`transition-all duration-300 ease-in-out bg-white ${panelExpandido ? 'max-h-[420px] overflow-y-auto custom-scrollbar' : 'max-h-[300px] overflow-hidden'}`}>
            {notificacionesVisibles.length > 0 ? (
              notificacionesVisibles.map((noti) => (
                <div key={noti.id} className="p-3.5 md:p-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 active:bg-gray-50 transition-colors group flex items-start gap-3">
                  <div className="mt-0.5 shrink-0 bg-white rounded-full">
                    {noti.tipo === "pago" || noti.tipo === "aprobada" ? <CheckCircle className="h-4 w-4 md:h-4 md:w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 md:h-4 md:w-4 text-red-500" />}
                  </div>
                  
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-[11px] md:text-xs font-bold text-[#0a192f] truncate">{noti.titulo}</p>
                    <p className={`text-[10px] md:text-[11px] font-medium mt-0.5 leading-snug ${noti.tipo === "aprobada" ? "text-green-600" : (noti.tipo === "alerta" ? "text-red-600" : "text-gray-500")}`}>
                      {noti.descripcion}
                    </p>
                    <p className="text-[9px] md:text-[10px] text-gray-400 mt-1 flex items-center font-mono">
                      <Clock className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" /> {noti.fecha}
                    </p>
                  </div>

                  {noti.isRedireccionable && (
                    <button 
                      onClick={() => navigate(noti.ruta)} 
                      className="p-2 md:p-1.5 bg-white border border-gray-200 text-gray-400 rounded-lg md:rounded hover:bg-blue-50 active:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors shrink-0" 
                      title="Atender"
                    >
                      <ArrowUpRight className="h-4 w-4 md:h-3.5 md:w-3.5" />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 bg-white">
                <CheckCircle className="h-8 w-8 text-gray-200 mb-2" />
                <p className="text-[11px] md:text-xs font-medium">Bandeja operativa limpia</p>
              </div>
            )}
          </div>
          
          {notificacionesFeed.length > 4 && (
            <div className="p-2 md:p-2 bg-gray-50 border-t border-gray-100 flex justify-center">
              <button 
                onClick={() => setPanelExpandido(!panelExpandido)} 
                className="w-full sm:w-auto justify-center text-[11px] md:text-[11px] font-bold text-gray-500 active:text-[#0a192f] hover:text-[#0a192f] transition-colors flex items-center px-4 py-3 md:py-1.5 rounded-lg md:rounded-md active:bg-gray-200/50 hover:bg-gray-200/50"
              >
                {panelExpandido ? <>Contraer Historial <ChevronUp className="h-4 w-4 md:h-3.5 md:w-3.5 ml-1" /></> : <>Ver historial completo ({notificacionesFeed.length}) <ChevronDown className="h-4 w-4 md:h-3.5 md:w-3.5 ml-1" /></>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}