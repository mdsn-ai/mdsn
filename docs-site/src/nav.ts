export interface DocsNavItem {
  href: string;
  label: string;
}

export interface DocsNavSection {
  section: string;
  items: DocsNavItem[];
}

export const docsNav: DocsNavSection[] = [
  {
    section: "Overview",
    items: [
      { href: "/docs", label: "Home" },
      { href: "/docs/sdk", label: "SDK Overview" },
      { href: "/docs/server-runtime", label: "Server Runtime" },
      { href: "/docs/web-runtime", label: "Web Runtime" }
    ]
  },
  {
    section: "Reference",
    items: [
      { href: "/docs/api-reference", label: "API Reference" },
      { href: "/docs/elements", label: "Elements" },
      { href: "/docs/session-provider", label: "Session Provider" },
      { href: "/docs/third-party-markdown-renderer", label: "Third-Party Renderer" },
      { href: "/docs/examples", label: "Examples" }
    ]
  }
];
