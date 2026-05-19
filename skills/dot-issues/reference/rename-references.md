# `rename-references`

Rewrite issue-to-issue Markdown references without moving files or changing front matter.

Required arguments:

- `--from <relative-path>`
- `--to <relative-path>`

Optional arguments:

- `--issue-dir <dir>`
- `--dry-run`

Notes:

- `--from` and `--to` are relative to the issue base dir
- Paths may be passed with or without `.md`; internally they are normalized to `.md`
- Absolute paths, paths that escape the issue base dir, and non-Markdown targets are rejected
- The command scans only Markdown issue files inside the current issue base dir, including `archive/`
- Only Markdown bodies are updated; front matter is not scanned or rewritten
- Standard Markdown inline links and Obsidian wikilinks are supported
- Markdown inline link titles are preserved while the path portion is rewritten
- External URLs, anchors, absolute paths, non-Markdown links, and reference-style links are not rewritten
- `--from` and `--to` do not need to exist on disk, which makes the command useful for manual repair after a failed move
- `--dry-run` reports the planned changes without writing files

Output:

- JSON output includes normalized `from` and `to` paths
- `filesChanged` is the number of files whose bodies would change
- `referencesChanged` is the number of rewritten link targets
- `changes` lists each changed file and its per-file reference count

Examples:

```bash
bun {skillPath}/scripts/index.ts rename-references --from team/open_a_202604011000 --to archive/team/closed_a_202604011000
bun {skillPath}/scripts/index.ts rename-references --from team/open_a_202604011000.md --to archive/team/closed_a_202604011000.md --dry-run
```
