---
# This section is managed by the CLI. Do not edit manually.
id: "5e24e779-2cd7-4032-b496-35eeb78e79b3"
title: "评估使用 yq 替换手写 Markdown metadata 逻辑"
status: "open"
priority: "medium"
labels: ["DESIGN"]
created_at: "2026-05-18T10:12:00Z"
updated_at: "2026-05-18T10:13:00Z"
---
<!--
This body is user-owned. Adjust the sections freely to fit the issue.
Use the CLI to update front matter fields such as title, status, priority, and labels.
-->

## Problem

当前 dot-issues 自己维护 Markdown front matter 的解析、生成、校验和部分 filter/list 逻辑。随着目标转向 Obsidian-compatible Markdown，这部分手写基础设施的价值变低，但仍然需要保留 issue 语义层和校验能力。

需要评估是否用 Mike Farah `yq` 替换当前手写 Markdown metadata 逻辑，并明确最终交互模型：

- dot-issues CLI 内部调用 `yq`，用户继续使用 issue 语义命令
- 或者直接要求用户/agent 使用 `yq`，dot-issues 只提供规范和 recipes

## Current Understanding

- `yq --front-matter=extract` 可以读取 Markdown front matter。
- `yq --front-matter=process` 可以修改 front matter 并保留正文。
- `yq` 支持 `select(...)`、`contains(...)`、`filename`，可以完成基础 metadata filter，例如查找 tags 包含某值的文件。
- `yq --front-matter` 多文件处理有限，通常需要 `find ... -exec yq ... {} \;`。
- link 解析仍不应完全交给 `yq`；issue link/backlink 可能需要 dot-issues 自己定义受限语义命令。

## Design Question

是否保留轻量 dot-issues CLI？

### Option A: dot-issues CLI wraps yq

dot-issues 保留 `new`、`list`、`show`、`set`、`close`、`doctor` 等语义命令，内部使用 `yq` 读写 front matter。

Pros:

- 能强制校验 status、priority、labels、id uniqueness、timestamps。
- agent 面对稳定 issue 命令，而不是散落的 `yq` 表达式。
- 可以把 `yq` 作为实现细节，后续替换成本较低。

Cons:

- 仍需维护轻量 CLI。
- 需要处理 `yq` 缺失、版本不兼容、错误输出等运行时问题。

### Option B: users/agents call yq directly

dot-issues 不保留 CLI，只提供 schema、templates 和 `yq` recipes。

Pros:

- 项目实现最轻。
- 避免维护 wrapper。

Cons:

- 校验逻辑难以强制执行。
- 每个操作都要求 agent 正确拼写复杂 `yq` 表达式。
- 容易写出非法 metadata，例如非法 status 或遗漏 `updated_at`。

## Proposed Direction

优先评估 Option A：保留轻量 CLI，但将底层 front matter 解析/写回交给 `yq`。

dot-issues CLI 的职责应收缩为：

- issue schema validation
- workflow semantics
- deterministic output for agents
- migration/doctor
- limited issue link resolution

不再自己维护通用 Markdown/front matter parser，除非 `yq` 能力或可用性不足。

## Verification Checklist

- [ ] 确认依赖的 `yq` 必须是 Mike Farah v4，并记录安装/检测方式。
- [ ] 用 spike 验证 `yq --front-matter=extract` 能覆盖当前 metadata read。
- [ ] 用 spike 验证 `yq --front-matter=process -i` 能安全更新 status/priority/labels 并保留正文。
- [ ] 验证 `filename` 可用于 list/filter 输出文件路径。
- [ ] 评估多文件 filter 的性能和错误处理。
- [ ] 明确哪些校验必须留在 dot-issues CLI。
- [ ] 决定用户文档中是否暴露 `yq` recipes，还是只作为内部实现细节。

## Progress Log

- 2026-05-18: 创建 issue，记录将 `yq` 作为 metadata/filter/edit 底座的评估方向，并保留“CLI 内部使用 yq”与“用户直接使用 yq”的待决问题。
