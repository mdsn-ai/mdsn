type ParsedAcceptEntry = {
  mediaType: string;
  quality: number;
};

function parseAcceptHeader(acceptHeader?: string): ParsedAcceptEntry[] {
  if (!acceptHeader || acceptHeader.trim().length === 0) {
    return [];
  }

  return acceptHeader
    .split(",")
    .map((raw) => raw.trim())
    .filter((raw) => raw.length > 0)
    .map((part) => {
      const [mediaTypeToken, ...parameterTokens] = part.split(";");
      const mediaType = mediaTypeToken.trim().toLowerCase();
      const qualityToken = parameterTokens.find((parameter) => parameter.trim().toLowerCase().startsWith("q="));
      const parsedQuality = qualityToken ? Number.parseFloat(qualityToken.split("=")[1] ?? "") : 1;
      const quality = Number.isFinite(parsedQuality) ? Math.min(Math.max(parsedQuality, 0), 1) : 1;
      return {
        mediaType,
        quality,
      };
    })
    .filter((entry) => entry.mediaType.length > 0);
}

function hasAcceptableMediaType(
  acceptHeader: string | undefined,
  matcher: (mediaType: string) => boolean,
): boolean {
  return parseAcceptHeader(acceptHeader).some((entry) => entry.quality > 0 && matcher(entry.mediaType));
}

export function wantsHtml(acceptHeader?: string): boolean {
  return hasAcceptableMediaType(
    acceptHeader,
    (mediaType) => mediaType === "text/html" || mediaType === "application/xhtml+xml",
  );
}

export function wantsMarkdown(acceptHeader?: string): boolean {
  return hasAcceptableMediaType(acceptHeader, (mediaType) => mediaType === "text/markdown");
}

function supportsAnyRepresentation(mediaType: string): boolean {
  if (mediaType === "*/*") return true;
  if (mediaType === "text/*") return true;
  if (mediaType === "text/html") return true;
  if (mediaType === "application/xhtml+xml") return true;
  if (mediaType === "text/markdown") return true;
  return false;
}

export function isNotAcceptableRequest(acceptHeader?: string): boolean {
  const entries = parseAcceptHeader(acceptHeader);
  if (entries.length === 0) {
    return false;
  }

  return !entries.some((entry) => entry.quality > 0 && supportsAnyRepresentation(entry.mediaType));
}
