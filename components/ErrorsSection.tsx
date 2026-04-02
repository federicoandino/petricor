'use client';

import React, { useState, useMemo } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import type { ReconciliationRow } from '@/lib/reconcile';
import { matchTransactions } from '@/lib/matchTransactions';
import { formatARS } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ErrorsSectionProps {
  rows: ReconciliationRow[];
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function DescuadreRow({ row }: { row: ReconciliationRow }) {
  const [expanded, setExpanded] = useState(false);
  const hasTransactions = !!row.npTransactions?.length || !!row.mxTransactions?.length;
  const diff = row.diferencia ?? 0;

  const matchResult = useMemo(() => {
    if (!row.npTransactions && !row.mxTransactions) return null;
    return matchTransactions(
      row.npTransactions ?? [],
      row.mxTransactions ?? []
    );
  }, [row.npTransactions, row.mxTransactions]);

  return (
    <>
      <tr
        className={cn('hover:bg-red-100/60 transition-colors', hasTransactions && 'cursor-pointer')}
        onClick={() => hasTransactions && setExpanded((v) => !v)}
      >
        <td className="px-4 py-3 text-gray-700 whitespace-nowrap font-mono text-xs">
          {formatDate(row.date)}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <span className="text-gray-800 font-medium">{row.medioPago}</span>
        </td>
        <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap tabular-nums">
          {row.totalNavePoint !== null ? formatARS(row.totalNavePoint) : <span className="text-gray-300">—</span>}
        </td>
        <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap tabular-nums">
          {row.totalMaxirest !== null ? formatARS(row.totalMaxirest) : <span className="text-gray-300">—</span>}
        </td>
        <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
          <span className={cn('font-semibold', diff > 0 ? 'text-orange-700' : 'text-red-700')}>
            {formatARS(diff)}
          </span>
        </td>
        <td className="px-4 py-3 text-center w-8">
          {hasTransactions && (
            <span className="text-gray-400">
              {expanded ? <ChevronDown className="w-3.5 h-3.5 inline" /> : <ChevronRight className="w-3.5 h-3.5 inline" />}
            </span>
          )}
        </td>
      </tr>

      {expanded && matchResult && (
        <tr>
          <td colSpan={6} className="px-0 py-0 border-b border-red-200 bg-gray-50">
            <div className="px-6 py-4 space-y-4">

              {/* Summary badges */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  {matchResult.matched.length} coinciden
                </span>
                {matchResult.unmatchedNP.length > 0 && (
                  <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium">
                    <XCircle className="w-3 h-3" />
                    {matchResult.unmatchedNP.length} en NP sin par en Maxirest
                  </span>
                )}
                {matchResult.unmatchedMX.length > 0 && (
                  <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-medium">
                    <HelpCircle className="w-3 h-3" />
                    {matchResult.unmatchedMX.length} en Maxirest sin par en NP
                  </span>
                )}
              </div>

              {/* Unmatched NP — the key info */}
              {matchResult.unmatchedNP.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    Transacciones de Nave Point sin registro en Maxirest
                  </p>
                  <div className="rounded-lg border border-red-200 overflow-hidden">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-red-50 border-b border-red-200">
                          <th className="text-left px-3 py-2 font-semibold text-red-700">Hora NP</th>
                          <th className="text-left px-3 py-2 font-semibold text-red-700">Medio de Pago</th>
                          <th className="text-right px-3 py-2 font-semibold text-red-700">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100 bg-white">
                        {matchResult.unmatchedNP.map((tx, i) => (
                          <tr key={i} className="bg-red-50/40">
                            <td className="px-3 py-2 font-mono text-gray-700">{tx.time || '—'}</td>
                            <td className="px-3 py-2 text-gray-700">{tx.medioPago}</td>
                            <td className="px-3 py-2 text-right font-bold text-red-700 tabular-nums">{formatARS(tx.monto)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-red-100 border-t border-red-200">
                          <td colSpan={2} className="px-3 py-2 text-right font-semibold text-red-700">Total faltante en Maxirest</td>
                          <td className="px-3 py-2 text-right font-bold text-red-700 tabular-nums">
                            {formatARS(matchResult.unmatchedNP.reduce((s, t) => s + t.monto, 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Unmatched MX */}
              {matchResult.unmatchedMX.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" />
                    Transacciones en Maxirest sin registro en Nave Point
                  </p>
                  <div className="rounded-lg border border-orange-200 overflow-hidden">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-orange-50 border-b border-orange-200">
                          <th className="text-left px-3 py-2 font-semibold text-orange-700">Hora MX</th>
                          <th className="text-left px-3 py-2 font-semibold text-orange-700">COBRO</th>
                          <th className="text-right px-3 py-2 font-semibold text-orange-700">Importe</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-orange-100 bg-white">
                        {matchResult.unmatchedMX.map((tx, i) => (
                          <tr key={i} className="bg-orange-50/40">
                            <td className="px-3 py-2 font-mono text-gray-700">{tx.time || '—'}</td>
                            <td className="px-3 py-2 text-gray-700">{tx.cobro}</td>
                            <td className="px-3 py-2 text-right font-bold text-orange-700 tabular-nums">{formatARS(tx.importe)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-orange-100 border-t border-orange-200">
                          <td colSpan={2} className="px-3 py-2 text-right font-semibold text-orange-700">Total extra en Maxirest</td>
                          <td className="px-3 py-2 text-right font-bold text-orange-700 tabular-nums">
                            {formatARS(matchResult.unmatchedMX.reduce((s, t) => s + t.importe, 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Matched pairs (collapsible) */}
              {matchResult.matched.length > 0 && (
                <details className="group">
                  <summary className="text-xs font-semibold text-green-700 uppercase tracking-wide flex items-center gap-1 cursor-pointer list-none select-none">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {matchResult.matched.length} transacciones que coinciden
                    <span className="text-gray-400 font-normal normal-case tracking-normal ml-1">(click para ver)</span>
                  </summary>
                  <div className="mt-2 rounded-lg border border-green-200 overflow-hidden">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-green-50 border-b border-green-200">
                          <th className="text-left px-3 py-2 font-semibold text-green-700">Hora NP</th>
                          <th className="text-left px-3 py-2 font-semibold text-green-700">Medio de Pago NP</th>
                          <th className="text-right px-3 py-2 font-semibold text-green-700">Monto NP</th>
                          <th className="text-left px-3 py-2 font-semibold text-green-700 border-l border-green-200">Hora MX</th>
                          <th className="text-right px-3 py-2 font-semibold text-green-700">Monto MX</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-green-50 bg-white">
                        {matchResult.matched.map(({ np, mx }, i) => (
                          <tr key={i} className="hover:bg-green-50/40">
                            <td className="px-3 py-2 font-mono text-gray-600">{np.time || '—'}</td>
                            <td className="px-3 py-2 text-gray-700">{np.medioPago}</td>
                            <td className="px-3 py-2 text-right text-gray-700 tabular-nums">{formatARS(np.monto)}</td>
                            <td className="px-3 py-2 font-mono text-gray-600 border-l border-green-100">{mx.time || '—'}</td>
                            <td className="px-3 py-2 text-right text-gray-700 tabular-nums">{formatARS(mx.importe)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}

            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function ErrorsSection({ rows }: ErrorsSectionProps) {
  const descuadres = rows
    .filter((r) => r.status === 'descuadre')
    .sort((a, b) => Math.abs(b.diferencia ?? 0) - Math.abs(a.diferencia ?? 0));

  if (descuadres.length === 0) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5">
        <div className="flex items-center gap-2">
          <span className="text-xl">✅</span>
          <div>
            <p className="font-semibold text-green-800">Sin descuadres</p>
            <p className="text-sm text-green-600">Todas las filas de tarjetas están conciliadas correctamente.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 overflow-hidden shadow-sm">
      <div className="bg-red-600 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-white flex-shrink-0" />
          <h3 className="text-sm font-semibold text-white">
            Descuadres detectados — {descuadres.length} {descuadres.length === 1 ? 'fila' : 'filas'}
          </h3>
        </div>
        <span className="text-xs text-red-200">Hacé click en una fila para ver el detalle</span>
      </div>

      <div className="overflow-x-auto bg-red-50">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-red-200 bg-red-100">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-red-700 uppercase tracking-wide whitespace-nowrap">Fecha</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-red-700 uppercase tracking-wide whitespace-nowrap">Medio de Pago</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-red-700 uppercase tracking-wide whitespace-nowrap">Nave Point</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-red-700 uppercase tracking-wide whitespace-nowrap">Maxirest</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-red-700 uppercase tracking-wide whitespace-nowrap">Diferencia</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-red-100">
            {descuadres.map((row, i) => (
              <DescuadreRow key={`err-${row.date}-${row.medioPago}-${i}`} row={row} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-red-100 border-t border-red-200 px-5 py-2.5">
        <p className="text-xs text-red-700">
          Diferencia absoluta total:{' '}
          <span className="font-bold">
            {formatARS(descuadres.reduce((acc, r) => acc + Math.abs(r.diferencia ?? 0), 0))}
          </span>
        </p>
      </div>
    </div>
  );
}
