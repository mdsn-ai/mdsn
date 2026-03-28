import { replaceBlockRegionMarkup } from "./block-runtime";
import type { ActionFailure, FragmentActionSuccess } from "../core/action";

type AppliedFragmentResult = {
  kind: "fragment";
  html: string;
};

export type AppliedPageActionResult = AppliedFragmentResult;

export type PageActionTransportResult =
  | ActionFailure
  | (FragmentActionSuccess & { html: string });

export function applyActionResultToPageHtml(
  currentHtml: string,
  blockName: string,
  result: PageActionTransportResult,
): AppliedPageActionResult {
  if (!result.ok) {
    return {
      kind: "fragment",
      html: currentHtml,
    };
  }

  return {
    kind: "fragment",
    html: replaceBlockRegionMarkup(currentHtml, blockName, result.html),
  };
}
