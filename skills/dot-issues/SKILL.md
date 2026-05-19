---
name: dot-issues
description: Use for managing repo-local Markdown issues with the bundled Bun CLI, including create, list, search, show, update metadata, touch, and archive.
---

# dot-issues

Resolve `{skillPath}` as the directory that contains this `SKILL.md`.

Detailed command syntax and flag behavior live in `reference/`.
Start with `reference/index.md`, then open the command-specific file when you need exact arguments or examples.

Run commands by passing the script path explicitly. Do not rely on changing directories.

```bash
bun {skillPath}/scripts/index.ts new --title "Fix login bug" --status open --priority high --labels auth --labels bug
bun {skillPath}/scripts/index.ts new --title "Scratch note" --status open --content "Initial note."
bun {skillPath}/scripts/index.ts list --status open --priority high --labels auth
bun {skillPath}/scripts/index.ts search --query "login"
bun {skillPath}/scripts/index.ts show --id <uuid>
bun {skillPath}/scripts/index.ts modify-metadata --id <uuid> --status closed --labels bug
bun {skillPath}/scripts/index.ts touch --id <uuid>
bun {skillPath}/scripts/index.ts archive --id <uuid>
bun {skillPath}/scripts/index.ts list --issue-dir custom-issues
bun {skillPath}/scripts/index.ts new --title "Fix login bug" --status open --issue-dir custom-issues --subdir team/auth
```

Follow these rules:

- Let the CLI manage front matter. Update metadata with commands instead of editing YAML manually.
- Edit the Markdown body directly when only issue content changes. The default body template is only a starting point and can be reshaped freely.
- Use `new --content "..."` when a new issue should start with a specific Markdown body instead of the default template.
- Use `touch --id <uuid>` to refresh `updated_at` after manual body edits without changing other metadata.
- Use `show --id <uuid>` when you need the full issue body and stable metadata by identifier.
- Use `search --query "text"` to search issue titles and bodies.
- Use `archive --id <uuid>` to move completed issues under the archive subtree; archived issues are excluded from default `list` and `search`.
- Treat `id` as the stable identifier. Filenames are for readability only.
- Use `--issue-dir` to override the default base directory `.issues`.
- Expect `list` and `modify-metadata` to scan `--issue-dir` recursively.
- Expect `show` to find archived issues too.
- Use `new --subdir` to create an issue in a nested folder under `--issue-dir`.

## Common Patterns

### 1. Create an issue

- Before creating a new issue, usually check `list` or `search --query "text"` first to avoid duplicates.
- Once the work is confirmed to be distinct, use `new` to create the issue. Prefer setting `priority` and `labels` at creation time.
- If the issue should live under a specific folder, combine `--issue-dir` with `--subdir`.

### 2. Find an issue

Choose one command or a combination based on the situation.

- Use `list` to browse the current active queue.
- Use `list --status ...`, `list --priority ...`, or `list --labels ...` for structured filtering when you already know the criteria.
- Use `search --query "text"` for title-and-body keyword search when you only remember fragments or rough terms.
- Use `show --id <uuid>` when you already know the stable identifier and want the full issue, including archived ones.

### 3. Resolve an issue

- First locate the target issue using the command that best fits the situation, then read the current issue body and metadata before making changes.
- Solve the underlying problem, then update the issue body directly in Markdown with the resolution details, progress notes, and any completed checkboxes.
- If the issue is fully resolved and should leave the active queue, use `archive --id <uuid>`.
- If the issue still needs follow-up after updating the body, use `touch --id <uuid>` to refresh `updated_at`.

### 4. Label management

- Before creating a new issue, run `labels sync`, then read the current available labels from the registry.
- Prefer existing labels whenever they express the issue clearly enough.
- If the current label set is not expressive enough, add a new label during issue creation with `--allow-new-label`.
- Prefer these default labels when they fit: `TECH DEBT`, `BUG`, and `FEATURE REQUEST`.
