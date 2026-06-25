const dns = require('dns');
const mongoose = require('mongoose');

/** mongodb+srv 연결 시 SRV DNS 조회 — 일부 ISP DNS에서 Node.js가 거절당하는 경우 대비 */
const configureDnsForAtlas = (uri) => {
  if (!uri.startsWith('mongodb+srv://')) return;
  const servers = (process.env.MONGO_DNS_SERVERS || '8.8.8.8,8.8.4.4,1.1.1.1')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (servers.length) dns.setServers(servers);
};

/** MONGODB_ATLAS_URL 우선, 없을 때만 로컬 MONGO_URI 사용 */
const getMongoUri = () => {
  const uri = process.env.MONGODB_ATLAS_URL || process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MongoDB connection string is not set. Set MONGODB_ATLAS_URL or MONGO_URI.');
  }
  return uri;
};

const connectDB = async () => {
  try {
    const uri = getMongoUri();
    configureDnsForAtlas(uri);
    const source = process.env.MONGODB_ATLAS_URL ? 'MONGODB_ATLAS_URL' : 'MONGO_URI (local)';
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected (${source}): ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};
module.exports = connectDB;
module.exports.getMongoUri = getMongoUri;
