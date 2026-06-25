import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/Navbar'
import EditProfileModal from '../components/EditProfileModal'
import LoginModal from '../components/LoginModal'
import RegisterModal from '../components/RegisterModal'
import { getProducts } from '../api/productApi'
import PageShell from '../components/PageShell'
import '../App.css'

/* Bulbagarden 공식 애니 일러스트 (890px+, 투명 PNG) — PokeAPI 공식 아트와 유사한 선화 품질 */
const JESSIE_ART =
  'https://archives.bulbagarden.net/media/upload/0/0d/Jessie_JN.png'
const JAMES_ART =
  'https://archives.bulbagarden.net/media/upload/1/19/James_JN.png'
const MEOWTH_ART =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/52.png'

const HERO_ACTIONS = (onJoin, onProducts) => [
  {
    label: 'JOIN US!',
    side: 'right',
    bg: 'linear-gradient(135deg, #fdf2f8 0%, #f0abfc 100%)',
    shadow: 'rgba(217, 70, 239, 0.38)',
    labelColor: '#9D174D',
    title: '회원가입 — 로사',
    alt: '로사',
    onClick: onJoin,
    img: JESSIE_ART,
    bust: true,
    imgStyle: { width: '400px', height: '400px', top: '-8px', right: '-112px' },
  },
  {
    label: 'PRODUCTS!',
    side: 'left',
    bg: 'linear-gradient(135deg, #f5f0ff 0%, #c4b5fd 100%)',
    shadow: 'rgba(124, 58, 237, 0.35)',
    labelColor: '#5B21B6',
    title: '전체 상품 목록 — 로이',
    alt: '로이',
    onClick: onProducts,
    img: JAMES_ART,
    bust: true,
    imgStyle: { width: '400px', height: '400px', top: '4px', left: '-108px' },
  },
]

const FEATURED = [
  {
    img: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
    label: 'CARDS!',
    category: 'CARD',
    bg: 'linear-gradient(135deg, #fffbe6 0%, #fff3b0 100%)',
    shadow: 'rgba(255, 203, 5, 0.35)',
    labelColor: '#7A5200',
    side: 'right',
    imgStyle: { width: '310px', height: '310px', top: '-50px', right: '-90px' },
  },
  {
    img: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png',
    label: 'FIGURES!',
    category: 'FIGURE',
    bg: 'linear-gradient(135deg, #eaf6ff 0%, #bde3ff 100%)',
    shadow: 'rgba(59, 158, 219, 0.35)',
    labelColor: '#1565C0',
    side: 'left',
    flip: true,
    imgStyle: { width: '300px', height: '300px', top: '-10px', left: '-90px' },
  },
  {
    img: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png',
    label: 'GOODS!',
    category: 'GOODS',
    bg: 'linear-gradient(135deg, #fff3ee 0%, #ffd5c2 100%)',
    shadow: 'rgba(255, 107, 53, 0.35)',
    labelColor: '#B84000',
    side: 'right',
    imgStyle: { width: '310px', height: '310px', top: '-5px', right: '-85px' },
  },
  {
    img: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png',
    label: 'GAMES!',
    category: 'GAME',
    bg: 'linear-gradient(135deg, #edfbee 0%, #c8f0c8 100%)',
    shadow: 'rgba(76, 175, 80, 0.35)',
    labelColor: '#2E7D32',
    side: 'left',
    flip: true,
    imgStyle: { width: '240px', height: '240px', top: '-18px', left: '-45px' },
  },
]

const CATEGORY_LABEL = { CARD: '카드', GOODS: '굿즈', GAME: '게임', FIGURE: '피규어' }
const CATEGORY_COLOR = { CARD: '#f59e0b', GOODS: '#ef4444', GAME: '#3b82f6', FIGURE: '#22c55e' }

function MainPage() {
  const navigate = useNavigate()
  const { user, setUser, logout } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)

  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('')
  const productsSectionRef = useRef(null)

  const handleCategoryClick = (category) => {
    setActiveCategory(category)
    setTimeout(() => {
      productsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  useEffect(() => {
    setProductsLoading(true)
    getProducts({ status: 'active', limit: 20, sort: '-createdAt', ...(activeCategory && { category: activeCategory }) })
      .then((data) => setProducts(data.data ?? []))
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false))
  }, [activeCategory])

  const handleUpdate = (updatedUser) => {
    setUser(updatedUser)
  }

  const scrollToAllProducts = () => {
    setActiveCategory('')
    setTimeout(() => {
      productsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  const heroActions = HERO_ACTIONS(
    () => setShowRegisterModal(true),
    scrollToAllProducts,
  )

  return (
    <PageShell>

      <Navbar
        user={user}
        onLogout={logout}
        onEditProfile={() => setShowModal(true)}
        onLoginClick={() => setShowLoginModal(true)}
        onRegisterClick={() => setShowRegisterModal(true)}
      />

      {/* Hero */}
      <section className="hero-section">
        <div className="hero-meowth-callout">
          <div className="hero-meowth-callout__bubble">
            <p className="hero-meowth-callout__text feature-label">NEW COLLECTIONS!</p>
          </div>
          <div className="hero-meowth-callout__img-wrap">
            <img src={MEOWTH_ART} alt="나옹" className="hero-meowth-callout__img" />
          </div>
        </div>
        <h1 className="hero-title">
          포켓몬의 세계로<br />
          <span className="hero-accent">모험을 떠나세요</span>
        </h1>
        <p className="hero-desc">
          포켓몬 공식 굿즈, 카드, 피규어를 한 곳에서.<br />
          진짜 트레이너를 위한 공간입니다.
        </p>
        <div className="features-grid hero-actions-grid">
          {heroActions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={`feature-card feature-card--${action.side}`}
              style={{ background: action.bg, boxShadow: `0 8px 24px ${action.shadow}` }}
              onClick={action.onClick}
              title={action.title}
            >
              <img
                src={action.img}
                alt={action.alt}
                className={`feature-pokemon-img${action.flip ? ' feature-pokemon-img--flip' : ''}${action.bust ? ' feature-pokemon-img--bust' : ''}`}
                style={action.imgStyle}
              />
              <div className="feature-text">
                <span className="feature-label" style={{ color: action.labelColor }}>
                  {action.label}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="features-grid">
          {FEATURED.map((item) => (
            <div
              className={`feature-card feature-card--${item.side}`}
              key={item.label}
              style={{ background: item.bg, boxShadow: `0 8px 24px ${item.shadow}`, cursor: 'pointer' }}
              onClick={() => handleCategoryClick(item.category)}
              title={`${item.label} 카테고리 보기`}
            >
              <img
                src={item.img}
                alt={item.label}
                className={`feature-pokemon-img${item.flip ? ' feature-pokemon-img--flip' : ''}`}
                style={item.imgStyle}
              />
              <div className="feature-text">
                <span className="feature-label" style={{ color: item.labelColor }}>{item.label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 상품 목록 */}
      <section className="products-section" ref={productsSectionRef}>
        {/* 카테고리 탭 */}
        <div className="products-tab-bar">
          {['', 'CARD', 'GOODS', 'GAME', 'FIGURE'].map((cat) => (
            <button
              key={cat || 'all'}
              className={`products-tab ${activeCategory === cat ? 'products-tab--active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat ? CATEGORY_LABEL[cat] : '전체'}
            </button>
          ))}
        </div>

        {productsLoading ? (
          <div className="products-loading">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="product-card-skeleton" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="products-empty">등록된 상품이 없습니다.</p>
        ) : (
          <div className="products-grid">
            {products.map((p) => {
              const imageUrl = p.images?.[0]?.url
              const discountRate = p.discount?.rate ?? 0
              const discountedPrice = discountRate > 0
                ? Math.round(p.price * (1 - discountRate / 100))
                : null

              return (
                <div key={p._id} className="product-card"
                  onClick={() => navigate(`/products/${p._id}`)}
                  style={{ cursor: 'pointer' }}>
                  <div className="product-card-img-wrap">
                    {imageUrl
                      ? <img src={imageUrl} alt={p.name} className="product-card-img" />
                      : <div className="product-card-no-img">🎴</div>
                    }
                    {discountRate > 0 && (
                      <span className="product-card-discount-badge">-{discountRate}%</span>
                    )}
                    <span
                      className="product-card-category"
                      style={{ background: CATEGORY_COLOR[p.category] }}
                    >
                      {CATEGORY_LABEL[p.category] ?? p.category}
                    </span>
                  </div>
                  <div className="product-card-info">
                    <p className="product-card-name">{p.name}</p>
                    <p className="product-card-vendor">{p.vendor}</p>
                    <div className="product-card-price">
                      {discountedPrice !== null ? (
                        <>
                          <span className="product-card-original">{p.price.toLocaleString()}원</span>
                          <span className="product-card-final">{discountedPrice.toLocaleString()}원</span>
                        </>
                      ) : (
                        <span className="product-card-final">{p.price.toLocaleString()}원</span>
                      )}
                    </div>
                    {p.stock === 0 && <p className="product-card-soldout">품절</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* CTA Banner */}
      <section className="cta-section">
        <div className="cta-inner">
          <div className="cta-pokeball">
            <div className="cpb-top" />
            <div className="cpb-strip"><div className="cpb-btn" /></div>
            <div className="cpb-bottom" />
          </div>
          <div>
            <h2 className="cta-title">트레이너가 되어보세요!</h2>
            <p className="cta-desc">회원가입하고 신규 가입 혜택을 받아보세요.</p>
          </div>
          <button className="cta-btn" onClick={() => setShowRegisterModal(true)}>
            무료 회원가입
          </button>
        </div>
      </section>

      <footer className="main-footer">
        <p>© 2026 포켓몬 샵. All rights reserved.</p>
      </footer>

      {showModal && (
        <EditProfileModal
          user={user}
          onClose={() => setShowModal(false)}
          onUpdate={handleUpdate}
        />
      )}

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={(userData) => setUser(userData)}
        />
      )}

      {showRegisterModal && (
        <RegisterModal
          onClose={() => setShowRegisterModal(false)}
          onRegisterSuccess={() => {
            const stored = localStorage.getItem('user')
            if (stored) setUser(JSON.parse(stored))
          }}
        />
      )}

    </PageShell>
  )
}

export default MainPage
