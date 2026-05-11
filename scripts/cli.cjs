#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const os = require('os')

const args = process.argv.slice(2)
if (args.length === 0) {
    console.log(
        'Kokonut Commit CLI\nUsage: kokonut-commit config|get|set|list|setup|models ...'
    )
    process.exit(0)
}

const HOME = os.homedir()
const globalConfigPath = path.join(HOME, '.kokonutrc')
const localConfigPath = path.join(process.cwd(), '.kokonutrc')

function readConfig(globalOnly = false) {
    let cfg = {}
    if (fs.existsSync(globalConfigPath)) {
        try {
            cfg = JSON.parse(fs.readFileSync(globalConfigPath, 'utf8'))
        } catch (e) {}
    }
    if (!globalOnly && fs.existsSync(localConfigPath)) {
        try {
            const local = JSON.parse(fs.readFileSync(localConfigPath, 'utf8'))
            cfg = Object.assign({}, cfg, local)
        } catch (e) {}
    }
    return cfg
}

function writeConfig(key, value, globalFlag) {
    const target = globalFlag ? globalConfigPath : localConfigPath
    let cfg = {}
    if (fs.existsSync(target)) {
        try {
            cfg = JSON.parse(fs.readFileSync(target, 'utf8'))
        } catch (e) {}
    }
    cfg[key] = value
    fs.writeFileSync(target, JSON.stringify(cfg, null, 2), 'utf8')
}

const cmd = args[0]
if (cmd === 'config' || cmd === 'cfg') {
    const sub = args[1]
    if (sub === 'set') {
        const key = args[2]
        const value = args[3]
        const globalFlag = args.includes('--global')
        if (!key || value === undefined) {
            console.error(
                'Usage: kokonut-commit config set <key> <value> [--global]'
            )
            process.exit(1)
        }
        writeConfig(key, value, globalFlag)
        console.log(
            `Saved ${key}=${value} to ${globalFlag ? '~/.kokonutrc' : './.kokonutrc'}`
        )
        process.exit(0)
    }
    if (sub === 'get') {
        const key = args[2]
        const cfg = readConfig()
        console.log(cfg[key] ?? '')
        process.exit(0)
    }
    if (sub === 'list') {
        const cfg = readConfig()
        console.log(JSON.stringify(cfg, null, 2))
        process.exit(0)
    }
}

if (cmd === 'setup') {
    // quick non-interactive setup: --provider <p> --api-key <k> --api-url <url>
    const providerIndex = args.indexOf('--provider')
    const apiKeyIndex = args.indexOf('--api-key')
    const apiUrlIndex = args.indexOf('--api-url')
    if (providerIndex === -1 || apiKeyIndex === -1) {
        console.error(
            'Usage: kokonut-commit setup --provider <provider> --api-key <key> [--api-url <url>]'
        )
        process.exit(1)
    }
    const provider = args[providerIndex + 1]
    const key = args[apiKeyIndex + 1]
    const url = apiUrlIndex !== -1 ? args[apiUrlIndex + 1] : undefined
    writeConfig('provider', provider, false)
    writeConfig('apiKey', key, false)
    if (url) writeConfig('apiUrl', url, false)
    console.log('Setup saved to .kokonutrc')
    process.exit(0)
}

if (cmd === 'models') {
    // best-effort: read provider and apiUrl and try to fetch list; if not available, print message
    const cfg = readConfig()
    const provider = cfg.provider || process.env.KOKONUT_PROVIDER || 'openai'
    const apiKey =
        cfg.apiKey ||
        process.env.KOKONUT_API_KEY ||
        process.env.OPENAI_API_KEY ||
        ''
    const apiUrl = cfg.apiUrl || process.env.KOKONUT_API_URL || ''
    if (!apiKey && !apiUrl) {
        console.log(
            'No API key or custom API URL configured. Use `kokonut-commit setup` to configure.'
        )
        process.exit(0)
    }

    ;(async () => {
        try {
            if (provider === 'openai') {
                const res = await fetch('https://api.openai.com/v1/models', {
                    headers: { Authorization: `Bearer ${apiKey}` }
                })
                const data = await res.json()
                console.log(
                    JSON.stringify(data.data?.map((m) => m.id) || data, null, 2)
                )
            } else if (provider === 'ollama') {
                const url = apiUrl || 'http://localhost:11434/api/models'
                const res = await fetch(url)
                const data = await res.json()
                console.log(JSON.stringify(data, null, 2))
            } else {
                console.log(
                    `Provider ${provider} not supported for models listing yet.`
                )
            }
        } catch (e) {
            console.error('Failed to list models:', e.message)
        }
        process.exit(0)
    })()
}

console.log('Unknown command')
process.exit(1)
