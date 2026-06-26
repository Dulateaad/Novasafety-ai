import fs from 'fs'
import path from 'path'
import JSZip from 'jszip'

function parseTables(xml) {
  const tables = []
  const tblRe = /<w:tbl>([\s\S]*?)<\/w:tbl>/g
  let m
  while ((m = tblRe.exec(xml))) {
    const tbl = m[1]
    const rows = []
    for (const row of tbl.matchAll(/<w:tr[^>]*>([\s\S]*?)<\/w:tr>/g)) {
      const cells = []
      for (const tc of row[1].matchAll(/<w:tc[\s>]([\s\S]*?)<\/w:tc>/g)) {
        const texts = [...tc[1].matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
          .map((x) => x[1])
          .join('')
        const shd = tc[1].match(/w:fill="([^"]+)"/)
        const grid = tc[1].match(/w:gridSpan[^>]*w:val="(\d+)"/)
        cells.push({
          text: texts.trim(),
          fill: shd?.[1] ?? null,
          span: grid ? Number(grid[1]) : 1,
        })
      }
      rows.push(cells)
    }
    tables.push(rows)
  }
  return tables
}

const files = [
  ['gas', 'c:/Users/dulat/Downloads/Разрешение на газоопасные работы (RU, оранжевый стиль).docx'],
  ['cs', 'c:/Users/dulat/Downloads/Разрешение_на_вход_в_замкнутое_пространство__RU_.docx'],
  ['fire', 'c:/Users/dulat/Downloads/Разрешение на проведение огневых работ (RU, красный стиль).docx'],
]

for (const [key, p] of files) {
  const zip = await JSZip.loadAsync(fs.readFileSync(p))
  const doc = await zip.file('word/document.xml').async('string')
  const tables = parseTables(doc)
  console.log('\n###', key, path.basename(p), 'tables', tables.length)
  tables.forEach((t, ti) => {
    console.log(`T${ti}: ${t.length} rows`)
    t.forEach((r, ri) => {
      const line = r
        .map((c) => {
          const span = c.span > 1 ? `${c.span}x` : ''
          const fill = c.fill ? `/${c.fill}` : ''
          return `[${span}${c.text.slice(0, 50)}${fill}]`
        })
        .join(' | ')
      console.log(`  R${ri}: ${line}`)
    })
  })
}
