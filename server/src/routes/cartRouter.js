const express = require('express');
const router = express.Router();
const {
  getMyCart, addItem, updateItem, removeItem,
  toggleSelect, toggleSelectAll, clearCart, removeSelectedItems,
} = require('../controllers/cartController');
const { protect } = require('../middlewares/authMiddleware');

// 모든 장바구니 API는 로그인 필수
router.use(protect);

router.get('/',                                  getMyCart);           // 장바구니 조회
router.post('/items',                            addItem);             // 상품 추가
router.put('/items/:productId',                  updateItem);          // 수량 변경
router.delete('/items/:productId',               removeItem);          // 아이템 삭제
router.patch('/items/:productId/select',         toggleSelect);        // 선택 토글
router.patch('/select-all',                      toggleSelectAll);     // 전체 선택/해제
router.delete('/selected',                       removeSelectedItems); // 선택 항목 삭제
router.delete('/',                               clearCart);           // 전체 비우기

module.exports = router;
