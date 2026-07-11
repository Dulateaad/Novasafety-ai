/**
 * ТЗ из docs/TZ_NOVA_Safety.md → docs/TZ_NOVA_Safety.docx
 * Запуск: node scripts/generate-tz-docx.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  VerticalAlign,
} from 'docx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MD = path.join(__dirname, '..', 'docs', 'TZ_NOVA_Safety.md')
const OUT = path.join(__dirname, '..', 'docs', 'TZ_NOVA_Safety.docx')

const FONT = 'Times New Roman'
const SZ = 24
const SZ_SM = 20
const PAGE_W = 11906
const MARGIN = 850
const CONTENT_W = PAGE_W - MARGIN * 2

function stripMd(s) {
  return String(s)
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim()
}

function runsFromInline(text, base = {}) {
  const parts = []
  const re = /\*\*(.+?)\*\*|`([^`]+)`|([^*`]+)/g
  let m
  while ((m = re.exec(text)) !== null) {
    if (m[1] != null) {
      parts.push(new TextRun({ text: m[1], font: FONT, size: SZ, bold: true, ...base }))
    } else if (m[2] != null) {
      parts.push(new TextRun({ text: m[2], font: 'Consolas', size: SZ_SM, ...base }))
    } else if (m[3]) {
      parts.push(new TextRun({ text: m[3], font: FONT, size: SZ, ...base }))
    }
  }
  if (parts.length === 0) {
    parts.push(new TextRun({ text: stripMd(text), font: FONT, size: SZ, ...base }))
  }
  return parts
}

function p(children, opts = {}) {
  const runs =
    typeof children === 'string' ? runsFromInline(children) : children
  return new Paragraph({
    spacing: { after: 120, line: 276 },
    children: runs,
    ...opts,
  })
}

function cell(text, widthDx, opts = {}) {
  const { bold = false, fill } = opts
  return new TableCell({
    width: { size: widthDx, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    shading: fill ? { fill } : undefined,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    },
    children: [
      new Paragraph({
        spacing: { after: 40, before: 40 },
        children: [
          new TextRun({
            text: stripMd(text),
            font: FONT,
            size: SZ_SM,
            bold,
          }),
        ],
      }),
    ],
  })
}

function makeTable(rows) {
  if (!rows.length) return null
  const cols = Math.max(...rows.map((r) => r.length))
  const widths = Array.from({ length: cols }, () => Math.floor(CONTENT_W / cols))
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    rows: rows.map(
      (row, ri) =>
        new TableRow({
          children: Array.from({ length: cols }, (_, ci) =>
            cell(row[ci] ?? '', widths[ci], {
              bold: ri === 0,
              fill: ri === 0 ? 'E8E8E8' : undefined,
            }),
          ),
        }),
    ),
  })
}

function parseTableBlock(lines) {
  const rows = []
  for (const line of lines) {
    if (/^\|[\s\-:|]+\|$/.test(line.trim())) continue
    const cells = line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim())
    if (cells.every((c) => c === '')) continue
    rows.push(cells)
  }
  return rows
}

function mdToChildren(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const children = []
  let i = 0
  let titleDone = false

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed || trimmed === '---') {
      i++
      continue
    }

    if (trimmed.startsWith('# ') && !titleDone) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: runsFromInline(trimmed.slice(2), { bold: true, size: 32 }),
        }),
      )
      i++
      if (i < lines.length && lines[i].trim().startsWith('# ')) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: runsFromInline(lines[i].trim().slice(2), { bold: true, size: 28 }),
          }),
        )
        i++
      }
      titleDone = true
      continue
    }

    if (trimmed.startsWith('## ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 280, after: 120 },
          children: [
            new TextRun({
              text: stripMd(trimmed.slice(3)),
              font: FONT,
              size: 28,
              bold: true,
            }),
          ],
        }),
      )
      i++
      continue
    }

    if (trimmed.startsWith('### ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({
              text: stripMd(trimmed.slice(4)),
              font: FONT,
              size: 26,
              bold: true,
            }),
          ],
        }),
      )
      i++
      continue
    }

    if (trimmed.startsWith('|')) {
      const block = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        block.push(lines[i])
        i++
      }
      const table = makeTable(parseTableBlock(block))
      if (table) {
        children.push(table)
        children.push(p(''))
      }
      continue
    }

    if (/^[-*]\s+/.test(trimmed)) {
      children.push(
        p(runsFromInline(trimmed.replace(/^[-*]\s+/, '')), {
          indent: { left: 360 },
        }),
      )
      i++
      continue
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      children.push(
        p(runsFromInline(trimmed), {
          indent: { left: 360 },
        }),
      )
      i++
      continue
    }

    if (trimmed.startsWith('*') && trimmed.endsWith('*') && !trimmed.startsWith('**')) {
      children.push(
        p(stripMd(trimmed), {
          spacing: { before: 200, after: 80 },
          italics: undefined,
        }),
      )
      // italic note
      children[children.length - 1] = new Paragraph({
        spacing: { before: 200, after: 80 },
        children: [
          new TextRun({
            text: stripMd(trimmed),
            font: FONT,
            size: SZ_SM,
            italics: true,
          }),
        ],
      })
      i++
      continue
    }

    children.push(p(trimmed))
    i++
  }

  return children
}

const md = fs.readFileSync(MD, 'utf8')
const doc = new Document({
  styles: {
    default: {
      document: {
        styles: [
          {
            id: 'Normal',
            name: 'Normal',
            run: { font: FONT, size: SZ },
          },
        ],
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          margin: {
            top: MARGIN,
            bottom: MARGIN,
            left: MARGIN,
            right: MARGIN,
          },
        },
      },
      children: mdToChildren(md),
    },
  ],
})

const buf = await Packer.toBuffer(doc)
fs.writeFileSync(OUT, buf)
console.log('OK:', OUT)
