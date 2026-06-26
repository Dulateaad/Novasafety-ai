import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type ToastType = 'error' | 'success' | 'info'

type ToastItem = {
  id: string
  message: string
  type: ToastType
  exiting?: boolean
}

type ToastContextValue = {
  showError: (message: string) => void
  showSuccess: (message: string) => void
  showInfo: (message: string) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const DEFAULT_DURATION_MS = 6500
const EXIT_MS = 280

function ToastStack(props: {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}) {
  const { toasts, onDismiss } = props

  if (toasts.length === 0) return null

  return (
    <div className="toast-stack" aria-live="polite" aria-relevant="additions">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.type}${toast.exiting ? ' toast--exiting' : ''}`}
          role={toast.type === 'error' ? 'alert' : 'status'}
        >
          <span className="toast__message">{toast.message}</span>
          <button
            type="button"
            className="toast__close"
            aria-label="Закрыть"
            onClick={() => onDismiss(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismissToast = useCallback((id: string) => {
    const existing = timersRef.current.get(id)
    if (existing) {
      clearTimeout(existing)
      timersRef.current.delete(id)
    }

    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
    )

    const removeTimer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      timersRef.current.delete(`rm-${id}`)
    }, EXIT_MS)
    timersRef.current.set(`rm-${id}`, removeTimer)
  }, [])

  const pushToast = useCallback(
    (message: string, type: ToastType, durationMs = DEFAULT_DURATION_MS) => {
      const trimmed = message.trim()
      if (!trimmed) return

      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`

      setToasts((prev) => [...prev, { id, message: trimmed, type }])

      const autoTimer = setTimeout(() => dismissToast(id), durationMs)
      timersRef.current.set(id, autoTimer)
    },
    [dismissToast],
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      showError: (message) => pushToast(message, 'error'),
      showSuccess: (message) => pushToast(message, 'success'),
      showInfo: (message) => pushToast(message, 'info'),
      dismissToast,
    }),
    [pushToast, dismissToast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
