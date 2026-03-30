---
title: 路由与布局
description: MDSN 中路由注册、动作目标与页面壳布局的组织方式。
---

# 路由与布局

## 路由模型

- 页面路由：`pages["/docs"] = () => page`
- 动作路由：显式声明 `target + methods + routePath + blockName`

## 布局策略

建议将全局外壳放在 `renderHtml` 或 `transformHtml`：

- Markdown 负责内容与交互定义
- HTML 壳负责导航/主题/品牌
- 浏览器运行时负责 block/page 局部更新
