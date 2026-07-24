#!/bin/bash

# Script de despliegue para LuckyPOS Backend
# Diseñado para entornos VPS con PM2

echo "🚀 Iniciando despliegue de LuckyPOS..."

# 1. Instalar dependencias
echo "📦 Instalando dependencias..."
npm install --production

# 2. Generar cliente Prisma
echo "💎 Generando Cliente Prisma..."
npx prisma generate

# 3. Sincronizar esquema SQLite y sembrar datos iniciales
echo "💾 Sincronizando base de datos SQLite..."
npx prisma db push --accept-data-loss
echo "🌱 Sembrando datos iniciales..."
node prisma/seed.js

# 4. Reiniciar proceso con PM2
if pm2 list | grep -q "variospos-backend"; then
    echo "🔄 Reiniciando proceso existente..."
    pm2 restart variospos-backend
else
    echo "🆕 Iniciando nuevo proceso..."
    pm2 start server.js --name "variospos-backend"
fi

echo "✅ Despliegue completado con éxito."
