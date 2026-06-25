const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const { getMongoUri } = require('../src/config/db');

const createAdmin = async () => {
  try {
    await mongoose.connect(getMongoUri());
    console.log('MongoDB 연결 성공');

    const existing = await User.findOne({ email: 'admin@mymail.com' });
    if (existing) {
      console.log('⚠ 이미 동일한 이메일의 계정이 존재합니다:', existing.email);
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('000000', salt);

    const admin = await User.create({
      name: '어드민',
      email: 'admin@mymail.com',
      password: hashedPassword,
      role: 'admin',
    });

    console.log('✓ 관리자 계정이 생성되었습니다.');
    console.log(`  이름  : ${admin.name}`);
    console.log(`  이메일: ${admin.email}`);
    console.log(`  역할  : ${admin.role}`);
    console.log(`  ID    : ${admin._id}`);
  } catch (err) {
    console.error('오류 발생:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB 연결 종료');
    process.exit(0);
  }
};

createAdmin();
