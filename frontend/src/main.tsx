import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import { DeliveryLocationProvider } from './context/DeliveryLocationContext'
import { PromotionProvider } from './context/PromotionContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <DeliveryLocationProvider>
        <CartProvider>
          <PromotionProvider>
            <App />
          </PromotionProvider>
        </CartProvider>
      </DeliveryLocationProvider>
    </AuthProvider>
  </StrictMode>,
)
