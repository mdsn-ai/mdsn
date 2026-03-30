import { describe, expect, it } from "vitest";

import { negotiateRepresentation } from "../../src/core/index.js";

describe("negotiateRepresentation", () => {
  it("returns event-stream when explicitly requested", () => {
    expect(negotiateRepresentation("text/event-stream")).toBe("event-stream");
    expect(negotiateRepresentation("text/event-stream, text/html;q=0.9")).toBe("event-stream");
  });

  it("prefers markdown when explicitly requested", () => {
    expect(negotiateRepresentation("text/markdown")).toBe("markdown");
    expect(negotiateRepresentation("text/markdown, text/html;q=0.9")).toBe("markdown");
    expect(negotiateRepresentation("text/html, text/markdown")).toBe("markdown");
  });

  it("returns html for wildcard and missing accept", () => {
    expect(negotiateRepresentation("*/*")).toBe("html");
    expect(negotiateRepresentation(undefined)).toBe("html");
    expect(negotiateRepresentation("text/markdown;q=0, text/html")).toBe("html");
  });

  it("returns not-acceptable for unsupported accept", () => {
    expect(negotiateRepresentation("application/json")).toBe("not-acceptable");
  });

  it("honors q-weight preferences across supported representations", () => {
    expect(negotiateRepresentation("text/html;q=0.9, text/markdown;q=0.8")).toBe("html");
    expect(negotiateRepresentation("text/event-stream;q=0.4, text/markdown;q=0.8")).toBe("markdown");
  });
});
