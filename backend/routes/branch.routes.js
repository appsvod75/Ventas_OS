const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branch.controller');

router.get('/', branchController.getAllBranches);
router.post('/', branchController.createBranch);
router.put('/:id', branchController.updateBranch);
router.delete('/:id', branchController.deleteBranch);

module.exports = router;
