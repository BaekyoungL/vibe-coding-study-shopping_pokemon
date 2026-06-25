import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteProduct } from '../api/productApi'

const STATUS_LABEL = { active: '판매중', inactive: '판매중지', discontinued: '단종' }
const STATUS_COLOR = { active: '#22c55e', inactive: '#eab308', discontinued: '#ef4444' }
const CATEGORY_COLOR = { CARD: '#f59e0b', GOODS: '#ef4444', GAME: '#3b82f6', FIGURE: '#22c55e' }

function Row({ label, value }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="pm-detail-row">
      <span className="pm-detail-label">{label}</span>
      <span className="pm-detail-value">{value}</span>
    </div>
  )
}

function ProductModal({ product, onClose, onDeleted }) {
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  const handleDelete = async () => {
    try {
      setLoading(true)
      await deleteProduct(product._id)
      onDeleted(product._id)
      onClose()
    } catch (err) {
      setServerError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const imageUrl = product.images?.[0]?.url
  const discountRate = product.discount?.rate
  const discountedPrice = discountRate > 0
    ? Math.round(product.price * (1 - discountRate / 100))
    : null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="product-modal-card" onClick={(e) => e.stopPropagation()}>

        {/* 헤더 */}
        <div className="pm-modal-header">
          <div>
            <p className="pm-modal-header-sub">상품 상세</p>
            <h2 className="pm-modal-header-title">{product.name}</h2>
          </div>
          <button className="pm-modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="product-modal-body">

          {/* 우측: 이미지 */}
          <div className="pm-preview-panel">
            {imageUrl ? (
              <img src={imageUrl} alt={product.name} className="pm-preview-img"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
            ) : null}
            <div className="pm-preview-placeholder" style={{ display: imageUrl ? 'none' : 'flex' }}>
              <span className="pm-preview-icon">🖼️</span>
              <p>이미지 없음</p>
            </div>

            {/* 카테고리 뱃지 */}
            <span className="pm-category-badge"
              style={{ background: (CATEGORY_COLOR[product.category] ?? '#888') + '22', color: CATEGORY_COLOR[product.category] ?? '#888' }}>
              {product.category}
            </span>

            {/* 상태 뱃지 */}
            <span style={{ fontSize: '13px', fontWeight: 600, color: STATUS_COLOR[product.status] }}>
              {STATUS_LABEL[product.status]}
            </span>
          </div>

          {/* 좌측: 상세 정보 */}
          <div className="pm-form-col">

            {/* 액션 버튼 */}
            <div className="product-modal-actions">
              <button className="pm-edit-btn"
                onClick={() => { onClose(); navigate(`/admin/products/${product._id}/edit`) }}>
                수정
              </button>
              <button className="pm-delete-btn" onClick={() => setConfirmDelete(true)}>삭제</button>
            </div>

            {/* 삭제 확인 */}
            {confirmDelete && (
              <div className="pm-confirm-box">
                <p>정말 이 상품을 삭제(단종 처리)하시겠습니까?</p>
                <div className="pm-confirm-btns">
                  <button onClick={() => setConfirmDelete(false)} disabled={loading}>취소</button>
                  <button className="pm-delete-btn" onClick={handleDelete} disabled={loading}>
                    {loading ? '삭제 중...' : '삭제 확인'}
                  </button>
                </div>
              </div>
            )}

            {serverError && (
              <div className="server-error-box">
                <span className="server-error-icon">⚠</span>{serverError}
              </div>
            )}

            <div className="pm-detail-sections">

              <div className="pm-section">
                <h3 className="pm-section-title">기본 정보</h3>
                <Row label="상품 코드" value={product.productCode} />
                <Row label="상품명" value={product.name} />
                <Row label="업체" value={product.vendor} />
                <Row label="카테고리" value={product.category} />
                <Row label="상세 카테고리" value={product.subCategory} />
                <Row label="설명" value={product.description} />
              </div>

              <div className="pm-section">
                <h3 className="pm-section-title">가격</h3>
                <Row label="구입가" value={`${product.costPrice?.toLocaleString()}원`} />
                <Row label="판매가" value={`${product.price?.toLocaleString()}원`} />
                {discountRate > 0 && <>
                  <Row label="할인율" value={`${discountRate}%`} />
                  <Row label="할인 적용가" value={`${discountedPrice?.toLocaleString()}원`} />
                </>}
              </div>

              <div className="pm-section">
                <h3 className="pm-section-title">재고 · 배송</h3>
                <Row label="재고" value={`${product.stock}개`} />
                {product.weight && <Row label="무게" value={`${product.weight}g`} />}
                <Row label="무료 배송" value={product.isFreeShipping ? '✓ 무료 배송' : '-'} />
              </div>

              {(product.pokemonIds?.length > 0 || product.tags?.length > 0) && (
                <div className="pm-section">
                  <h3 className="pm-section-title">포켓몬 · 태그</h3>
                  {product.pokemonIds?.length > 0 && (
                    <Row label="포켓몬 ID" value={product.pokemonIds.join(', ')} />
                  )}
                  {product.tags?.length > 0 && (
                    <Row label="태그" value={product.tags.join(', ')} />
                  )}
                </div>
              )}

              <div className="pm-section">
                <h3 className="pm-section-title">이력</h3>
                <Row label="등록일" value={new Date(product.createdAt).toLocaleString('ko-KR')} />
                <Row label="등록자" value={product.createdBy?.name} />
                <Row label="수정일" value={new Date(product.updatedAt).toLocaleString('ko-KR')} />
                <Row label="수정자" value={product.updatedBy?.name} />
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductModal
