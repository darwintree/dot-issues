# dot-issues

**Issues that live in your repo — plain Markdown, built for agents.**

> 📖 **Language:** [English](./README.md) | [中文](./README-CN.md)

A zero-dependency Bun CLI that maintains local issue lists as Markdown files within your repository.

## Features

- **No external dependencies** – Issues live in your repo, not on external platforms
- **Plain Markdown** – Metadata stored only in front matter, body fully editable
- **Agent-native** – Designed for AI integration and automation
- **Transparent** – Full source code auditable before execution
- **Flexible structure** – Support for custom directories and nested issue organization

## Project Structure

- `src/` – local development entrypoint
- `skills/dot-issues/scripts/` – canonical CLI source code for skill distribution
- `.issues/` – Default issue Markdown directory
- `tests/` – Critical path tests

## Install as a Skill

```bash
npx skills add https://github.com/darwintree/dot-issues --skill dot-issues
```

## Quick Start

Resolve `{skillPath}` as the directory containing `SKILL.md`:

```bash
{skillPath} = /path/to/dot-issues/skills/dot-issues
bun {skillPath}/scripts/index.ts new --title "Fix login bug" --status open --priority high --labels auth --labels bug
bun {skillPath}/scripts/index.ts new --title "Scratch note" --status open --content "Initial note."
bun {skillPath}/scripts/index.ts list --status open
bun {skillPath}/scripts/index.ts list --labels auth --labels bug
bun {skillPath}/scripts/index.ts search --query "login"
bun {skillPath}/scripts/index.ts show --id <uuid>
bun {skillPath}/scripts/index.ts modify-metadata --id <uuid> --status closed --priority low
bun {skillPath}/scripts/index.ts touch --id <uuid>
bun {skillPath}/scripts/index.ts archive --id <uuid>
bun {skillPath}/scripts/index.ts list --issue-dir custom-issues
bun {skillPath}/scripts/index.ts new --title "Fix bug" --status open --issue-dir custom-issues --subdir team/auth
```

## Local Development

Inside this repository, `src/` is a development alias to the skill source:

```bash
bun src/index.ts new --title "Fix login bug" --status open
bun src/index.ts list
```

## Issue File Format

```markdown
---
# This section is managed by the CLI. Do not edit manually.
id: "550e8400-e29b-41d4-a716-446655440000"
title: "Fix login bug"
status: "open"
priority: "high"
labels: ["auth", "bug"]
created_at: "2026-04-01T14:30:00Z"
updated_at: "2026-04-01T14:30:00Z"
---

The body can be freely edited.
```

### Default Template

When creating a new issue, the body defaults to a template with sections for `Problem`, `Issue Assessment`, `Verification Checklist`, and `Progress Log`. The format can be customized as needed.

Set a custom initial body with `--content`:

```bash
bun {skillPath}/scripts/index.ts new --title "Note" --status open --content "Initial note."
```

### Updating `updated_at` Only

After manually editing the issue body, refresh the `updated_at` timestamp without changing metadata:

```bash
bun {skillPath}/scripts/index.ts touch --id <uuid>
```

### Filename Slugs

- filenames are generated from `status + title slug + created_at`
- the slug keeps Unicode letters and numbers where possible, including CJK characters
- filenames remain human-readable only; `id` is still the stable issue identifier

### Searching and Archiving

- `search --query "text"` searches both title and body, case-insensitively
- `list --labels a --labels b` matches issues containing any of the provided labels
- `archive --id <uuid>` moves the issue under `.issues/archive/` and marks it `closed`
- archived issues are excluded from default `list` and `search`, but `show --id <uuid>` still returns them

## Running Tests

```bash
bun test
```

## Architecture

- **Zero dependencies** – Uses only Node.js/Bun built-ins
- **File-centric** – One issue = one Markdown file
- **Metadata isolation** – CLI manages YAML front matter, users edit body
- **Transparent** – All source code <600 lines, fully auditable
- **Skill-native** – Compatible with skill distribution

## Documentation

- [Chinese README](./README-CN.md) – 中文说明
- [Architecture Design](./docs/plans/2026-04-01-project-structure-architecture-design.md) – Full technical specification
