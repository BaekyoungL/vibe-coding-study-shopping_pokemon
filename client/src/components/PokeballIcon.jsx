/** 통일된 포켓볼 아이콘 — variant별 크기·스타일 */
function PokeballIcon({ variant = 'nav', className = '' }) {
  return (
    <div className={`pokeball pokeball--${variant} ${className}`.trim()} aria-hidden="true">
      <div className="pokeball__top" />
      <div className="pokeball__strip"><div className="pokeball__btn" /></div>
      <div className="pokeball__bottom" />
    </div>
  )
}

export default PokeballIcon
