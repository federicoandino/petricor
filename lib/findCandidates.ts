export interface Transaction {
  time: string;
  medioPago: string;
  monto: number;
}

export interface CandidateMatch {
  transactions: Transaction[];
  sum: number;
}

/**
 * Finds subsets of NP transactions (1, 2, or 3 items) whose sum equals
 * the target amount within ±tolerance. Used to suggest which transactions
 * may explain a reconciliation discrepancy.
 *
 * Only meaningful when target > 0 (NP has more than MX), meaning there are
 * NP transactions likely missing from Maxirest.
 *
 * Complexity: O(n) + O(n²) + O(n³ capped). Safe for up to ~100 transactions.
 */
export function findCandidates(
  transactions: Transaction[],
  target: number,
  tolerance = 1
): CandidateMatch[] {
  const absTarget = Math.abs(target);
  const results: CandidateMatch[] = [];

  // Singles
  for (const tx of transactions) {
    if (Math.abs(tx.monto - absTarget) <= tolerance) {
      results.push({ transactions: [tx], sum: tx.monto });
    }
  }
  if (results.length > 0) return results; // exact single match → stop here

  // Pairs
  for (let i = 0; i < transactions.length; i++) {
    for (let j = i + 1; j < transactions.length; j++) {
      const sum = transactions[i].monto + transactions[j].monto;
      if (Math.abs(sum - absTarget) <= tolerance) {
        results.push({ transactions: [transactions[i], transactions[j]], sum });
      }
    }
  }
  if (results.length > 0) return results;

  // Triples (only if dataset is small enough to be fast)
  if (transactions.length <= 60) {
    for (let i = 0; i < transactions.length; i++) {
      for (let j = i + 1; j < transactions.length; j++) {
        for (let k = j + 1; k < transactions.length; k++) {
          const sum = transactions[i].monto + transactions[j].monto + transactions[k].monto;
          if (Math.abs(sum - absTarget) <= tolerance) {
            results.push({ transactions: [transactions[i], transactions[j], transactions[k]], sum });
          }
        }
      }
    }
  }

  return results;
}
