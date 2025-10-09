import * as core from '@actions/core'
import * as github from '@actions/github'
import { Octokit } from '@octokit/rest'
import { KAgents } from './KAgents.js'
import { KTerminal } from './KTerminal.js'
import { KTerminalMessages } from './KTerminalMessages.js'
import { KExceptions } from './KExceptions.js'

const kamblerLibrarys = Object.freeze({
    agents: KAgents,
    exceptions: KExceptions,
    terminal: KTerminal,
    terminalMessages: KTerminalMessages
})

const kamblerInputs = Object.freeze({
    githubToken: String(core.getInput('github_token')),
    agentToken: String(core.getInput('agent_token')),
    agentModel: String(core.getInput('agent_model')),
    agentOrigin: String(core.getInput('agent_origin')),
    failOnInvalidCommit: Boolean(core.getInput('fail_on_invalid_commit')),
    autoUpdateCommitMsgs: Boolean(core.getInput('auto_update_commit_msgs')),
    onlyEnhanceCommits: Boolean(core.getInput('only_enhance_commits')),
    maxCommitsScan: Number(core.getInput('max_commits_scan'))
})

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
    try {
        kamblerLibrarys.exceptions.prototype.validation(
            'github_token',
            'GitHub token is required.'
        )

        const githubManipulacao = new Octokit({
            auth: kamblerInputs.githubToken
        })

        const listaCommits: string[] = [] 
        ,commitModificadoArquivos: string[] = []
        ,maxCommitsToProcess = kamblerInputs.maxCommitsScan;

        // get commit list
        const { data: commitList } = await githubManipulacao.rest.repos.listCommits({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo
        })
        if (commitList.length === 0) {
            kamblerLibrarys.exceptions.prototype.validation(
                'commit_list',
                'No commits found in the repository.'
            )
        }

        for (let i = 0; i < Math.min(commitList.length, maxCommitsToProcess); i++) {
            const commit = commitList[i];
            listaCommits.push(commit.commit.message);
            // get modified files for each commit
            const { data: commitData } = await githubManipulacao.rest.repos.getCommit({
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                ref: commit.sha
            });
            const modifiedFiles = commitData.files?.map(file => file.filename) || [];
            commitModificadoArquivos.push(`Commit: ${commit.commit.message}\nModified Files: ${modifiedFiles.join(', ')}`);
        }
        console.log('Commit Messages:\n', listaCommits.join('\n\n'));
        console.log('Modified Files for each Commit:\n', commitModificadoArquivos.join('\n\n'));

        // Validate the latest commit message
        // This feature is currently disabled
        // Uncomment the following lines to enable it
        if (kamblerInputs.onlyEnhanceCommits != false) {
            if (kamblerInputs.failOnInvalidCommit) {
                const commitMessage = commitList[0].commit.message
                console.log(commitMessage)
                const isValidCommit = /^(feat|fix|refactor|perf|style|test|docs|build|ops|chore): (\w+)(\(.+\))?$/.test(commitMessage)
                if (!isValidCommit) {
                    kamblerLibrarys.exceptions.prototype.validation(
                        'commit_message',
                        'The latest commit message is not valid. It must include "feat", "fix", "refactor", "perf", "style", "test", "docs", "build", "ops" or "chore".'
                    )
                }
            }
        } else {
            core.info(
                kamblerLibrarys.terminalMessages.prototype.information(
                    'Skipping commit message validation as only_enhance_commits is set to false.'
                )
            )
        }

        /**
         * TODO: IDEA:
         * Additional action logic can be added here
         * Enhance commit messages with AI agent
         * ================================================================
         * Adicionar lógica para interagir com o agente de IA aqui
         * ================================================================
         */

        /**
         * TODO: IDEA:
         * Implement auto update of commit messages
         * ================================================================
         * Implementar a atualização automática das mensagens de commit aqui
         * ================================================================
         */
        // AUTO UPDATE COMMIT MESSAGES
        if (kamblerInputs.autoUpdateCommitMsgs) {
            core.info(
                kamblerLibrarys.terminalMessages.prototype.information(
                    'Auto update the commits.'
                )
            )
        }

        // If we reach this point, the action was successfully completed
        core.info(
            kamblerLibrarys.terminalMessages.prototype.success(
                'Action completed successfully.'
            )
        )
    } catch (error) {
        // Fail the workflow run if an error occurs
        if (error instanceof Error) {
            core.setFailed(
                kamblerLibrarys.terminalMessages.prototype.error(error.message)
            )
        }
    }
}
