const express = require('express');
const router = express.Router();
const {
  createOrder, getMyOrders, getOrder,
  getAllOrders, getOrderStats, updateOrderStatus, confirmPayment, updateTracking, payOrder,
} = require('../controllers/orderController');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

router.post('/',                             protect, createOrder);            // 주문 생성
router.get('/me',                            protect, getMyOrders);            // 내 주문 목록
router.get('/stats',                         protect, adminOnly, getOrderStats); // 상태별 통계 (admin)
router.get('/:id',                           protect, getOrder);               // 주문 상세
router.get('/',                              protect, adminOnly, getAllOrders); // 전체 주문 (admin)
router.patch('/:id/status',                  protect, adminOnly, updateOrderStatus); // 상태 변경
router.patch('/:id/pay',                     protect, payOrder);                    // 사용자 결제 완료
router.patch('/:id/payment',                 protect, adminOnly, confirmPayment);    // 결제 확인 (admin)
router.patch('/:id/tracking',                protect, adminOnly, updateTracking);    // 운송장 입력

module.exports = router;
