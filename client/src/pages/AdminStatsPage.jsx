import { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { getDashboardStats } from '../api/adminApi'
import PageShell from '../components/PageShell'
import PageHero from '../components/PageHero'
import AdminNav from '../components/AdminNav'
import '../App.css'

const STATUS_LABEL = {
  pending: { text: '주문 접수', color: '#f59e0b' },
  confirmed: { text: '결제 확인', color: '#3b82f6' },
  shipped: { text: '배송 중', color: '#8b5cf6' },
  delivered: { text: '배송 완료', color: '#16a34a' },
  cancelled: { text: '주문 취소', color: '#dc2626' },
}

const CATEGORY_LABEL = { CARD: '카드', GOODS: '굿즈', GAME: '게임', FIGURE: '피규어' }

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="ast-stat-card" style={accent ? { '--accent': accent } : undefined}>
      <p className="ast-stat-label">{label}</p>
      <p className="ast-stat-value">{value}</p>
      {sub && <p className="ast-stat-sub">{sub}</p>}
    </div>
  )
}

function AdminStatsPage() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const user = token ? JSON.parse(localStorage.getItem('user') || 'null') : null

  if (!token || !user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />

  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboardStats()
      .then((res) => setStats(res.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <PageShell className="page-shell--admin">
      <AdminNav title="포켓몬 샵 — 통계" backLabel="← 관리자 메뉴" onBack={() => navigate('/admin')} />

      <PageHero title="통계" subtitle="매출 및 운영 현황" />

      <main className="pm-main ast-main">
        {loading ? (
          <div className="pm-loading">불러오는 중...</div>
        ) : !stats ? (
          <div className="pm-empty">통계를 불러오지 못했습니다.</div>
        ) : (
          <>
            <section className="ast-section">
              <h2 className="ast-section-title">매출 · 주문</h2>
              <div className="ast-stat-grid">
                <StatCard
                  label="총 매출 (결제완료)"
                  value={`${stats.revenue.total.toLocaleString()}원`}
                  sub={`결제완료 ${stats.revenue.paidOrderCount}건`}
                  accent="#16a34a"
                />
                <StatCard
                  label="전체 주문"
                  value={`${stats.orders.total}건`}
                  sub={`최근 7일 ${stats.recentOrdersLast7Days}건`}
                  accent="#3b82f6"
                />
                <StatCard
                  label="배송 완료"
                  value={`${stats.orders.delivered}건`}
                  accent="#8b5cf6"
                />
                <StatCard
                  label="주문 취소"
                  value={`${stats.orders.cancelled}건`}
                  accent="#dc2626"
                />
              </div>
            </section>

            <section className="ast-section">
              <h2 className="ast-section-title">회원 · 상품</h2>
              <div className="ast-stat-grid">
                <StatCard
                  label="전체 회원"
                  value={`${stats.users.total}명`}
                  sub={`관리자 ${stats.users.admin} · 일반 ${stats.users.customer}`}
                  accent="#f59e0b"
                />
                <StatCard
                  label="등록 상품"
                  value={`${stats.products.total}개`}
                  sub={`판매중 ${stats.products.active} · 중지 ${stats.products.inactive} · 단종 ${stats.products.discontinued}`}
                  accent="#ec4899"
                />
              </div>
            </section>

            <section className="ast-section">
              <h2 className="ast-section-title">주문 상태별 현황</h2>
              <div className="aom-stats-grid ast-order-grid">
                {Object.entries(STATUS_LABEL).map(([key, { text, color }]) => (
                  <button
                    key={key}
                    type="button"
                    className="aom-stat-cell"
                    onClick={() => navigate('/admin/orders')}
                  >
                    <span className="aom-stat-label" style={{ color }}>{text}</span>
                    <span className="aom-stat-count">{stats.orders[key] ?? 0}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="ast-section">
              <h2 className="ast-section-title">카테고리별 상품</h2>
              <div className="pm-table-wrap">
                <table className="pm-table">
                  <thead>
                    <tr>
                      <th>카테고리</th>
                      <th>상품 수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(stats.productsByCategory).map(([cat, count]) => (
                      <tr key={cat} className="pm-tr">
                        <td>{CATEGORY_LABEL[cat] ?? cat}</td>
                        <td className="pm-td-num">{count}개</td>
                      </tr>
                    ))}
                    {Object.keys(stats.productsByCategory).length === 0 && (
                      <tr>
                        <td colSpan={2} className="pm-empty">등록된 상품이 없습니다.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </PageShell>
  )
}

export default AdminStatsPage
