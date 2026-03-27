import { describe, expect, it } from "vitest";
import {
  normalizeActionResult,
  redirectActionResult,
  type ActionFailure,
} from "../sdk/src/core/action";

describe("new core action contract", () => {
  it("normalizes string results into markdown fragments", () => {
    expect(normalizeActionResult("# Hello")).toEqual({
      ok: true,
      kind: "fragment",
      markdown: "# Hello",
    });
  });

  it("preserves explicit fragment and redirect results", () => {
    expect(
      normalizeActionResult({
        ok: true,
        kind: "fragment",
        markdown: "## Updated",
      }),
    ).toEqual({
      ok: true,
      kind: "fragment",
      markdown: "## Updated",
    });

    expect(normalizeActionResult(redirectActionResult("/login"))).toEqual({
      ok: true,
      kind: "redirect",
      location: "/login",
    });
  });

  it("preserves action failures", () => {
    const failure: ActionFailure = {
      ok: false,
      errorCode: "invalid_input",
      message: "Name is required",
      fieldErrors: {
        name: "Required",
      },
    };

    expect(normalizeActionResult(failure)).toEqual(failure);
  });

  it("rejects invalid success payloads", () => {
    expect(() =>
      normalizeActionResult({
        ok: true,
        kind: "fragment",
      }),
    ).toThrow("Invalid fragment action result");
  });
});
