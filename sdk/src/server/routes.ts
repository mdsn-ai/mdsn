function normalizeSegments(relativePath: string): string[] {
  return relativePath.split("/").filter(Boolean);
}

function normalizeRoutePath(routePath: string): string {
  if (!routePath || routePath === "/") {
    return "/";
  }
  return routePath.startsWith("/")
    ? (routePath.replace(/\/+$/, "") || "/")
    : (`/${routePath}`.replace(/\/+$/, "") || "/");
}

export function pagePathToRoutePath(filePath: string, pagesDir: string): string {
  const normalizedFilePath = filePath.replace(/\\/g, "/");
  const normalizedPagesDir = pagesDir.replace(/\\/g, "/").replace(/\/+$/, "");
  const withPrefix = `${normalizedPagesDir}/`;
  const relativePath = normalizedFilePath.startsWith(withPrefix)
    ? normalizedFilePath.slice(withPrefix.length)
    : normalizedFilePath;

  const withoutExtension = relativePath.replace(/\.md$/, "");
  const segments = normalizeSegments(withoutExtension);

  if (segments[segments.length - 1] === "index") {
    segments.pop();
  }

  if (segments.length === 0) {
    return "/";
  }

  return `/${segments.join("/")}`;
}

export function routePathToExpressPath(routePath: string): string {
  return routePath.replace(/\[([^\]]+)\]/g, ":$1");
}

export function routePathToMarkdownPath(routePath: string): string {
  const normalized = normalizeRoutePath(routePath);
  if (normalized === "/") {
    return "/index.md";
  }
  return `${normalized}.md`;
}

export function markdownPathToRoutePath(pathname: string): string | null {
  if (!pathname || !pathname.toLowerCase().endsWith(".md")) {
    return null;
  }

  const normalized = normalizeRoutePath(pathname);
  if (normalized === "/index.md") {
    return "/";
  }

  const stripped = normalized.slice(0, -3);
  if (stripped.endsWith("/index")) {
    return stripped.slice(0, -6) || "/";
  }
  return stripped.length > 0 ? stripped : "/";
}

export function extractRouteParamNames(routePath: string): string[] {
  return Array.from(routePath.matchAll(/\[([^\]]+)\]/g), (match) => match[1]);
}

export function defaultLocaleRouteToFallbackPath(
  routePath: string,
  defaultLocale: string,
): string | null {
  const localePrefix = `/${defaultLocale}`;
  if (routePath === localePrefix) {
    return "/";
  }
  if (routePath.startsWith(`${localePrefix}/`)) {
    return routePath.slice(localePrefix.length);
  }
  return null;
}
