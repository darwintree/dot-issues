# 项目初始化说明

## 项目背景

这个仓库用于实现一个轻量项目，目标是在已有项目的某个目录中，以 Markdown 文件的形式创建和维护 issue 列表。

这里的 issue 列表：

- 不直接依赖 GitHub Issues
- 以文件为中心进行记录和维护
- 适合直接纳入现有代码仓库一起版本管理
- 以 Markdown front matter 作为 metadata 的唯一来源

## 当前初始化范围

当前阶段只完成最小初始化：

- 建立 Git 仓库
- 建立文档目录 `docs/spec/`
- 创建初始化说明文档 `docs/spec/init.md`

## 初始理解

基于目前信息，这个项目大概率会包含以下能力：

- 在目标目录中创建多个 issue Markdown 文件
- 通过项目根目录的配置文件声明 issue 目录路径
- 提供跨平台、兼容性好、易审计的命令行命令
- 约定 issue 的 Markdown 结构
- 支持按状态、优先级或分类组织 issue
- 便于人工编辑和后续脚本处理

## 已确认约束

1. issue 以多个 Markdown 文件的形式存在。
2. 所有 issue 文件位于项目根目录的 `.issues` 目录下。
3. 项目需要提供命令行工具来进行 issue 操作。
4. 命令行工具应优先满足跨平台兼容性和可审计性。
5. issue 使用字段集合：`id`、`title`、`status`、`priority`、`labels`、`created_at`、`updated_at`。
6. 每个 issue 具有唯一 `id`，格式为 UUID，作为系统层面的唯一标识。
7. 每个 issue 对应唯一一个 Markdown 文件，front matter 是 metadata 的唯一来源。
8. Markdown front matter 不允许手动修改，只允许通过 CLI 修改。
9. Markdown 正文允许直接手动编辑。
10. front matter 顶部包含注释，明确禁止手动修改该区域。
11. 首批 CLI 命令包括：`new`、`list`、`modify-metadata`。
12. `list` 采用简洁列表格式输出，便于人类阅读和 AI 解析文件。
13. `new` 创建 issue 时，Markdown 文件除 front matter 外，正文默认留空。
14. 命令行参数采用显式参数形式，例如 `--status closed --priority high`，不采用交互式修改。
15. `modify-metadata` 修改 `status` 时，需同时 rename 对应的 Markdown 文件。
16. 目标使用场景以个人使用优先。
17. Markdown 文件命名规则为 `{YYYYMMDD}_{status}_{title-slug}.md`，日期来自 issue 的 `created_at`。
18. 文件名中的日期仅承载人类与 AI 可读性，不作为系统主键；系统主键为 front matter 中的 UUID `id`。
19. `title-slug` 从 `title` 生成，规则为：转小写、多余空格转连字符、移除特殊字符，确保与 markdown 文件名一致。
20. `status` 的允许值为：`open`、`working`、`closed`。
21. 命令行参数解析采用 minimist 风格，如 `--labels bug --labels auth`。

## 当前设计方向

当前是一个"文件驱动的本地 issue 管理工具"：

- issue Markdown 文件存储在项目根目录的 `.issues` 目录
- CLI 负责创建 issue、修改 metadata、列出 issue
- Markdown front matter 是 metadata 的唯一事实来源
- Markdown 正文可自由编辑，CLI 操作不破坏正文内容
- 命令执行结果应可预测、文本友好，便于审计和脚本集成
- 当前优先服务个人使用场景，而不是复杂团队工作流

## 数据模型

每个 issue 包含以下字段（front matter 中完整定义）：

- `id`：UUID，系统唯一标识
- `title`：issue 标题
- `status`：issue 状态（`open`、`working`、`closed`）
- `priority`：优先级（可选值待确认，如 `low`、`medium`、`high`）
- `labels`：标签列表（YAML 数组）
- `created_at`：创建时间（ISO 8601，秒数为 00）
- `updated_at`：最近更新时间（ISO 8601）

## 单文件模型

每个 issue 对应唯一一个 Markdown 文件：

- front matter 存储所有 metadata 字段（YAML 格式）
- 正文存储 issue 内容，可任意手动编辑
- front matter 由 CLI 管理，顶部注释明确禁止手动修改
- CLI 修改 metadata 时直接读写 front matter，并在必要时 rename 文件

front matter 示例：

```markdown
---
# ⚠️ This section is managed by the CLI. Do not edit manually.
id: 550e8400-e29b-41d4-a716-446655440000
title: Fix login bug
status: open
priority: high
labels: [auth, bug]
created_at: 2026-04-01T14:30:00Z
updated_at: 2026-04-01T14:30:00Z
---

正文内容，可随意手动编辑。
```

## CLI 交互风格

为满足跨平台兼容性与易审计性，当前命令设计特点：

- 非交互式
- 显式参数（minimist 风格）
- 易于写入 shell 历史与脚本
- 避免依赖复杂终端 UI
- 命令执行结果文本友好，便于人类和 AI 解析

## CLI 职责

当前已确认的命令职责：

- `new`：创建新的 issue，初始化 Markdown 文件（含 front matter）；正文默认留空
- `list`：列出所有 issue，采用简洁列表格式；支持按状态、优先级、标签过滤（后续扩展）
- `modify-metadata`：通过显式参数修改指定 issue 的 front matter；若 `status` 变更则同时 rename 文件

## 文件命名规则

- 文件名格式：`{YYYYMMDD}_{status}_{title-slug}.md`
- `YYYYMMDD`：issue 创建日期，来自 `created_at`
- `status`：issue 当前状态（`open`、`working`、`closed`）
- `title-slug`：标题的 slug 形式（小写、非字母数字字符转连字符）
- 文件名随 `status` 等 metadata 变更而变更
- 系统主键为 front matter 中的 `id`（UUID），不依赖文件名

示例：

```
20260401_open_fix-login-bug.md
20260401_closed_fix-login-bug.md
```

## list 命令输出格式

简洁列表格式，便于人类阅读和 AI 解析：

```
[open] Fix login bug (high) #auth #bug (2026-04-01)
[working] Update docs (medium) #docs (2026-03-28)
[closed] Review PR (low) (2026-03-20)
```

格式说明：
- `[status]`：issue 状态
- `Title`：issue 标题（与 markdown 文件名中的 title-slug 对应）
- `(priority)`：优先级
- `#label`：标签列表（无标签则省略）
- `(YYYY-MM-DD)`：创建日期

## 适用场景

当前产品定位：

- 优先面向个人使用
- 适合在已有仓库中维护本地 issue 列表
- 先不为多人协作冲突、复杂权限模型、远程同步策略做额外设计

## 当前状态

核心约束和 CLI 命令已确认。可以开始实现最小可运行版本。

## 下一步

开始实现 CLI：

1. 初始化 bun 项目，安装 `minimist` 进行参数解析
2. 实现 `new` 命令：创建 issue，生成 UUID，写入 front matter
3. 实现 `list` 命令：扫描 `.issues` 目录，按格式输出
4. 实现 `modify-metadata` 命令：更新 front matter，必要时 rename 文件
5. 编写测试和文档
