import { useEffect, useState } from 'react'
import { Link, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { useContent } from '../content/context'
import { useReveal } from '../lib/useReveal'
import { syncHead } from '../seo'
import { htmlLang, LocaleContext, localePath, rememberLocale, splitLocale, useT, type Locale } from '../i18n/locale'
import { LLink, LNavLink } from './LocaleLink'

const YEAR = new Date().getFullYear()

const NAV = [
  { to: '/method', key: 'method' },
  { to: '/projects', key: 'projects' },
  { to: '/lab', key: 'lab' },
  { to: '/sessions', key: 'sessions' },
  { to: '/lens', key: 'lens' },
  { to: '/about', key: 'about' },
] as const

export function Logo() {
  const { t } = useT()
  const { site } = useContent()
  return (
    <LLink className="logo" to="/" aria-label={t.nav.home}>
      {site.name === 'Super 0→1' ? <>Super <span>0→1</span></> : site.name}
    </LLink>
  )
}

// EN / 中 switch: goes to the same page in the other language and remembers
// the choice in a cookie, which the Worker honours on later visits.
function LanguageSwitch() {
  const { t, locale } = useT()
  const { pathname } = useLocation()
  const { path } = splitLocale(pathname)
  const options: { locale: Locale; label: string; name: string }[] = [
    { locale: 'en', label: 'EN', name: 'English' },
    { locale: 'zh', label: '中', name: '中文' },
  ]
  return (
    <div className="lang-switch" role="group" aria-label={t.nav.language}>
      {options.map((o) => (
        <Link
          key={o.locale}
          to={localePath(o.locale, path)}
          className={o.locale === locale ? 'is-active' : undefined}
          aria-current={o.locale === locale ? 'true' : undefined}
          aria-label={o.name}
          lang={htmlLang(o.locale)}
          hrefLang={htmlLang(o.locale)}
          onClick={() => rememberLocale(o.locale)}
        >
          {o.label}
        </Link>
      ))}
    </div>
  )
}

function Header() {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={scrolled ? 'site-header is-scrolled' : 'site-header'}>
      <div className="header-inner">
        <Logo />
        <nav id="site-nav" className={open ? 'site-nav is-open' : 'site-nav'} aria-label={t.nav.main}>
          {NAV.map((item) => (
            <LNavLink key={item.to} to={item.to} onClick={() => setOpen(false)}>
              {t.nav[item.key]}
            </LNavLink>
          ))}
        </nav>
        <div className="header-tools">
          <LanguageSwitch />
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="site-nav"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? t.nav.close : t.nav.menu}
          </button>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  const { site } = useContent()
  const { t } = useT()
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <Logo />
          <p>{t.mission}</p>
        </div>
        <nav className="footer-nav" aria-label={t.nav.footer}>
          {NAV.map((item) => (
            <LLink key={item.to} to={item.to}>
              {t.nav[item.key]}
            </LLink>
          ))}
          <a href={site.youtube} target="_blank" rel="noopener noreferrer">
            YouTube ↗
          </a>
        </nav>
      </div>
      <p className="container footer-legal">
        © {YEAR} {site.fullName}
      </p>
    </footer>
  )
}

function Chrome() {
  const content = useContent()
  const { t, locale } = useT()
  const { pathname } = useLocation()
  useReveal(pathname)
  useEffect(() => {
    syncHead(pathname, content)
    document.documentElement.lang = htmlLang(locale)
  }, [pathname, locale, content])

  return (
    <>
      <a className="skip-link" href="#main">
        {t.nav.skip}
      </a>
      <Header />
      <main id="main" tabIndex={-1} key={pathname} className="page-enter">
        <Outlet />
      </main>
      <Footer />
      <ScrollRestoration />
    </>
  )
}

export function Layout({ locale }: { locale: Locale }) {
  return (
    <LocaleContext.Provider value={locale}>
      <Chrome />
    </LocaleContext.Provider>
  )
}
