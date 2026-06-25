/**
 * 로컬 MONGO_URI → MONGODB_ATLAS_URL 데이터 복사
 *
 * 실행: node server/scripts/migrateLocalToAtlas.js
 * 미리보기: node server/scripts/migrateLocalToAtlas.js --dry-run
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const dns = require('dns');
const mongoose = require('mongoose');

const DRY_RUN = process.argv.includes('--dry-run');

const configureDnsForAtlas = (uri) => {
  if (!uri?.startsWith('mongodb+srv://')) return;
  const servers = (process.env.MONGO_DNS_SERVERS || '8.8.8.8,8.8.4.4,1.1.1.1')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (servers.length) dns.setServers(servers);
};

async function migrate() {
  const sourceUri = process.env.MONGO_URI;
  const targetUri = process.env.MONGODB_ATLAS_URL;

  if (!sourceUri || !targetUri) {
    console.error('MONGO_URI와 MONGODB_ATLAS_URL이 모두 .env에 설정되어 있어야 합니다.');
    process.exit(1);
  }

  configureDnsForAtlas(targetUri);

  console.log('소스 (로컬):', sourceUri.replace(/\/\/.*@/, '//***@'));
  console.log('대상 (Atlas):', targetUri.replace(/\/\/.*@/, '//***@'));
  if (DRY_RUN) console.log('\n[DRY RUN] 실제 복사는 수행하지 않습니다.\n');

  const sourceConn = await mongoose.createConnection(sourceUri).asPromise();
  const targetConn = await mongoose.createConnection(targetUri).asPromise();

  const sourceDb = sourceConn.db;
  const targetDb = targetConn.db;

  const collections = (await sourceDb.listCollections().toArray())
    .map(({ name }) => name)
    .filter((name) => !name.startsWith('system.'));

  if (collections.length === 0) {
    console.log('복사할 컬렉션이 없습니다.');
    await sourceConn.close();
    await targetConn.close();
    return;
  }

  let totalCopied = 0;

  for (const name of collections) {
    const docs = await sourceDb.collection(name).find({}).toArray();
    const targetBefore = await targetDb.collection(name).countDocuments();

    console.log(`\n[${name}] 로컬 ${docs.length}건 → Atlas (기존 ${targetBefore}건)`);

    if (docs.length === 0) {
      console.log('  건너뜀 (로컬 데이터 없음)');
      continue;
    }

    if (DRY_RUN) continue;

    await targetDb.collection(name).deleteMany({});
    await targetDb.collection(name).insertMany(docs, { ordered: false });

    const targetAfter = await targetDb.collection(name).countDocuments();
    console.log(`  ✓ 복사 완료 (${targetAfter}건)`);
    totalCopied += targetAfter;
  }

  await sourceConn.close();
  await targetConn.close();

  if (DRY_RUN) {
    console.log('\n실제 복사하려면 --dry-run 없이 실행하세요.');
  } else {
    console.log(`\n마이그레이션 완료. 총 ${totalCopied}건 복사됨.`);
  }
}

migrate().catch((err) => {
  console.error('마이그레이션 실패:', err.message);
  process.exit(1);
});
