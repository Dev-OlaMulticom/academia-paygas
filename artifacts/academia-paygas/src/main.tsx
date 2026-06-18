import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initEncryptionKey } from './lib/crypto'
import { db } from './lib/db'

initEncryptionKey().catch(() => {})

if (import.meta.env.DEV) {
  ;(window as any).clearCache = async () => {
    localStorage.clear()
    await db.delete()
    console.log('Cache limpiado. Recargando...')
    window.location.href = '/login'
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
