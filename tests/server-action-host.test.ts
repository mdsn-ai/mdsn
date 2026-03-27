import { describe, expect, it } from "vitest";
import { executeActionHandler } from "../sdk/src/server/action-host";

describe("new server action host", () => {
  it("normalizes markdown fragments returned by handlers", async () => {
    await expect(
      executeActionHandler(async () => "# Updated"),
    ).resolves.toEqual({
      ok: true,
      kind: "fragment",
      markdown: "# Updated",
    });
  });

  it("preserves redirect results", async () => {
    await expect(
      executeActionHandler(async () => ({
        ok: true,
        kind: "redirect",
        location: "/login",
      })),
    ).resolves.toEqual({
      ok: true,
      kind: "redirect",
      location: "/login",
    });
  });

  it("preserves validation failures", async () => {
    await expect(
      executeActionHandler(async () => ({
        ok: false,
        errorCode: "invalid_input",
        fieldErrors: {
          message: "Required",
        },
      })),
    ).resolves.toEqual({
      ok: false,
      errorCode: "invalid_input",
      fieldErrors: {
        message: "Required",
      },
    });
  });
});
