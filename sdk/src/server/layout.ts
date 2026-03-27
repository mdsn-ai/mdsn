export type LayoutTemplateContext = {
  title: string;
  description: string;
  content: string;
  locale: string;
  defaultLocale: string;
  pathname?: string;
  canonicalUrl?: string;
  ogImageUrl?: string;
  siteName?: string;
  markdownAlternateUrl?: string;
  hreflangLinks?: string;
  posthogProjectApiKey?: string;
  posthogHost?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function applyLayoutTemplate(template: string, context: LayoutTemplateContext): string {
  const replacementByKey: Record<string, string> = {
    title: escapeHtml(context.title),
    description: escapeHtml(context.description),
    content: context.content,
    lang: escapeHtml(context.locale),
    locale: escapeHtml(context.locale),
    defaultLocale: escapeHtml(context.defaultLocale),
    pathname: escapeHtml(context.pathname ?? ""),
    canonical_url: escapeHtml(context.canonicalUrl ?? ""),
    og_image_url: escapeHtml(context.ogImageUrl ?? ""),
    site_name: escapeHtml(context.siteName ?? ""),
    markdown_alternate_url: escapeHtml(context.markdownAlternateUrl ?? ""),
    hreflang_links: context.hreflangLinks ?? "",
    posthog_project_api_key: escapeHtml(context.posthogProjectApiKey ?? ""),
    posthog_host: escapeHtml(context.posthogHost ?? ""),
  };

  return template.replace(/\{\{\s*([a-zA-Z_][\w-]*)\s*\}\}/g, (_match, key: string) => {
    return replacementByKey[key] ?? "";
  });
}

export function resolveLocaleForRoutePath(
  routePath: string,
  locales: string[],
  defaultLocale: string,
): string {
  const firstSegment = routePath.split("/").filter(Boolean)[0];
  if (firstSegment && locales.includes(firstSegment)) {
    return firstSegment;
  }
  return defaultLocale;
}
