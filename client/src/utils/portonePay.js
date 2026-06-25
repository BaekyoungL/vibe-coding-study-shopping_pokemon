import * as PortOne from '@portone/browser-sdk/v2'

const PAYMENT_ID_MAX_LEN = 40
const PAYMENT_TIMEOUT_MS = 120_000
const PORTONE_SCRIPT_URL = 'https://cdn.portone.io/v2/browser-sdk.js'

export const PENDING_PAYMENT_KEY = 'pokemon_pending_payment'

let portOneReadyPromise = null

const isMobileDevice = () =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

/** PortOne CDN SDK 선로드 — 클릭 시 결제창이 바로 뜨도록 */
export function ensurePortOneReady() {
  if (window.PortOne?.requestPayment) {
    return Promise.resolve(window.PortOne)
  }

  if (portOneReadyPromise) return portOneReadyPromise

  portOneReadyPromise = new Promise((resolve, reject) => {
    const finish = () => {
      if (window.PortOne?.requestPayment) {
        resolve(window.PortOne)
        return
      }
      portOneReadyPromise = null
      reject(new Error('PortOne SDK를 불러오지 못했습니다. 네트워크 연결을 확인해주세요.'))
    }

    const fail = () => {
      portOneReadyPromise = null
      reject(new Error('PortOne SDK 로드에 실패했습니다.'))
    }

    let script = document.querySelector(`script[src="${PORTONE_SCRIPT_URL}"]`)
    if (!script) {
      script = document.createElement('script')
      script.src = PORTONE_SCRIPT_URL
      script.async = true
      document.head.appendChild(script)
    }

    script.addEventListener('load', finish, { once: true })
    script.addEventListener('error', fail, { once: true })

    // index.html 등으로 이미 로드된 script는 load 이벤트가 다시 발생하지 않음
    queueMicrotask(() => {
      if (window.PortOne?.requestPayment) finish()
    })
  })

  return portOneReadyPromise
}

/** KG이니시스 oid(1~40자, ASCII만) */
export function buildPaymentId(order) {
  const base = (order.orderNumber ?? 'ORD')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 28)
  const unique = Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 5)
  const id = `${base}${unique}`
  return id.slice(0, PAYMENT_ID_MAX_LEN) || `P${Date.now()}`.slice(0, PAYMENT_ID_MAX_LEN)
}

/** KG이니시스 주문명 (40자 이내) */
export function buildOrderName(order) {
  const name = order.items.length === 1
    ? order.items[0].name
    : `${order.items[0].name} 외 ${order.items.length - 1}건`
  return name.slice(0, 40) || '포켓몬샵 주문'
}

export function formatPhoneNumber(raw = '') {
  const digits = String(raw).replace(/\D/g, '')
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return digits
}

/** KG이니시스 PC: 이름·연락처·이메일 필수 */
export function validatePaymentCustomer({ user, order }) {
  const addr = order.shippingAddress ?? {}
  const fullName = (addr.recipient || user?.name || '').trim()
  const email = (user?.email || '').trim()
  const phoneRaw = addr.phone || user?.phone || ''
  const phoneDigits = phoneRaw.replace(/\D/g, '')

  if (!fullName) {
    return { ok: false, message: '배송지 받는 분 이름이 필요합니다.\n주문 정보를 확인해주세요.' }
  }
  if (!email) {
    return { ok: false, message: '결제를 위해 로그인 계정 이메일이 필요합니다.\n내 정보 수정에서 이메일을 확인해주세요.' }
  }
  if (phoneDigits.length < 10) {
    return { ok: false, message: '결제를 위해 유효한 연락처(10~11자리)가 필요합니다.\n내 정보 수정 또는 주문 배송지 전화번호를 확인해주세요.' }
  }

  return {
    ok: true,
    customer: {
      fullName,
      email,
      phoneNumber: formatPhoneNumber(phoneDigits),
    },
  }
}

function buildInicisBypass(totalAmount, mobile) {
  if (totalAmount >= 1000) return undefined

  // KG이니시스: 1,000원 미만 결제 시 below1000 옵션 필수
  return mobile
    ? { inicis_v2: { P_RESERVED: ['below1000=Y'] } }
    : { inicis_v2: { acceptmethod: ['below1000'] } }
}

/**
 * 결제 파라미터 생성
 * - PC(inicis_v2): IFRAME만 지원, redirectUrl 사용 금지
 * - 모바일: REDIRECTION + redirectUrl
 */
export function buildPayParams(order, user) {
  const storeId = import.meta.env.VITE_PORTONE_STORE_ID
  const channelKey = import.meta.env.VITE_PORTONE_CHANNEL_KEY

  if (!storeId || !channelKey) {
    throw new Error('포트원 storeId 또는 channelKey가 설정되지 않았습니다.')
  }

  const validation = validatePaymentCustomer({ user, order })
  if (!validation.ok) {
    throw new Error(validation.message)
  }

  const method = order.paymentMethod ?? 'card'
  const payMethodMap = { card: 'CARD', transfer: 'TRANSFER', kakao: 'EASY_PAY' }
  const totalAmount = Math.round(Number(order.totalPrice))
  const mobile = isMobileDevice()

  if (!totalAmount || totalAmount < 1) {
    throw new Error('결제 금액이 올바르지 않습니다.')
  }

  const paymentId = buildPaymentId(order)
  const bypass = buildInicisBypass(totalAmount, mobile)

  const params = {
    storeId,
    channelKey,
    paymentId,
    orderName: buildOrderName(order),
    totalAmount,
    currency: 'CURRENCY_KRW',
    payMethod: payMethodMap[method] ?? 'CARD',
    locale: 'KO_KR',
    customer: validation.customer,
    windowType: mobile
      ? { mobile: 'REDIRECTION' }
      : { pc: 'IFRAME' },
    ...(method === 'kakao' && { easyPay: { easyPayProvider: 'KAKAOPAY' } }),
    ...(mobile && { redirectUrl: `${window.location.origin}/my/orders` }),
    ...(bypass && { bypass }),
  }

  return {
    params,
    meta: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      paymentId,
      isRedirect: mobile,
    },
  }
}

function withPaymentTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('PAYMENT_TIMEOUT')), PAYMENT_TIMEOUT_MS)
    }),
  ])
}

/** SDK 준비 후 결제 요청 (타임아웃 포함) */
export async function invokePortOnePayment(order, user) {
  await ensurePortOneReady()
  const { params, meta } = buildPayParams(order, user)
  const promise = withPaymentTimeout(PortOne.requestPayment(params))
  return { promise, meta, params }
}

/** redirectUrl 복귀 시 쿼리 파라미터 파싱 (모바일) */
export function parsePaymentRedirect() {
  const qs = new URLSearchParams(window.location.search)
  const paymentId = qs.get('paymentId')
  if (!paymentId) return null

  return {
    paymentId,
    code: qs.get('code'),
    message: qs.get('message') ?? qs.get('pgMessage'),
    txId: qs.get('txId'),
  }
}

export function clearPaymentRedirectQuery() {
  if (window.location.search) {
    window.history.replaceState({}, '', '/my/orders')
  }
}

export function savePendingPayment(meta) {
  sessionStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify(meta))
}

export function getPendingPayment() {
  try {
    return JSON.parse(sessionStorage.getItem(PENDING_PAYMENT_KEY) ?? 'null')
  } catch {
    return null
  }
}

export function clearPendingPayment() {
  sessionStorage.removeItem(PENDING_PAYMENT_KEY)
}
