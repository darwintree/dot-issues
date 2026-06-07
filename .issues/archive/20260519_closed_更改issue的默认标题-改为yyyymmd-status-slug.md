---
# This section is managed by the CLI. Do not edit manually.
id: "a7077151-d5ce-4b90-a224-3bf59d1a03ec"
title: "更改issue的默认标题，改为yyyymmd_status_slug"
status: "closed"
priority: "medium"
labels: ["FEATURE REQUEST"]
created_at: "2026-05-19T09:42:00Z"
updated_at: "2026-06-07T01:24:00Z"
---
## Goal

Change the default issue title format to `yyyymmd_status_slug`.

## Notes

- Preserve existing issue metadata behavior in front matter.
- Update related reference documentation if the default title behavior changes.

## Resolution

- Changed generated issue filenames from `{status}_{title-slug}_{YYYYMMDDHHmm}.md` to `{YYYYMMDD}_{status}_{title-slug}.md`.
- Kept `title` as free-form front matter metadata; the filename format does not become a title parsing contract.
- Kept the date sourced from `created_at`.
- Kept collision behavior unchanged: if the generated filename already exists, the command fails.
- Did not migrate existing issue files; only new generated paths and paths touched by `modify-metadata` or `archive` use the new format.

## Verification

- `bun test` passes: 39 tests, 0 failures.
