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
- Revisar reversión: gasto creado incluye envío, debería ser solo productos (el envío va aparte)
- Refinar lógica de reembolso en anulación

## Última sesión (01 Ago 2026) — Resumen de cambios

### ✅ Implementado
| Feature | Descripción |
|---------|-------------|
| **Fix parpadeo Historial** | Al navegar al Historial de Ventas había un parpadeo tipo reload. Causa: doble fetch al montar (efecto con debounce en `searchTerm` + efecto inmediato en `[page, startDate, endDate]`). El fetch diferido ~500ms volvía a poner `isLoading=true`. Fix: el efecto de búsqueda solo dispara cuando `searchTerm` cambia de verdad (ref `lastSearchRef`), no en el primer render |

### 📦 Archivos nuevos en esta sesión
- `frontend/src/pages/ProductLookupPage.tsx`
- `frontend/src/pages/SellerReport.tsx`
- `frontend/src/pages/Deliveries.tsx`
- `backend/controllers/opening.controller.js`
- `backend/controllers/delivery.controller.js`
- `backend/routes/opening.routes.js`
- `backend/routes/delivery.routes.js`
- `frontend/src/components/ProductLookupModal.tsx`

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
