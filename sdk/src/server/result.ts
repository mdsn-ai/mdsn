import type { MdsnComposedPage } from "../core/index.js";

import type { MdsnActionResult, MdsnStreamChunk, MdsnStreamResult } from "./types.js";

export function ok(result: MdsnActionResult): MdsnActionResult {
  return {
    status: 200,
    ...result
  };
}

export function fail(result: MdsnActionResult): MdsnActionResult {
  return {
    status: 400,
    ...result
  };
}

export function block(
  page: MdsnComposedPage,
  blockName: string,
  result: Omit<MdsnActionResult, "fragment"> = {}
): MdsnActionResult {
  return ok({
    ...result,
    fragment: page.fragment(blockName)
  });
}

export function stream(
  source: AsyncIterable<MdsnStreamChunk> | Iterable<MdsnStreamChunk>,
  result: Omit<MdsnStreamResult, "stream"> = {}
): MdsnStreamResult {
  return {
    status: 200,
    ...result,
    stream: source
  };
}
