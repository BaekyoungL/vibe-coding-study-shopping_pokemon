import api from './index'

export const getDashboardStats = async () => {
  const { data } = await api.get('/admin/stats')
  return data
}
