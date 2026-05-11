import * as core from '@actions/core'
import { Octokit } from 'octokit'
import fs from 'fs'
import path from 'path'
import { AIProvider, createAIProvider } from './providers.js'

/**
 * Validates that exactly one AI provider is selected
 * @returns The name of the selected provider
 */
function validateSingleProvider(providers: boolean[]): string {
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

    const providers_names = [
        'Google Gemini',
        'OpenAI ChatGPT',
        'Anthropic Claude',
        'Mistral Le Chat'
    ]

    const selectedIndex = providers.findIndex((p) => p)
    return providers_names[selectedIndex]
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
    suggestions: Array<{ sha: string; oldMessage: string; newMessage: string }>
): Promise<string | undefined> {
    if (suggestions.length === 0) {
        return undefined
    }

    const suggestionTable = suggestions
        .map(
            (s) =>
                `| ${s.sha.substring(0, 7)} | ${s.oldMessage} | ${s.newMessage} |`
        )
        .join('\n')

    const body = `## 🤖 Kokonut Commit - Commit Message Suggestions

I've analyzed your commits and generated improved messages following Conventional Commits:

| Commit | Original | Suggested |
|--------|----------|-----------|
${suggestionTable}

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
    autoRename: boolean,
    includeEmojis: boolean,
    commitPrefix: string,
    topK: number,
    topP: number
): Promise<{
    nonCompliant: Array<{ sha: string; message: string }>
    renamed: Array<{ sha: string; oldMessage: string; newMessage: string }>
    prCommentUrl?: string
}> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: commits } = await (octokit as any).pulls.listCommits({
        owner,
        repo,
        pull_number: pullNumber
    })

    const nonCompliant: Array<{ sha: string; message: string }> = []
    const renamed: Array<{
        sha: string
        oldMessage: string
        newMessage: string
    }> = []

    for (const commit of commits) {
        const sha = commit.sha
        const originalMessage = commit.commit.message.split('\n')[0]

        if (!isConventionalCommit(originalMessage)) {
            nonCompliant.push({ sha, message: originalMessage })

            if (autoRename) {
                try {
                    const diff = await getCommitDiff(octokit, owner, repo, sha)
                    let improvedMessage =
                        await aiProvider.generateCommitMessage(
                            diff,
                            originalMessage,
                            includeEmojis,
                            topK,
                            topP
                        )

                    if (commitPrefix) {
                        improvedMessage = `${commitPrefix} ${improvedMessage}`
                    }

                    renamed.push({
                        sha,
                        oldMessage: originalMessage,
                        newMessage: improvedMessage
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
    const isGoogleGemini = core.getBooleanInput('isGoogleGemini')
    const isOpenAIChatGPT = core.getBooleanInput('isOpenAIChatGPT')
    const isAnthropicClaude = core.getBooleanInput('isAnthropicClaude')
    const isMistralLeChat = core.getBooleanInput('isMistralLeChat')
    const aiTokenApi = core.getInput('aiTokenApi')
    const githubTokenApi = core.getInput('githubTokenApi')
    const autoRenameCommits = core.getBooleanInput('autoRenameCommits')
    const includeEmojis = core.getBooleanInput('includeEmojis')
    const commitPrefix = core.getInput('commitPrefix')
    const topKInput = core.getInput('topK')
    const topPInput = core.getInput('topP')
    const renameMode = core.getInput('renameMode')

    const topK = topKInput ? parseInt(topKInput, 10) : 20
    const topP = topPInput ? parseFloat(topPInput) : 0.9

    const providers = [
        isGoogleGemini,
        isOpenAIChatGPT,
        isAnthropicClaude,
        isMistralLeChat
    ]

    try {
        // Validate that exactly one provider is selected
        const selectedProvider = validateSingleProvider(providers)
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
        const providerIndex = providers.findIndex((p) => p)
        const aiProvider = createAIProvider(providerIndex, aiTokenApi)

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
                autoRenameCommits,
                includeEmojis,
                commitPrefix,
                topK,
                topP
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
                            new: r.newMessage
                        }))
                    )
                )

                // Create PR comment if in PR mode
                if (renameMode === 'pr') {
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
