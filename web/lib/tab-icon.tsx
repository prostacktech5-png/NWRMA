import { ImageResponse } from 'next/og'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const LOGO_CANDIDATES = [
  'image-removebg-preview.png',
  path.join('assets', 'uploads', '2020', '10', '2-2.png'),
]

export async function loadLogoDataUrl(): Promise<string | null> {
  for (const rel of LOGO_CANDIDATES) {
    const filePath = path.join(process.cwd(), 'public', rel)
    if (!existsSync(filePath)) continue
    const buf = await readFile(filePath)
    return `data:image/png;base64,${buf.toString('base64')}`
  }
  return null
}

export function tabIconImageResponse(size: number, logo: string | null) {
  const inset = Math.round(size * 0.12)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
        }}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt=""
            width={size - inset * 2}
            height={size - inset * 2}
            style={{ objectFit: 'contain' }}
          />
        ) : (
          <div
            style={{
              width: size - inset * 2,
              height: size - inset * 2,
              borderRadius: '50%',
              background: '#349e41',
            }}
          />
        )}
      </div>
    ),
    { width: size, height: size },
  )
}
