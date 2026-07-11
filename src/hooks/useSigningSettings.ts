import { useCallback, useEffect, useState } from 'react'
import { useSession } from '../context/SessionContext'
import {
  DEFAULT_SIGNING_SETTINGS,
  fetchSigningSettings,
  type SigningAppSettings,
} from '../lib/signingSettings'

export function useSigningSettings() {
  const { authMode } = useSession()
  const [settings, setSettings] = useState<SigningAppSettings>(DEFAULT_SIGNING_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSigningSettings()
      setSettings(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      if (authMode !== 'firebase') {
        setSettings(DEFAULT_SIGNING_SETTINGS)
      }
    } finally {
      setLoading(false)
    }
  }, [authMode])

  useEffect(() => {
    void reload()
  }, [reload])

  return {
    settings,
    loading,
    error,
    reload,
    setSettings,
    verifyEgovFio: settings.verifyEgovFio,
  }
}
