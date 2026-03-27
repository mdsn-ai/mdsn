import { describe, expect, it } from "vitest";
import { parsePageDefinition } from "../sdk/src/core";
import { createRenderModel, getClientRuntimeScript } from "../sdk/src/web";

const PAGE = `---
id: profile
title: Public Web Entry
---

# Public Web Entry

<!-- mdsn:block profile -->

\`\`\`mdsn
block profile {
  input role!: choice ["admin", "user"]
  read load_messages: "/messages" (role)
}
\`\`\`
`;

describe("sdk public web entry", () => {
  it("maps action targets through the public render model", () => {
    const document = parsePageDefinition(PAGE);
    const model = createRenderModel(document, {
      mapTarget: (target) => `/__mdsn/actions${target}`,
    });

    expect(model.markdownHtml).toContain('data-target="/__mdsn/actions/messages"');
    expect(model.markdownHtml).not.toContain('data-target="/messages"');
    expect(model.bootstrap.version).toBe("vNext");
  });

  it("serves the vNext page client runtime script", () => {
    const script = getClientRuntimeScript();

    expect(script).toContain('bootstrap.version !== "vNext"');
    expect(script).toContain("replaceBlockRegionMarkup(");
    expect(script).toContain('typeof result.html === "string"');
    expect(script).toContain("pathname: window.location.pathname");
  });
});
