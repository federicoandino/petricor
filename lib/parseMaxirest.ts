import * as XLSX from 'xlsx';

export interface MaxirestRow {
  date: string;
  time: string;   // "HH:MM"
  cobro: string;
  importe: number;
}

export interface MaxirestMeta {
  dateRange: string;
  recordCount: number;
}

export interface MaxirestResult {
  data: MaxirestRow[];
  meta: MaxirestMeta;
}

/**
 * Converts an Excel serial date number to "YYYY-MM-DD"
 */
function excelSerialToDate(serial: number): string {
  // Excel epoch: December 30, 1899
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Converts a JS Date object to "YYYY-MM-DD"
 */
function jsDateToString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse a date cell that might be: JS Date, Excel serial number, or a string like "DD/MM/YYYY"
 */
function parseDateCell(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null;

  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return null;
    return jsDateToString(raw);
  }

  if (typeof raw === 'number') {
    if (raw <= 0) return null;
    return excelSerialToDate(raw);
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    // Try DD/MM/YYYY or DD/MM/YY
    const matchDMY = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (matchDMY) {
      let [, day, month, year] = matchDMY;
      if (year.length === 2) year = `20${year}`;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    // Try YYYY-MM-DD
    const matchISO = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (matchISO) {
      return trimmed.substring(0, 10);
    }
  }

  return null;
}

export function parseMaxirest(buffer: ArrayBuffer): MaxirestResult {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const allRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: false,
  }) as unknown[][];

  // Also read with raw values for numeric date handling
  const allRowsRaw: unknown[][] = XLSX.utils.sheet_to_json(
    XLSX.read(buffer, { type: 'array' }).Sheets[XLSX.read(buffer, { type: 'array' }).SheetNames[0]],
    { header: 1, defval: null, raw: true }
  ) as unknown[][];

  if (allRows.length === 0) {
    throw new Error('El archivo de Maxirest está vacío.');
  }

  const headerRow = allRows[0] as unknown[];

  const fechaIdx = headerRow.findIndex(
    (h) => typeof h === 'string' && h.trim().toUpperCase() === 'FECHA'
  );
  const horaIdx = headerRow.findIndex(
    (h) => typeof h === 'string' && h.trim().toUpperCase() === 'HORA'
  );
  const cobroIdx = headerRow.findIndex(
    (h) => typeof h === 'string' && h.trim().toUpperCase() === 'COBRO'
  );
  const importeIdx = headerRow.findIndex(
    (h) => typeof h === 'string' && h.trim().toUpperCase() === 'IMPORTE'
  );

  if (fechaIdx === -1 || cobroIdx === -1 || importeIdx === -1) {
    throw new Error(
      `No se encontraron las columnas requeridas (FECHA, COBRO, IMPORTE). Encontradas: ${headerRow.filter(Boolean).join(', ')}`
    );
  }

  const result: MaxirestRow[] = [];

  for (let i = 1; i < allRows.length; i++) {
    const row = allRows[i] as unknown[];
    const rowRaw = allRowsRaw[i] as unknown[];
    if (!row || row.every((cell) => cell === null || cell === undefined || cell === '')) continue;

    // Use raw row for date parsing (handles numeric serials), formatted row for strings
    const rawFechaRaw = rowRaw ? rowRaw[fechaIdx] : row[fechaIdx];
    const rawFechaFormatted = row[fechaIdx];

    // Try parsed date from cellDates first, then raw serial
    let dateStr: string | null = null;
    if (rawFechaFormatted instanceof Date) {
      dateStr = jsDateToString(rawFechaFormatted);
    } else if (typeof rawFechaRaw === 'number') {
      dateStr = excelSerialToDate(rawFechaRaw);
    } else {
      dateStr = parseDateCell(rawFechaFormatted ?? rawFechaRaw);
    }

    if (!dateStr) continue;

    const rawCobro = row[cobroIdx];
    const cobro = typeof rawCobro === 'string' ? rawCobro.trim() : String(rawCobro ?? '').trim();
    if (!cobro) continue;

    const rawImporte = rowRaw ? rowRaw[importeIdx] : row[importeIdx];
    let importe: number;
    if (typeof rawImporte === 'number') {
      importe = rawImporte;
    } else {
      const parsed = parseFloat(String(rawImporte ?? '0').replace(',', '.'));
      if (isNaN(parsed)) continue;
      importe = parsed;
    }

    // Parse HORA: comes as a JS Date object (time-only serial from Excel)
    const rawHora = row[horaIdx];
    let time = '';
    if (rawHora instanceof Date && !isNaN(rawHora.getTime())) {
      const h = String(rawHora.getUTCHours()).padStart(2, '0');
      const m = String(rawHora.getUTCMinutes()).padStart(2, '0');
      time = `${h}:${m}`;
    } else if (typeof rawHora === 'string' && rawHora.trim().match(/^\d{1,2}:\d{2}/)) {
      time = rawHora.trim().substring(0, 5);
    }

    result.push({ date: dateStr, time, cobro, importe });
  }

  if (result.length === 0) {
    throw new Error('No se encontraron registros válidos en el archivo de Maxirest.');
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
