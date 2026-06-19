import { useCallback, useEffect, useRef, useState } from "react";

import { facturasConsultaService } from "../services/facturasConsultaService";

export const useFacturasPaginadas = ({
  pageSize = 25,
  busqueda = "",
  clienteId = "",
  filtroEstatus = "Todas",
  fechaInicio = "",
  fechaFin = "",
  enabled = true,
}) => {
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [pagina, setPagina] = useState(1);
  const [haySiguiente, setHaySiguiente] = useState(false);
  const [cursorSiguiente, setCursorSiguiente] = useState(null);
  const [cursores, setCursores] = useState([null]);

  const solicitudActiva = useRef(0);

  const ejecutarConsulta = useCallback(
    async ({ paginaDestino = 1, cursoresDestino = [null] } = {}) => {
      if (!enabled) {
        setFacturas([]);
        setCargando(false);
        return;
      }

      const numeroSolicitud = solicitudActiva.current + 1;
      solicitudActiva.current = numeroSolicitud;
      setCargando(true);
      setError("");

      const cursor = cursoresDestino[paginaDestino - 1] || null;
      const respuesta = await facturasConsultaService.consultarPagina({
        pageSize,
        cursor,
        busqueda,
        clienteId,
        filtroEstatus,
        fechaInicio,
        fechaFin,
      });

      if (numeroSolicitud !== solicitudActiva.current) {
        return;
      }

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
    [
      enabled,
      pageSize,
      busqueda,
      clienteId,
      filtroEstatus,
      fechaInicio,
      fechaFin,
    ],
  );

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      ejecutarConsulta({ paginaDestino: 1, cursoresDestino: [null] });
    }, 200);

    return () => window.clearTimeout(temporizador);
  }, [ejecutarConsulta]);

  const siguientePagina = useCallback(async () => {
    if (
      cargando ||
      !haySiguiente ||
      !cursorSiguiente ||
      facturas.length === 0
    ) {
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
    await ejecutarConsulta({
      paginaDestino: pagina,
      cursoresDestino: cursores,
    });
  }, [ejecutarConsulta, pagina, cursores]);

  return {
    facturas,
    cargando,
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