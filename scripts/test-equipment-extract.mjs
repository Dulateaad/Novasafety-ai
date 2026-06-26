import fs from 'fs'
import mammoth from 'mammoth'
import { extractToolsAndEquipmentFromDoc } from '../src/lib/pprNdprRules.ts'

const path =
  process.argv[2] ||
  'c:/Users/dulat/OneDrive/Desktop/Method Statement cleaning GRE U12 - GS 05.05.26 (6).docx'

const buf = fs.readFileSync(path)
const { value: text } = await mammoth.extractRawText({ buffer: buf })

const result = extractToolsAndEquipmentFromDoc(text)
const items = result.split('\n').filter(Boolean)
console.log('COUNT', items.length)
for (const item of items) console.log('-', item)
