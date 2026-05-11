#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

// Usage: node scripts/prepare-commit-msg.cjs <COMMIT_MSG_FILE> <COMMIT_SOURCE>
const [, , commitFile] = process.argv
if (!commitFile) process.exit(0)

try {
    const original = fs.readFileSync(commitFile, 'utf8')
    // If message is already present, do nothing
    if (original && original.trim().length > 0) {
        process.exit(0)
    }

    // Call the generator script which writes the commit message to stdout
    const generator = path.join(process.cwd(), 'scripts', 'generate-commit.js')
    if (!fs.existsSync(generator)) {
        console.log(
            'Kokonut Commit hook: generator not found. Run `npm run install-hook` and implement generator.'
        )
        process.exit(0)
    }

    const res = spawnSync(process.execPath, [generator], { encoding: 'utf8' })
    if (res.error) {
        console.error(
            'Kokonut Commit hook generator failed:',
            res.error.message
        )
        process.exit(0)
    }

    const msg = (res.stdout || '').trim()
    if (msg) {
        fs.writeFileSync(commitFile, msg + '\n')
        console.log('Kokonut Commit hook: commit message generated')
    }
    process.exit(0)
} catch (e) {
    console.error('prepare-commit-msg hook error:', e.message)
    process.exit(0)
}
