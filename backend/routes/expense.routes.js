const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { requirePermission, PERMISSIONS } = require('../utils/permissions');

router.post('/', authMiddleware, expenseController.registerExpense);
router.get('/daily', authMiddleware, expenseController.getDailyExpenses);
router.put('/:id', authMiddleware, requirePermission(PERMISSIONS.EXPENSES_DELETE), expenseController.updateExpense);
router.delete('/:id', authMiddleware, requirePermission(PERMISSIONS.EXPENSES_DELETE), expenseController.deleteExpense);

module.exports = router;
