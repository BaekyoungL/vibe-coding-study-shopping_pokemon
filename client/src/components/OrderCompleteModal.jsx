import PokeballIcon from './PokeballIcon'

const PAYMENT_LABEL = { card: '신용카드', transfer: '계좌이체', kakao: '카카오페이' }

function OrderCompleteModal({ order, onClose, onGoToList }) {
  if (!order) return null

  const handleGoToList = () => {
    onGoToList?.()
    onClose()
  }

  return (
    <div
      className="modal-overlay ocm-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ocm-title"
    >
      <div className="ocm-card">
        <div className="ocm-header">
          <PokeballIcon variant="modal" />
          <div className="ocm-header-text">
            <p className="ocm-brand">포켓몬 샵</p>
            <h2 id="ocm-title" className="ocm-title">주문 완료</h2>
          </div>
          <button type="button" className="ocm-close" onClick={onClose} aria-label="닫기">✕</button>
        </div>

        <div className="ocm-body">
          <div className="ocm-check" aria-hidden="true">
            <span>✓</span>
            <div className="ocm-check-ring" />
          </div>

          <h3 className="ocm-message">주문이 성공적으로 완료되었습니다.</h3>
          <p className="ocm-sub">결제가 확인되었습니다. 곧 포켓몬 굿즈가 출발합니다!</p>

          <div className="ocm-order-number">
            <span>주문번호</span>
            <strong>{order.orderNumber}</strong>
          </div>

          <div className="ocm-summary">
            <div className="ocm-row">
              <span>상품금액</span>
              <span>{order.itemsPrice?.toLocaleString()}원</span>
            </div>
            <div className="ocm-row">
              <span>배송비</span>
              <span className={order.shippingFee === 0 ? 'ocm-free' : ''}>
                {order.shippingFee === 0 ? '무료' : `${order.shippingFee?.toLocaleString()}원`}
              </span>
            </div>
            <div className="ocm-row ocm-row--total">
              <span>최종 결제금액</span>
              <strong>{order.totalPrice?.toLocaleString()}원</strong>
            </div>
          </div>

          <div className="ocm-meta">
            <span>💳 {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}</span>
            {order.paidAt && (
              <span>
                {new Date(order.paidAt).toLocaleString('ko-KR', {
                  year: 'numeric', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            )}
          </div>

          <button type="button" className="ocm-primary-btn" onClick={handleGoToList}>
            주문 목록으로
          </button>
        </div>
      </div>
    </div>
  )
}

export default OrderCompleteModal
