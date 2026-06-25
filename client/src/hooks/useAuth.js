import { useState, useEffect } from 'react'
import { getMe } from '../api/authApi'

export function useAuth() {
  const storedUser = localStorage.getItem('user')
  const [user, setUser] = useState(storedUser ? JSON.parse(storedUser) : null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    getMe()
      .then((data) => {
        setUser(data.data)
        localStorage.setItem('user', JSON.stringify(data.data))
      })
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
      })
  }, [])

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    window.dispatchEvent(new CustomEvent('pokemon-auth-change', { detail: { user: null } }))
  }

  return { user, setUser, logout }
}
