import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { TRPCProvider } from '@/providers/trpc'
import { LanguageProvider } from '@/i18n/LanguageContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <LanguageProvider>
      <TRPCProvider>
        <App />
      </TRPCProvider>
    </LanguageProvider>
  </BrowserRouter>,
)
