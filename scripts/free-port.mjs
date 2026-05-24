/**
 * Free a TCP port before starting dev (Windows + Unix).
 * Usage: node scripts/free-port.mjs 3000
 */
import { execSync } from 'child_process'

const port = process.argv[2]
if (!port || !/^\d+$/.test(port)) {
  console.error('Usage: node scripts/free-port.mjs <port>')
  process.exit(1)
}

function freePortWin() {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' })
    const pids = new Set()
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes('LISTENING')) continue
      const parts = line.trim().split(/\s+/)
      const pid = parts[parts.length - 1]
      if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid)
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
        console.log(`[free-port] Stopped PID ${pid} (was using port ${port})`)
      } catch {
        /* already gone */
      }
    }
    if (pids.size === 0) {
      console.log(`[free-port] Port ${port} is free`)
    }
  } catch {
    console.log(`[free-port] Port ${port} is free`)
  }
}

function freePortUnix() {
  try {
    const pids = execSync(`lsof -ti tcp:${port}`, { encoding: 'utf8' }).trim()
    if (!pids) {
      console.log(`[free-port] Port ${port} is free`)
      return
    }
    for (const pid of pids.split(/\s+/)) {
      if (!pid) continue
      try {
        execSync(`kill -9 ${pid}`, { stdio: 'ignore' })
        console.log(`[free-port] Stopped PID ${pid} (was using port ${port})`)
      } catch {
        /* ignore */
      }
    }
  } catch {
    console.log(`[free-port] Port ${port} is free`)
  }
}

if (process.platform === 'win32') {
  freePortWin()
} else {
  freePortUnix()
}
