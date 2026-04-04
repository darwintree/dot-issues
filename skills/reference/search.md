# `search`

Search issue titles and bodies by keyword.

Required arguments:

- `--query <text>`

Optional arguments:

- `--status <open|working|closed>`
- `--priority <low|medium|high>`
- `--labels <label>`, repeatable
- `--issue-dir <dir>`

Notes:

- Search is case-insensitive
- Searches both titles and bodies
- Archived issues are excluded by default
- Label filters are case-insensitive, but matching is done against normalized uppercase labels

Examples:

```bash
bun {skillPath}/scripts/index.ts search --query "login"
bun {skillPath}/scripts/index.ts search --query "auth" --status open --labels auth
```
