const Product = require('../models/Product');

// ── GET /api/products/generate-code ──────────────────────────────
// 상품 코드 자동 발번 (CARD-20260622-001 형식)
const generateProductCode = async (req, res, next) => {
  try {
    const today = new Date();
    const datePart = today.getFullYear().toString()
      + String(today.getMonth() + 1).padStart(2, '0')
      + String(today.getDate()).padStart(2, '0');

    const prefix = `${datePart}-`;

    // 오늘 날짜로 시작하는 코드 중 일련번호 최댓값 조회
    const last = await Product.findOne(
      { productCode: { $regex: `^${prefix}` } },
      { productCode: 1 },
      { sort: { productCode: -1 } }
    );

    let seq = 1;
    if (last) {
      const lastSeq = parseInt(last.productCode.split('-').pop(), 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    const productCode = `${prefix}${String(seq).padStart(3, '0')}`;

    res.status(200).json({ success: true, data: { productCode } });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/products ─────────────────────────────────────────────
// 상품 목록 조회 (필터링 · 정렬 · 페이지네이션)
const getProducts = async (req, res, next) => {
  try {
    const {
      category,
      subCategory,
      status = 'active',
      search,
      pokemonId,
      minPrice,
      maxPrice,
      sort = '-createdAt',
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (category) filter.category = category.toUpperCase();
    if (subCategory) filter.subCategory = subCategory;
    if (status) filter.status = status;
    if (pokemonId) filter.pokemonIds = Number(pokemonId);

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
    }

    // 텍스트 검색 (name, description, tags 인덱스 활용)
    if (search) {
      filter.$text = { $search: search };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/products/:id ─────────────────────────────────────────
// 단일 상품 조회 (MongoDB _id 또는 productCode 모두 허용)
const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findOne({
      $or: [
        ...(id.match(/^[a-f\d]{24}$/i) ? [{ _id: id }] : []),
        { productCode: id.toUpperCase() },
      ],
    })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!product) {
      res.status(404);
      throw new Error('상품을 찾을 수 없습니다.');
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/products ────────────────────────────────────────────
// 상품 등록 (admin)
const createProduct = async (req, res, next) => {
  try {
    const {
      productCode, name, vendor, costPrice, price,
      category, subCategory, description,
      pokemonIds, images, stock, weight, isFreeShipping,
      status, tags, discount,
    } = req.body;

    // 필수 항목 검증
    const missing = [];
    if (!productCode?.trim()) missing.push('productCode(상품 코드)');
    if (!name?.trim())        missing.push('name(상품명)');
    if (!vendor?.trim())      missing.push('vendor(업체)');
    if (costPrice == null)    missing.push('costPrice(구입가)');
    if (price == null)        missing.push('price(판매가)');
    if (!category)            missing.push('category(카테고리)');
    if (stock == null)        missing.push('stock(재고)');

    if (missing.length > 0) {
      res.status(400);
      throw new Error(`필수 항목이 누락되었습니다: ${missing.join(', ')}`);
    }

    // 상품 코드 중복 확인
    const exists = await Product.findOne({ productCode: productCode.trim().toUpperCase() });
    if (exists) {
      res.status(400);
      throw new Error(`이미 사용 중인 상품 코드입니다: ${productCode.trim().toUpperCase()}`);
    }

    const product = await Product.create({
      productCode: productCode.trim().toUpperCase(),
      name: name.trim(),
      vendor: vendor.trim(),
      costPrice: Number(costPrice),
      price: Number(price),
      category,
      subCategory: subCategory?.trim() ?? '',
      description: description?.trim() ?? '',
      pokemonIds: pokemonIds ?? [],
      images: images ?? [],
      stock: Number(stock),
      weight: weight !== undefined && weight !== '' ? Number(weight) : undefined,
      isFreeShipping: isFreeShipping ?? false,
      status: status ?? 'active',
      tags: tags ?? [],
      discount: discount ?? { rate: 0 },
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    // 등록자 정보 포함해서 반환
    const populated = await product.populate('createdBy', 'name email');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/products/:id ─────────────────────────────────────────
// 상품 수정 (admin)
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404);
      throw new Error('상품을 찾을 수 없습니다.');
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/products/:id ──────────────────────────────────────
// 상품 삭제 (admin) — 실제 삭제 대신 status를 discontinued로 변경
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404);
      throw new Error('상품을 찾을 수 없습니다.');
    }

    await Product.findByIdAndUpdate(req.params.id, {
      status: 'discontinued',
      updatedBy: req.user._id,
    });

    res.status(200).json({ success: true, message: '상품이 삭제(단종 처리)되었습니다.' });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/products/:id/hard ────────────────────────────────
// 상품 완전 삭제 (admin) — DB에서 실제 제거
const hardDeleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      res.status(404);
      throw new Error('상품을 찾을 수 없습니다.');
    }

    res.status(200).json({ success: true, message: '상품이 완전히 삭제되었습니다.' });
  } catch (error) {
    next(error);
  }
};

// ── PATCH /api/products/:id/stock ────────────────────────────────
// 재고 수량 조정 (admin)
const updateStock = async (req, res, next) => {
  try {
    const { quantity, type = 'set' } = req.body;

    if (quantity === undefined || isNaN(quantity)) {
      res.status(400);
      throw new Error('수량(quantity)을 숫자로 입력해주세요.');
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      throw new Error('상품을 찾을 수 없습니다.');
    }

    let newStock;
    if (type === 'increment') newStock = product.stock + Number(quantity);
    else if (type === 'decrement') newStock = product.stock - Number(quantity);
    else newStock = Number(quantity);

    if (newStock < 0) {
      res.status(400);
      throw new Error('재고는 0 미만이 될 수 없습니다.');
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { stock: newStock, updatedBy: req.user._id },
      { new: true }
    );

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateProductCode,
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  hardDeleteProduct,
  updateStock,
};
