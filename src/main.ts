import * as core from '@actions/core'
import { Octokit } from 'octokit'
import fs from 'fs'
import path from 'path'
import { AIProvider, createAIProvider } from './providers'
import { mergeWithDefaults } from './config'

const PROVIDER_NAMES = [
    'Google Gemini',
    'OpenAI ChatGPT',
    'Anthropic Claude',
    'Mistral Le Chat',
    'Deepseek',
    'Grok',
    'Hugging Face'
] as const

type ConfidenceLabel = 'high' | 'medium' | 'low'

interface CommitSuggestion {
    sha: string
    oldMessage: string
    newMessage: string
    confidence: number
    confidenceLabel: ConfidenceLabel
    providerName: string
}

interface RuntimeConfig {
    provider?: number
    fallbackProviders?: number[]
    prefix?: string
    includeEmojis?: boolean
    commitPreset?: string
    dryRun?: boolean
}

function readWorkspaceConfig(): RuntimeConfig {
    const workspace = process.env.GITHUB_WORKSPACE || process.cwd()
    const configPath = path.join(workspace, '.kokonutrc')

    if (!fs.existsSync(configPath)) {
        return {}
    }

    try {
        const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        void mergeWithDefaults(rawConfig)

        const normalizeBoolean = (value: unknown): boolean | undefined => {
            if (typeof value === 'boolean') return value
            if (typeof value === 'string' && value.trim() !== '') {
                return /^(true|1|yes)$/i.test(value.trim())
            }
            return undefined
        }

        const fallbackProviders =
            typeof rawConfig.fallbackProviders === 'string'
                ? rawConfig.fallbackProviders
                      .split(',')
                      .map((value: string) => Number.parseInt(value.trim(), 10))
                      .filter((value: number) => Number.isInteger(value))
                : Array.isArray(rawConfig.fallbackProviders)
                  ? rawConfig.fallbackProviders
                  : undefined

        return {
            provider: parseProviderIndex(rawConfig.provider),
            fallbackProviders,
            prefix:
                typeof rawConfig.prefix === 'string'
                    ? rawConfig.prefix
                    : undefined,
            includeEmojis: normalizeBoolean(rawConfig.includeEmojis),
            commitPreset:
                typeof rawConfig.commitPreset === 'string'
                    ? rawConfig.commitPreset
                    : undefined,
            dryRun: normalizeBoolean(rawConfig.dryRun)
        }
    } catch (error) {
        core.warning(
            `Unable to read workspace config: ${error instanceof Error ? error.message : String(error)}`
        )
        return {}
    }
}

function parseProviderIndex(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isInteger(value)) {
        return value
    }

    if (typeof value === 'string' && value.trim() !== '') {
        const normalized = value.trim().toLowerCase()
        const aliasMap: Record<string, number> = {
            gemini: 0,
            openai: 1,
            claude: 2,
            anthropic: 2,
            mistral: 3,
            deepseek: 4,
            grok: 5,
            huggingface: 6,
            'hugging face': 6
        }

        if (normalized in aliasMap) {
            return aliasMap[normalized]
        }

        const parsed = Number.parseInt(normalized, 10)
        if (Number.isInteger(parsed)) {
            return parsed
        }
    }

    return undefined
}

function readBooleanPreference(inputName: string, fallback?: boolean): boolean {
    const rawInput = core.getInput(inputName)
    if (rawInput !== '') {
        const val = rawInput.trim()
        if (/^(true|1|yes)$/i.test(val)) return true
        if (/^(false|0|no)$/i.test(val)) return false
        // If the input is present but not a recognizable boolean, treat it
        // as not provided so other sources (fallback/core.getBooleanInput)
        // can determine the value.
    }

    if (fallback !== undefined) {
        return fallback
    }

    return core.getBooleanInput(inputName)
}

function resolveSelectedProviderIndex(
    providers: boolean[],
    fallbackProviderIndex?: number
): number {
    const selectedIndex = providers.findIndex((p) => p)

    if (selectedIndex !== -1) {
        return selectedIndex
    }

    if (
        fallbackProviderIndex !== undefined &&
        fallbackProviderIndex >= 0 &&
        fallbackProviderIndex < PROVIDER_NAMES.length
    ) {
        return fallbackProviderIndex
    }

    throw new Error('No AI provider selected')
}

function estimateConfidence(
    diff: string,
    originalMessage: string
): {
    confidence: number
    confidenceLabel: ConfidenceLabel
} {
    const lineCount = diff.split('\n').length
    const lengthScore = Math.min(diff.length / 2500, 0.35)
    const complexityScore = Math.min(lineCount / 60, 0.25)
    const messageScore = originalMessage.length > 60 ? -0.05 : 0.05
    const confidence = Math.max(
        0.15,
        Math.min(0.95, 0.45 + lengthScore + complexityScore + messageScore)
    )

    const confidenceLabel: ConfidenceLabel =
        confidence >= 0.8 ? 'high' : confidence >= 0.6 ? 'medium' : 'low'

    return { confidence, confidenceLabel }
}

function uniqueProviderCandidates(
    primaryIndex: number,
    fallbackProviders: number[]
): number[] {
    return [primaryIndex, ...fallbackProviders].filter(
        (providerIndex, position, providerIndices) =>
            providerIndices.indexOf(providerIndex) === position &&
            providerIndex >= 0 &&
            providerIndex < PROVIDER_NAMES.length
    )
}

/**
 * Validates that exactly one AI provider is selected
 * @returns The name of the selected provider
 */
function validateSingleProvider(
    providers: boolean[],
    fallbackProviderIndex?: number
): string {
    const selectedCount = providers.filter((p) => p).length

    if (selectedCount === 0) {
        core.setFailed('No AI provider selected! Please select one provider.')
        throw new Error('No AI provider selected')
    }

    if (selectedCount > 1) {
        core.setFailed(
            'Multiple AI providers selected! Please select only one provider.'
        )
        throw new Error('Multiple AI providers cannot be used simultaneously')
    }

    if (
        selectedCount === 0 &&
        fallbackProviderIndex !== undefined &&
        fallbackProviderIndex >= 0 &&
        fallbackProviderIndex < PROVIDER_NAMES.length
    ) {
        return PROVIDER_NAMES[fallbackProviderIndex]
    }

    const selectedIndex = providers.findIndex((p) => p)
    return PROVIDER_NAMES[selectedIndex]
}

/**
 * Validates if a commit message follows Conventional Commits pattern
 * @param message The commit message to validate
 * @returns true if message follows the pattern, false otherwise
 */
function isConventionalCommit(message: string): boolean {
    const conventionalCommitRegex =
        /^(feat|fix|docs|style|refactor|perf|test|chore|ci|revert)(\(.+\))?!?:\s.+/
    return conventionalCommitRegex.test(message)
}

/**
 * Gets the diff for a specific commit
 */
async function getCommitDiff(
    octokit: Octokit,
    owner: string,
    repo: string,
    commitSha: string
): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: commit } = await (octokit as any).repos.getCommit({
        owner,
        repo,
        ref: commitSha
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let files: any[] = commit.files || []

    // Load .kokonutignore patterns from workspace (if present)
    const workspace = process.env.GITHUB_WORKSPACE || process.cwd()
    const kokonutIgnorePath = path.join(workspace, '.kokonutignore')
    let ignorePatterns: string[] = []
    if (fs.existsSync(kokonutIgnorePath)) {
        const content = fs.readFileSync(kokonutIgnorePath, 'utf8')
        ignorePatterns = content
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter((l) => l && !l.startsWith('#'))
    }

    if (ignorePatterns.length > 0) {
        files = files.filter((file) => {
            const filename = file.filename as string
            return !matchesIgnore(filename, ignorePatterns)
        })
    }

    const diffs = files
        .map((file: { filename: string; patch: string }) => {
            const patch = file.patch || ''
            return `File: ${file.filename}\n${patch.substring(0, 500)}` // Limit to first 500 chars
        })
        .join('\n---\n')

    return diffs || 'No changes detected'
}

/**
 * Checks if a filename matches any of the ignore patterns.
 * Supports simple glob patterns: **, *, ?
 */
function matchesIgnore(filename: string, patterns: string[]): boolean {
    // Normalize to posix-style paths for matching
    const normalized = filename.replace(/\\/g, '/')

    for (const pat of patterns) {
        let pattern = pat.replace(/^\/.+/, (m) => m) // keep as-is

        // Escape regex special chars, then restore glob tokens
        pattern = pattern.replace(/[-\\^$+?.()|[\]{}]/g, '\\$&')
        pattern = pattern.replace(/\\\\\*\\\\\*/g, '.*') // ** -> .*
        pattern = pattern.replace(/\\\\\*/g, '[^/]*') // * -> [^/]*
        pattern = pattern.replace(/\\\\\?/g, '.') // ? -> .

        const re = new RegExp('^' + pattern + '$')
        if (re.test(normalized)) return true
    }

    return false
}

/**
 * Creates a PR comment with commit message suggestions
 */
async function createCommitSuggestionsComment(
    octokit: Octokit,
    owner: string,
    repo: string,
    pullNumber: number,
    suggestions: CommitSuggestion[]
): Promise<string | undefined> {
    if (suggestions.length === 0) {
        return undefined
    }

    const groupedSuggestions = suggestions.reduce(
        (groups, suggestion) => {
            groups[suggestion.confidenceLabel].push(suggestion)
            return groups
        },
        {
            high: [] as CommitSuggestion[],
            medium: [] as CommitSuggestion[],
            low: [] as CommitSuggestion[]
        }
    )

    const renderSuggestionTable = (group: CommitSuggestion[]) =>
        group
            .map(
                (suggestion) =>
                    `| ${suggestion.sha.substring(0, 7)} | ${suggestion.providerName} | ${suggestion.confidenceLabel} | ${suggestion.oldMessage} | ${suggestion.newMessage} |`
            )
            .join('\n')

    const body = `## 🤖 Kokonut Commit - Commit Message Suggestions

I've analyzed your commits and generated improved messages following Conventional Commits:

| Commit | Provider | Confidence | Original | Suggested |
|--------|----------|------------|----------|-----------|

### High Confidence

${renderSuggestionTable(groupedSuggestions.high) || '_No high confidence suggestions_'}

### Medium Confidence

${renderSuggestionTable(groupedSuggestions.medium) || '_No medium confidence suggestions_'}

### Low Confidence

${renderSuggestionTable(groupedSuggestions.low) || '_No low confidence suggestions_'}

**How to apply these changes:**
- Use \`git commit --amend --message "new message"\` to update individual commits
- Or use an interactive rebase to update multiple commits
- Then force push with \`git push --force-with-lease\`
`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (octokit as any).issues.createComment({
        owner,
        repo,
        issue_number: pullNumber,
        body
    })

    return response.data?.html_url
}

/**
 * Validates all commits in the pull request and optionally renames them
 */
async function processCommits(
    octokit: Octokit,
    owner: string,
    repo: string,
    pullNumber: number,
    aiProvider: AIProvider,
    aiTokenApi: string,
    providerIndex: number,
    fallbackProviders: number[],
    autoRename: boolean,
    includeEmojis: boolean,
    commitPrefix: string,
    topK: number,
    topP: number,
    commitPreset: string
): Promise<{
    nonCompliant: Array<{ sha: string; message: string }>
    renamed: CommitSuggestion[]
    prCommentUrl?: string
}> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: commits } = await (octokit as any).pulls.listCommits({
        owner,
        repo,
        pull_number: pullNumber
    })

    const nonCompliant: Array<{ sha: string; message: string }> = []
    const renamed: CommitSuggestion[] = []

    for (const commit of commits) {
        const sha = commit.sha
        const originalMessage = commit.commit.message.split('\n')[0]

        if (!isConventionalCommit(originalMessage)) {
            nonCompliant.push({ sha, message: originalMessage })

            if (autoRename) {
                try {
                    const diff = await getCommitDiff(octokit, owner, repo, sha)
                    const providerCandidates = uniqueProviderCandidates(
                        providerIndex,
                        fallbackProviders
                    )

                    let improvedMessage = ''
                    let providerName = aiProvider.name

                    for (const candidateIndex of providerCandidates) {
                        const candidateProvider = createAIProvider(
                            candidateIndex,
                            aiTokenApi,
                            commitPreset
                        )

                        try {
                            improvedMessage =
                                await candidateProvider.generateCommitMessage(
                                    diff,
                                    originalMessage,
                                    includeEmojis,
                                    topK,
                                    topP,
                                    commitPreset
                                )
                            providerName = candidateProvider.name
                            if (candidateIndex !== providerIndex) {
                                core.warning(
                                    `Provider fallback used for ${sha.substring(0, 7)}: ${providerName}`
                                )
                            }
                            break
                        } catch (error) {
                            providerName = candidateProvider.name
                            if (candidateIndex === providerCandidates.at(-1)) {
                                throw error
                            }
                            core.warning(
                                `Provider ${candidateProvider.name} failed for ${sha.substring(0, 7)}; trying fallback provider.`
                            )
                        }
                    }

                    const confidence = estimateConfidence(diff, originalMessage)

                    if (commitPrefix) {
                        improvedMessage = `${commitPrefix} ${improvedMessage}`
                    }

                    renamed.push({
                        sha,
                        oldMessage: originalMessage,
                        newMessage: improvedMessage,
                        confidence: confidence.confidence,
                        confidenceLabel: confidence.confidenceLabel,
                        providerName
                    })

                    core.info(
                        `✓ Improved: "${originalMessage}" → "${improvedMessage}"`
                    )
                } catch (error) {
                    core.warning(
                        `Failed to rename commit ${sha.substring(0, 7)}: ${error instanceof Error ? error.message : String(error)}`
                    )
                }
            }
        }
    }

    return { nonCompliant, renamed }
}

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
    const runtimeConfig = readWorkspaceConfig()
    const providerFallback = (index: number): boolean | undefined =>
        runtimeConfig.provider !== undefined
            ? runtimeConfig.provider === index
            : undefined

    const isGoogleGemini = readBooleanPreference(
        'isGoogleGemini',
        providerFallback(0)
    )
    const isOpenAIChatGPT = readBooleanPreference(
        'isOpenAIChatGPT',
        providerFallback(1)
    )
    const isAnthropicClaude = readBooleanPreference(
        'isAnthropicClaude',
        providerFallback(2)
    )
    const isMistralLeChat = readBooleanPreference(
        'isMistralLeChat',
        providerFallback(3)
    )
    const isDeepseek = readBooleanPreference('isDeepseek', providerFallback(4))
    const isGrok = readBooleanPreference('isGrok', providerFallback(5))
    const isHuggingFace = readBooleanPreference(
        'isHuggingFace',
        providerFallback(6)
    )
    const aiTokenApi = core.getInput('aiTokenApi')
    const githubTokenApi = core.getInput('githubTokenApi')
    const autoRenameCommits = readBooleanPreference('autoRenameCommits', false)
    const includeEmojis = readBooleanPreference(
        'includeEmojis',
        runtimeConfig.includeEmojis
    )
    const dryRun = readBooleanPreference('dryRun', runtimeConfig.dryRun)
    const commitPrefix =
        core.getInput('commitPrefix') || runtimeConfig.prefix || ''
    const commitPreset =
        core.getInput('commitPreset') || runtimeConfig.commitPreset || 'default'
    const topKInput = core.getInput('topK')
    const topPInput = core.getInput('topP')
    const renameMode = core.getInput('renameMode')
    const fallbackProviders = runtimeConfig.fallbackProviders || []

    const topK = topKInput ? parseInt(topKInput, 10) : 20
    const topP = topPInput ? parseFloat(topPInput) : 0.9

    const providers = [
        isGoogleGemini,
        isOpenAIChatGPT,
        isAnthropicClaude,
        isMistralLeChat,
        isDeepseek,
        isGrok,
        isHuggingFace
    ]

    try {
        // Validate that exactly one provider is selected
        const fallbackProviderIndex = parseProviderIndex(runtimeConfig.provider)
        const selectedProvider = validateSingleProvider(
            providers,
            fallbackProviderIndex
        )
        core.info(`✓ Using ${selectedProvider} Token API Key`)

        // Validate tokens are not empty
        if (aiTokenApi === '' || githubTokenApi === '') {
            core.setFailed('Not valid AI or Github Token API!')
            return
        }

        core.info('✓ Tokens validated successfully')

        // Initialize GitHub API client
        const octokit = new Octokit({ auth: githubTokenApi })

        // Get repository and pull request context
        const { GITHUB_REPOSITORY, GITHUB_EVENT_PATH } = process.env

        if (!GITHUB_REPOSITORY) {
            core.warning('Not running in a GitHub Actions environment')
            return
        }

        const [owner, repo] = GITHUB_REPOSITORY.split('/')

        // Create AI provider instance
        const providerIndex = resolveSelectedProviderIndex(
            providers,
            fallbackProviderIndex
        )
        const aiProvider = createAIProvider(
            providerIndex,
            aiTokenApi,
            commitPreset
        )

        // Get pull request number from event
        let eventData: { pull_request?: { number: number } } = {}
        if (GITHUB_EVENT_PATH) {
            eventData = JSON.parse(fs.readFileSync(GITHUB_EVENT_PATH, 'utf-8'))
        }

        if (eventData.pull_request?.number) {
            const pullNumber = eventData.pull_request.number

            core.info(
                `Processing commits for ${owner}/${repo}#${pullNumber}...`
            )
            if (autoRenameCommits) {
                core.info(
                    `🤖 Auto-rename enabled | Emojis: ${includeEmojis ? '✓' : '✗'} | Mode: ${renameMode}`
                )
            }

            // Process commits
            const result = await processCommits(
                octokit,
                owner,
                repo,
                pullNumber,
                aiProvider,
                aiTokenApi,
                providerIndex,
                fallbackProviders,
                autoRenameCommits,
                includeEmojis,
                commitPrefix,
                topK,
                topP,
                commitPreset
            )

            if (result.nonCompliant.length > 0) {
                core.warning(
                    `Found ${result.nonCompliant.length} commit(s) not following Conventional Commits:`
                )
                result.nonCompliant.forEach((commit) => {
                    core.warning(
                        `  - ${commit.sha.substring(0, 7)}: ${commit.message}`
                    )
                })

                if (!autoRenameCommits) {
                    core.setFailed(
                        'Some commits do not follow the Conventional Commits standard!'
                    )
                }
            } else {
                core.info('✓ All commits follow Conventional Commits pattern')
            }

            if (result.renamed.length > 0) {
                core.info(
                    `✓ Successfully improved ${result.renamed.length} commit(s)`
                )
                core.setOutput('renamedCommits', String(result.renamed.length))
                core.setOutput(
                    'improvedMessages',
                    JSON.stringify(
                        result.renamed.map((r) => ({
                            sha: r.sha,
                            old: r.oldMessage,
                            new: r.newMessage,
                            confidence: r.confidence,
                            confidenceLabel: r.confidenceLabel,
                            provider: r.providerName
                        }))
                    )
                )

                core.setOutput(
                    'confidenceSummary',
                    JSON.stringify(
                        result.renamed.map((commit) => ({
                            sha: commit.sha,
                            confidence: commit.confidence,
                            level: commit.confidenceLabel,
                            provider: commit.providerName
                        }))
                    )
                )

                if (dryRun) {
                    core.setOutput(
                        'previewSuggestions',
                        JSON.stringify(result.renamed)
                    )
                    core.info(
                        'Dry-run enabled: preview outputs generated only.'
                    )
                }

                // Create PR comment if in PR mode
                if (renameMode === 'pr' && !dryRun) {
                    const prCommentUrl = await createCommitSuggestionsComment(
                        octokit,
                        owner,
                        repo,
                        pullNumber,
                        result.renamed
                    )
                    if (prCommentUrl) {
                        core.info(`📝 PR comment created: ${prCommentUrl}`)
                        core.setOutput('prCommentUrl', prCommentUrl)
                    }
                } else if (dryRun) {
                    core.info('Dry-run mode skipped PR comment creation.')
                } else if (renameMode === 'force') {
                    core.info(
                        '⚠️ Force mode requires manual git operations. Use output messages to apply changes.'
                    )
                }
            }
        }
    } catch (error) {
        // Report failure to GitHub
        if (error instanceof Error) core.setFailed(error.message)
    }
}
