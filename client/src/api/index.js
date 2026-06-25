import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})
// 요청 인터셉터 - 토큰 자동 첨부
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 응답 인터셉터 - 에러 메시지 정규화
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    return Promise.reject(new Error(message))
  }
)

export default api
