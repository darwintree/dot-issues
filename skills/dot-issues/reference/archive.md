# `archive`

Archive an issue.

Required arguments:

- `--id <uuid>`

Optional arguments:

- `--issue-dir <dir>`

Notes:

- Moves the issue into the archive subtree
- Sets the status to `closed`
- Generates the archived filename as `{YYYYMMDD}_closed_{title-slug}.md` using the original `created_at` date
- Updates Markdown and Obsidian links to the old issue path across the current issue base dir, including archived issues
- Links inside the archived issue that point to other known issue files are rebased relative to the archived issue's new location
- Markdown inline link titles are preserved while paths are rewritten
- Reference updates only scan Markdown bodies, not front matter
- Passive reference updates do not refresh other issues' `updated_at`
- JSON output includes `data.references.filesChanged` and `data.references.referencesChanged`
- Archived issues no longer appear in default `list` and `search` output

Examples:

```bash
bun {skillPath}/scripts/index.ts archive --id <uuid>
```
