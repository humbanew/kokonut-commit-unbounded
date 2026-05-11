#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const workspace = process.cwd()
const customHookDir = process.argv[2]
const gitHooksDir = customHookDir
    ? path.resolve(workspace, customHookDir)
    : path.join(workspace, '.git', 'hooks')
const targetHook = path.join(gitHooksDir, 'prepare-commit-msg')

// Prefer symlink to the packaged CLI if available, otherwise fallback to a small stub
const preferredCli = path.join(process.cwd(), 'dist', 'cli.cjs')
const stub = `#!/usr/bin/env node
// Kokonut Commit prepare-commit-msg hook (fallback stub)
const { spawnSync } = require('child_process')
const path = require('path')
try {
    const preferred = path.join(process.cwd(), 'dist', 'cli.cjs')
    if (require('fs').existsSync(preferred)) {
        const res = spawnSync(process.execPath, [preferred, 'hook', 'set'], { stdio: 'inherit' })
        process.exit(res.status)
    }
    const script = path.join(process.cwd(), 'scripts', 'prepare-commit-msg.js')
    const res = spawnSync(process.execPath, [script, ...process.argv.slice(2)], { stdio: 'inherit' })
    process.exit(res.status)
} catch (e) {
    console.error('Kokonut Commit hook failed:', e.message)
    process.exit(0)
}
`

if (!customHookDir && !fs.existsSync(path.join(workspace, '.git'))) {
    console.error('No .git directory found. Run this from the repository root.')
    process.exit(1)
}

if (!fs.existsSync(gitHooksDir)) fs.mkdirSync(gitHooksDir, { recursive: true })

// Try to create a symlink to the packaged CLI. On platforms where symlink
// creation is restricted (Windows without privileges) fall back to the stub.
try {
    if (fs.existsSync(preferredCli)) {
        try {
            // remove existing file if present
            if (fs.existsSync(targetHook)) fs.rmSync(targetHook)
            fs.symlinkSync(preferredCli, targetHook, 'file')
            fs.chmodSync(targetHook, 0o755)
            console.log('Installed symlink to packaged CLI at', targetHook)
            process.exit(0)
        } catch (e) {
            // fallthrough to write stub
        }
    }
} catch (e) {
    // ignore and fallback
}

// Fallback: write the stub script
fs.writeFileSync(targetHook, stub, { mode: 0o755 })
console.log('Installed .git/hooks/prepare-commit-msg (stub)')
