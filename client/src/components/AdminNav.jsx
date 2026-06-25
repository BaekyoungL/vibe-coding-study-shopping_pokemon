import { useNavigate } from 'react-router-dom'
import PokeballIcon from './PokeballIcon'

/** 관리자 페이지 공통 상단 네비 */
function AdminNav({ title, backLabel, onBack }) {
  const navigate = useNavigate()

  return (
    <nav className="admin-nav">
      <div className="nav-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <PokeballIcon variant="nav" />
        <span>{title}</span>
      </div>
      {backLabel && (
        <button type="button" className="nav-btn-outline" onClick={onBack ?? (() => navigate(-1))}>
          {backLabel}
        </button>
      )}
    </nav>
  )
}

export default AdminNav
