# `touch`

Refresh only the issue `updated_at` timestamp.

Required arguments:

- `--id <uuid>`

Optional arguments:

- `--issue-dir <dir>`

Notes:

- Use this after manually editing the issue body
- Does not modify any other metadata

Examples:

```bash
bun {skillPath}/scripts/index.ts touch --id <uuid>
```
