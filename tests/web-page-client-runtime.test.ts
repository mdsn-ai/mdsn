import { describe, expect, it } from "vitest";
import { applyActionResultToPageHtml } from "../sdk/src/web/page-client-runtime";

describe("new web page client runtime", () => {
  it("replaces the current block region when an action returns a fragment", () => {
    const currentHtml = `
<article>
  <section class="mdsn-block-region" data-mdsn-block-region="chat">
    <section class="mdsn-block-panel" data-mdsn-block-panel="chat">
      <p>Old chat</p>
    </section>
  </section>
  <section class="mdsn-block-region" data-mdsn-block-region="profile">
    <section class="mdsn-block-panel" data-mdsn-block-panel="profile">
      <p>Profile</p>
    </section>
  </section>
</article>
`.trim();

    const result = applyActionResultToPageHtml(currentHtml, "chat", {
      html: "<h2>Updated</h2><p>Saved.</p>",
    });

    expect(result.kind).toBe("fragment");
    if (result.kind !== "fragment") {
      throw new Error("Expected fragment result");
    }

    expect(result.html).toContain("<h2>Updated</h2>");
    expect(result.html).toContain("<p>Saved.</p>");
    expect(result.html).toContain("<p>Profile</p>");
    expect(result.html).not.toContain("<p>Old chat</p>");
  });

  it("uses server-rendered fragment html when it is provided", () => {
    const currentHtml = `
<article>
  <!--mdsn:block-region:start:chat--><section class="mdsn-block-region" data-mdsn-block-region="chat"><p>Old chat</p></section><!--mdsn:block-region:end:chat-->
</article>
`.trim();

    const result = applyActionResultToPageHtml(currentHtml, "chat", {
      html: "<h2>Updated from server</h2><p>Exact HTML</p>",
    });

    expect(result.kind).toBe("fragment");
    if (result.kind !== "fragment") {
      throw new Error("Expected fragment result");
    }

    expect(result.html).toContain("<h2>Updated from server</h2>");
    expect(result.html).toContain("<p>Exact HTML</p>");
    expect(result.html).not.toContain("<h2>Ignored</h2>");
    expect(result.html.match(/data-mdsn-block-region="chat"/g)?.length).toBe(1);
  });

  it("renders a new interactive block when the fragment contains mdsn", () => {
    const currentHtml = `<section class="mdsn-block-region" data-mdsn-block-region="chat"><p>Old</p></section>`;

    const result = applyActionResultToPageHtml(currentHtml, "chat", {
      html: `<h1>Chat</h1><section class="mdsn-block-panel" data-mdsn-block-panel="chat"><header><strong>chat</strong></header><div class="mdsn-block-inputs"><label>message<input id="chat::input::message" type="text" data-mdsn-input="chat::input::message" data-input-name="message" data-input-type="text" data-required="true" required /></label></div><div class="mdsn-block-actions"><button type="button" data-mdsn-write="chat::write::0" data-target="/__mdsn/actions/messages">send</button></div></section>`,
    });

    expect(result.kind).toBe("fragment");
    if (result.kind !== "fragment") {
      throw new Error("Expected fragment result");
    }

    expect(result.html).toContain('data-mdsn-block-region="chat"');
    expect(result.html).toContain('data-mdsn-write="chat::write::0"');
    expect(result.html).toContain('data-input-name="message"');
    expect(result.html).toContain('data-target="/__mdsn/actions/messages"');
  });
});
