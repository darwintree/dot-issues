# `new`

Create a new issue Markdown file.

Required arguments:

- `--title <text>`
- `--status <open|working|closed>`

Optional arguments:

- `--priority <low|medium|high>`
- `--labels <label>`, repeatable
- `--content <markdown>`
- `--issue-dir <dir>`
- `--subdir <relative-dir>`
- `--allow-new-label`

Notes:

- By default, the command creates a body with the standard template
- `--content` sets the initial body exactly as provided
- The generated filename uses `{YYYYMMDD}_{status}_{title-slug}.md`
- `--subdir` creates the issue under a nested directory inside `--issue-dir`
- All labels are normalized to uppercase before storage
- By default, every label must already exist in `{issueBaseDir}/labels.json`
- `--allow-new-label` adds missing labels to the registry automatically

Examples:

```bash
bun {skillPath}/scripts/index.ts new --title "Fix login bug" --status open --priority high --labels AUTH --labels BUG
bun {skillPath}/scripts/index.ts new --title "Scratch note" --status open --content "Initial note."
bun {skillPath}/scripts/index.ts new --title "Fix auth flow" --status open --issue-dir custom-issues --subdir team/auth
bun {skillPath}/scripts/index.ts new --title "New label" --status open --labels TRIAGE --allow-new-label
```
