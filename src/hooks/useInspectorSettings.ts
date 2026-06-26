import { useEffect, useState } from 'react'
import {
  fetchInspectorSettings,
  type InspectorAppSettings,
} from '../lib/inspectorSettings'

export function useInspectorSettings() {
  const [settings, setSettings] = useState<InspectorAppSettings>({
    inspectorNotifyMode: 'global',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      const s = await fetchInspectorSettings()
      if (!cancelled) {
        setSettings(s)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { settings, loading, setSettings }
}
