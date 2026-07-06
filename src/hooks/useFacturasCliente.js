import { useCallback, useEffect, useRef, useState } from "react";

import { facturasClienteService } from "../services/facturasClienteService";

const RESUMEN_INICIAL = {
  totalFacturas: 0,
  facturasPagadas: 0,
  facturasPendientes: 0,
  facturasVencidas: 0,
  totalFacturado: 0,
  saldoActual: 0,
  saldoVencido: 0,
  resumenLimitado: false,
};

export const useFacturasCliente = ({
  clienteId = "",
  filtroFacturas = "Historial",
  pageSize = 8,
  enabled = true,
} = {}) => {
  const [facturas, setFacturas] = useState([]);
  const [resumen, setResumen] = useState(RESUMEN_INICIAL);
  const [cargando, setCargando] = useState(false);
  const [cargandoResumen, setCargandoResumen] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [pagina, setPagina] = useState(1);
  const [haySiguiente, setHaySiguiente] = useState(false);
  const [cursorSiguiente, setCursorSiguiente] = useState(null);
  const [cursores, setCursores] = useState([null]);

  const solicitudActiva = useRef(0);
  const resumenActivo = useRef(0);

  const cargarResumen = useCallback(async () => {
    if (!enabled || !clienteId) {
      setResumen(RESUMEN_INICIAL);
      setCargandoResumen(false);
      return;
    }

    const numeroResumen = resumenActivo.current + 1;
    resumenActivo.current = numeroResumen;
    setCargandoResumen(true);

    const respuesta = await facturasClienteService.consultarResumenCliente(
      clienteId,
    );

    if (numeroResumen !== resumenActivo.current) return;

    if (respuesta.success) {
      setResumen(respuesta.resumen || RESUMEN_INICIAL);
    } else {
      setResumen(RESUMEN_INICIAL);
      setMensaje(respuesta.error || "No se pudo calcular el resumen.");
    }

    setCargandoResumen(false);
  }, [clienteId, enabled]);

  const ejecutarConsulta = useCallback(
    async ({ paginaDestino = 1, cursoresDestino = [null] } = {}) => {
      if (!enabled || !clienteId) {
        setFacturas([]);
        setHaySiguiente(false);
        setCursorSiguiente(null);
        setPagina(1);
        setCursores([null]);
        setCargando(false);
        return;
      }

      const numeroSolicitud = solicitudActiva.current + 1;
      solicitudActiva.current = numeroSolicitud;
      setCargando(true);
      setError("");

      const cursor = cursoresDestino[paginaDestino - 1] || null;
      const respuesta = await facturasClienteService.consultarPaginaCliente({
        clienteId,
        pageSize,
        cursor,
        filtroFacturas,
      });

      if (numeroSolicitud !== solicitudActiva.current) return;

      if (!respuesta.success) {
        setFacturas([]);
        setHaySiguiente(false);
        setCursorSiguiente(null);
        setMensaje("");
        setError(respuesta.error || "No se pudieron cargar las facturas.");
        setCargando(false);
        return;
      }

      setFacturas(respuesta.facturas || []);
      setHaySiguiente(Boolean(respuesta.haySiguiente));
      setCursorSiguiente(respuesta.cursorSiguiente || null);
      setMensaje(respuesta.mensaje || "");
      setPagina(paginaDestino);
      setCursores(cursoresDestino);
      setCargando(false);
    },
    [clienteId, enabled, filtroFacturas, pageSize],
  );

  useEffect(() => {
    let cancelado = false;

    const temporizador = setTimeout(() => {
      if (cancelado) return;

      ejecutarConsulta({ paginaDestino: 1, cursoresDestino: [null] });
    }, 150);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [ejecutarConsulta]);

  useEffect(() => {
    let cancelado = false;

    const temporizador = setTimeout(() => {
      if (cancelado) return;

      cargarResumen();
    }, 150);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [cargarResumen]);

  const siguientePagina = useCallback(async () => {
    if (cargando || !haySiguiente || !cursorSiguiente || !facturas.length) {
      return false;
    }

    const nuevosCursores = [
      ...cursores.slice(0, pagina),
      cursorSiguiente,
    ];

    await ejecutarConsulta({
      paginaDestino: pagina + 1,
      cursoresDestino: nuevosCursores,
    });

    return true;
  }, [
    cargando,
    haySiguiente,
    cursorSiguiente,
    facturas.length,
    cursores,
    pagina,
    ejecutarConsulta,
  ]);

  const paginaAnterior = useCallback(async () => {
    if (cargando || pagina <= 1) return false;

    const nuevosCursores = cursores.slice(0, pagina - 1);

    await ejecutarConsulta({
      paginaDestino: pagina - 1,
      cursoresDestino: nuevosCursores,
    });

    return true;
  }, [cargando, pagina, cursores, ejecutarConsulta]);

  const recargar = useCallback(async () => {
    await Promise.all([
      ejecutarConsulta({ paginaDestino: pagina, cursoresDestino: cursores }),
      cargarResumen(),
    ]);
  }, [cargarResumen, cursores, ejecutarConsulta, pagina]);

  return {
    facturas,
    resumen,
    cargando,
    cargandoResumen,
    error,
    mensaje,
    pagina,
    hayAnterior: pagina > 1,
    haySiguiente,
    siguientePagina,
    paginaAnterior,
    recargar,
  };
};