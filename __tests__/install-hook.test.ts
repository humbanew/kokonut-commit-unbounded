import fs from 'fs'
import path from 'path'
import os from 'os'
import { spawnSync } from 'child_process'

describe('install-hook script', () => {
    test('creates symlink to dist/cli.cjs when available', () => {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kokonut-install-'))
        const repo = path.join(tmp, 'repo')
        fs.mkdirSync(repo, { recursive: true })
        // init git
        spawnSync('git', ['init'], { cwd: repo })

        // ensure hooks dir exists
        fs.mkdirSync(path.join(repo, '.git', 'hooks'), { recursive: true })

        // create dist/cli.cjs
        const distDir = path.join(repo, 'dist')
        fs.mkdirSync(distDir, { recursive: true })
        const preferredCli = path.join(distDir, 'cli.cjs')
        fs.writeFileSync(preferredCli, '// dummy cli')

        // copy installer to repo as CJS so it can run even when package.json is type:module
        const installerSrc = path.join(
            process.cwd(),
            'scripts',
            'install-hook.cjs'
        )
        const installerCjs = path.join(repo, 'install-hook.cjs')
        fs.copyFileSync(installerSrc, installerCjs)
        const res = spawnSync(process.execPath, [installerCjs], {
            cwd: repo,
            encoding: 'utf8'
        })
        if (res.status !== 0) {
            throw new Error('installer failed: ' + res.stderr)
        }

        const targetHook = path.join(
            repo,
            '.git',
            'hooks',
            'prepare-commit-msg'
        )
        const stats = fs.lstatSync(targetHook)
        expect(stats.isSymbolicLink()).toBe(true)
        const real = fs.readlinkSync(targetHook)
        // readlink may return the path as created; resolve both
        expect(path.resolve(repo, real)).toBe(path.resolve(preferredCli))
    })

    test('writes fallback stub when dist/cli.cjs missing', () => {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kokonut-install-'))
        const repo = path.join(tmp, 'repo')
        fs.mkdirSync(repo, { recursive: true })
        spawnSync('git', ['init'], { cwd: repo })
        fs.mkdirSync(path.join(repo, '.git', 'hooks'), { recursive: true })

        // ensure no dist/cli.cjs
        const installerSrc = path.join(
            process.cwd(),
            'scripts',
            'install-hook.cjs'
        )
        const installerCjs = path.join(repo, 'install-hook.cjs')
        fs.copyFileSync(installerSrc, installerCjs)
        const res = spawnSync(process.execPath, [installerCjs], {
            cwd: repo,
            encoding: 'utf8'
        })
        if (res.status !== 0) {
            throw new Error('installer failed: ' + res.stderr)
        }

        const targetHook = path.join(
            repo,
            '.git',
            'hooks',
            'prepare-commit-msg'
        )
        const stats = fs.lstatSync(targetHook)
        expect(stats.isSymbolicLink()).toBe(false)
        const content = fs.readFileSync(targetHook, 'utf8')
        expect(content).toMatch(/fallback stub|prepare-commit-msg/)
    })
})
