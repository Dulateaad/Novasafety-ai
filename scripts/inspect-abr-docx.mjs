import fs from 'fs'
import JSZip from 'jszip'

const p = process.argv[2] || 'c:/Users/dulat/Downloads/3. Анализ Безопасности Работ.docx'
const buf = fs.readFileSync(p)
const zip = await JSZip.loadAsync(buf)

for (const name of ['word/document.xml', 'word/styles.xml', 'word/theme/theme1.xml']) {
  const f = zip.file(name)
  if (!f) continue
  const xml = await f.async('string')
  const shd = [...xml.matchAll(/w:shd[^/]*w:fill="([^"]+)"/g)].map((m) => m[1])
  const color = [...xml.matchAll(/w:color[^/]*w:val="([^"]+)"/g)].map((m) => m[1])
  console.log('\n==', name, '==')
  console.log('shd fills:', [...new Set(shd)].join(', '))
  console.log('colors:', [...new Set(color)].slice(0, 30).join(', '))
}

const media = Object.keys(zip.files).filter((k) => k.startsWith('word/media/'))
console.log('\nmedia:', media)
