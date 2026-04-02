import type { NavePointRow } from './parseNavePoint';
import type { MaxirestRow } from './parseMaxirest';

export interface ReconciliationRow {
  date: string;
  medioPago: string;
  totalNavePoint: number | null;
  totalMaxirest: number | null;
  diferencia: number | null;
  status: 'conciliado' | 'descuadre' | 'soloNavePoint' | 'soloMaxirest' | 'efectivo';
  npTransactions?: Array<{ time: string; medioPago: string; monto: number }>;
  mxTransactions?: Array<{ time: string; cobro: string; importe: number }>;
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

// Maxirest COBRO values that are NOT card payments and should be excluded
// from the card total (accounting entries like credit notes / invoices)
const MAXIREST_IGNORED_COBROS = /^(NCB|FCB|NDB|FDB)\s/i;

const TOLERANCE = 1;

export function reconcile(
  navePointData: NavePointRow[],
  maxirestData: MaxirestRow[]
): ReconciliationResult {
  // Only compare dates present in both files
  const npDates = new Set(navePointData.map((r) => r.date));
  const mxDates = new Set(maxirestData.map((r) => r.date));
  const commonDates = new Set([...npDates].filter((d) => mxDates.has(d)));

  const filteredNP = navePointData.filter((r) => commonDates.has(r.date));
  const filteredMX = maxirestData.filter((r) => commonDates.has(r.date));

  // --- Aggregate NavePoint: all cards (everything) summed per date ---
  // NavePoint only records electronic payments — every row is a card transaction.
  const npByDate = new Map<string, { total: number; transactions: Array<{ time: string; medioPago: string; monto: number }> }>();
  for (const row of filteredNP) {
    const existing = npByDate.get(row.date) ?? { total: 0, transactions: [] };
    existing.total += row.monto;
    existing.transactions.push({ time: row.time, medioPago: row.medioPago, monto: row.monto });
    npByDate.set(row.date, existing);
  }

  // --- Aggregate Maxirest: split into cards vs efectivo per date ---
  type MxAggEntry = { total: number; transactions: Array<{ time: string; cobro: string; importe: number }> };
  const mxCardsByDate = new Map<string, MxAggEntry>();
  const mxEfectivoByDate = new Map<string, number>();

  for (const row of filteredMX) {
    const cobro = row.cobro.trim();
    if (MAXIREST_IGNORED_COBROS.test(cobro)) continue;

    if (cobro.toUpperCase() === 'EFECTIVO') {
      mxEfectivoByDate.set(row.date, (mxEfectivoByDate.get(row.date) ?? 0) + row.importe);
    } else {
      const existing = mxCardsByDate.get(row.date) ?? { total: 0, transactions: [] };
      existing.total += row.importe;
      existing.transactions.push({ time: row.time, cobro, importe: row.importe });
      mxCardsByDate.set(row.date, existing);
    }
  }

  const rows: ReconciliationRow[] = [];

  // --- Compare card totals per date ---
  const allDates = new Set([...npByDate.keys(), ...mxCardsByDate.keys(), ...mxEfectivoByDate.keys()]);

  for (const date of allDates) {
    const np = npByDate.get(date);
    const mxEntry = mxCardsByDate.get(date);
    const mxEfectivo = mxEfectivoByDate.get(date);

    // Card reconciliation row
    if (np !== undefined || mxEntry !== undefined) {
      const totalNP = np?.total ?? null;
      const totalMX = mxEntry?.total ?? null;
      const sortedNP = np ? [...np.transactions].sort((a, b) => a.time.localeCompare(b.time)) : undefined;
      const sortedMX = mxEntry ? [...mxEntry.transactions].sort((a, b) => a.time.localeCompare(b.time)) : undefined;

      if (totalNP !== null && totalMX !== null) {
        const diferencia = totalNP - totalMX;
        const status = Math.abs(diferencia) <= TOLERANCE ? 'conciliado' : 'descuadre';
        rows.push({
          date, medioPago: 'Total Tarjetas', totalNavePoint: totalNP, totalMaxirest: totalMX,
          diferencia, status,
          npTransactions: status !== 'conciliado' ? sortedNP : undefined,
          mxTransactions: status !== 'conciliado' ? sortedMX : undefined,
        });
      } else if (totalNP !== null) {
        rows.push({
          date, medioPago: 'Total Tarjetas', totalNavePoint: totalNP, totalMaxirest: null,
          diferencia: totalNP, status: 'soloNavePoint',
          npTransactions: sortedNP,
          mxTransactions: undefined,
        });
      } else {
        rows.push({
          date, medioPago: 'Total Tarjetas', totalNavePoint: null, totalMaxirest: totalMX,
          diferencia: -(totalMX!), status: 'soloMaxirest',
          mxTransactions: sortedMX,
        });
      }
    }

    // Efectivo row (always Solo Maxirest — reference only)
    if (mxEfectivo !== undefined) {
      rows.push({
        date, medioPago: 'Efectivo', totalNavePoint: null, totalMaxirest: mxEfectivo,
        diferencia: null, status: 'efectivo',
      });
    }
  }

  // Sort by date asc
  rows.sort((a, b) => {
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    // efectivo always last within a date
    if (a.status === 'efectivo') return 1;
    if (b.status === 'efectivo') return -1;
    return 0;
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
    summary: { totalNavePoint, totalMaxirestTarjetas, totalEfectivo, diferenciaTotal, porcentajeConciliado },
  };
}
