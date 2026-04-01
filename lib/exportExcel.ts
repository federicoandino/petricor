import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { ReconciliationRow, Summary } from './reconcile';
import { formatARS } from './utils';

function statusLabel(status: ReconciliationRow['status']): string {
  switch (status) {
    case 'conciliado':
      return 'Conciliado';
    case 'descuadre':
      return 'Descuadre';
    case 'soloNavePoint':
      return 'Solo Nave Point';
    case 'soloMaxirest':
      return 'Solo Maxirest';
    case 'efectivo':
      return 'Efectivo';
    default:
      return status;
  }
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export function exportToExcel(
  rows: ReconciliationRow[],
  summary: Summary,
  dateLabel: string
): void {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Reconciliation ──────────────────────────────────────────────
  const reconciliationHeader = [
    'Fecha',
    'Medio de Pago',
    'Total Nave Point',
    'Total Maxirest',
    'Diferencia',
    'Estado',
  ];

  const reconciliationData = rows.map((r) => [
    formatDate(r.date),
    r.medioPago,
    r.totalNavePoint !== null ? r.totalNavePoint : '',
    r.totalMaxirest !== null ? r.totalMaxirest : '',
    r.diferencia !== null ? r.diferencia : '',
    statusLabel(r.status),
  ]);

  const wsData = [reconciliationHeader, ...reconciliationData];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, // Fecha
    { wch: 22 }, // Medio de Pago
    { wch: 18 }, // Total Nave Point
    { wch: 18 }, // Total Maxirest
    { wch: 14 }, // Diferencia
    { wch: 16 }, // Estado
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Conciliación');

  // ── Sheet 2: Summary ─────────────────────────────────────────────────────
  const summaryData = [
    ['Resumen de Conciliación', ''],
    ['', ''],
    ['Total Nave Point (tarjetas)', summary.totalNavePoint],
    ['Total Maxirest (tarjetas)', summary.totalMaxirestTarjetas],
    ['Total Efectivo (Maxirest)', summary.totalEfectivo],
    ['Diferencia Total', summary.diferenciaTotal],
    ['% Conciliado', `${summary.porcentajeConciliado.toFixed(1)}%`],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

  // ── Export ────────────────────────────────────────────────────────────────
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `conciliacion_${dateLabel}.xlsx`);
}
