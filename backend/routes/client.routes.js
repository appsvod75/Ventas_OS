const express = require('express');
const router = express.Router();
const clientController = require('../controllers/client.controller');
const verifyToken = require('../middleware/auth.middleware');

router.use(verifyToken);

router.get('/', clientController.getClients);
router.post('/', clientController.createClient);
router.put('/:id', clientController.updateClient);
router.delete('/:id', clientController.deleteClient);
router.get('/:id/statement', clientController.getClientStatement);

// Direcciones de cliente (multidirección)
router.get('/:id/addresses', clientController.getClientAddresses);
router.post('/:id/addresses', clientController.createClientAddress);
router.put('/:id/addresses/:addressId', clientController.updateClientAddress);
router.patch('/:id/addresses/:addressId/default', clientController.setDefaultClientAddress);
router.delete('/:id/addresses/:addressId', clientController.deleteClientAddress);

module.exports = router;
