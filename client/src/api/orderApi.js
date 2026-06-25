import api from './index'

export const createOrder = async (body) => {
  const { data } = await api.post('/orders', body)
  return data
}

export const getMyOrders = async (params = {}) => {
  const { data } = await api.get('/orders/me', { params })
  return data
}

export const getOrder = async (id) => {
  const { data } = await api.get(`/orders/${id}`)
  return data
}

export const payOrder = async (id, imp_uid, merchant_uid) => {
  const { data } = await api.patch(`/orders/${id}/pay`, { imp_uid, merchant_uid })
  return data
}

export const getAllOrders = async (params = {}) => {
  const { data } = await api.get('/orders', { params })
  return data
}

export const getOrderStats = async () => {
  const { data } = await api.get('/orders/stats')
  return data
}

export const updateOrderStatus = async (id, body) => {
  const { data } = await api.patch(`/orders/${id}/status`, body)
  return data
}

export const confirmOrderPayment = async (id, paymentKey = '') => {
  const { data } = await api.patch(`/orders/${id}/payment`, { paymentKey })
  return data
}

export const updateOrderTracking = async (id, body) => {
  const { data } = await api.patch(`/orders/${id}/tracking`, body)
  return data
}
