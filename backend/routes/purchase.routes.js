const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchase.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.post('/', purchaseController.createPurchase);
router.get('/', purchaseController.getAllPurchases);
router.get('/payable', purchaseController.getAccountsPayable);
router.post('/:id/pay', purchaseController.payPurchase);
router.post('/:id/mark-paid', purchaseController.markAsPaid);
router.get('/:id', purchaseController.getPurchaseById);

module.exports = router;
