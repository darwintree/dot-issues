---
# This section is managed by the CLI. Do not edit manually.
id: "273a694d-5e9c-4ef6-bc08-675f4897fc90"
title: "跟进：并发归档 ENOENT 修复的后续优化"
status: "open"
priority: "medium"
labels: ["DESIGN"]
created_at: "2026-08-23T00:54:00Z"
updated_at: "2026-08-23T00:54:00Z"
---
# 背景

已合并的并发归档 ENOENT 热修复（见 `closed_archive-rename-enoent_202604050004`）在 `collectIssueFiles` 与 `listLocatedIssues` 增加 ENOENT 容错，止血有效。

# 本 issue 目标

跟踪该修复评估后的遗留优化，避免长期以吞 ENOENT 掩盖性能/语义问题。

# 需要改进

- `isEnoentError` 健壮性：当前 `(error as Errno).code === "ENOENT"` 在 `null/undefined` 会抛 TypeError，应改为 `typeof error === "object" && error !== null` 守卫。
- `findIssueById` 仍是全量扫描+全量 read 再过滤，窗口期大、性能差；应改为索引/早退或定点查找。
- 消失语义模糊：目标文件自身消失被静默过滤为 `Issue not found`，需区分“真不存在”与“并发移动”。
- `archive` 的 `fileExists(nextPath)` + `rename` 仍是 TOCTOU，同 id 并发仍竞态。
- 测试仅 mock，未做真实 `rename` 并发集成测试。

# 验收

- isEnoentError 增加守卫并补充单测
- findIssueById 改为更稳健的查找策略或记录不改的技术决策
- archive 同 id 并发行为明确（报错或串行化）并有集成测试覆盖
