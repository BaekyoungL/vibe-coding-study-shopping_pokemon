import api from './index'

export const generateProductCode = async () => {
  const { data } = await api.get('/products/generate-code')
  return data
}

export const getProducts = async (params = {}) => {
  const { data } = await api.get('/products', { params })
  return data
}

export const getProduct = async (id) => {
  const { data } = await api.get(`/products/${id}`)
  return data
}

export const createProduct = async (body) => {
  const { data } = await api.post('/products', body)
  return data
}

export const updateProduct = async (id, body) => {
  const { data } = await api.put(`/products/${id}`, body)
  return data
}

export const deleteProduct = async (id) => {
  const { data } = await api.delete(`/products/${id}`)
  return data
}

export const updateStock = async (id, quantity, type = 'set') => {
  const { data } = await api.patch(`/products/${id}/stock`, { quantity, type })
  return data
}
