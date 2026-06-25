import api from './index'

export const getMyCart        = ()                      => api.get('/cart').then(r => r.data)
export const addItemToCart    = (productId, quantity)   => api.post('/cart/items', { productId, quantity }).then(r => r.data)
export const updateCartItem   = (productId, quantity)   => api.put(`/cart/items/${productId}`, { quantity }).then(r => r.data)
export const removeCartItem   = (productId)             => api.delete(`/cart/items/${productId}`).then(r => r.data)
export const toggleSelectItem = (productId)             => api.patch(`/cart/items/${productId}/select`).then(r => r.data)
export const toggleSelectAll  = (selected)              => api.patch('/cart/select-all', { selected }).then(r => r.data)
export const clearCart        = ()                      => api.delete('/cart').then(r => r.data)
export const removeSelected   = ()                      => api.delete('/cart/selected').then(r => r.data)
