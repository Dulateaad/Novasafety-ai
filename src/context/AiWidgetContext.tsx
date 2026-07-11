import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type AiWidgetCtx = {
  /** Панель чата видна */
  expanded: boolean
  /** Только FAB (виджет «сложен» — панели нет). */
  showLauncherFab: boolean
  openExpanded: () => void
  closeExpanded: () => void
}

const Ctx = createContext<AiWidgetCtx | null>(null)

/** Видимость FAB (кнопки «ИИ») на всех защищённых страницах. */
export function AiWidgetProvider({
  children,
  showFloatingLauncher = true,
}: {
  children: ReactNode
  /** Показать ли кружок «ИИ» в углу (чат можно открыть и кнопкой на ППР). */
  showFloatingLauncher?: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  const closeExpanded = useCallback(() => setExpanded(false), [])
  const openExpanded = useCallback(() => setExpanded(true), [])

  const value = useMemo(
    (): AiWidgetCtx => ({
      expanded,
      showLauncherFab: showFloatingLauncher,
      openExpanded,
      closeExpanded,
    }),
    [closeExpanded, expanded, openExpanded, showFloatingLauncher],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAiWidget(): AiWidgetCtx {
  const v = useContext(Ctx)
  if (!v) {
    throw new Error('useAiWidget: provider missing')
  }
  return v
}
