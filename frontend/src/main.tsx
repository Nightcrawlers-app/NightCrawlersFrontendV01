import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import { DeliveryLocationProvider } from './context/DeliveryLocationContext'
import { PromotionProvider } from './context/PromotionContext'
import { ToastProvider } from './context/ToastContext'
import { ThemeProvider } from './context/ThemeContext'
import './styles/dark.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
    <ToastProvider>
      <AuthProvider>
        <DeliveryLocationProvider>
          <CartProvider>
            <PromotionProvider>
              <App />
            </PromotionProvider>
          </CartProvider>
        </DeliveryLocationProvider>
      </AuthProvider>
    </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
)
