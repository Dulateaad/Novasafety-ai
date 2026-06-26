import fs from 'fs'
import JSZip from 'jszip'

const src = 'c:/Users/dulat/Downloads/3. Анализ Безопасности Работ.docx'
const zip = await JSZip.loadAsync(fs.readFileSync(src))
const rels = await zip.file('word/_rels/document.xml.rels').async('string')
const doc = await zip.file('word/document.xml').async('string')

const relMap = {}
for (const m of rels.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
  relMap[m[1]] = m[2]
}

const embeds = [...doc.matchAll(/r:embed="([^"]+)"/g)].map((m) => m[1])
for (const id of embeds) {
  console.log(id, '->', relMap[id])
}
