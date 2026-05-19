---
# This section is managed by the CLI. Do not edit manually.
id: "86acecae-e94d-49f7-9fef-a48988ac45ae"
title: "为issue添加description元数据，用于在list时展示"
status: "open"
priority: "medium"
labels: ["FEATURE REQUEST"]
created_at: "2026-05-19T09:44:00Z"
updated_at: "2026-05-19T09:44:00Z"
---
## Goal

Add a `description` metadata field to issues and display it in `list` output.

## Notes

- Store `description` in issue front matter.
- Keep the Markdown body editable as before.
- Update list rendering to show the description when present.
- Update reference documentation for metadata, create/modify behavior, and list output.