import type { RouteObject } from 'react-router'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Method } from './pages/Method'
import { Projects, ProjectDetail } from './pages/Projects'
import { Lab } from './pages/Lab'
import { Sessions, SessionDetail } from './pages/Sessions'
import { Lens, Episode } from './pages/Lens'
import { About } from './pages/About'
import { NotFound } from './pages/NotFound'
import type { Locale } from './i18n/locale'

// English lives at the root, Chinese under /zh, with the same pages.
const localeRoutes = (locale: Locale): RouteObject => ({
  path: locale === 'zh' ? '/zh' : '/',
  element: <Layout locale={locale} />,
  children: [
    { index: true, element: <Home /> },
    { path: 'method', element: <Method /> },
    { path: 'projects', element: <Projects /> },
    { path: 'projects/:slug', element: <ProjectDetail /> },
    { path: 'lab', element: <Lab /> },
    { path: 'sessions', element: <Sessions /> },
    { path: 'sessions/:slug', element: <SessionDetail /> },
    { path: 'lens', element: <Lens /> },
    { path: 'lens/:id', element: <Episode /> },
    { path: 'about', element: <About /> },
    { path: '*', element: <NotFound /> },
  ],
})

export const routes: RouteObject[] = [localeRoutes('zh'), localeRoutes('en')]
