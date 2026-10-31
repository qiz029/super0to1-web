import type { ReactNode } from 'react'

export function IllustratedHero({ children, image, alt, className = '' }: {
  children: ReactNode; image: string; alt: string; className?: string
}) {
  return <section className={`page-hero container illustrated-hero ${className}`}>
    <div className="illustrated-hero-copy">{children}</div>
    <img className="brand-scene" src={image} alt={alt} width="1536" height="1024" />
  </section>
}
