# `new`

Create a new issue Markdown file.

Required arguments:

- `--title <text>`
- `--status <open|working|closed>`

Optional arguments:

- `--priority <low|medium|high>`
- `--labels <label>`, repeatable
- `--issue-dir <dir>`
- `--subdir <relative-dir>`
- `--blank-body`

Notes:

- By default, the command creates a body with the standard template
- `--blank-body` creates an empty body
- `--subdir` creates the issue under a nested directory inside `--issue-dir`

Examples:

```bash
bun {skillPath}/scripts/index.ts new --title "Fix login bug" --status open --priority high --labels auth --labels bug
bun {skillPath}/scripts/index.ts new --title "Scratch note" --status open --blank-body
bun {skillPath}/scripts/index.ts new --title "Fix auth flow" --status open --issue-dir custom-issues --subdir team/auth
```
