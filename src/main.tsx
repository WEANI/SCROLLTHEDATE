import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { TRPCProvider } from '@/providers/trpc'
import { LanguageProvider } from '@/i18n/LanguageContext'
import { CartProvider } from '@/cart/CartContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <LanguageProvider>
      <CartProvider>
        <TRPCProvider>
          <App />
        </TRPCProvider>
      </CartProvider>
    </LanguageProvider>
  </BrowserRouter>,
)
