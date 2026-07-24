const express = require('express');
const router = express.Router();
const projectionController = require('../controllers/projection.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/projection', authMiddleware, projectionController.getProjections);
router.get('/goals', authMiddleware, projectionController.getGoals);
router.post('/goals', authMiddleware, projectionController.saveGoal);

module.exports = router;
