import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  isAssistantChatConfigured,
  requestAssistantCompletion,
  type UiChatTurn,
} from '../lib/chatAssistant'
import { auth, firebaseConfigured } from '../lib/firebase'
import { APP_NAME } from '../config/branding'
import { useAiWidget } from '../context/AiWidgetContext'
import { useNetwork } from '../context/NetworkContext'
import { useLanguage } from '../context/LanguageContext'
import { LoadingProgress } from './LoadingProgress'

const THREAD_KEY = 'nova_ai_widget_chat_v1'

function load(): UiChatTurn[] {
  try {
    const raw = sessionStorage.getItem(THREAD_KEY)
    if (!raw) return []
    const p = JSON.parse(raw) as unknown
    if (!Array.isArray(p)) return []
    return p.filter(
      (x): x is UiChatTurn =>
        !!x &&
        typeof x === 'object' &&
        (x as UiChatTurn).role !== undefined &&
        ((x as UiChatTurn).role === 'user' || (x as UiChatTurn).role === 'assistant') &&
        typeof (x as UiChatTurn).content === 'string',
    )
  } catch {
    return []
  }
}

export function AiChatWidget() {
  const { expanded, showLauncherFab, openExpanded, closeExpanded } = useAiWidget()
  const { online } = useNetwork()
  const { t } = useLanguage()
  const ai = t.ai
  const c = t.common
  const [messages, setMessages] = useState<UiChatTurn[]>(() => load())
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const configured = useMemo(() => isAssistantChatConfigured(), [])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      sessionStorage.setItem(THREAD_KEY, JSON.stringify(messages))
    } catch {
      /* ignore */
    }
  }, [messages])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, busy, expanded])

  const getToken = useCallback(async () => {
    if (!firebaseConfigured || !auth?.currentUser) return null
    try {
      return await auth.currentUser.getIdToken()
    } catch {
      return null
    }
  }, [])

  async function send() {
    const text = input.trim()
    if (!text || busy || !configured || !online) return
    setError(null)
    setInput('')
    const next: UiChatTurn[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setBusy(true)
    try {
      const reply = await requestAssistantCompletion(next, { idToken: await getToken() })
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : ai.requestFailed
      setError(msg)
      setMessages((hist) =>
        hist.length > 0 && hist[hist.length - 1]?.role === 'user'
          ? hist.slice(0, -1)
          : hist,
      )
      setInput(text)
    } finally {
      setBusy(false)
    }
  }

  function resetChat() {
    setMessages([])
    setError(null)
    try {
      sessionStorage.removeItem(THREAD_KEY)
    } catch {
      /* ignore */
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    void send()
  }

  return (
    <>
      {showLauncherFab && (
        <button
          type="button"
          className="ai-widget-fab"
          aria-label={expanded ? ai.closeChat : ai.openChat}
          onClick={() => (expanded ? closeExpanded() : openExpanded())}
        >
          {expanded ? '×' : c.ai}
        </button>
      )}

      {expanded && (
        <div className="ai-widget-panel card" aria-label={ai.openChat}>
          <div className="ai-widget-panel__top">
            <span className="ai-widget-panel__title">{c.ai}</span>
            <div className="ai-widget-panel__tools">
              <button type="button" className="link-btn ai-widget-mini" onClick={resetChat}>
                {c.cancel}
              </button>
              <button
                type="button"
                className="link-btn ai-widget-mini"
                aria-label={ai.collapse}
                onClick={closeExpanded}
              >
                {ai.collapse}
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="ai-widget-thread" aria-live="polite">
            {messages.map((m, i) => (
              <div key={`${m.role}-${i}`} className={`assistant-bubble assistant-bubble--${m.role}`}>
                <span className="assistant-bubble__role">
                  {m.role === 'user' ? ai.you : ai.reply}
                </span>
                <div className="assistant-bubble__text">{m.content}</div>
              </div>
            ))}
            {busy && (
              <LoadingProgress
                label={`${APP_NAME} ${c.processing}`}
                indeterminate
                withTips
                fullscreen
              />
            )}
          </div>

          {error && (
            <div className="ai-widget-error muted xsmall" role="alert">
              {error}
            </div>
          )}

          {!online && (
            <div className="ai-widget-error muted xsmall" role="status">
              {t.login.offlineBanner}
            </div>
          )}

          <form className="ai-widget-input" onSubmit={onSubmit}>
            <textarea
              rows={2}
              className="ai-widget-input__textarea"
              aria-label={ai.message}
              placeholder=""
              value={input}
              disabled={!configured || busy || !online}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" className="btn primary small ai-widget-send" disabled={busy || !input.trim() || !configured || !online}>
              {busy ? '…' : '→'}
            </button>
          </form>
        </div>
      )}
    </>
  )
}
