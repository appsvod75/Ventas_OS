# LuckyPOS - Walkthrough

## Flujo de Trabajo

```
[Desarrollo Local] → [Build Frontend] → [Rsync a VPS] → [PM2]
```

### Convenciones
- Solo se suben archivos **fuente**: `.tsx`, `.js`, `.html`, `.css`, `.json`, etc.
- **Nunca** se suben `node_modules/`, `dist/` local, `.db`, ni archivos binarios/grandes.
- **⚠️ CRÍTICO**: Nunca subir `misventas.db` local al VPS. La BD de producción tiene datos reales. Los cambios de esquema se aplican con `npx prisma db push` en el VPS. Para regenerar datos semilla: `npm run seed` en el VPS.
- No se sube nada a GitHub a menos que el usuario lo pida explícitamente.
- Todos los comandos de deploy se ejecutan desde **`~/proyectos/Ventas_OS$`** (raíz del proyecto).

---

## 1. Desarrollo Local

### Backend
```bash
cd backend
npm install
npm run seed            # Poblar DB con datos iniciales (solo si no hay DB)
npm run dev             # Inicia en :3015 con node --watch
```

### Frontend
```bash
cd frontend
npm install
npm run dev             # Inicia en :4000 con proxy a :3015
```

Abrir `http://localhost:4000`. Login con PIN `020518` (Super Admin).

---

## 2. Build de Producción

```bash
cd frontend
npm run build
```

Esto genera:
- `frontend/dist/` - Archivos estáticos (index.html, assets/JS/CSS, PWA assets)
- Actualiza automáticamente `public/version.json` con timestamp

---

## 3. Despliegue a VPS

Todos los comandos se ejecutan desde la **raíz del proyecto** (`~/proyectos/Ventas_OS$`).

### Subir frontend (build + rsync)
```bash
cd frontend && npm run build && rsync -avz dist/ root@64.23.176.98:/var/www/ventasee-os/dist/ && cd ..
```

### Subir backend (solo archivos modificados)
```bash
rsync -avz backend/server.js root@64.23.176.98:/var/www/ventasee-os/backend/
```

### Subir backend completo (sin node_modules)
```bash
rsync -avz --exclude='node_modules' --exclude='.git' backend/ root@64.23.176.98:/var/www/ventasee-os/backend/
```

### Subir todo + reiniciar servicio
```bash
cd frontend && npm run build && rsync -avz dist/ root@64.23.176.98:/var/www/ventasee-os/dist/ && cd .. && rsync -avz backend/server.js root@64.23.176.98:/var/www/ventasee-os/backend/ && ssh root@64.23.176.98 "pm2 restart ventasee-os"
```

### En el VPS (primera vez o cambios en dependencias/DB)
```bash
cd /var/www/ventasee-os/backend

# Instalar dependencias
npm install --production

# Generar Prisma client
npx prisma generate

# Sincronizar DB (si hay cambios en schema)
npx prisma db push

# Solo si es una DB nueva
npm run seed

# Iniciar con PM2
pm2 start server.js --name ventasee-os
pm2 save
```

### Nginx (sitio nuevo)
```nginx
server {
    listen 80;
    server_name minegocio.tudominio.com;

    root /var/www/ventasee-os/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3019;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3019;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Certificado SSL
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d minegocio.tudominio.com
```

---

## 4. URLs en Producción

| Servicio | URL |
|----------|-----|
| Frontend | `https://minegocio.tudominio.com` |
| Backend API | `https://minegocio.tudominio.com/api` |
| Puerto interno | `:3019` |

---

## 5. Funcionalidades Nuevas

### Pago Parcial
En el modal de cobro, seleccionar **PAGO PARCIAL**:
- Ingresar el abono de hoy
- El saldo pendiente se registra como crédito con fecha de vencimiento
- El método de pago se guarda como `EFECTIVO+CREDITO` (o similar)

### Envíos
- En el checkout, si hay costo de envío, aparece selector **Inmediato / Programado**
- Los envíos se gestionan en `/shipments` con estados:
  - **VENDIDO** → **DESPACHADO** → **ENTREGADO**
- Contador de pendientes en el icono del dashboard admin

### Label de Envío
- Botón 🖨️ en cada envío → modal con previsualización
- Campos configurables desde Settings → IA e Impresión → Label de Envío
- Impresión directa (ventana nueva con formato 70mm)

### Seguridad con PIN
- **Configuración**: requiere PIN de Super Admin para acceder
- **Eliminar producto**: requiere PIN (desde tabla o modal de edición)
- **Eliminar cliente**: requiere PIN, solo si no tiene ventas

### Comisión por Producto
- Tipo **Fijo** ($) o **Porcentaje** (%) por unidad
- Configurable en ProductModal, en la misma card de Proveedores
- El valor se guarda en `Product.commissionType` y `Product.commissionValue`

### Vista de Envíos
- 👁️ **Ver detalle** — modal con info del cliente, productos, total (solo lectura)
- 📅 **Fijar Fecha Entrega** — fecha en que el delivery entrega al cliente
- `deliveryDate` guardado en `SaleH`, editable desde la misma vista
- Ordenado por fecha de despacho ascendente (más antiguos primero)

### Auto-Update
- Cada `npm run build` genera versión única (timestamp)
- Al subir `dist/`, los usuarios detectan la nueva versión al recuperar foco
- Precarga assets antes de recargar (sin pantalla blanca)
- Anti-flood 30s entre comprobaciones

### PWA Manifest Dinámico
- El nombre e icono de la app PWA se toman de la configuración del negocio
- Ruta: `GET /api/manifest`

### Danger Zone
- Limpiar Ventas y Finanzas (también reinicia inventario a cero y resetea contador)
- Reiniciar Stock
- Eliminar Productos
- **Reiniciar # de Ventas** (resetea contador autoincrement)

### Diseños / Personalización de Productos
- **Implementado**: Campo `hasCustomization` (boolean) en Product con toggle rosa en el modal
- **Implementado**: Botón de acción rosa (`Palette`) en carrito POS para productos con Diseños
- **Implementado**: Modal "En Construcción" al presionar el botón
- **Pendiente**: Campo `customData` (JSON) en SaleD para posición, talla, imageUrl, notas
- **Pendiente**: Modal con formulario de personalización (esperando formato del admin)
- **Pendiente**: En historial, modal solo lectura con imagen ampliable

---

## 6. Mantenimiento

### Actualizar versión en clientes
El sistema detecta cambios en `/version.json` y fuerza recarga automática.

### Cambios en backend (sin node_modules)
```bash
rsync -avz --exclude='node_modules' backend/ root@64.23.176.98:/var/www/ventasee-os/backend/
ssh root@64.23.176.98 "cd /var/www/ventasee-os/backend && npm install --production && npx prisma generate && pm2 restart ventasee-os"
```

### Cambios solo en frontend
```bash
cd frontend && npm run build && rsync -avz dist/ root@64.23.176.98:/var/www/ventasee-os/dist/
```

### Ver logs
```bash
pm2 logs ventasee-os
```

---

## 7. Base de Datos

### SQLite
La BD es un archivo `misventas.db` en `backend/prisma/`. Respaldo regular copiando el archivo.

### Migraciones
No se usan migraciones tradicionales:
```bash
npx prisma db push --accept-data-loss
```

### Seed
```bash
npm run seed
```
Crea: 38 permisos, 3 roles, superadmin (PIN: `020518`), sucursal por defecto, cliente "Clientes Varios", config maestra.

---

## Fixes Aplicados (25/07/2026)

| Fix | Descripción |
|-----|-------------|
| CORS | Agregado `https://minegocio.luckyapps.online` a orígenes permitidos |
| Puerto | `PORT=3019` en `.env` del VPS (coincide con nginx) |
| PM2 persistente | `pm2 save && pm2 startup` ejecutado |
| PWA Update | Eliminado `initAppVersionSync` que causaba recargas en logout. `registerType: 'prompt'` con notificación única por versión vía localStorage |
| Error Config | `JSON.parse` duplicado en `labelFields` corregido (backend ya lo parsea) |
| DB local | Advertencia: no subir `misventas.db` local al VPS |

---

## 9. Consideraciones Importantes

1. **Siempre hacer build antes de subir** - Verificar que no hay errores de TypeScript
2. **Version.json** - Se regenera en cada build
3. **SQLite** - Un solo archivo (`misventas.db`). Respaldar regularmente
4. **PWA** - Service worker actualiza assets en segundo plano
5. **Carrito POS** - Cada tap crea línea nueva (no incrementa existente)
6. **Gastos CRUD** - Editar y eliminar requiere PIN de admin
7. **Cliente obligatorio** - En checkout, el cliente es requerido (nombre y teléfono)
