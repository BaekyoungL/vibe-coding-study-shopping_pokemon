import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { getProducts } from '../api/productApi'
import ProductModal from '../components/ProductModal'
import PageShell from '../components/PageShell'
import PageHero from '../components/PageHero'
import AdminNav from '../components/AdminNav'
import '../App.css'

const PAGE_SIZE = 10

// 현재 페이지 기준으로 표시할 페이지 번호 배열 생성 (말줄임표 포함)
function getPageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = []
  const addPage = (n) => pages.push(n)
  const addDot = () => pages.push('...')

  addPage(1)
  if (current > 4) addDot()

  const start = Math.max(2, current - 2)
  const end = Math.min(total - 1, current + 2)
  for (let i = start; i <= end; i++) addPage(i)

  if (current < total - 3) addDot()
  addPage(total)

  return pages
}

const CATEGORIES = ['전체', 'CARD', 'GOODS', 'GAME', 'FIGURE']
const STATUSES = [
  { value: '', label: '전체 상태' },
  { value: 'active', label: '판매중' },
  { value: 'inactive', label: '판매중지' },
  { value: 'discontinued', label: '단종' },
]
const STATUS_BADGE = {
  active: { label: '판매중', cls: 'badge-active' },
  inactive: { label: '판매중지', cls: 'badge-inactive' },
  discontinued: { label: '단종', cls: 'badge-discontinued' },
}
const CATEGORY_COLOR = {
  CARD: '#f59e0b', GOODS: '#ef4444', GAME: '#3b82f6', FIGURE: '#22c55e',
}

function ProductManagePage() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const user = token ? JSON.parse(localStorage.getItem('user') || 'null') : null

  if (!token || !user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />

  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(false)

  const [filter, setFilter] = useState({ search: '', category: '', status: 'active', page: 1 })
  const [searchInput, setSearchInput] = useState('')

  const [selectedProduct, setSelectedProduct] = useState(null)

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
        ...(filter.search && { search: filter.search }),
        ...(filter.category && { category: filter.category }),
        ...(filter.status && { status: filter.status }),
        page: filter.page,
        limit: PAGE_SIZE,
        sort: '-createdAt',
      }
      const data = await getProducts(params)
      setProducts(data.data)
      setTotal(data.total)
      setPages(data.pages)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const handleFilterChange = (key, value) => {
    setFilter((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  const handlePageChange = (p) => {
    setFilter((prev) => ({ ...prev, page: p }))
  }

  const handleSearch = (e) => {
    e.preventDefault()
    handleFilterChange('search', searchInput.trim())
  }

  const handleSaved = (savedProduct) => {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p._id === savedProduct._id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = savedProduct
        return next
      }
      return [savedProduct, ...prev]
    })
  }

  const handleDeleted = (id) => {
    setProducts((prev) => prev.filter((p) => p._id !== id))
    setTotal((t) => t - 1)
  }

  return (
    <PageShell className="page-shell--admin">
      <AdminNav title="포켓몬 샵 — 상품 관리" backLabel="← 관리자 메뉴" onBack={() => navigate('/admin')} />

      <PageHero title="상품 관리" subtitle={`총 ${total}개 상품`} />

      <main className="pm-main">

        {/* 상단 툴바 */}
        <div className="pm-toolbar">
          <div className="pm-toolbar-left">
            {/* 검색 */}
            <form onSubmit={handleSearch} className="pm-search-form">
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="상품명·코드·태그 검색"
                className="pm-search-input"
              />
              <button type="submit" className="pm-search-btn">검색</button>
            </form>

            {/* 카테고리 필터 */}
            <div className="pm-filter-tabs">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  className={`pm-tab ${filter.category === (c === '전체' ? '' : c) ? 'pm-tab--active' : ''}`}
                  onClick={() => handleFilterChange('category', c === '전체' ? '' : c)}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* 상태 필터 */}
            <select
              value={filter.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="pm-status-select"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <button
            className="pm-register-btn"
            onClick={() => navigate('/admin/products/new')}
          >
            + 새 상품 등록
          </button>
        </div>

        {/* 테이블 */}
        <div className="pm-table-wrap">
          {loading ? (
            <div className="pm-loading">불러오는 중...</div>
          ) : products.length === 0 ? (
            <div className="pm-empty">조건에 맞는 상품이 없습니다.</div>
          ) : (
            <table className="pm-table">
              <thead>
                <tr>
                  <th>상품 코드</th>
                  <th>상품명</th>
                  <th>카테고리</th>
                  <th>판매가</th>
                  <th>구입가</th>
                  <th>재고</th>
                  <th>상태</th>
                  <th>등록일</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const badge = STATUS_BADGE[p.status] ?? STATUS_BADGE.active
                  return (
                    <tr
                      key={p._id}
                      className="pm-tr"
                      onClick={() => setSelectedProduct(p)}
                    >
                      <td className="pm-td-code">{p.productCode}</td>
                      <td className="pm-td-name">
                        {p.images?.[0]?.url && (
                          <img src={p.images[0].url} alt={p.name} className="pm-thumb" />
                        )}
                        {p.name}
                      </td>
                      <td>
                        <span className="pm-category-badge"
                          style={{ background: CATEGORY_COLOR[p.category] + '22', color: CATEGORY_COLOR[p.category] }}>
                          {p.category}
                        </span>
                      </td>
                      <td className="pm-td-num">{p.price.toLocaleString()}원</td>
                      <td className="pm-td-num">{p.costPrice.toLocaleString()}원</td>
                      <td className={`pm-td-num ${p.stock === 0 ? 'pm-stock-zero' : ''}`}>{p.stock}</td>
                      <td><span className={`pm-status-badge ${badge.cls}`}>{badge.label}</span></td>
                      <td className="pm-td-date">{new Date(p.createdAt).toLocaleDateString('ko-KR')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 페이지네이션 */}
        <div className="pm-pagination-wrap">
          <div className="pm-pagination">
            {/* 처음으로 */}
            <button
              className="pm-page-nav"
              disabled={filter.page <= 1}
              onClick={() => handlePageChange(1)}
              title="처음"
            >«</button>

            {/* 이전 */}
            <button
              className="pm-page-nav"
              disabled={filter.page <= 1}
              onClick={() => handlePageChange(filter.page - 1)}
              title="이전"
            >‹</button>

            {/* 페이지 번호 */}
            {getPageList(filter.page, pages).map((p, i) =>
              p === '...'
                ? <span key={`dot-${i}`} className="pm-page-dot">…</span>
                : <button
                    key={p}
                    className={`pm-page-btn ${filter.page === p ? 'pm-page-active' : ''}`}
                    onClick={() => handlePageChange(p)}
                  >{p}</button>
            )}

            {/* 다음 */}
            <button
              className="pm-page-nav"
              disabled={filter.page >= pages}
              onClick={() => handlePageChange(filter.page + 1)}
              title="다음"
            >›</button>

            {/* 마지막으로 */}
            <button
              className="pm-page-nav"
              disabled={filter.page >= pages}
              onClick={() => handlePageChange(pages)}
              title="마지막"
            >»</button>
          </div>

          <p className="pm-pagination-info">
            {filter.page} / {pages} 페이지 &nbsp;·&nbsp; 총 {total.toLocaleString()}개 상품
          </p>
        </div>

      </main>

      {/* 모달 */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onDeleted={handleDeleted}
        />
      )}
    </PageShell>
  )
}

export default ProductManagePage
