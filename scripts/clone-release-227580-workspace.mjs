/**
 * Clone / restore workspace to match release 227580 (a0bb14cae4227580).
 * - Creates sibling folder ../e-ptw-227580 (full project copy)
 * - Syncs current project (src, functions, dist) to the same baseline
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const releaseRoot = path.join(root, 'releases', '227580-a0bb14cae4227580')
const transcriptSrc = path.join(root, 'recovery', 'all-transcripts', 'src')
const transcriptPublic = path.join(root, 'recovery', 'all-transcripts', 'public')
const cloneRoot = path.join(path.dirname(root), 'e-ptw-227580')

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  'releases',
  'recovery',
  'e-ptw-227580',
  '.firebase',
])

const REMOVE_SRC = [
  'components/AbrDailyAckPanel.tsx',
  'components/CrewManagementPanel.tsx',
  'components/ReplacePerformerPanel.tsx',
  'components/PermitExtensionCard.tsx',
  'components/AiDisclaimerNotice.tsx',
  'lib/abrDailyAck.ts',
  'lib/ndprExtension.ts',
  'lib/permitValidity.ts',
  'types/abrDailyAck.ts',
]

const ONEDRIVE_SRC = 'C:\\Users\\dulat\\OneDrive\\Desktop\\gp_2026_cad26\\e-ptw\\src'

const RECOVERY_OVERRIDES = [
  {
    dest: 'pages/PermitDetailPage.tsx',
    candidates: [
      path.join(ONEDRIVE_SRC, 'pages', 'PermitDetailPage.tsx'),
      path.join(transcriptSrc, 'pages', 'PermitDetailPage.tsx'),
    ],
  },
  {
    dest: 'pages/PermitListPage.tsx',
    candidates: [path.join(root, 'recovery', 'PermitListPage-longest.tsx')],
  },
  {
    dest: 'types/domain.ts',
    candidates: [path.join(root, 'recovery', 'domain-longest.ts')],
  },
]

function exists(p) {
  return fs.existsSync(p)
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
}

function copyTree(src, dest, { skipDirs = SKIP_DIRS, filter } = {}) {
  if (!exists(src)) return 0
  let n = 0
  fs.mkdirSync(dest, { recursive: true })
  for (const name of fs.readdirSync(src, { withFileTypes: true })) {
    if (name.isDirectory() && skipDirs.has(name.name)) continue
    const s = path.join(src, name.name)
    const d = path.join(dest, name.name)
    if (name.isDirectory()) n += copyTree(s, d, { skipDirs, filter })
    else if (!filter || filter(s)) {
      copyFile(s, d)
      n++
    }
  }
  return n
}

function rmDir(dir) {
  if (exists(dir)) fs.rmSync(dir, { recursive: true, force: true })
}

function pickLargest(candidates) {
  let best = null
  for (const c of candidates) {
    if (!exists(c)) continue
    const len = fs.statSync(c).size
    if (!best || len > best.len) best = { path: c, len }
  }
  return best?.path ?? null
}

function fixKnownSyntaxIssues(srcDest) {
  const permitDetail = path.join(srcDest, 'pages', 'PermitDetailPage.tsx')
  if (!exists(permitDetail)) return
  let text = fs.readFileSync(permitDetail, 'utf8')
  const broken =
    'function canEditLeadExpertSign(): boolean {  function canEditLeadExpertSign(): boolean {'
  if (text.includes(broken)) {
    text = text.replace(broken, 'function canEditLeadExpertSign(): boolean {')
    fs.writeFileSync(permitDetail, text)
    console.log('fixed PermitDetailPage.tsx duplicate function line')
  }
}

function apply227580Overlay(projectRoot) {
  console.log(`\n=== Overlay 227580 → ${projectRoot} ===`)

  const distSrc = path.join(releaseRoot, 'dist')
  const distDest = path.join(projectRoot, 'dist')
  rmDir(distDest)
  const distN = copyTree(distSrc, distDest, { skipDirs: new Set() })
  console.log(`dist: ${distN} files`)

  const fnSnap = path.join(releaseRoot, 'functions')
  for (const rel of ['src', 'scripts', 'package.json', 'tsconfig.json']) {
    const s = path.join(fnSnap, rel)
    const d = path.join(projectRoot, 'functions', rel)
    if (!exists(s)) continue
    if (fs.statSync(s).isDirectory()) {
      rmDir(d)
      copyTree(s, d, { skipDirs: new Set(['node_modules']) })
      console.log(`functions/${rel}: copied`)
    } else {
      copyFile(s, d)
      console.log(`functions/${rel}: copied`)
    }
  }

  const srcDest = path.join(projectRoot, 'src')
  if (exists(ONEDRIVE_SRC)) {
    rmDir(srcDest)
    const n = copyTree(ONEDRIVE_SRC, srcDest, { skipDirs: new Set() })
    console.log(`src from OneDrive mirror: ${n} files`)
  } else if (exists(transcriptSrc)) {
    const n = copyTree(transcriptSrc, srcDest, { skipDirs: new Set() })
    console.log(`src overlay (all-transcripts): ${n} files`)
  }

  for (const row of RECOVERY_OVERRIDES) {
    const pick = pickLargest(row.candidates.filter(exists))
    if (!pick) continue
    const dest = path.join(srcDest, row.dest)
    copyFile(pick, dest)
    console.log(`src override ${row.dest} ← ${path.basename(pick)}`)
  }

  fixKnownSyntaxIssues(srcDest)

  for (const rel of REMOVE_SRC) {
    const p = path.join(srcDest, rel)
    if (exists(p)) {
      fs.unlinkSync(p)
      console.log(`removed ${rel}`)
    }
  }

  if (exists(transcriptPublic)) {
    copyTree(transcriptPublic, path.join(projectRoot, 'public'), { skipDirs: new Set() })
    console.log('public: merged from all-transcripts')
  }

  const envSnap = path.join(releaseRoot, 'functions', '.env')
  const envDest = path.join(projectRoot, '.env')
  if (exists(envSnap) && !exists(envDest)) {
    copyFile(envSnap, envDest)
    console.log('.env: copied from snapshot')
  }
}

function cloneProjectSkeleton(destRoot) {
  console.log(`\n=== Clone skeleton → ${destRoot} ===`)
  rmDir(destRoot)
  fs.mkdirSync(destRoot, { recursive: true })

  let n = 0
  for (const name of fs.readdirSync(root, { withFileTypes: true })) {
    if (SKIP_DIRS.has(name.name)) continue
    const s = path.join(root, name.name)
    const d = path.join(destRoot, name.name)
    if (name.isDirectory()) n += copyTree(s, d)
    else {
      copyFile(s, d)
      n++
    }
  }
  console.log(`skeleton: ${n} files`)
}

console.log('Release 227580 workspace clone')
console.log(`Source release: ${releaseRoot}`)

if (!exists(path.join(releaseRoot, 'dist', 'index.html'))) {
  console.error('Run npm run release:227580:assemble first.')
  process.exit(1)
}

cloneProjectSkeleton(cloneRoot)
apply227580Overlay(cloneRoot)
apply227580Overlay(root)

fs.writeFileSync(
  path.join(releaseRoot, 'WORKSPACE_CLONED.json'),
  JSON.stringify(
    {
      releaseId: '227580',
      clonedAt: new Date().toISOString(),
      clonePath: cloneRoot,
      projectPath: root,
      removedSrcFiles: REMOVE_SRC,
    },
    null,
    2,
  ) + '\n',
)

console.log('\nDone.')
console.log(`Clone folder: ${cloneRoot}`)
console.log(`Active project synced: ${root}`)
console.log('Deploy hosting: npm run deploy:release-227580')
