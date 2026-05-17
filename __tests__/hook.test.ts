import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawnSync } from 'child_process'

function runCli(
    args: string[],
    env: Record<string, string> = {},
    cwd?: string
) {
    const node = process.execPath
    const distCli = path.join(process.cwd(), 'dist', 'cli.cjs')
    const cli = distCli

    const res = spawnSync(node, [cli, ...args], {
        env: { ...process.env, ...env },
        encoding: 'utf8',
        cwd
    })
    return res
}

describe('hook commands', () => {
    test('set and unset hook in repo', () => {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kokonut-test-'))
        try {
            // init git
            const gitInit = spawnSync('git', ['init'], { cwd: tmp })
            expect(gitInit.status).toBe(0)

            const setRes = runCli(['hook', 'set'], {}, tmp)
            // debug output if something goes wrong
            if (setRes.status !== 0) {
                console.error('setRes stdout:', setRes.stdout)

                console.error('setRes stderr:', setRes.stderr)
            }
            expect(setRes.status).toBe(0)
            // CLI attempts to run installer, which will fail harmlessly, so fall back to writing
            // Ensure hook exists
            const hookPath = path.join(
                tmp,
                '.git',
                'hooks',
                'prepare-commit-msg'
            )
            expect(fs.existsSync(hookPath)).toBe(true)

            const unsetRes = runCli(['hook', 'unset'], {}, tmp)
            if (unsetRes.status !== 0) {
                console.error('unsetRes stdout:', unsetRes.stdout)

                console.error('unsetRes stderr:', unsetRes.stderr)
            }
            expect(unsetRes.status).toBe(0)
            expect(fs.existsSync(hookPath)).toBe(false)
        } finally {
            // cleanup
            fs.rmSync(tmp, { recursive: true, force: true })
        }
    })

    test('set and unset hook in custom user directory', () => {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kokonut-test-'))
        const customDir = fs.mkdtempSync(
            path.join(os.tmpdir(), 'kokonut-hooks-')
        )
        try {
            const gitInit = spawnSync('git', ['init'], { cwd: tmp })
            expect(gitInit.status).toBe(0)

            const setRes = runCli(['hook', 'set', '--usr', customDir], {}, tmp)
            if (setRes.status !== 0) {
                console.error('custom set stdout:', setRes.stdout)

                console.error('custom set stderr:', setRes.stderr)
            }
            expect(setRes.status).toBe(0)

            const hookPath = path.join(customDir, 'prepare-commit-msg')
            expect(fs.existsSync(hookPath)).toBe(true)

            const hooksPath = spawnSync(
                'git',
                ['config', '--local', '--get', 'core.hooksPath'],
                {
                    cwd: tmp,
                    encoding: 'utf8'
                }
            )
            expect(hooksPath.status).toBe(0)
            expect(hooksPath.stdout.trim()).toBe(path.resolve(customDir))

            const unsetRes = runCli(
                ['hook', 'unset', '--usr', customDir],
                {},
                tmp
            )
            if (unsetRes.status !== 0) {
                console.error('custom unset stdout:', unsetRes.stdout)

                console.error('custom unset stderr:', unsetRes.stderr)
            }
            expect(unsetRes.status).toBe(0)
            expect(fs.existsSync(hookPath)).toBe(false)

            const unsetHooksPath = spawnSync(
                'git',
                ['config', '--local', '--get', 'core.hooksPath'],
                {
                    cwd: tmp,
                    encoding: 'utf8'
                }
            )
            expect(unsetHooksPath.status).not.toBe(0)
        } finally {
            fs.rmSync(tmp, { recursive: true, force: true })
            fs.rmSync(customDir, { recursive: true, force: true })
        }
    })

    test('set and unset global hook (isolated HOME)', () => {
        const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'kokonut-home-'))
        try {
            const env = { HOME: tmpHome, USERPROFILE: tmpHome }
            const setRes = runCli(['hook', 'set', '--global'], env, undefined)
            if (setRes.status !== 0) {
                console.error('global set stdout:', setRes.stdout)

                console.error('global set stderr:', setRes.stderr)
            }
            expect(setRes.status).toBe(0)
            const expectedHooks = path.join(
                tmpHome,
                '.kokonut',
                'hooks',
                'prepare-commit-msg'
            )
            // CLI writes to ~/.kokonut/hooks/prepare-commit-msg when --global used
            expect(fs.existsSync(expectedHooks)).toBe(true)

            const unsetRes = runCli(
                ['hook', 'unset', '--global'],
                env,
                undefined
            )
            if (unsetRes.status !== 0) {
                console.error('global unset stdout:', unsetRes.stdout)

                console.error('global unset stderr:', unsetRes.stderr)
            }
            expect(unsetRes.status).toBe(0)
            expect(fs.existsSync(expectedHooks)).toBe(false)
        } finally {
            fs.rmSync(tmpHome, { recursive: true, force: true })
        }
    })
})
