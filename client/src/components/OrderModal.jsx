import { useState } from 'react'
import { createOrder } from '../api/orderApi'

import PokeballIcon from './PokeballIcon'

const PAYMENT_OPTIONS = [
  { value: 'card',     label: '💳 신용카드' },
  { value: 'transfer', label: '🏦 계좌이체' },
  { value: 'kakao',    label: '💛 카카오페이' },
]

const calcUnitPrice = (product) => {
  const rate = product.discount?.rate ?? 0
  return rate > 0 ? Math.round(product.price * (1 - rate / 100)) : product.price
}

function OrderModal({ items, onClose, onSuccess }) {
  const [form, setForm] = useState({
    recipient: '', phone: '', zipCode: '', address: '', detailAddress: '',
    memo: '', paymentMethod: 'card',
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [done,    setDone]    = useState(false)
  const [result,  setResult]  = useState(null)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  /* 주문 완료 후에는 어떻게 닫아도 onSuccess(장바구니 정리) 호출 */
  const handleClose = () => {
    if (done) { onSuccess?.(); }
    else { onClose(); }
  }

  const itemsPrice  = items.reduce((s, { product, quantity }) => s + calcUnitPrice(product) * quantity, 0)
  const shippingFee = itemsPrice >= 30000 ? 0 : 3000
  const totalPrice  = itemsPrice + shippingFee

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.recipient || !form.phone || !form.zipCode || !form.address) {
      setError('배송지 정보를 모두 입력해주세요.'); return
    }
    setLoading(true); setError('')
    try {
      const res = await createOrder({
        items: items.map(({ product, quantity }) => ({
          product: product._id,
          name:    product.name,
          quantity,
        })),
        shippingAddress: {
          recipient:     form.recipient,
          phone:         form.phone,
          zipCode:       form.zipCode,
          address:       form.address,
          detailAddress: form.detailAddress,
        },
        paymentMethod: form.paymentMethod,
        memo: form.memo,
      })
      setResult(res.data)
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.message ?? '주문 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="om-card">

        {/* ── 헤더 ── */}
        <div className="om-header">
          <PokeballIcon variant="modal" />
          <div className="om-header-text">
            <p className="om-brand">포켓몬 샵</p>
            <h2 className="om-title">{done ? '주문 완료' : '주문하기'}</h2>
          </div>
          <button className="om-close" onClick={handleClose} aria-label="닫기">✕</button>
        </div>

        {done ? (
          /* ── 주문 완료 ── */
          <div className="om-success">
            <div className="om-success-ball">✓</div>
            <h3>주문이 완료되었습니다!</h3>
            <div className="om-order-number">
              <span>주문번호</span>
              <strong>{result?.orderNumber}</strong>
            </div>
            <div className="om-success-table">
              <div className="om-strow">
                <span>상품금액</span>
                <span>{result?.itemsPrice?.toLocaleString()}원</span>
              </div>
              <div className="om-strow">
                <span>배송비</span>
                <span className={result?.shippingFee === 0 ? 'om-free' : ''}>
                  {result?.shippingFee === 0 ? '무료' : `${result?.shippingFee?.toLocaleString()}원`}
                </span>
              </div>
              <div className="om-strow om-strow--total">
                <span>최종 결제금액</span>
                <strong>{result?.totalPrice?.toLocaleString()}원</strong>
              </div>
            </div>
            <p className="om-success-desc">
              주문 내역은 <strong>내 주문 목록</strong>에서 확인할 수 있습니다.
            </p>
            <button className="om-submit-btn" onClick={onSuccess}>확인</button>
          </div>

        ) : (
          <form className="om-form" onSubmit={handleSubmit}>

            {/* ── 주문 상품 요약 ── */}
            <section className="om-section">
              <h3 className="om-section-title">🛍 주문 상품</h3>
              <div className="om-items">
                {items.map(({ product, quantity }) => {
                  const unitPrice = calcUnitPrice(product)
                  const img = product.images?.[0]?.url
                  return (
                    <div key={product._id} className="om-item">
                      <div className="om-item-img">
                        {img ? <img src={img} alt={product.name} /> : <span>🎴</span>}
                      </div>
                      <div className="om-item-info">
                        <p className="om-item-name">{product.name}</p>
                        <p className="om-item-meta">{product.vendor} · 수량 {quantity}개</p>
                      </div>
                      <span className="om-item-price">{(unitPrice * quantity).toLocaleString()}원</span>
                    </div>
                  )
                })}
              </div>
              {/* 금액 내역 */}
              <div className="om-price-box">
                <div className="om-price-row">
                  <span>상품금액</span><span>{itemsPrice.toLocaleString()}원</span>
                </div>
                <div className="om-price-row">
                  <span>배송비</span>
                  <span className={shippingFee === 0 ? 'om-free' : ''}>
                    {shippingFee === 0 ? '무료 (3만원 이상 구매)' : `${shippingFee.toLocaleString()}원`}
                  </span>
                </div>
                <div className="om-price-row om-price-row--total">
                  <span>최종 결제금액</span>
                  <strong>{totalPrice.toLocaleString()}원</strong>
                </div>
              </div>
            </section>

            {/* ── 배송지 ── */}
            <section className="om-section">
              <h3 className="om-section-title">📦 배송지</h3>
              <div className="om-grid">
                <label className="om-label">
                  받는 분 <span className="om-required">*</span>
                  <input value={form.recipient} onChange={(e) => set('recipient', e.target.value)}
                    placeholder="받는 분 이름" required />
                </label>
                <label className="om-label">
                  전화번호 <span className="om-required">*</span>
                  <input value={form.phone} onChange={(e) => set('phone', e.target.value)}
                    placeholder="010-0000-0000" required />
                </label>
                <label className="om-label om-full">
                  우편번호 <span className="om-required">*</span>
                  <input value={form.zipCode} onChange={(e) => set('zipCode', e.target.value)}
                    placeholder="우편번호" required />
                </label>
                <label className="om-label om-full">
                  주소 <span className="om-required">*</span>
                  <input value={form.address} onChange={(e) => set('address', e.target.value)}
                    placeholder="기본 주소" required />
                </label>
                <label className="om-label om-full">
                  상세 주소
                  <input value={form.detailAddress} onChange={(e) => set('detailAddress', e.target.value)}
                    placeholder="상세 주소 (선택)" />
                </label>
              </div>
            </section>

            {/* ── 결제 수단 ── */}
            <section className="om-section">
              <h3 className="om-section-title">💳 결제 수단</h3>
              <div className="om-payment-row">
                {PAYMENT_OPTIONS.map(({ value, label }) => (
                  <label key={value}
                    className={`om-payment-opt ${form.paymentMethod === value ? 'om-payment-opt--active' : ''}`}>
                    <input type="radio" name="pm" value={value}
                      checked={form.paymentMethod === value}
                      onChange={() => set('paymentMethod', value)} />
                    {label}
                  </label>
                ))}
              </div>
            </section>

            {/* ── 배송 메모 ── */}
            <section className="om-section om-section--last">
              <h3 className="om-section-title">📝 배송 메모</h3>
              <textarea className="om-textarea" value={form.memo}
                onChange={(e) => set('memo', e.target.value)}
                placeholder="배송 시 요청사항을 입력해주세요 (선택)" rows={2} />
            </section>

            {error && <p className="om-error">{error}</p>}

            <button type="submit" className="om-submit-btn" disabled={loading}>
              {loading
                ? <span className="om-loading-text">주문 처리 중...</span>
                : <>{totalPrice.toLocaleString()}원 결제하기</>
              }
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default OrderModal
