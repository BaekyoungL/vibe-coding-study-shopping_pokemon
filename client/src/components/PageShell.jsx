import FloatBalls from './FloatBalls'

/** 통일된 페이지 배경 (네이비 그라데이션 + 포켓볼 무늬) */
function PageShell({ children, className = '', withFloatBalls = true }) {
  return (
    <div className={`page-shell ${className}`.trim()}>
      {withFloatBalls && <FloatBalls />}
      {children}
    </div>
  )
}

export default PageShell
