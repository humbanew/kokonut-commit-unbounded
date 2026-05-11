#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');
var os = require('os');
var child_process = require('child_process');
var readline = require('readline/promises');
var node_process = require('node:process');

const args = process.argv.slice(2);
// Show help for --help or -h
if (args.includes('--help') || args.includes('-h')) {
    console.log('Kokonut Commit CLI\n\nUsage:\n' +
        '  kokonut-commit config set <key> <value> [--global]\n' +
        '  kokonut-commit config get <key>\n' +
        '  kokonut-commit config list\n' +
        '  kokonut-commit setup [options]\n' +
        '  kokonut-commit models\n' +
        '  kokonut-commit hook set|unset [--global] [--usr <path>]\n\n' +
        'Configuration Keys:\n' +
        '  provider (0-6), temperature (0-2), topP (0-1), topK (0-100)\n' +
        '  maxTokens (1-65536), frequencyPenalty (-2 to 2)\n' +
        '  presencePenalty (-2 to 2), stopSequences (comma-separated)\n' +
        '  prefix (string), includeEmojis (true|false)\n');
    process.exit(0);
}
if (args.length === 0) {
    console.log('Kokonut Commit CLI\n\nUsage:\n' +
        '  kokonut-commit config set <key> <value> [--global]\n' +
        '  kokonut-commit config get <key>\n' +
        '  kokonut-commit config list\n' +
        '  kokonut-commit setup [options]\n' +
        '  kokonut-commit models\n' +
        '  kokonut-commit hook set|unset [--global] [--usr <path>]\n\n' +
        'Configuration Keys:\n' +
        '  provider (0-6), temperature (0-2), topP (0-1), topK (0-100)\n' +
        '  maxTokens (1-65536), frequencyPenalty (-2 to 2)\n' +
        '  presencePenalty (-2 to 2), stopSequences (comma-separated)\n' +
        '  prefix (string), includeEmojis (true|false)\n');
    process.exit(0);
}
const HOME = os.homedir();
const globalConfigPath = path.join(HOME, '.kokonutrc');
const localConfigPath = path.join(process.cwd(), '.kokonutrc');
function resolveHookDir(customPath) {
    return customPath
        ? path.resolve(process.cwd(), customPath)
        : path.join(process.cwd(), '.git', 'hooks');
}
function runGitConfig(argsToRun) {
    const result = child_process.spawnSync('git', argsToRun, { encoding: 'utf8' });
    if (result.status !== 0) {
        const message = (result.stderr ||
            result.stdout ||
            'git config failed').trim();
        throw new Error(message);
    }
    return result;
}
function readConfig(globalOnly = false) {
    let cfg = {};
    if (fs.existsSync(globalConfigPath)) {
        try {
            cfg = JSON.parse(fs.readFileSync(globalConfigPath, 'utf8'));
        }
        catch (e) {
        }
    }
    if (!globalOnly && fs.existsSync(localConfigPath)) {
        try {
            const local = JSON.parse(fs.readFileSync(localConfigPath, 'utf8'));
            cfg = Object.assign({}, cfg, local);
        }
        catch (e) {
        }
    }
    return cfg;
}
async function promptForMissingApiKey() {
    const cfg = readConfig();
    const provider = cfg.provider || process.env.KOKONUT_PROVIDER || 'openai';
    const apiKey = cfg.apiKey || process.env.KOKONUT_API_KEY || '';
    if (apiKey)
        return true;
    const rl = readline.createInterface({ input: node_process.stdin, output: node_process.stdout });
    try {
        console.log(`\nAPI key missing for ${provider}. Let's set it up.`);
        const entered = await rl.question('Enter your API key (or leave empty to cancel): ');
        if (!entered.trim())
            return false;
        writeConfig('provider', provider, true);
        writeConfig('apiKey', entered.trim(), true);
        console.log('✔ API key saved to ~/.kokonutrc');
        return true;
    }
    finally {
        try {
            rl.close();
        }
        catch (e) { }
    }
}
function writeConfig(key, value, globalFlag) {
    const target = globalFlag ? globalConfigPath : localConfigPath;
    let cfg = {};
    if (fs.existsSync(target)) {
        try {
            cfg = JSON.parse(fs.readFileSync(target, 'utf8'));
        }
        catch (e) {
        }
    }
    cfg[key] = value;
    fs.writeFileSync(target, JSON.stringify(cfg, null, 2), 'utf8');
}
const cmd = args[0];
if (cmd === 'config' || cmd === 'cfg') {
    const sub = args[1];
    if (sub === 'set') {
        const key = args[2];
        const value = args[3];
        const globalFlag = args.includes('--global');
        if (!key || value === undefined) {
            console.error('Usage: kokonut-commit config set <key> <value> [--global]');
            process.exit(1);
        }
        writeConfig(key, value, globalFlag);
        console.log(`Saved ${key}=${value} to ${globalFlag ? '~/.kokonutrc' : './.kokonutrc'}`);
        process.exit(0);
    }
    if (sub === 'get') {
        const key = args[2];
        const cfg = readConfig();
        console.log(cfg[key] ?? '');
        process.exit(0);
    }
    if (sub === 'list') {
        const cfg = readConfig();
        console.log(JSON.stringify(cfg, null, 2));
        process.exit(0);
    }
}
if (cmd === 'setup') {
    const providerIndex = args.indexOf('--provider');
    const apiKeyIndex = args.indexOf('--api-key');
    const apiUrlIndex = args.indexOf('--api-url');
    const temperatureIndex = args.indexOf('--temperature');
    const topPIndex = args.indexOf('--top-p');
    const topKIndex = args.indexOf('--top-k');
    const maxTokensIndex = args.indexOf('--max-tokens');
    const frequencyPenaltyIndex = args.indexOf('--frequency-penalty');
    const presencePenaltyIndex = args.indexOf('--presence-penalty');
    const stopSequencesIndex = args.indexOf('--stop-sequences');
    const prefixIndex = args.indexOf('--prefix');
    const globalFlagArg = args.includes('--global');
    async function interactiveSetup() {
        const rl = readline.createInterface({ input: node_process.stdin, output: node_process.stdout });
        try {
            console.log('Interactive setup — Kokonut Commit');
            const providerInput = await rl.question('Provider (openai|ollama) [openai]: ');
            const provider = providerInput.trim() || 'openai';
            const apiKey = await rl.question('API key (leave empty to cancel): ');
            if (!apiKey.trim()) {
                console.log('Setup cancelled');
                process.exit(0);
            }
            const saveGlobalInput = await rl.question('Save to global config (~/.kokonutrc)? (y/N): ');
            const saveGlobal = /^y(es)?$/i.test(saveGlobalInput.trim());
            const apiUrlInput = await rl.question('API URL (optional): ');
            writeConfig('provider', provider, saveGlobal);
            writeConfig('apiKey', apiKey.trim(), saveGlobal);
            if (apiUrlInput && apiUrlInput.trim())
                writeConfig('apiUrl', apiUrlInput.trim(), saveGlobal);
            console.log(`Setup saved to ${saveGlobal ? '~/.kokonutrc' : './.kokonutrc'}`);
        }
        finally {
            try {
                rl.close();
            }
            catch (e) { }
        }
        process.exit(0);
    }
    // If flags provided, use non-interactive mode
    if (providerIndex !== -1 && apiKeyIndex !== -1) {
        const provider = args[providerIndex + 1];
        const key = args[apiKeyIndex + 1];
        const url = apiUrlIndex !== -1 ? args[apiUrlIndex + 1] : undefined;
        writeConfig('provider', provider, globalFlagArg);
        writeConfig('apiKey', key, globalFlagArg);
        if (url)
            writeConfig('apiUrl', url, globalFlagArg);
        if (temperatureIndex !== -1)
            writeConfig('temperature', parseFloat(args[temperatureIndex + 1]), globalFlagArg);
        if (topPIndex !== -1)
            writeConfig('topP', parseFloat(args[topPIndex + 1]), globalFlagArg);
        if (topKIndex !== -1)
            writeConfig('topK', parseInt(args[topKIndex + 1]), globalFlagArg);
        if (maxTokensIndex !== -1)
            writeConfig('maxTokens', parseInt(args[maxTokensIndex + 1]), globalFlagArg);
        if (frequencyPenaltyIndex !== -1)
            writeConfig('frequencyPenalty', parseFloat(args[frequencyPenaltyIndex + 1]), globalFlagArg);
        if (presencePenaltyIndex !== -1)
            writeConfig('presencePenalty', parseFloat(args[presencePenaltyIndex + 1]), globalFlagArg);
        if (stopSequencesIndex !== -1) {
            const seqArg = args[stopSequencesIndex + 1] || '';
            const sequences = seqArg
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
            writeConfig('stopSequences', sequences, globalFlagArg);
        }
        if (prefixIndex !== -1)
            writeConfig('prefix', args[prefixIndex + 1], globalFlagArg);
        console.log(`Setup saved to ${globalFlagArg ? '~/.kokonutrc' : './.kokonutrc'}`);
        process.exit(0);
    }
    // Otherwise run interactive
    void interactiveSetup();
}
if (cmd === 'models') {
    let cfg = readConfig();
    let provider = cfg.provider || process.env.KOKONUT_PROVIDER || 'openai';
    let apiKey = cfg.apiKey ||
        process.env.KOKONUT_API_KEY ||
        process.env.OPENAI_API_KEY ||
        '';
    let apiUrl = cfg.apiUrl || process.env.KOKONUT_API_URL || '';
    const ensureKey = async () => {
        if (!apiKey && !apiUrl) {
            const ok = await promptForMissingApiKey();
            if (!ok) {
                console.log('No API key or custom API URL configured. Use `kokonut-commit setup` to configure.');
                process.exit(0);
            }
            cfg = readConfig();
            provider = cfg.provider || process.env.KOKONUT_PROVIDER || 'openai';
            apiKey =
                cfg.apiKey ||
                    process.env.KOKONUT_API_KEY ||
                    process.env.OPENAI_API_KEY ||
                    '';
            apiUrl = cfg.apiUrl || process.env.KOKONUT_API_URL || '';
        }
    };
    (async () => {
        await ensureKey();
        try {
            if (provider === 'openai') {
                const res = await fetch('https://api.openai.com/v1/models', {
                    headers: { Authorization: `Bearer ${apiKey}` }
                });
                const data = await res.json();
                const maybe = data;
                if (maybe && Array.isArray(maybe.data)) {
                    const ids = maybe.data.map((m) => m.id);
                    console.log(JSON.stringify(ids, null, 2));
                }
                else {
                    console.log(JSON.stringify(data, null, 2));
                }
            }
            else if (provider === 'ollama') {
                const url = apiUrl || 'http://localhost:11434/api/models';
                const res = await fetch(url);
                const data = await res.json();
                console.log(JSON.stringify(data, null, 2));
            }
            else {
                console.log(`Provider ${provider} not supported for models listing yet.`);
            }
        }
        catch (e) {
            if (e instanceof Error)
                console.error('Failed to list models:', e.message);
            else
                console.error('Failed to list models:', String(e));
        }
        process.exit(0);
    })();
}
if (cmd === 'hook') {
    const sub = args[1];
    if (!sub) {
        console.error('Usage: kokonut-commit hook set|unset [--global] [--usr <path>]');
        process.exit(1);
    }
    const workspace = process.cwd();
    const gitHooksDir = path.join(workspace, '.git', 'hooks');
    const home = os.homedir();
    const globalHooksDir = path.join(home, '.kokonut', 'hooks');
    const targetHook = path.join(gitHooksDir, 'prepare-commit-msg');
    const targetGlobalHook = path.join(globalHooksDir, 'prepare-commit-msg');
    const customHookDirIndex = args.indexOf('--usr');
    const customHookDir = customHookDirIndex !== -1 ? args[customHookDirIndex + 1] : undefined;
    const targetCustomHooksDir = resolveHookDir(customHookDir);
    const targetCustomHook = path.join(targetCustomHooksDir, 'prepare-commit-msg');
    const isGlobal = args.includes('--global');
    const hasCustomDirFlag = customHookDirIndex !== -1;
    if (isGlobal && hasCustomDirFlag) {
        console.error('Usage: kokonut-commit hook set|unset [--global] [--usr <path>]');
        process.exit(1);
    }
    if (hasCustomDirFlag && !customHookDir) {
        console.error('Usage: kokonut-commit hook set|unset [--global] [--usr <path>]');
        process.exit(1);
    }
    if (sub === 'set') {
        if (isGlobal) {
            if (!fs.existsSync(globalHooksDir))
                fs.mkdirSync(globalHooksDir, { recursive: true });
            const hookStub = `#!/usr/bin/env node\nconsole.log('Kokonut Commit global hook placeholder')\n`;
            fs.writeFileSync(targetGlobalHook, hookStub, { mode: 0o755 });
            // attempt to set git global hooksPath to this dir (best-effort)
            try {
                runGitConfig([
                    'config',
                    '--global',
                    'core.hooksPath',
                    globalHooksDir
                ]);
            }
            catch (e) {
                // ignore
            }
            console.log('Installed global hook at', targetGlobalHook);
            process.exit(0);
        }
        if (!fs.existsSync(path.join(workspace, '.git'))) {
            console.error('No .git directory found. Run this from the repository root.');
            process.exit(1);
        }
        if (hasCustomDirFlag) {
            if (!fs.existsSync(targetCustomHooksDir))
                fs.mkdirSync(targetCustomHooksDir, { recursive: true });
            const hookStub = `#!/usr/bin/env node\nconsole.log('Kokonut Commit hook placeholder')\n`;
            fs.writeFileSync(targetCustomHook, hookStub, { mode: 0o755 });
            try {
                runGitConfig([
                    'config',
                    '--local',
                    'core.hooksPath',
                    targetCustomHooksDir
                ]);
            }
            catch (e) {
                console.error('Failed to configure custom hook path:', e.message);
                process.exit(1);
            }
            console.log('Installed prepare-commit-msg hook at', targetCustomHook);
            process.exit(0);
        }
        // Prefer the project installer for the default repo hook when available.
        const installer = path.join(process.cwd(), 'scripts', 'install-hook.js');
        if (fs.existsSync(installer)) {
            const res = child_process.spawnSync(process.execPath, [installer], {
                stdio: 'inherit'
            });
            if ((res.status ?? 0) !== 0)
                process.exit(res.status ?? 1);
            process.exit(0);
        }
        if (!fs.existsSync(gitHooksDir))
            fs.mkdirSync(gitHooksDir, { recursive: true });
        const hookStub = `#!/usr/bin/env node\nconsole.log('Kokonut Commit hook placeholder')\n`;
        fs.writeFileSync(targetHook, hookStub, { mode: 0o755 });
        console.log('Installed .git/hooks/prepare-commit-msg');
        process.exit(0);
    }
    if (sub === 'unset') {
        try {
            if (isGlobal) {
                if (fs.existsSync(targetGlobalHook)) {
                    try {
                        const stats = fs.lstatSync(targetGlobalHook);
                        const preferredCli = path.join(process.cwd(), 'dist', 'cli.js');
                        if (stats.isSymbolicLink()) {
                            const real = fs.realpathSync(targetGlobalHook);
                            if (real === preferredCli) {
                                fs.unlinkSync(targetGlobalHook);
                                console.log('Removed global prepare-commit-msg hook (symlink)');
                            }
                            else {
                                console.log('Global prepare-commit-msg exists and is not the kokonut symlink; not removing');
                            }
                        }
                        else {
                            fs.unlinkSync(targetGlobalHook);
                            console.log('Removed global prepare-commit-msg hook');
                        }
                    }
                    catch (e) {
                        console.error('Failed to remove global hook:', e.message);
                        process.exit(1);
                    }
                }
                else {
                    console.log('No global prepare-commit-msg hook found');
                }
                try {
                    // if git global hooksPath pointed to this dir, unset it
                    const cfg = runGitConfig([
                        'config',
                        '--global',
                        '--get',
                        'core.hooksPath'
                    ]);
                    if (cfg.stdout && cfg.stdout.trim() === globalHooksDir) {
                        runGitConfig([
                            'config',
                            '--global',
                            '--unset',
                            'core.hooksPath'
                        ]);
                    }
                }
                catch (e) {
                    // ignore
                }
                process.exit(0);
            }
            if (hasCustomDirFlag) {
                if (fs.existsSync(targetCustomHook)) {
                    try {
                        const stats = fs.lstatSync(targetCustomHook);
                        const preferredCli = path.join(process.cwd(), 'dist', 'cli.js');
                        if (stats.isSymbolicLink()) {
                            const real = fs.realpathSync(targetCustomHook);
                            if (real === preferredCli) {
                                fs.unlinkSync(targetCustomHook);
                                console.log('Removed custom prepare-commit-msg hook (symlink)');
                            }
                            else {
                                console.log('Custom prepare-commit-msg exists and is not the kokonut symlink; not removing');
                            }
                        }
                        else {
                            fs.unlinkSync(targetCustomHook);
                            console.log('Removed custom prepare-commit-msg hook');
                        }
                    }
                    catch (e) {
                        console.error('Failed to remove custom hook:', e.message);
                        process.exit(1);
                    }
                }
                else {
                    console.log('No custom prepare-commit-msg hook found');
                }
                try {
                    const cfg = runGitConfig([
                        'config',
                        '--local',
                        '--get',
                        'core.hooksPath'
                    ]);
                    if (cfg.stdout &&
                        cfg.stdout.trim() === targetCustomHooksDir) {
                        runGitConfig([
                            'config',
                            '--local',
                            '--unset',
                            'core.hooksPath'
                        ]);
                    }
                }
                catch (e) {
                    // ignore
                }
                process.exit(0);
            }
            if (fs.existsSync(targetHook)) {
                try {
                    const stats = fs.lstatSync(targetHook);
                    const preferredCli = path.join(process.cwd(), 'dist', 'cli.js');
                    if (stats.isSymbolicLink()) {
                        const real = fs.realpathSync(targetHook);
                        if (real === preferredCli) {
                            fs.unlinkSync(targetHook);
                            console.log('Removed .git/hooks/prepare-commit-msg (symlink)');
                        }
                        else {
                            console.log('prepare-commit-msg exists and is not the kokonut symlink; not removing');
                        }
                    }
                    else {
                        // regular file: remove (was likely a stub)
                        fs.unlinkSync(targetHook);
                        console.log('Removed .git/hooks/prepare-commit-msg');
                    }
                }
                catch (e) {
                    console.error('Failed to remove hook:', e.message);
                    process.exit(1);
                }
            }
            else {
                console.log('No prepare-commit-msg hook found');
            }
            process.exit(0);
        }
        catch (err) {
            console.error('Failed to remove hook:', err.message);
            process.exit(1);
        }
    }
    console.error('Unknown hook command');
    process.exit(1);
}
console.log('Unknown command');
process.exit(1);

exports.promptForMissingApiKey = promptForMissingApiKey;
