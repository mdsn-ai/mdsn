export function normalizeMarkdownRouteTarget(target: unknown, baseOrigin: string): string | null {
  if (typeof target !== "string" || target.length === 0) {
    return null;
  }

  if (/^https?:\/\//i.test(target)) {
    return target;
  }

  const url = new URL(target, baseOrigin);
  if (!/\.md$/i.test(url.pathname)) {
    return url.pathname + url.search + url.hash;
  }

  if (url.pathname === "/index.md") {
    return "/" + url.search + url.hash;
  }

  const stripped = url.pathname.slice(0, -3);
  const routePath = stripped.endsWith("/index") ? stripped.slice(0, -6) || "/" : stripped;
  return routePath + url.search + url.hash;
}

export function resolveTargetValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function getNavigationRuntimeSource(): string {
  return [
    normalizeMarkdownRouteTarget.toString(),
    resolveTargetValue.toString(),
  ].join("\n\n");
}
