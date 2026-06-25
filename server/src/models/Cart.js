const mongoose = require('mongoose');

/**
 * 장바구니 아이템 스키마
 *  - product    : 상품 참조
 *  - quantity   : 수량 (최소 1)
 *  - selected   : 일괄 주문 선택 여부 (기본값 true)
 *  - addedAt    : 담은 시각
 */
const cartItemSchema = new mongoose.Schema(
  {
    product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    selected: { type: Boolean, default: true },
    addedAt:  { type: Date, default: Date.now },
  },
  { _id: false }
);

/**
 * 장바구니 스키마
 *  - user  : 사용자 참조 (1인 1장바구니 — unique index)
 *  - items : 장바구니 아이템 배열
 */
const cartSchema = new mongoose.Schema(
  {
    user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true }
);

/* 가상 필드 — 선택된 아이템만 추출 */
cartSchema.virtual('selectedItems').get(function () {
  return this.items.filter((i) => i.selected);
});

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;
