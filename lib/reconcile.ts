import type { NavePointRow } from './parseNavePoint';
import type { MaxirestRow } from './parseMaxirest';

export interface ReconciliationRow {
  date: string;
  medioPago: string;
  totalNavePoint: number | null;
  totalMaxirest: number | null;
  diferencia: number | null;
  status: 'conciliado' | 'descuadre' | 'soloNavePoint' | 'soloMaxirest' | 'efectivo';
}

export interface Summary {
  totalNavePoint: number;
  totalMaxirestTarjetas: number;
  totalEfectivo: number;
  diferenciaTotal: number;
  porcentajeConciliado: number;
}

export interface ReconciliationResult {
  rows: ReconciliationRow[];
  summary: Summary;
}

// Mapping from Nave Point payment name → Maxirest COBRO value
const NAVEPOINT_TO_MAXIREST: Record<string, string> = {
  'Visa Débito': 'VISA DEBITO',
  'Visa Crédito': 'VISA CREDITO',
  'Mastercard Débito': 'MASTER DEBITO',
  'Mastercard Crédito': 'MASTER CREDITO',
  'Dinero en cuenta': 'MERCADOPAGO',
};

// Display name for Maxirest-only tarjeta entries
const MAXIREST_DISPLAY: Record<string, string> = {
  'VISA DEBITO': 'Visa Débito',
  'VISA CREDITO': 'Visa Crédito',
  'MASTER DEBITO': 'Mastercard Débito',
  'MASTER CREDITO': 'Mastercard Crédito',
  'MERCADOPAGO': 'Dinero en cuenta',
};

const TOLERANCE = 1;

function groupByKey<T>(
  items: T[],
  keyFn: (item: T) => string
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

function sumField<T>(items: T[], field: keyof T): number {
  return items.reduce((acc, item) => acc + (item[field] as number), 0);
}

export function reconcile(
  navePointData: NavePointRow[],
  maxirestData: MaxirestRow[]
): ReconciliationResult {
  // Determine the intersection of dates present in both files
  const npDates = new Set(navePointData.map((r) => r.date));
  const mxDates = new Set(maxirestData.map((r) => r.date));
  const commonDates = new Set([...npDates].filter((d) => mxDates.has(d)));

  // Only keep rows whose date appears in both files
  const filteredNP = navePointData.filter((r) => commonDates.has(r.date));
  const filteredMX = maxirestData.filter((r) => commonDates.has(r.date));

  // Group NavePoint by date + medioPago
  const npGrouped = groupByKey(
    filteredNP,
    (r) => `${r.date}|${r.medioPago}`
  );

  // Group Maxirest by date + cobro
  const mxGrouped = groupByKey(
    filteredMX,
    (r) => `${r.date}|${r.cobro}`
  );

  const rows: ReconciliationRow[] = [];
  const processedMxKeys = new Set<string>();

  // Process all NavePoint entries
  for (const [npKey, npRows] of npGrouped.entries()) {
    const [date, medioPago] = npKey.split('|');
    const totalNP = sumField(npRows, 'monto');

    const mxCobro = NAVEPOINT_TO_MAXIREST[medioPago];

    if (!mxCobro) {
      // No mapping — record as soloNavePoint
      rows.push({
        date,
        medioPago,
        totalNavePoint: totalNP,
        totalMaxirest: null,
        diferencia: null,
        status: 'soloNavePoint',
      });
      continue;
    }

    const mxKey = `${date}|${mxCobro}`;
    processedMxKeys.add(mxKey);

    const mxRows = mxGrouped.get(mxKey);
    if (!mxRows) {
      // In NavePoint but not Maxirest
      rows.push({
        date,
        medioPago,
        totalNavePoint: totalNP,
        totalMaxirest: null,
        diferencia: totalNP,
        status: 'soloNavePoint',
      });
    } else {
      const totalMX = sumField(mxRows, 'importe');
      const diferencia = totalNP - totalMX;
      const status =
        Math.abs(diferencia) <= TOLERANCE ? 'conciliado' : 'descuadre';

      rows.push({
        date,
        medioPago,
        totalNavePoint: totalNP,
        totalMaxirest: totalMX,
        diferencia,
        status,
      });
    }
  }

  // Process Maxirest entries not yet covered
  for (const [mxKey, mxRows] of mxGrouped.entries()) {
    const [date, cobro] = mxKey.split('|');
    const totalMX = sumField(mxRows, 'importe');

    if (cobro.toUpperCase() === 'EFECTIVO') {
      // Efectivo — always its own row
      rows.push({
        date,
        medioPago: 'Efectivo',
        totalNavePoint: null,
        totalMaxirest: totalMX,
        diferencia: null,
        status: 'efectivo',
      });
      continue;
    }

    if (processedMxKeys.has(mxKey)) continue;

    // Tarjeta in Maxirest not in NavePoint
    const displayName = MAXIREST_DISPLAY[cobro] ?? cobro;
    rows.push({
      date,
      medioPago: displayName,
      totalNavePoint: null,
      totalMaxirest: totalMX,
      diferencia: -totalMX,
      status: 'soloMaxirest',
    });
  }

  // Sort: by date asc, then by medioPago
  rows.sort((a, b) => {
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    return a.medioPago.localeCompare(b.medioPago, 'es');
  });

  // Compute summary
  const cardRows = rows.filter((r) => r.status !== 'efectivo');
  const effectivoRows = rows.filter((r) => r.status === 'efectivo');
  const conciliadoCount = cardRows.filter((r) => r.status === 'conciliado').length;

  const totalNavePoint = cardRows.reduce(
    (acc, r) => acc + (r.totalNavePoint ?? 0),
    0
  );
  const totalMaxirestTarjetas = cardRows.reduce(
    (acc, r) => acc + (r.totalMaxirest ?? 0),
    0
  );
  const totalEfectivo = effectivoRows.reduce(
    (acc, r) => acc + (r.totalMaxirest ?? 0),
    0
  );
  const diferenciaTotal = totalNavePoint - totalMaxirestTarjetas;
  const porcentajeConciliado =
    cardRows.length === 0 ? 100 : (conciliadoCount / cardRows.length) * 100;

  return {
    rows,
    summary: {
      totalNavePoint,
      totalMaxirestTarjetas,
      totalEfectivo,
      diferenciaTotal,
      porcentajeConciliado,
    },
  };
}
