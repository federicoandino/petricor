'use client';

import React, { useState, useCallback } from 'react';
import { ReceiptText, Download, RefreshCw, ChevronRight } from 'lucide-react';
import { FileDropZone, type FileMeta } from '@/components/FileDropZone';
import { SummaryCards } from '@/components/SummaryCards';
import { ReconciliationTable } from '@/components/ReconciliationTable';
import { ErrorsSection } from '@/components/ErrorsSection';
import { parseNavePoint, type NavePointRow } from '@/lib/parseNavePoint';
import { parseMaxirest, type MaxirestRow } from '@/lib/parseMaxirest';
import { reconcile, type ReconciliationResult } from '@/lib/reconcile';
import { exportToExcel } from '@/lib/exportExcel';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const [navePointData, setNavePointData] = useState<NavePointRow[] | null>(null);
  const [navePointMeta, setNavePointMeta] = useState<FileMeta | null>(null);
  const [maxirestData, setMaxirestData] = useState<MaxirestRow[] | null>(null);
  const [maxirestMeta, setMaxirestMeta] = useState<FileMeta | null>(null);

  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconcileError, setReconcileError] = useState<string | null>(null);

  const handleNavePointLoaded = useCallback((data: unknown[], meta: FileMeta) => {
    setNavePointData(data as NavePointRow[]);
    setNavePointMeta(meta);
    setResult(null);
    setReconcileError(null);
  }, []);

  const handleMaxirestLoaded = useCallback((data: unknown[], meta: FileMeta) => {
    setMaxirestData(data as MaxirestRow[]);
    setMaxirestMeta(meta);
    setResult(null);
    setReconcileError(null);
  }, []);

  const parseNavePointWrapper = useCallback(
    (buffer: ArrayBuffer) => {
      const res = parseNavePoint(buffer);
      return { data: res.data as unknown[], meta: res.meta };
    },
    []
  );

  const parseMaxirestWrapper = useCallback(
    (buffer: ArrayBuffer) => {
      const res = parseMaxirest(buffer);
      return { data: res.data as unknown[], meta: res.meta };
    },
    []
  );

  const handleReconcile = useCallback(async () => {
    if (!navePointData || !maxirestData) return;
    setIsReconciling(true);
    setReconcileError(null);

    // Allow React to re-render before heavy computation
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      const reconcileResult = reconcile(navePointData, maxirestData);
      setResult(reconcileResult);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al conciliar.';
      setReconcileError(msg);
    } finally {
      setIsReconciling(false);
    }
  }, [navePointData, maxirestData]);

  const handleExport = useCallback(() => {
    if (!result) return;
    const dateLabel = new Date().toISOString().split('T')[0];
    exportToExcel(result.rows, result.summary, dateLabel);
  }, [result]);

  const handleReset = useCallback(() => {
    setNavePointData(null);
    setNavePointMeta(null);
    setMaxirestData(null);
    setMaxirestMeta(null);
    setResult(null);
    setReconcileError(null);
  }, []);

  const bothLoaded = !!navePointData && !!maxirestData;
  const canReconcile = bothLoaded && !isReconciling;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top header bar */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <ReceiptText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-none">Conciliador de Ventas</h1>
              <p className="text-[10px] text-gray-400 leading-none mt-0.5">Nave Point × Maxirest</p>
            </div>
          </div>

          {result && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Nueva conciliación
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* File Upload Section */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">1</span>
              Cargar archivos
            </h2>
            <p className="text-sm text-gray-500 mt-1 ml-8">
              Cargá el reporte de Nave Point y el informe de Maxirest en formato .xlsx
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <FileDropZone
              label="Nave Point"
              sublabel="Detalle de operaciones"
              onFileLoaded={handleNavePointLoaded}
              parseFile={parseNavePointWrapper}
            />

            {/* Arrow divider (desktop only) */}
            <div className="hidden sm:flex items-center justify-center flex-shrink-0 pt-6">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>

            <FileDropZone
              label="Maxirest"
              sublabel="Informe de ventas"
              onFileLoaded={handleMaxirestLoaded}
              parseFile={parseMaxirestWrapper}
            />
          </div>

          {/* Reconcile button */}
          <div className="mt-5 flex flex-col items-center gap-3">
            <button
              onClick={handleReconcile}
              disabled={!canReconcile}
              className={cn(
                'inline-flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-sm transition-all duration-200 shadow-sm',
                canReconcile
                  ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:scale-[0.98]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              )}
            >
              {isReconciling ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Conciliando...
                </>
              ) : (
                <>
                  <ReceiptText className="w-4 h-4" />
                  Conciliar
                </>
              )}
            </button>
            {!bothLoaded && (
              <p className="text-xs text-gray-400">
                Cargá ambos archivos para habilitar la conciliación
              </p>
            )}
          </div>

          {/* Reconcile error */}
          {reconcileError && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700 font-medium">Error al conciliar</p>
              <p className="text-xs text-red-500 mt-0.5">{reconcileError}</p>
            </div>
          )}
        </section>

        {/* Results Section */}
        {result && (
          <>
            {/* Step 2 heading */}
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">2</span>
                Resultados
              </h2>
              {(navePointMeta || maxirestMeta) && (
                <span className="text-xs text-gray-400">
                  {navePointMeta?.dateRange || maxirestMeta?.dateRange}
                </span>
              )}
            </div>

            {/* Summary cards */}
            <section>
              <SummaryCards summary={result.summary} />
            </section>

            {/* Errors / Descuadres */}
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                Descuadres
              </h3>
              <ErrorsSection rows={result.rows} />
            </section>

            {/* Full reconciliation table */}
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Detalle completo
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">{result.rows.length} filas</p>
                </div>
              </div>

              <ReconciliationTable rows={result.rows} />

              {/* Export button */}
              <div className="mt-5 flex justify-end">
                <button
                  onClick={handleExport}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors shadow-sm hover:shadow-md active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
                  Exportar Excel
                </button>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <p className="text-xs text-gray-400 text-center">
            Conciliador de Ventas — Petricor · Todos los cálculos se realizan localmente en tu navegador
          </p>
        </div>
      </footer>
    </div>
  );
}
