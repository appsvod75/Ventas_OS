const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/delivery.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/', authMiddleware, ctrl.getAll);
router.post('/', authMiddleware, ctrl.create);
router.put('/:id', authMiddleware, ctrl.update);

module.exports = router;
