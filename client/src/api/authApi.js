import api from './index'

export const register = async ({ name, email, password, phone }) => {
  const { data } = await api.post('/auth/register', { name, email, password, phone })
  return data
}

export const login = async ({ email, password }) => {
  const { data } = await api.post('/auth/login', { email, password })
  return data
}

export const updateMe = async ({ name, email, phone }) => {
  const { data } = await api.put('/auth/me', { name, email, phone })
  return data
}

export const updatePassword = async ({ currentPassword, newPassword }) => {
  const { data } = await api.put('/auth/password', { currentPassword, newPassword })
  return data
}

export const getMe = async () => {
  const { data } = await api.get('/auth/me')
  return data
}
