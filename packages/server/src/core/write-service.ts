import fs from 'node:fs'
import path from 'node:path'

const HISTORY_CAP = 50

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function pruneHistory(historyDir: string) {
  if (!fs.existsSync(historyDir)) return

  const files = fs.readdirSync(historyDir).sort()

  while (files.length > HISTORY_CAP) {
    const oldest = files.shift()!
    fs.unlinkSync(path.join(historyDir, oldest))
  }
}

export type WriteResult =
  | { ok: true; filePath: string; snapshotPath: string | null }
  | { ok: false; error: string; filePath: string }

export function writeFile(filePath: string, content: string, studioDir: string): WriteResult {
  const historyDir = path.join(studioDir, 'history')
  let snapshotPath: string | null = null

  try {
    // Step 1: Read current file for snapshot (if exists)
    let previousContent: string | null = null
    if (fs.existsSync(filePath)) {
      previousContent = fs.readFileSync(filePath, 'utf-8')
    }

    // Step 2: Snapshot to history
    if (previousContent !== null) {
      ensureDir(historyDir)
      const timestamp = Date.now()
      const basename = path.basename(filePath)
      snapshotPath = path.join(historyDir, `${timestamp}-${basename}`)
      fs.writeFileSync(snapshotPath, previousContent, 'utf-8')
    }

    // Step 3: Write to temp file
    const tmpPath = `${filePath}.tmp`
    ensureDir(path.dirname(filePath))
    fs.writeFileSync(tmpPath, content, 'utf-8')

    // Step 4: Atomic rename
    fs.renameSync(tmpPath, filePath)

    // Step 5: Verify
    const written = fs.readFileSync(filePath, 'utf-8')
    if (written !== content) {
      return { ok: false, error: 'Write verification failed: content mismatch', filePath }
    }

    // Step 6: Prune history
    pruneHistory(historyDir)

    return { ok: true, filePath, snapshotPath }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `Write failed: ${message}`, filePath }
  }
}

export function getHistory(studioDir: string): string[] {
  const historyDir = path.join(studioDir, 'history')
  if (!fs.existsSync(historyDir)) return []
  return fs.readdirSync(historyDir).sort().reverse()
}
