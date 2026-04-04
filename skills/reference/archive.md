# `archive`

Archive an issue.

Required arguments:

- `--id <uuid>`

Optional arguments:

- `--issue-dir <dir>`

Notes:

- Moves the issue into the archive subtree
- Sets the status to `closed`
- Archived issues no longer appear in default `list` and `search` output

Examples:

```bash
bun {skillPath}/scripts/index.ts archive --id <uuid>
```
