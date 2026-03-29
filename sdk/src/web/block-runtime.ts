import { escapeHtml, escapeRegExp } from "../core";

function createRegionMarker(kind: "start" | "end", blockName: string): string {
  return `<!--mdsn:block-region:${kind}:${escapeHtml(blockName)}-->`;
}

export function createBlockRegionMarkup(blockName: string, innerHtml: string): string {
  return `${createRegionMarker("start", blockName)}<section class="mdsn-block-region" data-mdsn-block-region="${escapeHtml(blockName)}">${innerHtml}</section>${createRegionMarker("end", blockName)}`;
}

const blockRegionPatterns = new Map<string, RegExp>();

function getBlockRegionPattern(blockName: string): RegExp {
  let pattern = blockRegionPatterns.get(blockName);
  if (!pattern) {
    const escapedName = escapeRegExp(escapeHtml(blockName));
    pattern = new RegExp(
      `<!--mdsn:block-region:start:${escapedName}-->[\\s\\S]*?<!--mdsn:block-region:end:${escapedName}-->`,
      "g",
    );
    blockRegionPatterns.set(blockName, pattern);
  }
  return pattern;
}

export function replaceBlockRegionMarkup(
  html: string,
  blockName: string,
  replacementInnerHtml: string,
): string {
  const pattern = getBlockRegionPattern(blockName);
  return html.replace(pattern, createBlockRegionMarkup(blockName, replacementInnerHtml));
}
