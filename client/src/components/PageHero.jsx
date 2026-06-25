import PokeballIcon from './PokeballIcon'

/** 모든 서브 페이지 공통 — 빨간 헤더 + 포켓볼 데코 */
function PageHero({
  title,
  subtitle,
  brand = '포켓몬 샵',
  onBack,
  backLabel = '← 돌아가기',
  showDecoBall = true,
}) {
  return (
    <header className="page-hero">
      {showDecoBall && (
        <div className="page-hero-deco">
          <PokeballIcon variant="hero-deco" />
        </div>
      )}
      <div className="page-hero-content">
        <p className="page-hero-brand">{brand}</p>
        <h1 className="page-hero-title">{title}</h1>
        {subtitle != null && <div className="page-hero-sub">{subtitle}</div>}
      </div>
      {onBack && (
        <button type="button" className="page-hero-back" onClick={onBack}>
          {backLabel}
        </button>
      )}
    </header>
  )
}

export default PageHero
