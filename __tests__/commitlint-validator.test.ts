import {
    validateCommitMessage,
    formatErrors,
    CommitlintResult
} from '../src/commitlint-validator.js'

describe('commitlint-validator', () => {
    describe('validateCommitMessage', () => {
        it('should pass valid conventional commit', () => {
            const result = validateCommitMessage('feat: add new feature')
            expect(result.valid).toBe(true)
            expect(result.errors).toHaveLength(0)
        })

        it('should pass valid commit with scope', () => {
            const result = validateCommitMessage('feat(auth): add login flow')
            expect(result.valid).toBe(true)
            expect(result.errors).toHaveLength(0)
        })

        it('should pass fix type', () => {
            const result = validateCommitMessage('fix: resolve memory leak')
            expect(result.valid).toBe(true)
            expect(result.errors).toHaveLength(0)
        })

        it('should pass docs, test, chore types', () => {
            ;[
                'docs: update README',
                'test: add unit tests',
                'chore: update deps'
            ].forEach((msg) => {
                const result = validateCommitMessage(msg)
                expect(result.valid).toBe(true)
            })
        })

        it('should fail empty message', () => {
            const result = validateCommitMessage('')
            expect(result.valid).toBe(false)
            expect(result.errors).toContainEqual(
                expect.objectContaining({
                    rule: 'subject-empty'
                })
            )
        })

        it('should fail invalid type', () => {
            const result = validateCommitMessage('feature: add new feature')
            expect(result.valid).toBe(false)
            expect(result.errors).toContainEqual(
                expect.objectContaining({
                    rule: 'type-enum'
                })
            )
        })

        it('should fail uppercase type', () => {
            const result = validateCommitMessage('FEAT: add feature')
            expect(result.valid).toBe(false)
            expect(result.errors).toContainEqual(
                expect.objectContaining({
                    rule: 'type-case'
                })
            )
        })

        it('should fail missing subject after colon', () => {
            const result = validateCommitMessage('feat:')
            expect(result.valid).toBe(false)
            expect(result.errors).toContainEqual(
                expect.objectContaining({
                    rule: 'subject-empty'
                })
            )
        })

        it('should fail header exceeds max length', () => {
            const longHeader = 'feat: ' + 'x'.repeat(100) // Will exceed 100 char limit
            const result = validateCommitMessage(longHeader)
            expect(result.valid).toBe(false)
            expect(result.errors).toContainEqual(
                expect.objectContaining({
                    rule: 'header-max-length'
                })
            )
        })

        it('should fail uppercase scope', () => {
            const result = validateCommitMessage('feat(Auth): add login')
            expect(result.valid).toBe(false)
            expect(result.errors).toContainEqual(
                expect.objectContaining({
                    rule: 'scope-case'
                })
            )
        })

        it('should warn when subject ends with period', () => {
            const result = validateCommitMessage('feat: add feature.')
            expect(result.valid).toBe(true)
            expect(result.warnings).toContainEqual(
                expect.objectContaining({
                    rule: 'subject-full-stop'
                })
            )
        })

        it('should fail missing blank line between header and body', () => {
            const result = validateCommitMessage(
                'feat: add feature\nThis is the body'
            )
            expect(result.valid).toBe(false)
            expect(result.errors).toContainEqual(
                expect.objectContaining({
                    rule: 'body-leading-blank'
                })
            )
        })

        it('should pass with correct blank line between header and body', () => {
            const result = validateCommitMessage(
                'feat: add feature\n\nThis is the body'
            )
            expect(result.valid).toBe(true)
        })

        it('should validate multiple lines with body', () => {
            const message =
                'feat(api): add new endpoint\n\nAdded POST /api/users endpoint\nwith authentication required'
            const result = validateCommitMessage(message)
            expect(result.valid).toBe(true)
        })

        it('should support all valid commit types', () => {
            const types = [
                'feat',
                'fix',
                'docs',
                'style',
                'refactor',
                'perf',
                'test',
                'chore',
                'ci',
                'revert',
                'build'
            ]

            types.forEach((type) => {
                const result = validateCommitMessage(`${type}: test message`)
                expect(result.valid).toBe(true)
            })
        })

        it('should detect invalid format without type-enum match', () => {
            const result = validateCommitMessage(
                'this is not a conventional commit'
            )
            expect(result.valid).toBe(false)
            expect(result.errors).toContainEqual(
                expect.objectContaining({
                    rule: 'type-empty'
                })
            )
        })
    })

    describe('formatErrors', () => {
        it('should format errors correctly', () => {
            const result: CommitlintResult = {
                valid: false,
                errors: [
                    {
                        line: 1,
                        column: 0,
                        message: 'Type is invalid',
                        rule: 'type-enum'
                    }
                ],
                warnings: []
            }

            const formatted = formatErrors(result)
            expect(formatted).toContain('✖ commit validation failed')
            expect(formatted).toContain('type-enum: Type is invalid')
        })

        it('should format warnings correctly', () => {
            const result: CommitlintResult = {
                valid: true,
                errors: [],
                warnings: [
                    {
                        line: 1,
                        column: 15,
                        message: 'Subject should not end with period',
                        rule: 'subject-full-stop'
                    }
                ]
            }

            const formatted = formatErrors(result)
            expect(formatted).toContain('⚠ commit validation warnings')
            expect(formatted).toContain(
                'subject-full-stop: Subject should not end with period'
            )
        })

        it('should format both errors and warnings', () => {
            const result: CommitlintResult = {
                valid: false,
                errors: [
                    {
                        line: 1,
                        column: 0,
                        message: 'Type is invalid',
                        rule: 'type-enum'
                    }
                ],
                warnings: [
                    {
                        line: 1,
                        column: 15,
                        message: 'Warning message',
                        rule: 'some-warning'
                    }
                ]
            }

            const formatted = formatErrors(result)
            expect(formatted).toContain('✖ commit validation failed')
            expect(formatted).toContain('⚠ commit validation warnings')
        })
    })
})
