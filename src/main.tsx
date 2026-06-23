import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { initEncryptionKey } from './lib/crypto'

const queryClient = new QueryClient()

initEncryptionKey().catch(() => {})

if (import.meta.env.DEV) {
  ;(window as any).clearCache = async () => {
    localStorage.clear()
    console.log('Cache limpiado. Recargando...')
    window.location.href = '/login'
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
