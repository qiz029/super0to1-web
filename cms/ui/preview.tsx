import { createRoot } from 'react-dom/client'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '../../src/routes'
import { ContentContext } from '../../src/content/context'
import '../../src/styles/global.css'
import '../../src/styles/fonts.css'
import type { Snapshot } from '../../shared/content'
const root = createRoot(document.getElementById('root')!)
const params = new URLSearchParams(location.search)
const previewId = params.get('id')
if (!previewId || !/^[a-f0-9-]{36}$/.test(previewId)) root.render(<p>请从编辑后台打开预览。</p>)
else fetch(`/api/previews/${previewId}`).then(async response => {
  const data = await response.json() as Snapshot & { error?: string }
  if (!response.ok) throw new Error(data.error || '无法加载预览')
  const content = data as Snapshot
  const path = params.get('path') || '/'
  const router = createMemoryRouter(routes, { initialEntries: [path.startsWith('/') ? path : '/'] })
  root.render(<ContentContext.Provider value={content}><RouterProvider router={router} /></ContentContext.Provider>)
}).catch(error => root.render(<p role="alert">{error.message}</p>))
