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

function deriveNavigationName(target: string): string {
  const segment = target.split("/").filter(Boolean).at(-1) ?? "next";
  return `open_${segment.replace(/[^a-zA-Z0-9_]+/g, "_")}`;
}

function deriveNavigationLabel(target: string): string {
  const segment = target.split("/").filter(Boolean).at(-1) ?? "Next";
  return `Open ${segment.charAt(0).toUpperCase()}${segment.slice(1)}`;
}

export interface NavigateOptions extends Omit<MdsnActionResult, "fragment" | "page" | "navigation"> {
  blockName: string;
  target: string;
  markdown: string;
  name?: string;
  label?: string;
}

export function navigate(options: NavigateOptions): MdsnActionResult {
  const name = options.name ?? deriveNavigationName(options.target);
  const label = options.label ?? deriveNavigationLabel(options.target);

  return ok({
    ...(typeof options.status === "number" ? { status: options.status } : {}),
    ...(options.headers ? { headers: options.headers } : {}),
    ...(options.session ? { session: options.session } : {}),
    navigation: {
      target: options.target
    },
    fragment: {
      markdown: options.markdown,
      blocks: [
        {
          name: options.blockName,
          inputs: [],
          operations: [
            {
              method: "GET",
              target: options.target,
              name,
              inputs: [],
              label
            }
          ]
        }
      ]
    }
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
