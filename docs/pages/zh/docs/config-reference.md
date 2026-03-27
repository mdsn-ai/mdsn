---
title: 配置参考
description: 什么时候需要配置文件，以及常用配置项怎么用
layout: docs
---

# 配置参考

大多数 starter 项目一开始不需要配置文件。

因为默认情况下：

- 页面目录就是 `pages/`
- action 目录就是 `server/`
- 默认端口是 `3000`
- framework 会直接跑起来

所以这篇文档真正回答的是：

- 什么时候你才需要 `mdsn.config.*`
- 配置文件最常改哪些部分

## 1. 支持哪些配置文件名

支持的配置文件名：

- `mdsn.config.cjs`
- `mdsn.config.js`
- `mdsn.config.json`
- `mdsn.config.ts`
- `mdsn.config.mts`
- `mdsn.config.cts`

如果你是发布后的 CLI 环境，优先使用：

- `mdsn.config.cjs`

这是最稳的运行时形式。

## 2. 最小配置长什么样

最小例子：

```ts
import { defineConfig } from "@mdsnai/sdk/framework";

export default defineConfig({
  site: {
    title: "My Site",
  },
});
```

也就是说，很多时候你只会先改：

- `site.title`

## 3. 最常改的是哪三组

大多数项目最常改的是：

- `site`
- `dirs`
- `i18n`

### `site`

站点元信息：

- `title`
- `description`
- `baseUrl`

适合在这些场景修改：

- 站点标题
- SEO / canonical
- 线上域名

### `dirs`

目录约定：

- `pages`
- `server`
- `public`
- `layouts`

适合在这些场景修改：

- 你不想用默认目录名
- 你要接已有工程结构

例如：

```ts
export default defineConfig({
  dirs: {
    pages: "content",
    server: "actions",
    public: "public",
    layouts: "layouts",
  },
});
```

### `i18n`

多语言设置：

- `defaultLocale`
- `locales`

例如：

```ts
export default defineConfig({
  i18n: {
    defaultLocale: "en",
    locales: ["en", "zh"],
  },
});
```

规则：

- `defaultLocale` 缺省时取 `locales[0]`
- `defaultLocale` 不在 `locales` 中时会自动补入
- 默认语言会尽量生成无前缀回退路由

## 4. 其他常见配置

### `server`

服务端配置，目前最常用的是端口：

```ts
export default defineConfig({
  server: {
    port: 4010,
  },
});
```

### `markdown`

Markdown 渲染相关：

- `linkify`
- `typographer`

### `dev`

开发模式行为：

- `openBrowser`

## 5. 默认值

- `server.port`: `3000`
- `dirs.pages`: `pages`
- `dirs.server`: `server`
- `dirs.public`: `public`
- `dirs.layouts`: `layouts`
- `markdown.linkify`: `true`
- `markdown.typographer`: `false`
- `dev.openBrowser`: `true`
- `i18n.defaultLocale`: `locales[0] ?? "en"`
- `i18n.locales`: `["en"]`

## 6. 配置结构

```ts
type MdsnConfig = {
  site?: {
    title?: string;
    description?: string;
    baseUrl?: string;
  };
  server?: {
    port?: number;
  };
  dirs?: {
    pages?: string;
    server?: string;
    public?: string;
    layouts?: string;
  };
  markdown?: {
    linkify?: boolean;
    typographer?: boolean;
  };
  dev?: {
    openBrowser?: boolean;
  };
  i18n?: {
    defaultLocale?: string;
    locales?: string[];
  };
};
```

## 相关页面

- [基础开发框架](/zh/docs/site-development)
- [路由与布局](/zh/docs/routing-layouts)
- [SDK 参考](/zh/docs/sdk-reference)
