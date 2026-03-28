import { describe, expect, it } from "vitest";
import { parsePageDefinition } from "../sdk/src/core";
import { createRenderModel, renderPageHtml } from "../sdk/src/web";

const PAGE = `---
id: results
title: Block Rendering
---

# Block Rendering

<!-- mdsn:block results -->
<!-- mdsn:block secondary -->

\`\`\`mdsn
block results {
  GET "/api/refresh" -> refresh
  POST "/api/submit" () -> submit
}

block secondary {
  GET "/done" -> finish
}
\`\`\`
`;

describe("sdk block rendering", () => {
  it("renders block anchors as block regions without result containers", () => {
    const document = parsePageDefinition(PAGE);
    const model = createRenderModel(document);

    expect(model.markdownHtml).toContain('data-mdsn-block-region="results"');
    expect(model.markdownHtml).toContain('data-mdsn-block-region="secondary"');
    expect(model.markdownHtml).toContain('data-mdsn-read="results::read::0"');
    expect(model.markdownHtml).toContain('data-mdsn-write="results::write::1"');
    expect(model.markdownHtml).toContain('data-mdsn-read="secondary::read::0"');
    expect(model.markdownHtml).not.toContain('data-mdsn-result=');
  });

  it("renders the default html shell around the block regions", () => {
    const document = parsePageDefinition(PAGE);
    const html = renderPageHtml(document);

    expect(html).toContain('data-mdsn-root');
    expect(html).toContain('id="mdsn-bootstrap"');
    expect(html).toContain('<script src="/__mdsn/client.js" defer></script>');
  });
});
