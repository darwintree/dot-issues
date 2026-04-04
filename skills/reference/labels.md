# `labels`

Manage the label registry stored at `{issueBaseDir}/labels.json`.

Commands:

- `labels`
- `labels sync`
- `labels remove --label <label> [--force]`
- `labels rename --from <label> --to <label> [--force]`

Optional arguments:

- `--issue-dir <dir>`

Notes:

- The registry file is created automatically when a write operation needs it
- Labels are normalized with `trim` + uppercase before validation, storage, and output
- `labels` prints one registry label per line in sorted order
- `labels sync` scans all issues, normalizes issue labels to uppercase, and writes the deduplicated registry
- `labels remove` fails if the label is still referenced unless `--force` is provided
- `labels rename` fails if the target exists unless `--force` is provided; with `--force`, the operation merges into the target label

Examples:

```bash
bun {skillPath}/scripts/index.ts labels
bun {skillPath}/scripts/index.ts labels sync
bun {skillPath}/scripts/index.ts labels remove --label bug
bun {skillPath}/scripts/index.ts labels remove --label bug --force
bun {skillPath}/scripts/index.ts labels rename --from bug --to defect
bun {skillPath}/scripts/index.ts labels rename --from bug --to ops --force
```
