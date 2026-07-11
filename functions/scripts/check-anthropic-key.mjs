/**
 * Проверка ANTHROPIC_API_KEY из functions/.env (без вывода ключа).
 * Запуск: node scripts/check-anthropic-key.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const TEST_MODELS = [
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-20250514',
  'claude-3-5-sonnet-20241022',
]

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
let text = readFileSync(join(root, '.env'), 'utf8')
if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)

const line = text
  .split(/\r?\n/)
  .map((l) => l.trim())
  .find((l) => l && !l.startsWith('#') && l.includes('='))

if (!line) {
  console.error('FAIL: в functions/.env нет ANTHROPIC_API_KEY')
  process.exitCode = 1
} else {
  const eq = line.indexOf('=')
  const name = line.slice(0, eq).trim()
  const key = line.slice(eq + 1).trim()

  if (name !== 'ANTHROPIC_API_KEY' || !key) {
    console.error(`FAIL: ожидалась строка ANTHROPIC_API_KEY=..., найдено ${name}`)
    process.exitCode = 1
  } else if (!key.startsWith('sk-ant-')) {
    console.error('FAIL: ключ должен начинаться с sk-ant-')
    process.exitCode = 1
  } else {
    console.log(`Проверка ключа (длина ${key.length}, суффикс …${key.slice(-6)})`)

    let saw401 = false
    let lastStatus = 0
    let lastMsg = ''

    for (const model of TEST_MODELS) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 8,
          messages: [{ role: 'user', content: 'ok' }],
        }),
      })

      const body = await res.text()
      let errMsg = ''
      try {
        errMsg = JSON.parse(body)?.error?.message ?? ''
      } catch {
        errMsg = body.slice(0, 120)
      }

      lastStatus = res.status
      lastMsg = errMsg || body.slice(0, 120)

      if (res.status === 401) {
        saw401 = true
        break
      }
      if (res.ok) {
        console.log('OK: ключ принят Anthropic (модель', model + ', HTTP', res.status + ')')
        process.exitCode = 0
        break
      }
      if (res.status !== 404) {
        console.error('FAIL: HTTP', res.status, lastMsg)
        process.exitCode = 1
        break
      }
    }

    if (process.exitCode === undefined) {
      if (saw401) {
        console.error('FAIL: HTTP 401 invalid x-api-key')
        console.error(
          'Ключ недействителен. Создайте новый на https://console.anthropic.com → API Keys,',
        )
        console.error('вставьте в functions/.env и выполните deploy functions.')
        process.exitCode = 1
      } else if (lastStatus === 404) {
        console.log(
          'OK: ключ принят Anthropic (тестовые модели недоступны, но 401 не было — авторизация в порядке)',
        )
        process.exitCode = 0
      } else {
        console.error('FAIL: HTTP', lastStatus, lastMsg)
        process.exitCode = 1
      }
    }
  }
}
