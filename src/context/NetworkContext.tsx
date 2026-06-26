import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface NetworkValue {
  /** Браузер считает, что есть сеть (navigator.onLine). */
  online: boolean
}

const NetworkCtx = createContext<NetworkValue | null>(null)

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(
    () => typeof navigator === 'undefined' || navigator.onLine,
  )

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const value = useMemo(() => ({ online }), [online])
  return <NetworkCtx.Provider value={value}>{children}</NetworkCtx.Provider>
}

export function useNetwork() {
  const v = useContext(NetworkCtx)
  if (!v) throw new Error('useNetwork outside NetworkProvider')
  return v
}
