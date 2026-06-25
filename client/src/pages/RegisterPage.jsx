import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { register } from '../api/authApi'
import '../App.css'

const TERMS = [
  {
    id: 'terms',
    label: '이용약관 동의',
    required: true,
    content: `제1조 (목적)
본 약관은 포켓몬 샵(이하 "회사")이 제공하는 서비스의 이용에 관한 조건 및 절차, 기타 필요한 사항을 규정함을 목적으로 합니다.

제2조 (서비스 이용)
회원은 회사가 정한 절차에 따라 서비스를 이용할 수 있으며, 서비스 이용 시 관련 법령 및 본 약관을 준수해야 합니다.

제3조 (회원의 의무)
회원은 타인의 정보를 도용하거나 허위 정보를 등록하는 행위를 해서는 안 됩니다.`,
  },
  {
    id: 'privacy',
    label: '개인정보 처리방침 동의',
    required: true,
    content: `수집하는 개인정보 항목
- 필수: 이름, 이메일, 비밀번호
- 선택: 전화번호, 배송지 주소

수집 및 이용 목적
- 회원 가입 및 서비스 제공
- 주문 및 배송 처리
- 고객 문의 응대

보유 및 이용 기간
회원 탈퇴 시까지 보유하며, 관련 법령에 따라 일정 기간 보관할 수 있습니다.`,
  },
  {
    id: 'marketing',
    label: '마케팅 정보 수신 동의',
    required: false,
    content: `포켓몬 샵의 신상품 안내, 이벤트, 프로모션 등의 마케팅 정보를 이메일 및 SMS로 수신합니다.
수신 동의 후에도 언제든지 수신을 거부할 수 있습니다.`,
  },
]

function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  })
  const [agreements, setAgreements] = useState({
    terms: false,
    privacy: false,
    marketing: false,
  })
  const [expanded, setExpanded] = useState({})
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const allRequired = TERMS.filter((t) => t.required).every((t) => agreements[t.id])
  const allChecked = TERMS.every((t) => agreements[t.id])

  const handleAgreeAll = () => {
    const next = !allChecked
    setAgreements({ terms: next, privacy: next, marketing: next })
    if (next && errors.agreements) setErrors((prev) => ({ ...prev, agreements: '' }))
  }

  const handleAgreement = (id) => {
    setAgreements((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      return next
    })
    if (errors.agreements) setErrors((prev) => ({ ...prev, agreements: '' }))
  }

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const validate = () => {
    const newErrors = {}
    if (!form.name.trim()) newErrors.name = '이름을 입력해주세요.'
    if (!form.email.trim()) newErrors.email = '이메일을 입력해주세요.'
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) newErrors.email = '올바른 이메일 형식이 아닙니다.'
    if (!form.password) newErrors.password = '비밀번호를 입력해주세요.'
    else if (form.password.length < 6) newErrors.password = '비밀번호는 최소 6자 이상이어야 합니다.'
    if (!form.confirmPassword) newErrors.confirmPassword = '비밀번호를 한 번 더 입력해주세요.'
    else if (form.password !== form.confirmPassword) newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.'
    if (!allRequired) newErrors.agreements = '필수 약관에 동의해주세요.'
    return newErrors
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
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
      const data = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
      })
      localStorage.setItem('token', data.token)
      setSubmitted(true)
    } catch (err) {
      setServerError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="register-bg">
        <div className="register-card success-card">
          <div className="pokeball-icon">
            <div className="pokeball-top" />
            <div className="pokeball-mid">
              <div className="pokeball-btn" />
            </div>
            <div className="pokeball-bottom" />
          </div>
          <h2 className="success-title">회원가입 완료!</h2>
          <p className="success-msg">
            <span className="highlight">{form.name}</span> 트레이너님,<br />
            포켓몬 샵에 오신 것을 환영합니다!
          </p>
          <button className="submit-btn" onClick={() => navigate('/')}>
            메인으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="register-bg">
      <div className="register-card">

        <div className="card-header">
          <div className="pokeball-deco">
            <div className="pb-top" />
            <div className="pb-strip">
              <div className="pb-btn" />
            </div>
            <div className="pb-bottom" />
          </div>
          <h1 className="brand-title">포켓몬 샵</h1>
          <p className="brand-sub">트레이너 등록</p>
        </div>

        <form className="register-form" onSubmit={handleSubmit} noValidate>

          <div className="field-group">
            <label htmlFor="name">트레이너 이름 <span className="required">*</span></label>
            <input
              id="name" name="name" type="text"
              placeholder="이름을 입력하세요"
              value={form.name} onChange={handleChange}
              className={errors.name ? 'input-error' : ''}
            />
            {errors.name && <p className="error-msg">{errors.name}</p>}
          </div>

          <div className="field-group">
            <label htmlFor="email">이메일 <span className="required">*</span></label>
            <input
              id="email" name="email" type="email"
              placeholder="example@pokemon.com"
              value={form.email} onChange={handleChange}
              className={errors.email ? 'input-error' : ''}
            />
            {errors.email && <p className="error-msg">{errors.email}</p>}
          </div>

          <div className="field-group">
            <label htmlFor="password">비밀번호 <span className="required">*</span></label>
            <input
              id="password" name="password" type="password"
              placeholder="6자 이상 입력하세요"
              value={form.password} onChange={handleChange}
              className={errors.password ? 'input-error' : ''}
            />
            {errors.password && <p className="error-msg">{errors.password}</p>}
          </div>

          <div className="field-group">
            <label htmlFor="confirmPassword">비밀번호 확인 <span className="required">*</span></label>
            <input
              id="confirmPassword" name="confirmPassword" type="password"
              placeholder="비밀번호를 한 번 더 입력하세요"
              value={form.confirmPassword} onChange={handleChange}
              className={errors.confirmPassword ? 'input-error' : ''}
            />
            {errors.confirmPassword && <p className="error-msg">{errors.confirmPassword}</p>}
          </div>

          <div className="field-group">
            <label htmlFor="phone">전화번호 <span className="optional">(선택)</span></label>
            <input
              id="phone" name="phone" type="tel"
              placeholder="010-0000-0000"
              value={form.phone} onChange={handleChange}
            />
          </div>

          {/* 약관 동의 */}
          <div className={`terms-box ${errors.agreements ? 'terms-box-error' : ''}`}>

            {/* 전체 동의 */}
            <label className="agree-all-row">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={handleAgreeAll}
                className="agree-checkbox"
              />
              <span className="agree-all-label">전체 동의</span>
            </label>

            <div className="terms-divider" />

            {/* 개별 항목 */}
            {TERMS.map((term) => (
              <div key={term.id} className="term-item">
                <div className="term-row">
                  <label className="term-check-label">
                    <input
                      type="checkbox"
                      checked={agreements[term.id]}
                      onChange={() => handleAgreement(term.id)}
                      className="agree-checkbox"
                    />
                    <span className="term-label-text">
                      {term.label}
                      {term.required
                        ? <span className="required"> (필수)</span>
                        : <span className="optional"> (선택)</span>
                      }
                    </span>
                  </label>
                  <button
                    type="button"
                    className="term-toggle"
                    onClick={() => toggleExpand(term.id)}
                    aria-expanded={!!expanded[term.id]}
                  >
                    {expanded[term.id] ? '닫기 ▲' : '보기 ▼'}
                  </button>
                </div>
                {expanded[term.id] && (
                  <div className="term-content">{term.content}</div>
                )}
              </div>
            ))}

            {errors.agreements && <p className="error-msg" style={{ marginTop: '8px' }}>{errors.agreements}</p>}
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
                등록 중...
              </span>
            ) : (
              '트레이너 등록하기'
            )}
          </button>

          <p className="login-link">
            이미 계정이 있으신가요?{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/login') }}>로그인</a>
          </p>

        </form>
      </div>
    </div>
  )
}

export default RegisterPage
