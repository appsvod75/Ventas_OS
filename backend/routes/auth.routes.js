const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { requirePermission, PERMISSIONS } = require('../utils/permissions');

router.post('/login', authController.login);
router.post('/verify-pin', authMiddleware, authController.verifyPin);
router.get('/users', authMiddleware, requirePermission(PERMISSIONS.USERS_VIEW), authController.getUsers);
router.post('/users', authMiddleware, requirePermission(PERMISSIONS.USERS_MANAGE), authController.createUser);
router.put('/users/:id', authMiddleware, requirePermission(PERMISSIONS.USERS_MANAGE), authController.updateUser);
router.get('/roles', authMiddleware, requirePermission(PERMISSIONS.ALL), authController.getRoles);
router.get('/permissions', authMiddleware, requirePermission(PERMISSIONS.ALL), authController.getPermissions);
router.put('/roles/:id/permissions', authMiddleware, requirePermission(PERMISSIONS.ALL), authController.updateRolePermissions);

module.exports = router;
