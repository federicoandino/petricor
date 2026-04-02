import type { NavePointRow } from './parseNavePoint';
import type { MaxirestRow } from './parseMaxirest';
import { matchTransactions, type MatchResult } from './matchTransactions';

export interface ReconciliationRow {
  date: string;
  medioPago: string;
  totalNavePoint: number | null;
  totalMaxirest: number | null;
  diferencia: number | null;
  status: 'conciliado' | 'descuadre' | 'soloNavePoint' | 'soloMaxirest' | 'efectivo';
  matchResult?: MatchResult; // populated for non-efectivo rows with both NP and MX data
}

export interface Summary {
  totalNavePoint: number;
  totalMaxirestTarjetas: number;
  totalEfectivo: number;
  diferenciaTotal: number;
  porcentajeConciliado: number; // % of NP transactions that matched (including surcharge matches)
}

export interface ReconciliationResult {
  rows: ReconciliationRow[];
  summary: Summary;
}

const MAXIREST_IGNORED_COBROS = /^(NCB|FCB|NDB|FDB)\s/i;

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

  // Aggregate NavePoint per date
  const npByDate = new Map<string, { total: number; transactions: NavePointRow[] }>();
  for (const row of filteredNP) {
    const existing = npByDate.get(row.date) ?? { total: 0, transactions: [] };
    existing.total += row.monto;
    existing.transactions.push(row);
    npByDate.set(row.date, existing);
  }

  // Aggregate Maxirest per date: cards vs efectivo
  type MxEntry = { total: number; transactions: MaxirestRow[] };
  const mxCardsByDate = new Map<string, MxEntry>();
  const mxEfectivoByDate = new Map<string, number>();

  for (const row of filteredMX) {
    const cobro = row.cobro.trim();
    if (MAXIREST_IGNORED_COBROS.test(cobro)) continue;

    if (cobro.toUpperCase() === 'EFECTIVO') {
      mxEfectivoByDate.set(row.date, (mxEfectivoByDate.get(row.date) ?? 0) + row.importe);
    } else {
      const existing = mxCardsByDate.get(row.date) ?? { total: 0, transactions: [] };
      existing.total += row.importe;
      existing.transactions.push(row);
      mxCardsByDate.set(row.date, existing);
    }
  }

  const rows: ReconciliationRow[] = [];
  let totalMatchedTx = 0;
  let totalNPTx = 0;

  const allDates = new Set([...npByDate.keys(), ...mxCardsByDate.keys(), ...mxEfectivoByDate.keys()]);

  for (const date of allDates) {
    const np = npByDate.get(date);
    const mxEntry = mxCardsByDate.get(date);
    const mxEfectivo = mxEfectivoByDate.get(date);

    if (np !== undefined || mxEntry !== undefined) {
      const totalNP = np?.total ?? null;
      const totalMX = mxEntry?.total ?? null;

      if (totalNP !== null && totalMX !== null) {
        // Run transaction-level matching (with 10% surcharge support)
        const result = matchTransactions(
          np!.transactions.map((r) => ({ time: r.time, medioPago: r.medioPago, monto: r.monto })),
          mxEntry!.transactions.map((r) => ({ time: r.time, cobro: r.cobro, importe: r.importe }))
        );

        totalMatchedTx += result.totalMatched;
        totalNPTx += result.totalNP;

        const isFullyMatched = result.unmatchedNP.length === 0 && result.unmatchedMX.length === 0;
        const diferencia = totalNP - totalMX;

        rows.push({
          date, medioPago: 'Total Tarjetas', totalNavePoint: totalNP, totalMaxirest: totalMX,
          diferencia,
          status: isFullyMatched ? 'conciliado' : 'descuadre',
          matchResult: result,
        });
      } else if (totalNP !== null) {
        const result = matchTransactions(
          np!.transactions.map((r) => ({ time: r.time, medioPago: r.medioPago, monto: r.monto })),
          []
        );
        totalMatchedTx += result.totalMatched;
        totalNPTx += result.totalNP;
        rows.push({
          date, medioPago: 'Total Tarjetas', totalNavePoint: totalNP, totalMaxirest: null,
          diferencia: totalNP, status: 'soloNavePoint', matchResult: result,
        });
      } else {
        rows.push({
          date, medioPago: 'Total Tarjetas', totalNavePoint: null, totalMaxirest: totalMX,
          diferencia: -(totalMX!), status: 'soloMaxirest',
        });
      }
    }

    if (mxEfectivo !== undefined) {
      rows.push({
        date, medioPago: 'Efectivo', totalNavePoint: null, totalMaxirest: mxEfectivo,
        diferencia: null, status: 'efectivo',
      });
    }
  }

  rows.sort((a, b) => {
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    if (a.status === 'efectivo') return 1;
    if (b.status === 'efectivo') return -1;
    return 0;
  });

  const cardRows = rows.filter((r) => r.status !== 'efectivo');
  const efectivoRows = rows.filter((r) => r.status === 'efectivo');

  const totalNavePoint = cardRows.reduce((acc, r) => acc + (r.totalNavePoint ?? 0), 0);
  const totalMaxirestTarjetas = cardRows.reduce((acc, r) => acc + (r.totalMaxirest ?? 0), 0);
  const totalEfectivo = efectivoRows.reduce((acc, r) => acc + (r.totalMaxirest ?? 0), 0);
  const diferenciaTotal = totalNavePoint - totalMaxirestTarjetas;

  // % conciliado = % of NP transactions that found a match (exact or with surcharge)
  const porcentajeConciliado = totalNPTx === 0 ? 100 : (totalMatchedTx / totalNPTx) * 100;

  return {
    rows,
    summary: { totalNavePoint, totalMaxirestTarjetas, totalEfectivo, diferenciaTotal, porcentajeConciliado },
  };
}
