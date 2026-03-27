function normalizeRoutePath(routePath: string): string {
  if (!routePath || routePath === "/") {
    return "/";
  }
  return routePath.startsWith("/")
    ? (routePath.replace(/\/+$/, "") || "/")
    : (`/${routePath}`.replace(/\/+$/, "") || "/");
}

function markdownPathToRoutePath(pathname: string): string | null {
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

export function mapTargetToHttpPath(target: string): string {
  if (/^https?:\/\//i.test(target)) {
    return target;
  }

  const markdownRoutePath = markdownPathToRoutePath(target);
  if (markdownRoutePath) {
    return markdownRoutePath;
  }
  return target;
}
