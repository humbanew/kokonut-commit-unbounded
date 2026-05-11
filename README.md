<div align="center">

![Kokonut Commit](./kokonut-readme-logo.svg)

[![GitHub Super-Linter](https://github.com/actions/typescript-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/actions/typescript-action/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

</div>

## Overview

Kokonut Commit is a small CLI for working with Git hooks and basic action setup
flows. The current command set focuses on four areas:

- Managing configuration with `config` and `cfg`
- Bootstrapping credentials with `setup`
- Listing available models with `models`
- Installing and removing commit hooks with `hook`

## Requirements

- Node.js 24 or newer
- Git installed and available on the `PATH`
- A repository initialized with Git when using repository-scoped hook commands

## Install

This package is published as a GitHub Action and also exposes a CLI binary named
`kokonut-commit`.

```bash
npm install -g kokonut-commit-action
```

If you are using it inside this repository, you can also run the bundled CLI
directly from the project workspace.

## Quick Start

Show the top-level usage help:

```bash
kokonut-commit
```

Set local configuration:

```bash
kokonut-commit config set provider openai
kokonut-commit config set apiKey sk-your-key
```

Install the default hook in the current repository:

```bash
kokonut-commit hook set
```

## Command Reference

### `config`

Store and read values from `.kokonutrc` files.

```bash
kokonut-commit config set <key> <value>
kokonut-commit config set <key> <value> --global
kokonut-commit config get <key>
kokonut-commit config list
```

Examples:

```bash
kokonut-commit config set provider openai
kokonut-commit config set apiUrl https://api.example.com/v1 --global
kokonut-commit config get provider
kokonut-commit config list
```

`cfg` is accepted as a shorthand alias for `config`.

```bash
kokonut-commit cfg set provider ollama
kokonut-commit cfg list
```

### `setup`

Save the provider and API credentials in the local `.kokonutrc` file.

```bash
kokonut-commit setup --provider <provider> --api-key <key> [--api-url <url>]
```

Examples:

```bash
kokonut-commit setup --provider openai --api-key sk-your-key
kokonut-commit setup --provider ollama --api-key local-token --api-url http://localhost:11434/api/models
```

Interactive behavior:

- Running `kokonut-commit setup` without flags launches an interactive wizard.
- The wizard asks whether to save credentials globally; answer `y` to store them
  in `~/.kokonutrc`.
- You can also pass `--global` with the non-interactive form to save directly to
  the global config.

### `models`

List models for the configured provider.

```bash
kokonut-commit models
```

Examples of supported configuration sources:

```bash
kokonut-commit config set provider openai
kokonut-commit config set apiKey sk-your-key
kokonut-commit models
```

```bash
KOKONUT_PROVIDER=ollama KOKONUT_API_URL=http://localhost:11434/api/models kokonut-commit models
```

If no API key or custom API URL is configured, the CLI prints a setup hint and
exits successfully.

When run interactively (`stdout` attached to a TTY), `kokonut-commit models`
will prompt to enter and save an API key if none is configured.

### `hook`

Manage the `prepare-commit-msg` hook.

```bash
kokonut-commit hook set
kokonut-commit hook unset
```

Default repository hook examples:

```bash
kokonut-commit hook set
kokonut-commit hook unset
```

Custom hook directory examples:

```bash
kokonut-commit hook set --usr .git/custom-hooks
kokonut-commit hook unset --usr .git/custom-hooks
```

Absolute custom hook directory examples:

```bash
kokonut-commit hook set --usr C:\\Users\\you\\kokonut-commit-hooks
kokonut-commit hook unset --usr C:\\Users\\you\\kokonut-commit-hooks
```

Global hook examples:

```bash
kokonut-commit hook set --global
kokonut-commit hook unset --global
```

Behavior notes:

- `--usr` resolves relative paths from the current working directory.
- `--global` stores the hook under your home directory and updates the Git
  global hooks path when possible.
- `hook set` and `hook unset` are repository-scoped unless `--global` or `--usr`
  is provided.
- By default `hook set` will try to create a symlink to the packaged CLI
  (`dist/cli.js`) inside `.git/hooks/prepare-commit-msg`. On systems where
  symlink creation is not permitted it falls back to writing a small stub that
  invokes `scripts/prepare-commit-msg.cjs`.

## Configuration Files

Kokonut Commit reads configuration from these locations:

- Local: `.kokonutrc` in the current repository
- Global: `~/.kokonutrc`

Local values override global values when both exist.

## Common Flows

Set up a repository with OpenAI credentials and install the local hook:

```bash
kokonut-commit setup --provider openai --api-key sk-your-key
kokonut-commit hook set
```

Use a shared hook directory in the repository:

```bash
kokonut-commit hook set --usr .git/shared-hooks
git config --local core.hooksPath .git/shared-hooks
```

Install the hook globally for your user profile:

```bash
kokonut-commit hook set --global
```

Inspect the current configuration:

```bash
kokonut-commit config list
```

## Supported AI Providers

Kokonut Commit supports the following AI providers for commit message
generation:

| Index | Provider         | API Endpoint                        | API Token Environment |
| ----- | ---------------- | ----------------------------------- | --------------------- |
| 0     | Google Gemini    | `generativelanguage.googleapis.com` | `KOKONUT_API_KEY`     |
| 1     | OpenAI           | `api.openai.com`                    | `KOKONUT_API_KEY`     |
| 2     | Anthropic Claude | `api.anthropic.com`                 | `KOKONUT_API_KEY`     |
| 3     | Mistral Le Chat  | `api.mistral.ai`                    | `KOKONUT_API_KEY`     |
| 4     | Deepseek         | `api.deepseek.com`                  | `KOKONUT_API_KEY`     |
| 5     | Grok             | `api.x.ai`                          | `KOKONUT_API_KEY`     |
| 6     | Hugging Face     | `api-inference.huggingface.co`      | `KOKONUT_API_KEY`     |

### Configuration

Configure the provider and API key:

```bash
# Using CLI
kokonut-commit config set provider 1  # OpenAI
kokonut-commit config set apiKey sk-your-api-key

# Using environment variables
export KOKONUT_PROVIDER=1
export KOKONUT_API_KEY=sk-your-api-key
```

### Supported Models

Each provider offers different models. The CLI automatically selects a
reasonable default:

- **Google Gemini**: `gemini-pro`
- **OpenAI**: `gpt-3.5-turbo` or `gpt-4`
- **Anthropic Claude**: `claude-2` or `claude-3`
- **Mistral**: `mistral-tiny`
- **Deepseek**: `deepseek-chat`
- **Grok**: `grok-beta`
- **Hugging Face**: `mistralai/Mistral-7B-Instruct-v0.2`

## Configuration Management

### Default Values

Kokonut Commit includes sensible defaults for maximum AI customization:

```json
{
    "version": "0.0.0",
    "provider": 1,
    "temperature": 0.7,
    "topP": 0.9,
    "topK": 40,
    "maxTokens": 65536,
    "frequencyPenalty": 0,
    "presencePenalty": 0,
    "stopSequences": [],
    "prefix": "",
    "includeEmojis": true
}
```

### Configuration Versioning

The config system uses semantic versioning aligned with project releases.
Currently, all configurations use **v0.0.0**.

**Current Version (v0.0.0) Defaults:**

All parameters include full AI model customization for all 7 providers:

```json
{
    "version": "0.0.0",
    "provider": 1,
    "temperature": 0.7,
    "topP": 0.9,
    "topK": 40,
    "convergence": 0.5,
    "maxTokens": 256,
    "frequencyPenalty": 0,
    "presencePenalty": 0,
    "prefix": "",
    "includeEmojis": true
}
```

**Key Points:**

- Your configuration is automatically validated when loaded
- Missing values are filled with sensible defaults
- Invalid configurations trigger validation warnings
- All 7 AI providers support the complete parameter set
- Future versions will support automatic migrations if needed

### Validation

Configuration values are validated for all parameters:

**Sampling Parameters:**

- `provider`: Integer 0-6 (selects AI provider)
- `temperature`: Float 0-2 (controls response randomness/creativity)
- `topP`: Float 0-1 (nucleus sampling - probability threshold)
- `topK`: Integer 0-100 (top-k sampling - number of candidates)
- `convergence`: Float 0-1 (convergence threshold for response stopping)

**Token & Penalty Parameters:**

- `maxTokens`: Integer 1-4096 (maximum response length in tokens)
- `frequencyPenalty`: Float -2 to 2 (penalizes repeated tokens)
- `presencePenalty`: Float -2 to 2 (penalizes new topics)

**Formatting Parameters:**

- `prefix`: String (added to all commit messages)
- `includeEmojis`: Boolean (add commit type emoji)

**Examples of setting advanced parameters:**

```bash
# Via CLI config set
kokonut-commit config set temperature 0.5
kokonut-commit config set topK 50
kokonut-commit config set maxTokens 512
kokonut-commit config set frequencyPenalty 0.5

# Via setup with flags
kokonut-commit setup --provider 2 --api-key sk-key \
  --temperature 0.6 --top-k 40 --max-tokens 256
```

## Notes

- Run hook commands from the repository root when you want the default local
  behavior.
- The CLI prints clear usage help when a required argument is missing.
- The `dist/` folder is generated from `src/` and should stay in sync with the
  TypeScript source.
- All 7 AI providers support the complete configuration parameter set for
  maximum customization.
- Configuration parameters are provider-agnostic - use the same config for any
  provider.
