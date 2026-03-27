import { describe, expect, it } from "vitest";
import { createBlockRegionMarkup, replaceBlockRegionMarkup } from "../sdk/src/web/block-runtime";

describe("new web block runtime", () => {
  it("replaces only the targeted block region", () => {
    const before = `
<article>
  ${createBlockRegionMarkup("chat", "<p>Old chat</p>")}
  ${createBlockRegionMarkup("profile", "<p>Old profile</p>")}
</article>
`.trim();

    const after = replaceBlockRegionMarkup(before, "chat", "<p>New chat</p>");

    expect(after).toContain('data-mdsn-block-region="chat"');
    expect(after).toContain("<p>New chat</p>");
    expect(after).not.toContain("<p>Old chat</p>");
    expect(after).toContain("<p>Old profile</p>");
  });
});
