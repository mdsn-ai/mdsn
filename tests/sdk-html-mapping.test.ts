import { describe, expect, it } from "vitest";
import { parsePageDefinition } from "../sdk/src/core";
import { createRenderModel, renderPageHtml } from "../sdk/src/web";

const DEFINITIONS_PAGE = `---
id: profile
title: Mapping
---

# Mapping
<!-- mdsn:block profile -->

\`\`\`mdsn
BLOCK profile {
  INPUT text secret required -> password
  INPUT choice ["admin", "user"] required -> role
  INPUT asset required -> avatar
  GET "/load" (password) -> load
  POST "/submit" (password, role, avatar) -> submit
  GET "/done" -> finish
}
\`\`\`
`;

describe("sdk html mapping", () => {
  it("maps block, read, and write definitions into rendered html", () => {
    const document = parsePageDefinition(DEFINITIONS_PAGE);
    const model = createRenderModel(document, {
      mapTarget: (target) => `/__mdsn/actions${target}`,
    });
    const html = renderPageHtml(document);

    expect(model.markdownHtml).toContain('data-mdsn-block-region="profile"');
    expect(model.markdownHtml).toContain('data-mdsn-block-panel="profile"');
    expect(model.markdownHtml).toContain('data-mdsn-read="profile::read::0"');
    expect(model.markdownHtml).toContain('data-mdsn-write="profile::write::1"');
    expect(model.markdownHtml).toContain('data-mdsn-read="profile::read::2"');
    expect(model.markdownHtml).toContain('data-target="/__mdsn/actions/load"');
    expect(model.markdownHtml).toContain('data-target="/__mdsn/actions/submit"');
    expect(model.markdownHtml).toContain('data-target="/__mdsn/actions/done"');
    expect(html).toContain('data-mdsn-root');
    expect(html).toContain('id="mdsn-bootstrap"');
  });

  it("keeps type-only controls in dom while preserving block metadata", () => {
    const document = parsePageDefinition(DEFINITIONS_PAGE);
    const model = createRenderModel(document);

    expect(model.markdownHtml).toContain('data-input-type="asset"');
    expect(model.markdownHtml).not.toContain('data-mdsn-result=');
    expect(model.bootstrap.blocks[0]?.inputs.map((input) => input.type)).toEqual([
      "text",
      "choice",
      "asset",
    ]);
  });
});
