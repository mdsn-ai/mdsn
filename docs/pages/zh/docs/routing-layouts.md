---
title: 路由与布局
description: 页面路径、动态段、layout 和 i18n 回退规则
layout: docs
---

# 路由与布局

这篇文档只讲两件事：

- 页面文件怎么变成 URL
- layout 怎么参与页面承载

## 1. 先记住最基本的规则

路由直接来自 `pages/` 下的 Markdown 文件路径。

也就是说：

- 你改页面文件路径
- 最终 URL 就会跟着变

最常见的映射是：

- `pages/index.md` -> `/`
- `pages/docs/index.md` -> `/docs`
- `pages/blog/post.md` -> `/blog/post`

这就是默认 framework 的文件路由模型。

## 2. `index.md` 是目录根页面

`index.md` 表示“这个目录本身”。

例如：

- `pages/index.md`
  - 根页面 `/`
- `pages/docs/index.md`
  - `/docs`
- `pages/zh/docs/index.md`
  - `/zh/docs`

如果你想让某个目录本身有一个首页，就用 `index.md`。

## 3. 动态段怎么写

动态段用方括号表示：

- `pages/blog/[slug].md` -> `/blog/:slug`
- `pages/users/[id].md` -> `/users/:id`

匹配规则是：

- 静态路由优先于动态路由
- 只有静态路由不存在时，才会匹配动态段

所以如果同时存在：

- `pages/blog/about.md`
- `pages/blog/[slug].md`

那 `/blog/about` 会优先命中静态页面。

## 4. layout 什么时候会参与

layout 是页面外壳，不是页面语义本身。

在页面 frontmatter 里写：

```yaml
layout: docs
```

framework 会去找：

- `layouts/docs.html`

如果没有设置 `layout`，页面就使用默认承载壳。

所以 layout 的作用应该是：

- 统一站点外壳
- 统一 header / footer / nav
- 统一 docs shell

不应该把页面自己的内容语义塞进 layout。

## 5. layout 里能拿到什么

layout 模板里可用的变量包括：

- `{{content}}`
- `{{title}}`
- `{{description}}`
- `{{lang}}`
- `{{locale}}`
- `{{defaultLocale}}`
- `{{pathname}}`
- `{{canonical_url}}`
- `{{markdown_alternate_url}}`
- `{{hreflang_links}}`

通常最常用的是：

- `{{content}}`
- `{{title}}`
- `{{description}}`

## 6. i18n 路径怎么组织

多语言页面按目录组织：

- `pages/en/...`
- `pages/zh/...`

例如：

- `pages/en/docs.md` -> `/en/docs`
- `pages/zh/docs/getting-started.md` -> `/zh/docs/getting-started`

## 7. 默认语言回退怎么工作

如果某个路由属于 `defaultLocale`，framework 会尽量提供无前缀回退路由。

例如：

- `defaultLocale = "en"`
- `pages/en/docs.md`

那么它可以同时提供：

- `/en/docs`
- `/docs`

但如果你显式写了：

- `pages/docs.md`

那 `/docs` 会优先命中显式页面，而不是默认语言回退。

## 8. 推荐方式

- 页面语义保留在 Markdown 页面里
- `mdsn:block` 只负责动态区域挂载
- layout 只负责共享外壳
- 不要把业务内容和 block 逻辑塞进 layout

## 相关页面

- [基础开发框架](/zh/docs/site-development)
- [配置参考](/zh/docs/config-reference)
