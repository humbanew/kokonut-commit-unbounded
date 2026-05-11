export interface AIProvider {
    name: string
    generateCommitMessage(
        diff: string,
        originalMessage: string,
        includeEmojis: boolean,
        topK: number,
        topP: number
    ): Promise<string>
}

export function createAIProvider(
    providerIndex: number,
    apiToken: string
): AIProvider {
    const basePrompt = `You are an expert at writing clear, concise commit messages following Conventional Commits format.
Given a diff and original commit message, generate an improved commit message.
Follow the format: type(scope): description
Types: feat, fix, docs, style, refactor, perf, test, chore, ci, revert`

    const DEFAULT_TIMEOUT_MS = 15000

    function addEmojiToMessage(message: string): string {
        const EMOJI_MAP: Record<string, string> = {
            feat: '✨',
            fix: '🐛',
            docs: '📚',
            style: '💄',
            refactor: '♻️',
            perf: '⚡',
            test: '✅',
            chore: '🔧',
            ci: '🔄',
            revert: '↩️'
        }

        const typeMatch = message.match(
            /^(feat|fix|docs|style|refactor|perf|test|chore|ci|revert)/
        )
        if (typeMatch) {
            const type = typeMatch[1]
            const emoji = EMOJI_MAP[type] || ''
            if (emoji) return message.replace(/^(\w+)/, `${emoji} $1`)
        }
        return message
    }

    async function fetchWithTimeout(
        url: string,
        opts: RequestInit = {},
        timeout = DEFAULT_TIMEOUT_MS
    ) {
        // If AbortController isn't available in the environment (some tests/runtimes), skip timeout
        if (typeof (global as any).AbortController === 'undefined') {
            return await fetch(url, opts)
        }

        const controller = new AbortController()
        const id = setTimeout(() => controller.abort(), timeout)
        try {
            // Merge abort signal
            // @ts-ignore - RequestInit may not yet include signal in some TS lib configs
            const res = await fetch(url, { ...opts, signal: controller.signal })
            clearTimeout(id)
            return res
        } catch (err) {
            clearTimeout(id)
            throw err
        }
    }

    switch (providerIndex) {
        case 0: // Google Gemini
            return {
                name: 'Google Gemini',
                async generateCommitMessage(
                    diff: string,
                    originalMessage: string,
                    includeEmojis: boolean,
                    topK: number,
                    topP: number
                ): Promise<string> {
                    const response = await fetchWithTimeout(
                        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' +
                            apiToken,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [
                                    {
                                        parts: [
                                            {
                                                text: `${basePrompt}\n\nOriginal message: "${originalMessage}"\n\nDiff:\n${diff}\n\nGenerate only the improved commit message, nothing else.`
                                            }
                                        ]
                                    }
                                ],
                                generationConfig: {
                                    topK,
                                    topP,
                                    maxOutputTokens: 100
                                }
                            })
                        }
                    )

                    if (!response.ok)
                        throw new Error(
                            `Provider error: ${response.status} ${response.statusText}`
                        )
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const data: any = await response.json()
                    let message =
                        data.candidates?.[0]?.content?.parts?.[0]?.text || ''
                    message = message.trim().split('\n')[0]

                    if (includeEmojis) message = addEmojiToMessage(message)

                    return message
                }
            }
        case 1: // OpenAI ChatGPT
            return {
                name: 'OpenAI ChatGPT',
                async generateCommitMessage(
                    diff: string,
                    originalMessage: string,
                    includeEmojis: boolean,
                    topK: number,
                    topP: number
                ): Promise<string> {
                    const response = await fetchWithTimeout(
                        'https://api.openai.com/v1/chat/completions',
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${apiToken}`
                            },
                            body: JSON.stringify({
                                model: 'gpt-3.5-turbo',
                                messages: [
                                    {
                                        role: 'system',
                                        content: basePrompt
                                    },
                                    {
                                        role: 'user',
                                        content: `Original message: "${originalMessage}"\n\nDiff:\n${diff}\n\nGenerate only the improved commit message, nothing else.`
                                    }
                                ],
                                temperature: topP,
                                top_p: topP,
                                max_tokens: 100
                            })
                        }
                    )

                    if (!response.ok)
                        throw new Error(
                            `Provider error: ${response.status} ${response.statusText}`
                        )
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const data: any = await response.json()
                    let message = data.choices?.[0]?.message?.content || ''
                    message = message.trim().split('\n')[0]

                    if (includeEmojis) message = addEmojiToMessage(message)

                    return message
                }
            }
        case 2: // Anthropic Claude
            return {
                name: 'Anthropic Claude',
                async generateCommitMessage(
                    diff: string,
                    originalMessage: string,
                    includeEmojis: boolean,
                    topK: number,
                    topP: number
                ): Promise<string> {
                    const response = await fetchWithTimeout(
                        'https://api.anthropic.com/v1/messages',
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-api-key': apiToken,
                                'anthropic-version': '2023-06-01'
                            },
                            body: JSON.stringify({
                                model: 'claude-3-haiku-20240307',
                                max_tokens: 100,
                                top_k: topK,
                                top_p: topP,
                                messages: [
                                    {
                                        role: 'user',
                                        content: `${basePrompt}\n\nOriginal message: "${originalMessage}"\n\nDiff:\n${diff}\n\nGenerate only the improved commit message, nothing else.`
                                    }
                                ]
                            })
                        }
                    )

                    if (!response.ok)
                        throw new Error(
                            `Provider error: ${response.status} ${response.statusText}`
                        )
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const data: any = await response.json()
                    let message = data.content?.[0]?.text || ''
                    message = message.trim().split('\n')[0]

                    if (includeEmojis) message = addEmojiToMessage(message)

                    return message
                }
            }
        case 3: // Mistral Le Chat
            return {
                name: 'Mistral Le Chat',
                async generateCommitMessage(
                    diff: string,
                    originalMessage: string,
                    includeEmojis: boolean,
                    topK: number,
                    topP: number
                ): Promise<string> {
                    const response = await fetchWithTimeout(
                        'https://api.mistral.ai/v1/chat/completions',
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${apiToken}`
                            },
                            body: JSON.stringify({
                                model: 'mistral-tiny',
                                messages: [
                                    {
                                        role: 'system',
                                        content: basePrompt
                                    },
                                    {
                                        role: 'user',
                                        content: `Original message: "${originalMessage}"\n\nDiff:\n${diff}\n\nGenerate only the improved commit message, nothing else.`
                                    }
                                ],
                                temperature: topP,
                                top_p: topP,
                                max_tokens: 100
                            })
                        }
                    )

                    if (!response.ok)
                        throw new Error(
                            `Provider error: ${response.status} ${response.statusText}`
                        )
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const data: any = await response.json()
                    let message = data.choices?.[0]?.message?.content || ''
                    message = message.trim().split('\n')[0]

                    if (includeEmojis) message = addEmojiToMessage(message)

                    return message
                }
            }
        case 4: // Deepseek
            return {
                name: 'Deepseek',
                async generateCommitMessage(
                    diff: string,
                    originalMessage: string,
                    includeEmojis: boolean,
                    topK: number,
                    topP: number
                ): Promise<string> {
                    const response = await fetchWithTimeout(
                        'https://api.deepseek.com/v1/chat/completions',
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${apiToken}`
                            },
                            body: JSON.stringify({
                                model: 'deepseek-chat',
                                messages: [
                                    {
                                        role: 'system',
                                        content: basePrompt
                                    },
                                    {
                                        role: 'user',
                                        content: `Original message: "${originalMessage}"\n\nDiff:\n${diff}\n\nGenerate only the improved commit message, nothing else.`
                                    }
                                ],
                                temperature: topP,
                                top_p: topP,
                                max_tokens: 100
                            })
                        }
                    )

                    if (!response.ok)
                        throw new Error(
                            `Provider error: ${response.status} ${response.statusText}`
                        )
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const data: any = await response.json()
                    let message = data.choices?.[0]?.message?.content || ''
                    message = message.trim().split('\n')[0]

                    if (includeEmojis) message = addEmojiToMessage(message)

                    return message
                }
            }
        case 5: // Grok
            return {
                name: 'Grok',
                async generateCommitMessage(
                    diff: string,
                    originalMessage: string,
                    includeEmojis: boolean,
                    topK: number,
                    topP: number
                ): Promise<string> {
                    const response = await fetchWithTimeout(
                        'https://api.x.ai/v1/chat/completions',
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${apiToken}`
                            },
                            body: JSON.stringify({
                                model: 'grok-beta',
                                messages: [
                                    {
                                        role: 'system',
                                        content: basePrompt
                                    },
                                    {
                                        role: 'user',
                                        content: `Original message: "${originalMessage}"\n\nDiff:\n${diff}\n\nGenerate only the improved commit message, nothing else.`
                                    }
                                ],
                                temperature: topP,
                                top_p: topP,
                                max_tokens: 100
                            })
                        }
                    )

                    if (!response.ok)
                        throw new Error(
                            `Provider error: ${response.status} ${response.statusText}`
                        )
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const data: any = await response.json()
                    let message = data.choices?.[0]?.message?.content || ''
                    message = message.trim().split('\n')[0]

                    if (includeEmojis) message = addEmojiToMessage(message)

                    return message
                }
            }
        case 6: // Hugging Face
            return {
                name: 'Hugging Face',
                async generateCommitMessage(
                    diff: string,
                    originalMessage: string,
                    includeEmojis: boolean,
                    topK: number,
                    topP: number
                ): Promise<string> {
                    const response = await fetchWithTimeout(
                        'https://api-inference.huggingface.co/v1/chat/completions',
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${apiToken}`
                            },
                            body: JSON.stringify({
                                model: 'mistralai/Mistral-7B-Instruct-v0.2',
                                messages: [
                                    {
                                        role: 'system',
                                        content: basePrompt
                                    },
                                    {
                                        role: 'user',
                                        content: `Original message: "${originalMessage}"\n\nDiff:\n${diff}\n\nGenerate only the improved commit message, nothing else.`
                                    }
                                ],
                                temperature: topP,
                                top_p: topP,
                                max_tokens: 100
                            })
                        }
                    )

                    if (!response.ok)
                        throw new Error(
                            `Provider error: ${response.status} ${response.statusText}`
                        )
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const data: any = await response.json()
                    let message = data.choices?.[0]?.message?.content || ''
                    message = message.trim().split('\n')[0]

                    if (includeEmojis) message = addEmojiToMessage(message)

                    return message
                }
            }
        default:
            throw new Error('Unknown AI provider')
    }
}
