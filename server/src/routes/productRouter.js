const express = require('express');
const router = express.Router();
const {
  generateProductCode,
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  hardDeleteProduct,
  updateStock,
} = require('../controllers/productController');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

// 자동 발번 (/:id 보다 먼저 선언)
router.get('/generate-code', protect, adminOnly, generateProductCode);

// 공개 라우트 (로그인 불필요)
router.get('/', getProducts);
router.get('/:id', getProduct);

// 관리자 전용 라우트
router.post('/', protect, adminOnly, createProduct);
router.put('/:id', protect, adminOnly, updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);           // 소프트 삭제 (단종 처리)
router.delete('/:id/hard', protect, adminOnly, hardDeleteProduct);  // 완전 삭제
router.patch('/:id/stock', protect, adminOnly, updateStock);        // 재고 조정

module.exports = router;
