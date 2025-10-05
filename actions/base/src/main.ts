import * as core from '@actions/core'
import { KTerminal } from './KTerminal.js'
import { KTerminalMessages } from './KTerminalMessages.js'
import { KExceptions } from './KExceptions.js'

const kamblerLibrarys = Object.freeze({
    exceptions: KExceptions,
    terminal: KTerminal,
    terminalMessages: KTerminalMessages
})

const kamblerInputs = Object.freeze({
    githubToken: String(core.getInput('github_token')),
    agentToken: String(core.getInput('agent_token')),
    agentModel: String(core.getInput('agent_model')),
    agentApiBaseUrl: String(core.getInput('agent_api_base_url')),
    agentApiVersion: String(core.getInput('agent_api_version')),
    agentApiMaxRetries: Number(core.getInput('agent_api_max_retries')),
    agentApiRetryDelay: Number(core.getInput('agent_api_retry_delay')),
    agentReviewThreshold: Number(core.getInput('agent_review_threshold')),
    agentMaxSuggestions: Number(core.getInput('agent_max_suggestions')),
    agentTimeout: Number(core.getInput('agent_timeout')),
    commitMessagePattern: String(core.getInput('commit_message_pattern')),
    commitMessageHint: String(core.getInput('commit_message_hint')),
    failOnInvalidCommit: Boolean(core.getInput('fail_on_invalid_commit')),
    reviewPullRequest: Boolean(core.getInput('review_pull_request')),
    reviewCommits: Boolean(core.getInput('review_commits')),
    reviewDrafts: Boolean(core.getInput('review_drafts')),
    commentOnPr: Boolean(core.getInput('comment_on_pr')),
    commentHeader: String(core.getInput('comment_header')),
    commentFooter: String(core.getInput('comment_footer')),
    automerge: Boolean(core.getInput('automerge')),
    automergeMethod: String(core.getInput('automerge_method')),
    automergeCommitTitle: String(core.getInput('automerge_commit_title')),
    automergeCommitMessage: String(core.getInput('automerge_commit_message')),
    prBranchProtection: Boolean(core.getInput('pr_branch_protection')),
    prReviewApprovalCount: Number(core.getInput('pr_review_approval_count')),
    prReviewDismissStale: Boolean(core.getInput('pr_review_dismiss_stale')),
    prReviewRequireCodeOwner: Boolean(core.getInput('pr_review_require_code_owner')),
    prLabels: String(core.getInput('pr_labels')),
    prAssignees: String(core.getInput('pr_assignees')),
    prReviewers: String(core.getInput('pr_reviewers')),
    prTeamReviewers: String(core.getInput('pr_team_reviewers')),
    dryRun: Boolean(core.getInput('dry_run')),
    emailNotifications: Boolean(core.getInput('email_notifications')),
    emailSubject: String(core.getInput('email_subject')),
    emailBody: String(core.getInput('email_body')),
    logLevel: String(core.getInput('log_level')),
    logFile: String(core.getInput('log_file')),
    timezone: String(core.getInput('timezone')),
    slackWebhookUrl: String(core.getInput('slack_webhook_url')),
    slackChannel: String(core.getInput('slack_channel')),
    slackUsername: String(core.getInput('slack_username')),
    slackIconEmoji: String(core.getInput('slack_icon_emoji')),
    slackIconUrl: String(core.getInput('slack_icon_url')),
    notionApiToken: String(core.getInput('notion_api_token')),
    notionDatabaseId: String(core.getInput('notion_database_id')),
    notionPageProperties: String(core.getInput('notion_page_properties')),
    notionPageContent: String(core.getInput('notion_page_content'))
});
kamblerInputs

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
    try {
        kamblerLibrarys.exceptions.prototype.validation('github_token', 'GitHub token is required.');
    } catch (error) {
        // Fail the workflow run if an error occurs
        if (error instanceof Error) {
            core.setFailed(
                kamblerLibrarys.terminalMessages.prototype.error(error.message)
            )
        }
    }
}
