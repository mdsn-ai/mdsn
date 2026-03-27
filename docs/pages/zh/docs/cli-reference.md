---
title: CLI 参考
description: mdsn create、dev、build、start 的工作流参考
layout: docs
---

# CLI 参考

命令名：`mdsn`

CLI 只负责四件事：

- `create`：创建新站点
- `dev`：启动开发服务器
- `build`：构建到 `dist/`
- `start`：从构建产物启动预览

这页按实际工作流来读就够了：

1. 先 `create`
2. 再 `dev`
3. 再 `build`
4. 最后 `start`

## 1. `mdsn create`

什么时候用：

- 你要创建一个新项目
- 你要拿到最小 starter

它会做什么：

- 创建站点目录
- 生成 starter 文件
- 默认执行 `npm install`

starter 默认生成：

- `package.json`
- `pages/index.md`
- `server/actions.cjs`
- `README.md`

最常见用法：

```bash
mdsn create skills-app
mdsn create --cwd demos skills-app
```

规则：

- `create` 最多接受一个目标目录
- 不支持 `--port`

## 2. `mdsn dev`

什么时候用：

- 你在本地开发页面和 action
- 你要边改边看效果

它会做什么：

- 启动开发服务器
- 监听 `pages` / `server` / `public` / `layouts`
- 注入最小自动刷新探针

最常见用法：

```bash
mdsn dev
mdsn dev --cwd docs --port 4010
mdsn dev -C docs -p 4010
```

调试入口：

- `GET /__mdsn/debug`
- `GET /__mdsn/debug/site`
- `GET /__mdsn/debug/version`

最重要的参数：

- `--cwd` / `-C`
- `--port` / `-p`

## 3. `mdsn build`

什么时候用：

- 你要生成 `dist/`
- 你要准备预览或部署

它会做什么：

- 构建页面和站点资源到 `dist/`
- 写出 manifest
- 写出序列化后的配置

最常见用法：

```bash
mdsn build
mdsn build --cwd docs
```

最重要的参数：

- `--cwd` / `-C`

## 4. `mdsn start`

什么时候用：

- 你要本地预览构建结果
- 你要验证 `dist/` 的实际运行效果

它会做什么：

- 启动生产预览服务
- 优先读取 `dist/`
- 如果 `dist/` 不存在，则回退到源码目录

最常见用法：

```bash
mdsn start
mdsn start --cwd docs --port 4010
mdsn start -C docs -p 4010
```

最重要的参数：

- `--cwd` / `-C`
- `--port` / `-p`

## 5. 参数规则

- `--cwd=<dir>` 与 `--cwd <dir>` 都支持
- `--port=<n>` 与 `--port <n>` 都支持
- `--port` 只支持 `dev` 与 `start`
- `dev` / `build` / `start` 不接受位置参数
- `create` 只接受一个位置参数作为目标目录

## 相关页面

- [快速开始](/zh/docs/getting-started)
- [基础开发框架](/zh/docs/site-development)
- [配置参考](/zh/docs/config-reference)
