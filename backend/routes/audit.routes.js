const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { requirePermission, PERMISSIONS } = require('../utils/permissions');

router.get('/', authMiddleware, requirePermission(PERMISSIONS.AUDIT_VIEW), auditController.getAllLogs);

module.exports = router;
