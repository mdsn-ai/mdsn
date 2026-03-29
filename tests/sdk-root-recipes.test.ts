import { describe, expect, it } from "vitest";
import * as sdk from "../sdk/src";

describe("sdk root recipes", () => {
  it("supports the built-in framework recipe", () => {
    expect(typeof sdk.createFrameworkApp).toBe("function");
    expect(typeof sdk.defineConfig).toBe("function");
  });

  it("supports the custom server recipe", () => {
    expect(typeof sdk.createHostedApp).toBe("function");
    expect(typeof sdk.defineActions).toBe("function");
    expect(typeof sdk.renderHostedPage).toBe("function");
    expect(typeof sdk.renderMarkdownFragment).toBe("function");
    expect(typeof sdk.renderMarkdownValue).toBe("function");
    expect(typeof sdk.parseActionInputs).toBe("function");
    expect(typeof sdk.createActionContextFromRequest).toBe("function");
  });

  it("supports the headless frontend recipe", () => {
    expect(typeof sdk.parsePage).toBe("function");
    expect(typeof sdk.parseFragment).toBe("function");
    expect(typeof sdk.parseMarkdown).toBe("function");
  });
});
