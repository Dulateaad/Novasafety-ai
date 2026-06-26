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

function parasBetween(xml) {
  const parts = xml.split(/<w:tbl>/)
  const out = []
  for (let i = 0; i < parts.length; i++) {
    const chunk = i === 0 ? parts[i] : (parts[i].split(/<\/w:tbl>/).pop() ?? '')
    const paras = []
    for (const para of chunk.split(/<w:p[ >]/)) {
      const t = [...para.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join('')
      if (t.trim()) paras.push(t.trim())
    }
    if (paras.length) out.push({ beforeTable: i, paras })
  }
  return out
}

const files = [
  ['gas', 'c:/Users/dulat/Downloads/Разрешение_на_газоопасные_работы__RU__оранжевый_стиль_ (1).docx'],
  ['cs', 'c:/Users/dulat/Downloads/Разрешение_на_вход_в_замкнутое_пространство__RU_ (2).docx'],
  ['fire', 'c:/Users/dulat/Downloads/Разрешение_на_проведение_огневых_работ__RU__красный_стиль_ (1).docx'],
]

for (const [key, p] of files) {
  const zip = await JSZip.loadAsync(fs.readFileSync(p))
  const doc = await zip.file('word/document.xml').async('string')
  const tables = parseTables(doc)
  const sections = parasBetween(doc)
  console.log('\n########', key, path.basename(p))
  console.log('--- sections ---')
  sections.forEach((s) => {
    console.log(`[before T${s.beforeTable}]`)
    s.paras.forEach((t) => console.log(' ', t))
  })
  console.log('--- tables ---')
  tables.forEach((t, ti) => {
    console.log(`T${ti}: ${t.length} rows`)
    t.forEach((r, ri) => {
      console.log(
        `  R${ri}:`,
        r
          .map((c) => `[${c.span > 1 ? c.span + 'x' : ''}${c.text.slice(0, 55)}${c.fill ? '/' + c.fill : ''}]`)
          .join(' | '),
      )
    })
  })
}
