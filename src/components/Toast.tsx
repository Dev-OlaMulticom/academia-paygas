import { useState, useCallback, createContext, useContext, useEffect } from 'react'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastContextValue {
  toast: (message: string, type?: Toast['type']) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  let nextId = 0

  const toast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = ++nextId
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const remove = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 10000, display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none' }}>
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onRemove={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onRemove, 3500)
    return () => clearTimeout(timer)
  }, [onRemove])

  const colors: Record<Toast['type'], { bg: string; border: string; icon: string }> = {
    success: { bg: '#E8F5E9', border: '#4CAF50', icon: '✓' },
    error: { bg: '#FFEBEE', border: '#F44336', icon: '✕' },
    info: { bg: '#E3F2FD', border: '#2196F3', icon: 'ℹ' },
  }
  const c = colors[toast.type]

  return (
    <div
      onClick={onRemove}
      style={{
        pointerEvents: 'auto',
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '12px 16px', borderRadius: '8px',
        background: c.bg, borderLeft: `4px solid ${c.border}`,
        boxShadow: '0 4px 12px rgba(0,0,0,.12)',
        fontSize: '14px', fontWeight: 500, cursor: 'pointer',
        animation: 'toast-in .25s ease',
        minWidth: '280px', maxWidth: '420px',
      }}
    >
      <span style={{ fontSize: '16px', color: c.border }}>{c.icon}</span>
      <span style={{ flex: 1, color: 'var(--gray-800)' }}>{toast.message}</span>
    </div>
  )
}

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue>({ confirm: async () => false })

export function useConfirm() {
  return useContext(ConfirmContext)
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null)

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>(resolve => {
      setState({ ...options, resolve })
    })
  }, [])

  const handleConfirm = () => {
    state?.resolve(true)
    setState(null)
  }

  const handleCancel = () => {
    state?.resolve(false)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '400px', maxWidth: '90%', boxShadow: '0 8px 32px rgba(0,0,0,.2)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '16px' }}>{state.title}</h3>
            <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--gray-600)', lineHeight: 1.5 }}>{state.message}</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={handleCancel}>{state.cancelLabel || 'Cancelar'}</button>
              <button
                className={state.danger ? 'btn-primary' : 'btn-primary'}
                style={state.danger ? { background: '#F44336' } : undefined}
                onClick={handleConfirm}
              >
                {state.confirmLabel || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
