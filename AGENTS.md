# dot-issues

这个仓库是一个本地 issue 管理工具。项目使用bun管理。

- 用 Bun CLI 管理仓库内的 Markdown issue 文件
- issue metadata 存在 front matter 中
- issue 正文允许手动编辑
- 默认 issue 目录是 `.issues/`

## 仓库结构

- CLI 源码在 `skills/dot-issues/scripts/`，但测试基于 `src` 进行导入
- `skills/dot-issues` 中的内容应该是自洽的，不依赖于外部的，好像外部的内容都不存在一样

## Review Guidelines

- `skills/` 目录中的文档和参考内容默认使用英文
- 如果新增或修改了 API、命令参数 flag、或命令行为，需要同步更新或新增 `skills/dot-issues/reference/` 中对应文档
