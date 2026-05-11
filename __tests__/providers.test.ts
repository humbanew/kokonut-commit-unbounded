import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Mock global fetch
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(global as any).fetch = jest.fn()

describe('providers.ts', () => {
    beforeEach(() => {
        jest.resetAllMocks()
    })

    it('Google Gemini returns message and applies emoji when requested', async () => {
        // Mock Gemini response
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                candidates: [
                    {
                        content: { parts: [{ text: 'fix: corrected bug' }] }
                    }
                ]
            })
        })

        const { createAIProvider } = await import('../src/providers.js')
        const provider = createAIProvider(0, 'api-key')
        const msg = await provider.generateCommitMessage(
            'diff',
            'orig',
            false,
            10,
            0.9
        )
        expect(msg).toBe('fix: corrected bug')

        const msgWithEmoji = await provider.generateCommitMessage(
            'diff',
            'orig',
            true,
            10,
            0.9
        )
        expect(msgWithEmoji).toBe('🐛 fix: corrected bug')
    })

    it('OpenAI returns message and applies emoji when requested', async () => {
        // Mock OpenAI response
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'feat: add new feature' } }]
            })
        })

        const { createAIProvider } = await import('../src/providers.js')
        const provider = createAIProvider(1, 'api-key')
        const msg = await provider.generateCommitMessage(
            'diff',
            'orig',
            false,
            10,
            0.9
        )
        expect(msg).toBe('feat: add new feature')

        const msgWithEmoji = await provider.generateCommitMessage(
            'diff',
            'orig',
            true,
            10,
            0.9
        )
        expect(msgWithEmoji).toBe('✨ feat: add new feature')
    })

    it('Anthropic Claude returns message and applies emoji when requested', async () => {
        // Mock Claude response
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                content: [{ text: 'docs: update documentation' }]
            })
        })

        const { createAIProvider } = await import('../src/providers.js')
        const provider = createAIProvider(2, 'api-key')
        const msg = await provider.generateCommitMessage(
            'diff',
            'orig',
            false,
            10,
            0.9
        )
        expect(msg).toBe('docs: update documentation')

        const msgWithEmoji = await provider.generateCommitMessage(
            'diff',
            'orig',
            true,
            10,
            0.9
        )
        expect(msgWithEmoji).toBe('📚 docs: update documentation')
    })

    it('Mistral Le Chat returns message and applies emoji when requested', async () => {
        // Mock Mistral response
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'refactor: simplify code' } }]
            })
        })

        const { createAIProvider } = await import('../src/providers.js')
        const provider = createAIProvider(3, 'api-key')
        const msg = await provider.generateCommitMessage(
            'diff',
            'orig',
            false,
            10,
            0.9
        )
        expect(msg).toBe('refactor: simplify code')

        const msgWithEmoji = await provider.generateCommitMessage(
            'diff',
            'orig',
            true,
            10,
            0.9
        )
        expect(msgWithEmoji).toBe('♻️ refactor: simplify code')
    })

    it('should handle error responses (non-ok status)', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(global.fetch as any).mockResolvedValue({
            ok: false,
            status: 401,
            statusText: 'Unauthorized'
        })

        const { createAIProvider } = await import('../src/providers.js')
        const provider = createAIProvider(0, 'invalid-key')

        await expect(
            provider.generateCommitMessage('diff', 'orig', false, 10, 0.9)
        ).rejects.toThrow('Provider error: 401 Unauthorized')
    })

    it('should handle network errors', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(global.fetch as any).mockRejectedValue(new Error('Network timeout'))

        const { createAIProvider } = await import('../src/providers.js')
        const provider = createAIProvider(1, 'api-key')

        await expect(
            provider.generateCommitMessage('diff', 'orig', false, 10, 0.9)
        ).rejects.toThrow('Network timeout')
    })

    it('should trim multiline responses to first line', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    text: 'test: add test\nmore details\neven more'
                                }
                            ]
                        }
                    }
                ]
            })
        })

        const { createAIProvider } = await import('../src/providers.js')
        const provider = createAIProvider(0, 'api-key')
        const msg = await provider.generateCommitMessage(
            'diff',
            'orig',
            false,
            10,
            0.9
        )

        expect(msg).toBe('test: add test')
    })

    it('should throw error for invalid provider index', async () => {
        const { createAIProvider } = await import('../src/providers.js')

        expect(() => {
            createAIProvider(99, 'api-key')
        }).toThrow('Unknown AI provider')
    })

    it('should apply correct emoji for all commit types', async () => {
        const testCases = [
            { type: 'feat', emoji: '✨' },
            { type: 'fix', emoji: '🐛' },
            { type: 'docs', emoji: '📚' },
            { type: 'style', emoji: '💄' },
            { type: 'refactor', emoji: '♻️' },
            { type: 'perf', emoji: '⚡' },
            { type: 'test', emoji: '✅' },
            { type: 'chore', emoji: '🔧' },
            { type: 'ci', emoji: '🔄' },
            { type: 'revert', emoji: '↩️' }
        ]

        for (const { type, emoji } of testCases) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(global.fetch as any).mockResolvedValue({
                ok: true,
                json: async () => ({
                    candidates: [
                        {
                            content: {
                                parts: [{ text: `${type}: description` }]
                            }
                        }
                    ]
                })
            })

            const { createAIProvider } = await import('../src/providers.js')
            const provider = createAIProvider(0, 'api-key')
            const msg = await provider.generateCommitMessage(
                'diff',
                'orig',
                true,
                10,
                0.9
            )

            expect(msg).toBe(`${emoji} ${type}: description`)
        }
    })

    it('should verify correct fetch URLs for each provider', async () => {
        const mockResponse = {
            ok: true,
            json: async () => ({
                candidates: [{ content: { parts: [{ text: 'feat: test' }] } }]
            })
        }

        // Test Gemini
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(global.fetch as any).mockResolvedValue(mockResponse)
        let { createAIProvider } = await import('../src/providers.js')
        let gemini = createAIProvider(0, 'key123')
        await gemini.generateCommitMessage('diff', 'orig', false, 10, 0.9)
        expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain(
            'generativelanguage.googleapis.com'
        )

        jest.resetAllMocks()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'feat: test' } }]
            })
        })

        // Test OpenAI
        ;({ createAIProvider } = await import('../src/providers.js'))
        let openai = createAIProvider(1, 'key123')
        await openai.generateCommitMessage('diff', 'orig', false, 10, 0.9)
        expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
            'https://api.openai.com/v1/chat/completions'
        )

        jest.resetAllMocks()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                content: [{ text: 'feat: test' }]
            })
        })

        // Test Claude
        ;({ createAIProvider } = await import('../src/providers.js'))
        let claude = createAIProvider(2, 'key123')
        await claude.generateCommitMessage('diff', 'orig', false, 10, 0.9)
        expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
            'https://api.anthropic.com/v1/messages'
        )

        jest.resetAllMocks()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'feat: test' } }]
            })
        })

        // Test Mistral
        ;({ createAIProvider } = await import('../src/providers.js'))
        let mistral = createAIProvider(3, 'key123')
        await mistral.generateCommitMessage('diff', 'orig', false, 10, 0.9)
        expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
            'https://api.mistral.ai/v1/chat/completions'
        )

        jest.resetAllMocks()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'feat: test' } }]
            })
        })

        // Test Deepseek
        ;({ createAIProvider } = await import('../src/providers.js'))
        let deepseek = createAIProvider(4, 'key123')
        await deepseek.generateCommitMessage('diff', 'orig', false, 10, 0.9)
        expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
            'https://api.deepseek.com/v1/chat/completions'
        )

        jest.resetAllMocks()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'feat: test' } }]
            })
        })

        // Test Grok
        ;({ createAIProvider } = await import('../src/providers.js'))
        let grok = createAIProvider(5, 'key123')
        await grok.generateCommitMessage('diff', 'orig', false, 10, 0.9)
        expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
            'https://api.x.ai/v1/chat/completions'
        )

        jest.resetAllMocks()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'feat: test' } }]
            })
        })

        // Test Hugging Face
        ;({ createAIProvider } = await import('../src/providers.js'))
        let huggingface = createAIProvider(6, 'key123')
        await huggingface.generateCommitMessage('diff', 'orig', false, 10, 0.9)
        expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
            'https://api-inference.huggingface.co/v1/chat/completions'
        )
    })
})
