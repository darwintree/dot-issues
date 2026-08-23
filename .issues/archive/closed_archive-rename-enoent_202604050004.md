---
# This section is managed by the CLI. Do not edit manually.
id: "12a74f51-e116-4cba-81a9-a440f6fb1f64"
title: "archive 命令在并发执行时会因扫描期 rename 产生 ENOENT"
status: "closed"
priority: "medium"
labels: []
created_at: "2026-04-05T00:04:00Z"
updated_at: "2026-04-05T02:11:00Z"
---

# 背景

在另一个仓库里并发执行两次 `dot-issues archive --id ...` 时，第一条 issue 能成功归档，第二条命令失败，错误是尝试读取一个已经被前一个归档操作移动走的旧路径。

虽然现场暴露在 `archive`，但根因位于按 `id` 查找 issue 的共享扫描逻辑，因此风险很可能不止这一条命令。

实际报错形态类似：

```text
ENOENT: no such file or directory, open '/path/to/.issues/closed_xxx.md'
```

# 复现方式

1. issue store 中存在至少两条已 `closed` 但尚未归档的 issue。
2. 几乎同时执行两个 `archive --id <uuid>`。
3. 其中一个命令在扫描 issue 文件后、读取目标文件前，另一命令已将某个文件 rename 到 `archive/`。
4. 前一个命令继续按旧路径 `readFile`，触发 `ENOENT`，整个命令失败。

# 根因

- `archive` 命令通过 `findIssueById()` 查找 issue。
- `findIssueById()` 不是按 id 定点读取，而是先全量扫描 issue store，再并发读取所有 Markdown 文件，最后按 `id` 过滤。
- 如果扫描和读取之间有别的命令执行了 `rename`，扫描结果中的某些路径就会失效。
- 当前扫描流程对这类瞬时 `ENOENT` 不容忍，任意一个文件在扫描期被移动，整个命令都会失败。

当前直接依赖这套共享查找逻辑的命令至少包括：

- `archive`
- `modify-metadata`
- `touch`
- `show`

其中真正会修改文件路径或元数据的命令更容易触发竞态，但只要扫描阶段碰到别的命令正在 rename / move，读取方理论上都可能受影响。

相关位置：

- `skills/dot-issues/scripts/commands/archive.ts`
- `skills/dot-issues/scripts/utils/issue.ts`
- `skills/dot-issues/scripts/utils/file.ts`

# 期望行为

- 并发执行多个 `archive` 时，不应因为扫描期有文件被 rename 就让无关命令失败。
- 按 `id` 查找 issue 的过程应对瞬时文件移动更稳健。

# 修复方向

- 让 issue 扫描/读取过程对瞬时 `ENOENT` 具备容错，至少能跳过已在并发操作中消失的路径。
- 审视 `findIssueById()` 的实现，避免“全量读取所有文件后再按 id 过滤”的脆弱流程。
- 修复时顺便审视其他依赖 `findIssueById()` 的命令，确认是否存在同类并发脆弱性，而不是只补 `archive` 单点。
- 补充并发测试，至少覆盖两个 `archive` 几乎同时运行的场景，并评估是否需要为其他共享路径补回归测试。

# 验收

- 并发执行两个 `archive --id ...` 时，不会因为扫描期 `rename` 触发 `ENOENT`。
- `archive` 在目标 issue 仍然存在且未归档时能稳定成功。
- 对其他依赖 `findIssueById()` 的命令完成一次并发风险排查，并在 issue 或实现说明中记录结论。
- 测试覆盖扫描期间文件被并发移动的场景。

# 解决记录

- 在 `src/utils/file.ts` 与 `skills/dot-issues/scripts/utils/file.ts` 中补充 `isEnoentError()`，并让递归扫描在目录被并发 `rename` / 移走后对瞬时 `ENOENT` 返回空结果而不是中断整次扫描。
- 在 `src/utils/issue.ts` 与 `skills/dot-issues/scripts/utils/issue.ts` 中让 `listLocatedIssues()` 在读取某个扫描到的 Markdown 文件时，如果该文件已被并发操作移走导致 `ENOENT`，直接跳过该路径；其他错误仍继续抛出，不吞掉真正的解析或数据错误。
- 这样 `findIssueById()` 的调用方 `archive`、`modify-metadata`、`touch`、`show` 都共享了同一层容错，不需要分别打补丁。
- 新增 `tests/race-conditions.test.ts`，用受控 mock 覆盖“扫描返回旧路径，但读取时文件已消失”的回归场景，验证仍能找到目标 issue。
- 已验证：
  - `pnpm test tests/race-conditions.test.ts`
  - `pnpm test tests/commands.test.ts tests/issue-dir.test.ts`
  - `bun run typecheck`
