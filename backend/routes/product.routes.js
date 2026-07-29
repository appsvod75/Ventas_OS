const express = require('express');
const router = express.Router();
const { getAllCategories, createCategory, updateCategory, deleteCategory, restoreCategory, getAllProducts, getProductById, createProduct, updateProduct, deleteProduct, restoreProduct, deleteProductPermanent } = require('../controllers/product.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { requirePermission, PERMISSIONS } = require('../utils/permissions');

router.get('/categories', authMiddleware, getAllCategories);
router.post('/categories', authMiddleware, requirePermission(PERMISSIONS.CATEGORIES_MANAGE), createCategory);
router.put('/categories/:id', authMiddleware, requirePermission(PERMISSIONS.CATEGORIES_MANAGE), updateCategory);
router.delete('/categories/:id', authMiddleware, requirePermission(PERMISSIONS.CATEGORIES_MANAGE), deleteCategory);
router.patch('/categories/:id/restore', authMiddleware, requirePermission(PERMISSIONS.CATEGORIES_MANAGE), restoreCategory);

router.get('/', authMiddleware, getAllProducts);
router.get('/search', authMiddleware, require('../controllers/product.controller').searchProducts);
router.get('/:id', authMiddleware, getProductById);
router.post('/', authMiddleware, requirePermission(PERMISSIONS.PRODUCTS_CREATE), createProduct);
router.put('/:id', authMiddleware, requirePermission(PERMISSIONS.PRODUCTS_EDIT), updateProduct);
router.delete('/:id', authMiddleware, requirePermission(PERMISSIONS.PRODUCTS_DELETE), deleteProduct);
router.delete('/:id/permanent', authMiddleware, requirePermission(PERMISSIONS.PRODUCTS_DELETE), deleteProductPermanent);
router.put('/:id/restore', authMiddleware, requirePermission(PERMISSIONS.PRODUCTS_EDIT), restoreProduct);

module.exports = router;
