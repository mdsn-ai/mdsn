import { describe, expect, it } from "vitest";
import {
  normalizeActionInputPayloadToMarkdown,
  parseActionInputs,
  serializeActionInputsAsMarkdown,
} from "../sdk/src/server/action-inputs";

describe("action input conversion", () => {
  it("parses markdown key-value payloads", () => {
    const payload = [
      'username: "MarkdownAgent"',
      "retries: 3",
      "enabled: true",
      '- role: "owner"',
      'asset: {"name":"avatar.png","type":"image/png"}',
    ].join("\n");

    expect(parseActionInputs(payload)).toEqual({
      username: "MarkdownAgent",
      retries: 3,
      enabled: true,
      role: "owner",
      asset: {
        name: "avatar.png",
        type: "image/png",
      },
    });
  });

  it("keeps parser strict and ignores non key-value lines", () => {
    const payload = [
      "# Inputs",
      "> role: ignored",
      "INPUT role: ignored",
      "1. role: ignored",
      'role: "kept"',
    ].join("\n");

    expect(parseActionInputs(payload)).toEqual({
      role: "kept",
    });
  });

  it("parses query-like object payloads without envelope unwrapping", () => {
    expect(parseActionInputs({
      query: "hello",
      limit: "10",
      enabled: "true",
      tags: ["first", "second"],
      ignored: { nested: true },
      "bad key": "nope",
    })).toEqual({
      query: "hello",
      limit: 10,
      enabled: true,
      tags: "first",
    });

    // No compatibility unwrapping for { inputs: ... }.
    expect(parseActionInputs({
      inputs: {
        query: "hello",
      },
    })).toEqual({});
  });

  it("normalizes payloads back to canonical markdown lines", () => {
    const payload = [
      'nickname: "Agent"',
      "retries: 7",
      "enabled: false",
    ].join("\n");

    expect(normalizeActionInputPayloadToMarkdown(payload)).toBe([
      '- nickname: "Agent"',
      "- retries: 7",
      "- enabled: false",
    ].join("\n"));
  });

  it("serializes explicit input maps into canonical markdown format", () => {
    expect(serializeActionInputsAsMarkdown({
      message: "hello",
      count: 1,
      keep: false,
      optional: undefined,
    })).toBe([
      '- message: "hello"',
      "- count: 1",
      "- keep: false",
    ].join("\n"));
  });
});
