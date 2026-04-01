# file-issues

一个零依赖的 Bun CLI，用 Markdown 文件在仓库内维护本地 issue 列表。

## 特点

- 不依赖 GitHub Issues
- metadata 只存放在 front matter 中
- issue 正文允许手动编辑，默认会生成一个可自行调整的模板
- 运行前可直接审计全部源码

## 目录

- `skills/scripts/`：CLI 源码
- `.issues/`：issue Markdown 文件目录
- `tests/`：关键路径测试

## 使用方式

仓库开发态可以直接从仓库根目录运行：

```bash
bun skills/scripts/index.ts new --title "Fix login bug" --status open --priority high --labels auth --labels bug
bun skills/scripts/index.ts new --title "Scratch note" --status open --blank-body
bun skills/scripts/index.ts list --status open
bun skills/scripts/index.ts modify-metadata --id <uuid> --status closed --priority low
bun skills/scripts/index.ts touch --id <uuid>
```

如需指定 issue 基础目录，可以传 `--issue-dir`，默认值是 `.issues`：

```bash
bun skills/scripts/index.ts new --title "Fix login bug" --status open --issue-dir custom-issues
bun skills/scripts/index.ts list --issue-dir custom-issues
bun skills/scripts/index.ts modify-metadata --id <uuid> --status closed --issue-dir custom-issues
bun skills/scripts/index.ts touch --id <uuid> --issue-dir custom-issues
```

`list` 和 `modify-metadata` 会递归扫描 `--issue-dir` 下的所有子目录。`new` 如需写入某个子目录，可额外传 `--subdir`：

```bash
bun skills/scripts/index.ts new --title "Fix login bug" --status open --issue-dir custom-issues --subdir team/auth
```

作为 skill 分发或单独使用时，先确定 `{skillPath}`。它就是包含 `SKILL.md` 的目录，然后显式传入脚本路径：

```bash
{skillPath} = /path/to/file-issues/skills
bun {skillPath}/scripts/index.ts new --title "Fix login bug" --status open --priority high --labels auth --labels bug
bun {skillPath}/scripts/index.ts list --status open
bun {skillPath}/scripts/index.ts modify-metadata --id <uuid> --status closed --priority low
bun {skillPath}/scripts/index.ts touch --id <uuid>
bun {skillPath}/scripts/index.ts list --issue-dir custom-issues
bun {skillPath}/scripts/index.ts new --title "Fix login bug" --status open --issue-dir custom-issues --subdir team/auth
```

## issue 文件格式

```markdown
---
# This section is managed by the CLI. Do not edit manually.
id: "550e8400-e29b-41d4-a716-446655440000"
title: "Fix login bug"
status: "open"
priority: "high"
labels: ["auth", "bug"]
created_at: "2026-04-01T14:30:00Z"
updated_at: "2026-04-01T14:30:00Z"
---

正文可手动编辑。
```

新建 issue 时，正文默认会带上一个通用模板，包含 `Problem`、`Issue Assessment`、`Verification Checklist`、`Progress Log` 几个区块，并用 HTML 注释提示可以按需调整格式。

如需跳过默认模板并创建空正文，可在 `new` 命令后追加 `--blank-body`。

如需在手动编辑正文后仅刷新 `updated_at`，可使用 `touch --id <uuid>`。

## 测试

```bash
bun test
```
