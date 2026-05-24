import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** `server/` folder (contains `prisma/`, `.env`). */
export const SERVER_ROOT = path.resolve(__dirname, '..')
const REPO_ROOT = path.resolve(SERVER_ROOT, '..')

dotenv.config({ path: path.join(REPO_ROOT, 'env', 'nwrma.env'), override: false })
dotenv.config({ path: path.join(SERVER_ROOT, '.env'), override: true })
dotenv.config({ path: path.join(SERVER_ROOT, '.env.local'), override: true })
