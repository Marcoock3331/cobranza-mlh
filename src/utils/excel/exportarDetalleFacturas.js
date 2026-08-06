import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const COLOR_PRIMARIO = "141D38";
const COLOR_SECUNDARIO = "FCDB32";

const COLUMNAS = [
  { key: "numeroCliente", width: 18 },
  { key: "cliente", width: 40 },
  { key: "grupo", width: 18 },
  { key: "folio", width: 20 },
  { key: "emision", width: 18 },
  { key: "vencimiento", width: 18 },
  { key: "montoTotal", width: 18 },
  { key: "pagado", width: 18 },
  { key: "saldoPendiente", width: 18 },

  // Dos líneas: fecha + monto
  { key: "ultimoPago", width: 24 },

  // Dos líneas: fecha + monto
  { key: "notaCredito", width: 24 },

  { key: "estatus", width: 24 },

  { key: "comentariosCliente", width: 45 },
];

const aplicarBordes = (fila) => {
  fila.eachCell((cell) => {
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };

    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  });
};

const aplicarFormatoMoneda = (worksheet, columna) => {
  worksheet.getColumn(columna).numFmt = '"$"#,##0.00';
};

const aplicarEstiloEstatus = (row, textoEstatus) => {
  const celda = row.getCell(12);

  celda.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };

  celda.font = {
    bold: true,
  };

  if (textoEstatus.startsWith("PAGADA")) {
    celda.font.color = {
      argb: "2E7D32",
    };

    return;
  }

  if (textoEstatus.startsWith("PENDIENTE")) {
    celda.font.color = {
      argb: "1565C0",
    };

    return;
  }

  if (textoEstatus.startsWith("VENCE HOY")) {
    celda.font.color = {
      argb: "EF6C00",
    };

    return;
  }

  if (textoEstatus.startsWith("VENCIDA")) {
    celda.font.color = {
      argb: "C62828",
    };

    return;
  }

  if (textoEstatus.startsWith("CANCELADA")) {
    celda.font.color = {
      argb: "616161",
    };
  }
};

const aplicarEstiloFila = (row, textoEstatus) => {
  if (!textoEstatus.startsWith("VENCIDA")) {
    return;
  }

  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "FFF5F5",
      },
    };
  });
};

const generarNombreArchivo = ({ grupo, fechaInicio, fechaFin } = {}) => {
  const hoy = new Date();
  const fechaHoy = [
    hoy.getFullYear(),
    String(hoy.getMonth() + 1).padStart(2, "0"),
    String(hoy.getDate()).padStart(2, "0"),
  ].join("-");

  let nombre = "Detalle_Facturas";

  if (grupo) {
    const grupoSeguro = grupo
      .trim()
      .replace(/\s+/g, "_")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w-]/g, "");

    nombre += `_${grupoSeguro}`;
  }

  if (fechaInicio && fechaFin) {
    const inicioSeguro = String(fechaInicio).replace(/[/\\]/g, "-");
    const finSeguro = String(fechaFin).replace(/[/\\]/g, "-");

    nombre += `_${inicioSeguro}_a_${finSeguro}`;
  } else {
    nombre += `_${fechaHoy}`;
  }

  return `${nombre}.xlsx`;
};

export const exportarDetalleFacturas = async ({
  datos = [],
  fechaInicio = "",
  fechaFin = "",
  grupo = "TODOS",
  metricas = {},
} = {}) => {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "MLH Cobranza";
  workbook.company = "MLH";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Detalle Facturas", {
    views: [
      {
        state: "frozen",
        ySplit: 7,
        xSplit: 1,
      },
    ],
  });

  // ===============================
  // INFORMACIÓN DEL REPORTE
  // ===============================

  worksheet.mergeCells("A1:D1");

  const infoTitulo = worksheet.getCell("A1");

  infoTitulo.value = "INFORMACIÓN DEL REPORTE";

  infoTitulo.font = {
    bold: true,
    size: 13,
    color: { argb: "FFFFFFFF" },
  };

  infoTitulo.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLOR_PRIMARIO },
  };

  infoTitulo.alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  const periodo =
    fechaInicio && fechaFin
      ? `${fechaInicio} al ${fechaFin}`
      : "Todos";

  const informacion = [
    ["Fecha de generación", new Date()],
    ["Tipo de reporte", "Detalle de Facturas"],
    ["Período", periodo],
    ["Grupo", grupo],
    ["Total de facturas", datos.length],
  ];

  informacion.forEach(([titulo, valor], index) => {
    const fila = 2 + index;

    worksheet.getCell(`A${fila}`).value = titulo;

    worksheet.getCell(`A${fila}`).font = {
      bold: true,
    };

    worksheet.getCell(`B${fila}`).value = valor;
  });

  worksheet.getCell("B2").numFmt = "dd/mm/yyyy hh:mm";

  // ===============================
  // RESUMEN EJECUTIVO
  // ===============================

  worksheet.mergeCells("F1:I1");

  const resumenTitulo = worksheet.getCell("F1");

  resumenTitulo.value = "RESUMEN EJECUTIVO";

  resumenTitulo.font = {
    bold: true,
    size: 13,
    color: { argb: "FFFFFFFF" },
  };

  resumenTitulo.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLOR_PRIMARIO },
  };

  resumenTitulo.alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  const resumen = [
    ["Total Facturado", metricas.totalFacturado || 0],
    ["Monto Recuperado", metricas.montoRecuperado || 0],
    ["Notas de Crédito", metricas.notasCredito || 0],
  ];

  resumen.forEach(([titulo, valor], index) => {
    const fila = 2 + index;

    worksheet.getCell(`F${fila}`).value = titulo;

    worksheet.getCell(`F${fila}`).font = {
      bold: true,
    };

    worksheet.getCell(`G${fila}`).value = valor;
  });

  worksheet.columns = COLUMNAS;

  const FILA_ENCABEZADO = 7;

  const encabezado = worksheet.getRow(FILA_ENCABEZADO);

  encabezado.values = [
    "Número Cliente",
    "Cliente",
    "Grupo",
    "Folio",
    "Fecha Emisión",
    "Fecha Vencimiento",
    "Monto Total",
    "Pagado",
    "Saldo Pendiente",
    "Último Abono",
    "Nota de Crédito",
    "Estatus",
    "Comentarios del Cliente",
  ];

  encabezado.font = {
    bold: true,
    color: {
      argb: "FFFFFFFF",
    },
  };

  encabezado.height = 24;

  encabezado.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };

  encabezado.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: COLOR_PRIMARIO,
    },
  };

  aplicarBordes(encabezado);

  worksheet.autoFilter = {
    from: {
      row: FILA_ENCABEZADO,
      column: 1,
    },
    to: {
      row: FILA_ENCABEZADO,
      column: COLUMNAS.length,
    },
  };

  let clienteActual = null;

  let resumenCliente = {
    facturas: 0,
    facturado: 0,
    pagado: 0,
    pendiente: 0,
  };

  let totalFacturadoGeneral = 0;
  let totalPagadoGeneral = 0;
  let totalPendienteGeneral = 0;

  const imprimirResumenCliente = () => {
    if (!clienteActual) {
      return;
    }

    const fila = worksheet.addRow({
      numeroCliente: "",
      cliente: "TOTAL DEL CLIENTE",
      grupo: `Cliente: ${clienteActual}`,
      folio: `Facturas: ${resumenCliente.facturas}`,
      emision: "",
      vencimiento: "",
      montoTotal: resumenCliente.facturado,
      pagado: resumenCliente.pagado,
      saldoPendiente: resumenCliente.pendiente,
      ultimoPago: "",
      notaCredito: "",
      estatus: "",
      comentariosCliente: "",
    });

    fila.font = {
      bold: true,
    };

    fila.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "FFF4CC",
      },
    };

    fila.height = 24;

    aplicarBordes(fila);

    // Bordes superior e inferior más notorios para destacar el subtotal
    fila.eachCell((cell) => {
      cell.border.top = { style: "medium" };
      cell.border.bottom = { style: "medium" };
    });
  };

  datos.forEach((fila) => {
    let textoUltimoPago = "Sin abonos registrados";

    let fechaPago = fila.ultimoPago;

    if (fechaPago) {
      if (fechaPago.toDate) {
        fechaPago = fechaPago.toDate();
      }

      if (fechaPago instanceof Date) {
        const fecha = fechaPago.toLocaleDateString("es-MX");

        textoUltimoPago = `${fecha}\n$${Number(
          fila.montoUltimoPago || 0,
        ).toLocaleString("es-MX", {
          minimumFractionDigits: 2,
        })}`;
      }
    }

    let textoNota = "Sin nota de crédito";

    if (
      fila.fechaNotaCredito &&
      fila.fechaNotaCredito !== "Sin nota de crédito"
    ) {
      let fechaNota = fila.fechaNotaCredito;

      if (fechaNota?.toDate) {
        fechaNota = fechaNota.toDate();
      }

      fechaNota = new Date(fechaNota);

      textoNota = `${fechaNota.toLocaleDateString("es-MX")}\n$${Number(
        fila.montoNotaCredito || 0,
      ).toLocaleString("es-MX", {
        minimumFractionDigits: 2,
      })}`;
    }

    // Agrupación por cliente
    if (fila.cliente !== clienteActual) {
      if (clienteActual !== null) {
        imprimirResumenCliente();

        const separador = worksheet.addRow({});
        separador.height = 12;
      }

      clienteActual = fila.cliente;
      resumenCliente = {
        facturas: 0,
        facturado: 0,
        pagado: 0,
        pendiente: 0,
      };
    }

    resumenCliente.facturas += 1;
    resumenCliente.facturado += Number(fila.montoTotal) || 0;
    resumenCliente.pagado += Number(fila.pagado) || 0;
    resumenCliente.pendiente += Number(fila.saldoPendiente) || 0;

    totalFacturadoGeneral += Number(fila.montoTotal) || 0;
    totalPagadoGeneral += Number(fila.pagado) || 0;
    totalPendienteGeneral += Number(fila.saldoPendiente) || 0;

    const row = worksheet.addRow({
      numeroCliente: fila.numeroCliente,
      cliente: fila.cliente,
      grupo: fila.grupo,
      folio: fila.folio,
      emision: fila.emision,
      vencimiento: fila.vencimiento,
      montoTotal: fila.montoTotal,
      pagado: fila.pagado,
      saldoPendiente: fila.saldoPendiente,
      ultimoPago: textoUltimoPago,
      notaCredito: textoNota,
      estatus: fila.estatusVisual || fila.estatus,
      comentariosCliente: fila.notas_internas || "",
    });

    const comentario = String(fila.notas_internas || "");

const lineas = Math.max(
  comentario.split("\n").length,
  Math.ceil(comentario.length / 45),
);

row.height = Math.max(38, lineas * 18);

    row.getCell(10).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };

    row.getCell(11).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };

    row.getCell(13).alignment = {
  horizontal: "left",
  vertical: "middle",
  wrapText: true,
};

    aplicarBordes(row);

    const textoEstatus = String(
      fila.estatusVisual || fila.estatus || "",
    ).toUpperCase();

    aplicarEstiloEstatus(row, textoEstatus);
    aplicarEstiloFila(row, textoEstatus);
  });

  imprimirResumenCliente();

  const separadorFinal = worksheet.addRow({});
  separadorFinal.height = 12;

  const filaTotales = worksheet.lastRow.number + 2;

  const total = worksheet.getCell(`A${filaTotales}`);

  total.value = "TOTAL GENERAL";

  total.font = {
    bold: true,
  };

  worksheet.getCell(`G${filaTotales}`).value = totalFacturadoGeneral;
  worksheet.getCell(`H${filaTotales}`).value = totalPagadoGeneral;
  worksheet.getCell(`I${filaTotales}`).value = totalPendienteGeneral;

  const filaTotal = worksheet.getRow(filaTotales);

  filaTotal.height = 30;

  filaTotal.font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
  };

  filaTotal.alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  filaTotal.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: COLOR_PRIMARIO,
    },
  };

  // Aplicar borde general y luego sobreescribir superior/inferior
  aplicarBordes(filaTotal);

  filaTotal.eachCell((cell) => {
    cell.border.top = { style: "medium" };
    cell.border.bottom = { style: "medium" };
  });

  // Valores monetarios con color secundario
  const celdaG = filaTotal.getCell(7);
  const celdaH = filaTotal.getCell(8);
  const celdaI = filaTotal.getCell(9);

  celdaG.font = {
    bold: true,
    color: { argb: COLOR_SECUNDARIO },
  };
  celdaH.font = {
    bold: true,
    color: { argb: COLOR_SECUNDARIO },
  };
  celdaI.font = {
    bold: true,
    color: { argb: COLOR_SECUNDARIO },
  };

  // Formato de fechas
  worksheet.getColumn(5).numFmt = "dd/mm/yyyy";
  worksheet.getColumn(6).numFmt = "dd/mm/yyyy";

  // Formato de moneda
  aplicarFormatoMoneda(worksheet, 7);
  aplicarFormatoMoneda(worksheet, 8);
  aplicarFormatoMoneda(worksheet, 9);

  const buffer = await workbook.xlsx.writeBuffer();

  saveAs(new Blob([buffer]), generarNombreArchivo({ grupo, fechaInicio, fechaFin }));
};