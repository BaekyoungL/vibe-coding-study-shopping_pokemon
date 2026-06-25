import { useNavigate, Navigate } from 'react-router-dom'
import PageShell from '../components/PageShell'
import PageHero from '../components/PageHero'
import AdminNav from '../components/AdminNav'
import '../App.css'

function AdminPage() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const user = token ? JSON.parse(localStorage.getItem('user') || 'null') : null

  if (!token || !user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />

  return (
    <PageShell className="page-shell--admin">
      <AdminNav title="포켓몬 샵 — 관리자" backLabel="메인으로" onBack={() => navigate('/')} />

      <PageHero
        title="포켓몬 체육관 관장님"
        subtitle="Administrator 전용 공간"
        showDecoBall
      />

      <main className="admin-main">
        <div className="admin-menu">
          {[
            {
              id: 143,
              label: '회원 관리',
              desc: '가입 유저 조회 및 관리',
              name: '잠만보',
              accent: 'rgba(180, 160, 120, 0.25)',
              path: '/admin/users',
            },
            {
              id: 129,
              label: '상품 관리',
              desc: '상품 등록·수정·삭제',
              name: '잉어킹',
              accent: 'rgba(59, 130, 246, 0.25)',
              path: '/admin/products',
            },
            {
              id: 54,
              label: '주문 관리',
              desc: '주문 현황 및 배송 처리',
              name: '고라파덕',
              accent: 'rgba(250, 200, 60, 0.2)',
              path: '/admin/orders',
            },
            {
              id: 79,
              label: '통계',
              desc: '매출 및 방문자 현황',
              name: '야돈',
              accent: 'rgba(210, 120, 200, 0.2)',
              path: '/admin/stats',
            },
          ].map((item) => (
            <button
              className="admin-menu-btn"
              key={item.label}
              style={{ '--accent': item.accent }}
              onClick={() => item.path && navigate(item.path)}
              disabled={!item.path}
            >
              <div className="admin-menu-pokemon">
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${item.id}.png`}
                  alt={item.name}
                />
              </div>
              <div className="admin-menu-text">
                <span className="admin-menu-label">{item.label}</span>
                <span className="admin-menu-desc">{item.desc}</span>
              </div>
              <span className="admin-menu-arrow">›</span>
            </button>
          ))}
        </div>
      </main>
    </PageShell>
  )
}

export default AdminPage
