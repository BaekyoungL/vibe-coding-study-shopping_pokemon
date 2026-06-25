const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

/* ── 주문번호 생성 (ORD-YYYYMMDD-SEQ) ── */
const generateOrderNumber = async () => {
  const today = new Date();
  const datePart = today.getFullYear().toString()
    + String(today.getMonth() + 1).padStart(2, '0')
    + String(today.getDate()).padStart(2, '0');

  const prefix = `ORD-${datePart}-`;
  const last = await Order.findOne(
    { orderNumber: { $regex: `^${prefix}` } },
    { orderNumber: 1 },
    { sort: { orderNumber: -1 } }
  );

  let seq = 1;
  if (last) {
    const lastSeq = parseInt(last.orderNumber.split('-').pop(), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }
  return `${prefix}${String(seq).padStart(3, '0')}`;
};

/* ── POST /api/orders — 주문 생성 ── */
const createOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, paymentMethod, memo } = req.body;

    if (!items || items.length === 0) {
      res.status(400); throw new Error('주문 상품이 없습니다.');
    }
    if (!shippingAddress?.recipient || !shippingAddress?.phone ||
        !shippingAddress?.zipCode   || !shippingAddress?.address) {
      res.status(400); throw new Error('배송지 정보를 모두 입력해주세요.');
    }

    /* ── 상품 유효성 확인 + 가격 서버측 확정 ── */
    const orderItems = [];
    let itemsPrice = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product || product.status !== 'active') {
        res.status(400); throw new Error(`상품을 찾을 수 없습니다: ${item.name ?? item.product}`);
      }
      if (product.stock < item.quantity) {
        res.status(400);
        throw new Error(`재고가 부족합니다: ${product.name} (재고 ${product.stock}개)`);
      }

      const { rate = 0, startDate, endDate } = product.discount ?? {};
      const now = new Date();
      const isDiscount = rate > 0
        && (!startDate || startDate <= now)
        && (!endDate   || endDate >= now);
      const unitPrice = isDiscount
        ? Math.round(product.price * (1 - rate / 100))
        : product.price;

      orderItems.push({
        product:       product._id,
        productCode:   product.productCode,
        name:          product.name,
        category:      product.category ?? '',
        imageUrl:      product.images?.[0]?.url ?? '',
        originalPrice: product.price,
        discountRate:  isDiscount ? rate : 0,
        price:         unitPrice,
        quantity:      item.quantity,
      });

      itemsPrice += unitPrice * item.quantity;
    }

    /* ── 배송비 계산 (3만원 이상 무료) ── */
    const shippingFee    = itemsPrice >= 30000 ? 0 : 3000;
    const discountAmount = orderItems.reduce(
      (s, i) => s + (i.originalPrice - i.price) * i.quantity, 0
    );
    const totalPrice = itemsPrice + shippingFee;

    const orderNumber = await generateOrderNumber();

    const order = await Order.create({
      orderNumber,
      user: req.user._id,
      items: orderItems,
      itemsPrice,
      shippingFee,
      discountAmount,
      totalPrice,
      shippingAddress,
      paymentMethod: paymentMethod ?? 'card',
      paymentStatus: 'unpaid',
      memo: memo ?? '',
      statusHistory: [{ status: 'pending', memo: '주문 접수' }],
    });

    /* ── 재고 차감 ── */
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity, salesCount: item.quantity },
      });
    }

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

/* ── GET /api/orders/me — 내 주문 목록 ── */
const getMyOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const filter = { user: req.user._id };
    if (status) filter.status = status;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Order.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, total, data: orders });
  } catch (error) {
    next(error);
  }
};

/* ── GET /api/orders/:id — 주문 상세 ── */
const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) { res.status(404); throw new Error('주문을 찾을 수 없습니다.'); }

    if (String(order.user) !== String(req.user._id) && req.user.role !== 'admin') {
      res.status(403); throw new Error('접근 권한이 없습니다.');
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

/* ── GET /api/orders/stats — 주문 상태별 통계 (admin) ── */
const getOrderStats = async (req, res, next) => {
  try {
    const counts = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const stats = { pending: 0, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0, total: 0 };
    for (const { _id, count } of counts) {
      if (Object.prototype.hasOwnProperty.call(stats, _id)) stats[_id] = count;
      stats.total += count;
    }
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

/* ── GET /api/orders — 전체 주문 목록 (admin) ── */
const getAllOrders = async (req, res, next) => {
  try {
    const { status, paymentStatus, page = 1, limit = 20, searchType, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    const q = (search ?? '').trim();
    if (q) {
      if (searchType === 'orderNumber') {
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.orderNumber = { $regex: escaped, $options: 'i' };
      } else {
        const users = await User.find({
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } },
          ],
        }).select('_id');
        const userIds = users.map((u) => u._id);
        if (userIds.length === 0) {
          return res.status(200).json({ success: true, total: 0, data: [] });
        }
        filter.user = { $in: userIds };
      }
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Order.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, total, data: orders });
  } catch (error) {
    next(error);
  }
};

/* ── PATCH /api/orders/:id/status — 주문 상태 변경 (admin) ── */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, memo = '' } = req.body;
    const VALID = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!VALID.includes(status)) {
      res.status(400); throw new Error('유효하지 않은 주문 상태입니다.');
    }

    const order = await Order.findById(req.params.id);
    if (!order) { res.status(404); throw new Error('주문을 찾을 수 없습니다.'); }

    if (order.status === 'cancelled') {
      res.status(400); throw new Error('취소된 주문은 변경할 수 없습니다.');
    }
    if (status === 'cancelled' && ['shipped', 'delivered'].includes(order.status)) {
      res.status(400); throw new Error('배송 중이거나 완료된 주문은 취소할 수 없습니다.');
    }

    const prevStatus = order.status;
    order.status = status;
    order.statusHistory.push({ status, memo: memo || undefined });

    if (status === 'shipped'   && !order.shippedAt)   order.shippedAt   = new Date();
    if (status === 'delivered' && !order.deliveredAt) order.deliveredAt = new Date();

    if (status === 'cancelled' && prevStatus !== 'cancelled') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity, salesCount: -item.quantity },
        });
      }
    }

    await order.save();
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

/* ── PATCH /api/orders/:id/payment — 결제 완료 처리 (admin) ── */
const confirmPayment = async (req, res, next) => {
  try {
    const { paymentKey = '' } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) { res.status(404); throw new Error('주문을 찾을 수 없습니다.'); }

    order.paymentStatus = 'paid';
    order.paidAt        = new Date();
    order.paymentKey    = paymentKey;

    // 결제 완료 시 주문 상태도 confirmed 로 자동 전환
    if (order.status === 'pending') {
      order.status = 'confirmed';
      order.statusHistory.push({ status: 'confirmed', memo: '결제 확인' });
    }

    await order.save();
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

/* ── PATCH /api/orders/:id/tracking — 운송장 입력 (admin) ── */
const updateTracking = async (req, res, next) => {
  try {
    const { carrier, trackingNumber } = req.body;
    if (!trackingNumber) { res.status(400); throw new Error('운송장 번호가 필요합니다.'); }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        carrier, trackingNumber,
        status: 'shipped', shippedAt: new Date(),
        $push: { statusHistory: { status: 'shipped', memo: `${carrier} ${trackingNumber}` } },
      },
      { new: true }
    );
    if (!order) { res.status(404); throw new Error('주문을 찾을 수 없습니다.'); }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

/* ── PATCH /api/orders/:id/pay — 사용자 본인 결제 완료 처리 ── */
const payOrder = async (req, res, next) => {
  try {
    const { imp_uid, merchant_uid } = req.body;
    if (!imp_uid) { res.status(400); throw new Error('imp_uid가 필요합니다.'); }

    const order = await Order.findById(req.params.id);
    if (!order) { res.status(404); throw new Error('주문을 찾을 수 없습니다.'); }

    // 본인 주문인지 확인
    if (String(order.user) !== String(req.user._id)) {
      res.status(403); throw new Error('본인 주문이 아닙니다.');
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: '이미 결제된 주문입니다.' });
    }

    order.paymentStatus = 'paid';
    order.paidAt        = new Date();
    order.paymentKey    = imp_uid;  // 포트원 고유 결제 번호 저장

    if (order.status === 'pending') {
      order.status = 'confirmed';
      order.statusHistory.push({ status: 'confirmed', memo: '포트원 결제 완료' });
    }

    await order.save();
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder, getMyOrders, getOrder,
  getAllOrders, getOrderStats, updateOrderStatus, confirmPayment, updateTracking, payOrder,
};
