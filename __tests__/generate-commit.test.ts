/* eslint-disable jest/no-conditional-expect */
import { spawn, spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('generate-commit interactive', () => {
    test('prompts for api key and saves when TTY simulated', async () => {
        return new Promise<void>((resolve, reject) => {
            const runner = process.execPath
            const tmpRoot = fs.mkdtempSync(
                path.join(os.tmpdir(), 'kokonut-test-')
            )
            const isolatedRepo = path.join(tmpRoot, 'repo')
            fs.mkdirSync(isolatedRepo, { recursive: true })
            // Create an isolated git repo so local .kokonutrc from workspace does not interfere.
            spawnSync('git', ['init'], { cwd: isolatedRepo })
            const scriptPath = path.join(
                __dirname,
                '..',
                'scripts',
                'generate-commit.cjs'
            )
            const isolatedHome = path.join(tmpRoot, 'home')
            if (!fs.existsSync(isolatedHome)) {
                fs.mkdirSync(isolatedHome, { recursive: true })
            }
            const script = `
        process.stdin.isTTY = true;
        process.env.NODE_DISABLE_COLORS = '1';
        global.fetch = async () => ({
          json: async () => ({ choices: [{ message: { content: 'feat: mocked commit' } }] })
        });
        require(${JSON.stringify(scriptPath)});
        `

            const child = spawn(runner, ['-e', script], {
                cwd: isolatedRepo,
                env: {
                    ...process.env,
                    KOKONUT_API_KEY: '',
                    OPENAI_API_KEY: '',
                    HOME: isolatedHome,
                    USERPROFILE: isolatedHome
                }
            })
            let out = ''
            let sentApiKey = false
            let sentSaveChoice = false
            let finished = false

            const finalize = (err?: Error) => {
                if (finished) return
                finished = true
                try {
                    child.kill()
                } catch {
                    /* ignore */
                }
                if (err) return reject(err)
                resolve()
            }

            const timeout = setTimeout(() => {
                finalize(
                    new Error(
                        `Timed out waiting for interactive flow. Output:\n${out}`
                    )
                )
            }, 15000)

            child.stdout.on('data', (d) => {
                out += d.toString()
                if (!sentApiKey && /No API key found\./.test(out)) {
                    sentApiKey = true
                    child.stdin.write('sk-test-key\n')
                }
                if (!sentSaveChoice && /Save to global config/.test(out)) {
                    sentSaveChoice = true
                    child.stdin.write('n\n')
                }
                if (/Saved API key to/.test(out)) {
                    clearTimeout(timeout)
                    try {
                        expect(out).toMatch(/Saved API key to/)
                    } catch (err) {
                        finalize(err as Error)
                        return
                    }
                    finalize()
                }
            })
            child.stderr.on('data', (d) => {
                out += d.toString()
            })

            child.on('close', () => {
                if (!finished) {
                    finalize(
                        new Error(
                            `Process exited unexpectedly. Output:\n${out}`
                        )
                    )
                }
            })
        })
    })
})
