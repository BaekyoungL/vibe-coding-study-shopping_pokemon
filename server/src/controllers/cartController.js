const Cart = require('../models/Cart');
const Product = require('../models/Product');

/** 장바구니를 상품 정보 포함해서 반환하는 헬퍼 */
const populateCart = (cart) =>
  cart.populate({
    path: 'items.product',
    select: 'name price images discount stock status category vendor productCode',
  });

// ─────────────────────────────────────────
// GET /api/cart  — 내 장바구니 조회
// ─────────────────────────────────────────
const getMyCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id });

    // 장바구니가 없으면 빈 장바구니 생성
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    // 삭제되거나 비활성화된 상품 자동 정리
    await populateCart(cart);
    const validItems = cart.items.filter(
      (i) => i.product && i.product.status !== 'discontinued'
    );
    if (validItems.length !== cart.items.length) {
      cart.items = validItems;
      await cart.save();
    }

    await populateCart(cart);
    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// POST /api/cart/items  — 상품 추가
// ─────────────────────────────────────────
const addItem = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) { res.status(400); throw new Error('상품 ID가 필요합니다.'); }

    const product = await Product.findById(productId);
    if (!product || product.status === 'discontinued') {
      res.status(404); throw new Error('상품을 찾을 수 없습니다.');
    }
    if (product.stock < 1) { res.status(400); throw new Error('품절된 상품입니다.'); }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });

    const existIdx = cart.items.findIndex(
      (i) => String(i.product) === String(productId)
    );

    if (existIdx >= 0) {
      // 이미 있으면 수량 증가 (재고 초과 방지)
      const newQty = cart.items[existIdx].quantity + Number(quantity);
      cart.items[existIdx].quantity = Math.min(newQty, product.stock);
    } else {
      cart.items.push({
        product: productId,
        quantity: Math.min(Number(quantity), product.stock),
        selected: true,
      });
    }

    await cart.save();
    await populateCart(cart);
    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// PUT /api/cart/items/:productId  — 수량 변경
// ─────────────────────────────────────────
const updateItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const { productId } = req.params;

    if (quantity === undefined) { res.status(400); throw new Error('수량이 필요합니다.'); }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) { res.status(404); throw new Error('장바구니를 찾을 수 없습니다.'); }

    const idx = cart.items.findIndex((i) => String(i.product) === productId);
    if (idx < 0) { res.status(404); throw new Error('장바구니에 해당 상품이 없습니다.'); }

    if (Number(quantity) <= 0) {
      // 수량 0 이하면 제거
      cart.items.splice(idx, 1);
    } else {
      const product = await Product.findById(productId);
      cart.items[idx].quantity = product
        ? Math.min(Number(quantity), product.stock)
        : Number(quantity);
    }

    await cart.save();
    await populateCart(cart);
    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// DELETE /api/cart/items/:productId  — 아이템 삭제
// ─────────────────────────────────────────
const removeItem = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) { res.status(404); throw new Error('장바구니를 찾을 수 없습니다.'); }

    cart.items = cart.items.filter((i) => String(i.product) !== req.params.productId);
    await cart.save();
    await populateCart(cart);
    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// PATCH /api/cart/items/:productId/select  — 선택 토글
// ─────────────────────────────────────────
const toggleSelect = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) { res.status(404); throw new Error('장바구니를 찾을 수 없습니다.'); }

    const item = cart.items.find((i) => String(i.product) === req.params.productId);
    if (!item) { res.status(404); throw new Error('해당 상품이 없습니다.'); }

    item.selected = !item.selected;
    await cart.save();
    await populateCart(cart);
    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// PATCH /api/cart/select-all  — 전체 선택/해제
// ─────────────────────────────────────────
const toggleSelectAll = async (req, res, next) => {
  try {
    const { selected } = req.body; // true | false
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) { res.status(404); throw new Error('장바구니를 찾을 수 없습니다.'); }

    cart.items.forEach((i) => { i.selected = Boolean(selected); });
    await cart.save();
    await populateCart(cart);
    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// DELETE /api/cart  — 장바구니 전체 비우기
// ─────────────────────────────────────────
const clearCart = async (req, res, next) => {
  try {
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
    res.status(200).json({ success: true, data: { items: [] } });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// DELETE /api/cart/selected  — 선택된 아이템만 삭제 (주문 완료 후)
// ─────────────────────────────────────────
const removeSelectedItems = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) { res.status(404); throw new Error('장바구니를 찾을 수 없습니다.'); }

    cart.items = cart.items.filter((i) => !i.selected);
    await cart.save();
    await populateCart(cart);
    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyCart, addItem, updateItem, removeItem,
  toggleSelect, toggleSelectAll, clearCart, removeSelectedItems,
};
