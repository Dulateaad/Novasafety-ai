import fs from 'fs'
const js = fs.readFileSync(
  'D:/gp_2026_cad26/e-ptw/recovery/hosting-227580/assets/index-uHv8gsD8.js',
  'utf8',
)
const start = js.indexOf('function YE()')
const end = js.indexOf('function qE', start)
const chunk = js.slice(start, start + 25000)
console.log(chunk)
