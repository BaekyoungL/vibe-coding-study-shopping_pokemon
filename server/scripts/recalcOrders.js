/**
 * 주문 금액 재계산 스크립트
 * - 각 주문의 아이템 가격(price, originalPrice)을 현재 상품 가격으로 교체
 * - itemsPrice / shippingFee / totalPrice 재계산
 *
 * 실행: node server/scripts/recalcOrders.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Order   = require('../src/models/Order');
const Product = require('../src/models/Product');
const { getMongoUri } = require('../src/config/db');

const FREE_SHIPPING_THRESHOLD = 30000;
const SHIPPING_FEE = 3000;

async function run() {
  await mongoose.connect(getMongoUri());
  console.log('MongoDB 연결 성공');

  /* 상품 가격 맵 구성 */
  const products = await Product.find({});
  const priceMap = {};
  for (const p of products) {
    priceMap[p._id.toString()] = {
      originalPrice: p.price,
      discountRate:  p.discount?.rate ?? 0,
      price: p.discount?.rate > 0
        ? Math.round(p.price * (1 - p.discount.rate / 100))
        : p.price,
      name:     p.name,
      category: p.category,
      imageUrl: p.images?.[0]?.url ?? '',
      productCode: p.productCode,
    };
  }

  const orders = await Order.find({});
  console.log(`총 ${orders.length}개 주문 재계산 시작…\n`);

  let updated = 0;
  for (const order of orders) {
    let itemsPrice = 0;

    for (const item of order.items) {
      const pid = item.product?.toString();
      const info = priceMap[pid];
      if (!info) {
        console.warn(`  ⚠ 상품 없음: ${pid} (주문 ${order.orderNumber})`);
        continue;
      }
      item.originalPrice = info.originalPrice;
      item.discountRate  = info.discountRate;
      item.price         = info.price;
      item.name          = info.name;
      item.category      = info.category;
      item.imageUrl      = info.imageUrl;
      item.productCode   = info.productCode;
      itemsPrice += info.price * item.quantity;
    }

    const shippingFee = itemsPrice >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const totalPrice  = itemsPrice + shippingFee - (order.discountAmount ?? 0);

    order.itemsPrice  = itemsPrice;
    order.shippingFee = shippingFee;
    order.totalPrice  = totalPrice;

    await order.save();
    console.log(
      `  [${order.orderNumber}]  상품금액 ${itemsPrice.toLocaleString()}원` +
      ` + 배송비 ${shippingFee.toLocaleString()}원` +
      ` = 최종 ${totalPrice.toLocaleString()}원`
    );
    updated++;
  }

  console.log(`\n완료: ${updated}개 주문 금액 재계산됨`);
  await mongoose.disconnect();
}

run().catch((err) => { console.error(err); process.exit(1); });
