import fs from 'fs'
import path from 'path'
import os from 'os'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('E2E: CLI + hook integration', () => {
    let tmpDir: string

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kokonut-e2e-'))
    })

    afterEach(() => {
        if (fs.existsSync(tmpDir)) {
            fs.rmSync(tmpDir, { recursive: true, force: true })
        }
    })

    test('CLI should be executable and output help', async () => {
        const cliPath = path.join(__dirname, '..', 'dist', 'cli.cjs')
        if (!fs.existsSync(cliPath)) {
            throw new Error('dist/cli.cjs not found. Run npm run bundle first.')
        }

        // Test with --help flag
        const result = spawnSync(process.execPath, [cliPath, '--help'], {
            encoding: 'utf8'
        })

        expect(result.status).toBe(0)
        expect(result.stdout).toContain('Usage')
    })

    test('hook set should create hook file in git repo', async () => {
        const repo = path.join(tmpDir, 'repo')
        fs.mkdirSync(repo, { recursive: true })
        spawnSync('git', ['init'], { cwd: repo })
        fs.mkdirSync(path.join(repo, '.git', 'hooks'), { recursive: true })

        const cliPath = path.join(__dirname, '..', 'dist', 'cli.cjs')
        if (!fs.existsSync(cliPath)) {
            throw new Error('dist/cli.cjs not found')
        }

        const result = spawnSync(process.execPath, [cliPath, 'hook', 'set'], {
            cwd: repo,
            encoding: 'utf8'
        })

        // hook set should exit successfully
        expect(result.status).toBe(0)

        // Check if hook file exists
        const hookPath = path.join(repo, '.git', 'hooks', 'prepare-commit-msg')
        expect(fs.existsSync(hookPath)).toBe(true)
    })

    test('hook unset should remove hook from git repo', async () => {
        const repo = path.join(tmpDir, 'repo')
        fs.mkdirSync(repo, { recursive: true })
        spawnSync('git', ['init'], { cwd: repo })
        fs.mkdirSync(path.join(repo, '.git', 'hooks'), { recursive: true })

        const cliPath = path.join(__dirname, '..', 'dist', 'cli.cjs')
        if (!fs.existsSync(cliPath)) {
            throw new Error('dist/cli.cjs not found')
        }

        // First set the hook
        spawnSync(process.execPath, [cliPath, 'hook', 'set'], { cwd: repo })
        const hookPath = path.join(repo, '.git', 'hooks', 'prepare-commit-msg')
        expect(fs.existsSync(hookPath)).toBe(true)

        // Then unset it
        const result = spawnSync(process.execPath, [cliPath, 'hook', 'unset'], {
            cwd: repo,
            encoding: 'utf8'
        })

        expect(result.status).toBe(0)

        // Hook should be removed
        expect(fs.existsSync(hookPath)).toBe(false)
    })

    test('config set should save configuration', async () => {
        const isolatedHome = path.join(tmpDir, 'home')
        fs.mkdirSync(isolatedHome, { recursive: true })

        const cliPath = path.join(__dirname, '..', 'dist', 'cli.cjs')
        if (!fs.existsSync(cliPath)) {
            throw new Error('dist/cli.cjs not found')
        }

        const result = spawnSync(
            process.execPath,
            [cliPath, 'config', 'set', 'provider', 'openai', '--global'],
            {
                cwd: tmpDir,
                env: {
                    ...process.env,
                    HOME: isolatedHome,
                    USERPROFILE: isolatedHome
                },
                encoding: 'utf8'
            }
        )

        expect(result.status).toBe(0)

        // Check that config was saved
        const configPath = path.join(isolatedHome, '.kokonutrc')
        expect(fs.existsSync(configPath)).toBe(true)

        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        expect(config.provider).toBe('openai')
    })

    test('config list should display all config', async () => {
        const isolatedHome = path.join(tmpDir, 'home')
        fs.mkdirSync(isolatedHome, { recursive: true })

        // Create config first
        const configPath = path.join(isolatedHome, '.kokonutrc')
        fs.writeFileSync(
            configPath,
            JSON.stringify({ provider: 'openai', temperature: 0.7 })
        )

        const cliPath = path.join(__dirname, '..', 'dist', 'cli.cjs')
        if (!fs.existsSync(cliPath)) {
            throw new Error('dist/cli.cjs not found')
        }

        const result = spawnSync(
            process.execPath,
            [cliPath, 'config', 'list'],
            {
                cwd: tmpDir,
                env: {
                    ...process.env,
                    HOME: isolatedHome,
                    USERPROFILE: isolatedHome
                },
                encoding: 'utf8'
            }
        )

        expect(result.status).toBe(0)
        expect(result.stdout).toContain('provider')
        expect(result.stdout).toContain('openai')
    })

    test('invalid command should exit with error', async () => {
        const cliPath = path.join(__dirname, '..', 'dist', 'cli.cjs')
        if (!fs.existsSync(cliPath)) {
            throw new Error('dist/cli.cjs not found')
        }

        const result = spawnSync(
            process.execPath,
            [cliPath, 'invalid-command-xyz'],
            {
                encoding: 'utf8'
            }
        )

        // Invalid command should fail
        expect(result.status).not.toBe(0)
        expect(result.stdout + result.stderr).toContain('Unknown')
    })
})
