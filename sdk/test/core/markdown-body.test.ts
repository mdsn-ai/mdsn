import { describe, expect, it } from "vitest";

import { parseMarkdownBody, serializeMarkdownBody } from "../../src/core/index.js";

describe("parseMarkdownBody", () => {
  it("parses comma-separated markdown key value pairs", () => {
    expect(
      parseMarkdownBody(`nickname: "Guest", message: "Hello"`)
    ).toEqual({
      nickname: "Guest",
      message: "Hello"
    });
  });

  it("remains compatible with newline-separated markdown key value pairs", () => {
    expect(
      parseMarkdownBody(`nickname: "Guest"
message: "Hello"`)
    ).toEqual({
      nickname: "Guest",
      message: "Hello"
    });
  });

  it("rejects malformed key value lines", () => {
    expect(() => parseMarkdownBody("nickname=Guest")).toThrow(/Invalid markdown body line/);
  });

  it("round-trips commas, quotes, and backslashes safely", () => {
    const body = serializeMarkdownBody({
      title: 'He said "ship it"',
      summary: "A, B, and C",
      path: "drafts\\today"
    });

    expect(parseMarkdownBody(body)).toEqual({
      title: 'He said "ship it"',
      summary: "A, B, and C",
      path: "drafts\\today"
    });
  });
});
