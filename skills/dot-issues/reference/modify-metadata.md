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

- Changes metadata only and does not modify the body
- If `status` changes, the file is renamed to match
- Use `touch` when you only want to refresh `updated_at`
- All labels are normalized to uppercase before storage
- By default, every label must already exist in `{issueBaseDir}/labels.json`
- `--allow-new-label` adds missing labels to the registry automatically

Examples:

```bash
bun {skillPath}/scripts/index.ts modify-metadata --id <uuid> --status closed --priority low
bun {skillPath}/scripts/index.ts modify-metadata --id <uuid> --title "Refine login bug" --labels AUTH --labels CONFIRMED
bun {skillPath}/scripts/index.ts modify-metadata --id <uuid> --labels TRIAGE --allow-new-label
```
