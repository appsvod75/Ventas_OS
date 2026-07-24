const express = require('express');
const router = express.Router();
const providerController = require('../controllers/provider.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { requirePermission, PERMISSIONS } = require('../utils/permissions');

router.use(authMiddleware);

router.get('/', providerController.getAllProviders);
router.get('/:id', providerController.getProviderById);
router.post('/', requirePermission(PERMISSIONS.PROVIDERS_MANAGE), providerController.createProvider);
router.put('/:id', requirePermission(PERMISSIONS.PROVIDERS_MANAGE), providerController.updateProvider);
router.delete('/:id', requirePermission(PERMISSIONS.PROVIDERS_MANAGE), providerController.deleteProvider);

module.exports = router;
