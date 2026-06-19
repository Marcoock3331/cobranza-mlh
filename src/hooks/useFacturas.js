import { useMemo, useState } from "react";

const redondearMoneda = (valor) =>
  Math.round((Number(valor) || 0) * 100) / 100;

export const useFacturas = (stats = {}) => {
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [filtroEstatus, setFiltroEstatus] = useState("Todas");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const kpis = useMemo(
    () => ({
      deuda_activa: redondearMoneda(stats.cartera_total),
      monto_vencido: redondearMoneda(stats.cartera_vencida),
      total_liquidado: redondearMoneda(stats.total_liquidado),
      cobrado_historico: redondearMoneda(stats.cobrado_historico),
      abonos_registrados: redondearMoneda(stats.abonos_registrados),
    }),
    [stats],
  );

  const aplicarBusqueda = () => {
    setBusquedaAplicada(busqueda.trim());
  };

  const limpiarBusquedaAplicada = () => {
    setBusquedaAplicada("");
  };

  const limpiarBusqueda = () => {
    setBusqueda("");
    setBusquedaAplicada("");
  };

  const limpiarFiltros = () => {
    setFechaInicio("");
    setFechaFin("");
    setBusqueda("");
    setBusquedaAplicada("");
    setFiltroEstatus("Todas");
  };

  return {
    busqueda,
    setBusqueda,
    busquedaAplicada,
    aplicarBusqueda,
    limpiarBusquedaAplicada,
    limpiarBusqueda,
    filtroEstatus,
    setFiltroEstatus,
    fechaInicio,
    setFechaInicio,
    fechaFin,
    setFechaFin,
    kpis,
    limpiarFiltros,
  };
};