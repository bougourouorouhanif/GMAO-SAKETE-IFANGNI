import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export async function rowsToXlsx(rows, { sheetName = 'Données', columns } = {}) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);

  if (!rows.length && !columns) return wb;

  const cols = columns || Object.keys(rows[0]).map((k) => ({ header: k, key: k, width: 20 }));
  ws.columns = cols;
  ws.addRows(rows);
  ws.getRow(1).font = { bold: true };
  return wb;
}

export async function sendXlsx(res, wb, filename) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await wb.xlsx.write(res);
  res.end();
}

export function sendPdf(res, filename, render) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);
  render(doc);
  doc.end();
}
