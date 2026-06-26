import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  isAssistantChatConfigured,
  requestAssistantCompletion,
  type UiChatTurn,
} from '../lib/chatAssistant'
import { auth, firebaseConfigured } from '../lib/firebase'
import { APP_NAME } from '../config/branding'
import { AiDisclaimerNotice } from '../components/AiDisclaimerNotice'
import { LoadingProgress } from '../components/LoadingProgress'

const THREAD_STORAGE_KEY = 'nova_assistant_thread_v1'

const SUGGESTED_QUESTIONS = [
  'В каком порядке заполнять «Новый НД» и «Оценка риска (АСОР)»?',
  'Чем отличается огневой и холодный наряд-допуск?',
  'Куда вписать работников исполнителей и что проверять перед сохранением?',
]

function loadThread(): UiChatTurn[] {
  try {
    const raw = sessionStorage.getItem(THREAD_STORAGE_KEY)
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

export function AssistantChatPage() {
  const [messages, setMessages] = useState<UiChatTurn[]>(() => loadThread())
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const configured = useMemo(() => isAssistantChatConfigured(), [])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      sessionStorage.setItem(THREAD_STORAGE_KEY, JSON.stringify(messages))
    } catch {
      /* ignore */
    }
  }, [messages])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, busy])

  const getOptionalIdToken = useCallback(async () => {
    if (!firebaseConfigured || !auth?.currentUser) return null
    try {
      return await auth.currentUser.getIdToken()
    } catch {
      return null
    }
  }, [])

  async function send(customText?: string) {
    const text = (customText ?? input).trim()
    if (!text || busy || !configured) return
    setError(null)
    setInput('')
    const nextHist: UiChatTurn[] = [...messages, { role: 'user', content: text }]
    setMessages(nextHist)
    setBusy(true)
    try {
      const token = await getOptionalIdToken()
      const reply = await requestAssistantCompletion(nextHist, { idToken: token })
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (e: unknown) {
      const fallback =
        e instanceof Error ? e.message : 'Не удалось получить ответ. Проверьте прокси и сеть.'
      setError(fallback)
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

  function clearThread() {
    setMessages([])
    setError(null)
    try {
      sessionStorage.removeItem(THREAD_STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    void send()
  }

  return (
    <div className="page assistant-page">
      <div className="page-header assistant-page__intro">
        <div>
          <h1>Чат ИИ</h1>
          <p className="muted small" style={{ marginTop: '-0.15rem', marginBottom: 0 }}>
            Подсказки по заполнению наряд-допуска и формы АСОР. Ответ носит справочный характер
            применительно к NOVA&nbsp;Safety; на объекте ориентируйтесь на утверждённые процедуры УОГ.
          </p>
        </div>
        <div className="assistant-page__toolbar">
          <button type="button" className="btn ghost small" onClick={() => clearThread()}>
            Очистить чат
          </button>
        </div>
      </div>

      {!configured && (
        <div className="card assistant-card" role="status">
          <p className="strong" style={{ marginTop: 0 }}>
            Прокси к модели не настроен
          </p>
          <p className="muted small">
            Чтобы включить Чат&nbsp;ИИ, задайте в <code>.env</code> переменную{' '}
            <code>VITE_AI_CHAT_URL</code> — абсолютный URL вашего HTTPS-прокси, который принимает
            POST&nbsp;JSON <code>&#123;&quot;messages&quot;: [...]&#125;</code> и возвращает текст
            ответа полем <code>reply</code> или <code>content</code> (или совместимо с форматом{' '}
            OpenAI&nbsp;<code>choices[0].message.content</code>).
          </p>
          <p className="muted small" style={{ marginBottom: 0 }}>
            Так вы не экспонируете API-ключи модели в браузере — ключ храните только на сервере /
            Cloud&nbsp;Function. См.&nbsp;<code>.env.example</code>.
          </p>
        </div>
      )}

      <AiDisclaimerNotice />

      <div ref={scrollRef} className="assistant-thread card" aria-live="polite">
        {messages.length === 0 && (
          <p className="muted small assistant-thread__empty">
            Выберите вопрос ниже или опишите, на каком шаге вы застряли (поле, блок F02/F03 и т.п.).
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={`${m.role}-${i}`}
            className={`assistant-bubble assistant-bubble--${m.role}`}
          >
            <span className="assistant-bubble__role">
              {m.role === 'user' ? 'Вы' : 'Ассистент'}
            </span>
            <div className="assistant-bubble__text">{m.content}</div>
          </div>
        ))}
        {busy && (
          <div className="assistant-bubble assistant-bubble--assistant">
            <span className="assistant-bubble__role">Ассистент</span>
            <div className="assistant-bubble__text muted">Отвечаю…</div>
          </div>
        )}
      </div>

      {error && (
        <div className="alert error" role="alert" style={{ marginBottom: '0.75rem' }}>
          <span>{error}</span>
        </div>
      )}

      {configured && messages.length === 0 && (
        <div className="assistant-chips">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              className="btn ghost small assistant-chip"
              disabled={busy}
              onClick={() => void send(q)}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <form className="assistant-form card" onSubmit={onSubmit}>
        <label className="assistant-form__label">
          Ваш вопрос
          <textarea
            rows={configured ? 3 : 2}
            placeholder={
              configured
                ? 'Например: куда указать объект и как потом приложить АСОР к пакету?'
                : 'Сначала настройте VITE_AI_CHAT_URL — после этого здесь можно будет писать вопросы.'
            }
            value={input}
            disabled={!configured || busy}
            onChange={(e) => setInput(e.target.value)}
          />
        </label>
        <div className="btn-row">
          <button type="submit" className="btn primary" disabled={!configured || busy || !input.trim()}>
            {busy ? 'Отправка…' : 'Спросить'}
          </button>
          <Link className="btn ghost" to="/new">
            К «Новый НД»
          </Link>
          <Link className="btn ghost" to="/risk-assessment">
            К «АСОР»
          </Link>
        </div>
      </form>

      {busy && (
        <LoadingProgress
          label={`${APP_NAME} обрабатывает запрос…`}
          indeterminate
          withTips
          fullscreen
        />
      )}
    </div>
  )
}
