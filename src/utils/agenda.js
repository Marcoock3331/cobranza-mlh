const DOS_DIGITOS = (valor) => String(valor).padStart(2, "0");

export const inicioDelDia = (fecha) => {
  const resultado = new Date(fecha);
  resultado.setHours(0, 0, 0, 0);
  return resultado;
};

export const sumarDias = (fecha, dias) => {
  const resultado = new Date(fecha);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
};

export const fechaAClave = (fecha) => {
  if (!fecha) return "";

  let valor = fecha;

  if (typeof fecha?.toDate === "function") {
    valor = fecha.toDate();
  } else if (typeof fecha?.seconds === "number") {
    valor = new Date(fecha.seconds * 1000);
  } else if (typeof fecha === "string") {
    const texto = fecha.trim().split(" ")[0];

    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
      return texto;
    }

    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(texto)) {
      const [dia, mes, anio] = texto.split("/");
      return `${anio}-${DOS_DIGITOS(mes)}-${DOS_DIGITOS(dia)}`;
    }

    valor = new Date(fecha);
  }

  if (!(valor instanceof Date) || Number.isNaN(valor.getTime())) {
    return "";
  }

  return `${valor.getFullYear()}-${DOS_DIGITOS(valor.getMonth() + 1)}-${DOS_DIGITOS(valor.getDate())}`;
};

export const claveAFecha = (clave) => {
  if (!clave || !/^\d{4}-\d{2}-\d{2}$/.test(clave)) {
    return null;
  }

  const [anio, mes, dia] = clave.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  fecha.setHours(0, 0, 0, 0);
  return fecha;
};

export const obtenerInicioSemana = (fecha) => {
  const inicio = inicioDelDia(fecha);
  const dia = inicio.getDay();
  const ajuste = dia === 0 ? -6 : 1 - dia;
  return sumarDias(inicio, ajuste);
};

export const obtenerRangoAgenda = (fechaBase, vista = "SEMANA") => {
  const base = inicioDelDia(fechaBase);

  if (vista === "DIA") {
    return {
      inicio: base,
      fin: sumarDias(base, 1),
    };
  }

  if (vista === "MES") {
    const inicio = new Date(base.getFullYear(), base.getMonth(), 1);
    const fin = new Date(base.getFullYear(), base.getMonth() + 1, 1);
    return { inicio, fin };
  }

  const inicio = obtenerInicioSemana(base);
  return {
    inicio,
    fin: sumarDias(inicio, 7),
  };
};

export const generarDiasRango = (inicio, fin) => {
  const dias = [];
  let cursor = inicioDelDia(inicio);
  const limite = inicioDelDia(fin);

  while (cursor < limite) {
    dias.push(new Date(cursor));
    cursor = sumarDias(cursor, 1);
  }

  return dias;
};

export const clasificarFacturaAgenda = (factura) => {
  const saldo = Number(factura?.saldo_pendiente) || 0;
  if (saldo <= 0) return null;

  const claveVencimiento = fechaAClave(factura?.vencimiento);
  const fechaVencimiento = claveAFecha(claveVencimiento);

  if (!fechaVencimiento) return null;

  const hoy = inicioDelDia(new Date());
  return fechaVencimiento < hoy ? "VENCIDAS" : "POR_VENCER";
};

export const inferirTipoVinculo = (compromiso = {}) => {
  if (compromiso.tipo_vinculo) {
    return compromiso.tipo_vinculo;
  }

  if (compromiso.factura_id) return "FACTURA";
  if (compromiso.cliente_id && compromiso.cliente_id !== "N/A") {
    return "CLIENTE";
  }

  return "GENERAL";
};

export const construirEventosAgenda = (facturas = [], compromisos = []) => {
  const eventosFacturas = facturas
    .map((factura) => {
      const categoria = clasificarFacturaAgenda(factura);
      const fechaClave = fechaAClave(factura.vencimiento);

      if (!categoria || !fechaClave) return null;

      return {
        id: `factura-${factura.id}`,
        origen: "FACTURA",
        categoria,
        fechaClave,
        fecha: claveAFecha(fechaClave),
        titulo: factura.folio || "Factura sin folio",
        cliente: factura.cliente || "Cliente sin nombre",
        cliente_id: factura.cliente_id || "",
        factura_id: factura.id,
        folio: factura.folio || "S/F",
        monto: Number(factura.saldo_pendiente) || 0,
        telefono: factura.telefono || "",
        estatus: categoria === "VENCIDAS" ? "Vencida" : "Por vencer",
        detalle: factura,
      };
    })
    .filter(Boolean);

  const eventosCompromisos = compromisos
    .map((compromiso) => {
      const fechaClave = fechaAClave(compromiso.fecha_compromiso);
      if (!fechaClave) return null;

      return {
        id: `compromiso-${compromiso.id}`,
        origen: "COMPROMISO",
        categoria: "RECORDATORIOS",
        fechaClave,
        fecha: claveAFecha(fechaClave),
        titulo:
          compromiso.titulo ||
          compromiso.motivo ||
          "Recordatorio sin título",
        motivo: compromiso.motivo || "",
        cliente: compromiso.cliente_nombre || "",
        cliente_id:
          compromiso.cliente_id && compromiso.cliente_id !== "N/A"
            ? compromiso.cliente_id
            : "",
        factura_id: compromiso.factura_id || "",
        folio: compromiso.folio_factura || "",
        monto: Number(compromiso.monto) || 0,
        telefono: compromiso.telefono || "",
        tipoVinculo: inferirTipoVinculo(compromiso),
        tipoEvento: compromiso.tipo_evento || "Recordatorio",
        estatus: compromiso.estatus || "Pendiente",
        ultimaAccion: compromiso.ultima_accion || null,
        detalle: compromiso,
      };
    })
    .filter(Boolean);

  return [...eventosFacturas, ...eventosCompromisos].sort((a, b) => {
    if (a.fechaClave !== b.fechaClave) {
      return a.fechaClave.localeCompare(b.fechaClave);
    }

    return a.categoria.localeCompare(b.categoria);
  });
};

export const agruparEventosPorDia = (eventos = []) =>
  eventos.reduce((acumulado, evento) => {
    if (!acumulado[evento.fechaClave]) {
      acumulado[evento.fechaClave] = [];
    }

    acumulado[evento.fechaClave].push(evento);
    return acumulado;
  }, {});

export const contarCategorias = (eventos = []) => ({
  VENCIDAS: eventos.filter((evento) => evento.categoria === "VENCIDAS").length,
  POR_VENCER: eventos.filter(
    (evento) => evento.categoria === "POR_VENCER",
  ).length,
  RECORDATORIOS: eventos.filter(
    (evento) => evento.categoria === "RECORDATORIOS",
  ).length,
});

export const formatearPeriodo = (inicio, fin, vista) => {
  if (vista === "DIA") {
    return inicio.toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  if (vista === "MES") {
    return inicio.toLocaleDateString("es-MX", {
      month: "long",
      year: "numeric",
    });
  }

  const ultimoDia = sumarDias(fin, -1);
  const mismoMes = inicio.getMonth() === ultimoDia.getMonth();

  if (mismoMes) {
    return `${inicio.getDate()}–${ultimoDia.getDate()} de ${inicio.toLocaleDateString("es-MX", {
      month: "long",
      year: "numeric",
    })}`;
  }

  return `${inicio.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  })} – ${ultimoDia.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
};