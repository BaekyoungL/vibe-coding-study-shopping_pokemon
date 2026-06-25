import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import * as cartApi from '../api/cartApi'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems]   = useState([])   // populated cart items
  const [loading, setLoading] = useState(false)

  /* 로그인 여부는 토큰으로 판단 */
  const isLoggedIn = () => Boolean(localStorage.getItem('token'))

  /* ── 카트 로드 ── */
  const loadCart = useCallback(async () => {
    if (!isLoggedIn()) { setItems([]); return }
    setLoading(true)
    try {
      const res = await cartApi.getMyCart()
      setItems(res.data?.items ?? [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  /* 앱 시작 + auth 변경 시 카트 갱신 */
  useEffect(() => {
    loadCart()
    const handler = () => loadCart()
    window.addEventListener('pokemon-auth-change', handler)
    return () => window.removeEventListener('pokemon-auth-change', handler)
  }, [loadCart])

  /* ── API 래퍼 — 결과로 items 갱신 ── */
  const withSync = (fn) => async (...args) => {
    const res = await fn(...args)
    setItems(res.data?.items ?? [])
    return res
  }

  const addToCart    = withSync((productId, qty = 1) => cartApi.addItemToCart(productId, qty))
  const updateItem   = withSync((productId, qty)     => cartApi.updateCartItem(productId, qty))
  const removeItem   = withSync((productId)          => cartApi.removeCartItem(productId))
  const toggleSelect = withSync((productId)          => cartApi.toggleSelectItem(productId))
  const selectAll    = withSync((flag)               => cartApi.toggleSelectAll(flag))
  const clearAll     = withSync(()                   => cartApi.clearCart())
  const removeSelectedItems = withSync(()            => cartApi.removeSelected())

  /* ── 파생 값 ── */
  const cartCount     = items.reduce((s, i) => s + i.quantity, 0)
  const selectedItems = items.filter((i) => i.selected)
  const selectedTotal = selectedItems.reduce((s, i) => {
    const p = i.product
    if (!p) return s
    const rate = p.discount?.rate ?? 0
    const price = rate > 0 ? Math.round(p.price * (1 - rate / 100)) : p.price
    return s + price * i.quantity
  }, 0)
  const allSelected = items.length > 0 && items.every((i) => i.selected)

  return (
    <CartContext.Provider value={{
      items, loading, cartCount,
      selectedItems, selectedTotal, allSelected,
      loadCart, addToCart, updateItem, removeItem,
      toggleSelect, selectAll, clearAll, removeSelectedItems,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
