/**
 * Commitlint validator for Conventional Commits
 * Validates commit messages without requiring the commitlint package
 */

export interface CommitlintError {
    line: number
    column: number
    message: string
    rule: string
}

export interface CommitlintResult {
    valid: boolean
    errors: CommitlintError[]
    warnings: CommitlintError[]
}

const VALID_TYPES = [
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

const HEADER_PATTERN = /^(\w+)(?:\(([^)]+)\))?: *(.*)$/
const HEADER_MAX_LENGTH = 100
const SUBJECT_MIN_LENGTH = 1

/**
 * Validates a commit message against Conventional Commits rules
 */
export function validateCommitMessage(message: string): CommitlintResult {
    const errors: CommitlintError[] = []
    const warnings: CommitlintError[] = []

    if (!message || message.trim().length === 0) {
        errors.push({
            line: 1,
            column: 0,
            message: 'Subject cannot be empty',
            rule: 'subject-empty'
        })
        return { valid: false, errors, warnings }
    }

    const lines = message.split('\n')
    const header = lines[0]

    // Check header max length
    if (header.length > HEADER_MAX_LENGTH) {
        errors.push({
            line: 1,
            column: HEADER_MAX_LENGTH,
            message: `Header must not exceed ${HEADER_MAX_LENGTH} characters`,
            rule: 'header-max-length'
        })
    }

    // Parse header
    const match = header.match(HEADER_PATTERN)
    if (!match) {
        errors.push({
            line: 1,
            column: 0,
            message:
                'Header must be in format: type(scope): subject or type: subject',
            rule: 'type-empty'
        })
        return { valid: false, errors, warnings }
    }

    const [, type, scope, subject] = match

    // Trim subject
    const trimmedSubject = (subject || '').trim()

    // Validate type
    if (!VALID_TYPES.includes(type)) {
        errors.push({
            line: 1,
            column: 0,
            message: `Type "${type}" is not allowed. Valid types: ${VALID_TYPES.join(', ')}`,
            rule: 'type-enum'
        })
    }

    // Validate type case (must be lowercase)
    if (type !== type.toLowerCase()) {
        errors.push({
            line: 1,
            column: 0,
            message: `Type must be lowercase`,
            rule: 'type-case'
        })
    }

    // Validate scope case if present
    if (scope && scope !== scope.toLowerCase()) {
        errors.push({
            line: 1,
            column: header.indexOf(scope),
            message: `Scope must be lowercase`,
            rule: 'scope-case'
        })
    }

    // Validate subject
    if (trimmedSubject.length < SUBJECT_MIN_LENGTH) {
        errors.push({
            line: 1,
            column: header.length,
            message: 'Subject cannot be empty',
            rule: 'subject-empty'
        })
    }

    // Subject should not end with period
    if (trimmedSubject.endsWith('.')) {
        warnings.push({
            line: 1,
            column: header.length - 1,
            message: 'Subject should not end with a period',
            rule: 'subject-full-stop'
        })
    }

    // Check for blank line before body if body exists
    if (lines.length > 1) {
        if (lines[1] && lines[1].trim() !== '') {
            errors.push({
                line: 2,
                column: 0,
                message: 'Must have a blank line between header and body',
                rule: 'body-leading-blank'
            })
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    }
}

/**
 * Formats validation errors for display
 */
export function formatErrors(result: CommitlintResult): string {
    const lines: string[] = []

    if (result.errors.length > 0) {
        lines.push('✖ commit validation failed:')
        lines.push('')
        result.errors.forEach((err) => {
            lines.push(`  ${err.rule}: ${err.message}`)
        })
    }

    if (result.warnings.length > 0) {
        if (result.errors.length > 0) lines.push('')
        lines.push('⚠ commit validation warnings:')
        lines.push('')
        result.warnings.forEach((warn) => {
            lines.push(`  ${warn.rule}: ${warn.message}`)
        })
    }

    return lines.join('\n')
}
