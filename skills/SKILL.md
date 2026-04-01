---
name: file-issues
description: Manage repo-local Markdown issues with a zero-dependency Bun CLI.
---

# file-issues

Use this skill to create, list, and update local issue files stored in `.issues/`.

## Skill Directory

1. Find `{skillPath}` first. It is the directory that contains this `SKILL.md`.
2. Run commands by passing the script path explicitly.

Example:

```bash
{skillPath} = /path/to/file-issues/skills
```

## Commands

Run these commands with the resolved `{skillPath}`:

```bash
bun {skillPath}/scripts/index.ts new --title "Fix login bug" --status open --priority high --labels auth --labels bug
bun {skillPath}/scripts/index.ts list --status open --priority high
bun {skillPath}/scripts/index.ts modify-metadata --id <uuid> --status closed --labels bug
bun {skillPath}/scripts/index.ts list --issue-dir custom-issues
bun {skillPath}/scripts/index.ts new --title "Fix login bug" --status open --issue-dir custom-issues --subdir team/auth
```

## Rules

- Front matter is CLI-managed and should not be edited manually.
- Markdown body can be edited directly.
- `id` is the system identifier; filenames are human-readable only.
- `--issue-dir` can be used to override the default issue base directory `.issues`.
- `list` and `modify-metadata` scan `--issue-dir` recursively.
- `new --subdir` creates the issue inside a nested folder under `--issue-dir`.
