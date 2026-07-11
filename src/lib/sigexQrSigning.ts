/**
 * Обёртка над sigex-qr-signing-client (SIGEX API / eGov Mobile QR).
 * @see https://github.com/sigex-kz/sigex-qr-signing-client
 */

// UMD-модуль SIGEX
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error — пакет без типов
import { QRSigningClientCMS } from 'sigex-qr-signing-client/sigex-qr-signing-client.js'

export interface QrSigningSession {
  qrCodeBase64: string
  eGovMobileLaunchLink: string
  eGovBusinessLaunchLink: string
  /** Запускает long-poll получения CMS после сканирования QR. */
  waitForSignature: (
    onDataSent?: () => void,
  ) => Promise<string>
}

export class SigexQrCanceledError extends Error {
  constructor(message = 'Подписание отменено') {
    super(message)
    this.name = 'SigexQrCanceledError'
  }
}

export async function startSigexQrSigning(opts: {
  description: string
  documentTitle: string
  dataBase64: string
  isPdf?: boolean
  meta?: { name: string; value: string }[]
  sigexBaseUrl?: string
}): Promise<QrSigningSession> {
  const baseUrl = opts.sigexBaseUrl?.replace(/\/$/, '') || 'https://sigex.kz'
  const client = new QRSigningClientCMS(opts.description, false, baseUrl)
  await client.addDataToSign(
    [opts.documentTitle],
    opts.dataBase64,
    opts.meta ?? [],
    false,
  )
  const qrCodeBase64 = await client.registerQRSinging()

  return {
    qrCodeBase64,
    eGovMobileLaunchLink: client.getEGovMobileLaunchLink(),
    eGovBusinessLaunchLink: client.getEGovBusinessLaunchLink(),
    waitForSignature: (onDataSent) =>
      client.getSignatures(onDataSent).then((sigs: string[]) => {
        if (!sigs?.[0]) throw new Error('SIGEX: пустой ответ подписи')
        return sigs[0]
      }),
  }
}

export function isSigexUserCancel(err: unknown): boolean {
  return (
    !!err &&
    typeof err === 'object' &&
    'canceledByUser' in err &&
    Boolean((err as { canceledByUser?: boolean }).canceledByUser)
  )
}

export { QRSigningClientCMS }
