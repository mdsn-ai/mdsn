import type {
  ActionFailure,
  ActionResult,
  FragmentActionSuccess,
} from "./types";

function isFailure(value: unknown): value is ActionFailure {
  return !!value && typeof value === "object" && (value as { ok?: unknown }).ok === false;
}

function isFragmentSuccess(value: unknown): value is FragmentActionSuccess {
  return !!value
    && typeof value === "object"
    && (value as { ok?: unknown }).ok === true
    && (value as { kind?: unknown }).kind === "fragment"
    && typeof (value as { markdown?: unknown }).markdown === "string";
}

export function fragmentActionResult(markdown: string): FragmentActionSuccess {
  return {
    ok: true,
    kind: "fragment",
    markdown,
  };
}

export function normalizeActionResult(value: unknown): ActionResult {
  if (typeof value === "string") {
    return fragmentActionResult(value);
  }

  if (isFailure(value) || isFragmentSuccess(value)) {
    return value;
  }

  if (
    value
    && typeof value === "object"
    && (value as { ok?: unknown }).ok === true
    && (value as { kind?: unknown }).kind === "fragment"
  ) {
    throw new Error("Invalid fragment action result");
  }

  throw new Error("Invalid action result");
}
