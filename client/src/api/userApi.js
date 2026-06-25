import api from './index'

export const getUsers = async (params = {}) => {
  const { data } = await api.get('/users', { params })
  return data
}

export const updateUser = async (id, body) => {
  const { data } = await api.put(`/users/${id}`, body)
  return data
}

export const deleteUser = async (id) => {
  const { data } = await api.delete(`/users/${id}`)
  return data
}
