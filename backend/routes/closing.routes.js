const express = require('express');
const router = express.Router();
const closingController = require('../controllers/closing.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/', authMiddleware, closingController.getClosings);
router.get('/today-summary', authMiddleware, closingController.getTodaySummary);
router.post('/', authMiddleware, closingController.forceClosing);

module.exports = router;
