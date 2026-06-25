import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { login } from '../api/authApi'
import PokeballIcon from '../components/PokeballIcon'
import PageShell from '../components/PageShell'
import '../App.css'

function LoginPage() {
  const navigate = useNavigate()

  if (localStorage.getItem('token')) {
    return <Navigate to="/" replace />
  }
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const newErrors = {}
    if (!form.email.trim()) newErrors.email = '이메일을 입력해주세요.'
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) newErrors.email = '올바른 이메일 형식이 아닙니다.'
    if (!form.password) newErrors.password = '비밀번호를 입력해주세요.'
    return newErrors
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
    if (serverError) setServerError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    try {
      setLoading(true)
      const data = await login({ email: form.email, password: form.password })
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.data))
      navigate('/')
    } catch (err) {
      setServerError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell withFloatBalls={false} className="register-bg">
      <div className="register-card">

        <div className="card-header">
          <PokeballIcon variant="header" />
          <h1 className="brand-title">포켓몬 샵</h1>
          <p className="brand-sub">트레이너 로그인</p>
        </div>

        <form className="register-form" onSubmit={handleSubmit} noValidate>

          <div className="field-group">
            <label htmlFor="email">이메일 <span className="required">*</span></label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="example@pokemon.com"
              value={form.email}
              onChange={handleChange}
              className={errors.email ? 'input-error' : ''}
              autoComplete="email"
            />
            {errors.email && <p className="error-msg">{errors.email}</p>}
          </div>

          <div className="field-group">
            <label htmlFor="password">비밀번호 <span className="required">*</span></label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={form.password}
              onChange={handleChange}
              className={errors.password ? 'input-error' : ''}
              autoComplete="current-password"
            />
            {errors.password && <p className="error-msg">{errors.password}</p>}
          </div>

          {serverError && (
            <div className="server-error-box">
              <span className="server-error-icon">⚠</span>
              {serverError}
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (
              <span className="btn-loading">
                <span className="spinner" />
                로그인 중...
              </span>
            ) : (
              '로그인'
            )}
          </button>

          <p className="login-link">
            아직 계정이 없으신가요?{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/register') }}>
              회원가입
            </a>
          </p>

        </form>
      </div>
    </PageShell>
  )
}

export default LoginPage
