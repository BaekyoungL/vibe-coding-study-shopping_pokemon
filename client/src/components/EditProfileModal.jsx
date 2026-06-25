import { useState } from 'react'
import { updateMe, updatePassword } from '../api/authApi'

function EditProfileModal({ user, onClose, onUpdate }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  })
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showPwSection, setShowPwSection] = useState(false)

  const [errors, setErrors] = useState({})
  const [pwErrors, setPwErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
    if (serverError) setServerError('')
  }

  const handlePwChange = (e) => {
    const { name, value } = e.target
    setPwForm((prev) => ({ ...prev, [name]: value }))
    if (pwErrors[name]) setPwErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validateInfo = () => {
    const newErrors = {}
    if (!form.name.trim()) newErrors.name = '이름을 입력해주세요.'
    if (!form.email.trim()) newErrors.email = '이메일을 입력해주세요.'
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) newErrors.email = '올바른 이메일 형식이 아닙니다.'
    return newErrors
  }

  const validatePassword = () => {
    const newErrors = {}
    if (!pwForm.currentPassword) newErrors.currentPassword = '현재 비밀번호를 입력해주세요.'
    if (!pwForm.newPassword) newErrors.newPassword = '새 비밀번호를 입력해주세요.'
    else if (pwForm.newPassword.length < 6) newErrors.newPassword = '비밀번호는 최소 6자 이상이어야 합니다.'
    if (!pwForm.confirmPassword) newErrors.confirmPassword = '새 비밀번호를 한 번 더 입력해주세요.'
    else if (pwForm.newPassword !== pwForm.confirmPassword) newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.'
    return newErrors
  }

  const handleInfoSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    setSuccess('')
    const newErrors = validateInfo()
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    try {
      setLoading(true)
      const data = await updateMe({ name: form.name, email: form.email, phone: form.phone })
      const updatedUser = { ...user, name: data.data.name, email: data.data.email, phone: data.data.phone }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      onUpdate(updatedUser)
      setSuccess('정보가 저장되었습니다.')
    } catch (err) {
      setServerError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    setSuccess('')
    const newErrors = validatePassword()
    if (Object.keys(newErrors).length > 0) { setPwErrors(newErrors); return }
    try {
      setPwLoading(true)
      await updatePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setShowPwSection(false)
      setSuccess('비밀번호가 변경되었습니다.')
    } catch (err) {
      setServerError(err.message)
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="login-modal-card register-modal-card" onClick={(e) => e.stopPropagation()}>

        <div className="card-header login-modal-header-banner">
          <button className="login-modal-close-btn" onClick={onClose}>✕</button>
          <div className="pokeball-deco">
            <div className="pb-top" />
            <div className="pb-strip"><div className="pb-btn" /></div>
            <div className="pb-bottom" />
          </div>
          <h2 className="brand-title">포켓몬 샵</h2>
          <p className="brand-sub">트레이너 정보 수정</p>
        </div>

        <div className="register-modal-form">

          {/* 기본 정보 */}
          <form onSubmit={handleInfoSubmit} noValidate>

            <div className="edit-profile-avatar">
              <div className="modal-avatar">{user.name.charAt(0)}</div>
              <div>
                <p className="modal-user-name">{user.name}</p>
                <p className="modal-user-email">{user.email}</p>
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="ep-name">이름 <span className="required">*</span></label>
              <input id="ep-name" name="name" type="text"
                value={form.name} onChange={handleChange}
                className={errors.name ? 'input-error' : ''} />
              {errors.name && <p className="error-msg">{errors.name}</p>}
            </div>

            <div className="field-group">
              <label htmlFor="ep-email">이메일 <span className="required">*</span></label>
              <input id="ep-email" name="email" type="email"
                placeholder="example@pokemon.com"
                value={form.email} onChange={handleChange}
                className={errors.email ? 'input-error' : ''} autoComplete="email" />
              {errors.email && <p className="error-msg">{errors.email}</p>}
            </div>

            <div className="field-group">
              <label htmlFor="ep-phone">전화번호 <span className="optional">(선택)</span></label>
              <input id="ep-phone" name="phone" type="tel"
                placeholder="010-0000-0000"
                value={form.phone} onChange={handleChange} />
            </div>

            {serverError && !showPwSection && (
              <div className="server-error-box">
                <span className="server-error-icon">⚠</span>
                {serverError}
              </div>
            )}
            {success && (
              <div className="success-box"><span>✓</span>{success}</div>
            )}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading
                ? <span className="btn-loading"><span className="spinner" />저장 중...</span>
                : '정보 저장하기'}
            </button>
          </form>

          {/* 비밀번호 변경 토글 */}
          <div className="pw-section-divider">
            <button
              type="button"
              className="pw-toggle-btn"
              onClick={() => { setShowPwSection((v) => !v); setServerError(''); setPwErrors({}) }}
            >
              🔒 비밀번호 변경 {showPwSection ? '▲' : '▼'}
            </button>
          </div>

          {showPwSection && (
            <form onSubmit={handlePasswordSubmit} noValidate className="pw-change-form">

              <div className="field-group">
                <label htmlFor="ep-cur-pw">현재 비밀번호 <span className="required">*</span></label>
                <input id="ep-cur-pw" name="currentPassword" type="password"
                  placeholder="현재 비밀번호"
                  value={pwForm.currentPassword} onChange={handlePwChange}
                  className={pwErrors.currentPassword ? 'input-error' : ''} />
                {pwErrors.currentPassword && <p className="error-msg">{pwErrors.currentPassword}</p>}
              </div>

              <div className="field-group">
                <label htmlFor="ep-new-pw">새 비밀번호 <span className="required">*</span></label>
                <input id="ep-new-pw" name="newPassword" type="password"
                  placeholder="6자 이상 입력하세요"
                  value={pwForm.newPassword} onChange={handlePwChange}
                  className={pwErrors.newPassword ? 'input-error' : ''} />
                {pwErrors.newPassword && <p className="error-msg">{pwErrors.newPassword}</p>}
              </div>

              <div className="field-group">
                <label htmlFor="ep-confirm-pw">새 비밀번호 확인 <span className="required">*</span></label>
                <input id="ep-confirm-pw" name="confirmPassword" type="password"
                  placeholder="새 비밀번호를 한 번 더 입력하세요"
                  value={pwForm.confirmPassword} onChange={handlePwChange}
                  className={pwErrors.confirmPassword ? 'input-error' : ''} />
                {pwErrors.confirmPassword && <p className="error-msg">{pwErrors.confirmPassword}</p>}
              </div>

              {serverError && showPwSection && (
                <div className="server-error-box">
                  <span className="server-error-icon">⚠</span>
                  {serverError}
                </div>
              )}

              <button type="submit" className="submit-btn" disabled={pwLoading}>
                {pwLoading
                  ? <span className="btn-loading"><span className="spinner" />변경 중...</span>
                  : '비밀번호 변경하기'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}

export default EditProfileModal
