import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './styles/fonts.css'
import './styles/global.css'
import App from './App.tsx'

const root = document.getElementById('root')!
const app = (
  <StrictMode>
    <App />
  </StrictMode>
)

// Production pages are prerendered (scripts/prerender.mjs); the dev server is not.
if (root.hasChildNodes()) hydrateRoot(root, app)
else createRoot(root).render(app)
