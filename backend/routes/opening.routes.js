const express = require('express');
const router = express.Router();
const openingController = require('../controllers/opening.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/last', authMiddleware, openingController.getLastOpening);
router.post('/', authMiddleware, openingController.createOpening);
router.get('/check', authMiddleware, openingController.checkOpening);

module.exports = router;
