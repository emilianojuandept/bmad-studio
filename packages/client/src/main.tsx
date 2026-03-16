import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app.js'
import { getInitialTheme, applyTheme } from './lib/theme.js'
import './globals.css'

applyTheme(getInitialTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
