const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  addAddress,
  updateAddress,
  deleteAddress,
} = require('../controllers/userController');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

router.route('/').get(protect, adminOnly, getUsers).post(protect, adminOnly, createUser);
router.route('/:id').get(protect, getUser).put(protect, updateUser).delete(protect, adminOnly, deleteUser);

router.route('/:id/addresses').post(protect, addAddress);
router.route('/:id/addresses/:addressIndex').put(protect, updateAddress).delete(protect, deleteAddress);

module.exports = router;
