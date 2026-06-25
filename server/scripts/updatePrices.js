/**
 * 테스트용 가격 초기화 스크립트
 * 모든 상품의 costPrice / price 를 100~200원 사이 10원 단위 랜덤값으로 변경
 *
 * 실행: node server/scripts/updatePrices.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Product = require('../src/models/Product');
const { getMongoUri } = require('../src/config/db');

/** 100~200 사이 10원 단위 랜덤 정수 */
function randPrice() {
  // 10 ~ 20 사이 랜덤 정수 → ×10
  return (Math.floor(Math.random() * 11) + 10) * 10;
}

async function run() {
  await mongoose.connect(getMongoUri());
  console.log('MongoDB 연결 성공');

  const products = await Product.find({});
  console.log(`총 ${products.length}개 상품 업데이트 시작…`);

  let updated = 0;
  for (const p of products) {
    const selling = randPrice();          // 판매가 (100~200)
    const cost    = Math.min(selling, randPrice()); // 구입가 ≤ 판매가

    p.price     = selling;
    p.costPrice = cost;
    await p.save();
    console.log(`  [${p.productCode}] ${p.name}  →  판매가 ${selling}원 / 구입가 ${cost}원`);
    updated++;
  }

  console.log(`\n완료: ${updated}개 상품 가격 업데이트됨`);
  await mongoose.disconnect();
}

run().catch((err) => { console.error(err); process.exit(1); });
