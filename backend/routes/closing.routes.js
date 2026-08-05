const express = require('express');
const router = express.Router();
const closingController = require('../controllers/closing.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/', authMiddleware, closingController.getClosings);
router.get('/today-summary', authMiddleware, closingController.getTodaySummary);
router.get('/period-summary', authMiddleware, closingController.getPeriodSummary);
router.get('/details', authMiddleware, closingController.getClosingDetails);
router.post('/', authMiddleware, closingController.forceClosing);

module.exports = router;
