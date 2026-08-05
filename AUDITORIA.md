# Auditoría — Ventas_OS

Documento de seguimiento de la auditoría. Vamos a revisar los hallazgos **uno por uno**. Cada punto se marca con `[x]` cuando queda corregido y verificado.

---

## 🔴 Punto 1 — CRÍTICO: Cierres de Caja ✅ RESUELTO

Este punto queda **completamente resuelto y verificado**.

### Problemas encontrados y corregidos

* [x] **Causa A — `forceClosing` ignoraba cierres periódicos**

  * `runClosingForDate(targetDate, { force })` podía saltarse el procesamiento de períodos.
  * Se corrigió para que el cierre forzado respete correctamente el período correspondiente.
  * El proceso devuelve información de `processed` y `skipped`.
  * Los errores se propagan correctamente y el cron tiene manejo de errores.

* [x] **Causa B — Los días sin movimiento no aparecían en el listado**

  * `getClosings` filtraba los cierres mediante ventas/gastos.
  * Ahora existe `includeEmpty` para poder mostrar también días sin movimiento.
  * El frontend incluye la opción **"Mostrar días sin movimiento"**.

* [x] **Ruta de cierre forzado**

  * Se agregó: `POST /api/closings/force`.
  * El frontend ya utilizaba esa ruta.
  * Se verificó que frontend y backend coincidan.

* [x] **Detalle por rango**

  * `GET /api/closings/details` ahora permite `endDate` opcional.
  * El rango utiliza correctamente las funciones de fecha de El Salvador.

* [x] **Vista semanal de períodos**

  * Se agregó `getPeriodClosings`.
  * Se agregó `GET /api/closings/periods`.
  * Los períodos se calculan según el calendario de la sucursal.
  * Se evita depender de aperturas existentes para generar los períodos.

* [x] **Frontend semanal**

  * `CashClosings.tsx` muestra los períodos.
  * Se muestran estados de período.
  * El detalle trabaja con `startDate/endDate`.
  * Se agregó **"Recalcular Período"**.
  * Se agregó opción para mostrar/ocultar envíos.

* [x] **Convención de montos (aprobada)**

  * **Venta Total = ventas + envíos** (lo que pagó el cliente).
  * **Venta Neta = Venta Total − Envíos − Gastos = `totalSales − totalExpenses`** (el envío se cancela porque ya está contado en la venta total).
  * Cards y tabla de períodos usan la misma convención → cifras coherentes.
  * Aplicada en `getPeriodSummary` y `getPeriodClosings`.

* [x] **Corrección de `RangeError: Invalid time value`**

  * El backend devuelve `periodStart`/`periodEnd` como ISO completo.
  * El frontend estaba concatenando incorrectamente `T00:00:00`.
  * Se corrigió utilizando directamente el ISO recibido.

* [x] **Corrección de "Período en vivo"**

  * Ya no depende de la última apertura de caja.
  * Ahora se calcula directamente según el calendario de la sucursal.
  * Ejemplo: miércoles 05/08 → período lunes 03/08 a sábado 08/08.

* [x] **Card de Envíos del período**

  * Se agregó una cuarta tarjeta en `CashClosings`.
  * Muestra el total de envíos del período actual.

### Verificaciones realizadas

* [x] `node --check`
* [x] `npx tsc --noEmit`
* [x] `vite build`
* [x] Prueba funcional del cierre forzado.
* [x] Verificación del listado y períodos.

### Despliegue pendiente

* [ ] Subir al VPS los archivos correspondientes a esta corrección (`closing.controller.js`, `closing.routes.js`, `cron.service.js`).
* [ ] Subir `frontend/dist/` completo si corresponde al build actual.
* [ ] Reiniciar el proceso con PM2 después de reemplazar los archivos (`pm2 restart ventasee-os`).

---

# 🟠 Hallazgos pendientes

## Punto 2 — Cuadre de efectivo por sucursal

* [ ] **Abonos a crédito de otras sucursales pueden estar entrando en el cuadre.**

El problema identificado está relacionado con la consulta de `creditPayments` dentro de `getClosingDetails`.

Actualmente se filtra por fecha, pero hay que verificar que los abonos correspondan exclusivamente a ventas de la sucursal consultada.

### Antes de modificar

* [ ] Revisar las relaciones reales de Prisma entre:

  * `ClientPayment`
  * `PaymentApplication`
  * Venta
  * `branchId`
* [ ] Confirmar cómo se puede determinar la sucursal correcta.
* [ ] Explicar la solución propuesta.
* [ ] No modificar código hasta revisar el problema.

---

## Punto 3 — Apertura de caja puede modificar una apertura anterior

* [ ] Revisar `CashClosings.tsx` y el flujo de `getLastOpening`.
* [ ] Si la última apertura pertenece a ayer, no debería actualizarse como si fuera la apertura de hoy.
* [ ] Debe determinarse correctamente cuándo corresponde actualizar y cuándo crear una nueva apertura.

---

## Punto 4 — `strictOpen` utiliza una fecha/hora diferente

* [ ] Revisar `sale.controller.js`.
* [ ] Verificar que la comprobación de apertura utilice exactamente la misma zona horaria de El Salvador que el cron y el resto del sistema.
* [ ] Evitar diferencias entre `new Date()` del servidor y `tz.js`.

---

## Punto 5 — Lógica de períodos duplicada

* [ ] Revisar las diferentes implementaciones de cálculo de períodos.
* [ ] Comparar:

  * `sale.controller.js`
  * `opening.controller.js`
  * `cron.service.js`
* [ ] Evitar que cada lugar interprete de forma diferente los días de apertura/cierre.
* [ ] Verificar especialmente ciclos semanales que atraviesen el domingo.

---

## Punto 6 — `updateSale`

* [ ] Revisar validación de apertura.
* [ ] Revisar validación de inventario/stock.
* [ ] Revisar modificación de precios.
* [ ] Revisar cálculo de saldo cuando una venta ya tiene abonos.
* [ ] No modificar hasta determinar exactamente el comportamiento esperado.

---

## Punto 7 — `salesTrend` utiliza UTC

* [ ] Revisar `backend/controllers/stats.controller.js`.
* [ ] La agrupación de ventas por día actualmente utiliza UTC.
* [ ] Debe comprobarse que la tendencia diaria utilice la fecha de El Salvador.

---

## Punto 8 — Código muerto / `closingApi` duplicado

* [ ] Revisar `frontend/src/services/api.ts`.
* [ ] Existe una referencia a `getClosingReport` / `/closings/report` que aparentemente no existe en backend.
* [ ] Confirmar primero que no exista ningún uso real antes de eliminarlo.

---

# 🟡 Mejoras pendientes

## Gastos y método de pago

* [ ] Revisar que el cuadre actualmente considera todos los gastos como efectivo.
* [ ] `Expense` aparentemente no guarda método de pago.
* [ ] Determinar si esto es correcto para el negocio antes de modificarlo.

## Anulación de pagos parciales / envíos / tarjeta

* [ ] Revisar el cálculo de reembolsos cuando existen pagos parciales.
* [ ] Revisar específicamente ventas con envío y pagos con tarjeta.

## Neto de períodos

* [x] ✅ **Resuelto**: se definió y aplicó la convención única → **Venta Total = ventas + envíos**; **Venta Neta = Venta Total − Envíos − Gastos = `totalSales − totalExpenses`**. Cards y tabla de períodos muestran cifras coherentes (ver Punto 1).

---

# 📋 Documentación vs código

* [x] `tz.js` y correcciones principales de fechas están implementados.
* [x] Apertura/cierre automático implementado.
* [x] Ciclos diarios/semanales implementados.
* [x] Reportes por encomendista implementados.
* [x] Detalle de cierres implementado.
* [x] Vista semanal de períodos y convención de montos documentados (05 Ago).
* [ ] Revisar documentación que todavía mencione funcionalidades antiguas o diferentes al código actual.

---

# 🚀 Regla de trabajo para esta auditoría

Vamos a trabajar **un punto a la vez**.

Para cada punto:

1. 🔎 Revisar primero.
2. 💬 Explicar qué está pasando.
3. 🧠 Proponer la solución.
4. ⏸️ Esperar aprobación antes de modificar.
5. 🔧 Realizar únicamente la corrección de ese punto.
6. 🧪 Verificar que funcione.
7. 📦 Indicar exactamente qué archivos hay que subir al VPS, organizados por carpeta.
8. 🚀 Indicar si hace falta `pm2 restart` u otro comando.
9. ✅ Marcar el punto como resuelto únicamente después de verificarlo.
10. ➡️ Recién entonces pasar al siguiente punto.

### Reglas importantes

* No corregir varios puntos simultáneamente.
* No hacer refactorizaciones no relacionadas.
* No cambiar comportamiento existente sin explicarlo.
* No subir `.env`.
* No subir bases de datos como `misventas.db`.
* Los archivos fuente `.tsx/.ts` no se suben directamente a producción cuando el cambio corresponde al frontend; se debe generar y desplegar el `frontend/dist/` correspondiente.
* Mantener actualizados `HANDOVER.md` y `WALKTHROUGH.md` cuando una corrección cambie el comportamiento documentado.

---

## Anexo: Pendientes detectados el 05/08 — Auditabilidad del detalle ✅🚧

* [ ] 🟠 **Desglose de Gastos en el detalle (anulaciones)**: en un período hay anulaciones (ventas revertidas) que se contabilizan como gastos para revertir, pero la vista "Cortes de Caja" solo muestra el total "Gastos" sin indicar su composición. Hacer auditable el valor de cada componente de la card/cuadre:
  * En el modal "Ver Detalles" (acción de la tabla), corregir que además de la card de **formas de pago** no hay el **total de ventas** que suman las distintas formas de pago (el grán total).
  * Añadir una **acción junto al cuadre de caja** que, al pulsarse, levante un **modal de desglose** mostrando qué conforma cada valor (p. ej. "Gastos del período" con el detalle de cada gasto/anulación que lo compone). Objetivo: auditar cada monto de forma eficiente.

---

## Notas de despliegue

* Rutas VPS: `/var/www/ventasee-os/backend/...` y `/var/www/ventasee-os/frontend/...`.
* Backend no recarga solo: requiere `pm2 restart ventasee-os` tras subir cambios.
* Frontend: subir `frontend/dist/` íntegro (build regenera `public/version.json`, PWA autoUpdate).
* Nunca subir `misventas.db` ni `.env`.
* Los archivos `.tsx`/`.ts` fuente NO se suben a producción (van compilados dentro del bundle de `dist/`).