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
schema payload_schema {
  "type": "object",
  "properties": {
    "enabled": { "type": "boolean" }
  }
}

block profile {
  input password!: text secret
  input role!: choice ["admin", "user"]
  input payload!: json payload_schema
  read load: "/load" (password)
  write submit: "/submit" (password, role, payload)
  redirect "/done"
}
\`\`\`
`;

describe("sdk html mapping", () => {
  it("maps block, read, write, and redirect definitions into rendered html", () => {
    const document = parsePageDefinition(DEFINITIONS_PAGE);
    const model = createRenderModel(document, {
      mapTarget: (target) => `/__mdsn/actions${target}`,
    });
    const html = renderPageHtml(document);

    expect(model.markdownHtml).toContain('data-mdsn-block-region="profile"');
    expect(model.markdownHtml).toContain('data-mdsn-block-panel="profile"');
    expect(model.markdownHtml).toContain('data-mdsn-read="profile::read::0"');
    expect(model.markdownHtml).toContain('data-mdsn-write="profile::write::1"');
    expect(model.markdownHtml).toContain('data-mdsn-redirect="profile::redirect::2"');
    expect(model.markdownHtml).toContain('data-target="/__mdsn/actions/load"');
    expect(model.markdownHtml).toContain('data-target="/__mdsn/actions/submit"');
    expect(model.markdownHtml).toContain('data-target="/__mdsn/actions/done"');
    expect(html).toContain('data-mdsn-root');
    expect(html).toContain('id="mdsn-bootstrap"');
  });

  it("keeps schema details out of direct dom output while preserving bootstrap metadata", () => {
    const document = parsePageDefinition(DEFINITIONS_PAGE);
    const model = createRenderModel(document);

    expect(model.markdownHtml).not.toContain("payload_schema");
    expect(model.markdownHtml).not.toContain('data-mdsn-result=');
    expect(model.bootstrap.schemas).toEqual([
      {
        name: "payload_schema",
        shape: {
          type: "object",
          properties: {
            enabled: { type: "boolean" },
          },
        },
      },
    ]);
  });
});
