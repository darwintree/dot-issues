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
2. 所有 issue 文件位于同一个目录下。
3. issue 目录路径通过项目根目录的配置文件指定。
4. 项目需要提供命令行工具来进行 issue 操作。
5. 命令行工具应优先满足跨平台兼容性和可审计性。
6. issue 使用常用字段集合：`id`、`title`、`status`、`priority`、`labels`、`created_at`、`updated_at`。
7. 项目根目录配置文件格式使用 TOML。
8. 每个 issue 具有唯一 `id`，格式为 UUID，作为系统层面的唯一标识。
9. 每个 issue 对应唯一一个 Markdown 文件，front matter 是 metadata 的唯一来源。
10. Markdown front matter 不允许手动修改，只允许通过 CLI 修改。
11. Markdown 正文允许直接手动编辑。
12. front matter 顶部包含注释，明确禁止手动修改该区域。
13. 首批 CLI 命令至少包括：`new`、`list`、`modify-metadata`、`validate`。
14. `list` 未来需要支持 filter，但当前阶段先不实现 filter。
15. `new` 创建 issue 时，Markdown 文件除 front matter 外，正文默认留空。
16. `modify-metadata` 采用显式参数形式，例如 `--status closed --priority high`，不采用交互式修改。
17. `modify-metadata` 修改 `status` 时，需同时 rename 对应的 Markdown 文件。
18. `validate` 发现不一致时，应报错并提供修复建议，但当前不执行自动修复。
19. 后续会提供单独的修复命令，但当前阶段不实现。
20. 目标使用场景以个人使用优先。
21. Markdown 文件命名规则为 `{status}_{title-slug}_{timestamp}.md`，时间戳精确到分钟（`YYYYMMDDHHmm`）。
22. 文件名中的时间戳仅承载人类与 AI 可读性，不作为系统主键；系统主键为 front matter 中的 UUID `id`。
23. 文件名中的时间戳与 front matter 中的 `created_at` 对应同一时刻，精度不同。

## 当前设计方向

当前是一个"文件驱动的本地 issue 管理工具"：

- 配置文件定义 issue Markdown 文件所在目录
- CLI 负责创建 issue、修改 metadata、校验文件结构
- Markdown front matter 是 metadata 的唯一事实来源
- Markdown 正文可自由编辑，CLI 操作不破坏正文内容
- 命令执行结果应可预测、文本友好，便于审计和脚本集成
- 当前优先服务个人使用场景，而不是复杂团队工作流

## 数据模型

每个 issue 包含以下字段：

- `id`：UUID，系统唯一标识
- `title`：issue 标题
- `status`：issue 状态
- `priority`：优先级
- `labels`：标签列表
- `created_at`：创建时间（ISO 8601）
- `updated_at`：最近更新时间（ISO 8601）

## 单文件模型

每个 issue 对应唯一一个 Markdown 文件：

- front matter 存储所有 metadata 字段
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

## CLI 职责

当前已确认的命令职责：

- `new`：创建新的 issue，初始化 Markdown 文件（含 front matter）；正文默认留空
- `list`：列出 issue；后续支持 filter，当前先不实现 filter
- `modify-metadata`：通过显式参数修改指定 issue 的 front matter；若 `status` 变更则同时 rename 文件
- `validate`：检查文件结构是否合法，校验 front matter 字段完整性与格式合规性

当前暂不包含修复命令，但 `validate` 可以输出建议性的修复方向。

## 文件命名规则

- 文件名格式：`{status}_{title-slug}_{YYYYMMDDHHmm}.md`
- `status`：issue 当前状态
- `title-slug`：标题的 slug 形式（小写、连字符分隔）
- `YYYYMMDDHHmm`：issue 创建时间，精确到分钟
- 文件名随 `status` 等 metadata 变更而变更
- 系统主键为 front matter 中的 `id`（UUID），不依赖文件名

示例：

```
open_fix-login-bug_202604011430.md
closed_fix-login-bug_202604011430.md
```

## 一致性原则

- front matter 是 metadata 的唯一事实来源
- Markdown 正文允许人工直接编辑，CLI 操作不应破坏正文
- `validate` 主要校验 front matter 字段是否完整、格式是否合规
- 校验与修复分离，`validate` 只负责发现问题和报告建议

## CLI 交互风格

为满足跨平台兼容性与易审计性，当前命令设计偏向：

- 非交互式
- 显式参数
- 易于写入 shell 历史与脚本
- 避免依赖复杂终端 UI
- 校验命令负责报告问题，不隐式改写文件

## 配置约束

项目根目录需要一个 TOML 配置文件，用于声明 issue 目录等基础参数。

当前至少已确认：

- 配置文件格式为 TOML
- 配置内容中需要包含 Markdown 文件目录路径

## 适用场景

当前产品定位：

- 优先面向个人使用
- 适合在已有仓库中维护本地 issue 列表
- 先不为多人协作冲突、复杂权限模型、远程同步策略做额外设计

## 当前状态

核心约束已确认。后续可以进入以下任一方向：

1. 继续补充更细的系统设计，例如配置文件字段、front matter 完整示例、validate 的错误类型。
2. 开始在仓库中实现最小可运行版本。

## 下一步

等待进入下一阶段设计或实现。
