import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const COLOR_PRIMARIO = "141D38";

const COLUMNAS = [
  { key: "numeroCliente", width: 16 },  
  { key: "cliente", width: 30 },
  { key: "grupo", width: 18 },
  { key: "estado", width: 15 },
  { key: "limiteCredito", width: 20 },
  { key: "creditoDisponible", width: 20 },
  { key: "montoRecuperado", width: 20 },
  { key: "deudaActual", width: 18 },
  { key: "saldoVencido", width: 18 },
  { key: "totalFacturas", width: 18 },
  { key: "facturasVencidas", width: 18 },
  { key: "numNotasCredito", width: 18 },
  { key: "montoNotasCredito", width: 22 },
  { key: "ultimoPago", width: 28 },
  { key: "comentariosCliente", width: 60 },
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

const generarNombreArchivo = ({ grupo, fechaInicio, fechaFin } = {}) => {
  const hoy = new Date();
  const fechaHoy = [
    hoy.getFullYear(),
    String(hoy.getMonth() + 1).padStart(2, "0"),
    String(hoy.getDate()).padStart(2, "0"),
  ].join("-");

  let nombre = "Reporte_General_Clientes";

// Solo agregar el grupo cuando realmente se filtró
if (
  grupo &&
  grupo !== "TODOS"
) {
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

export const exportarReporteGeneralClientes = async ({
  datos = [],
  fechaInicio = "",
  fechaFin = "",
  grupo = "TODOS",
} = {}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MLH Cobranza";
  workbook.company = "MLH";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Reporte General Clientes", {
    views: [{ state: "frozen", ySplit: 7, xSplit: 1 }],
  });

  // ===============================
  // INFORMACIÓN DEL REPORTE
  // ===============================
  worksheet.mergeCells("A1:B1");
  const infoTitulo = worksheet.getCell("A1");
  infoTitulo.value = "INFORMACIÓN DEL REPORTE";
  infoTitulo.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
  infoTitulo.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_PRIMARIO } };
  infoTitulo.alignment = { horizontal: "center", vertical: "middle" };

  const periodo =
    fechaInicio && fechaFin ? `${fechaInicio} al ${fechaFin}` : "Todos";

  const fechaGeneracion = new Date().toLocaleString("es-MX", {
  timeZone: "America/Mexico_City",
});  

  const informacion = [
    ["Fecha de generación", fechaGeneracion],
    ["Tipo de reporte", "Reporte General de Clientes"],
    ["Período", periodo],
    ["Grupo", grupo],
    ["Total de clientes", datos.length],
  ];

  informacion.forEach(([titulo, valor], index) => {
    const fila = 2 + index;
    worksheet.getCell(`A${fila}`).value = titulo;
    worksheet.getCell(`A${fila}`).font = { bold: true };
    worksheet.getCell(`B${fila}`).value = valor;
  });
  // ===============================
  // RESUMEN EJECUTIVO (ahora RESUMEN GENERAL)
  // ===============================
  worksheet.mergeCells("F1:G1"); 
  const resumenTitulo = worksheet.getCell("F1");
  resumenTitulo.value = "RESUMEN GENERAL";
  resumenTitulo.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
  resumenTitulo.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_PRIMARIO } };
  resumenTitulo.alignment = { horizontal: "center", vertical: "middle" };

  const totalDeudaActual = datos.reduce(
  (sum, item) => sum + (item.deudaActual || 0),
  0,
);

const totalSaldoVencido = datos.reduce(
  (sum, item) => sum + (item.saldoVencido || 0),
  0,
);

const totalMontoRecuperado = datos.reduce(
  (sum, item) => sum + (item.montoRecuperado || 0),
  0,
);

const totalFacturas = datos.reduce(
  (sum, item) => sum + (item.totalFacturas || 0),
  0,
);

const totalNumNotasCredito = datos.reduce(
  (sum, item) => sum + (item.numNotasCredito || 0),
  0,
);

const totalMontoNotasCredito = datos.reduce(
  (sum, item) => sum + (item.montoNotasCredito || 0),
  0,
);

  const resumen = [
  ["Deuda Total", totalDeudaActual],
  ["Saldo Vencido Total", totalSaldoVencido],
  ["Monto Recuperado", totalMontoRecuperado],
  ["No. de Facturas", totalFacturas],
  ["No. Total Notas Crédito", totalNumNotasCredito],
  ["Monto Total Notas Crédito", totalMontoNotasCredito],
];

  resumen.forEach(([titulo, valor], index) => {

   // Aplicar formato definitivo al resumen
worksheet.getCell("G2").numFmt = '"$"#,##0.00';
worksheet.getCell("G3").numFmt = '"$"#,##0.00';
worksheet.getCell("G4").numFmt = '"$"#,##0.00';

worksheet.getCell("G5").numFmt = "0";
worksheet.getCell("G6").numFmt = "0";
worksheet.getCell("G7").numFmt = '"$"#,##0.00';

worksheet.getCell("G3").font = {
  bold: true,
  color: { argb: "C00000" }, // rojo
};

worksheet.getCell("G4").font = {
  bold: true,
  color: { argb: "008000" }, // verde
};
  
  const fila = 2 + index;

  worksheet.getCell(`F${fila}`).value = titulo;
  worksheet.getCell(`F${fila}`).font = { bold: true };

 const celda = worksheet.getCell(`G${fila}`);
 celda.value = valor;

if (
  titulo === "Deuda Total" ||
  titulo === "Saldo Vencido Total" ||
  titulo === "Monto Total Notas Crédito"
) {
  celda.numFmt = '"$"#,##0.00';
} else {
  celda.numFmt = '0';
}
});

  worksheet.columns = COLUMNAS;

  const FILA_ENCABEZADO = 7;
  const encabezado = worksheet.getRow(FILA_ENCABEZADO);
  encabezado.values = [
    "No. Cliente",
    "Cliente",
    "Grupo",
    "Estado",
    "Límite Crédito",
    "Crédito Disponible",
    "Monto Recuperado",
    "Deuda Actual",
    "Saldo Vencido",
    "No. Facturas",
    "Facturas Vencidas",
    "No. Notas Crédito",
    "Monto Notas Crédito",
    "Último Abono",
    "Comentarios del Cliente",
  ];

  encabezado.font = { bold: true, color: { argb: "FFFFFFFF" } };
  encabezado.height = 24;
  encabezado.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  encabezado.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_PRIMARIO } };
  aplicarBordes(encabezado);

  worksheet.autoFilter = {
    from: { row: FILA_ENCABEZADO, column: 1 },
    to: { row: FILA_ENCABEZADO, column: COLUMNAS.length },
  };

  // Datos
  datos.forEach((item) => {
    // Formato de Último Pago (fecha + monto en dos líneas)
    let textoUltimoPago = "Sin abonos registrados";
    if (item.ultimoPagoFecha) {
      try {
        const fecha = new Date(item.ultimoPagoFecha);
        if (!isNaN(fecha)) {
          const fechaFormateada = fecha.toLocaleDateString("es-MX");
          textoUltimoPago = `${fechaFormateada}\n$${Number(
            item.montoUltimoPago || 0
          ).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
        }
      } catch {
        textoUltimoPago = "Fecha inválida";
      }
    }

    const row = worksheet.addRow({
      numeroCliente: item.numeroCliente,
      cliente: item.cliente,
      grupo: item.grupo,
      estado: item.estado,
      limiteCredito: item.limiteCredito,
      creditoDisponible: item.creditoDisponible,
      montoRecuperado: item.montoRecuperado,
      deudaActual: item.deudaActual,
      saldoVencido: item.saldoVencido,
      totalFacturas: item.totalFacturas,
      facturasVencidas: item.facturasVencidas,
      numNotasCredito: item.numNotasCredito,
      montoNotasCredito: item.montoNotasCredito,
      ultimoPago: textoUltimoPago,
      comentariosCliente: item.comentariosCliente,
    });

    row.height = 55;

    aplicarBordes(row);

    // Monto Recuperado (verde)
if (item.montoRecuperado > 0) {
  row.getCell(7).font = {
    bold: true,
    color: { argb: "008000" },
  };
}

// Saldo Vencido (rojo)
if (item.saldoVencido > 0) {
  row.getCell(9).font = {
    bold: true,
    color: { argb: "C00000" },
  };
}

    row.getCell(13).alignment = {
  horizontal: "center",
  vertical: "middle",
  wrapText: true,
};

row.getCell(14).alignment = {
  horizontal: "center",
  vertical: "middle",
  wrapText: true,
};   // Comentarios

  });

  const primeraFila = FILA_ENCABEZADO + 1;
const ultimaFila = worksheet.lastRow.number;

for (let fila = primeraFila; fila <= ultimaFila; fila++) {

  worksheet.getCell(`E${fila}`).numFmt = '"$"#,##0.00';
  worksheet.getCell(`F${fila}`).numFmt = '"$"#,##0.00';
  worksheet.getCell(`G${fila}`).numFmt = '"$"#,##0.00';
  worksheet.getCell(`H${fila}`).numFmt = '"$"#,##0.00';

  worksheet.getCell(`I${fila}`).numFmt = "0";
  worksheet.getCell(`J${fila}`).numFmt = "0";
  worksheet.getCell(`K${fila}`).numFmt = "0";

  worksheet.getCell(`L${fila}`).numFmt = '"$"#,##0.00';
}

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), generarNombreArchivo({ grupo, fechaInicio, fechaFin }));
};