---
name: dot-issues
description: Create, list, and update repo-local Markdown issue files with the bundled Bun CLI. Issues that live in your repo — plain Markdown, built for agents. Use for lightweight issue tracking without GitHub or Jira, including creating local issue notes, listing or filtering Markdown issues, updating issue metadata, or working with a custom `--issue-dir` and nested issue subdirectories.
---

# dot-issues

Resolve `{skillPath}` as the directory that contains this `SKILL.md`.

Run commands by passing the script path explicitly. Do not rely on changing directories.

```bash
bun {skillPath}/scripts/index.ts new --title "Fix login bug" --status open --priority high --labels auth --labels bug
bun {skillPath}/scripts/index.ts new --title "Scratch note" --status open --blank-body
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
- Use `new --blank-body` when a new issue should start with an empty Markdown body instead of the default template.
- Use `touch --id <uuid>` to refresh `updated_at` after manual body edits without changing other metadata.
- Use `show --id <uuid>` when you need the full issue body and stable metadata by identifier.
- Use `search --query "text"` to search issue titles and bodies.
- Use `archive --id <uuid>` to move completed issues under the archive subtree; archived issues are excluded from default `list` and `search`.
- Treat `id` as the stable identifier. Filenames are for readability only.
- Use `--issue-dir` to override the default base directory `.issues`.
- Expect `list` and `modify-metadata` to scan `--issue-dir` recursively.
- Expect `show` to find archived issues too.
- Use `new --subdir` to create an issue in a nested folder under `--issue-dir`.
