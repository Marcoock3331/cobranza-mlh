import { useEffect, useMemo, useState } from "react";

import { calendarioConsultaService } from "../services/calendarioConsultaService";
import { construirEventosAgenda } from "../utils/agenda";

export const useAgendaRango = (inicio, fin) => {
  const inicioMs = inicio.getTime();
  const finMs = fin.getTime();
  const rangoKey = `${inicioMs}-${finMs}`;

  const [resultadoFacturas, setResultadoFacturas] = useState({
    key: "",
    data: [],
    error: "",
  });

  const [resultadoCompromisos, setResultadoCompromisos] = useState({
    key: "",
    data: [],
    error: "",
  });

  useEffect(() => {
    let activo = true;
    const inicioRango = new Date(inicioMs);
    const finRango = new Date(finMs);

    calendarioConsultaService
      .consultarFacturasRango({ inicio: inicioRango, fin: finRango })
      .then((resultado) => {
        if (!activo) return;

        setResultadoFacturas({
          key: rangoKey,
          data: resultado.facturas || [],
          error: resultado.success ? "" : resultado.error || "Error de consulta",
        });
      });

    const unsubscribe = calendarioConsultaService.escucharCompromisosRango({
      inicio: inicioRango,
      fin: finRango,
      onData: (compromisos) => {
        if (!activo) return;

        setResultadoCompromisos({
          key: rangoKey,
          data: compromisos,
          error: "",
        });
      },
      onError: (error) => {
        if (!activo) return;

        setResultadoCompromisos({
          key: rangoKey,
          data: [],
          error: error?.message || "No se pudieron consultar los recordatorios.",
        });
      },
    });

    return () => {
      activo = false;
      unsubscribe();
    };
  }, [inicioMs, finMs, rangoKey]);

  const facturas = useMemo(
    () =>
      resultadoFacturas.key === rangoKey
        ? resultadoFacturas.data
        : [],
    [resultadoFacturas, rangoKey],
  );

  const compromisos = useMemo(
    () =>
      resultadoCompromisos.key === rangoKey
        ? resultadoCompromisos.data
        : [],
    [resultadoCompromisos, rangoKey],
  );

  const eventos = useMemo(
    () => construirEventosAgenda(facturas, compromisos),
    [facturas, compromisos],
  );

  return {
    facturas,
    compromisos,
    eventos,
    cargando:
      resultadoFacturas.key !== rangoKey ||
      resultadoCompromisos.key !== rangoKey,
    error:
      resultadoFacturas.error || resultadoCompromisos.error || "",
  };
};