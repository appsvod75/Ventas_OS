const express = require('express');
const router = express.Router();
const configController = require('../controllers/config.controller');
const dangerController = require('../controllers/danger.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { requirePermission, PERMISSIONS } = require('../utils/permissions');

router.get('/', configController.getConfig);
router.put('/', authMiddleware, requirePermission(PERMISSIONS.CONFIG_EDIT), configController.updateConfig);

// Danger Zone Routes (super admin only)
router.post('/danger/reset-sales', authMiddleware, requirePermission(PERMISSIONS.ALL), dangerController.resetSales);
router.post('/danger/reset-inventory', authMiddleware, requirePermission(PERMISSIONS.ALL), dangerController.resetInventory);
router.post('/danger/reset-products', authMiddleware, requirePermission(PERMISSIONS.ALL), dangerController.resetProducts);
router.post('/danger/reset-sale-counter', authMiddleware, requirePermission(PERMISSIONS.ALL), dangerController.resetSaleCounter);
router.get('/danger/backup', authMiddleware, requirePermission(PERMISSIONS.ALL), dangerController.backupDatabase);

module.exports = router;
