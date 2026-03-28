function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createRegionMarker(kind: "start" | "end", blockName: string): string {
  return `<!--mdsn:block-region:${kind}:${escapeHtml(blockName)}-->`;
}

export function createBlockRegionMarkup(blockName: string, innerHtml: string): string {
  return `${createRegionMarker("start", blockName)}<section class="mdsn-block-region" data-mdsn-block-region="${escapeHtml(blockName)}">${innerHtml}</section>${createRegionMarker("end", blockName)}`;
}

export function replaceBlockRegionMarkup(
  html: string,
  blockName: string,
  replacementInnerHtml: string,
): string {
  const escapedName = escapeHtml(blockName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<!--mdsn:block-region:start:${escapedName}-->[\\s\\S]*?<!--mdsn:block-region:end:${escapedName}-->`,
    "g",
  );
  return html.replace(pattern, createBlockRegionMarkup(blockName, replacementInnerHtml));
}
