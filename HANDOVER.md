# LuckyPOS - Handover

## Descripción General
Sistema de Punto de Venta (POS) moderno con soporte multi-sucursal, inventario avanzado, cuentas por cobrar/pagar, cierres de caja automatizados, envíos con estados, label de envío imprimible, y PWA para uso en tablets/móviles. Base de datos SQLite única (`misventas.db`).

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + TypeScript + Vite 7 |
| Backend | Node.js + Express 5 + Prisma ORM |
| BD | SQLite (`file:./misventas.db`) |
| Tiempo Real | Socket.IO (servicio centralizado `socketManager.js`) |
| PWA | vite-plugin-pwa con autoUpdate |
| UI/UX | Framer Motion, Lucide React, react-hot-toast |
| Autenticación | JWT + bcryptjs (PIN de 6 dígitos) |

## Estructura del Proyecto

```
LuckyPOS/
├── backend/
│   ├── server.js                # Entry point (Express + Socket.IO init)
│   ├── controllers/             # 15 controladores
│   ├── routes/                  # 14 rutas (una por controlador)
│   ├── middleware/               # auth.middleware.js (JWT Bearer)
│   ├── services/
│   │   ├── socketManager.js     # Centraliza Socket.IO (initIO/getIO)
│   │   └── cron.service.js      # Cierre automático de caja
│   ├── utils/
│   │   ├── permissions.js       # PERMISSIONS, hasPermission(), requirePermission()
│   │   └── audit.js             # logAudit()
│   ├── prisma/
│   │   ├── schema.prisma        # 23 modelos (SQLite)
│   │   └── seed.js              # Seed: 38 permisos, 3 roles, superadmin
│   ├── .env                     # DATABASE_URL="file:./misventas.db"
│   └── deploy.sh                # Script deploy VPS con PM2
│
├── frontend/
│   ├── src/
│   │   ├── pages/               # 25 páginas (POS, Admin, Inventory, Shipments, etc.)
│   │   ├── components/          # Sidebar, modales, teclados, ticket, label, etc.
│   │   ├── services/            # api.ts (axios), socket.ts, offlineQueue.ts
│   │   ├── context/             # CartContext (carrito de compras)
│   │   ├── utils/
│   │   │   └── permissions.ts   # getUser(), hasRole(), ROLES constants
│   │   └── styles/              # global.css, dashboard-routes.css
│   ├── public/                  # PWA icons, version.json
│   └── dist/                    # Build de producción
│
└── email_webhook.gs             # Google Apps Script para envío de tickets por email
```

## Base de Datos (23+ modelos)

- **SaleH** — Ventas (cabecera): incluye `shipping` (costo envío), `shippingDate` (fecha programada), `fulfillmentStatus` (VENDIDO/DESPACHADO/ENTREGADO)
- **Client** — `name`, `documentId`, `phone`, `email`, `address`, `isActive`
- **MasterConfig** — Config global: `businessName`, `logoUrl`, `sidebarConfig`, `autoClosingTime`, `labelFields`, etc.

## API Endpoints

| Ruta | Descripción |
|------|------------|
| `/api/auth` | Login (PIN), CRUD usuarios, verify PIN |
| `/api/products` | CRUD productos, categorías, variantes |
| `/api/inventory` | Stock, transfers, kardex, low-stock |
| `/api/sales` | Crear venta, historial, cuentas por cobrar, **shipments**, **fulfillment** |
| `/api/clients` | CRUD clientes, estado de cuenta, **delete con PIN** |
| `/api/providers` | CRUD proveedores |
| `/api/purchases` | Compras, cuentas por pagar, abonos |
| `/api/branches` | CRUD sucursales |
| `/api/expenses` | CRUD gastos |
| `/api/closings` | Cierres de caja, reportes, today-summary |
| `/api/audit` | Logs de auditoría |
| `/api/config` | Config global + danger zone (reset ventas/inventario/productos/**contador**) |
| `/api/stats` | Dashboard stats, reportes |
| `/api/projections` | Metas y proyecciones de ventas |

## Funcionalidades Clave

- **Pago Parcial**: Abono hoy + saldo a crédito con fecha de vencimiento
- **Envíos**: Fecha programada o inmediata, estados VENDIDO → DESPACHADO → ENTREGADO
- **Label de Envío**: Vista previa con campos configurables, impresión directa
- **PWA**: Instalable en mobile/desktop, actualización automática
- **Offline queue**: Cola de ventas offline en localStorage
- **Seguridad**: PIN para Configuración, eliminar productos, eliminar clientes
- **Reset de datos**: Zona de peligro con limpieza de ventas, inventario, productos y contador
- **Diseños**: Productos con personalización (toggle `hasCustomization`). En POS, botón rosa en el carrito → modal "En Construcción" (pendiente de formato del admin)

## Sidebar Configurable
Desde Settings → Barra Lateral. Se almacena como JSON en `masterConfig.sidebarConfig`.

## Puerto y Proxy
- Frontend dev: `:4000`
- Backend dev: `:3015`
- Proxy Vite: `/api` y `/socket.io` → `:3015`
- Producción: nginx proxy reverse a `:3019`

## Estados de Envío
- **VENDIDO** → **DESPACHADO** → **ENTREGADO**
- Se gestionan desde `/shipments` en el panel admin
- Contador de pendientes en el icono del dashboard

## Autenticación
- Login mediante PIN de 6 dígitos (bcryptjs)
- JWT en localStorage, enviado vía Bearer header
- Roles: Super Admin, Admin, Ventas
- PIN requerido para acciones destructivas (eliminar, configurar)

## Comisión por Producto
- Tipo: Fijo ($) o Porcentaje (%) por unidad vendida
- Se configura en creación/edición de producto, junto a proveedores
- Uso futuro: reportes de comisiones por vendedor

## Última sesión (04-05 Ago 2026) — Resumen de cambios (GLM)

### ✅ Implementado
| Feature | Descripción |
|---------|-------------|
| **Label de Envío: Encomendista** | `LabelModal.tsx:93` cambió "Delivery:" → "Encomendista:" (requerido por el cliente) |
| **Modal de Cobro (CheckoutModal): ENCOMENDISTA** | Título sección "DELIVERY/ENCOMENDISTA" + placeholder "Buscar encomendista..." |
| **Fix selección delivery en checkout** | Dropdown de delivery se desmontaba antes del click (touch delay en tablets/touchpads). Fix: eliminado `isDeliverySearchFocused` con onBlur timeout, cambiado `<div>` por `<button>` en items (click confiable en touch) |
| **Reporte Envíos por Encomendista** | Nuevo módulo en Reports (cian): agrupa envíos por delivery con count, total vendido, costo envío, desglose por estado (P/D/E) + tarjetas resumen |
| **Modal detalle encomendista** | Botón "Ver N" por fila abre modal con tarjetas de cada envío: cliente, items desglosados, vendedor, estado, fechas |
| **Filtros dinámicos Reports** | Eliminado botón "Filtrar" → debounce 400ms dispara automáticamente al cambiar fechas/sucursal. Badge "Actualizando..." en vuelo |
| **Filtros dinámicos Comisiones** | `SellerReport.tsx`: mismo debounce 400ms, eliminado botón "Consultar", badge "Actualizando..." |
| **Fix bug fecha envío (off-by-one)** | `shippingDate`, `dueDate`, `deliveryDate` se guardaban un día antes por falta de offset `-06:00`. Arreglado en `sale.controller.js:133,134,602` |
| **Fix bug recuperación delivery** | El admin no podía seleccionar delivery (404 en `closings/details`). Causa: ruta no registrada en `closing.routes.js` + método faltante en `closingApi` |
| **Cierre de Caja robusto** | `getClosingDetails` ahora retorna: `paymentBreakdown` (agrupado por método EFECTIVO/TARJETA/TRANSFERENCIA/CRÉDITO) + `cashSummary` (apertura + ventas efectivo + abonos − gastos = esperado) + `movements` con método + tipo PAYMENT (abonos a crédito). Excluye ventas anuladas |
| **Modal Ver Detalles rediseñado** | Botón "Kardex" → "Ver Detalles". Modal compacto (580px): tarjetas por método de pago + cuadre de efectivo editable (Efectivo contado → CUADRA/SOBRANTE/FALTANTE). Sin timeline (se ve en Historial) |
| **Apertura de Caja manual** | Modal en Cortes de Caja: monto + fecha + sucursal. Carga última apertura existente (modo editar). Warning si día no es Lunes (toast custom con botones, sin `window.confirm`). PIN de Super Admin obligatorio |
| **Apertura manual a posteriori** | `PUT /openings/:id` permite editar monto/fecha de apertura existente con PIN admin |
| **Apertura Automática (cron)** | `runOpeningForDate` en `cron.service.js`: crea CashOpening con $0 para cada sucursal activa si no existe. Respeta `closingType` (daily = todos los días, periodic = solo `openDay`) |
| **Cierre Automático por día** | `runClosingForDate` ahora filtra por `closeDay` para sucursales periódicas (solo corre el día correcto). Marca `closedAt` en apertura |
| **Settings: pestaña "Caja"** | Unificadas "Automatización" + "Apertura" en una sola. Toggles Cierre/Apertura + horas + ciclo por sucursal (Diaria/Semanal + días). Importado `Wallet` y `ShieldCheck` |
| **Settings: hora de apertura** | Nuevo campo `autoOpeningTime` en MasterConfig (default "06:00"). Toggle independiente. Requiere `prisma db push` (nueva columna) |
| **Settings: branchConfig carga** | Fix: `branchConfig` se pobla al cargar branches (antes solo se seteaba al hacer cambios manuales, por eso recargaba como "daily") |
| **Resumen dinámico (DailySummary)** | `/summary` ahora usa `getPeriodSummary`: rango según apertura vigente (diario = hoy, periódico = desde apertura vigente hasta ahora). Título "Resumen de la Semana" si es periódico. Muestra ventas acumuladas del periodo + count |
| **Cortes de Caja: resumen en vivo** | 4 mini-tarjetas en header: Venta Total del Período (con count), Envíos del Período, Gastos del Período, Neta (Semana/Día). Refresco cada 60s. Respeta sucursal seleccionada |
| **Timezone util centralizado** | `backend/utils/tz.js` con `toSVDate`, `toSVNoon`, `toSVEndOfDay`. Reemplaza 34 patrones hardcodeados en 8 controllers (sale, opening, closing, stats, purchase, expense, inventory, projection). Evita futuros bugs de off-by-one por zona horaria |

### ⏳ Pendiente de sesiones anteriores
- Refinar lógica de reembolso (casos: pago parcial con envío, tarjeta) — reembolso productos ya resuelto
- Diseños/Stamping: `customData` en SaleD, modal personalización (esperando formato admin), modal solo lectura con imagen
- Confirmar si los deliverys van en checkout o solo en modal de cliente
- Labels: altura fija según el tamaño que compren los clientes (70×50mm recomendado) — ajustar campos si no cabe

### 📦 Archivos nuevos en esta sesión
- `backend/utils/tz.js` (nuevo)

### 📝 Notas
- **Deploy requiere `prisma db push`** (nueva columna `autoOpeningTime` en MasterConfig). No borra datos.
- Recrear Prisma Client en el VPS: `npx prisma generate && npx prisma db push`

## Última sesión (05 Ago 2026) — Depuración de auditoría, Punto 1 (Cierres de Caja) ✅

### ✅ Implementado
| Feature | Descripción |
|---------|-------------|
| **Vista semanal de cortes (rollup por período)** | `getPeriodClosings` + `GET /api/closings/periods`. `CashClosings.tsx` rediseñado: filas por período calendario (Lun→Sáb según `openDay`/`closeDay`), badge Abierto/Cerrado, filtros Sucursal/Desde/Hasta, default 3 meses. Detalle con rango `startDate/endDate` |
| **Estado de período** | `estado: 'open'/'closed'` según `closedAt` de apertura o existencia de `CashClosing` en el día de cierre |
| **Toggle "Mostrar envíos"** | Columna Envíos condicional en la tabla (reemplaza el checkbox "mostrar días sin movimiento") |
| **Recalcular Período** | Botón en el modal de detalle → `POST /closings/force` (sin fecha) recalcula todos los cierres del período |
| **Convención de montos (aprobada)** | **Venta Total = ventas + envíos** (`totalSales + totalShipping`). **Venta Neta = Venta Total − Envíos − Gastos** = `totalSales − totalExpenses` (el envío se cancela porque ya está contado en la venta total). Aplicada en cards y tabla (consistentes) |
| **4 cards de resumen en vivo** | Venta Total del Período, Envíos del Período, Gastos del Período, Neta (Semana/Día). Refresco 60s |
| **Label "Período en vivo" calendario** | `getPeriodSummary` dejó de anclarse en la última apertura; ahora usa `periodStartFor(now, branch)` + `closeDayKeyFor` (ej. hoy → `lun 03/08 → sáb 08/08`) |
| **Fix `RangeError: Invalid time value`** | `periodStart`/`periodEnd` llegan como ISO completo; se concatenaba `'T00:00:00'` → fecha inválida. Ahora `new Date(periodStart)` directo |
| **AUDITORIA.md creado** | Documento de seguimiento de auditoría con checkboxes (Punto 1 resuelto + hallazgos pendientes + anexo) |

### ⏳ Pendiente (anexado a AUDITORIA.md)
- **Desglose auditable del detalle**: anulaciones se contabilizan como gastos pero no se distingue su origen. En el modal "Ver Detalles" falta el total de ventas que suman las formas de pago, y se quiere una acción junto al cuadre que abra un modal con el desglose de cada valor (p. ej. Gastos del período → detalle de cada gasto/anulación).

## Última sesión (29 Jul 2026) — Resumen de cambios

### ✅ Implementado
| Feature | Descripción |
|---------|-------------|
| **Anulación ventas** | Botón "Anular" en detalle, regresa inventario, crea gasto reembolso/envío, cancela saldo, toggle envío editable según estado |
| **Consultar producto** | Página completa con búsqueda por nombre/SKU, cards de precios, inventario por sucursal |
| **Precio libre** | Checkbox "Precio Libre" en producto, input editable en carrito (solo alza), toast si menor al base |
| **Diseños (Stamping)** | Modal con posición (adelante/atrás), imagen referencia, observaciones. `customData` en SaleD |
| **Sidebar configurable** | Orden y visibilidad desde Settings, fallback por rol, items nuevos aparecen al final |
| **Dashboard configurable** | Módulos ordenables desde Settings → Menú Principal, arrastrar y soltar |
| **Roles y permisos** | Pestaña en Settings, checkboxes por permiso, 39 permisos en español |
| **Filtro roles en sidebar** | Ventas solo ve: POS, Consultar, Clientes, Historial |
| **Cliente con ventas** | Editar requiere PIN de admin si el cliente ya tiene ventas |
| **Asignar vendedor** | Admin puede seleccionar vendedor en checkout, vendedor lo ve fijo |
| **Comisiones** | Automático al crear venta (Fijo $ o %), reporte por vendedor con filtro fechas, desglose productos |
| **Apertura de caja** | Configurable por sucursal (Settings), diaria o periódica, check "estricto", bloquea ventas si no hay apertura |
| **Deliverys** | CRUD de repartidores, selector en modal de cliente (pendiente confirmar si va en checkout) |
| **Visor de imagen** | Botón de imagen en detalle de envío, abre modal con foto del producto/diseño |
| **Animación cascada** | Módulos del dashboard aparecen uno tras otro con glow azul |

### ⏳ Pendiente
- ✅ ~~Revisar reversión: gasto creado incluye envío~~ → **Resuelto 01 Ago**: el reembolso ahora es solo productos, el envío va aparte solo si ya se incurrió
- Refinar lógica de reembolso en anulación (casos restantes: pago parcial con envío, tarjeta)

## Última sesión (01 Ago 2026) — Resumen de cambios

### ✅ Implementado
| Feature | Descripción |
|---------|-------------|
| **Fix parpadeo Historial** | Al navegar al Historial de Ventas había un parpadeo tipo reload. Causa: doble fetch al montar (efecto con debounce en `searchTerm` + efecto inmediato en `[page, startDate, endDate]`). El fetch diferido ~500ms volvía a poner `isLoading=true`. Fix: el efecto de búsqueda solo dispara cuando `searchTerm` cambia de verdad (ref `lastSearchRef`), no en el primer render |

## Última sesión (03 Ago 2026) — Resumen de cambios

### ✅ Implementado
| Feature | Descripción |
|---------|-------------|
| **Label configurable en 3 secciones** | Nuevo `labelSections` (JSON) en MasterConfig. Settings → Label de Envío: toggles de campos + 3 columnas ordenables (↑/↓ ordenar, botones 1/2/3 mover sección). Label renderiza por secciones con separadores punteados. Default: Cabecera (businessName, saleId, seller, shippingDate, status) → Cliente (clientName, phone, address, delivery) → Detalle (products, total). Requiere `prisma db push` en VPS (nueva columna) |
| **Fix módulo Envíos en sidebar** | `shipments` no estaba en `allPossibleItems` (Sidebar.tsx) ni `allSidebarItems` (Settings) — por eso no era seleccionable en barra lateral aunque sí en menú principal. Agregado en ambos. Módulos nuevos se añaden automáticamente al final de la lista guardada |

### ⏳ Pendiente
- Refinar lógica de reembolso (casos: pago parcial con envío, tarjeta) — reembolso productos ya resuelto
- Diseños/Stamping: `customData` en SaleD, modal personalización (esperando formato admin), modal solo lectura con imagen
- Confirmar si los deliverys van en checkout o solo en modal de cliente
- Labels: altura fija según el tamaño que compren los clientes (70×50mm recomendado) — ajustar campos si no cabe

### 📦 Archivos nuevos en esta sesión
- No hay archivos nuevos (solo modificaciones)

## Última sesión (02 Ago 2026) — Resumen de cambios

### ✅ Implementado
| Feature | Descripción |
|---------|-------------|
| **Fix reembolso en anulación** | El gasto de reembolso excluía el envío (`productRefund = cashPaid - shipping`), solo productos. El envío se registra como gasto aparte SOLO si `includeShipping` (ya incurrido: DESPACHADO/ENTREGADO). Antes doble contaba (reembolso con envío + gasto envío aparte). Probado: venta $55+$5 → con envío incurrido $55+$5, sin incurrir solo $55 |
| **Delivery + Vendedor en Label de Envío** | Nuevos campos configurables en Settings → Label de Envío. La data del delivery ya venía en el endpoint (`sale.controller.js` incluye `delivery: { name, phone }`). El vendedor usa `user.name` (ya estaba). Requiere activar los toggles |
| **Día en fecha del Label** | La fecha de envío ahora imprime con día: `Sábado 01/08/2026` (capitalizado, locale `es`) |
| **Fix colores botones de pago** | Faltaban estilos `.active.transfer` (morado) y `.active.credit` (ámbar) en CheckoutModal — TRANSFERENCIA y CREDITO no se resaltaban al seleccionar |
| **Auto-update reactivado** | `initAppVersionSync` estaba definido pero desconectado. Se conectó en `App.tsx` con `enabled: () => !!localStorage.getItem('token')` (solo con sesión activa, evita recargas en logout). Verifica `version.json` en focus/visibility (min 30s entre checks). Se eliminó el toast manual duplicado |
| **Orden pendientes en Envíos** | Pendientes: atrasados al tope, luego por fecha ascendente (FIFO). Despachados: más recientes primero (LIFO) |
| **sqlite3 en VPS** | Herramienta de consulta instalada (`apt install sqlite3`) para verificar columnas/consultas de solo lectura. Nunca UPDATE/DELETE a mano |

### ⏳ Pendiente
- Refinar lógica de reembolso (casos: pago parcial con envío, tarjeta) — reembolso productos ya resuelto
- Diseños/Stamping: `customData` en SaleD, modal personalización (esperando formato admin), modal solo lectura con imagen
- Confirmar si los deliverys van en checkout o solo en modal de cliente
- Labels: altura fija según el tamaño que compren los clientes (70×50mm recomendado) — ajustar campos si no cabe

### 📦 Archivos nuevos en esta sesión
- No hay archivos nuevos (solo modificaciones)

### Archivos nuevos (sesión 29 Jul)

### 🧠 Lecciones aprendidas (deploy)
1. **NUNCA** subir `misventas.db` al VPS
2. **NUNCA** subir `.env` al VPS  
3. **USAR** `DATABASE_URL` con ruta **absoluta** (`file:/var/www/...`)
4. **NO** ejecutar `npm run seed` en VPS con datos reales
5. **USAR FileZilla** para transfers — ves lo que subes
6. **SOLO** `pm2 restart` y `pm2 logs` en terminal VPS

## Despliegue en Producción (VPS)
Ver `WALKTHROUGH.md` para el flujo completo.

### ⚠️ CRÍTICO — No volar datos

| Qué | Hacer | No hacer |
|-----|-------|----------|
| `backend/prisma/misventas.db` | **Excluir siempre** del rsync | Subir tu DB local al VPS |
| `backend/.env` | **Excluir siempre** del rsync | El `.env` del VPS tiene config propia |
| `npm run seed` | Solo en DB nueva/vacía | Ejecutar en DB con datos reales |
| `npx prisma db push` | ✅ Seguro, solo agrega columnas | Nunca borra datos |
| `ALLOWED_ORIGINS` en `.env` | Incluir dominio producción: `https://minegocio.luckyapps.online` | Dejar solo `localhost` |

### Errores comunes y solución

| Error | Causa | Solución |
|-------|-------|----------|
| `CORS not allowed` | `.env` no incluye el dominio | Agregar a `ALLOWED_ORIGINS` |
| `EADDRINUSE` | Puerto ocupado por otra app | Cambiar `PORT` en `.env` |
| `500 Internal Server Error` al login | CORS bloquea la petición | Revisar `ALLOWED_ORIGINS` |
| `Prod: 0` en VPS | La DB local sobrescribió la del VPS | Restaurar backup o subir `.db` correcto |
| Login no válido | DB local reemplazó usuarios del VPS | Usar PIN del seed: `020518` |

### Rutas exactas en VPS
- Frontend estático: `/var/www/ventasee-os/frontend/dist/`
- Backend: `/var/www/ventasee-os/backend/`
- DB: `/var/www/ventasee-os/backend/prisma/misventas.db` (🛑 NO TOCAR)
- `.env`: `/var/www/ventasee-os/backend/.env` (🛑 NO TOCAR)
- PM2 service name: `ventasee-os`
- Puerto backend: `3019`
- URL producción: `https://minegocio.luckyapps.online`

### ⚠️ REGLA DE ORO (Aprendida con sangre)
**Usar FileZilla siempre.** Nada de rsync, scp ni comandos para subir archivos. 
Solo se permite terminal en VPS para: `pm2 restart ventasee-os` y `pm2 logs ventasee-os`.

SQLite no perdona: un archivo mal subido y los datos vuelan. FileZilla muestra exactamente qué estás subiendo y a dónde.

### 🖥️ FileZilla — Opción recomendada (visual)
Conectate con: `root@64.23.176.98` (puerto 22, SFTP).

**Subir solo:**
| Origen local | Destino VPS | Notas |
|-------------|-------------|-------|
| `frontend/dist/` | `/var/www/ventasee-os/frontend/dist/` | Todo el contenido |
| `backend/controllers/` | `/var/www/ventasee-os/backend/controllers/` | 🟢 Seguro |
| `backend/routes/` | `/var/www/ventasee-os/backend/routes/` | 🟢 Seguro |
| `backend/prisma/schema.prisma` | `/var/www/ventasee-os/backend/prisma/schema.prisma` | 🟢 Seguro |
| `backend/prisma/seed.js` | `/var/www/ventasee-os/backend/prisma/seed.js` | 🔴 No ejecutar |
| `backend/server.js` | `/var/www/ventasee-os/backend/server.js` | 🟢 Seguro |

**NO subir al VPS:**
- `backend/.env` ❌ — Cada entorno tiene su configuración
- `backend/prisma/misventas.db` ❌ — Base de datos producción
- `backend/node_modules/` ❌ — Se regenera con `npm install`
- `frontend/src/` ❌ — Se compila a `dist/`

### Comando seguro para subir backend (solo si usas terminal)
```bash
rsync -avz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.env' \
  --exclude='prisma/misventas.db' \
  --exclude='prisma/misventas.db-journal' \
  --exclude='prisma/misventas.db-wal' \
  --exclude='prisma/misventas.db-shm' \
  /ruta/local/Ventas_OS/backend/ \
  root@64.23.176.98:/var/www/ventasee-os/backend/
```

### ⚠️ Regla crítica: BD local vs VPS
- **Nunca** subir `misventas.db` local al VPS. La base de producción tiene datos reales.
- Los cambios de esquema se aplican vía `npx prisma db push` directamente en el VPS.
- Para regenerar datos semilla (permisos, roles, config): `npm run seed` en el VPS.
