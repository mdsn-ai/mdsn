import { describe, expect, it } from "vitest";
import {
  renderActionNotAvailableFragment,
  renderAuthRequiredFragment,
  renderErrorFragment,
  renderInternalErrorFragment,
  renderUnsupportedContentTypeFragment,
} from "../sdk/src/server";

describe("server error fragments", () => {
  it("renders a generic markdown error fragment", () => {
    const markdown = renderErrorFragment({
      heading: "## Custom Status",
      message: "Something needs attention.",
      nextStep: "Try the action again with a valid payload.",
    });

    expect(markdown).toContain("## Custom Status");
    expect(markdown).toContain("Something needs attention.");
    expect(markdown).toContain("Try the action again with a valid payload.");
  });

  it("renders built-in hosted action failure fragments", () => {
    expect(renderActionNotAvailableFragment()).toContain("This action is not available on the current server.");
    expect(renderUnsupportedContentTypeFragment()).toContain("Unsupported content type for write action.");
    expect(renderInternalErrorFragment({ error: new Error("boom") })).toContain("boom");
  });

  it("renders a default auth-required fragment with login and register actions", () => {
    const markdown = renderAuthRequiredFragment();
    expect(markdown).toContain("## Login Status");
    expect(markdown).toContain('POST "/login" (email, password) -> login');
    expect(markdown).toContain('GET "/register" -> go_register');
    expect(markdown).toContain("BLOCK auth");
  });
});
