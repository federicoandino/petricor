export interface TxNP {
  time: string;   // "HH:MM" local time
  medioPago: string;
  monto: number;
}

export interface TxMX {
  time: string;   // "HH:MM" (may differ from NP due to system clock offset)
  cobro: string;
  importe: number;
}

export interface MatchedPair {
  np: TxNP;
  mx: TxMX;
}

export interface MatchResult {
  matched: MatchedPair[];
  unmatchedNP: TxNP[];   // in NP but not in MX → likely missing from Maxirest
  unmatchedMX: TxMX[];   // in MX but not in NP → extra in Maxirest
}

const AMOUNT_TOLERANCE = 1; // ±$1

/**
 * Greedy 1-to-1 matching of NP vs MX transactions by amount.
 * When multiple MX candidates have the same amount, pick the one
 * with the closest time to the NP transaction.
 *
 * Note: Maxirest and NP may have a fixed clock offset (different timezones
 * or system clocks), so we use time only as a tiebreaker — not as a filter.
 */
export function matchTransactions(npList: TxNP[], mxList: TxMX[]): MatchResult {
  // Work on mutable copies so we can consume matched items
  const availableMX = [...mxList];

  const matched: MatchedPair[] = [];
  const unmatchedNP: TxNP[] = [];

  for (const np of npList) {
    // Find all MX entries within amount tolerance
    const candidates = availableMX
      .map((mx, idx) => ({ mx, idx, diff: Math.abs(mx.importe - np.monto) }))
      .filter((c) => c.diff <= AMOUNT_TOLERANCE);

    if (candidates.length === 0) {
      unmatchedNP.push(np);
      continue;
    }

    // Among candidates, pick the one with the closest time
    const best = candidates.reduce((a, b) => {
      const timeDiffA = Math.abs(toMinutes(np.time) - toMinutes(a.mx.time));
      const timeDiffB = Math.abs(toMinutes(np.time) - toMinutes(b.mx.time));
      return timeDiffA <= timeDiffB ? a : b;
    });

    matched.push({ np, mx: best.mx });
    availableMX.splice(best.idx, 1); // consume this MX transaction
  }

  return { matched, unmatchedNP, unmatchedMX: availableMX };
}

function toMinutes(time: string): number {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
