import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const root = process.cwd()
const sourceDir = join(root, 'src', 'data', 'sections', 'source')
const outputDir = join(root, 'src', 'data', 'sections', 'generated')
const outputFile = join(outputDir, 'sections.json')

const familyConfig = {
  ipn: { key: 'IPN', label: 'IPN', shapeType: 'i-shape' },
  ipe: { key: 'IPE', label: 'IPE', shapeType: 'i-shape' },
  hea: { key: 'HEA', label: 'HEA', shapeType: 'i-shape' },
  heb: { key: 'HEB', label: 'HEB', shapeType: 'i-shape' },
  hem: { key: 'HEM', label: 'HEM', shapeType: 'i-shape' },
  hd: { key: 'HD', label: 'HD', shapeType: 'i-shape' },
  upn: { key: 'UPN', label: 'UPN', shapeType: 'channel' },
  equal_angles: { key: 'equal-angle', label: 'Equal angle', shapeType: 'equal-angle' },
  unequal_angles: { key: 'unequal-angle', label: 'Unequal angle', shapeType: 'unequal-angle' },
}

const dimensionFields = new Set([
  'd_mm',
  'bf_mm',
  'tw_mm',
  'tf_mm',
  'r_mm',
  'hi_mm',
  'h_mm',
  'b_mm',
  't_mm',
  'r1_mm',
])

const conversions = {
  A_cm2: ['A_mm2', 100],
  Ix_cm4: ['Ix_mm4', 10000],
  Iy_cm4: ['Iy_mm4', 10000],
  Iu_cm4: ['Iu_mm4', 10000],
  Iv_cm4: ['Iv_mm4', 10000],
  Ixy_cm4: ['Ixy_mm4', 10000],
  J_cm4: ['J_mm4', 10000],
  Sx_cm3: ['Sx_mm3', 1000],
  Sy_cm3: ['Sy_mm3', 1000],
  Zx_cm3: ['Zx_mm3', 1000],
  Zy_cm3: ['Zy_mm3', 1000],
  rx_cm: ['rx_mm', 10],
  ry_cm: ['ry_mm', 10],
  ru_cm: ['ru_mm', 10],
  rv_cm: ['rv_mm', 10],
  xs_cm: ['xs_mm', 10],
  ys_cm: ['ys_mm', 10],
  xm_cm: ['xm_mm', 10],
  v_cm: ['v_mm', 10],
  v1_cm: ['v1_mm', 10],
  v2_cm: ['v2_mm', 10],
  u1_cm: ['u1_mm', 10],
  u2_cm: ['u2_mm', 10],
  u3_cm: ['u3_mm', 10],
}

function parseCsvLine(line) {
  const cells = []
  let cell = ''
  let quoted = false

  for (const char of line) {
    if (char === '"') {
      quoted = !quoted
      continue
    }

    if (char === ',' && !quoted) {
      cells.push(cell)
      cell = ''
      continue
    }

    cell += char
  }

  cells.push(cell)
  return cells.map((value) => value.trim())
}

function readCsv(path) {
  const lines = readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))

  const [headerLine, ...rowLines] = lines
  const headers = parseCsvLine(headerLine)

  return rowLines.map((line) => {
    const values = parseCsvLine(line)
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))
  })
}

function numberOrBlank(value) {
  if (value === '' || value == null) {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function addIfPresent(target, key, value) {
  const parsed = numberOrBlank(value)
  if (parsed !== undefined) {
    target[key] = parsed
  }
}

function normalizeNumber(value) {
  return Number(value.toFixed(6))
}

function normalizeRow(row, config) {
  const dimensions = {}
  const properties = {}
  const source = {}

  for (const [key, value] of Object.entries(row)) {
    if (['family', 'designation', 'shapeType', 'verified'].includes(key) || value === '') {
      continue
    }

    addIfPresent(source, key, value)

    if (dimensionFields.has(key)) {
      addIfPresent(dimensions, key, value)
      continue
    }

    if (conversions[key]) {
      const [normalizedKey, factor] = conversions[key]
      const parsed = numberOrBlank(value)
      if (parsed !== undefined) {
        properties[normalizedKey] = normalizeNumber(parsed * factor)
      }
    }
  }

  return {
    family: config.key,
    designation: row.designation,
    shapeType: config.shapeType,
    G_kg_per_m: numberOrBlank(row.G_kg_per_m),
    dimensions,
    properties,
    source,
    verified: row.verified === 'true',
  }
}

const families = {}

for (const file of readdirSync(sourceDir).filter((name) => name.endsWith('.csv')).sort()) {
  const sourceKey = basename(file, '.csv')
  const config = familyConfig[sourceKey]

  if (!config) {
    throw new Error(`No family config exists for ${file}`)
  }

  const rows = readCsv(join(sourceDir, file)).map((row) => normalizeRow(row, config))
  families[config.key] = {
    label: config.label,
    shapeType: config.shapeType,
    sections: rows,
  }
}

let generatedAt = new Date().toISOString()

if (existsSync(outputFile)) {
  const existing = JSON.parse(readFileSync(outputFile, 'utf8'))
  if (JSON.stringify(existing.families) === JSON.stringify(families)) {
    generatedAt = existing.meta?.generatedAt ?? generatedAt
  }
}

const database = {
  meta: {
    library: 'European/METU',
    units: 'mm-based normalized properties',
    generatedAt,
    verifiedPolicy: 'Rows remain unverified until manually checked.',
  },
  families,
}

mkdirSync(outputDir, { recursive: true })
writeFileSync(outputFile, `${JSON.stringify(database, null, 2)}\n`)

const counts = Object.entries(families)
  .map(([family, data]) => `${family}: ${data.sections.length}`)
  .join(', ')

console.log(`Generated ${outputFile}`)
console.log(`Section rows: ${counts}`)
