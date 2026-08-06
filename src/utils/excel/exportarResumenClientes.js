import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const COLOR_PRIMARIO = "141D38";
const COLOR_SECUNDARIO = "FCDB32";
const TEXTO_BLANCO = "FFFFFFFF";
const TEXTO_OSCURO = "00000000";

const formatearFechaExcel = (fecha) => {
  if (!fecha) return "N/A";
  if (fecha instanceof Date) return fecha.toLocaleDateString("es-MX");
  if (fecha.toDate) return fecha.toDate().toLocaleDateString("es-MX");
  if (fecha.seconds) return new Date(fecha.seconds * 1000).toLocaleDateString("es-MX");
  const d = new Date(fecha);
  return !isNaN(d.getTime()) ? d.toLocaleDateString("es-MX") : fecha;
};

const aplicarBordes = (cellOrRow) => {
  const bordes = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" },
  };

  if (cellOrRow.eachCell) {
    cellOrRow.eachCell((cell) => {
      cell.border = bordes;
    });
  } else {
    cellOrRow.border = bordes;
  }
};

const aplicarEstiloEncabezadoTabla = (fila) => {
  fila.font = { bold: true, color: { argb: TEXTO_OSCURO } };
  fila.height = 20;
  fila.alignment = { horizontal: "center", vertical: "middle" };
  fila.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_SECUNDARIO } };
  aplicarBordes(fila);
};

const aplicarEstiloSeccion = (ws, filaNum, titulo) => {
  ws.mergeCells(`A${filaNum}:H${filaNum}`);
  const celda = ws.getCell(`A${filaNum}`);
  celda.value = titulo;
  celda.font = { bold: true, color: { argb: TEXTO_BLANCO }, size: 11 };
  celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_PRIMARIO } };
  celda.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(filaNum).height = 22;
};

const generarNombreArchivo = (nombreCliente = "Cliente") => {
  const hoy = new Date();
  const fecha = [
    hoy.getFullYear(),
    String(hoy.getMonth() + 1).padStart(2, "0"),
    String(hoy.getDate()).padStart(2, "0"),
  ].join("-");
  const nombreLimpio = nombreCliente.replace(/[^a-zA-Z0-9]/g, "_");
  return `Expediente_Financiero_${nombreLimpio}_${fecha}.xlsx`;
};

export const exportarResumenClientes = async ({
  expediente = {},
  fechaInicio = "",
  fechaFin = "",
  userName = "Usuario",
} = {}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MLH Cobranza";
  workbook.company = "MLH";
  workbook.created = new Date();

  const { cliente, indicadores, ultimoPago, facturas, historialAbonos, historialNotas } = expediente;

  const ws = workbook.addWorksheet("Expediente Financiero");
  ws.columns = [
    { width: 18 }, { width: 22 }, { width: 18 }, { width: 22 },
    { width: 18 }, { width: 22 }, { width: 18 }, { width: 22 }
  ];

  // ==========================================
  // ENCABEZADO
  // ==========================================
  ws.mergeCells("A1:H2");
  const titulo = ws.getCell("A1");
  titulo.value = "MLH COBRANZA - EXPEDIENTE FINANCIERO DEL CLIENTE";
  titulo.font = { bold: true, size: 16, color: { argb: TEXTO_BLANCO } };
  titulo.alignment = { horizontal: "center", vertical: "middle" };
  titulo.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_PRIMARIO } };

  ws.getCell("A3").value = "Fecha de generación:";
  ws.getCell("A3").font = { bold: true };
  ws.getCell("B3").value = formatearFechaExcel(new Date());

  ws.getCell("D3").value = "Periodo seleccionado:";
  ws.getCell("D3").font = { bold: true };
  ws.getCell("E3").value = fechaInicio && fechaFin ? `${fechaInicio} al ${fechaFin}` : "Histórico Completo";

  ws.getCell("G3").value = "Usuario que generó:";
  ws.getCell("G3").font = { bold: true };
  ws.getCell("H3").value = userName;

  // ==========================================
  // SECCIÓN 1: DATOS GENERALES
  // ==========================================
  aplicarEstiloSeccion(ws, 5, "SECCIÓN 1 - DATOS GENERALES");

  ws.getCell("A6").value = "Número de cliente"; ws.getCell("A6").font = { bold: true };
  ws.getCell("B6").value = cliente.numeroCliente || "N/A";
  ws.getCell("C6").value = "Nombre"; ws.getCell("C6").font = { bold: true };
  ws.getCell("D6").value = cliente.nombre || "N/A";
  ws.getCell("E6").value = "Grupo"; ws.getCell("E6").font = { bold: true };
  ws.getCell("F6").value = cliente.grupo || "N/A";
  ws.getCell("G6").value = "RFC"; ws.getCell("G6").font = { bold: true };
  ws.getCell("H6").value = cliente.rfc || "N/A";

  ws.getCell("A7").value = "Correo"; ws.getCell("A7").font = { bold: true };
  ws.getCell("B7").value = cliente.correo || "N/A";
  ws.getCell("C7").value = "Teléfono"; ws.getCell("C7").font = { bold: true };
  ws.getCell("D7").value = cliente.telefono || "N/A";
  ws.getCell("E7").value = "Segmentación"; ws.getCell("E7").font = { bold: true };
  ws.getCell("F7").value = cliente.segmentacion || "N/A";
  ws.getCell("G7").value = "Estado"; ws.getCell("G7").font = { bold: true };
  ws.getCell("H7").value = cliente.estado || "N/A";

  ws.getCell("A8").value = "Dirección"; ws.getCell("A8").font = { bold: true };
  ws.mergeCells("B8:H8");
  ws.getCell("B8").value = cliente.direccion || "N/A";

  [6, 7, 8].forEach(rowIdx => {
    ws.getRow(rowIdx).eachCell(cell => { cell.border = { bottom: { style: 'dotted' } }; });
  });

  // ==========================================
  // SECCIÓN 2: RESUMEN FINANCIERO
  // ==========================================
  aplicarEstiloSeccion(ws, 10, "SECCIÓN 2 - RESUMEN FINANCIERO");

  const confIndicadores = [
    { row: 11, colH: "A", colV: "B", label: "Deuda actual", val: indicadores.deudaActual, isCurrency: true },
    { row: 11, colH: "C", colV: "D", label: "Deuda vigente", val: indicadores.deudaVigente, isCurrency: true },
    { row: 11, colH: "E", colV: "F", label: "Saldo vencido", val: indicadores.saldoVencido, isCurrency: true },
    { row: 11, colH: "G", colV: "H", label: "Límite de crédito", val: indicadores.limiteCredito, isCurrency: true },

    { row: 12, colH: "A", colV: "B", label: "Crédito disponible", val: indicadores.creditoDisponible, isCurrency: true },
    { row: 12, colH: "C", colV: "D", label: "Total facturado", val: indicadores.totalFacturado, isCurrency: true },
    { row: 12, colH: "E", colV: "F", label: "Total liquidado", val: indicadores.totalLiquidado, isCurrency: true },
    { row: 12, colH: "G", colV: "H", label: "Monto recuperado", val: indicadores.montoRecuperado, isCurrency: true },

    { row: 13, colH: "A", colV: "B", label: "Número de facturas", val: indicadores.numeroFacturas, isCurrency: false },
    { row: 13, colH: "C", colV: "D", label: "Facturas vencidas", val: indicadores.facturasVencidas, isCurrency: false },
    { row: 13, colH: "E", colV: "F", label: "Núm. notas crédito", val: indicadores.numeroNotasCredito, isCurrency: false },
    { row: 13, colH: "G", colV: "H", label: "Total notas crédito", val: indicadores.totalNotasCredito, isCurrency: true },
  ];

  confIndicadores.forEach(ind => {
    ws.getCell(`${ind.colH}${ind.row}`).value = ind.label;
    ws.getCell(`${ind.colH}${ind.row}`).font = { bold: true };
    ws.getCell(`${ind.colV}${ind.row}`).value = ind.val;
    if (ind.isCurrency) ws.getCell(`${ind.colV}${ind.row}`).numFmt = '"$"#,##0.00';
    ws.getCell(`${ind.colH}${ind.row}`).border = { bottom: { style: 'dotted' } };
    ws.getCell(`${ind.colV}${ind.row}`).border = { bottom: { style: 'dotted' } };
  });

  // ==========================================
  // SECCIÓN 3: ÚLTIMO MOVIMIENTO
  // ==========================================
  aplicarEstiloSeccion(ws, 15, "SECCIÓN 3 - ÚLTIMO MOVIMIENTO (PAGO)");

  if (ultimoPago) {
    ws.getCell("A16").value = "Fecha"; ws.getCell("A16").font = { bold: true };
    ws.getCell("B16").value = formatearFechaExcel(ultimoPago.fecha);
    ws.getCell("C16").value = "Monto"; ws.getCell("C16").font = { bold: true };
    ws.getCell("D16").value = ultimoPago.monto;
    ws.getCell("D16").numFmt = '"$"#,##0.00';
    ws.getCell("E16").value = "Método"; ws.getCell("E16").font = { bold: true };
    ws.getCell("F16").value = ultimoPago.metodo;
    ws.getCell("G16").value = "Factura"; ws.getCell("G16").font = { bold: true };
    ws.getCell("H16").value = ultimoPago.factura;
    ws.getRow(16).eachCell(cell => { cell.border = { bottom: { style: 'dotted' } }; });
  } else {
    ws.mergeCells("A16:H16");
    const cell = ws.getCell("A16");
    cell.value = "Sin pagos registrados";
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.font = { italic: true, color: { argb: "808080" } };
  }

  // ==========================================
  // SECCIÓN 4: HISTORIAL DE FACTURAS
  // ==========================================
  aplicarEstiloSeccion(ws, 18, "SECCIÓN 4 - HISTORIAL DE FACTURAS");
  
  const hFacturasRow = ws.getRow(19);
  hFacturasRow.values = ["Folio", "Fecha de Emisión", "Fecha de Vencimiento", "Total", "Pagado", "Saldo Pendiente", "Estado", "Estado Visual"];
  aplicarEstiloEncabezadoTabla(hFacturasRow);

  let filaActual = 20;
  facturas.forEach(f => {
    const row = ws.getRow(filaActual);
    row.values = [f.folio, formatearFechaExcel(f.emision), formatearFechaExcel(f.vencimiento), f.monto, f.pagado, f.saldoPendiente, f.estado, f.estadoVisual];
    aplicarBordes(row);
    row.getCell(4).numFmt = '"$"#,##0.00';
    row.getCell(5).numFmt = '"$"#,##0.00';
    row.getCell(6).numFmt = '"$"#,##0.00';
    row.alignment = { horizontal: "center", vertical: "middle" };
    filaActual++;
  });
  if (facturas.length === 0) {
    ws.mergeCells(`A${filaActual}:H${filaActual}`);
    ws.getCell(`A${filaActual}`).value = "Sin facturas registradas";
    ws.getCell(`A${filaActual}`).alignment = { horizontal: "center" };
    filaActual++;
  }

  // ==========================================
  // SECCIÓN 5: HISTORIAL DE ABONOS
  // ==========================================
  filaActual += 2;
  aplicarEstiloSeccion(ws, filaActual, "SECCIÓN 5 - HISTORIAL DE ABONOS");
  filaActual++;
  
  const hAbonosRow = ws.getRow(filaActual);
  hAbonosRow.values = ["Fecha", "Factura", "Método", "Monto", "Saldo Restante", "Registrado Por", "", ""];
  ws.mergeCells(`F${filaActual}:H${filaActual}`); // Expandir Registrado Por
  aplicarEstiloEncabezadoTabla(hAbonosRow);
  filaActual++;

  historialAbonos.forEach(a => {
    const row = ws.getRow(filaActual);
    row.getCell(1).value = formatearFechaExcel(a.fecha);
    row.getCell(2).value = a.factura;
    row.getCell(3).value = a.metodo;
    row.getCell(4).value = a.monto; row.getCell(4).numFmt = '"$"#,##0.00';
    row.getCell(5).value = a.saldoRestante; row.getCell(5).numFmt = '"$"#,##0.00';
    ws.mergeCells(`F${filaActual}:H${filaActual}`);
    row.getCell(6).value = a.registradoPor;
    aplicarBordes(row);
    row.alignment = { horizontal: "center", vertical: "middle" };
    filaActual++;
  });
  if (historialAbonos.length === 0) {
    ws.mergeCells(`A${filaActual}:H${filaActual}`);
    ws.getCell(`A${filaActual}`).value = "Sin abonos registrados";
    ws.getCell(`A${filaActual}`).alignment = { horizontal: "center" };
    filaActual++;
  }

  // ==========================================
  // SECCIÓN 6: HISTORIAL DE NOTAS DE CRÉDITO
  // ==========================================
  filaActual += 2;
  aplicarEstiloSeccion(ws, filaActual, "SECCIÓN 6 - HISTORIAL DE NOTAS DE CRÉDITO");
  filaActual++;
  
  const hNotasRow = ws.getRow(filaActual);
  hNotasRow.values = ["Fecha", "Factura", "Monto", "Motivo", "Estado", "", "", ""];
  ws.mergeCells(`D${filaActual}:E${filaActual}`); // Expandir Motivo
  ws.mergeCells(`F${filaActual}:H${filaActual}`); // Expandir Estado
  aplicarEstiloEncabezadoTabla(hNotasRow);
  filaActual++;

  historialNotas.forEach(n => {
    const row = ws.getRow(filaActual);
    row.getCell(1).value = formatearFechaExcel(n.fecha);
    row.getCell(2).value = n.factura;
    row.getCell(3).value = n.monto; row.getCell(3).numFmt = '"$"#,##0.00';
    ws.mergeCells(`D${filaActual}:E${filaActual}`);
    row.getCell(4).value = n.motivo;
    ws.mergeCells(`F${filaActual}:H${filaActual}`);
    row.getCell(6).value = n.estado;
    aplicarBordes(row);
    row.alignment = { horizontal: "center", vertical: "middle" };
    filaActual++;
  });
  if (historialNotas.length === 0) {
    ws.mergeCells(`A${filaActual}:H${filaActual}`);
    ws.getCell(`A${filaActual}`).value = "Sin notas de crédito registradas";
    ws.getCell(`A${filaActual}`).alignment = { horizontal: "center" };
    filaActual++;
  }

  // ==========================================
  // SECCIÓN 7: COMENTARIOS INTERNOS
  // ==========================================
  filaActual += 2;
  aplicarEstiloSeccion(ws, filaActual, "SECCIÓN 7 - COMENTARIOS INTERNOS");
  filaActual++;
  
  ws.mergeCells(`A${filaActual}:H${filaActual+2}`);
  const notasCelda = ws.getCell(`A${filaActual}`);
  notasCelda.value = cliente.comentariosInternos?.trim() || "Sin comentarios registrados";
  notasCelda.alignment = { vertical: "top", horizontal: "left", wrapText: true };
  aplicarBordes(notasCelda);

  // Exportación
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), generarNombreArchivo(cliente.nombre));
};