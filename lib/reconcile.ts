import type { NavePointRow } from './parseNavePoint';
import type { MaxirestRow } from './parseMaxirest';

export interface ReconciliationRow {
  date: string;
  medioPago: string;
  totalNavePoint: number | null;
  totalMaxirest: number | null;
  diferencia: number | null;
  status: 'conciliado' | 'descuadre' | 'soloNavePoint' | 'soloMaxirest' | 'efectivo';
  npBreakdown?: string;
  // Individual NP transactions — populated for descuadre and soloNavePoint rows
  npTransactions?: Array<{ time: string; medioPago: string; monto: number }>;
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

// All Nave Point card types → their Maxirest COBRO equivalent.
// Maxirest may lump multiple card types under a single COBRO (e.g. "VISA DEBITO"
// for all cards). When that happens, this mapping sends them all to the same bucket
// and they get aggregated before comparison.
const NAVEPOINT_TO_MAXIREST: Record<string, string> = {
  'Visa Débito': 'VISA DEBITO',
  'Visa Crédito': 'VISA DEBITO',
  'Mastercard Débito': 'VISA DEBITO',
  'Mastercard Crédito': 'VISA DEBITO',
  'Dinero en cuenta': 'MERCADOPAGO',
};

// Human-readable label for each Maxirest COBRO bucket
const MAXIREST_BUCKET_LABEL: Record<string, string> = {
  'VISA DEBITO': 'Total Tarjetas',
  'MERCADOPAGO': 'MercadoPago',
};

// COBRO values in Maxirest that are NOT payment methods (credit notes, invoices, etc.)
// and should be ignored in reconciliation
const MAXIREST_IGNORED_COBROS = /^(NCB|FCB|NDB|FDB)\s/i;

const TOLERANCE = 1;

function sumBy<T>(items: T[], field: keyof T): number {
  return items.reduce((acc, item) => acc + (item[field] as number), 0);
}

export function reconcile(
  navePointData: NavePointRow[],
  maxirestData: MaxirestRow[]
): ReconciliationResult {
  // Intersect dates so only common dates are compared
  const npDates = new Set(navePointData.map((r) => r.date));
  const mxDates = new Set(maxirestData.map((r) => r.date));
  const commonDates = new Set([...npDates].filter((d) => mxDates.has(d)));

  const filteredNP = navePointData.filter((r) => commonDates.has(r.date));
  const filteredMX = maxirestData.filter((r) => commonDates.has(r.date));

  // --- Aggregate NavePoint by (date, mappedMxCobro) ---
  type NpAggEntry = {
    total: number;
    labels: string[];
    transactions: Array<{ time: string; medioPago: string; monto: number }>;
  };
  const npAgg = new Map<string, NpAggEntry>();
  const npUnmapped: Array<{ date: string; medioPago: string; total: number; transactions: Array<{ time: string; medioPago: string; monto: number }> }> = [];

  for (const row of filteredNP) {
    const mxCobro = NAVEPOINT_TO_MAXIREST[row.medioPago];
    if (!mxCobro) {
      npUnmapped.push({ date: row.date, medioPago: row.medioPago, total: row.monto, transactions: [{ time: row.time, medioPago: row.medioPago, monto: row.monto }] });
      continue;
    }
    const key = `${row.date}|${mxCobro}`;
    const existing = npAgg.get(key) ?? { total: 0, labels: [], transactions: [] };
    existing.total += row.monto;
    if (!existing.labels.includes(row.medioPago)) existing.labels.push(row.medioPago);
    existing.transactions.push({ time: row.time, medioPago: row.medioPago, monto: row.monto });
    npAgg.set(key, existing);
  }

  // --- Aggregate Maxirest by (date, cobro), skip ignored COBRO types ---
  const mxAgg = new Map<string, number>();

  for (const row of filteredMX) {
    const cobro = row.cobro.trim();
    if (MAXIREST_IGNORED_COBROS.test(cobro)) continue; // skip credit notes / invoices
    const key = `${row.date}|${cobro}`;
    mxAgg.set(key, (mxAgg.get(key) ?? 0) + row.importe);
  }

  const rows: ReconciliationRow[] = [];
  const processedMxKeys = new Set<string>();

  // --- Match NP aggregated buckets against MX ---
  for (const [key, { total: totalNP, labels, transactions }] of npAgg.entries()) {
    const [date, mxCobro] = key.split('|');
    processedMxKeys.add(key);

    const totalMX = mxAgg.get(key);
    const displayName = MAXIREST_BUCKET_LABEL[mxCobro] ?? mxCobro;
    const breakdown = labels.length > 1 ? labels.join(' + ') : undefined;
    const sorted = [...transactions].sort((a, b) => a.time.localeCompare(b.time));

    if (totalMX === undefined) {
      rows.push({
        date, medioPago: displayName, totalNavePoint: totalNP, totalMaxirest: null,
        diferencia: totalNP, status: 'soloNavePoint', npBreakdown: breakdown,
        npTransactions: sorted,
      });
    } else {
      const diferencia = totalNP - totalMX;
      const status = Math.abs(diferencia) <= TOLERANCE ? 'conciliado' : 'descuadre';
      rows.push({
        date, medioPago: displayName, totalNavePoint: totalNP, totalMaxirest: totalMX,
        diferencia, status, npBreakdown: breakdown,
        npTransactions: status !== 'conciliado' ? sorted : undefined,
      });
    }
  }

  // --- Unmapped NP entries (no known MX equivalent) ---
  const unmappedByKey = new Map<string, { total: number; transactions: Array<{ time: string; medioPago: string; monto: number }> }>();
  for (const { date, medioPago, total, transactions } of npUnmapped) {
    const key = `${date}|${medioPago}`;
    const existing = unmappedByKey.get(key) ?? { total: 0, transactions: [] };
    existing.total += total;
    existing.transactions.push(...transactions);
    unmappedByKey.set(key, existing);
  }
  for (const [key, { total, transactions }] of unmappedByKey.entries()) {
    const [date, medioPago] = key.split('|');
    rows.push({
      date, medioPago, totalNavePoint: total, totalMaxirest: null,
      diferencia: total, status: 'soloNavePoint',
      npTransactions: [...transactions].sort((a, b) => a.time.localeCompare(b.time)),
    });
  }

  // --- MX entries not covered by any NP bucket ---
  for (const [key, totalMX] of mxAgg.entries()) {
    if (processedMxKeys.has(key)) continue;
    const [date, cobro] = key.split('|');

    if (cobro.toUpperCase() === 'EFECTIVO') {
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

    const displayName = MAXIREST_BUCKET_LABEL[cobro] ?? cobro;
    rows.push({
      date,
      medioPago: displayName,
      totalNavePoint: null,
      totalMaxirest: totalMX,
      diferencia: -totalMX,
      status: 'soloMaxirest',
    });
  }

  // Sort by date asc, then medioPago
  rows.sort((a, b) => {
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    return a.medioPago.localeCompare(b.medioPago, 'es');
  });

  // Summary
  const cardRows = rows.filter((r) => r.status !== 'efectivo');
  const efectivoRows = rows.filter((r) => r.status === 'efectivo');
  const conciliadoCount = cardRows.filter((r) => r.status === 'conciliado').length;

  const totalNavePoint = cardRows.reduce((acc, r) => acc + (r.totalNavePoint ?? 0), 0);
  const totalMaxirestTarjetas = cardRows.reduce((acc, r) => acc + (r.totalMaxirest ?? 0), 0);
  const totalEfectivo = efectivoRows.reduce((acc, r) => acc + (r.totalMaxirest ?? 0), 0);
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
