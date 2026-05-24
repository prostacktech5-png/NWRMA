/**
 * Run a command with JAVA_HOME set to JDK 17 (React Native / Gradle do not support Java 26).
 * Usage: node scripts/with-jdk17.mjs -- <command> [args...]
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function findJdk17Home() {
  const candidates = []

  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA ?? ''
    const msDir = path.join(local, 'Programs', 'Microsoft')
    if (fs.existsSync(msDir)) {
      for (const name of fs.readdirSync(msDir)) {
        if (/^jdk-17/i.test(name)) candidates.push(path.join(msDir, name))
      }
    }
    candidates.push(
      'C:\\Program Files\\Microsoft\\jdk-17.0.19.10-hotspot',
      'C:\\Program Files\\Android\\Android Studio\\jbr',
      path.join(process.env.ProgramFiles ?? '', 'Android', 'Android Studio', 'jbr'),
    )
    for (const base of ['C:\\Program Files\\Microsoft', 'C:\\Program Files\\Eclipse Adoptium']) {
      if (!fs.existsSync(base)) continue
      for (const name of fs.readdirSync(base)) {
        if (/^jdk-17/i.test(name)) candidates.push(path.join(base, name))
      }
    }
  } else {
    candidates.push(
      '/usr/lib/jvm/java-17-openjdk-amd64',
      '/usr/lib/jvm/java-17-openjdk',
    )
  }

  for (const dir of candidates) {
    const javaBin =
      process.platform === 'win32'
        ? path.join(dir, 'bin', 'java.exe')
        : path.join(dir, 'bin', 'java')
    if (fs.existsSync(javaBin)) return dir
  }
  return null
}

const sep = process.argv.indexOf('--')
const cmdArgs = sep >= 0 ? process.argv.slice(sep + 1) : process.argv.slice(2)
if (cmdArgs.length === 0) {
  console.error('Usage: node scripts/with-jdk17.mjs -- <command> [args...]')
  process.exit(1)
}

const jdkHome = findJdk17Home()
if (!jdkHome) {
  console.error('[with-jdk17] JDK 17 not found. Install: winget install Microsoft.OpenJDK.17')
  process.exit(1)
}

const [cmd, ...args] = cmdArgs
const env = {
  ...process.env,
  JAVA_HOME: jdkHome,
  PATH: `${path.join(jdkHome, 'bin')}${path.delimiter}${process.env.PATH ?? ''}`,
}

console.info(`[with-jdk17] JAVA_HOME=${jdkHome}`)
const result = spawnSync(cmd, args, {
  cwd: process.cwd(),
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
process.exit(result.status ?? 1)
