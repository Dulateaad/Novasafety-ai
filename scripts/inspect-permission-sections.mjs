import fs from 'fs'
import JSZip from 'jszip'

const files = [
  ['gas', 'c:/Users/dulat/Downloads/Разрешение на газоопасные работы (RU, оранжевый стиль).docx'],
  ['cs', 'c:/Users/dulat/Downloads/Разрешение_на_вход_в_замкнутое_пространство__RU_.docx'],
  ['fire', 'c:/Users/dulat/Downloads/Разрешение на проведение огневых работ (RU, красный стиль).docx'],
]

for (const [key, p] of files) {
  const zip = await JSZip.loadAsync(fs.readFileSync(p))
  const doc = await zip.file('word/document.xml').async('string')
  const parts = doc.split(/<w:tbl>/)
  console.log('\n###', key)
  for (let i = 0; i < parts.length; i++) {
    const chunk = parts[i]
    const beforeTbl = i === 0 ? chunk : chunk.split(/<\/w:tbl>/).pop() ?? ''
    const paras = []
    for (const para of beforeTbl.split(/<w:p[ >]/)) {
      const t = [...para.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join('')
      if (t.trim()) paras.push(t.trim())
    }
    if (paras.length) {
      console.log('Before table', i, ':')
      paras.forEach((t) => console.log('  ', t))
    }
  }
}
