import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { getProduct, createProduct, updateProduct, generateProductCode } from '../api/productApi'
import PageShell from '../components/PageShell'
import PageHero from '../components/PageHero'
import AdminNav from '../components/AdminNav'
import '../App.css'

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

const CATEGORIES = ['CARD', 'GOODS', 'GAME', 'FIGURE']
const STATUSES = [
  { value: 'active', label: '판매중' },
  { value: 'inactive', label: '판매중지' },
  { value: 'discontinued', label: '단종' },
]

const EMPTY_FORM = {
  productCode: '',
  name: '',
  vendor: '',
  costPrice: '',
  price: '',
  category: 'CARD',
  subCategory: '',
  description: '',
  pokemonIds: '',
  stock: '',
  weight: '',
  isFreeShipping: false,
  status: 'active',
  tags: '',
  discountRate: '',
  discountStart: '',
  discountEnd: '',
  imageUrl: '',
}

function toForm(product) {
  if (!product) return EMPTY_FORM
  return {
    productCode: product.productCode ?? '',
    name: product.name ?? '',
    vendor: product.vendor ?? '',
    costPrice: product.costPrice ?? '',
    price: product.price ?? '',
    category: product.category ?? 'CARD',
    subCategory: product.subCategory ?? '',
    description: product.description ?? '',
    pokemonIds: (product.pokemonIds ?? []).join(', '),
    stock: product.stock ?? '',
    weight: product.weight ?? '',
    isFreeShipping: product.isFreeShipping ?? false,
    status: product.status ?? 'active',
    tags: (product.tags ?? []).join(', '),
    discountRate: product.discount?.rate ?? '',
    discountStart: product.discount?.startDate ? product.discount.startDate.slice(0, 10) : '',
    discountEnd: product.discount?.endDate ? product.discount.endDate.slice(0, 10) : '',
    imageUrl: product.images?.[0]?.url ?? '',
  }
}

function toPayload(form) {
  return {
    productCode: form.productCode.trim().toUpperCase(),
    name: form.name.trim(),
    vendor: form.vendor.trim(),
    costPrice: Number(form.costPrice),
    price: Number(form.price),
    category: form.category,
    subCategory: form.subCategory.trim(),
    description: form.description.trim(),
    pokemonIds: form.pokemonIds
      ? form.pokemonIds.split(',').map((v) => Number(v.trim())).filter(Boolean)
      : [],
    stock: Number(form.stock),
    weight: form.weight !== '' ? Number(form.weight) : undefined,
    isFreeShipping: form.isFreeShipping,
    status: form.status,
    tags: form.tags ? form.tags.split(',').map((v) => v.trim()).filter(Boolean) : [],
    discount: {
      rate: form.discountRate !== '' ? Number(form.discountRate) : 0,
      startDate: form.discountStart || undefined,
      endDate: form.discountEnd || undefined,
    },
    images: form.imageUrl
      ? [{ url: form.imageUrl, alt: form.name, isPrimary: true }]
      : [],
  }
}

function ProductFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const token = localStorage.getItem('token')
  const user = token ? JSON.parse(localStorage.getItem('user') || 'null') : null
  if (!token || !user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />

  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(isEdit)
  const [codeLoading, setCodeLoading] = useState(false)
  const [imgError, setImgError] = useState(false)
  const widgetRef = useRef(null)

  const getOrCreateWidget = () => {
    if (widgetRef.current) return widgetRef.current
    if (!window.cloudinary) return null
    widgetRef.current = window.cloudinary.createUploadWidget(
      {
        cloudName: CLOUD_NAME,
        uploadPreset: UPLOAD_PRESET,
        sources: ['local', 'url', 'camera'],
        multiple: false,
        maxFiles: 1,
        cropping: false,
        folder: 'pokemon-shop/products',
        clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        maxFileSize: 5000000,
        language: 'ko',
        text: {
          ko: {
            or: '또는',
            menu: { files: '내 파일', url: 'URL 입력', camera: '카메라' },
            selection_counter: { image: '이미지 선택됨' },
            actions: { upload: '업로드' },
          },
        },
        styles: {
          palette: {
            window: '#ffffff',
            windowBorder: '#e5e7eb',
            tabIcon: '#cc0000',
            menuIcons: '#374151',
            textDark: '#111827',
            textLight: '#ffffff',
            link: '#cc0000',
            action: '#cc0000',
            inactiveTabIcon: '#6b7280',
            error: '#ef4444',
            inProgress: '#3b82f6',
            complete: '#22c55e',
            sourceBg: '#f9fafb',
          },
        },
      },
      (error, result) => {
        if (!error && result?.event === 'success') {
          setForm((prev) => ({ ...prev, imageUrl: result.info.secure_url }))
          setImgError(false)
        }
      }
    )
    return widgetRef.current
  }

  const handleUploadClick = () => {
    const widget = getOrCreateWidget()
    if (widget) {
      widget.open()
    } else {
      alert('Cloudinary 위젯을 불러오지 못했습니다.\n.env 파일에 VITE_CLOUDINARY_CLOUD_NAME과 VITE_CLOUDINARY_UPLOAD_PRESET을 설정해주세요.')
    }
  }

  useEffect(() => {
    if (!isEdit) return
    setFetchLoading(true)
    getProduct(id)
      .then((data) => setForm(toForm(data.data)))
      .catch(() => navigate('/admin/products'))
      .finally(() => setFetchLoading(false))
  }, [id])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
    if (name === 'imageUrl') setImgError(false)
    if (serverError) setServerError('')
  }

  const handleGenerateCode = async () => {
    try {
      setCodeLoading(true)
      const data = await generateProductCode()
      setForm((prev) => ({ ...prev, productCode: data.data.productCode }))
      if (errors.productCode) setErrors((prev) => ({ ...prev, productCode: '' }))
    } catch (err) {
      setServerError(err.message)
    } finally {
      setCodeLoading(false)
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!form.productCode.trim()) newErrors.productCode = '상품 코드를 입력해주세요.'
    if (!form.name.trim()) newErrors.name = '상품명을 입력해주세요.'
    if (!form.vendor.trim()) newErrors.vendor = '업체명을 입력해주세요.'
    if (form.costPrice === '' || isNaN(form.costPrice)) newErrors.costPrice = '구입가를 숫자로 입력해주세요.'
    if (form.price === '' || isNaN(form.price)) newErrors.price = '판매가를 숫자로 입력해주세요.'
    if (form.stock === '' || isNaN(form.stock)) newErrors.stock = '재고 수량을 숫자로 입력해주세요.'
    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    try {
      setLoading(true)
      const payload = toPayload(form)
      if (isEdit) {
        await updateProduct(id, payload)
      } else {
        await createProduct(payload)
      }
      navigate('/admin/products')
    } catch (err) {
      setServerError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (fetchLoading) {
    return (
      <PageShell className="page-shell--admin">
        <div className="admin-loading">상품 정보를 불러오는 중...</div>
      </PageShell>
    )
  }

  const discountedPrice = form.price !== '' && Number(form.discountRate) > 0
    ? Math.round(Number(form.price) * (1 - Number(form.discountRate) / 100))
    : null

  return (
    <PageShell className="page-shell--admin">
      <AdminNav
        title={`포켓몬 샵 — ${isEdit ? '상품 수정' : '새 상품 등록'}`}
        backLabel="← 상품 목록"
        onBack={() => navigate('/admin/products')}
      />

      <PageHero
        title={isEdit ? '상품 수정' : '새 상품 등록'}
        subtitle="포켓몬 굿즈 정보를 입력해주세요"
      />

      <main className="pfp-main">
        <form onSubmit={handleSubmit} noValidate className="pfp-layout">

          {/* ── 좌측: 폼 ── */}
          <div className="pfp-form-col">

            {/* 기본 정보 */}
            <section className="pfp-section">
              <h3 className="pfp-section-title">기본 정보</h3>
              <div className="pfp-grid-2">
                <div className="field-group">
                  <label>상품 코드 <span className="required">*</span></label>
                  <div className="pm-code-row">
                    <input name="productCode" value={form.productCode} onChange={handleChange}
                      placeholder="CARD-20260622-001"
                      className={errors.productCode ? 'input-error' : ''} />
                    <button type="button" className="pm-auto-code-btn"
                      onClick={handleGenerateCode} disabled={codeLoading}>
                      {codeLoading ? '...' : '자동'}
                    </button>
                  </div>
                  {errors.productCode && <p className="error-msg">{errors.productCode}</p>}
                </div>

                <div className="field-group">
                  <label>상품명 <span className="required">*</span></label>
                  <input name="name" value={form.name} onChange={handleChange}
                    className={errors.name ? 'input-error' : ''} />
                  {errors.name && <p className="error-msg">{errors.name}</p>}
                </div>

                <div className="field-group">
                  <label>업체 <span className="required">*</span></label>
                  <input name="vendor" value={form.vendor} onChange={handleChange}
                    className={errors.vendor ? 'input-error' : ''} />
                  {errors.vendor && <p className="error-msg">{errors.vendor}</p>}
                </div>

                <div className="field-group">
                  <label>카테고리 <span className="required">*</span></label>
                  <select name="category" value={form.category} onChange={handleChange}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div className="field-group">
                  <label>상세 카테고리</label>
                  <input name="subCategory" value={form.subCategory} onChange={handleChange}
                    placeholder="예: 부스터팩" />
                </div>

                <div className="field-group">
                  <label>상태</label>
                  <select name="status" value={form.status} onChange={handleChange}>
                    {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="field-group">
                <label>설명</label>
                <textarea name="description" value={form.description} onChange={handleChange}
                  rows={3} placeholder="상품 상세 설명을 입력하세요." />
              </div>
            </section>

            {/* 가격 */}
            <section className="pfp-section">
              <h3 className="pfp-section-title">가격</h3>
              <div className="pfp-grid-2">
                <div className="field-group">
                  <label>구입가 (원) <span className="required">*</span></label>
                  <input name="costPrice" type="number" min="0" value={form.costPrice}
                    onChange={handleChange} className={errors.costPrice ? 'input-error' : ''} />
                  {errors.costPrice && <p className="error-msg">{errors.costPrice}</p>}
                </div>

                <div className="field-group">
                  <label>판매가 (원) <span className="required">*</span></label>
                  <input name="price" type="number" min="0" value={form.price}
                    onChange={handleChange} className={errors.price ? 'input-error' : ''} />
                  {errors.price && <p className="error-msg">{errors.price}</p>}
                </div>

                <div className="field-group">
                  <label>할인율 (%)</label>
                  <input name="discountRate" type="number" min="0" max="100"
                    value={form.discountRate} onChange={handleChange} placeholder="0" />
                </div>

                <div className="field-group">
                  <label>&nbsp;</label>
                  {discountedPrice !== null && (
                    <p className="pm-calc-price">
                      할인 적용가: <strong>{discountedPrice.toLocaleString()}원</strong>
                    </p>
                  )}
                </div>

                <div className="field-group">
                  <label>할인 시작일</label>
                  <input name="discountStart" type="date" value={form.discountStart} onChange={handleChange} />
                </div>

                <div className="field-group">
                  <label>할인 종료일</label>
                  <input name="discountEnd" type="date" value={form.discountEnd} onChange={handleChange} />
                </div>
              </div>
            </section>

            {/* 재고 & 배송 */}
            <section className="pfp-section">
              <h3 className="pfp-section-title">재고 · 배송</h3>
              <div className="pfp-grid-2">
                <div className="field-group">
                  <label>재고 수량 <span className="required">*</span></label>
                  <input name="stock" type="number" min="0" value={form.stock}
                    onChange={handleChange} className={errors.stock ? 'input-error' : ''} />
                  {errors.stock && <p className="error-msg">{errors.stock}</p>}
                </div>

                <div className="field-group">
                  <label>무게 (g)</label>
                  <input name="weight" type="number" min="0" value={form.weight}
                    onChange={handleChange} placeholder="예: 150" />
                </div>
              </div>
              <label className="pm-checkbox-row">
                <input name="isFreeShipping" type="checkbox" checked={form.isFreeShipping}
                  onChange={handleChange} />
                무료 배송
              </label>
            </section>

            {/* 포켓몬 & 태그 */}
            <section className="pfp-section">
              <h3 className="pfp-section-title">포켓몬 · 태그</h3>
              <div className="field-group">
                <label>포켓몬 ID <span className="optional">(쉼표 구분, 예: 25, 1, 4)</span></label>
                <input name="pokemonIds" value={form.pokemonIds} onChange={handleChange}
                  placeholder="25, 1, 4" />
              </div>
              <div className="field-group">
                <label>태그 <span className="optional">(쉼표 구분, 예: 피카츄, 한정판)</span></label>
                <input name="tags" value={form.tags} onChange={handleChange}
                  placeholder="피카츄, 한정판" />
              </div>
            </section>

            {/* 이미지 */}
            <section className="pfp-section">
              <h3 className="pfp-section-title">대표 이미지</h3>
              <div className="pfp-image-upload-area">
                <button type="button" className="pfp-upload-btn" onClick={handleUploadClick}>
                  ☁ Cloudinary로 이미지 업로드
                </button>
                {!CLOUD_NAME && (
                  <p className="pfp-env-warning">
                    ⚠ .env에 VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET을 설정하면 업로드 기능을 사용할 수 있습니다.
                  </p>
                )}
              </div>
              <div className="field-group">
                <label>이미지 URL <span className="optional">(직접 입력도 가능)</span></label>
                <input name="imageUrl" value={form.imageUrl} onChange={handleChange}
                  placeholder="https://res.cloudinary.com/..." />
              </div>
            </section>

          </div>

          {/* ── 우측: 이미지 프리뷰 + 저장 버튼 ── */}
          <div className="pfp-side-col">

            {/* 이미지 프리뷰 */}
            <div className="pfp-preview-box">
              {form.imageUrl && !imgError ? (
                <img src={form.imageUrl} alt="미리보기"
                  className="pfp-preview-img"
                  onError={() => setImgError(true)} />
              ) : (
                <div className="pfp-preview-placeholder">
                  <span className="pm-preview-icon">🖼️</span>
                  <p>이미지 URL을 입력하면<br />미리보기가 표시됩니다</p>
                </div>
              )}
            </div>

            {/* 서버 에러 */}
            {serverError && (
              <div className="server-error-box" style={{ marginTop: 0 }}>
                <span className="server-error-icon">⚠</span>{serverError}
              </div>
            )}

            {/* 저장 버튼 */}
            <div className="pfp-btn-group">
              <button type="button" className="modal-cancel-btn pfp-cancel-btn"
                onClick={() => navigate('/admin/products')}>
                취소
              </button>
              <button type="submit" className="modal-save-btn pfp-save-btn" disabled={loading}>
                {loading
                  ? <span className="btn-loading"><span className="spinner" />{isEdit ? '저장 중...' : '등록 중...'}</span>
                  : isEdit ? '수정 저장하기' : '상품 등록하기'}
              </button>
            </div>
          </div>

        </form>
      </main>
    </PageShell>
  )
}

export default ProductFormPage
