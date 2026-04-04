# `list`

List active, non-archived issues.

Optional arguments:

- `--status <open|working|closed>`
- `--priority <low|medium|high>`
- `--labels <label>`, repeatable
- `--issue-dir <dir>`

Notes:

- Recursively scans `--issue-dir`
- `--labels a --labels b` uses match-any semantics
- Archived issues are excluded by default

Examples:

```bash
bun {skillPath}/scripts/index.ts list
bun {skillPath}/scripts/index.ts list --status open
bun {skillPath}/scripts/index.ts list --priority high --labels auth --labels bug
```
