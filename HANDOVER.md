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

## Diseños / Personalización de Productos (Stamping)

### Estado Actual (Implementado)
- `hasCustomization` (boolean) agregado a `Product` en Prisma, backend y frontend
- Toggle "Diseños" en el modal de creación/edición de producto (estilo rosa cuando activo)
- Columna "Diseños" en la tabla de productos (Sí/No)
- En el carrito POS: botón rosa (`Palette`) junto al de eliminar para productos con `hasCustomization=true`
- Modal "En Construcción" al presionar el botón (pendiente de formato del admin)

### Pendiente
- Agregar campo `customData` (JSON) a SaleD para guardar: posición, talla, imageUrl, notas
- Modal con formulario de personalización (formato a definir por el admin)
- En Historial → Ver Detalle, mostrar modal en solo lectura con imagen ampliable

## Despliegue en Producción (VPS)
Ver `WALKTHROUGH.md` para el flujo completo.
