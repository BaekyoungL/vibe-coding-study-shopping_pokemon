import { useNavigate } from 'react-router-dom'
import PokeballIcon from './PokeballIcon'
import { useCart } from '../context/CartContext'
import CartDrawer from './CartDrawer'
import { useState, useRef, useEffect } from 'react'

function Navbar({ user, onLogout, onEditProfile, onLoginClick, onRegisterClick }) {
  const navigate = useNavigate()
  const { cartCount } = useCart()
  const [showCart, setShowCart] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  /* 드롭다운 외부 클릭 시 닫기 */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleCartOpen = () => {
    setShowDropdown(false)
    setShowCart(true)
  }

  return (
    <>
      <nav className="main-nav">
        <div className="nav-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <PokeballIcon variant="nav" />
          <span>포켓몬 샵</span>
        </div>

        <div className="nav-actions">
          {/* 장바구니 아이콘 (비로그인 포함 항상 표시) */}
          <button className="nav-cart-btn" onClick={handleCartOpen}>
            🛒
            {cartCount > 0 && <span className="nav-cart-badge">{cartCount}</span>}
          </button>

          {user ? (
            <>
              {user.role === 'admin' && (
                <button className="nav-btn-admin" onClick={() => navigate('/admin')}>
                  🛡 관리자
                </button>
              )}

              {/* 유저 드롭다운 */}
              <div className="nav-user-dropdown" ref={dropdownRef}>
                <button
                  className="nav-user-btn"
                  onClick={() => setShowDropdown((v) => !v)}
                  aria-expanded={showDropdown}
                >
                  <span className="nav-user-avatar">{user.name.charAt(0)}</span>
                  <span className="nav-user-name">{user.name} 트레이너님</span>
                  <span className="nav-dropdown-arrow">{showDropdown ? '▲' : '▼'}</span>
                </button>

                {showDropdown && (
                  <div className="nav-dropdown-menu">
                    <button className="nav-dropdown-item" onClick={() => { setShowDropdown(false); navigate('/my/orders') }}>
                      <span className="ndi-icon">📦</span>
                      <span>내 주문 목록</span>
                    </button>
                    <button className="nav-dropdown-item" onClick={() => { handleCartOpen() }}>
                      <span className="ndi-icon">🛒</span>
                      <span>내 장바구니</span>
                      {cartCount > 0 && <span className="ndi-badge">{cartCount}</span>}
                    </button>
                    <button className="nav-dropdown-item" onClick={() => { setShowDropdown(false); onEditProfile() }}>
                      <span className="ndi-icon">👤</span>
                      <span>내 정보 수정</span>
                    </button>
                    {user.role === 'admin' && (
                      <>
                        <div className="nav-dropdown-divider" />
                        <button
                          className="nav-dropdown-item nav-dropdown-item--admin"
                          onClick={() => { setShowDropdown(false); navigate('/admin/products') }}
                        >
                          <span className="ndi-icon">🏷️</span>
                          <span>상품 관리</span>
                        </button>
                        <button
                          className="nav-dropdown-item nav-dropdown-item--admin"
                          onClick={() => { setShowDropdown(false); navigate('/admin/orders') }}
                        >
                          <span className="ndi-icon">📋</span>
                          <span>주문 관리</span>
                        </button>
                      </>
                    )}
                    <div className="nav-dropdown-divider" />
                    <button className="nav-dropdown-item nav-dropdown-item--danger" onClick={() => { setShowDropdown(false); onLogout() }}>
                      <span className="ndi-icon">🚪</span>
                      <span>로그아웃</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button className="nav-btn-outline" onClick={onLoginClick}>로그인</button>
              <button className="nav-btn-fill" onClick={onRegisterClick}>회원가입</button>
            </>
          )}
        </div>
      </nav>

      {showCart && (
        <CartDrawer
          onClose={() => setShowCart(false)}
          onLoginClick={onLoginClick}
          onRegisterClick={onRegisterClick}
        />
      )}
    </>
  )
}

export default Navbar
