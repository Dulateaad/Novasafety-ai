function pdfBlobUrlFromBase64(base64: string): string {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  return URL.createObjectURL(blob)
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function pdfTabTitleFromFileName(fileName: string): string {
  return fileName.replace(/\.pdf$/i, '').trim() || 'Документ PDF'
}

/** Открыть PDF в новой вкладке с понятным заголовком вкладки. */
export function openPdfInBrowser(base64: string, title?: string): boolean {
  const pdfUrl = pdfBlobUrlFromBase64(base64)
  const pageTitle = title?.trim() || 'Документ PDF'
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(pageTitle)}</title>
  <style>
    html, body { margin: 0; height: 100%; overflow: hidden; }
    iframe { width: 100%; height: 100%; border: 0; }
  </style>
</head>
<body>
  <iframe src="${pdfUrl}" title="${escapeHtml(pageTitle)}"></iframe>
</body>
</html>`

  const htmlUrl = URL.createObjectURL(
    new Blob([html], { type: 'text/html;charset=utf-8' }),
  )
  const opened = window.open(htmlUrl, '_blank')
  if (opened) {
    opened.opener = null
  } else {
    const link = document.createElement('a')
    link.href = pdfUrl
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  window.setTimeout(() => {
    URL.revokeObjectURL(pdfUrl)
    URL.revokeObjectURL(htmlUrl)
  }, 120_000)
  return true
}
