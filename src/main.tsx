import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { LanguageProvider } from './context/LanguageContext'
import { NetworkProvider } from './context/NetworkContext'
import { SessionProvider } from './context/SessionContext'
import { ToastProvider } from './context/ToastContext'
import { ensureFreshServiceWorker } from './lib/swCacheBust'
import './index.css'
import './header-overrides.css'
import './crew-ack-worker.css'
import App from './App.tsx'

void ensureFreshServiceWorker().then(() => {
  registerSW({ immediate: true })

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <LanguageProvider>
          <NetworkProvider>
            <SessionProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </SessionProvider>
          </NetworkProvider>
        </LanguageProvider>
      </BrowserRouter>
    </StrictMode>,
  )
})
