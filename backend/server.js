require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const { initIO } = require('./services/socketManager');
const { scheduleJobs, runOpeningForDate } = require('./services/cron.service');

const prisma = require('./db');
const app = express();
const server = http.createServer(app);

// Configure CORS origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:4000', 'http://localhost:5173', 'https://minegocio.luckyapps.online'];

// Init Socket.IO via socketManager
initIO(server);

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            return callback(new Error('CORS not allowed'), false);
        }
        return callback(null, true);
    },
    credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', require('./routes/auth.routes.js'));
app.use('/api/products', require('./routes/product.routes.js'));
app.use('/api/inventory', require('./routes/inventory.routes.js'));
app.use('/api/sales', require('./routes/sale.routes.js'));
app.use('/api/branches', require('./routes/branch.routes.js'));
app.use('/api/clients', require('./routes/client.routes.js'));
app.use('/api/providers', require('./routes/provider.routes.js'));
app.use('/api/purchases', require('./routes/purchase.routes.js'));
app.use('/api/audit', require('./routes/audit.routes.js'));
app.use('/api/config', require('./routes/config.routes.js'));
app.use('/api/stats', require('./routes/stats.routes.js'));
app.use('/api/expenses', require('./routes/expense.routes.js'));
app.use('/api/closings', require('./routes/closing.routes.js'));
app.use('/api/openings', require('./routes/opening.routes.js'));
app.use('/api/deliveries', require('./routes/delivery.routes.js'));
app.use('/api/projections', require('./routes/projection.routes.js'));

// Dynamic PWA Manifest
app.get('/api/manifest', async (req, res) => {
    try {
        const config = await prisma.masterConfig.findFirst();
        const name = config?.businessName || 'Mi Negocio';
        const logo = config?.logoUrl || '';
        res.json({
            name,
            short_name: name,
            description: 'Sistema POS',
            start_url: '/',
            display: 'standalone',
            theme_color: '#3b82f6',
            background_color: '#0f172a',
            icons: [
                { src: logo || '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
                { src: logo || '/pwa-512x512.png', sizes: '512x512', type: 'image/png' }
            ]
        });
    } catch { res.json({ name: 'Mi Negocio', short_name: 'Mi Negocio' }); }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

const { seedDefaultClient } = require('./services/dbSeed.service');

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', async () => {
    console.log(`LuckyPOS Backend running on http://0.0.0.0:${PORT}`);
    // Start seeds and jobs
    await seedDefaultClient();
    await scheduleJobs();
    await runOpeningForDate(new Date());
});
