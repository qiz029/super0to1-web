import { Link, NavLink, type LinkProps, type NavLinkProps } from 'react-router'
import { localePath, useLocale } from '../i18n/locale'

// Drop-in replacements for Link/NavLink that keep the current language.
export function LLink({ to, ...props }: LinkProps & { to: string }) {
  return <Link to={localePath(useLocale(), to)} {...props} />
}

export function LNavLink({ to, ...props }: NavLinkProps & { to: string }) {
  return <NavLink to={localePath(useLocale(), to)} {...props} />
}
