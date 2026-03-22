# 项目初始化说明

## 项目背景

这个仓库用于实现一个轻量项目，目标是在已有项目的某个目录中，以 Markdown 文件的形式创建和维护 issue 列表。

这里的 issue 列表：

- 不直接依赖 GitHub Issues
- 以文件为中心进行记录和维护
- 适合直接纳入现有代码仓库一起版本管理
- 使用 JSON metadata 与 Markdown 正文双轨存储

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
8. 每个 issue 具有唯一 `id`，格式为 UUID。
9. 每个 issue 对应两个文件：一个 JSON metadata 文件，一个 Markdown 文件。
10. JSON 文件与 Markdown 文件存放在不同目录中。
11. JSON 文件不可手动修改，只允许通过 CLI 修改。
12. Markdown 文件允许直接手动编辑。
13. Markdown 文件开头包含自动注入的 YAML metadata。
14. YAML metadata 由 JSON metadata 派生，并通过命令写入 Markdown。
15. 首批 CLI 命令至少包括：`new`、`list`、`modify-metadata`、`apply-metadata`、`validate`。
16. `list` 未来需要支持 filter，但当前阶段先不实现 filter。
17. metadata JSON 中，使用双下划线包裹的键名表示协议字段，例如 `__hidden_keys__`。
18. 协议字段默认不渲染到 Markdown front matter。
19. `__hidden_keys__` 用于记录不应写入 Markdown front matter 的普通字段名。
20. 默认 `__hidden_keys__` 中至少包含 `markdown_path`。
21. `markdown_path` 表示 Markdown 文件的 POSIX 格式相对路径。
22. metadata 文件命名规则为 `yyyymmdd_issue_name.json`，其中日期为 issue 创建日。
23. metadata 文件名不承载主键语义，issue 主键写在 JSON 内部，格式为 UUID。
24. Markdown 文件命名规则为 `domain_status_issue_name_uuid.md`。
25. Markdown 文件名允许随 metadata 中的状态等信息变化而变化。
26. 通过 metadata 查找 Markdown 的流程固定为：优先使用 `markdown_path`，其次按文件名中的 UUID 匹配。
27. 不需要通过逐个扫描 Markdown front matter 内容来匹配对应关系。
28. Markdown front matter 的生成规则为：从 JSON metadata 中排除协议字段，以及 `__hidden_keys__` 指定字段后，将其余字段全部写入。
29. `new` 创建 issue 时，Markdown 文件除 front matter 外，正文默认留空。
30. `modify-metadata` 采用显式参数形式，例如 `--status closed --priority high`，不采用交互式修改。
31. `validate` 发现不一致时，应报错并提供修复建议，但当前不执行自动修复。
32. 后续会提供单独的修复命令，但当前阶段不实现。
33. 目标使用场景以个人使用优先。

## 当前设计方向

当前更接近一个“文件驱动的本地 issue 管理工具”：

- 配置文件定义 metadata 目录与 Markdown 目录
- CLI 负责创建 issue、修改 metadata、同步 metadata 到 Markdown、校验文件结构
- JSON 作为受控元数据源，Markdown 作为可自由编辑的内容载体
- 命令执行结果应可预测、文本友好，便于审计和脚本集成
- 当前优先服务个人使用场景，而不是复杂团队工作流

## 初步数据模型

每个 issue 至少包含以下字段：

- `id`：issue 唯一标识
- `title`：issue 标题
- `status`：issue 状态
- `priority`：优先级
- `labels`：标签列表
- `created_at`：创建时间
- `updated_at`：最近更新时间

此外，每个 issue 还需要：

- `id`：UUID，作为 JSON 文件与 Markdown 文件的对应锚点

## 双轨文件模型

每个 issue 由两类文件组成：

- 一个 JSON 文件：保存受控 metadata
- 一个 Markdown 文件：保存正文内容，并在文件头部包含 YAML metadata

当前约束如下：

- JSON 文件与 Markdown 文件位于不同目录
- JSON 文件不允许手工编辑
- Markdown 文件允许任意手工编辑正文
- Markdown 顶部 YAML metadata 由系统自动注入
- JSON 是 metadata 的事实来源
- `apply-metadata` 负责把 JSON metadata 写入对应 Markdown 文件头部
- metadata JSON 支持协议字段，协议字段名使用双下划线包裹
- 协议字段默认不渲染到 Markdown front matter
- `__hidden_keys__` 显式声明哪些普通字段不应写入 front matter
- `markdown_path` 作为隐藏字段存在，用于直接定位 Markdown 文件

## CLI 初步职责

当前已确认的命令职责：

- `new`：创建新的 issue，并初始化对应 JSON 与 Markdown 文件；Markdown 正文默认留空
- `list`：列出 issue；后续支持 filter，当前先不实现 filter
- `modify-metadata`：通过显式参数修改指定 issue 的 JSON metadata
- `apply-metadata`：将 JSON metadata 写回对应 Markdown 文件头部 YAML
- `validate`：检查文件结构是否合法，重点检查 JSON 文件与 Markdown 文件的对应关系

当前暂不包含修复命令，但 `validate` 可以输出建议性的修复方向。

## 文件命名与定位规则

### Metadata JSON

- 文件名格式：`yyyymmdd_issue_name.json`
- `yyyymmdd` 为 issue 创建日
- `issue_name` 为人类可读名称
- 文件名不作为唯一主键
- 唯一标识 `id` 存放在 JSON 文件内容中，格式为 UUID

### Markdown

- 文件名格式：`domain_status_issue_name_uuid.md`
- 文件名中包含 domain、status、issue_name、uuid
- Markdown 文件名允许随着状态等 metadata 更新而变化

### 从 metadata 定位 Markdown

系统根据 metadata 查找对应 Markdown 时，遵循固定顺序：

1. 优先读取 `markdown_path`
2. 若 `markdown_path` 无效，再通过 Markdown 文件名中的 UUID 匹配
3. 不通过逐个解析 front matter 内容进行全量匹配

## Protocol 字段约定

metadata JSON 中支持协议字段，规则如下：

- 键名以双下划线开头并以双下划线结尾，例如 `__hidden_keys__`
- 协议字段默认不渲染到 Markdown front matter
- `__hidden_keys__` 的值用于声明哪些普通字段不应写入 front matter
- 默认 `__hidden_keys__` 至少包含 `markdown_path`

这意味着：

- `markdown_path` 是普通 metadata 字段，但默认不会写入 front matter
- 协议字段用于驱动工具行为，而不是直接暴露给 Markdown 读者

## Front Matter 投影规则

Markdown 头部 YAML front matter 按以下规则从 JSON metadata 生成：

- 排除所有协议字段
- 排除 `__hidden_keys__` 中列出的普通字段
- 其余普通字段全部写入 front matter

当前不采用固定白名单字段模型。

## 一致性原则

当前隐含的一致性设计是：

- JSON metadata 是唯一受控写入口
- Markdown 头部 YAML metadata 是 JSON 的投影，不是独立事实来源
- Markdown 正文允许人工直接编辑，不应在 metadata 同步时被破坏
- `validate` 主要校验双文件是否完整、可匹配、结构是否符合规范
- 文件定位优先依赖 `markdown_path`，UUID 文件名匹配作为回退策略
- 工具不依赖遍历 front matter 内容做配对
- 校验与修复分离，`validate` 只负责发现问题和报告建议

## CLI 交互风格

为满足跨平台兼容性与易审计性，当前命令设计偏向：

- 非交互式
- 显式参数
- 易于写入 shell 历史与脚本
- 避免依赖复杂终端 UI
- 校验命令负责报告问题，不隐式改写文件

## 初步配置约束

项目根目录需要一个 TOML 配置文件，用于声明 issue 目录等基础参数。

当前至少已确认：

- 配置文件格式为 TOML
- 配置内容中需要包含 JSON metadata 目录路径
- 配置内容中需要包含 Markdown 文件目录路径

## 适用场景

当前产品定位：

- 优先面向个人使用
- 适合在已有仓库中维护本地 issue 列表
- 先不为多人协作冲突、复杂权限模型、远程同步策略做额外设计

## 当前状态

初始化阶段的核心约束已基本确认完毕。后续可以进入以下任一方向：

1. 继续补充更细的系统设计，例如配置文件字段、JSON schema、front matter 示例、validate 的错误类型。
2. 开始在仓库中实现最小可运行版本。

## 下一步

等待进入下一阶段设计或实现。
