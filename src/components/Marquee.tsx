import { useT } from '../i18n/locale'

export function Marquee() {
  const { t } = useT()
  const row = t.marquee.map((w) => (
    <span key={w} className="marquee-item">
      {w}
      <i className="marquee-pearl" />
    </span>
  ))
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {row}
        {row}
      </div>
    </div>
  )
}
