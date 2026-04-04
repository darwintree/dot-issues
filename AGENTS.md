# dot-issues

这个仓库是一个本地 issue 管理工具。

- 用 Bun CLI 管理仓库内的 Markdown issue 文件
- issue metadata 存在 front matter 中
- issue 正文允许手动编辑
- 默认 issue 目录是 `.issues/`
- CLI 源码在 `skills/scripts/`

## Review Guidelines

- `skills/` 目录中的文档和参考内容默认使用英文
- 如果新增或修改了 API、命令参数 flag、或命令行为，需要同步更新或新增 `skills/reference/` 中对应文档

先看这些文档：

- [README.md](/home/darwinwsl/code/dot-issues/README.md)：项目概览和基本用法
- [README-CN.md](/home/darwinwsl/code/dot-issues/README-CN.md)：中文说明
