import { replaceBlockRegionMarkup } from "./block-runtime";

export type PageActionTransportResult = {
  html: string;
};

export function applyActionResultToPageHtml(
  currentHtml: string,
  blockName: string,
  result: PageActionTransportResult,
): string {
  return replaceBlockRegionMarkup(currentHtml, blockName, result.html);
}
