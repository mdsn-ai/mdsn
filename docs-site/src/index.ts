import { composePage } from "@mdsn/core";
import type { MdsnFrontmatter, MdsnMarkdownRenderer } from "@mdsn/core";
import { createHostedApp } from "@mdsn/server";

import { extractToc, injectHeadingIds, renderDocsMarkdown } from "./markdown.js";
import { docsNav } from "./nav.js";

export interface CreateDocsSiteServerOptions {
  pages: Record<string, string>;
  markdownRenderer?: MdsnMarkdownRenderer;
  siteTitle?: string;
}

interface DocsPageRecord {
  route: string;
  page: ReturnType<typeof composePage>;
}

type DocsLocale = "en" | "zh";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function toTitle(frontmatter: MdsnFrontmatter, route: string): string {
  const frontmatterTitle = frontmatter.title;
  if (typeof frontmatterTitle === "string" && frontmatterTitle.trim()) {
    return frontmatterTitle.trim();
  }
  const fallback = route.split("/").filter(Boolean).at(-1) ?? "docs";
  return fallback.replaceAll("-", " ");
}

function sortByRoute(records: DocsPageRecord[]): DocsPageRecord[] {
  return [...records].sort((a, b) => {
    if (a.route === "/docs") {
      return -1;
    }
    if (b.route === "/docs") {
      return 1;
    }
    return a.route.localeCompare(b.route);
  });
}

function localeFromRoute(route: string): DocsLocale {
  return route.startsWith("/zh/") ? "zh" : "en";
}

function localizedRoute(baseRoute: string, locale: DocsLocale): string {
  if (locale === "zh") {
    return baseRoute.replace(/^\/docs/, "/zh/docs");
  }
  return baseRoute.replace(/^\/zh\/docs/, "/docs");
}

function docsRouteSuffix(route: string): string {
  if (route === "/docs" || route === "/zh/docs") {
    return "";
  }
  if (route.startsWith("/docs/")) {
    return route.slice("/docs".length);
  }
  if (route.startsWith("/zh/docs/")) {
    return route.slice("/zh/docs".length);
  }
  return "";
}

function withLocaleSuffix(locale: DocsLocale, suffix: string): string {
  return locale === "zh" ? `/zh/docs${suffix}` : `/docs${suffix}`;
}

function withFallbackRoute(candidate: string, fallback: string, availableRoutes: Set<string>): string {
  return availableRoutes.has(candidate) ? candidate : fallback;
}

function renderNavigation(availableRoutes: Set<string>, currentRoute: string, locale: DocsLocale): string {
  return docsNav
    .map((section) => {
      const links = section.items
        .map((item) => {
          const localRoute = localizedRoute(item.href, locale);
          const fallbackRoute = localizedRoute(item.href, locale === "zh" ? "en" : "zh");
          const resolvedRoute = withFallbackRoute(localRoute, fallbackRoute, availableRoutes);
          const hasPage = availableRoutes.has(resolvedRoute);

          if (!hasPage) {
            return `<span class="docs-nav-disabled" data-nav-link>${escapeHtml(item.label[locale])}</span>`;
          }

          const active = resolvedRoute === currentRoute ? ' aria-current="page"' : "";
          return `<a href="${escapeHtml(resolvedRoute)}" data-nav-link${active}>${escapeHtml(item.label[locale])}</a>`;
        })
        .join("");
      return `<section class="docs-nav-section"><h2>${escapeHtml(section.section[locale])}</h2><nav>${links}</nav></section>`;
    })
    .join("");
}

function renderToc(items: ReturnType<typeof extractToc>, locale: DocsLocale): string {
  if (items.length === 0) {
    return `<aside class="docs-toc docs-toc-empty"></aside>`;
  }
  const list = items
    .map(
      (item) =>
        `<li class="depth-${item.depth}"><a href="#${escapeHtml(item.id)}" data-toc-link>${escapeHtml(item.text)}</a></li>`
    )
    .join("");
  const title = locale === "zh" ? "本页目录" : "On this page";
  return `<aside class="docs-toc"><h2>${title}</h2><ul>${list}</ul></aside>`;
}

export function createDocsSiteServer(options: CreateDocsSiteServerOptions) {
  const markdownRenderer = options.markdownRenderer;
  const siteTitle = options.siteTitle ?? "MDSN Docs";

  const explicitRecords = sortByRoute(
    Object.entries(options.pages).map(([route, source]) => ({
      route,
      page: composePage(source)
    }))
  );
  const pageMap = new Map(explicitRecords.map((record) => [record.route, record.page]));

  for (const [route, page] of pageMap.entries()) {
    if (route.startsWith("/docs")) {
      const zhRoute = route.replace(/^\/docs/, "/zh/docs");
      if (!pageMap.has(zhRoute)) {
        pageMap.set(zhRoute, page);
      }
    }
    if (route.startsWith("/zh/docs")) {
      const enRoute = route.replace(/^\/zh\/docs/, "/docs");
      if (!pageMap.has(enRoute)) {
        pageMap.set(enRoute, page);
      }
    }
  }

  const records = sortByRoute(Array.from(pageMap.entries()).map(([route, page]) => ({ route, page })));
  const availableRoutes = new Set(records.map((record) => record.route));

  return createHostedApp({
    pages: Object.fromEntries(
      records.map(({ route }) => [
        route,
        () => {
          const page = pageMap.get(route);
          if (!page) {
            throw new Error(`Unknown docs route: ${route}`);
          }
          return page;
        }
      ])
    ),
    renderHtml(fragment, renderOptions) {
      const route = renderOptions?.route ?? "/docs";
      const locale = localeFromRoute(route);
      const page = pageMap.get(route);
      const pageTitle = page ? toTitle(page.frontmatter, route) : "Docs";
      const suffix = docsRouteSuffix(route);
      const enRoute = withFallbackRoute(withLocaleSuffix("en", suffix), "/docs", availableRoutes);
      const zhRoute = withFallbackRoute(withLocaleSuffix("zh", suffix), "/zh/docs", availableRoutes);
      const homeRoute = locale === "zh" && availableRoutes.has("/zh/docs") ? "/zh/docs" : "/docs";
      const navigation = renderNavigation(availableRoutes, route, locale);
      const tocItems = extractToc(fragment.markdown);
      const rendered = markdownRenderer
        ? {
            html: injectHeadingIds(markdownRenderer.render(fragment.markdown), tocItems)
          }
        : renderDocsMarkdown(fragment.markdown);
      const toc = renderToc(tocItems, locale);
      const searchLabel = locale === "zh" ? "搜索" : "Search";
      const searchPlaceholder = locale === "zh" ? "搜索文档..." : "Search docs...";

      return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(pageTitle)} · ${escapeHtml(siteTitle)}</title>
    <link rel="stylesheet" href="/docs-site/site.css">
    <script defer src="/docs-site/docs.js"></script>
  </head>
  <body>
    <header class="docs-topbar">
      <a class="docs-brand" href="${homeRoute}">${escapeHtml(siteTitle)}</a>
      <div class="docs-lang-switch" aria-label="Language">
        <a href="${escapeHtml(enRoute)}"${locale === "en" ? ' aria-current="page"' : ""}>EN</a>
        <a href="${escapeHtml(zhRoute)}"${locale === "zh" ? ' aria-current="page"' : ""}>中文</a>
      </div>
    </header>
    <main class="docs-shell">
      <aside class="docs-nav" aria-label="Sidebar navigation">
        <div class="docs-nav-search">
          <label for="docs-nav-filter">${searchLabel}</label>
          <input id="docs-nav-filter" type="search" placeholder="${searchPlaceholder}">
        </div>
        ${navigation}
      </aside>
      <article class="docs-content" data-docs-content>
        ${rendered.html}
      </article>
      ${toc}
    </main>
  </body>
</html>`;
    }
  });
}
