'use client';

import React, { useState } from 'react';
import { TrendingUp, CreditCard, Banknote, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { Summary } from '@/lib/reconcile';
import { formatARS } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface SummaryCardsProps {
  summary: Summary;
}

interface CardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  subtitle?: string;
  tooltip: string;
}

function Card({ title, value, icon, colorClass, bgClass, borderClass, subtitle, tooltip }: CardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className={cn('rounded-xl border p-4 flex flex-col gap-2 flex-1 min-w-0 relative', bgClass, borderClass)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide leading-tight">{title}</p>
          <div
            className="relative"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <Info className="w-3 h-3 text-gray-400 cursor-help flex-shrink-0" />
            {showTooltip && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg z-10 leading-relaxed pointer-events-none">
                {tooltip}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
              </div>
            )}
          </div>
        </div>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', colorClass, 'bg-white/60')}>
          {icon}
        </div>
      </div>
      <p className={cn('text-xl font-bold leading-none', colorClass)}>{value}</p>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </div>
  );
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const isDiferenciaZero = Math.abs(summary.diferenciaTotal) < 0.01;
  const is100Conciliado = summary.porcentajeConciliado >= 99.99;

  return (
    <div className="flex flex-wrap gap-3">
      <Card
        title="Total Nave Point"
        value={formatARS(summary.totalNavePoint)}
        icon={<TrendingUp className="w-4 h-4 text-blue-600" />}
        colorClass="text-blue-700"
        bgClass="bg-blue-50"
        borderClass="border-blue-200"
        subtitle="Tarjetas acreditadas"
        tooltip="Suma total de todos los pagos con tarjeta acreditados en Nave Point (Visa, Mastercard, MercadoPago). No incluye devoluciones ni efectivo."
      />
      <Card
        title="Total Maxirest Tarjetas"
        value={formatARS(summary.totalMaxirestTarjetas)}
        icon={<CreditCard className="w-4 h-4 text-indigo-600" />}
        colorClass="text-indigo-700"
        bgClass="bg-indigo-50"
        borderClass="border-indigo-200"
        subtitle="Cobros electrónicos"
        tooltip="Suma total de los cobros electrónicos registrados en Maxirest (Visa, Mastercard, MercadoPago). No incluye efectivo."
      />
      <Card
        title="Efectivo Maxirest"
        value={formatARS(summary.totalEfectivo)}
        icon={<Banknote className="w-4 h-4 text-gray-500" />}
        colorClass="text-gray-600"
        bgClass="bg-gray-50"
        borderClass="border-gray-200"
        subtitle="Pagos en efectivo"
        tooltip="Total de cobros en efectivo registrados en Maxirest. El efectivo no aparece en Nave Point, por eso se muestra por separado como referencia."
      />
      <Card
        title="Diferencia Total"
        value={formatARS(summary.diferenciaTotal)}
        icon={
          isDiferenciaZero
            ? <CheckCircle2 className="w-4 h-4 text-green-600" />
            : <AlertTriangle className="w-4 h-4 text-red-500" />
        }
        colorClass={isDiferenciaZero ? 'text-green-700' : 'text-red-700'}
        bgClass={isDiferenciaZero ? 'bg-green-50' : 'bg-red-50'}
        borderClass={isDiferenciaZero ? 'border-green-200' : 'border-red-200'}
        subtitle={isDiferenciaZero ? 'Sin diferencias' : 'Nave Point − Maxirest'}
        tooltip="Diferencia entre el total de tarjetas de Nave Point y el total de tarjetas de Maxirest. Idealmente debe ser $0. Un valor negativo indica que Maxirest registró más de lo que acreditó Nave Point."
      />
      <Card
        title="% Conciliado"
        value={`${summary.porcentajeConciliado.toFixed(1)}%`}
        icon={
          is100Conciliado
            ? <CheckCircle2 className="w-4 h-4 text-green-600" />
            : <AlertTriangle className="w-4 h-4 text-yellow-500" />
        }
        colorClass={is100Conciliado ? 'text-green-700' : 'text-yellow-700'}
        bgClass={is100Conciliado ? 'bg-green-50' : 'bg-yellow-50'}
        borderClass={is100Conciliado ? 'border-green-200' : 'border-yellow-200'}
        subtitle={is100Conciliado ? 'Conciliación perfecta' : 'Filas de tarjetas'}
        tooltip="Porcentaje de filas de tarjeta donde ambos sistemas coinciden (diferencia ≤ $1). El 100% significa que todos los medios de pago cuadran perfectamente."
      />
    </div>
  );
}
