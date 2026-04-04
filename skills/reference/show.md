# `show`

Show a single issue by `id`.

Required arguments:

- `--id <uuid>`

Optional arguments:

- `--issue-dir <dir>`

Notes:

- Can read archived issues
- Useful when you need the full body and metadata before making changes

Examples:

```bash
bun {skillPath}/scripts/index.ts show --id <uuid>
```
