/**
 * Download stock imagery for NWRMA public site (run once: node scripts/fetch-nwrma-assets.mjs)
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'public', 'nwrma-site')

const images = {
  'hero-home.jpg': 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=80',
  'banner-default.jpg': 'https://images.unsplash.com/photo-1548838526-1c30e2cbbcea?w=1920&q=80',
  'banner-about.jpg': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
  'dept-planning.jpg': 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80',
  'dept-legal.jpg': 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&q=80',
  'dept-admin.jpg': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
  'dept-finance.jpg': 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80',
  'dept-hydro.jpg': 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=80',
  'tile-data.jpg': 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600&q=80',
  'tile-maps.jpg': 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&q=80',
  'tile-publications.jpg': 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&q=80',
  'about-side.jpg': 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80',
}

fs.mkdirSync(outDir, { recursive: true })

for (const [name, url] of Object.entries(images)) {
  const dest = path.join(outDir, name)
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
    console.log('skip', name)
    continue
  }
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'NWRMA-Asset-Fetch/1.0' } })
    if (!res.ok) throw new Error(res.statusText)
    const buf = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(dest, buf)
    console.log('ok', name, buf.length)
  } catch (e) {
    console.error('fail', name, e.message)
  }
}
