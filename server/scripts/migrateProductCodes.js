/**
 * 상품 코드 마이그레이션 스크립트
 * 구 형식: CARD-20260622-001  →  신 형식: 20260622-001
 *
 * 실행: node server/scripts/migrateProductCodes.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Product = require('../src/models/Product');
const { getMongoUri } = require('../src/config/db');

// 구 형식 판별: 카테고리 접두사가 있는 코드
const OLD_PATTERN = /^[A-Z]+-(\d{8})-(\d+)$/;
// 신 형식 판별: 날짜-일련번호
const NEW_PATTERN = /^\d{8}-\d+$/;

async function migrate() {
  await mongoose.connect(getMongoUri());
  console.log('✅ MongoDB 연결 완료');

  const all = await Product.find({}, { _id: 1, productCode: 1 }).lean();
  console.log(`📦 전체 상품 수: ${all.length}`);

  // 구 형식인 상품만 추출
  const targets = all.filter((p) => OLD_PATTERN.test(p.productCode));
  const alreadyNew = all.filter((p) => NEW_PATTERN.test(p.productCode));

  console.log(`🔄 변환 대상: ${targets.length}개`);
  console.log(`✔  이미 신 형식: ${alreadyNew.length}개`);

  if (targets.length === 0) {
    console.log('변환할 상품이 없습니다.');
    await mongoose.disconnect();
    return;
  }

  // 날짜별로 그룹화
  const byDate = {};
  for (const p of targets) {
    const match = p.productCode.match(OLD_PATTERN);
    const datePart = match[1]; // e.g. 20260622
    if (!byDate[datePart]) byDate[datePart] = [];
    byDate[datePart].push(p);
  }

  // 날짜별로 이미 신 형식으로 등록된 마지막 일련번호 파악
  const startSeqMap = {};
  for (const datePart of Object.keys(byDate)) {
    const existing = await Product.find(
      { productCode: { $regex: `^${datePart}-` } },
      { productCode: 1 }
    ).lean();
    const maxSeq = existing.reduce((max, p) => {
      const seq = parseInt(p.productCode.split('-').pop(), 10);
      return isNaN(seq) ? max : Math.max(max, seq);
    }, 0);
    startSeqMap[datePart] = maxSeq + 1;
  }

  // 변환 실행
  let successCount = 0;
  let errorCount = 0;

  for (const [datePart, products] of Object.entries(byDate)) {
    let seq = startSeqMap[datePart];
    for (const p of products) {
      const newCode = `${datePart}-${String(seq).padStart(3, '0')}`;
      try {
        await Product.updateOne({ _id: p._id }, { productCode: newCode });
        console.log(`  ${p.productCode}  →  ${newCode}`);
        seq++;
        successCount++;
      } catch (err) {
        console.error(`  ❌ 실패 [${p.productCode}]: ${err.message}`);
        errorCount++;
      }
    }
  }

  console.log(`\n✅ 완료 — 성공: ${successCount}개 / 실패: ${errorCount}개`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('마이그레이션 오류:', err);
  process.exit(1);
});
