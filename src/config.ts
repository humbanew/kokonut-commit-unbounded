/**
 * Configuration management with defaults and migration support
 */

export interface Config {
    version: string
    provider?: number
    apiKey?: string
    apiUrl?: string
    temperature?: number
    topP?: number
    topK?: number
    maxTokens?: number
    frequencyPenalty?: number
    presencePenalty?: number
    stopSequences?: string[]
    prefix?: string
    includeEmojis?: boolean
}

export interface ConfigVersion {
    version: string
    defaults: Partial<Config>
}

// Define supported config versions
const CONFIG_VERSIONS: ConfigVersion[] = [
    {
        version: '0.0.0',
        defaults: {
            version: '0.0.0',
            provider: 1,
            temperature: 0.7,
            topP: 0.9,
            topK: 40,
            maxTokens: 65536,
            frequencyPenalty: 0,
            presencePenalty: 0,
            stopSequences: [],
            prefix: '',
            includeEmojis: true
        }
    }
]

const CURRENT_VERSION = '0.0.0'

/**
 * Get default configuration for current version
 */
export function getDefaults(): Config {
    const versionInfo = CONFIG_VERSIONS.find(
        (v) => v.version === CURRENT_VERSION
    )
    if (!versionInfo) {
        throw new Error(`No defaults found for version ${CURRENT_VERSION}`)
    }
    return versionInfo.defaults as Config
}

/**
 * Migrate configuration from one version to another
 */
export function migrateConfig(config: any): Config {
    const configVersion = config.version || '0.0.0'

    // If already at current version, just validate
    if (configVersion === CURRENT_VERSION) {
        return {
            ...getDefaults(),
            ...config
        }
    }

    // No migrations needed for v0.0.0 - return as-is with current version
    return {
        ...getDefaults(),
        ...config,
        version: CURRENT_VERSION
    }
}

/**
 * Validate configuration
 */
export function validateConfig(config: Config): {
    valid: boolean
    errors: string[]
} {
    const errors: string[] = []

    if (!config.version) {
        errors.push('Missing version field')
    }

    if (config.provider !== undefined) {
        if (
            !Number.isInteger(config.provider) ||
            config.provider < 0 ||
            config.provider > 6
        ) {
            errors.push(`Invalid provider: ${config.provider} (must be 0-6)`)
        }
    }

    if (config.temperature !== undefined) {
        if (
            typeof config.temperature !== 'number' ||
            config.temperature < 0 ||
            config.temperature > 2
        ) {
            errors.push(
                `Invalid temperature: ${config.temperature} (must be 0-2)`
            )
        }
    }

    if (config.topP !== undefined) {
        if (
            typeof config.topP !== 'number' ||
            config.topP < 0 ||
            config.topP > 1
        ) {
            errors.push(`Invalid topP: ${config.topP} (must be 0-1)`)
        }
    }

    if (config.topK !== undefined) {
        if (
            !Number.isInteger(config.topK) ||
            config.topK < 0 ||
            config.topK > 100
        ) {
            errors.push(`Invalid topK: ${config.topK} (must be 0-100 integer)`)
        }
    }

    if (config.maxTokens !== undefined) {
        if (
            !Number.isInteger(config.maxTokens) ||
            config.maxTokens < 1 ||
            config.maxTokens > 65536
        ) {
            errors.push(
                `Invalid maxTokens: ${config.maxTokens} (must be 1-65536 integer)`
            )
        }
    }

    if (config.frequencyPenalty !== undefined) {
        if (
            typeof config.frequencyPenalty !== 'number' ||
            config.frequencyPenalty < -2 ||
            config.frequencyPenalty > 2
        ) {
            errors.push(
                `Invalid frequencyPenalty: ${config.frequencyPenalty} (must be -2 to 2)`
            )
        }
    }

    if (config.presencePenalty !== undefined) {
        if (
            typeof config.presencePenalty !== 'number' ||
            config.presencePenalty < -2 ||
            config.presencePenalty > 2
        ) {
            errors.push(
                `Invalid presencePenalty: ${config.presencePenalty} (must be -2 to 2)`
            )
        }
    }

    if (config.stopSequences !== undefined) {
        if (!Array.isArray(config.stopSequences)) {
            errors.push(`Invalid stopSequences: must be an array of strings`)
        } else if (
            !config.stopSequences.every((seq) => typeof seq === 'string')
        ) {
            errors.push(`Invalid stopSequences: all items must be strings`)
        } else if (config.stopSequences.length > 4) {
            errors.push(
                `Invalid stopSequences: maximum 4 stop sequences allowed`
            )
        }
    }

    if (config.prefix !== undefined && typeof config.prefix !== 'string') {
        errors.push(`Invalid prefix: ${config.prefix} (must be string)`)
    }

    if (
        config.includeEmojis !== undefined &&
        typeof config.includeEmojis !== 'boolean'
    ) {
        errors.push(
            `Invalid includeEmojis: ${config.includeEmojis} (must be boolean)`
        )
    }

    return {
        valid: errors.length === 0,
        errors
    }
}

/**
 * Merge user config with defaults, applying migrations
 */
export function mergeWithDefaults(userConfig: any): Config {
    const migratedConfig = migrateConfig(userConfig)
    const validation = validateConfig(migratedConfig)

    if (!validation.valid) {
        console.warn('Config validation warnings:', validation.errors)
    }

    return migratedConfig
}
