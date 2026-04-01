'use client';

import React from 'react';
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
      return (
        <span className="inline-flex items-center gap-1 text-green-700 font-medium text-xs">
          <span>✅</span> Conciliado
        </span>
      );
    case 'descuadre':
      return (
        <span className="inline-flex items-center gap-1 text-red-700 font-semibold text-xs">
          <span>❌</span> Descuadre
        </span>
      );
    case 'soloNavePoint':
      return (
        <span className="inline-flex items-center gap-1 text-orange-600 font-medium text-xs">
          <span>⚠️</span> Solo Nave Point
        </span>
      );
    case 'soloMaxirest':
      return (
        <span className="inline-flex items-center gap-1 text-orange-600 font-medium text-xs">
          <span>⚠️</span> Solo Maxirest
        </span>
      );
    case 'efectivo':
      return (
        <span className="inline-flex items-center gap-1 text-gray-500 text-xs">
          <span>—</span> Efectivo
        </span>
      );
    default:
      return <span className="text-gray-400 text-xs">{status}</span>;
  }
}

function rowBg(status: ReconciliationRow['status']): string {
  switch (status) {
    case 'conciliado':
      return '';
    case 'descuadre':
      return 'bg-red-50';
    case 'soloNavePoint':
    case 'soloMaxirest':
      return 'bg-yellow-50';
    case 'efectivo':
      return 'bg-gray-100';
    default:
      return '';
  }
}

export function ReconciliationTable({ rows }: ReconciliationTableProps) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        No hay filas para mostrar.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
              Fecha
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
              Medio de Pago
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
              Total Nave Point
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
              Total Maxirest
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
              Diferencia
            </th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
              Estado
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr
              key={`${row.date}-${row.medioPago}-${i}`}
              className={cn(
                'transition-colors hover:brightness-95',
                rowBg(row.status)
              )}
            >
              <td className="px-4 py-3 text-gray-700 whitespace-nowrap font-mono text-xs">
                {formatDate(row.date)}
              </td>
              <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">
                {row.medioPago}
              </td>
              <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap tabular-nums">
                {row.totalNavePoint !== null ? formatARS(row.totalNavePoint) : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap tabular-nums">
                {row.totalMaxirest !== null ? formatARS(row.totalMaxirest) : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                {row.diferencia !== null ? (
                  <span className={cn(
                    'font-medium',
                    Math.abs(row.diferencia) <= 1 ? 'text-green-700' : 'text-red-700'
                  )}>
                    {formatARS(row.diferencia)}
                  </span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-center whitespace-nowrap">
                <StatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
