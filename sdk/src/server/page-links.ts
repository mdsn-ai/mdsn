import {
  markdownPathToRoutePath,
  routePathToMarkdownPath,
} from "./routes";

export function mapPageTargetToHttpPath(target: string): string {
  if (/^https?:\/\//i.test(target)) {
    return target;
  }
  const markdownRoutePath = markdownPathToRoutePath(target);
  if (markdownRoutePath) {
    return markdownRoutePath;
  }
  return target;
}

export function joinUrl(baseUrl: string, routePath: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = routePath.startsWith("/") ? routePath : `/${routePath}`;
  return `${normalizedBase}${normalizedPath}`;
}

export function resolveCanonicalUrl(routePath: string, siteBaseUrl?: string): string | undefined {
  if (!siteBaseUrl) {
    return undefined;
  }
  return joinUrl(siteBaseUrl, routePath);
}

export function resolveMarkdownAlternateUrl(routePath: string, siteBaseUrl?: string): string {
  const markdownPath = routePathToMarkdownPath(routePath);
  if (!siteBaseUrl) {
    return markdownPath;
  }
  return joinUrl(siteBaseUrl, markdownPath);
}

function normalizeRoutePath(routePath: string): string {
  if (!routePath || routePath === "/") {
    return "/";
  }
  return routePath.replace(/\/+$/, "") || "/";
}

function resolveRouteSuffix(routePath: string, locales: string[]): string {
  const normalized = normalizeRoutePath(routePath);
  if (normalized === "/") return "/";

  const segments = normalized.split("/").filter(Boolean);
  const first = segments[0];
  if (first && locales.includes(first)) {
    const suffix = `/${segments.slice(1).join("/")}`;
    return suffix === "/" ? "/" : suffix.replace(/\/+$/, "") || "/";
  }

  return normalized;
}

function resolveLocalizedRoutePath(locale: string, suffix: string, defaultLocale: string): string {
  if (locale === defaultLocale) {
    return suffix;
  }
  if (suffix === "/") {
    return `/${locale}`;
  }
  return `/${locale}${suffix}`;
}

export function resolveHreflangLinks(options: {
  routePath: string;
  locales: string[];
  defaultLocale: string;
  siteBaseUrl?: string;
}): string {
  const suffix = resolveRouteSuffix(options.routePath, options.locales);
  const links: string[] = [];

  const toHref = (routePath: string) => {
    if (!options.siteBaseUrl) {
      return routePath;
    }
    return joinUrl(options.siteBaseUrl, routePath);
  };

  for (const locale of options.locales) {
    const href = toHref(resolveLocalizedRoutePath(locale, suffix, options.defaultLocale));
    links.push(`<link rel="alternate" hreflang="${locale}" href="${href}" />`);
  }

  const defaultHref = toHref(resolveLocalizedRoutePath(options.defaultLocale, suffix, options.defaultLocale));
  links.push(`<link rel="alternate" hreflang="x-default" href="${defaultHref}" />`);

  return links.join("\n    ");
}
