import * as XLSX from 'xlsx';

export interface NavePointRow {
  date: string;
  time: string;       // "HH:MM"
  medioPago: string;
  monto: number;
}

export interface NavePointMeta {
  dateRange: string;
  recordCount: number;
}

export interface NavePointResult {
  data: NavePointRow[];
  meta: NavePointMeta;
}

/**
 * Parses "DD/MM/YYYY HH:MM" string into { date: "YYYY-MM-DD", time: "HH:MM" }
 */
function parseDateString(raw: string): { date: string; time: string } | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})/);
  if (!match) {
    // Try without time
    const dateOnly = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (!dateOnly) return null;
    const [, day, month, year] = dateOnly;
    return { date: `${year}-${month}-${day}`, time: '' };
  }
  const [, day, month, year, time] = match;
  return { date: `${year}-${month}-${day}`, time };
}

export function parseNavePoint(buffer: ArrayBuffer): NavePointResult {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Header row is index 22 (row 23), so we read all rows and skip first 22
  const allRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  }) as unknown[][];

  if (allRows.length <= 22) {
    throw new Error('El archivo de Nave Point no tiene suficientes filas. Se esperaba la cabecera en la fila 23.');
  }

  const headerRow = allRows[22] as unknown[];

  // Find column indices
  const fechaIdx = headerRow.findIndex(
    (h) => typeof h === 'string' && h.trim() === 'Fecha de operación'
  );
  const medioIdx = headerRow.findIndex(
    (h) => typeof h === 'string' && h.trim() === 'Medio de Pago'
  );
  const montoIdx = headerRow.findIndex(
    (h) => typeof h === 'string' && h.trim() === 'Monto bruto'
  );
  const estadoIdx = headerRow.findIndex(
    (h) => typeof h === 'string' && h.trim() === 'Estado'
  );

  if (fechaIdx === -1 || medioIdx === -1 || montoIdx === -1 || estadoIdx === -1) {
    throw new Error(
      `No se encontraron las columnas requeridas en la fila 23. Encontradas: ${headerRow.filter(Boolean).join(', ')}`
    );
  }

  const dataRows = allRows.slice(23);
  const result: NavePointRow[] = [];

  for (const row of dataRows) {
    if (!row || row.every((cell) => cell === null || cell === undefined || cell === '')) continue;

    const rawEstado = row[estadoIdx];
    const estado = typeof rawEstado === 'string' ? rawEstado.trim() : String(rawEstado ?? '').trim();
    if (estado !== 'Acreditado') continue;

    const rawFecha = row[fechaIdx];
    const parsed = parseDateString(String(rawFecha ?? ''));
    if (!parsed) continue;
    const { date: dateStr, time } = parsed;

    const rawMedio = row[medioIdx];
    const medioPago = typeof rawMedio === 'string' ? rawMedio.trim() : String(rawMedio ?? '').trim();
    if (!medioPago) continue;

    const rawMonto = row[montoIdx];
    const monto = typeof rawMonto === 'number' ? rawMonto : parseFloat(String(rawMonto ?? '0').replace(',', '.'));
    if (isNaN(monto)) continue;

    result.push({ date: dateStr, time, medioPago, monto });
  }

  if (result.length === 0) {
    throw new Error('No se encontraron registros con estado "Acreditado" en el archivo de Nave Point.');
  }

  const dates = result.map((r) => r.date).sort();
  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];

  const formatDisplay = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  const dateRange =
    firstDate === lastDate
      ? formatDisplay(firstDate)
      : `${formatDisplay(firstDate)} – ${formatDisplay(lastDate)}`;

  return {
    data: result,
    meta: {
      dateRange,
      recordCount: result.length,
    },
  };
}
