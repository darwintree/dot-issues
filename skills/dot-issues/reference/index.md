# Command Reference

This directory contains the command reference for the `dot-issues` skill.

Conventions:

- `{skillPath}` is the directory that contains `SKILL.md`
- Run commands with `bun {skillPath}/scripts/index.ts ...`
- The default issue base dir is `.issues`
- Use `--issue-dir <dir>` to override the default base dir
- `id` is the stable issue identifier; filenames are only for readability
- Generated issue filenames use `{YYYYMMDD}_{status}_{title-slug}.md`

## Commands

- [new](./new.md)
- [list](./list.md)
- [search](./search.md)
- [show](./show.md)
- [modify-metadata](./modify-metadata.md)
- [touch](./touch.md)
- [archive](./archive.md)
- [rename-references](./rename-references.md)
- [labels](./labels.md)

## Usage Notes

- Before creating a new issue, use `list` or `search` to avoid duplicates
- Before updating an issue, use `show --id <uuid>` to read the full content
- If only the body changed, do not edit front matter manually; update `updated_at` with `touch`
- Use `modify-metadata` for metadata changes
- Use `rename-references` to manually repair issue links after a file move or failed reference update
- Label input is case-insensitive, but all persisted and displayed labels are uppercase
- `new` and `modify-metadata` require labels to exist in the registry unless `--allow-new-label` is used
- Generated filename slugs preserve Unicode letters and numbers where possible, including CJK characters
