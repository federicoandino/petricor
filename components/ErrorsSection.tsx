'use client';

import React, { useState, useMemo } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Lightbulb } from 'lucide-react';
import type { ReconciliationRow } from '@/lib/reconcile';
import { findCandidates } from '@/lib/findCandidates';
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
  const hasTransactions = !!row.npTransactions?.length;
  const diff = row.diferencia ?? 0;

  // Only suggest when NP > MX (transactions in NP missing from Maxirest)
  const candidates = useMemo(() => {
    if (!hasTransactions || diff <= 0 || !row.npTransactions) return [];
    return findCandidates(row.npTransactions, diff);
  }, [hasTransactions, diff, row.npTransactions]);

  const candidateSet = useMemo(() => {
    if (candidates.length === 0) return new Set<number>();
    // Use the first (simplest) match to highlight
    return new Set(candidates[0].transactions.map((_, i) => {
      const tx = candidates[0].transactions[i];
      return row.npTransactions!.findIndex(
        (t) => t.time === tx.time && t.medioPago === tx.medioPago && t.monto === tx.monto
      );
    }));
  }, [candidates, row.npTransactions]);

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
              {expanded
                ? <ChevronDown className="w-3.5 h-3.5 inline" />
                : <ChevronRight className="w-3.5 h-3.5 inline" />}
            </span>
          )}
        </td>
      </tr>

      {expanded && hasTransactions && (
        <tr>
          <td colSpan={6} className="px-0 py-0 bg-amber-50/40 border-b border-red-200">
            <div className="px-6 py-4 space-y-4">

              {/* Suggestion box */}
              {candidates.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-amber-800">
                        Sugerencia — posible causa del descuadre de {formatARS(diff)}
                      </p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        {candidates.length === 1
                          ? 'Se encontró una combinación de transacciones que suma exactamente la diferencia:'
                          : `Se encontraron ${candidates.length} combinaciones posibles. La más simple:`}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded border border-amber-200 bg-white">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-amber-100 border-b border-amber-200">
                          <th className="text-left px-3 py-2 font-semibold text-amber-800">Hora</th>
                          <th className="text-left px-3 py-2 font-semibold text-amber-800">Medio de Pago</th>
                          <th className="text-right px-3 py-2 font-semibold text-amber-800">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-50">
                        {candidates[0].transactions.map((tx, i) => (
                          <tr key={i} className="bg-amber-50/60">
                            <td className="px-3 py-2 text-gray-700 font-mono">{tx.time || '—'}</td>
                            <td className="px-3 py-2 text-gray-700">{tx.medioPago}</td>
                            <td className="px-3 py-2 text-right font-semibold text-amber-800 tabular-nums">
                              {formatARS(tx.monto)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-amber-100 border-t border-amber-200">
                          <td colSpan={2} className="px-3 py-2 text-right text-xs font-semibold text-amber-800">
                            Total sugerido
                          </td>
                          <td className="px-3 py-2 text-right text-xs font-bold text-amber-800 tabular-nums">
                            {formatARS(candidates[0].sum)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {candidates.length > 1 && (
                    <p className="text-[10px] text-amber-600 mt-2">
                      Otras {candidates.length - 1} combinación{candidates.length - 1 > 1 ? 'es' : ''} posible{candidates.length - 1 > 1 ? 's' : ''} también suman la misma diferencia. Revisá el detalle completo abajo.
                    </p>
                  )}
                </div>
              )}

              {diff < 0 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    Maxirest registra <strong>{formatARS(Math.abs(diff))}</strong> más que Nave Point. Revisá si hay cobros cargados en Maxirest que no pasaron por Nave Point, o si hay un cobro duplicado en Maxirest.
                  </p>
                </div>
              )}

              {/* Full transaction list */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Todas las transacciones Nave Point — {row.npTransactions!.length} registros
                </p>
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-3 py-2 font-semibold text-gray-500 whitespace-nowrap">#</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-500 whitespace-nowrap">Hora</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-500 whitespace-nowrap">Medio de Pago</th>
                        <th className="text-right px-3 py-2 font-semibold text-gray-500 whitespace-nowrap">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {row.npTransactions!.map((tx, i) => {
                        const isCandidate = candidateSet.has(i);
                        return (
                          <tr
                            key={i}
                            className={cn(
                              'transition-colors',
                              isCandidate
                                ? 'bg-amber-50 border-l-2 border-amber-400'
                                : 'hover:bg-gray-50'
                            )}
                          >
                            <td className="px-3 py-2 text-gray-400 tabular-nums">{i + 1}</td>
                            <td className="px-3 py-2 text-gray-600 font-mono">{tx.time || '—'}</td>
                            <td className="px-3 py-2 text-gray-700">{tx.medioPago}</td>
                            <td className={cn(
                              'px-3 py-2 text-right tabular-nums',
                              isCandidate ? 'font-bold text-amber-700' : 'text-gray-800 font-medium'
                            )}>
                              {formatARS(tx.monto)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 border-t border-gray-200">
                        <td colSpan={3} className="px-3 py-2 text-right text-xs font-semibold text-gray-600">
                          Total Nave Point
                        </td>
                        <td className="px-3 py-2 text-right text-xs font-bold text-gray-700 tabular-nums">
                          {formatARS(row.npTransactions!.reduce((s, t) => s + t.monto, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

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
