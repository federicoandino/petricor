export interface TxNP {
  time: string;
  medioPago: string;
  monto: number;
}

export interface TxMX {
  time: string;
  cobro: string;
  importe: number;
}

export interface MatchedPair {
  np: TxNP;
  mx: TxMX;
  withSurcharge: boolean; // true = matched because NP ≈ MX × 1.10
}

export interface MatchResult {
  matched: MatchedPair[];
  unmatchedNP: TxNP[];
  unmatchedMX: TxMX[];
  totalMatched: number;
  totalNP: number;
  // Credit card transactions matched at exact amount (no surcharge applied).
  // These may indicate the mozo forgot to charge the 10% surcharge.
  exactCreditMatches: MatchedPair[];
}

const AMOUNT_TOLERANCE = 1;   // ±$1 for exact match
const SURCHARGE_RATE = 0.10;  // 10% credit card surcharge

/**
 * Returns true if the NP payment type is a credit card
 * (those are the ones subject to the 10% surcharge policy).
 */
function isCreditCard(medioPago: string): boolean {
  const lc = medioPago.toLowerCase();
  return (
    lc.includes('crédito') ||
    lc.includes('credito') ||
    lc.includes('internacional') ||
    lc.includes('american express') ||
    lc.includes('amex')
  );
}

/**
 * Greedy 1-to-1 matching of NP vs MX transactions.
 *
 * Match priority per NP transaction:
 *   1. Exact amount match (±$1)
 *   2. Surcharge match: NP ≈ MX × 1.10 (±$2, only for credit cards)
 *
 * When multiple candidates exist, the one with the closest time wins.
 */
export function matchTransactions(npList: TxNP[], mxList: TxMX[]): MatchResult {
  const availableMX = [...mxList];
  const matched: MatchedPair[] = [];
  const unmatchedNP: TxNP[] = [];

  for (const np of npList) {
    const isCredit = isCreditCard(np.medioPago);

    // Build candidate list: exact match first, then surcharge match for credit cards
    type Candidate = { mx: TxMX; idx: number; withSurcharge: boolean };
    let candidates: Candidate[] = availableMX
      .map((mx, idx) => ({ mx, idx, withSurcharge: false }))
      .filter((c) => Math.abs(c.mx.importe - np.monto) <= AMOUNT_TOLERANCE);

    if (candidates.length === 0 && isCredit) {
      // Try surcharge match: np.monto ≈ mx.importe * (1 + SURCHARGE_RATE)
      candidates = availableMX
        .map((mx, idx) => ({ mx, idx, withSurcharge: true }))
        .filter((c) => Math.abs(c.mx.importe * (1 + SURCHARGE_RATE) - np.monto) <= 2);
    }

    if (candidates.length === 0) {
      unmatchedNP.push(np);
      continue;
    }

    // Pick the candidate with the closest time
    const best = candidates.reduce((a, b) => {
      const dtA = Math.abs(toMinutes(np.time) - toMinutes(a.mx.time));
      const dtB = Math.abs(toMinutes(np.time) - toMinutes(b.mx.time));
      return dtA <= dtB ? a : b;
    });

    matched.push({ np, mx: best.mx, withSurcharge: best.withSurcharge });
    availableMX.splice(best.idx, 1);
  }

  const exactCreditMatches = matched.filter(
    (p) => !p.withSurcharge && isCreditCard(p.np.medioPago)
  );

  return {
    matched,
    unmatchedNP,
    unmatchedMX: availableMX,
    totalMatched: matched.length,
    totalNP: npList.length,
    exactCreditMatches,
  };
}

function toMinutes(time: string): number {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
