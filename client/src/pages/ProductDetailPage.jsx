import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProduct } from '../api/productApi'
import { useCart } from '../context/CartContext'
import OrderModal from '../components/OrderModal'
import Navbar from '../components/Navbar'
import { useAuth } from '../hooks/useAuth'
import EditProfileModal from '../components/EditProfileModal'
import LoginModal from '../components/LoginModal'
import RegisterModal from '../components/RegisterModal'
import PageShell from '../components/PageShell'
import PageHero from '../components/PageHero'
import '../App.css'

const CATEGORY_LABEL = { CARD: '카드', GOODS: '굿즈', GAME: '게임', FIGURE: '피규어' }
const CATEGORY_COLOR = { CARD: '#f59e0b', GOODS: '#ef4444', GAME: '#3b82f6', FIGURE: '#22c55e' }
const CATEGORY_BANNER = {
  CARD:   'linear-gradient(135deg, #78450a, #b97a2a)',
  GOODS:  'linear-gradient(135deg, #7f1d1d, #c1121f)',
  GAME:   'linear-gradient(135deg, #1e3a8a, #2d5a9e)',
  FIGURE: 'linear-gradient(135deg, #14532d, #16a34a)',
}

function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, setUser, logout } = useAuth()
  const { addToCart, removeItem: removeCartItem, loadCart } = useCart()
  const isLoggedIn = Boolean(localStorage.getItem('token'))

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [showOrder, setShowOrder] = useState(false)
  const [toast, setToast] = useState('')

  // 모달 상태
  const [showEdit, setShowEdit] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  useEffect(() => {
    setLoading(true)
    getProduct(id)
      .then((data) => setProduct(data.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [id])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const handleAddToCart = async () => {
    if (!isLoggedIn) {
      setShowLogin(true)
      return
    }
    try {
      await addToCart(String(product._id), quantity)
      showToast(`장바구니에 ${quantity}개 담았습니다 🛒`)
    } catch {
      showToast('장바구니 추가에 실패했습니다.')
    }
  }

  const handleOrder = () => {
    if (!user) { setShowLogin(true); return }
    setShowOrder(true)
  }

  const changeQty = (delta) => {
    setQuantity((q) => Math.max(1, Math.min(product.stock, q + delta)))
  }

  if (loading) return (
    <PageShell>
      <Navbar user={user} onLogout={logout} onEditProfile={() => setShowEdit(true)}
        onLoginClick={() => setShowLogin(true)} onRegisterClick={() => setShowRegister(true)} />
      <div className="pd-loading">상품 정보를 불러오는 중...</div>
    </PageShell>
  )

  if (!product) return null

  const discountRate = product.discount?.rate ?? 0
  const now = new Date()
  const isDiscount = discountRate > 0
    && (!product.discount?.startDate || new Date(product.discount.startDate) <= now)
    && (!product.discount?.endDate || new Date(product.discount.endDate) >= now)
  const finalPrice = isDiscount ? Math.round(product.price * (1 - discountRate / 100)) : product.price
  const imageUrl = product.images?.[0]?.url

  return (
    <PageShell>
      <Navbar user={user} onLogout={logout} onEditProfile={() => setShowEdit(true)}
        onLoginClick={() => setShowLogin(true)} onRegisterClick={() => setShowRegister(true)} />

      <PageHero
        title={product.name}
        subtitle={<>{CATEGORY_LABEL[product.category] ?? product.category} · {product.vendor}</>}
        onBack={() => navigate(-1)}
        backLabel="← 목록으로"
      />

      <main className="pd-main">
        <div className="pd-layout">
          {/* 좌측: 이미지 */}
          <div className="pd-image-col">
            <div className="pd-image-wrap">
              {imageUrl
                ? <img src={imageUrl} alt={product.name} className="pd-image" />
                : <div className="pd-no-image">🎴</div>
              }
              {isDiscount && (
                <span className="pd-discount-badge">-{discountRate}%</span>
              )}
            </div>
          </div>

          {/* 우측: 상품 정보 + 주문 */}
          <div className="pd-info-col">
            {/* 상단 컬러 배너 — 상품명, 카테고리, 업체 */}
            <div
              className="pd-info-banner"
              style={{ background: CATEGORY_BANNER[product.category] ?? CATEGORY_BANNER.GAME }}
            >
              <div className="pd-meta">
                <span className="pd-category-badge">
                  {CATEGORY_LABEL[product.category] ?? product.category}
                </span>
                <span className="pd-vendor">{product.vendor}</span>
              </div>
              <h1 className="pd-name">{product.name}</h1>
            </div>

            {/* 카드 본문 */}
            <div className="pd-info-body">
              {/* 가격 */}
              <div className="pd-price-box">
                {isDiscount && (
                  <p className="pd-original-price">{product.price.toLocaleString()}원</p>
                )}
                <p className="pd-final-price">
                  {finalPrice.toLocaleString()}
                  <span className="pd-price-unit">원</span>
                </p>
                {isDiscount && (
                  <span className="pd-discount-rate">{discountRate}% 할인</span>
                )}
              </div>

              {/* 설명 */}
              {product.description && (
                <p className="pd-description">{product.description}</p>
              )}

              {/* 재고 */}
              <p className={`pd-stock ${product.stock === 0 ? 'pd-stock--zero' : ''}`}>
                {product.stock === 0 ? '품절' : `재고 ${product.stock}개`}
              </p>

              {product.stock > 0 && (
                <>
                  {/* 수량 선택 */}
                  <div className="pd-qty-row">
                    <span className="pd-qty-label">수량</span>
                    <div className="pd-qty-ctrl">
                      <button onClick={() => changeQty(-1)} disabled={quantity <= 1}>−</button>
                      <span className="pd-qty-num">{quantity}</span>
                      <button onClick={() => changeQty(1)} disabled={quantity >= product.stock}>+</button>
                    </div>
                    <span className="pd-qty-total">
                      합계 <strong>{(finalPrice * quantity).toLocaleString()}원</strong>
                    </span>
                  </div>

                  {/* 버튼 */}
                  <div className="pd-btn-group">
                    <button className="pd-cart-btn" onClick={handleAddToCart}>
                      🛒 장바구니 담기
                    </button>
                    <button className="pd-order-btn" onClick={handleOrder}>
                      바로 주문하기
                    </button>
                  </div>
                </>
              )}

              {/* 태그 */}
              {product.tags?.length > 0 && (
                <div className="pd-tags">
                  {product.tags.map((t) => <span key={t} className="pd-tag">#{t}</span>)}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 토스트 */}
      {toast && <div className="pd-toast">{toast}</div>}

      {/* 주문 모달 */}
      {showOrder && (
        <OrderModal
          items={[{ product, quantity }]}
          totalPrice={finalPrice * quantity}
          onClose={() => setShowOrder(false)}
          onSuccess={async () => {
            /* 장바구니에 해당 상품이 있으면 함께 제거 */
            try { await removeCartItem(String(product._id)) } catch { /* 장바구니에 없어도 무시 */ }
            setShowOrder(false)
            showToast('주문이 완료되었습니다! ✓')
          }}
        />
      )}

      {/* 프로필 편집 모달 */}
      {showEdit && user && (
        <EditProfileModal user={user} onClose={() => setShowEdit(false)}
          onUpdate={(u) => setUser(u)} />
      )}
      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)}
          onLoginSuccess={(u) => setUser(u)} />
      )}
      {showRegister && (
        <RegisterModal onClose={() => setShowRegister(false)}
          onRegisterSuccess={() => {
            const s = localStorage.getItem('user')
            if (s) setUser(JSON.parse(s))
          }} />
      )}
    </PageShell>
  )
}

export default ProductDetailPage
