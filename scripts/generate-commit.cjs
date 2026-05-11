#!/usr/bin/env node
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const readline = require('readline/promises')
const { stdin, stdout } = require('process')
const os = require('os')

const baseSystemPrompt =
    'You are an assistant that writes a single concise Conventional Commit message from a diff. Format: type(scope): description. Types: feat, fix, docs, style, refactor, perf, test, chore, ci, revert'

async function callOpenAI(apiKey, prompt, topP = 0.9) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: baseSystemPrompt },
                { role: 'user', content: prompt }
            ],
            temperature: topP,
            top_p: topP,
            max_tokens: 80
        })
    })

    const data = await res.json()
    return (data?.choices?.[0]?.message?.content || '').trim().split('\n')[0]
}

async function callAnthropic(apiKey, prompt, topP = 0.9) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 100,
            top_p: topP,
            messages: [
                { role: 'user', content: `${baseSystemPrompt}\n\n${prompt}` }
            ]
        })
    })

    const data = await res.json()
    return (data?.content?.[0]?.text || '').trim().split('\n')[0]
}

async function callGemini(apiKey, prompt, topP = 0.9) {
    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: `${baseSystemPrompt}\n\n${prompt}`
                            }
                        ]
                    }
                ],
                generationConfig: {
                    topP,
                    maxOutputTokens: 100
                }
            })
        }
    )

    const data = await res.json()
    return (data?.candidates?.[0]?.content?.parts?.[0]?.text || '')
        .trim()
        .split('\n')[0]
}

async function callMistral(apiKey, prompt, topP = 0.9) {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'mistral-tiny',
            messages: [
                { role: 'system', content: baseSystemPrompt },
                { role: 'user', content: prompt }
            ],
            temperature: topP,
            top_p: topP,
            max_tokens: 80
        })
    })

    const data = await res.json()
    return (data?.choices?.[0]?.message?.content || '').trim().split('\n')[0]
}

function loadKokonutIgnore(workspace) {
    const file = path.join(workspace, '.kokonutignore')
    if (!fs.existsSync(file)) return []
    const content = fs.readFileSync(file, 'utf8')
    return content
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter((s) => s && !s.startsWith('#'))
}

function matchesIgnore(filename, patterns) {
    const normalized = filename.replace(/\\/g, '/')
    for (const pat of patterns) {
        let pattern = pat.replace(/[-\\^$+?.()|[\]{}]/g, '\\$&')
        pattern = pattern.replace(/\\\\\*\\\\\*/g, '.*')
        pattern = pattern.replace(/\\\\\*/g, '[^/]*')
        pattern = pattern.replace(/\\\\\?/g, '.')
        const re = new RegExp('^' + pattern + '$')
        if (re.test(normalized)) return true
    }
    return false
}

async function main() {
    const workspace = process.cwd()
    let stagedFiles = []
    try {
        const names = execSync('git diff --cached --name-only', {
            encoding: 'utf8'
        })
        stagedFiles = names
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean)
    } catch (e) {
        // not a git repo or no staged files
    }

    const ignore = loadKokonutIgnore(workspace)
    const files = stagedFiles.filter((f) => !matchesIgnore(f, ignore))

    let diff = ''
    try {
        diff = execSync('git diff --cached', { encoding: 'utf8' })
    } catch (e) {
        // ignore
    }

    // Fallback summary
    const fallback =
        files.length > 0
            ? `chore: update ${files.slice(0, 3).join(', ')}`
            : 'chore: minor changes'

    const provider = (process.env.KOKONUT_PROVIDER || 'openai').toLowerCase()
    // Allow config file overrides (.kokonutrc local or ~/.kokonutrc global)
    const cfgPaths = [
        path.join(process.cwd(), '.kokonutrc'),
        path.join(require('os').homedir(), '.kokonutrc')
    ]
    let cfg = {}
    for (const p of cfgPaths) {
        if (fs.existsSync(p)) {
            try {
                Object.assign(cfg, JSON.parse(fs.readFileSync(p, 'utf8')))
            } catch (e) {}
        }
    }
    let apiKey =
        cfg.apiKey ||
        process.env.KOKONUT_API_KEY ||
        process.env.OPENAI_API_KEY ||
        ''
    const apiUrl = cfg.apiUrl || process.env.KOKONUT_API_URL || ''
    const topP = parseFloat(process.env.KOKONUT_TOPP || '0.9')

    if (!apiKey) {
        // If running interactively, prompt for API key and optionally save it
        if (stdin.isTTY) {
            const rl = readline.createInterface({
                input: stdin,
                output: stdout
            })
            try {
                const entered = await rl.question(
                    'No API key found. Enter your API key (leave empty to use fallback): '
                )
                if (!entered || !entered.trim()) {
                    process.stdout.write(fallback)
                    return
                }
                apiKey = entered.trim()
                const save = await rl.question(
                    'Save to global config (~/.kokonutrc)? (y/N): '
                )
                const saveGlobal = /^y(es)?$/i.test(save.trim())
                const cfgPath = saveGlobal
                    ? path.join(os.homedir(), '.kokonutrc')
                    : path.join(process.cwd(), '.kokonutrc')
                let cfgObj = {}
                if (fs.existsSync(cfgPath)) {
                    try {
                        cfgObj = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
                    } catch (e) {}
                }
                cfgObj.apiKey = apiKey
                fs.writeFileSync(
                    cfgPath,
                    JSON.stringify(cfgObj, null, 2),
                    'utf8'
                )
                console.log('\nSaved API key to', cfgPath)
            } finally {
                try {
                    rl.close()
                } catch (e) {}
            }
        } else {
            process.stdout.write(fallback)
            return
        }
    }

    const prompt = `Diff:\n${diff}\n\nGenerate only a single-line Conventional Commit message (type(scope): description).`

    try {
        let msg = ''

        switch (provider) {
            case 'openai':
                msg = await callOpenAI(apiKey, prompt, topP)
                break
            case 'anthropic':
                msg = await callAnthropic(apiKey, prompt, topP)
                break
            case 'gemini':
                msg = await callGemini(apiKey, prompt, topP)
                break
            case 'mistral':
                msg = await callMistral(apiKey, prompt, topP)
                break
            case 'ollama':
                // Ollama local model: use apiUrl or default localhost
                try {
                    const url = apiUrl || 'http://localhost:11434/api/chat'
                    const res = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: cfg.model || 'mistral',
                            messages: [{ role: 'user', content: prompt }]
                        })
                    })
                    const data = await res.json()
                    msg =
                        data?.choices?.[0]?.message?.content ||
                        data?.output ||
                        ''
                    if (msg) msg = String(msg).trim().split('\n')[0]
                } catch (e) {
                    // ignore and use fallback
                }
                break
                break
            default:
                process.stdout.write(fallback)
                return
        }

        if (msg) {
            process.stdout.write(msg)
        } else {
            process.stdout.write(fallback)
        }
    } catch (e) {
        process.stdout.write(fallback)
    }
}

main().catch((e) => {
    console.error('generate-commit error:', e.message)
    process.stdout.write('chore: minor changes')
})
