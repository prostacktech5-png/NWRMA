/**
 * Link tst media into web/public for Next.js marketing pages.
 * Marketing UI is rendered by App Router — no Vite SPA deploy.
 * Run from web/: npm run prepare:public
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.join(__dirname, '..')
const repoRoot = path.join(webRoot, '..')
const siteRoot = path.join(repoRoot, 'tst')
const publicDir = path.join(webRoot, 'public')

function removeIfExists(target) {
  try {
    fs.rmSync(target, { recursive: true, force: true, maxRetries: 3 })
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
  }
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

function linkOrCopyDir(source, target) {
  if (!fs.existsSync(source)) {
    console.warn(`[prepare-public] missing ${source} — skip`)
    return
  }
  removeIfExists(target)
  try {
    fs.symlinkSync(source, target, 'junction')
    console.log(`[prepare-public] linked ${path.relative(repoRoot, source)} -> ${path.relative(webRoot, target)}`)
  } catch (err) {
    console.warn(`[prepare-public] junction failed, copying…`, err.message)
    copyDirSync(source, target)
  }
}

function main() {
  fs.mkdirSync(publicDir, { recursive: true })

  const spaIndex = path.join(publicDir, 'index.html')
  if (fs.existsSync(spaIndex)) {
    fs.unlinkSync(spaIndex)
    console.log('[prepare-public] removed legacy public/index.html (SPA)')
  }

  const uploadsSrc = path.join(siteRoot, 'wp-content', 'uploads')
  const uploadsDest = path.join(publicDir, 'assets', 'uploads')
  linkOrCopyDir(uploadsSrc, uploadsDest)

  const wpContentSrc = path.join(siteRoot, 'wp-content')
  if (fs.existsSync(wpContentSrc)) {
    linkOrCopyDir(wpContentSrc, path.join(publicDir, 'wp-content'))
  }

  const erpLogoName = 'image-removebg-preview.png'
  const erpLogoDest = path.join(publicDir, erpLogoName)
  const erpLogoCandidates = [
    path.join(repoRoot, 'android app', 'public', erpLogoName),
    path.join(webRoot, 'public', erpLogoName),
    path.join(uploadsSrc, '2020', '10', '2-2.png'),
  ]
  for (const src of erpLogoCandidates) {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, erpLogoDest)
      console.log(`[prepare-public] ERP logo -> /${erpLogoName} (from ${path.relative(repoRoot, src)})`)
      break
    }
  }
  if (!fs.existsSync(erpLogoDest)) {
    console.warn(`[prepare-public] missing ERP logo; login/sidebar expect /${erpLogoName}`)
  }

  console.log('[prepare-public] linked tst uploads for /assets/uploads and /wp-content')
}

main()
