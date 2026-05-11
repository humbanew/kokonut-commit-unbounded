# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.0] - 2026-05-10

### Added

- **New AI Providers**: Added support for 7 AI providers:
    - Google Gemini (`provider: 0`)
    - OpenAI (`provider: 1`)
    - Anthropic Claude (`provider: 2`)
    - Mistral Le Chat (`provider: 3`)
    - Deepseek (`provider: 4`) - High-performance Chinese LLM
    - Grok (`provider: 5`) - X.AI's conversational AI
    - Hugging Face (`provider: 6`) - Open-source model hosting platform
- **Comprehensive AI Customization**: Full parameter set for all 7 providers
    - Sampling parameters: `temperature`, `topP`, `topK`, `convergence`
    - Token management: `maxTokens` for response length control
    - Penalty parameters: `frequencyPenalty`, `presencePenalty`
    - All parameters validated and provider-agnostic
    - CLI support for all parameters via `--flag` arguments
- **Configuration System**: Version-aware config management with validation
    - Config versioning: v0.0.0 unified version
    - Automatic migration framework for future versions
    - Default values for all 11 configuration parameters
    - Config validation with detailed error messages
- **E2E Testing**: End-to-end CLI and hook integration tests
    - 6 E2E tests covering CLI setup, hook installation, and config management
    - Test coverage for all major CLI commands
- **Conventional Commits Validation**: Integrated commitlint validator
    - Support for 11 commit types (feat, fix, docs, style, refactor, perf, test,
      chore, ci, revert, build)
    - Validates header length (≤100 chars), scope case, subject format
    - Provides detailed validation errors and warnings
    - 100% test coverage
- **Provider Adapters**: Timeout handling, emoji support, error checking for all
  providers
- **Unit Tests**: Comprehensive test coverage for all modules
    - 10 test suites with 70+ tests
    - Provider validation tests
    - Config management tests (including new parameter validation)
    - Commitlint integration tests

### Changed

- **CLI Output**: Now as CommonJS (`.cjs`) for better ESM/CommonJS compatibility
- **CLI Help**: Extended with all new configuration parameters and examples
- **Config Defaults** (all 11 parameters):
    - `provider`: 1 (OpenAI)
    - `temperature`: 0.7 (controls randomness)
    - `topP`: 0.9 (nucleus sampling)
    - `topK`: 40 (top-k sampling candidates)
    - `convergence`: 0.5 (stopping threshold)
    - `maxTokens`: 256 (response length)
    - `frequencyPenalty`: 0 (no penalty for repetition)
    - `presencePenalty`: 0 (no penalty for new topics)
    - `prefix`: '' (empty)
    - `includeEmojis`: true

### Technical Details

- TypeScript sources compiled to JavaScript
- ESM module system with CommonJS script compatibility
- All providers use standard fetch API with 15s timeout
- Git hook management with symlink support and fallback stubs
- Validation ranges: topK (0-100), convergence (0-1), maxTokens (1-4096),
  penalties (-2 to 2)

### Testing

- Total test suites: 10 (was 9)
- Total tests: 70 (was 65)
- New test cases added for parameter validation:
    - `topK` validation tests
    - `convergence` validation tests
    - `maxTokens` validation tests
    - `frequencyPenalty` validation tests
    - `presencePenalty` validation tests
- Test coverage by module:
    - config.ts: 93.75% statements, 95.94% branches, 100% functions
    - commitlint-validator.ts: 100% coverage
    - wait.ts: 100% coverage
    - providers.ts: 87.09% statements, 65% branches, 90.9% functions
    - main.ts: 49.23% statements

### Documentation

- Updated provider list documentation with all 7 providers
- Added comprehensive AI customization parameter guide
- Added config migration framework
- Added examples for setting advanced parameters via CLI
- Updated default values reference with all 11 parameters

### Initial Escope

- Initial provider adapters (Google Gemini, OpenAI, Anthropic Claude, Mistral)
- Unit tests for provider implementations
- Commitlint integration with Conventional Commits support
