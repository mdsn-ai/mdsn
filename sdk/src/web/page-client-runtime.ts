import { replaceBlockRegionMarkup } from "./block-runtime";

type AppliedFragmentResult = {
  kind: "fragment";
  html: string;
};

export type AppliedPageActionResult = AppliedFragmentResult;

export type PageActionTransportResult = {
  html: string;
};

export function applyActionResultToPageHtml(
  currentHtml: string,
  blockName: string,
  result: PageActionTransportResult,
): AppliedPageActionResult {
  return {
    kind: "fragment",
    html: replaceBlockRegionMarkup(currentHtml, blockName, result.html),
  };
}
