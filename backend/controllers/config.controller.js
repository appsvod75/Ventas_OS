const prisma = require('../db');
const { PERMISSIONS, hasPermission } = require('../utils/permissions');

const getConfig = async (req, res) => {
    try {
        let config = await prisma.masterConfig.findFirst();
        if (!config) {
            config = await prisma.masterConfig.create({
                data: { id: 1 }
            });
        }
        // Parse sidebarConfig from string to object for the frontend
        if (config.sidebarConfig && typeof config.sidebarConfig === 'string') {
            try {
                config.sidebarConfig = JSON.parse(config.sidebarConfig);
            } catch (e) {
                config.sidebarConfig = {};
            }
        }
        if (config.labelFields && typeof config.labelFields === 'string') {
            try {
                config.labelFields = JSON.parse(config.labelFields);
            } catch (e) {
                config.labelFields = [];
            }
        }
        // Strip sensitive fields if not authenticated
        if (!req.user) {
            const { geminiApiKey, adminPin, emailWebhookUrl, ...publicConfig } = config;
            return res.json(publicConfig);
        }
        res.json(config);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener configuración' });
    }
};

const updateConfig = async (req, res) => {
    try {
        const isSuperAdmin = await hasPermission(req.user.id, PERMISSIONS.CONFIG_EDIT);
        if (!isSuperAdmin) {
            return res.status(403).json({ message: 'Acceso denegado: No tienes permiso para modificar la configuración.' });
        }

        let { 
            businessName, address, phone, logoUrl, geminiApiKey, 
            ticketHeader, ticketFooter, isAutoClosingEnabled, 
            autoClosingTime, sidebarConfig, adminPin,
            emailWebhookUrl, enableEmailTickets, ticketWidth, enableQrCode,
            labelFields
        } = req.body;

        if (isAutoClosingEnabled === false) {
            autoClosingTime = '';
        }

        // Stringify sidebarConfig for SQLite TEXT storage
        if (sidebarConfig && typeof sidebarConfig === 'object') {
            sidebarConfig = JSON.stringify(sidebarConfig);
        }
        if (labelFields && typeof labelFields === 'object') {
            labelFields = JSON.stringify(labelFields);
        }

        const dataToUpdate = { 
            businessName, address, phone, logoUrl, geminiApiKey, 
            ticketHeader, ticketFooter, autoClosingTime, sidebarConfig,
            adminPin, emailWebhookUrl, enableEmailTickets, ticketWidth, enableQrCode,
            labelFields
        };

        const config = await prisma.masterConfig.upsert({
            where: { id: 1 },
            update: dataToUpdate,
            create: { id: 1, ...dataToUpdate }
        });

        // Parse sidebarConfig back to object for the response
        if (config.sidebarConfig && typeof config.sidebarConfig === 'string') {
            try {
                config.sidebarConfig = JSON.parse(config.sidebarConfig);
            } catch (e) {
                config.sidebarConfig = [];
            }
        }

        // Whenever config is saved, try to reschedule the cron job
        const cronService = require('../services/cron.service');
        if (cronService && cronService.scheduleClosingJob) {
            cronService.scheduleClosingJob();
        }

        res.json(config);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar configuración' });
    }
};

module.exports = { getConfig, updateConfig };
