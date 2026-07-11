/**
 * Подписание через NCALayer (файл-ключ PKCS12 / токен НУЦ РК).
 * @see https://pki.gov.kz/developers/
 */

const NCA_LAYER_URLS = ['wss://127.0.0.1:13579/', 'ws://127.0.0.1:13579/'] as const
const NCA_MODULE = 'kz.gov.pki.knca.commonUtils'
const CONNECT_TIMEOUT_MS = 8_000
const SIGN_TIMEOUT_MS = 180_000

export class NcaLayerNotRunningError extends Error {
  constructor(message = 'NCALayer не запущен. Установите и запустите NCALayer с pki.gov.kz.') {
    super(message)
    this.name = 'NcaLayerNotRunningError'
  }
}

export class NcaLayerCanceledError extends Error {
  constructor(message = 'Подписание отменено в NCALayer') {
    super(message)
    this.name = 'NcaLayerCanceledError'
  }
}

type NcaResponse = {
  code?: string | number
  message?: string
  responseObject?: string
  status?: boolean
  result?: string
}

function isCanceledMessage(msg: string): boolean {
  const m = msg.toLowerCase()
  return (
    m.includes('cancel') ||
    m.includes('отмен') ||
    m.includes('aborted') ||
    m.includes('прерван')
  )
}

function extractCms(payload: NcaResponse): string | null {
  if (typeof payload.responseObject === 'string' && payload.responseObject.trim()) {
    return payload.responseObject.trim()
  }
  if (typeof payload.result === 'string' && payload.result.trim()) {
    return payload.result.trim()
  }
  return null
}

function isSuccessCode(code: string | number | undefined): boolean {
  return code === 200 || code === '200'
}

function openNcaSocket(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    let settled = false
    const timer = window.setTimeout(() => {
      if (settled) return
      settled = true
      reject(new NcaLayerNotRunningError())
    }, CONNECT_TIMEOUT_MS)

    const ws = new WebSocket(url)

    ws.onopen = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      resolve(ws)
    }

    ws.onerror = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      reject(new NcaLayerNotRunningError())
    }
  })
}

async function connectNcaLayer(): Promise<WebSocket> {
  let lastErr: unknown
  for (const url of NCA_LAYER_URLS) {
    try {
      return await openNcaSocket(url)
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr instanceof Error ? lastErr : new NcaLayerNotRunningError()
}

function ncaRequest(
  ws: WebSocket,
  method: string,
  args: unknown[],
): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false
    const timer = window.setTimeout(() => {
      if (settled) return
      settled = true
      ws.close()
      reject(new Error('NCALayer: время ожидания подписи истекло'))
    }, SIGN_TIMEOUT_MS)

    const onMessage = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(String(event.data)) as NcaResponse
        const cms = extractCms(payload)
        const code = payload.code
        const msg = String(payload.message ?? '')

        if (cms && (isSuccessCode(code) || payload.status === true || code === undefined)) {
          if (settled) return
          settled = true
          window.clearTimeout(timer)
          ws.removeEventListener('message', onMessage)
          resolve(cms)
          return
        }

        if (code !== undefined && !isSuccessCode(code)) {
          if (settled) return
          settled = true
          window.clearTimeout(timer)
          ws.removeEventListener('message', onMessage)
          if (isCanceledMessage(msg)) {
            reject(new NcaLayerCanceledError(msg || undefined))
          } else {
            reject(new Error(msg || `NCALayer: ошибка ${String(code)}`))
          }
        }
      } catch (e) {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        ws.removeEventListener('message', onMessage)
        reject(e instanceof Error ? e : new Error(String(e)))
      }
    }

    ws.addEventListener('message', onMessage)
    ws.send(
      JSON.stringify({
        module: NCA_MODULE,
        method,
        args,
      }),
    )
  })
}

/** Проверка: NCALayer слушает локальный WebSocket. */
export async function isNcaLayerAvailable(): Promise<boolean> {
  try {
    const ws = await connectNcaLayer()
    ws.close()
    return true
  } catch {
    return false
  }
}

/**
 * CMS-подпись base64-данных (PDF или текст) через диалог выбора файла-ключа.
 * По умолчанию откреплённая подпись (detached) — компактная, как у eGov Mobile.
 * Attached CMS встраивает весь PDF и не помещается в Firestore.
 */
export async function signBase64WithNcaLayer(
  dataBase64: string,
  opts?: { attached?: boolean },
): Promise<string> {
  const attached = opts?.attached ?? false
  const ws = await connectNcaLayer()
  try {
    return await ncaRequest(ws, 'createCMSSignatureFromBase64', [
      'PKCS12',
      'SIGNATURE',
      dataBase64,
      attached,
    ])
  } finally {
    ws.close()
  }
}

export function isNcaLayerUserCancel(err: unknown): boolean {
  return err instanceof NcaLayerCanceledError
}
