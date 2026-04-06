# Petricor — Conciliador de Ventas

Herramienta web para conciliar las ventas registradas en **Nave Point** (terminal de cobros) contra las registradas en **Maxirest** (sistema de gestión del restaurante).

Construida con Next.js 14, TypeScript y Tailwind CSS. Todo el procesamiento ocurre localmente en el navegador, sin enviar datos a ningún servidor.

---

## Funcionalidades

- Carga de archivos `.xlsx` mediante drag & drop o selector de archivos
- Filtro por rango de fechas sobre las fechas comunes a ambos reportes
- Matching de transacciones individuales con soporte para recargo del 10% en tarjetas de crédito
- Detección de descuadres: montos que no coinciden, operaciones solo en un sistema, etc.
- Resumen ejecutivo: total Nave Point, total Maxirest tarjetas, efectivo, diferencia global y % conciliado
- Alerta de créditos cobrados sin recargo, desglosada por mozo
- Tabla de detalle completo con estado por fila
- Exportación de resultados a Excel

---

## Stack

| Tecnología | Uso |
|---|---|
| Next.js 14 (App Router) | Framework |
| TypeScript | Lenguaje |
| Tailwind CSS | Estilos |
| `xlsx` | Parseo y exportación de archivos Excel |
| `file-saver` | Descarga del archivo exportado |
| `lucide-react` | Íconos |

---

## Estructura del proyecto

```
petricor/
├── app/
│   ├── layout.tsx          # Layout raíz
│   └── page.tsx            # Página principal (orquesta todo el flujo)
├── components/
│   ├── FileDropZone.tsx     # Upload de archivos con drag & drop
│   ├── DateRangePicker.tsx  # Selector de rango de fechas
│   ├── SummaryCards.tsx     # Tarjetas de resumen ejecutivo
│   ├── ReconciliationTable.tsx  # Tabla de detalle completo
│   └── ErrorsSection.tsx   # Sección de descuadres
└── lib/
    ├── parseNavePoint.ts    # Parser del reporte Nave Point (.xlsx)
    ├── parseMaxirest.ts     # Parser del informe Maxirest (.xlsx)
    ├── matchTransactions.ts # Matching de transacciones individuales
    ├── reconcile.ts         # Lógica central de conciliación
    ├── exportExcel.ts       # Exportación de resultados a Excel
    └── utils.ts             # Utilidades (cn, etc.)
```

---

## Cómo usar

### Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador.

### Build de producción

```bash
npm run build
npm start
```

### Flujo de uso

1. Cargá el reporte de **Nave Point** (Detalle de operaciones, `.xlsx`)
2. Cargá el informe de **Maxirest** (Informe de ventas, `.xlsx`)
3. Seleccioná el rango de fechas a conciliar
4. Hacé clic en **Conciliar**
5. Revisá el resumen y los descuadres
6. Exportá los resultados a Excel si es necesario

---

## Lógica de conciliación

- Se comparan únicamente las fechas presentes en **ambos** archivos.
- Las filas de Maxirest con cobros tipo `NCB`, `FCB`, `NDB` o `FDB` se ignoran.
- El efectivo se muestra por separado y no genera diferencia (Nave Point no registra efectivo).
- El matching de transacciones soporta dos modos:
  - **Exacto**: monto igual en ambos sistemas.
  - **Con recargo 10%**: monto en Nave Point = monto en Maxirest × 1.10 (recargo tarjeta de crédito).
- Una fila se marca como `conciliado` si todas las transacciones del día encontraron match. De lo contrario se marca como `descuadre`.

---

Proyecto creado por [Federico Andino](https://www.linkedin.com/in/andinofederico/) para Petricor.
