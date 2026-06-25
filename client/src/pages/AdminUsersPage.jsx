import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { getUsers, updateUser } from '../api/userApi'
import PageShell from '../components/PageShell'
import PageHero from '../components/PageHero'
import AdminNav from '../components/AdminNav'
import '../App.css'

const PAGE_SIZE = 10

const ROLE_LABEL = { customer: '일반', admin: '관리자' }

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

function AdminUsersPage() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const user = token ? JSON.parse(localStorage.getItem('user') || 'null') : null

  if (!token || !user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />

  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState({ search: '', role: '', page: 1 })
  const [searchInput, setSearchInput] = useState('')
  const [roleDrafts, setRoleDrafts] = useState({})
  const [actingId, setActingId] = useState(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getUsers({
        page: filter.page,
        limit: PAGE_SIZE,
        ...(filter.search && { search: filter.search }),
        ...(filter.role && { role: filter.role }),
      })
      setUsers(res.data ?? [])
      setTotal(res.total ?? 0)
      setPages(res.pages ?? 1)
    } catch {
      setUsers([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleFilterChange = (key, value) => {
    setFilter((prev) => ({
      ...prev,
      [key]: value,
      ...(key !== 'page' ? { page: 1 } : {}),
    }))
  }

  const handleSearch = (e) => {
    e.preventDefault()
    handleFilterChange('search', searchInput.trim())
  }

  const getRoleDraft = (u) => roleDrafts[u._id] ?? u.role

  const handleRoleConfirm = async (targetUser) => {
    const draft = getRoleDraft(targetUser)
    if (draft === targetUser.role) return
    if (String(targetUser._id) === String(user._id) && draft !== 'admin') {
      if (!window.confirm('본인의 관리자 권한을 해제하시겠습니까?')) return
    } else if (!window.confirm(`"${targetUser.name}"님의 역할을 ${ROLE_LABEL[draft]}(으)로 변경하시겠습니까?`)) {
      return
    }

    setActingId(targetUser._id)
    try {
      const res = await updateUser(targetUser._id, { role: draft })
      setUsers((prev) => prev.map((u) => (u._id === res.data._id ? res.data : u)))
      setRoleDrafts((prev) => ({ ...prev, [targetUser._id]: res.data.role }))
    } catch (err) {
      alert(err.message ?? '역할 변경에 실패했습니다.')
    } finally {
      setActingId(null)
    }
  }

  return (
    <PageShell className="page-shell--admin">
      <AdminNav title="포켓몬 샵 — 회원 관리" backLabel="← 관리자 메뉴" onBack={() => navigate('/admin')} />

      <PageHero title="회원 관리" subtitle={`총 ${total}명의 회원`} />

      <main className="pm-main">
        <div className="pm-toolbar">
          <div className="pm-toolbar-left">
            <form onSubmit={handleSearch} className="pm-search-form">
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="이름·이메일 검색"
                className="pm-search-input"
              />
              <button type="submit" className="pm-search-btn">검색</button>
            </form>
            <select
              value={filter.role}
              onChange={(e) => handleFilterChange('role', e.target.value)}
              className="pm-status-select"
            >
              <option value="">전체 역할</option>
              <option value="customer">일반 회원</option>
              <option value="admin">관리자</option>
            </select>
          </div>
        </div>

        <div className="pm-table-wrap">
          {loading ? (
            <div className="pm-loading">불러오는 중...</div>
          ) : users.length === 0 ? (
            <div className="pm-empty">조건에 맞는 회원이 없습니다.</div>
          ) : (
            <table className="pm-table">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>이메일</th>
                  <th>역할</th>
                  <th>전화</th>
                  <th>배송지 수</th>
                  <th>가입일</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const roleDraft = getRoleDraft(u)
                  const roleDirty = roleDraft !== u.role
                  return (
                    <tr key={u._id} className="pm-tr">
                      <td className="pm-td-name">
                        <span className="aum-avatar">{u.name.charAt(0)}</span>
                        {u.name}
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <div className="aum-role-control">
                          <select
                            className="aum-role-select"
                            value={roleDraft}
                            disabled={actingId === u._id}
                            onChange={(e) => setRoleDrafts((prev) => ({ ...prev, [u._id]: e.target.value }))}
                          >
                            <option value="customer">일반</option>
                            <option value="admin">관리자</option>
                          </select>
                          {roleDirty && (
                            <button
                              type="button"
                              className="aum-role-confirm"
                              disabled={actingId === u._id}
                              onClick={() => handleRoleConfirm(u)}
                            >
                              확인
                            </button>
                          )}
                        </div>
                      </td>
                      <td>{u.phone || '—'}</td>
                      <td className="pm-td-num">{u.addresses?.length ?? 0}</td>
                      <td className="pm-td-date">
                        {new Date(u.createdAt).toLocaleDateString('ko-KR')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {pages > 1 && (
          <div className="pm-pagination-wrap">
            <div className="pm-pagination">
              <button
                className="pm-page-nav"
                disabled={filter.page <= 1}
                onClick={() => handleFilterChange('page', 1)}
              >
                «
              </button>
              <button
                className="pm-page-nav"
                disabled={filter.page <= 1}
                onClick={() => handleFilterChange('page', filter.page - 1)}
              >
                ‹
              </button>
              {getPageList(filter.page, pages).map((p, i) =>
                p === '...' ? (
                  <span key={`dot-${i}`} className="pm-page-dot">…</span>
                ) : (
                  <button
                    key={p}
                    className={`pm-page-btn ${filter.page === p ? 'pm-page-active' : ''}`}
                    onClick={() => handleFilterChange('page', p)}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                className="pm-page-nav"
                disabled={filter.page >= pages}
                onClick={() => handleFilterChange('page', filter.page + 1)}
              >
                ›
              </button>
              <button
                className="pm-page-nav"
                disabled={filter.page >= pages}
                onClick={() => handleFilterChange('page', pages)}
              >
                »
              </button>
            </div>
            <p className="pm-pagination-info">{filter.page} / {pages} 페이지</p>
          </div>
        )}
      </main>
    </PageShell>
  )
}

export default AdminUsersPage
