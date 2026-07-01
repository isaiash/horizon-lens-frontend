import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcDist = join(root, 'frontend', 'dist')
const deployDist = join(root, 'dist')
const horizonDist = join(deployDist, 'horizon')

if (!existsSync(join(srcDist, 'index.html'))) {
  console.error('frontend/dist/index.html missing — run the frontend build first.')
  process.exit(1)
}

rmSync(deployDist, { recursive: true, force: true })
mkdirSync(horizonDist, { recursive: true })
cpSync(srcDist, horizonDist, { recursive: true })

// Pages-style SPA fallback in the horizon folder loops on Workers (/horizon/index.html).
rmSync(join(horizonDist, '_redirects'), { force: true })

writeFileSync(join(deployDist, '_redirects'), '/horizon /horizon/ 301\n')

console.log('Deploy bundle ready at dist/horizon/')
