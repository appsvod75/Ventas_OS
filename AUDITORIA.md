# Auditoría — Ventas_OS

Documento de seguimiento de la auditoría. Cada hallazgo se marca con `[x]` cuando queda resuelto y verificado.

## Punto 1 (CRÍTICO): Cierres de Caja ✅

El único punto crítico de la auditoría. Trabajo completo: código validado (`node --check`, `tsc`, `vite build`) y punto 1 verificado en producción.

- [x] **Causa A — force ignora cierre periódico**: `runClosingForDate(targetDate, { force })` saltaba el `continue` de períodos solo con `!force`; devuelve `{ processed, skipped }`, rethrow de errores y cron con try/catch.
- [x] **Causa B — días sin movimiento ocultos**: `getClosings` filtraba `OR (totalSales>0 || totalExpenses>0)`; ahora con `includeEmpty` se muestran. Checkbox "Mostrar días sin movimiento" en frontend.
- [x] **Ruta force**: `POST /api/closings/force` registrada en `closing.routes.js`; el frontend ya la invocaba.
- [x] **Detalle por rango**: `GET /api/closings/details` acepta `endDate` opcional (start = `toSVDate(date)`, end = `toSVEndOfDay(endDate || date)`).
- [x] **Vista semanal de períodos**: `getPeriodClosings` + `GET /api/closings/periods`. Rollup por semana calendario (Lun→Sáb según `openDay`/`closeDay`), estado Abierto/Cerrado, bucket con ventas total/shipping/count y gastos. Períodos derivados del calendario, no de aperturas (evita huérfanos). Setup frontend en 3 meses.
- [x] **Frontend semanal**: `CashClosings.tsx` rediseñado — filas por período, badge estado, detalle con rango `startDate/endDate`, botón "Recalcular Período" (force global), toggle "Mostrar envíos".
- [x] **Fix crash `RangeError: Invalid time value`**: `periodStart`/`periodEnd` llegan como ISO completo desde el backend; se concatenaba `'T00:00:00'` → fecha inválida. Corregido con `new Date(periodStart)` directo.
- [x] **Label "Período en vivo"**: `getPeriodSummary` usaba la última apertura (`cashOpening`) para anclar el período → fechas incorrectas. Ahora es calendario puro: `periodStartFor(now, branch)` + `closeDayKeyFor`. Ej. hoy mié 05/08 → `lun 03/08 → sáb 08/08`.
- [x] **Card de Envíos del período**: cuarta card en `CashClosings` mostrando `totalShipping` del período en curso.
- [x] **Convención de montos (aprobada por el usuario)**: **Venta Total = ventas + envíos** (lo que pagó el cliente). Cards y tabla: Venta Total = `totalSales + totalShipping`, luego se restan Envíos y Gastos. **Venta Neta = Venta Total − Envíos − Gastos** = `totalSales − totalExpenses` (el envío se cancela porque ya está contado en la venta total). Aplicado en `getPeriodSummary` y `getPeriodClosings`.
- [ ] **Despliegue en VPS** (en curso por el usuario): subir `closing.controller.js`, `closing.routes.js`, `frontend/dist/` íntegro; `pm2 restart ventasee-os`.

## Hallazgos pendientes

- [ ] 🟠 **`salesTrend` agrupa por UTC** (`backend/controllers/stats.controller.js`): las gráficas de tendencia se agrupan por día en UTC en vez de hora SV. Conocido, no tocar por ahora.
- [ ] 🟠 **Dead code `getClosingReport`** (`frontend/src/services/api.ts`): referencia un endpoint que no existe. No tocar por ahora (usado por error de diseño, sin impacto en runtime).
- [x] 🟠 **Inconsistencia neto con envíos**: resuelta con la convención aprobada (Venta Total = ventas + envíos; Neto = Venta Total − Envíos − Gastos). Cards y tabla de períodos calculan el mismo Neto. Convención en `AUDITORIA.md` sección Punto 1.

## Anexo: Pendientes detectados el 05/08 — Auditabilidad del detalle ✅🚧

- [ ] 🟠 **Desglose de Gastos en el detalle (anulaciones)**: en un período hay anulaciones (ventas revertidas) que se contabilizan como gastos para revertir, pero la vista "Cortes de Caja" solo muestra el total "Gastos" sin indicar su composición. Hacer auditable el valor de cada componente de la card/cuadre:
  - En el modal "Ver Detalles" (acción de la tabla), corregir que además de la card de **formas de pago** no hay el **total de ventas** que suman las distintas formas de pago (el grán total).
  - Añadir una **acción junto al cuadre de caja** que, al pulsarse, levante un **modal de desglose** mostrando qué conforma cada valor (p. ej. "Gastos del período" con el detalle de cada gasto/anulación que lo compone). Objetivo: auditar cada monto de forma eficiente.

## Notas de despliegue

- Rutas VPS: `/var/www/ventasee-os/backend/...` y `/var/www/ventasee-os/frontend/...`.
- Backend no recarga solo: requiere `pm2 restart ventasee-os` tras subir cambios.
- Frontend: subir `frontend/dist/` íntegro (build regenera `public/version.json`, PWA autoUpdate).
- Nunca subir `misventas.db` ni `.env`.
- Los archivos `.tsx`/`.ts` fuente NO se suben a producción (van compilados dentro del bundle de `dist/`).
