import { replaceBlockRegionMarkup } from "./block-runtime";
import type { ActionFailure, FragmentActionSuccess, RedirectActionSuccess } from "../core/action";

type AppliedFragmentResult = {
  kind: "fragment";
  html: string;
};

type AppliedRedirectResult = {
  kind: "redirect";
  location: string;
};

export type AppliedPageActionResult = AppliedFragmentResult | AppliedRedirectResult;

export type PageActionTransportResult =
  | ActionFailure
  | RedirectActionSuccess
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

  if (result.kind === "redirect") {
    return {
      kind: "redirect",
      location: result.location,
    };
  }

  return {
    kind: "fragment",
    html: replaceBlockRegionMarkup(currentHtml, blockName, result.html),
  };
}
