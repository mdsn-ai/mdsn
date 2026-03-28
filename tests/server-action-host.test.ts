import { describe, expect, it } from "vitest";
import { executeActionHandler } from "../sdk/src/server/action-host";

describe("new server action host", () => {
  it("returns markdown fragments returned by handlers", async () => {
    await expect(
      executeActionHandler(async () => "# Updated"),
    ).resolves.toEqual("# Updated");
  });

  it("rejects non-markdown results", async () => {
    const invalidHandler = (async () => ({ ok: false })) as unknown as (() => Promise<string>);
    await expect(
      executeActionHandler(invalidHandler),
    ).rejects.toThrow("Invalid action result: expected markdown string");
  });
});
