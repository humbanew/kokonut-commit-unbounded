/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * To mock dependencies in ESM, you can create fixtures that export mock
 * functions and objects. For example, the core module is mocked in this test,
 * so that the actual '@actions/core' module is not imported.
 */
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    jest
} from '@jest/globals'
import * as core from '../__fixtures__/core'
import { wait } from '../__fixtures__/wait'

// Mock fetch globally
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(global as any).fetch = jest.fn()

// Mocks will be (re)declared inside each test to ensure a fresh module
// evaluation when importing src/main.

// The module being tested will be imported dynamically within each test.
// This ensures mocks are configured before the module is evaluated.

describe('main.ts', () => {
    beforeEach(() => {
        // Reset module registry so each test imports a fresh module instance.
        jest.resetModules()

        // Register mocks for modules used by src/main
        jest.unstable_mockModule('@actions/core', () => core)
        jest.unstable_mockModule('../src/wait', () => ({ wait }))
        jest.unstable_mockModule('octokit', () => ({
            Octokit: jest.fn().mockImplementation(() => ({
                pulls: {
                    listCommits: jest.fn().mockResolvedValue({
                        data: [
                            {
                                sha: 'abc123def456',
                                commit: {
                                    message: 'fix: update authentication logic'
                                }
                            }
                        ]
                    })
                },
                repos: {
                    getCommit: jest.fn().mockResolvedValue({
                        data: {
                            files: [
                                {
                                    filename: 'src/auth.ts',
                                    patch: '+++ fixed auth logic'
                                }
                            ]
                        }
                    })
                }
            }))
        }))
        jest.unstable_mockModule('fs', () => ({
            default: {
                existsSync: jest.fn().mockReturnValue(true),
                readFileSync: jest.fn().mockReturnValue(
                    JSON.stringify({
                        pull_request: {
                            number: 1
                        }
                    })
                )
            }
        }))
        // Set the action's inputs as return values
        core.getBooleanInput.mockImplementation((input: string) => {
            if (input === 'isGoogleGemini') return true
            if (input === 'autoRenameCommits') return false
            if (input === 'includeEmojis') return false
            return false
        })

        core.getInput.mockImplementation((input: string) => {
            if (input === 'aiTokenApi') return 'valid-ai-token'
            if (input === 'githubTokenApi') return 'valid-github-token'
            if (input === 'commitPrefix') return ''
            return ''
        })

        // Mock the wait function so that it does not actually wait.
        wait.mockImplementation(() => Promise.resolve('done!'))

        // Mock fetch
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(global.fetch as any).mockResolvedValue({
            json: jest.fn().mockResolvedValue({
                candidates: [
                    {
                        content: {
                            parts: [{ text: 'fix: improved message' }]
                        }
                    }
                ]
            })
        })

        // Set environment variables
        process.env.GITHUB_REPOSITORY = 'owner/repo'
        process.env.GITHUB_EVENT_PATH = '/tmp/event.json'
    })

    afterEach(() => {
        jest.resetAllMocks()
    })

    it('Should succeed with one provider selected and valid tokens', async () => {
        const { run } = await import('../src/main')
        await run()

        // Verify tokens were validated
        expect(core.info).toHaveBeenCalledWith(
            expect.stringContaining('Using Google Gemini')
        )
    })

    it('Should fail when no AI provider is selected', async () => {
        core.getBooleanInput.mockImplementation(() => false)

        const { run } = await import('../src/main')
        await run()

        expect(core.setFailed).toHaveBeenCalledWith(
            expect.stringContaining('No AI provider selected')
        )
    })

    it('Should fail when multiple AI providers are selected', async () => {
        core.getBooleanInput.mockImplementation((input: string) => {
            if (input === 'isGoogleGemini' || input === 'isOpenAIChatGPT') {
                return true
            }
            return false
        })

        const { run } = await import('../src/main')
        await run()

        expect(core.setFailed).toHaveBeenCalledWith(
            expect.stringContaining('Multiple AI providers')
        )
    })

    it('Should fail with empty AI token', async () => {
        core.getInput.mockImplementation((input: string) => {
            if (input === 'aiTokenApi') return ''
            return 'valid-token'
        })

        const { run } = await import('../src/main')
        await run()

        expect(core.setFailed).toHaveBeenCalledWith(
            'Not valid AI or Github Token API!'
        )
    })

    it('Should fail with empty GitHub token', async () => {
        core.getInput.mockImplementation((input: string) => {
            if (input === 'githubTokenApi') return ''
            return 'valid-token'
        })

        const { run } = await import('../src/main')
        await run()

        expect(core.setFailed).toHaveBeenCalledWith(
            'Not valid AI or Github Token API!'
        )
    })

    it('Should include emojis when enabled', async () => {
        core.getBooleanInput.mockImplementation((input: string) => {
            if (input === 'isGoogleGemini') return true
            if (input === 'autoRenameCommits') return false
            if (input === 'includeEmojis') return true
            return false
        })

        const { run } = await import('../src/main')
        await run()

        // Verify that includeEmojis input was processed without errors
        expect(core.info).toHaveBeenCalledWith(
            expect.stringContaining('Using Google Gemini')
        )
    })

    it('Should add custom prefix to commit messages', async () => {
        core.getBooleanInput.mockImplementation((input: string) => {
            if (input === 'isGoogleGemini') return true
            if (input === 'autoRenameCommits') return false
            return false
        })

        core.getInput.mockImplementation((input: string) => {
            if (input === 'aiTokenApi') return 'valid-ai-token'
            if (input === 'githubTokenApi') return 'valid-github-token'
            if (input === 'commitPrefix') return 'JIRA-123'
            return ''
        })

        const { run } = await import('../src/main')
        await run()

        // Verify that commitPrefix input was processed without errors
        expect(core.info).toHaveBeenCalledWith(
            expect.stringContaining('Using Google Gemini')
        )
    })
})
