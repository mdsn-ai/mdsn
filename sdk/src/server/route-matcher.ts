type RoutablePage = {
  routePath: string;
};

function normalizeRoutePath(pathname: string): string {
  if (!pathname) return "/";
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "") || "/";
}

function isDynamicRouteSegment(segment: string): boolean {
  return /^\[[^\]/]+\]$/.test(segment);
}

function compareRouteSpecificity(left: RoutablePage, right: RoutablePage): number {
  const leftSegments = normalizeRoutePath(left.routePath).split("/").filter(Boolean);
  const rightSegments = normalizeRoutePath(right.routePath).split("/").filter(Boolean);
  const maxLength = Math.max(leftSegments.length, rightSegments.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftSegment = leftSegments[index];
    const rightSegment = rightSegments[index];

    const leftWeight = leftSegment
      ? (isDynamicRouteSegment(leftSegment) ? 1 : 2)
      : 0;
    const rightWeight = rightSegment
      ? (isDynamicRouteSegment(rightSegment) ? 1 : 2)
      : 0;

    if (leftWeight !== rightWeight) {
      return rightWeight - leftWeight;
    }
  }

  if (leftSegments.length !== rightSegments.length) {
    return rightSegments.length - leftSegments.length;
  }

  return left.routePath.localeCompare(right.routePath);
}

function routePathMatchesRequestPath(routePath: string, requestPath: string): boolean {
  const normalizedRoutePath = normalizeRoutePath(routePath);
  const normalizedRequestPath = normalizeRoutePath(requestPath);

  if (normalizedRoutePath === normalizedRequestPath) {
    return true;
  }

  if (!normalizedRoutePath.includes("[")) {
    return false;
  }

  const routeSegments = normalizedRoutePath.split("/").filter(Boolean);
  const requestSegments = normalizedRequestPath.split("/").filter(Boolean);

  if (routeSegments.length !== requestSegments.length) {
    return false;
  }

  for (let index = 0; index < routeSegments.length; index += 1) {
    const routeSegment = routeSegments[index];
    const requestSegment = requestSegments[index];

    if (isDynamicRouteSegment(routeSegment)) {
      continue;
    }
    if (routeSegment !== requestSegment) {
      return false;
    }
  }

  return true;
}

export function sortRoutedPagesForMatching<T extends RoutablePage>(routedPages: T[]): T[] {
  return [...routedPages].sort(compareRouteSpecificity);
}

export function resolveRoutedPageForPath<T extends RoutablePage>(
  requestPath: string,
  routedPages: T[],
): T | null {
  for (const page of routedPages) {
    if (routePathMatchesRequestPath(page.routePath, requestPath)) {
      return page;
    }
  }
  return null;
}
