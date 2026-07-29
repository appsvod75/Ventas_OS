const express = require('express');
const router = express.Router();
const saleController = require('../controllers/sale.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { requirePermission, PERMISSIONS } = require('../utils/permissions');

router.get('/shipments/list', authMiddleware, saleController.getShipments);
router.post('/', authMiddleware, saleController.createSale);
router.get('/receivable', authMiddleware, saleController.getAccountsReceivable);
router.get('/history', authMiddleware, saleController.getSalesHistory);
router.post('/:id/reverse', authMiddleware, requirePermission(PERMISSIONS.ALL), saleController.reverseSale);
router.put('/:id', authMiddleware, requirePermission(PERMISSIONS.SALES_EDIT), saleController.updateSale);
router.patch('/:id/fulfillment', authMiddleware, saleController.updateFulfillmentStatus);
router.patch('/:id/delivery-date', authMiddleware, saleController.updateDeliveryDate);
router.get('/:id', authMiddleware, saleController.getSaleById);
router.post('/:id/pay', authMiddleware, saleController.payAccountReceivable);
router.get('/:id/payments', authMiddleware, saleController.getClientPayments);

module.exports = router;
