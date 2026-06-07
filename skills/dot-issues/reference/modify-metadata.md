# `modify-metadata`

Update issue front matter metadata.

Required arguments:

- `--id <uuid>`

Optional arguments:

- `--title <text>`
- `--status <open|working|closed>`
- `--priority <low|medium|high>`
- `--labels <label>`, repeatable
- `--issue-dir <dir>`
- `--allow-new-label`

Notes:

- Changes metadata and preserves the issue body
- If `title` or `status` changes the generated filename, the file is renamed to match
- Generated filenames use `{YYYYMMDD}_{status}_{title-slug}.md` and keep the original `created_at` date
- When the file is renamed, Markdown and Obsidian links to the old issue path are updated across the current issue base dir, including archived issues
- Links inside the renamed issue that point to other known issue files are rebased relative to the issue's new location
- Markdown inline link titles are preserved while paths are rewritten
- Reference updates only scan Markdown bodies, not front matter
- Passive reference updates do not refresh other issues' `updated_at`
- Use `touch` when you only want to refresh `updated_at`
- All labels are normalized to uppercase before storage
- By default, every label must already exist in `{issueBaseDir}/labels.json`
- `--allow-new-label` adds missing labels to the registry automatically
- JSON output includes `data.references.filesChanged` and `data.references.referencesChanged`

Examples:

```bash
bun {skillPath}/scripts/index.ts modify-metadata --id <uuid> --status closed --priority low
bun {skillPath}/scripts/index.ts modify-metadata --id <uuid> --title "Refine login bug" --labels AUTH --labels CONFIRMED
bun {skillPath}/scripts/index.ts modify-metadata --id <uuid> --labels TRIAGE --allow-new-label
```
