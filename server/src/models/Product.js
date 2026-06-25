const mongoose = require('mongoose');

// ── 이미지 서브 스키마 ──────────────────────────────
const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    alt: { type: String, default: '' },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

// ── 할인 서브 스키마 ────────────────────────────────
const discountSchema = new mongoose.Schema(
  {
    rate: { type: Number, min: 0, max: 100, default: 0 },   // 할인율 (%)
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { _id: false }
);

// ── 평점 서브 스키마 ────────────────────────────────
const ratingSchema = new mongoose.Schema(
  {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 },
  },
  { _id: false }
);

// ── 상품 메인 스키마 ────────────────────────────────
const productSchema = new mongoose.Schema(
  {
    // ── 식별 ──
    productCode: {
      type: String,
      required: [true, '상품 코드는 필수입니다.'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9\-_]+$/, '상품 코드는 영문 대문자·숫자·하이픈·언더스코어만 사용할 수 있습니다.'],
      comment: '사용자 정의 PK (예: CARD-PIKA-001)',
    },

    // ── 기본 정보 ──
    name: {
      type: String,
      required: [true, '상품명은 필수입니다.'],
      trim: true,
    },
    vendor: {
      type: String,
      required: [true, '업체명은 필수입니다.'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },

    // ── 가격 ──
    costPrice: {
      type: Number,
      required: [true, '구입가는 필수입니다.'],
      min: [0, '구입가는 0 이상이어야 합니다.'],
    },
    price: {
      type: Number,
      required: [true, '판매가는 필수입니다.'],
      min: [0, '판매가는 0 이상이어야 합니다.'],
    },
    discount: {
      type: discountSchema,
      default: () => ({ rate: 0 }),
    },

    // ── 카테고리 ──
    category: {
      type: String,
      required: [true, '카테고리는 필수입니다.'],
      enum: {
        values: ['CARD', 'GOODS', 'GAME', 'FIGURE'],
        message: '카테고리는 CARD · GOODS · GAME · FIGURE 중 하나여야 합니다.',
      },
    },
    subCategory: {
      type: String,
      trim: true,
      default: '',
      comment: '예: 부스터팩, 스타터덱, 포켓몬 피규어 등',
    },

    // ── 포켓몬 연관 ──
    pokemonIds: {
      type: [Number],
      default: [],
      comment: 'PokeAPI 포켓몬 번호 (복수 연관 가능)',
    },

    // ── 이미지 ──
    images: {
      type: [imageSchema],
      default: [],
    },

    // ── 재고 & 판매 ──
    stock: {
      type: Number,
      required: [true, '재고 수량은 필수입니다.'],
      min: [0, '재고는 0 이상이어야 합니다.'],
      default: 0,
    },
    salesCount: {
      type: Number,
      default: 0,
      min: 0,
      comment: '누적 판매 수량',
    },

    // ── 배송 ──
    weight: {
      type: Number,
      min: 0,
      comment: '단위: g',
    },
    isFreeShipping: {
      type: Boolean,
      default: false,
    },

    // ── 평점 ──
    rating: {
      type: ratingSchema,
      default: () => ({ average: 0, count: 0 }),
    },

    // ── 상태 & 태그 ──
    status: {
      type: String,
      enum: ['active', 'inactive', 'discontinued'],
      default: 'active',
      comment: 'active: 판매중 | inactive: 판매중지 | discontinued: 단종',
    },
    tags: {
      type: [String],
      default: [],
      comment: '검색·필터용 태그 (예: ["피카츄", "한정판", "신상품"])',
    },

    // ── 등록자 / 수정자 ──
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,          // createdAt(등록일), updatedAt(수정일) 자동 관리
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── 가상 필드: 할인 적용 판매가 ────────────────────
productSchema.virtual('discountedPrice').get(function () {
  const { rate, startDate, endDate } = this.discount || {};
  const now = new Date();
  const isActive =
    rate > 0 &&
    (!startDate || startDate <= now) &&
    (!endDate || endDate >= now);
  return isActive ? Math.round(this.price * (1 - rate / 100)) : this.price;
});

// ── 가상 필드: 대표 이미지 URL ──────────────────────
productSchema.virtual('primaryImage').get(function () {
  const primary = this.images.find((img) => img.isPrimary);
  return primary ? primary.url : (this.images[0]?.url ?? null);
});

// ── 인덱스 ─────────────────────────────────────────
productSchema.index({ category: 1, status: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });  // 전문 검색
productSchema.index({ pokemonIds: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
