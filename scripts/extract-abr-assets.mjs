import fs from 'fs'
import path from 'path'
import JSZip from 'jszip'

const src = process.argv[2] || 'c:/Users/dulat/Downloads/3. Анализ Безопасности Работ.docx'
const outDir = path.resolve('public/assets/abr')
fs.mkdirSync(outDir, { recursive: true })

const buf = fs.readFileSync(src)
const zip = await JSZip.loadAsync(buf)
const xml = await zip.file('word/document.xml').async('string')

// extract images
for (const name of Object.keys(zip.files)) {
  if (!name.startsWith('word/media/')) continue
  const data = await zip.file(name).async('nodebuffer')
  const base = path.basename(name)
  fs.writeFileSync(path.join(outDir, base), data)
  console.log('saved', base, data.length)
}

// find tbl with shd colors sequence
const rows = xml.split(/<w:tr[\s>]/).slice(1)
let ri = 0
for (const row of rows.slice(0, 40)) {
  const fills = [...row.matchAll(/w:shd[^>]*w:fill="([^"]+)"/g)].map((m) => m[1])
  const texts = [...row.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).filter(Boolean)
  if (fills.length || texts.length) {
    console.log('row', ++ri, 'fills:', fills.join('|'), 'text:', texts.slice(0, 3).join(' / '))
  }
}

// blip embed ids
const embeds = [...xml.matchAll(/r:embed="([^"]+)"/g)].map((m) => m[1])
console.log('embeds count', embeds.length, embeds.slice(0, 15))
