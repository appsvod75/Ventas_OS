const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const auth = require('../middleware/auth.middleware');
const { requirePermission, PERMISSIONS } = require('../utils/permissions');

router.get('/reports/low-stock', auth, inventoryController.getLowStockReport);
router.get('/transfers', auth, inventoryController.getAllTransfers);
router.get('/:branch_id', auth, inventoryController.getInventoryByBranch);
router.get('/product/:productId/kardex/:branchId', auth, inventoryController.getProductKardex);
router.put('/:branchId/:productId', auth, requirePermission(PERMISSIONS.INVENTORY_EDIT), inventoryController.updateInventory);
router.get('/transfers/:id', auth, inventoryController.getTransferById);
router.post('/transfer', auth, requirePermission(PERMISSIONS.INVENTORY_EDIT), inventoryController.createTransfer);
router.post('/transfer/:id/confirm', auth, requirePermission(PERMISSIONS.INVENTORY_EDIT), inventoryController.confirmTransfer);

module.exports = router;
