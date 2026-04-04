# Command Reference

This directory contains the command reference for the `dot-issues` skill.

Conventions:

- `{skillPath}` is the directory that contains `SKILL.md`
- Run commands with `bun {skillPath}/scripts/index.ts ...`
- The default issue base dir is `.issues`
- Use `--issue-dir <dir>` to override the default base dir
- `id` is the stable issue identifier; filenames are only for readability

## Commands

- [new](./new.md)
- [list](./list.md)
- [search](./search.md)
- [show](./show.md)
- [modify-metadata](./modify-metadata.md)
- [touch](./touch.md)
- [archive](./archive.md)

## Usage Notes

- Before creating a new issue, use `list` or `search` to avoid duplicates
- Before updating an issue, use `show --id <uuid>` to read the full content
- If only the body changed, do not edit front matter manually; update `updated_at` with `touch`
- Use `modify-metadata` for metadata changes
