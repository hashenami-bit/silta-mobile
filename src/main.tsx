import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AppProvider } from './app/AppProvider'
import { ErrorBoundary } from './app/ErrorBoundary'
import { SiltaApp } from './app/SiltaApp'
import { getDb } from './lib/db'
import { registerPwa } from './pwa'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider db={getDb()}>
      <ErrorBoundary>
        <SiltaApp />
      </ErrorBoundary>
    </AppProvider>
  </StrictMode>,
)

registerPwa()
