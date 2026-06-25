const mongoose = require('mongoose');

/* ── 주문 아이템 (주문 시점 가격·정보 스냅샷) ── */
const orderItemSchema = new mongoose.Schema(
  {
    product:       { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productCode:   { type: String, required: true },
    name:          { type: String, required: true },
    category:      { type: String, default: '' },
    imageUrl:      { type: String, default: '' },
    originalPrice: { type: Number, required: true },   // 할인 전 정가 (스냅샷)
    discountRate:  { type: Number, default: 0 },        // 적용 할인율 (스냅샷)
    price:         { type: Number, required: true },    // 실제 결제 단가 (스냅샷)
    quantity:      { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

/* ── 상태 변경 이력 ── */
const statusHistorySchema = new mongoose.Schema(
  {
    status:    { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    memo:      { type: String, default: '' },
  },
  { _id: false }
);

/* ── 배송지 ── */
const shippingAddressSchema = new mongoose.Schema(
  {
    recipient:     { type: String, required: true },
    phone:         { type: String, required: true },
    zipCode:       { type: String, required: true },
    address:       { type: String, required: true },
    detailAddress: { type: String, default: '' },
  },
  { _id: false }
);

/* ── 주문 메인 스키마 ── */
const orderSchema = new mongoose.Schema(
  {
    /* 주문 식별 */
    orderNumber: {
      type: String, required: true, unique: true,
      // 예: ORD-20260624-001
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    /* 상품 목록 */
    items: { type: [orderItemSchema], required: true },

    /* 금액 */
    itemsPrice:     { type: Number, required: true, min: 0 }, // 상품 소계
    shippingFee:    { type: Number, default: 0, min: 0 },     // 배송비
    discountAmount: { type: Number, default: 0, min: 0 },     // 총 할인 금액
    totalPrice:     { type: Number, required: true, min: 0 }, // 최종 결제금액

    /* 주문 상태 */
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    statusHistory: { type: [statusHistorySchema], default: [] },

    /* 배송 */
    shippingAddress: { type: shippingAddressSchema, required: true },
    carrier:         { type: String, default: '' },       // 택배사
    trackingNumber:  { type: String, default: '' },       // 운송장 번호
    shippedAt:       { type: Date },                      // 발송 시각
    deliveredAt:     { type: Date },                      // 배송 완료 시각

    /* 결제 */
    paymentMethod: {
      type: String,
      enum: ['card', 'transfer', 'kakao'],
      default: 'card',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid'],
      default: 'unpaid',
    },
    paidAt:     { type: Date },    // 실제 결제 완료 시각
    paymentKey: { type: String, default: '' }, // PG사 결제 키 (추후 실결제 연동)

    memo: { type: String, default: '' },
  },
  { timestamps: true }
);

/* 인덱스 */
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
