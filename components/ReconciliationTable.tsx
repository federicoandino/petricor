'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import type { ReconciliationRow } from '@/lib/reconcile';
import { formatARS } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ReconciliationTableProps {
  rows: ReconciliationRow[];
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function StatusBadge({ status }: { status: ReconciliationRow['status'] }) {
  switch (status) {
    case 'conciliado':
      return <span className="inline-flex items-center gap-1 text-green-700 font-medium text-xs"><span>✅</span> Conciliado</span>;
    case 'descuadre':
      return <span className="inline-flex items-center gap-1 text-red-700 font-semibold text-xs"><span>❌</span> Descuadre</span>;
    case 'soloNavePoint':
      return <span className="inline-flex items-center gap-1 text-orange-600 font-medium text-xs"><span>⚠️</span> Solo Nave Point</span>;
    case 'soloMaxirest':
      return <span className="inline-flex items-center gap-1 text-orange-600 font-medium text-xs"><span>⚠️</span> Solo Maxirest</span>;
    case 'efectivo':
      return <span className="inline-flex items-center gap-1 text-gray-500 text-xs"><span>—</span> Efectivo</span>;
    default:
      return <span className="text-gray-400 text-xs">{status}</span>;
  }
}

function rowBg(status: ReconciliationRow['status']): string {
  switch (status) {
    case 'descuadre': return 'bg-red-50';
    case 'soloNavePoint':
    case 'soloMaxirest': return 'bg-yellow-50';
    case 'efectivo': return 'bg-gray-100';
    default: return '';
  }
}

function ExpandedDetail({ row }: { row: ReconciliationRow }) {
  const mr = row.matchResult;
  if (!mr) return null;

  return (
    <tr>
      <td colSpan={7} className="px-0 py-0 border-b border-gray-200 bg-gray-50/80">
        <div className="px-6 py-4 space-y-3">

          {/* Summary badges */}
          <div className="flex flex-wrap gap-2 text-xs">
            {mr.matched.length > 0 && (
              <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                <CheckCircle2 className="w-3 h-3" /> {mr.matched.length} coinciden
              </span>
            )}
            {mr.unmatchedNP.length > 0 && (
              <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium">
                <XCircle className="w-3 h-3" /> {mr.unmatchedNP.length} sin par en Maxirest
              </span>
            )}
            {mr.unmatchedMX.length > 0 && (
              <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-medium">
                <HelpCircle className="w-3 h-3" /> {mr.unmatchedMX.length} extra en Maxirest
              </span>
            )}
            {mr.exactCreditMatches.length > 0 && (
              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium">
                ⚠️ {mr.exactCreditMatches.length} crédito sin recargo
              </span>
            )}
          </div>

          {/* Unmatched NP */}
          {mr.unmatchedNP.length > 0 && (
            <div className="rounded-lg border border-red-200 overflow-hidden">
              <div className="bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Sin par en Maxirest
              </div>
              <table className="w-full text-xs border-collapse">
                <tbody className="divide-y divide-red-100 bg-white">
                  {mr.unmatchedNP.map((tx, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-mono text-gray-600 w-16">{tx.time || '—'}</td>
                      <td className="px-3 py-2 text-gray-700">{tx.medioPago}</td>
                      <td className="px-3 py-2 text-right font-bold text-red-700 tabular-nums">{formatARS(tx.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Unmatched MX */}
          {mr.unmatchedMX.length > 0 && (
            <div className="rounded-lg border border-orange-200 overflow-hidden">
              <div className="bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 flex items-center gap-1">
                <HelpCircle className="w-3 h-3" /> Extra en Maxirest
              </div>
              <table className="w-full text-xs border-collapse">
                <tbody className="divide-y divide-orange-100 bg-white">
                  {mr.unmatchedMX.map((tx, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-mono text-gray-600 w-16">{tx.time || '—'}</td>
                      <td className="px-3 py-2 text-gray-700">{tx.cobro}</td>
                      <td className="px-3 py-2 text-right font-bold text-orange-700 tabular-nums">{formatARS(tx.importe)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Matched pairs */}
          {mr.matched.length > 0 && (
            <details className="group">
              <summary className="text-xs font-semibold text-green-700 flex items-center gap-1 cursor-pointer list-none select-none">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {mr.matched.length} transacciones que coinciden
                <span className="text-gray-400 font-normal ml-1">(click para ver)</span>
              </summary>
              <div className="mt-2 rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-3 py-2 font-semibold text-gray-500">Hora NP</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-500">Medio de Pago</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-500">Monto NP</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-500 border-l border-gray-200">Hora MX</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-500">Monto MX</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {mr.matched.map(({ np, mx, withSurcharge }, i) => (
                      <tr key={i} className={cn('hover:bg-gray-50', withSurcharge && 'bg-amber-50/40')}>
                        <td className="px-3 py-2 font-mono text-gray-600">{np.time || '—'}</td>
                        <td className="px-3 py-2 text-gray-700">{np.medioPago}</td>
                        <td className="px-3 py-2 text-right text-gray-700 tabular-nums">{formatARS(np.monto)}</td>
                        <td className="px-3 py-2 font-mono text-gray-600 border-l border-gray-100">{mx.time || '—'}</td>
                        <td className="px-3 py-2 text-right text-gray-700 tabular-nums">{formatARS(mx.importe)}</td>
                        <td className="px-3 py-2 text-center w-16">
                          {withSurcharge && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">+10%</span>
                          )}
                          {!withSurcharge && isCreditLabel(np.medioPago) && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">sin rec.</span>
                          )}
                        </td>
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
  );
}

function isCreditLabel(medioPago: string): boolean {
  const lc = medioPago.toLowerCase();
  return lc.includes('crédito') || lc.includes('credito') || lc.includes('internacional') || lc.includes('american express');
}

function TableRow({ row }: { row: ReconciliationRow }) {
  const [expanded, setExpanded] = useState(false);
  const expandable = !!row.matchResult;

  return (
    <>
      <tr
        className={cn('transition-colors', rowBg(row.status), expandable && 'cursor-pointer hover:brightness-95')}
        onClick={() => expandable && setExpanded((v) => !v)}
      >
        <td className="px-4 py-3 text-gray-700 whitespace-nowrap font-mono text-xs">{formatDate(row.date)}</td>
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
          {row.diferencia !== null ? (
            <span className={cn('font-medium', Math.abs(row.diferencia) <= 1 ? 'text-green-700' : 'text-red-700')}>
              {formatARS(row.diferencia)}
            </span>
          ) : <span className="text-gray-300">—</span>}
        </td>
        <td className="px-4 py-3 text-center whitespace-nowrap">
          <StatusBadge status={row.status} />
        </td>
        <td className="px-4 py-3 text-center w-8">
          {expandable && (
            <span className="text-gray-400">
              {expanded ? <ChevronDown className="w-3.5 h-3.5 inline" /> : <ChevronRight className="w-3.5 h-3.5 inline" />}
            </span>
          )}
        </td>
      </tr>
      {expanded && <ExpandedDetail row={row} />}
    </>
  );
}

export function ReconciliationTable({ rows }: ReconciliationTableProps) {
  if (rows.length === 0) {
    return <div className="text-center py-10 text-gray-400 text-sm">No hay filas para mostrar.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Fecha</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Medio de Pago</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Total Nave Point</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Total Maxirest</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Diferencia</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Estado</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <TableRow key={`${row.date}-${row.medioPago}-${i}`} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
