import { useCallback, useEffect, useState } from 'react'
import { useSession } from '../context/SessionContext'
import {
  fetchSigningSettings,
  type SigningAppSettings,
} from '../lib/signingSettings'

const DEFAULT_SETTINGS: SigningAppSettings = {
  verifyEgovFio: true,
  updatedAtIso: '',
}

export function useSigningSettings() {
  const { authMode } = useSession()
  const [settings, setSettings] = useState<SigningAppSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(authMode === 'firebase')
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (authMode !== 'firebase') {
      setSettings(DEFAULT_SETTINGS)
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSigningSettings()
      if (data) setSettings(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
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
