import { createContext, useContext } from 'react'
import { messages } from './messages'

export type Locale = 'en' | 'zh'
export const LOCALES: Locale[] = ['en', 'zh']

// Content that differs by language. Plain strings are shared (names, titles).
export type Text = string | { en: string; zh: string }

export const LANG_COOKIE = 'lang'

export const htmlLang = (locale: Locale) => (locale === 'zh' ? 'zh-CN' : 'en')

/** Prefixes an English path with the locale: ('zh', '/lab') → '/zh/lab'. */
export function localePath(locale: Locale, path: string) {
  if (locale === 'en') return path
  return path === '/' ? '/zh' : `/zh${path}`
}

/** Splits '/zh/lab' into { locale: 'zh', path: '/lab' }. */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  if (pathname === '/zh' || pathname === '/zh/') return { locale: 'zh', path: '/' }
  if (pathname.startsWith('/zh/')) return { locale: 'zh', path: pathname.slice(3) }
  return { locale: 'en', path: pathname }
}

export const tx = (text: Text, locale: Locale) => (typeof text === 'string' ? text : text[locale])

export const LocaleContext = createContext<Locale>('en')

export const useLocale = () => useContext(LocaleContext)

export function useT() {
  const locale = useLocale()
  return { t: messages[locale], locale, tx: (text: Text) => tx(text, locale) }
}

export function rememberLocale(locale: Locale) {
  document.cookie = `${LANG_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`
}
