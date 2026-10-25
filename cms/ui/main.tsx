import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { TranslationProvider } from './Translation'
createRoot(document.getElementById('root')!).render(<StrictMode><TranslationProvider><App /></TranslationProvider></StrictMode>)
