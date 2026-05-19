# dot-issues

**Issues that live in your repo — plain Markdown, built for agents.**

> 📖 **语言：** [English](./README.md) | [中文](./README-CN.md)

一个零依赖的 Bun CLI，用 Markdown 文件在仓库内维护本地 issue 列表。

## 特点

- 不依赖 GitHub Issues，完全本地化
- Metadata 只存放在 front matter 中
- Issue 正文允许手动编辑，默认会生成可自行调整的模板
- 原生支持 AI agent 集成
- 运行前可直接审计全部源码

## 目录

- `src/`：本地开发入口
- `skills/dot-issues/scripts/`：作为 skill 分发时的 CLI 源码
- `.issues/`：issue Markdown 文件目录
- `tests/`：关键路径测试

## 安装为 skill

```bash
npx skills add https://github.com/darwintree/dot-issues --skill dot-issues
```

## 使用方式

安装后，先确定 `{skillPath}`。它就是包含 `SKILL.md` 的目录，然后显式传入脚本路径：

```bash
{skillPath} = /path/to/dot-issues/skills/dot-issues
bun {skillPath}/scripts/index.ts new --title "Fix login bug" --status open --priority high --labels auth --labels bug
bun {skillPath}/scripts/index.ts new --title "Scratch note" --status open --content "Initial note."
bun {skillPath}/scripts/index.ts list --status open
bun {skillPath}/scripts/index.ts list --labels auth --labels bug
bun {skillPath}/scripts/index.ts search --query "login"
bun {skillPath}/scripts/index.ts show --id <uuid>
bun {skillPath}/scripts/index.ts modify-metadata --id <uuid> --status closed --priority low
bun {skillPath}/scripts/index.ts touch --id <uuid>
bun {skillPath}/scripts/index.ts archive --id <uuid>
bun {skillPath}/scripts/index.ts list --issue-dir custom-issues
bun {skillPath}/scripts/index.ts new --title "Fix login bug" --status open --issue-dir custom-issues --subdir team/auth
```

仓库开发态下，`src/` 只是指向 skill 源码的开发别名：

```bash
bun src/index.ts new --title "Fix login bug" --status open
bun src/index.ts list
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

如需指定初始正文，可在 `new` 命令后追加 `--content "Initial note."`。

如需在手动编辑正文后仅刷新 `updated_at`，可使用 `touch --id <uuid>`。

### 文件名 slug

- 文件名由 `status + title slug + created_at` 组成
- slug 会尽量保留 Unicode 字母和数字，包括 CJK 字符
- 文件名只用于提升可读性，稳定标识仍然是 `id`

## 搜索与归档

- `search --query "text"` 会在标题和正文中做不区分大小写的匹配
- `list --labels a --labels b` 使用“命中任一标签即可”的语义
- `archive --id <uuid>` 会将 issue 移到 `.issues/archive/` 下，并把状态改为 `closed`
- 默认 `list` 和 `search` 不显示归档 issue，但 `show --id <uuid>` 仍可读取

## 测试

```bash
bun test
```
