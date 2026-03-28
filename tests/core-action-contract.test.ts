import { describe, expect, it } from "vitest";
import { executeActionHandler } from "../sdk/src/server/action-host";

describe("new core action contract", () => {
  it("accepts markdown action results", async () => {
    await expect(
      executeActionHandler(async () => "# Hello"),
    ).resolves.toBe("# Hello");
  });

  it("rejects non-markdown action results", async () => {
    const invalidHandler = (async () => ({ ok: false })) as unknown as (() => Promise<string>);
    await expect(
      executeActionHandler(invalidHandler),
    ).rejects.toThrow("Invalid action result: expected markdown string");
  });
});
