import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import {
  getAllOrders,
  getOrderStats,
  updateOrderStatus,
  confirmOrderPayment,
  updateOrderTracking,
} from '../api/orderApi'
import PageShell from '../components/PageShell'
import PageHero from '../components/PageHero'
import AdminNav from '../components/AdminNav'
import '../App.css'

const LIMIT = 10

const STATUS_LABEL = {
  pending:   { text: '주문 접수', color: '#f59e0b', bg: '#fef3c7' },
  confirmed: { text: '결제 확인', color: '#3b82f6', bg: '#eff6ff' },
  shipped:   { text: '배송 중',   color: '#8b5cf6', bg: '#f5f3ff' },
  delivered: { text: '배송 완료', color: '#16a34a', bg: '#f0fdf4' },
  cancelled: { text: '주문 취소', color: '#dc2626', bg: '#fef2f2' },
}

const PAYMENT_LABEL = { card: '신용카드', transfer: '계좌이체', kakao: '카카오페이' }

const STATUS_TABS = [
  { value: '', label: '전체' },
  { value: 'pending', label: '접수' },
  { value: 'confirmed', label: '결제확인' },
  { value: 'shipped', label: '배송중' },
  { value: 'delivered', label: '완료' },
  { value: 'cancelled', label: '취소' },
]

const PAYMENT_TABS = [
  { value: '', label: '결제 전체' },
  { value: 'unpaid', label: '미결제' },
  { value: 'paid', label: '결제완료' },
]

const CARRIERS = ['CJ대한통운', '우체국택배', '롯데택배', '한진택배', '쿠팡로켓배송']

const ALL_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']

function getAvailableStatuses(current) {
  if (current === 'cancelled') return ['cancelled']
  if (current === 'delivered') return ['delivered']
  if (current === 'shipped') return ['shipped', 'delivered']
  if (current === 'confirmed') return ['confirmed', 'shipped', 'cancelled']
  return ['pending', 'confirmed', 'cancelled']
}

function StatusBadge({ status }) {
  const s = STATUS_LABEL[status] ?? { text: status, color: '#6b7280', bg: '#f3f4f6' }
  return (
    <span className="mop-status-badge" style={{ color: s.color, background: s.bg }}>
      {s.text}
    </span>
  )
}

function AdminOrdersPage() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const user = token ? JSON.parse(localStorage.getItem('user') || 'null') : null

  if (!token || !user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />

  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [filter, setFilter] = useState({
    status: '',
    paymentStatus: '',
    page: 1,
    searchType: 'customer',
    search: '',
  })
  const [searchInput, setSearchInput] = useState('')
  const [actingId, setActingId] = useState(null)
  const [trackingForms, setTrackingForms] = useState({})
  const [statusDrafts, setStatusDrafts] = useState({})
  const [stats, setStats] = useState(null)

  const fetchStats = useCallback(async () => {
    try {
      const res = await getOrderStats()
      setStats(res.data ?? null)
    } catch {
      setStats(null)
    }
  }, [])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getAllOrders({
        page: filter.page,
        limit: LIMIT,
        ...(filter.status && { status: filter.status }),
        ...(filter.paymentStatus && { paymentStatus: filter.paymentStatus }),
        ...(filter.search && { search: filter.search, searchType: filter.searchType }),
      })
      setOrders(res.data ?? [])
      setTotal(res.total ?? 0)
    } catch {
      setOrders([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchOrders() }, [fetchOrders])
  useEffect(() => { fetchStats() }, [fetchStats])

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const patchOrder = (updated) => {
    setOrders((prev) => prev.map((o) => {
      if (o._id !== updated._id) return o
      return { ...updated, user: updated.user?.name ? updated.user : o.user }
    }))
    setStatusDrafts((prev) => ({ ...prev, [updated._id]: updated.status }))
    fetchStats()
  }

  const getStatusDraft = (order) => statusDrafts[order._id] ?? order.status

  const setStatusDraft = (orderId, status) => {
    setStatusDrafts((prev) => ({ ...prev, [orderId]: status }))
  }

  const handleFilter = (key, value) => {
    setFilter((prev) => ({ ...prev, [key]: value, page: 1 }))
    setExpanded(null)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setFilter((prev) => ({ ...prev, search: searchInput.trim(), page: 1 }))
    setExpanded(null)
  }

  const handleSearchClear = () => {
    setSearchInput('')
    setFilter((prev) => ({ ...prev, search: '', page: 1 }))
    setExpanded(null)
  }

  const handleStatusConfirm = async (order) => {
    const draft = getStatusDraft(order)
    if (draft === order.status) return
    if (draft === 'cancelled' && !window.confirm('이 주문을 취소하시겠습니까? 재고가 복구됩니다.')) return

    const memoMap = {
      confirmed: '결제 확인',
      shipped: '배송 시작',
      delivered: '배송 완료',
      cancelled: '관리자 취소',
      pending: '상태 변경',
    }

    setActingId(order._id)
    try {
      const res = await updateOrderStatus(order._id, { status: draft, memo: memoMap[draft] ?? '상태 변경' })
      patchOrder(res.data)
    } catch (err) {
      alert(err.message ?? '상태 변경에 실패했습니다.')
    } finally {
      setActingId(null)
    }
  }

  const handleConfirmPayment = async (order) => {
    if (!window.confirm('결제 완료로 처리하시겠습니까?')) return
    setActingId(order._id)
    try {
      const res = await confirmOrderPayment(order._id)
      patchOrder(res.data)
    } catch (err) {
      alert(err.message ?? '결제 확인에 실패했습니다.')
    } finally {
      setActingId(null)
    }
  }

  const handleTrackingSubmit = async (order) => {
    const form = trackingForms[order._id] ?? { carrier: CARRIERS[0], trackingNumber: '' }
    if (!form.trackingNumber.trim()) {
      alert('운송장 번호를 입력해주세요.')
      return
    }
    setActingId(order._id)
    try {
      const res = await updateOrderTracking(order._id, {
        carrier: form.carrier,
        trackingNumber: form.trackingNumber.trim(),
      })
      patchOrder(res.data)
    } catch (err) {
      alert(err.message ?? '운송장 등록에 실패했습니다.')
    } finally {
      setActingId(null)
    }
  }

  const setTrackingField = (orderId, field, value) => {
    setTrackingForms((prev) => ({
      ...prev,
      [orderId]: { carrier: CARRIERS[0], trackingNumber: '', ...prev[orderId], [field]: value },
    }))
  }

  const toggle = (id) => setExpanded((prev) => (prev === id ? null : id))

  const customerName = (order) =>
    order.user?.name ?? order.user?.email ?? '—'

  return (
    <PageShell className="page-shell--admin">
      <AdminNav title="포켓몬 샵 — 주문 관리" backLabel="← 관리자 메뉴" onBack={() => navigate('/admin')} />

      <PageHero
        title="주문 관리"
        subtitle={<>전체 <strong>{stats?.total ?? total}</strong>건의 주문</>}
      />

      <main className="pm-main aom-main">
        <div className="pm-toolbar">
          <div className="pm-toolbar-left">
            <div className="pm-filter-tabs">
              {STATUS_TABS.map((t) => (
                <button
                  key={t.value || 'all'}
                  type="button"
                  className={`pm-tab ${filter.status === t.value ? 'pm-tab--active' : ''}`}
                  onClick={() => handleFilter('status', t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="pm-filter-tabs">
              {PAYMENT_TABS.map((t) => (
                <button
                  key={t.value || 'all-pay'}
                  type="button"
                  className={`pm-tab ${filter.paymentStatus === t.value ? 'pm-tab--active' : ''}`}
                  onClick={() => handleFilter('paymentStatus', t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <form className="aom-search" onSubmit={handleSearch}>
          <select
            className="aom-search-type"
            value={filter.searchType}
            onChange={(e) => handleFilter('searchType', e.target.value)}
          >
            <option value="customer">주문자</option>
            <option value="orderNumber">주문 번호</option>
          </select>
          <input
            className="aom-search-input"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={filter.searchType === 'orderNumber' ? '주문 번호 검색' : '이름 또는 이메일 검색'}
          />
          <button type="submit" className="aom-search-btn">검색</button>
          {(filter.search || searchInput) && (
            <button type="button" className="aom-search-clear" onClick={handleSearchClear}>
              초기화
            </button>
          )}
        </form>

        {stats && (
          <div className="aom-stats">
            <p className="aom-stats-title">주문 상태별 현황</p>
            <div className="aom-stats-grid">
              {ALL_STATUSES.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`aom-stat-cell ${filter.status === key ? 'aom-stat-cell--active' : ''}`}
                  onClick={() => handleFilter('status', filter.status === key ? '' : key)}
                >
                  <span className="aom-stat-label" style={{ color: STATUS_LABEL[key].color }}>
                    {STATUS_LABEL[key].text}
                  </span>
                  <span className="aom-stat-count">{stats[key] ?? 0}</span>
                </button>
              ))}
              <button
                type="button"
                className={`aom-stat-cell aom-stat-cell--total ${!filter.status ? 'aom-stat-cell--active' : ''}`}
                onClick={() => handleFilter('status', '')}
              >
                <span className="aom-stat-label">전체</span>
                <span className="aom-stat-count">{stats.total ?? 0}</span>
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="mop-loading">
            {Array.from({ length: 3 }, (_, i) => <div key={i} className="mop-skeleton" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="mop-empty">
            <span>📦</span>
            <p>조회된 주문이 없습니다.</p>
          </div>
        ) : (
          <>
            <div className="mop-list">
              {orders.map((order) => {
                const isOpen = expanded === order._id
                const isActing = actingId === order._id
                const statusDraft = getStatusDraft(order)
                const statusDirty = statusDraft !== order.status
                const availableStatuses = getAvailableStatuses(order.status)
                const trackForm = trackingForms[order._id] ?? {
                  carrier: order.carrier || CARRIERS[0],
                  trackingNumber: order.trackingNumber || '',
                }

                return (
                  <div
                    key={order._id}
                    className={`mop-card ${isOpen ? 'mop-card--open' : ''}`}
                    style={{ '--status-color': STATUS_LABEL[order.status]?.color ?? '#9ca3af' }}
                  >
                    <div className="mop-card-topbar" />

                    <div
                      className="mop-card-header"
                      role="button"
                      tabIndex={0}
                      onClick={() => toggle(order._id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          toggle(order._id)
                        }
                      }}
                    >
                      <div className="mop-card-meta">
                        <div className="mop-card-meta-top">
                          <span className="mop-order-number">{order.orderNumber}</span>
                          <StatusBadge status={order.status} />
                          <span className={`aom-pay-chip ${order.paymentStatus === 'paid' ? 'aom-pay-chip--paid' : ''}`}>
                            {order.paymentStatus === 'paid' ? '결제완료' : '미결제'}
                          </span>
                        </div>
                        <span className="mop-order-date">
                          {new Date(order.createdAt).toLocaleString('ko-KR')} · {customerName(order)}
                        </span>
                      </div>
                      <div className="mop-card-right">
                        <div className="mop-total-wrap">
                          <span className="mop-total-label">총 결제금액</span>
                          <span className="mop-order-total">{order.totalPrice?.toLocaleString()}원</span>
                        </div>
                        <span className="mop-chevron">{isOpen ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {!isOpen && (
                      <div className="mop-preview">
                        {order.items.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="mop-preview-item">
                            {item.imageUrl
                              ? <img src={item.imageUrl} alt={item.name} />
                              : <span>🎴</span>}
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <span className="mop-preview-more">+{order.items.length - 3}</span>
                        )}
                        <span className="mop-preview-name">
                          {order.items[0]?.name}
                          {order.items.length > 1 && ` 외 ${order.items.length - 1}개`}
                        </span>
                      </div>
                    )}

                    {isOpen && (
                      <div className="mop-detail">
                        <div className="mop-items">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="mop-item">
                              <div className="mop-item-img">
                                {item.imageUrl
                                  ? <img src={item.imageUrl} alt={item.name} />
                                  : <span>🎴</span>}
                              </div>
                              <div className="mop-item-info">
                                <p className="mop-item-name">{item.name}</p>
                                <p className="mop-item-meta">
                                  {item.quantity}개 · {item.price?.toLocaleString()}원
                                </p>
                              </div>
                              <span className="mop-item-subtotal">
                                {(item.price * item.quantity)?.toLocaleString()}원
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="mop-summary">
                          <div className="mop-summary-row">
                            <span>상품금액</span><span>{order.itemsPrice?.toLocaleString()}원</span>
                          </div>
                          <div className="mop-summary-row">
                            <span>배송비</span>
                            <span>{order.shippingFee === 0 ? '무료' : `${order.shippingFee?.toLocaleString()}원`}</span>
                          </div>
                          <div className="mop-summary-row mop-summary-total">
                            <span>최종 결제금액</span>
                            <strong>{order.totalPrice?.toLocaleString()}원</strong>
                          </div>
                        </div>

                        <div className="mop-info-grid">
                          <div className="mop-info-box">
                            <p className="mop-info-label">👤 주문자</p>
                            <p>{customerName(order)}</p>
                            <p>{order.user?.email}</p>
                          </div>
                          <div className="mop-info-box">
                            <p className="mop-info-label">📦 배송지</p>
                            <p>{order.shippingAddress?.recipient} · {order.shippingAddress?.phone}</p>
                            <p>
                              {order.shippingAddress?.zipCode} {order.shippingAddress?.address}{' '}
                              {order.shippingAddress?.detailAddress}
                            </p>
                          </div>
                          <div className="mop-info-box">
                            <p className="mop-info-label">💳 결제</p>
                            <p>{PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}</p>
                            <p>{order.paymentStatus === 'paid' ? '결제 완료' : '결제 대기'}</p>
                            {order.paidAt && (
                              <p className="mop-paid-at">{new Date(order.paidAt).toLocaleString('ko-KR')}</p>
                            )}
                          </div>
                        </div>

                        {order.trackingNumber && (
                          <div className="mop-tracking">
                            <span>🚚 {order.carrier}</span>
                            <span className="mop-tracking-num">{order.trackingNumber}</span>
                          </div>
                        )}

                        {order.statusHistory?.length > 0 && (
                          <div className="mop-history">
                            <p className="mop-info-label">주문 이력</p>
                            <div className="mop-timeline">
                              {[...order.statusHistory].reverse().map((h, i) => (
                                <div key={i} className="mop-timeline-item">
                                  <span className="mop-tl-dot" />
                                  <div>
                                    <strong>{STATUS_LABEL[h.status]?.text ?? h.status}</strong>
                                    {h.memo && <span className="mop-tl-memo"> — {h.memo}</span>}
                                    <p className="mop-tl-date">
                                      {new Date(h.changedAt).toLocaleString('ko-KR')}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {order.status !== 'cancelled' && (
                          <div className="aom-admin-panel">
                            <p className="aom-panel-title">관리자 처리</p>

                            <div className="aom-action-row">
                              <span className="aom-action-label">주문 상태</span>
                              <div className="aom-status-control">
                                <select
                                  className="aom-select aom-status-select"
                                  value={statusDraft}
                                  disabled={isActing || order.status === 'cancelled'}
                                  onChange={(e) => setStatusDraft(order._id, e.target.value)}
                                >
                                  {availableStatuses.map((s) => (
                                    <option key={s} value={s}>{STATUS_LABEL[s].text}</option>
                                  ))}
                                </select>
                                {statusDirty && (
                                  <button
                                    type="button"
                                    className="aom-btn aom-btn--blue aom-btn--confirm"
                                    disabled={isActing}
                                    onClick={() => handleStatusConfirm(order)}
                                  >
                                    확인
                                  </button>
                                )}
                              </div>
                            </div>

                            {order.status === 'pending' && order.paymentStatus === 'unpaid' && (
                              <div className="aom-action-row">
                                <span className="aom-action-label">결제 처리</span>
                                <button
                                  type="button"
                                  className="aom-btn aom-btn--blue"
                                  disabled={isActing}
                                  onClick={() => handleConfirmPayment(order)}
                                >
                                  결제 확인
                                </button>
                              </div>
                            )}

                            {['confirmed', 'shipped'].includes(order.status) && (
                              <div className="aom-tracking-form">
                                <span className="aom-action-label">운송장</span>
                                <select
                                  className="aom-select"
                                  value={trackForm.carrier}
                                  onChange={(e) => setTrackingField(order._id, 'carrier', e.target.value)}
                                >
                                  {CARRIERS.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                                <input
                                  className="aom-input"
                                  placeholder="운송장 번호"
                                  value={trackForm.trackingNumber}
                                  onChange={(e) => setTrackingField(order._id, 'trackingNumber', e.target.value)}
                                />
                                <button
                                  type="button"
                                  className="aom-btn aom-btn--purple"
                                  disabled={isActing}
                                  onClick={() => handleTrackingSubmit(order)}
                                >
                                  {order.trackingNumber ? '운송장 수정' : '운송장 등록'}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className="mop-pagination">
                <button
                  type="button"
                  className="mop-page-btn"
                  disabled={filter.page <= 1}
                  onClick={() => setFilter((p) => ({ ...p, page: p.page - 1 }))}
                >
                  ‹
                </button>
                <span className="mop-page-info">{filter.page} / {totalPages}</span>
                <button
                  type="button"
                  className="mop-page-btn"
                  disabled={filter.page >= totalPages}
                  onClick={() => setFilter((p) => ({ ...p, page: p.page + 1 }))}
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </PageShell>
  )
}

export default AdminOrdersPage
