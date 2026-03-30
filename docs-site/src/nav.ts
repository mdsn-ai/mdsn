export interface DocsNavItem {
  href: string;
  label: {
    en: string;
    zh: string;
  };
}

export interface DocsNavSection {
  section: {
    en: string;
    zh: string;
  };
  items: DocsNavItem[];
}

export const docsNav: DocsNavSection[] = [
  {
    section: {
      en: "Getting Started",
      zh: "入门"
    },
    items: [
      { href: "/docs", label: { en: "Overview", zh: "文档首页" } },
      { href: "/docs/getting-started", label: { en: "Getting Started", zh: "快速开始" } },
      { href: "/docs/developer-paths", label: { en: "Developer Paths", zh: "开发者路线图" } },
      { href: "/docs/site-development", label: { en: "Framework Development", zh: "基础开发框架" } }
    ]
  },
  {
    section: {
      en: "Site Development",
      zh: "站点开发"
    },
    items: [
      { href: "/docs/routing-layouts", label: { en: "Routing and Layouts", zh: "路由与布局" } },
      { href: "/docs/config-reference", label: { en: "Config Reference", zh: "配置参考" } },
      { href: "/docs/action-reference", label: { en: "Action Reference", zh: "Action 参考" } }
    ]
  },
  {
    section: {
      en: "Advanced Development",
      zh: "深入开发"
    },
    items: [
      { href: "/docs/agent-app-demo", label: { en: "Agent App Demo Walkthrough", zh: "Agent App Demo 讲解" } },
      { href: "/docs/server-development", label: { en: "Server Development", zh: "服务端开发" } },
      { href: "/docs/vue-rendering", label: { en: "Custom Rendering with Vue", zh: "使用 Vue 自定义渲染" } },
      { href: "/docs/react-rendering", label: { en: "Custom Rendering with React", zh: "使用 React 自定义渲染" } },
      {
        href: "/docs/shared-interaction",
        label: {
          en: "HTTP Content Negotiation and Shared Interaction",
          zh: "HTTP 内容协商与共享交互"
        }
      }
    ]
  },
  {
    section: {
      en: "Reference",
      zh: "参考"
    },
    items: [
      { href: "/docs/cli-reference", label: { en: "CLI Reference", zh: "CLI 参考" } },
      { href: "/docs/sdk-reference", label: { en: "SDK Reference", zh: "SDK 参考" } }
    ]
  },
  {
    section: {
      en: "MDSN Runtime",
      zh: "MDSN 运行时"
    },
    items: [
      { href: "/docs/sdk", label: { en: "SDK Overview", zh: "SDK 概览" } },
      { href: "/docs/server-runtime", label: { en: "Server Runtime", zh: "服务端运行时" } },
      { href: "/docs/web-runtime", label: { en: "Web Runtime", zh: "Web 运行时" } },
      { href: "/docs/api-reference", label: { en: "API Reference", zh: "API 参考" } },
      { href: "/docs/elements", label: { en: "Elements", zh: "Elements 组件" } },
      { href: "/docs/session-provider", label: { en: "Session Provider", zh: "Session Provider" } },
      { href: "/docs/third-party-markdown-renderer", label: { en: "Third-Party Renderer", zh: "第三方渲染器" } },
      { href: "/docs/examples", label: { en: "Examples", zh: "示例" } }
    ]
  }
];
