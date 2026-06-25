import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import OrderModal from './OrderModal'

function CartDrawer({ onClose, onLoginClick, onRegisterClick }) {
  const navigate = useNavigate()
  const {
    items, loading, cartCount,
    selectedItems, selectedTotal, allSelected,
    loadCart, updateItem, removeItem, toggleSelect, selectAll, clearAll,
    removeSelectedItems,
  } = useCart()

  const [showOrder, setShowOrder] = useState(false)
  const isLoggedIn = Boolean(localStorage.getItem('token'))

  /* 가격 계산 헬퍼 */
  const getUnitPrice = (product) => {
    if (!product) return 0
    const rate = product.discount?.rate ?? 0
    return rate > 0 ? Math.round(product.price * (1 - rate / 100)) : product.price
  }

  /* 주문 완료 후 선택된 항목 제거 */
  const handleOrderSuccess = async () => {
    try {
      await removeSelectedItems()
    } catch {
      /* API 실패 시 전체 장바구니 재로드로 폴백 */
      await loadCart()
    }
    setShowOrder(false)
  }

  /* ── 비로그인 게이트 ── */
  if (!isLoggedIn) return (
    <>
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} />
      <div className="cart-drawer">
        <div className="cart-drawer-header">
          <h3>장바구니</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="cart-gate">
          <div className="cart-gate-icon">🔒</div>
          <h4>회원 전용 서비스입니다</h4>
          <p>장바구니는 로그인한 회원만<br />이용할 수 있습니다.</p>
          <div className="cart-gate-btns">
            <button className="cart-gate-login-btn" onClick={() => { onClose(); onLoginClick?.() }}>
              로그인
            </button>
            <button className="cart-gate-register-btn" onClick={() => { onClose(); onRegisterClick?.() }}>
              회원가입
            </button>
          </div>
        </div>
      </div>
    </>
  )

  /* ── 빈 장바구니 ── */
  if (!loading && items.length === 0) return (
    <>
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} />
      <div className="cart-drawer">
        <div className="cart-drawer-header">
          <h3>장바구니</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="cart-empty">
          <span>🛒</span>
          <p>장바구니가 비어있습니다</p>
          <button className="cart-empty-browse" onClick={() => { navigate('/'); onClose() }}>
            쇼핑 계속하기
          </button>
        </div>
      </div>
    </>
  )

  return (
    <>
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} />
      <div className="cart-drawer">
        {/* 헤더 */}
        <div className="cart-drawer-header">
          <h3>장바구니 <span className="cart-count-badge">{cartCount}</span></h3>
          <button onClick={onClose}>✕</button>
        </div>

        {/* 전체 선택 툴바 */}
        <div className="cart-toolbar">
          <label className="cart-select-all">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => selectAll(e.target.checked)}
            />
            <span>전체 선택</span>
            <span className="cart-selected-count">
              ({selectedItems.length}/{items.length})
            </span>
          </label>
          <button className="cart-clear-btn" onClick={clearAll}>전체 삭제</button>
        </div>

        {/* 아이템 목록 */}
        <div className="cart-items">
          {loading ? (
            <div className="cart-loading">불러오는 중...</div>
          ) : (
            items.map((item) => {
              const p = item.product
              if (!p) return null
              const unitPrice = getUnitPrice(p)
              const imageUrl  = p.images?.[0]?.url

              return (
                <div key={p._id} className={`cart-item ${item.selected ? 'cart-item--selected' : ''}`}>
                  {/* 선택 체크박스 */}
                  <input
                    type="checkbox"
                    className="cart-item-check"
                    checked={item.selected}
                    onChange={() => toggleSelect(String(p._id))}
                  />

                  {/* 이미지 */}
                  <div className="cart-item-img"
                    onClick={() => { navigate(`/products/${p._id}`); onClose() }}
                    style={{ cursor: 'pointer' }}>
                    {imageUrl
                      ? <img src={imageUrl} alt={p.name} />
                      : <span>🎴</span>
                    }
                  </div>

                  {/* 정보 */}
                  <div className="cart-item-info">
                    <p className="cart-item-name"
                      onClick={() => { navigate(`/products/${p._id}`); onClose() }}>
                      {p.name}
                    </p>
                    <p className="cart-item-vendor">{p.vendor}</p>
                    <div className="cart-item-price-row">
                      <span className="cart-item-unit">{unitPrice.toLocaleString()}원</span>
                      {(p.discount?.rate ?? 0) > 0 && (
                        <span className="cart-item-discount-badge">
                          -{p.discount.rate}%
                        </span>
                      )}
                    </div>

                    {/* 수량 컨트롤 */}
                    <div className="cart-item-qty">
                      <button onClick={() => updateItem(String(p._id), item.quantity - 1)}
                        disabled={item.quantity <= 1}>−</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateItem(String(p._id), item.quantity + 1)}
                        disabled={item.quantity >= p.stock}>+</button>
                    </div>

                    <p className="cart-item-subtotal">
                      소계: <strong>{(unitPrice * item.quantity).toLocaleString()}원</strong>
                    </p>
                  </div>

                  {/* 삭제 */}
                  <button className="cart-item-remove"
                    onClick={() => removeItem(String(p._id))} title="삭제">✕</button>
                </div>
              )
            })
          )}
        </div>

        {/* 하단 결제 영역 */}
        <div className="cart-footer">
          {selectedItems.length === 0 ? (
            <p className="cart-no-selected">주문할 상품을 선택해주세요</p>
          ) : (
            <>
              <div className="cart-total-row">
                <span>선택 상품 합계</span>
                <strong>{selectedTotal.toLocaleString()}원</strong>
              </div>
              <div className="cart-selected-info">
                선택 {selectedItems.length}개 · 총 {selectedItems.reduce((s, i) => s + i.quantity, 0)}점
              </div>
              <button className="cart-order-btn" onClick={() => setShowOrder(true)}>
                선택 상품 주문하기 ({selectedItems.length}개)
              </button>
            </>
          )}
        </div>
      </div>

      {/* 주문 모달 */}
      {showOrder && (
        <OrderModal
          items={selectedItems.map((i) => ({ product: i.product, quantity: i.quantity }))}
          totalPrice={selectedTotal}
          onClose={() => setShowOrder(false)}
          onSuccess={handleOrderSuccess}
        />
      )}
    </>
  )
}

export default CartDrawer
