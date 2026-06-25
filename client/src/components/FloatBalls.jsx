function FloatBalls() {
  return (
    <div className="float-balls" aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => (
        <div key={i} className={`fball fball-${i + 1}`} />
      ))}
    </div>
  )
}

export default FloatBalls
