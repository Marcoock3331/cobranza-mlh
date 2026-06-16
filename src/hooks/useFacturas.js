import { useDeferredValue, useMemo, useState } from "react";

const normalizarTexto = (texto) =>
  texto
    ? texto
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
    : "";

const convertirFecha = (fecha) => {
  if (!fecha) return null;

  if (fecha instanceof Date) return fecha;

  if (typeof fecha === "string" && fecha.includes("/")) {
    const [dia, mes, anio] = fecha.split("/");
    return new Date(`${anio}-${mes}-${dia}T00:00:00`);
  }

  return new Date(`${fecha}T00:00:00`);
};

const redondearMoneda = (valor) =>
  Math.round((Number(valor) || 0) * 100) / 100;

export const useFacturas = (facturas) => {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstatus, setFiltroEstatus] = useState("Todas");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const busquedaDiferida = useDeferredValue(busqueda);

  const facturasFiltradas = useMemo(() => {
    if (!Array.isArray(facturas)) return [];

    const textoBusquedaLimpio = normalizarTexto(busquedaDiferida);

    return facturas.filter((factura) => {
      const coincideTexto =
        textoBusquedaLimpio === "" ||
        normalizarTexto(factura.folio).includes(textoBusquedaLimpio) ||
        normalizarTexto(factura.cliente).includes(textoBusquedaLimpio);

      const coincideEstatus =
        filtroEstatus === "Todas" || factura.estatus === filtroEstatus;

      let coincideFecha = true;

      if (fechaInicio || fechaFin) {
        const fechaFactura = convertirFecha(factura.emision);

        if (!fechaFactura || Number.isNaN(fechaFactura.getTime())) {
          return false;
        }

        if (fechaInicio) {
          const desde = new Date(`${fechaInicio}T00:00:00`);
          if (fechaFactura < desde) coincideFecha = false;
        }

        if (fechaFin) {
          const hasta = new Date(`${fechaFin}T23:59:59`);
          if (fechaFactura > hasta) coincideFecha = false;
        }
      }

      return coincideTexto && coincideEstatus && coincideFecha;
    });
  }, [
    facturas,
    busquedaDiferida,
    filtroEstatus,
    fechaInicio,
    fechaFin,
  ]);

  const kpis = useMemo(() => {
    if (!Array.isArray(facturas)) {
      return {
        deuda_activa: 0,
        monto_vencido: 0,
        total_liquidado: 0,
        cobrado_historico: 0,
        abonos_registrados: 0,
      };
    }

    const deudaActiva = facturas
      .filter((factura) => factura.estatus !== "Pagada")
      .reduce(
        (acumulado, factura) =>
          acumulado + (Number(factura.saldo_pendiente) || 0),
        0,
      );

    const montoVencido = facturas
      .filter((factura) => factura.estatus === "Vencida")
      .reduce(
        (acumulado, factura) =>
          acumulado + (Number(factura.saldo_pendiente) || 0),
        0,
      );

    const totalLiquidado = facturas
      .filter((factura) => factura.estatus === "Pagada")
      .reduce(
        (acumulado, factura) =>
          acumulado + (Number(factura.monto_total) || 0),
        0,
      );

    const cobradoHistorico = facturas.reduce((acumulado, factura) => {
      const montoTotal = Number(factura.monto_total) || 0;
      const saldoPendiente = Number(factura.saldo_pendiente) || 0;

      return acumulado + Math.max(0, montoTotal - saldoPendiente);
    }, 0);

    const abonosRegistrados = facturas.reduce((acumulado, factura) => {
      const totalAbonosFactura = (factura.abonos || []).reduce(
        (suma, abono) => suma + (Number(abono.monto) || 0),
        0,
      );

      return acumulado + totalAbonosFactura;
    }, 0);

    return {
      deuda_activa: redondearMoneda(deudaActiva),
      monto_vencido: redondearMoneda(montoVencido),
      total_liquidado: redondearMoneda(totalLiquidado),
      cobrado_historico: redondearMoneda(cobradoHistorico),
      abonos_registrados: redondearMoneda(abonosRegistrados),
    };
  }, [facturas]);

  const limpiarFiltros = () => {
    setFechaInicio("");
    setFechaFin("");
    setBusqueda("");
    setFiltroEstatus("Todas");
  };

  return {
    busqueda,
    setBusqueda,
    filtroEstatus,
    setFiltroEstatus,
    fechaInicio,
    setFechaInicio,
    fechaFin,
    setFechaFin,
    facturasFiltradas,
    kpis,
    limpiarFiltros,
  };
};