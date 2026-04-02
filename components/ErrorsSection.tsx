'use client';

import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import type { ReconciliationRow } from '@/lib/reconcile';
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
  const hasTransactions = row.npTransactions && row.npTransactions.length > 0;

  return (
    <>
      <tr
        className={cn(
          'hover:bg-red-100/60 transition-colors',
          hasTransactions && 'cursor-pointer'
        )}
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
          <span className={cn('font-semibold', (row.diferencia ?? 0) > 0 ? 'text-orange-700' : 'text-red-700')}>
            {formatARS(row.diferencia)}
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

      {/* Drill-down: individual NP transactions */}
      {expanded && hasTransactions && (
        <tr>
          <td colSpan={6} className="px-0 py-0 bg-red-50/80 border-b border-red-200">
            <div className="px-6 py-3">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">
                Transacciones Nave Point — {row.npTransactions!.length} registros
              </p>
              <div className="overflow-x-auto rounded-lg border border-red-200 bg-white shadow-sm">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-red-100 border-b border-red-200">
                      <th className="text-left px-3 py-2 font-semibold text-red-700 whitespace-nowrap">#</th>
                      <th className="text-left px-3 py-2 font-semibold text-red-700 whitespace-nowrap">Hora</th>
                      <th className="text-left px-3 py-2 font-semibold text-red-700 whitespace-nowrap">Medio de Pago</th>
                      <th className="text-right px-3 py-2 font-semibold text-red-700 whitespace-nowrap">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-50">
                    {row.npTransactions!.map((tx, i) => (
                      <tr key={i} className="hover:bg-red-50/60">
                        <td className="px-3 py-2 text-gray-400 tabular-nums">{i + 1}</td>
                        <td className="px-3 py-2 text-gray-600 font-mono">{tx.time || '—'}</td>
                        <td className="px-3 py-2 text-gray-700">{tx.medioPago}</td>
                        <td className="px-3 py-2 text-right text-gray-800 font-medium tabular-nums">
                          {formatARS(tx.monto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-red-50 border-t border-red-200">
                      <td colSpan={3} className="px-3 py-2 text-right text-xs font-semibold text-red-700">
                        Total Nave Point
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-bold text-red-700 tabular-nums">
                        {formatARS(row.npTransactions!.reduce((s, t) => s + t.monto, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
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
      {/* Header */}
      <div className="bg-red-600 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-white flex-shrink-0" />
          <h3 className="text-sm font-semibold text-white">
            Descuadres detectados — {descuadres.length} {descuadres.length === 1 ? 'fila' : 'filas'}
          </h3>
        </div>
        <span className="text-xs text-red-200">Hacé click en una fila para ver las transacciones</span>
      </div>

      {/* Table */}
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

      {/* Footer summary */}
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
