import {
    getDefaults,
    migrateConfig,
    validateConfig,
    mergeWithDefaults,
    Config
} from '../src/config'

describe('config management', () => {
    describe('getDefaults', () => {
        test('should return defaults for current version', () => {
            const defaults = getDefaults()

            expect(defaults.version).toBe('0.0.0')
            expect(defaults.provider).toBe(1)
            expect(defaults.temperature).toBe(0.7)
            expect(defaults.topP).toBe(0.9)
            expect(defaults.topK).toBe(40)
            expect(defaults.stopSequences).toEqual([])
            expect(defaults.maxTokens).toBe(65536)
            expect(defaults.frequencyPenalty).toBe(0)
            expect(defaults.presencePenalty).toBe(0)
            expect(defaults.prefix).toBe('')
            expect(defaults.includeEmojis).toBe(true)
        })
    })

    describe('migrateConfig', () => {
        test('should return v0.0.0 config as-is', () => {
            const config = {
                version: '0.0.0',
                provider: 2,
                temperature: 0.8
            }

            const migrated = migrateConfig(config)

            expect(migrated.version).toBe('0.0.0')
            expect(migrated.provider).toBe(2)
            expect(migrated.temperature).toBe(0.8)
        })

        test('should handle config without version', () => {
            const config = {
                provider: 0,
                temperature: 0.5
            }

            const migrated = migrateConfig(config)

            expect(migrated.version).toBe('0.0.0')
            expect(migrated.provider).toBe(0)
            expect(migrated.temperature).toBe(0.5)
        })

        test('should preserve all fields during migration', () => {
            const config = {
                version: '0.0.0',
                provider: 3,
                apiKey: 'test-key',
                temperature: 0.6,
                topP: 0.95,
                prefix: 'chore: ',
                includeEmojis: true
            }

            const migrated = migrateConfig(config)

            expect(migrated.provider).toBe(3)
            expect(migrated.apiKey).toBe('test-key')
            expect(migrated.temperature).toBe(0.6)
            expect(migrated.topP).toBe(0.95)
            expect(migrated.prefix).toBe('chore: ')
            expect(migrated.includeEmojis).toBe(true)
        })

        test('should add missing fields with defaults', () => {
            const config = {
                provider: 1
            }

            const migrated = migrateConfig(config)

            expect(migrated.version).toBe('0.0.0')
            expect(migrated.temperature).toBe(0.7)
            expect(migrated.topP).toBe(0.9)
            expect(migrated.includeEmojis).toBe(true)
        })
    })

    describe('validateConfig', () => {
        test('should validate correct config', () => {
            const config: Config = {
                version: '0.0.0',
                provider: 1,
                temperature: 0.7,
                topP: 0.9
            }

            const result = validateConfig(config)

            expect(result.valid).toBe(true)
            expect(result.errors).toHaveLength(0)
        })

        test('should reject invalid provider', () => {
            const config: Config = {
                version: '0.0.0',
                provider: 7 // invalid (max is 6)
            }

            const result = validateConfig(config)

            expect(result.valid).toBe(false)
            expect(
                result.errors.some((e) => e.includes('Invalid provider'))
            ).toBe(true)
        })

        test('should reject invalid temperature', () => {
            const config: Config = {
                version: '0.0.0',
                temperature: 3 // max is 2
            }

            const result = validateConfig(config)

            expect(result.valid).toBe(false)
            expect(
                result.errors.some((e) => e.includes('Invalid temperature'))
            ).toBe(true)
        })

        test('should reject invalid topP', () => {
            const config: Config = {
                version: '0.0.0',
                topP: 1.5 // max is 1
            }

            const result = validateConfig(config)

            expect(result.valid).toBe(false)
            expect(result.errors.some((e) => e.includes('Invalid topP'))).toBe(
                true
            )
        })

        test('should reject invalid topK', () => {
            const config: Config = {
                version: '0.0.0',
                topK: 150 // max is 100
            }

            const result = validateConfig(config)

            expect(result.valid).toBe(false)
            expect(result.errors.some((e) => e.includes('Invalid topK'))).toBe(
                true
            )
        })

        test('should reject invalid stopSequences type', () => {
            const config: Config = {
                version: '0.0.0',
                stopSequences: 'END' as any // eslint-disable-line @typescript-eslint/no-explicit-any
            }

            const result = validateConfig(config)

            expect(result.valid).toBe(false)
            expect(
                result.errors.some((e) => e.includes('Invalid stopSequences'))
            ).toBe(true)
        })

        test('should reject invalid maxTokens', () => {
            const config: Config = {
                version: '0.0.0',
                maxTokens: 70000 // max is 65536
            }

            const result = validateConfig(config)

            expect(result.valid).toBe(false)
            expect(
                result.errors.some((e) => e.includes('Invalid maxTokens'))
            ).toBe(true)
        })

        test('should reject invalid frequencyPenalty', () => {
            const config: Config = {
                version: '0.0.0',
                frequencyPenalty: 3 // max is 2
            }

            const result = validateConfig(config)

            expect(result.valid).toBe(false)
            expect(
                result.errors.some((e) =>
                    e.includes('Invalid frequencyPenalty')
                )
            ).toBe(true)
        })

        test('should reject invalid presencePenalty', () => {
            const config: Config = {
                version: '0.0.0',
                presencePenalty: -3 // min is -2
            }

            const result = validateConfig(config)

            expect(result.valid).toBe(false)
            expect(
                result.errors.some((e) => e.includes('Invalid presencePenalty'))
            ).toBe(true)
        })

        test('should reject non-string prefix', () => {
            const config: Config = {
                version: '0.0.0',
                prefix: 123 as any // eslint-disable-line @typescript-eslint/no-explicit-any
            }

            const result = validateConfig(config)

            expect(result.valid).toBe(false)
            expect(
                result.errors.some((e) => e.includes('Invalid prefix'))
            ).toBe(true)
        })

        test('should reject non-boolean includeEmojis', () => {
            const config: Config = {
                version: '0.0.0',
                includeEmojis: 'yes' as any // eslint-disable-line @typescript-eslint/no-explicit-any
            }

            const result = validateConfig(config)

            expect(result.valid).toBe(false)
            expect(
                result.errors.some((e) => e.includes('Invalid includeEmojis'))
            ).toBe(true)
        })

        test('should reject missing version', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const config: any = {
                provider: 1
            }

            const result = validateConfig(config)

            expect(result.valid).toBe(false)
            expect(
                result.errors.some((e) => e.includes('Missing version'))
            ).toBe(true)
        })
    })

    describe('mergeWithDefaults', () => {
        test('should merge user config with defaults', () => {
            const userConfig = {
                provider: 2
            }

            const merged = mergeWithDefaults(userConfig)

            expect(merged.version).toBe('0.0.0')
            expect(merged.provider).toBe(2)
            expect(merged.temperature).toBe(0.7) // from defaults
            expect(merged.topP).toBe(0.9) // from defaults
            expect(merged.prefix).toBe('') // from defaults
            expect(merged.includeEmojis).toBe(true) // from defaults
        })

        test('should override all defaults with user config', () => {
            const userConfig = {
                version: '0.0.0',
                provider: 0,
                temperature: 0.5,
                topP: 0.8,
                prefix: 'feat: ',
                includeEmojis: false
            }

            const merged = mergeWithDefaults(userConfig)

            expect(merged.version).toBe('0.0.0')
            expect(merged.provider).toBe(0)
            expect(merged.temperature).toBe(0.5)
            expect(merged.topP).toBe(0.8)
            expect(merged.prefix).toBe('feat: ')
            expect(merged.includeEmojis).toBe(false)
        })

        test('should handle empty user config', () => {
            const merged = mergeWithDefaults({})

            expect(merged.version).toBe('0.0.0')
            expect(merged.provider).toBe(1)
            expect(merged.temperature).toBe(0.7)
            expect(merged.topP).toBe(0.9)
            expect(merged.prefix).toBe('')
            expect(merged.includeEmojis).toBe(true)
        })
    })
})
