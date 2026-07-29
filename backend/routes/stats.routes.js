const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { requirePermission, PERMISSIONS } = require('../utils/permissions');

router.get('/dashboard', authMiddleware, statsController.getDashboardStats);
router.get('/reports', authMiddleware, requirePermission(PERMISSIONS.REPORTS_VIEW), statsController.getReports);
router.get('/sales-by-seller', authMiddleware, requirePermission(PERMISSIONS.REPORTS_VIEW), statsController.getSalesBySeller);

module.exports = router;
