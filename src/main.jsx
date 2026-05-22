import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.jsx'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

console.log('[Main] VITE_GOOGLE_CLIENT_ID loaded:', googleClientId ? '✓ (length: ' + googleClientId.length + ')' : '✗ NOT LOADED')
console.log('[Main] Environment:', import.meta.env.MODE)

if (!googleClientId) {
  console.warn('[Main] WARNING: Google Client ID not configured. Google login will not work.')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
