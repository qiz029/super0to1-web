// Server entry used at build time by scripts/prerender.mjs.
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router'
import { routes } from './routes'
import { site } from './content/site'

export { renderHead, sitePaths, basePaths, pageLang } from './seo'

const handler = createStaticHandler(routes)

export async function render(pathname: string): Promise<string> {
  const context = await handler.query(new Request(`${site.url}${pathname}`))
  if (context instanceof Response) throw new Error(`Unexpected response while rendering ${pathname}`)
  const router = createStaticRouter(handler.dataRoutes, context)
  return renderToString(
    <StrictMode>
      <StaticRouterProvider router={router} context={context} />
    </StrictMode>,
  )
}
