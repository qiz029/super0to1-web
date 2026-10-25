import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { McpConsent } from './Mcp'
import { TranslationProvider } from './Translation'
createRoot(document.getElementById('root')!).render(window.location.pathname === '/oauth/authorize' ? <McpConsent /> : <StrictMode><TranslationProvider><App /></TranslationProvider></StrictMode>)
