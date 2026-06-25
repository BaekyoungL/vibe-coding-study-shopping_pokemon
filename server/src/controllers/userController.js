const bcrypt = require('bcryptjs');
const User = require('../models/User');

// GET /api/users
const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, role } = req.query;
    const filter = {};
    if (role) filter.role = role;
    const q = (search ?? '').trim();
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / limit),
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/:id
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// POST /api/users
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, addresses } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400);
      throw new Error('이미 사용중인 이메일입니다.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      phone,
      addresses,
    });

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/:id
const updateUser = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const isSelf = String(req.user._id) === req.params.id;

    if (!isAdmin && !isSelf) {
      res.status(403);
      throw new Error('접근 권한이 없습니다.');
    }

    const { password, role, ...rest } = req.body;
    const updateData = { ...rest };

    if (role !== undefined) {
      if (!isAdmin) {
        res.status(403);
        throw new Error('역할은 관리자만 변경할 수 있습니다.');
      }
      updateData.role = role;
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!user) {
      res.status(404);
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/users/:id
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// POST /api/users/:id/addresses  (protect 미들웨어 필요)
const addAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    if (req.body.isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    user.addresses.push(req.body);
    await user.save();

    res.status(201).json({ success: true, data: user.addresses });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/:id/addresses/:addressIndex  (protect 미들웨어 필요)
const updateAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    const index = Number(req.params.addressIndex);
    if (index < 0 || index >= user.addresses.length) {
      res.status(404);
      throw new Error('주소를 찾을 수 없습니다.');
    }

    if (req.body.isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    user.addresses[index] = { ...user.addresses[index].toObject(), ...req.body };
    await user.save();

    res.status(200).json({ success: true, data: user.addresses });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/users/:id/addresses/:addressIndex  (protect 미들웨어 필요)
const deleteAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    const index = Number(req.params.addressIndex);
    if (index < 0 || index >= user.addresses.length) {
      res.status(404);
      throw new Error('주소를 찾을 수 없습니다.');
    }

    user.addresses.splice(index, 1);
    await user.save();

    res.status(200).json({ success: true, data: user.addresses });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  addAddress,
  updateAddress,
  deleteAddress,
};
