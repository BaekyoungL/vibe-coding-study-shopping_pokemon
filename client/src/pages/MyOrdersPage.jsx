import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyOrders, payOrder } from '../api/orderApi'
import {
  ensurePortOneReady,
  invokePortOnePayment,
  parsePaymentRedirect,
  clearPaymentRedirectQuery,
  getPendingPayment,
  clearPendingPayment,
  savePendingPayment,
} from '../utils/portonePay'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/Navbar'
import EditProfileModal from '../components/EditProfileModal'
import LoginModal from '../components/LoginModal'
import RegisterModal from '../components/RegisterModal'
import OrderCompleteModal from '../components/OrderCompleteModal'
import PageShell from '../components/PageShell'
import PageHero from '../components/PageHero'
import '../App.css'

const STATUS_LABEL = {
  pending:   { text: '주문 접수',  color: '#f59e0b', bg: '#fef3c7' },
  confirmed: { text: '결제 확인',  color: '#3b82f6', bg: '#eff6ff' },
  shipped:   { text: '배송 중',    color: '#8b5cf6', bg: '#f5f3ff' },
  delivered: { text: '배송 완료',  color: '#16a34a', bg: '#f0fdf4' },
  cancelled: { text: '주문 취소',  color: '#dc2626', bg: '#fef2f2' },
}

const PAYMENT_LABEL = { card: '신용카드', transfer: '계좌이체', kakao: '카카오페이' }

const isPaidOrder = (order) => order?.paymentStatus === 'paid'

function StatusBadge({ status, clickable, onClick }) {
  const s = STATUS_LABEL[status] ?? { text: status, color: '#6b7280', bg: '#f3f4f6' }
  if (clickable) {
    return (
      <span
        role="button"
        tabIndex={0}
        className="mop-status-badge mop-status-badge--clickable"
        style={{ color: s.color, background: s.bg }}
        onClick={(e) => { e.stopPropagation(); onClick?.() }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            e.stopPropagation()
            onClick?.()
          }
        }}
        title="주문 완료 확인"
      >
        {s.text}
      </span>
    )
  }
  return (
    <span className="mop-status-badge" style={{ color: s.color, background: s.bg }}>
      {s.text}
    </span>
  )
}

function MyOrdersPage() {
  const navigate = useNavigate()
  const { user, setUser, logout } = useAuth()

  const [orders, setOrders]     = useState([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [page, setPage]         = useState(1)
  const [expanded, setExpanded] = useState(null) // 펼친 주문 _id

  const [showEdit,     setShowEdit]     = useState(false)
  const [showLogin,    setShowLogin]    = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  const LIMIT = 10
  const [payingId, setPayingId] = useState(null) // 결제 중인 주문 ID
  const [completeOrder, setCompleteOrder] = useState(null) // 주문 완료 모달

  const openCompleteModal = useCallback((order) => {
    setCompleteOrder(order)
  }, [])

  const closeCompleteModal = useCallback(() => {
    setCompleteOrder(null)
  }, [])

  const goToOrderList = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  /* 비로그인 리다이렉트 */
  useEffect(() => {
    if (!localStorage.getItem('token')) navigate('/')
  }, [])

  /* 주문 목록 fetch */
  const fetchOrders = useCallback(() => {
    if (!localStorage.getItem('token')) return
    setLoading(true)
    getMyOrders({ page, limit: LIMIT })
      .then((res) => { setOrders(res.data ?? []); setTotal(res.total ?? 0) })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  /* PortOne SDK 선로드 */
  useEffect(() => {
    ensurePortOneReady().catch(() => {})
  }, [])

  const cancelPay = useCallback(() => {
    setPayingId(null)
    document.body.classList.remove('portone-paying')
    clearPendingPayment()
  }, [])

  /* 결제 REDIRECTION 복귀 처리 */
  useEffect(() => {
    const redirect = parsePaymentRedirect()
    if (!redirect) return

    clearPaymentRedirectQuery()

    if (redirect.code) {
      clearPendingPayment()
      alert(`결제에 실패했습니다.\n${redirect.message || redirect.code}`)
      return
    }

    const pending = getPendingPayment()
    if (!pending?.orderId) {
      alert('결제 정보를 찾을 수 없습니다.\n주문 목록에서 다시 시도해주세요.')
      return
    }

    payOrder(pending.orderId, redirect.paymentId, redirect.paymentId)
      .then((res) => {
        fetchOrders()
        openCompleteModal(res.data ?? { orderNumber: pending.orderNumber })
      })
      .catch(() => {
        alert(`결제는 완료됐지만 서버 처리에 실패했습니다.\n고객센터에 문의해주세요.\npaymentId: ${redirect.paymentId}`)
      })
      .finally(() => clearPendingPayment())
  }, [fetchOrders, openCompleteModal])

  /* ── 포트원 V2 결제 요청 ── */
  const handlePay = useCallback(async (order) => {
    let paymentCall
    try {
      paymentCall = await invokePortOnePayment(order, user)
    } catch (err) {
      alert(err?.message ?? '결제를 시작할 수 없습니다.')
      return
    }

    const { promise, meta } = paymentCall

    if (meta.isRedirect) {
      savePendingPayment(meta)
    }

    document.body.classList.add('portone-paying')
    setPayingId(order._id)

    promise
      .then((response) => {
        if (meta.isRedirect || !response) return

        if (response.code) {
          if (response.code !== 'PAYMENT_CANCELLED') {
            alert(`결제에 실패했습니다.\n${response.message ?? response.code}`)
          }
          return
        }

        return payOrder(meta.orderId, response.paymentId, response.paymentId)
          .then((res) => {
            fetchOrders()
            openCompleteModal(res.data ?? { ...order, orderNumber: meta.orderNumber, paymentStatus: 'paid', status: 'confirmed' })
          })
          .catch(() => {
            alert(`결제는 완료됐지만 서버 처리에 실패했습니다.\n고객센터에 문의해주세요.\npaymentId: ${response.paymentId}`)
          })
      })
      .catch((err) => {
        if (err?.message === 'PAYMENT_TIMEOUT') {
          alert('결제창 응답이 없습니다.\n화면이 멈춘 것 같다면 아래 "결제 취소"를 누르거나 페이지를 새로고침해주세요.')
          return
        }
        alert(err?.message ?? '결제 중 오류가 발생했습니다.')
      })
      .finally(() => {
        setPayingId(null)
        document.body.classList.remove('portone-paying')
        if (!meta.isRedirect) clearPendingPayment()
      })
  }, [fetchOrders, user, openCompleteModal])

  const totalPages = Math.ceil(total / LIMIT)

  const toggle = (id) => setExpanded((v) => (v === id ? null : id))

  return (
    <PageShell>
      <Navbar user={user} onLogout={logout} onEditProfile={() => setShowEdit(true)}
        onLoginClick={() => setShowLogin(true)} onRegisterClick={() => setShowRegister(true)} />

      <PageHero
        title="내 주문 목록"
        subtitle={!loading && <>총 <strong>{total}</strong>건의 주문 내역</>}
        onBack={() => navigate(-1)}
        backLabel="← 돌아가기"
      />

      <main className="page-main">

        {loading ? (
          <div className="mop-loading">
            {Array.from({ length: 3 }, (_, i) => <div key={i} className="mop-skeleton" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="mop-empty">
            <span>📦</span>
            <p>아직 주문 내역이 없습니다.</p>
            <button className="mop-shop-btn" onClick={() => navigate('/')}>쇼핑하러 가기</button>
          </div>
        ) : (
          <>
            <div className="mop-list">
              {orders.map((order) => {
                const isOpen = expanded === order._id
                return (
                  <div key={order._id}
                    className={`mop-card ${isOpen ? 'mop-card--open' : ''}`}
                    style={{ '--status-color': STATUS_LABEL[order.status]?.color ?? '#9ca3af' }}>

                    {/* 상태 컬러 탑 바 */}
                    <div className="mop-card-topbar" />

                    {/* 주문 헤더 행 — button 중첩 방지를 위해 div 사용 */}
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
                          <StatusBadge
                            status={order.status}
                            clickable={isPaidOrder(order) && order.status === 'confirmed'}
                            onClick={() => openCompleteModal(order)}
                          />
                        </div>
                        <span className="mop-order-date">
                          {new Date(order.createdAt).toLocaleDateString('ko-KR', {
                            year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
                          })}
                        </span>
                      </div>
                      <div className="mop-card-right">
                        <div className="mop-total-wrap">
                          <span className="mop-total-label">총 결제금액</span>
                          <span className="mop-order-total">
                            {order.totalPrice?.toLocaleString()}원
                          </span>
                        </div>
                        {order.paymentStatus === 'unpaid' && (
                          <button
                            className="mop-pay-btn"
                            disabled={payingId === order._id}
                            onClick={(e) => { e.stopPropagation(); handlePay(order) }}
                          >
                            {payingId === order._id ? '결제 중…' : '결제하기'}
                          </button>
                        )}
                        <span className="mop-chevron">{isOpen ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {/* 주문 상품 미리보기 (접혀있을 때) */}
                    {!isOpen && (
                      <div className="mop-preview">
                        {order.items.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="mop-preview-item">
                            {item.imageUrl
                              ? <img src={item.imageUrl} alt={item.name} />
                              : <span>🎴</span>
                            }
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <span className="mop-preview-more">+{order.items.length - 3}</span>
                        )}
                        <span className="mop-preview-name">
                          {order.items[0].name}
                          {order.items.length > 1 && ` 외 ${order.items.length - 1}개`}
                        </span>
                      </div>
                    )}

                    {/* 상세 펼침 */}
                    {isOpen && (
                      <div className="mop-detail">
                        {/* 상품 목록 */}
                        <div className="mop-items">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="mop-item">
                              <div className="mop-item-img">
                                {item.imageUrl
                                  ? <img src={item.imageUrl} alt={item.name} />
                                  : <span>🎴</span>
                                }
                              </div>
                              <div className="mop-item-info">
                                <p className="mop-item-name">{item.name}</p>
                                <p className="mop-item-meta">
                                  {item.quantity}개 ·&nbsp;
                                  {item.discountRate > 0 && (
                                    <span className="mop-item-original">
                                      {item.originalPrice?.toLocaleString()}원
                                    </span>
                                  )}
                                  <span className="mop-item-price">{item.price?.toLocaleString()}원</span>
                                </p>
                              </div>
                              <span className="mop-item-subtotal">
                                {(item.price * item.quantity)?.toLocaleString()}원
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* 금액 요약 */}
                        <div className="mop-summary">
                          <div className="mop-summary-row">
                            <span>상품금액</span><span>{order.itemsPrice?.toLocaleString()}원</span>
                          </div>
                          <div className="mop-summary-row">
                            <span>배송비</span>
                            <span className={order.shippingFee === 0 ? 'mop-free' : ''}>
                              {order.shippingFee === 0 ? '무료' : `${order.shippingFee?.toLocaleString()}원`}
                            </span>
                          </div>
                          {order.discountAmount > 0 && (
                            <div className="mop-summary-row mop-discount">
                              <span>할인금액</span>
                              <span>-{order.discountAmount?.toLocaleString()}원</span>
                            </div>
                          )}
                          <div className="mop-summary-row mop-summary-total">
                            <span>최종 결제금액</span>
                            <strong>{order.totalPrice?.toLocaleString()}원</strong>
                          </div>
                        </div>

                        {/* 배송지 + 결제 정보 */}
                        <div className="mop-info-grid">
                          <div className="mop-info-box">
                            <p className="mop-info-label">📦 배송지</p>
                            <p>{order.shippingAddress?.recipient}</p>
                            <p>{order.shippingAddress?.phone}</p>
                            <p>{order.shippingAddress?.zipCode} {order.shippingAddress?.address}</p>
                            {order.shippingAddress?.detailAddress && (
                              <p>{order.shippingAddress.detailAddress}</p>
                            )}
                          </div>
                          <div className="mop-info-box">
                            <p className="mop-info-label">💳 결제 정보</p>
                            <p>{PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}</p>
                            {isPaidOrder(order) ? (
                              <button
                                type="button"
                                className="mop-pay-status mop-pay-status--paid mop-pay-status--clickable"
                                onClick={() => openCompleteModal(order)}
                              >
                                결제 완료 · 주문 확인 보기
                              </button>
                            ) : (
                              <p className="mop-pay-status">결제 대기</p>
                            )}
                            {order.paidAt && (
                              <p className="mop-paid-at">
                                {new Date(order.paidAt).toLocaleString('ko-KR')}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* 배송 추적 */}
                        {order.trackingNumber && (
                          <div className="mop-tracking">
                            <span>🚚 {order.carrier}</span>
                            <span className="mop-tracking-num">{order.trackingNumber}</span>
                          </div>
                        )}

                        {/* 메모 */}
                        {order.memo && (
                          <p className="mop-memo">📝 {order.memo}</p>
                        )}

                        {/* 상태 이력 */}
                        {order.statusHistory?.length > 0 && (
                          <div className="mop-history">
                            <p className="mop-info-label">주문 이력</p>
                            <div className="mop-timeline">
                              {[...order.statusHistory].reverse().map((h, i) => {
                                const isConfirmStep = h.status === 'confirmed' && isPaidOrder(order)
                                return (
                                <div key={i} className="mop-timeline-item">
                                  <span className="mop-tl-dot" />
                                  <div>
                                    {isConfirmStep ? (
                                      <button
                                        type="button"
                                        className="mop-tl-status mop-tl-status--clickable"
                                        onClick={() => openCompleteModal(order)}
                                        title="주문 완료 확인"
                                      >
                                        {STATUS_LABEL[h.status]?.text ?? h.status}
                                      </button>
                                    ) : (
                                      <span className="mop-tl-status">
                                        {STATUS_LABEL[h.status]?.text ?? h.status}
                                      </span>
                                    )}
                                    <span className="mop-tl-date">
                                      {new Date(h.changedAt).toLocaleString('ko-KR')}
                                    </span>
                                    {h.memo && <span className="mop-tl-memo">{h.memo}</span>}
                                  </div>
                                </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="mop-pagination">
                <button className="mop-pg-btn" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p}
                    className={`mop-pg-btn ${p === page ? 'mop-pg-btn--active' : ''}`}
                    onClick={() => setPage(p)}>
                    {p}
                  </button>
                ))}
                <button className="mop-pg-btn" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {payingId && (
        <div className="mop-paying-bar">
          <p>KG이니시스 결제창에서 결제를 진행해주세요. 결제창이 보이지 않으면 새로고침 후 다시 시도해주세요.</p>
          <button type="button" className="mop-paying-cancel" onClick={cancelPay}>
            결제 취소
          </button>
        </div>
      )}

      {completeOrder && (
        <OrderCompleteModal
          order={completeOrder}
          onClose={closeCompleteModal}
          onGoToList={goToOrderList}
        />
      )}

      {showEdit && user && (
        <EditProfileModal user={user} onClose={() => setShowEdit(false)} onUpdate={setUser} />
      )}
      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} onLoginSuccess={setUser} />
      )}
      {showRegister && (
        <RegisterModal onClose={() => setShowRegister(false)}
          onRegisterSuccess={() => { const s = localStorage.getItem('user'); if (s) setUser(JSON.parse(s)) }} />
      )}
    </PageShell>
  )
}

export default MyOrdersPage
