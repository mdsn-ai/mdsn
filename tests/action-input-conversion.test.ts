import { describe, expect, it } from "vitest";
import {
  normalizeActionInputPayloadToMarkdown,
  parseActionInputs,
  serializeActionInputsAsMarkdown,
} from "../sdk/src/server/action-inputs";

describe("action input conversion", () => {
  it("converts JSON envelope payloads to canonical markdown lines", () => {
    const payload = {
      inputs: {
        username: "Agent",
        retries: 2,
        enabled: true,
      },
    };

    expect(normalizeActionInputPayloadToMarkdown(payload)).toBe([
      '- username: "Agent"',
      "- retries: 2",
      "- enabled: true",
    ].join("\n"));
  });

  it("converts flat JSON payloads to canonical markdown lines", () => {
    const payload = {
      username: "FlatAgent",
      email: "flat@example.com",
    };

    expect(normalizeActionInputPayloadToMarkdown(payload)).toBe([
      '- username: "FlatAgent"',
      '- email: "flat@example.com"',
    ].join("\n"));
  });

  it("parses markdown key-value payloads with list/quote/input prefixes", () => {
    const payload = [
      "# Inputs",
      '- username: "MarkdownAgent"',
      '1. email: "md@example.com"',
      '> message: "hello"',
      "input retries: 3",
      "meta: {\"role\":\"admin\"}",
      "tags: [\"alpha\", \"beta\"]",
      "enabled: true",
      "score: 9.5",
      "empty: null",
      "```md",
      "ignored: true",
      "```",
    ].join("\n");

    expect(parseActionInputs(payload)).toEqual({
      username: "MarkdownAgent",
      email: "md@example.com",
      message: "hello",
      retries: 3,
      meta: { role: "admin" },
      tags: ["alpha", "beta"],
      enabled: true,
      score: 9.5,
      empty: null,
      ignored: true,
    });

    expect(normalizeActionInputPayloadToMarkdown(payload)).toBe([
      '- username: "MarkdownAgent"',
      '- email: "md@example.com"',
      '- message: "hello"',
      "- retries: 3",
      '- meta: {"role":"admin"}',
      '- tags: ["alpha","beta"]',
      "- enabled: true",
      "- score: 9.5",
      "- empty: null",
      "- ignored: true",
    ].join("\n"));
  });

  it("supports single-quoted scalar values and ignores invalid keys", () => {
    const payload = [
      "title: 'Hello: world'",
      "bad key: ignored",
      "still_ok: yes",
    ].join("\n");

    expect(parseActionInputs(payload)).toEqual({
      title: "Hello: world",
      still_ok: "yes",
    });
  });

  it("keeps choice-like scalar values as markdown string scalars", () => {
    const payload = {
      inputs: {
        role: "landlord",
      },
    };

    expect(parseActionInputs(payload)).toEqual({
      role: "landlord",
    });

    expect(normalizeActionInputPayloadToMarkdown(payload)).toBe('- role: "landlord"');

    expect(parseActionInputs("role: landlord")).toEqual({
      role: "landlord",
    });
    expect(normalizeActionInputPayloadToMarkdown("role: landlord")).toBe('- role: "landlord"');
  });

  it("covers canonical conversion for all protocol input types", () => {
    const payload = {
      inputs: {
        nickname: "Agent",
        retries: 7,
        enabled: false,
        role: "farmer",
        attachment: {
          name: "avatar.png",
          type: "image/png",
          size: 2048,
        },
        filters: {
          query: "hello",
          limit: 10,
        },
      },
    };

    expect(parseActionInputs(payload)).toEqual({
      nickname: "Agent",
      retries: 7,
      enabled: false,
      role: "farmer",
      attachment: {
        name: "avatar.png",
        type: "image/png",
        size: 2048,
      },
      filters: {
        query: "hello",
        limit: 10,
      },
    });

    expect(normalizeActionInputPayloadToMarkdown(payload)).toBe([
      '- nickname: "Agent"',
      "- retries: 7",
      "- enabled: false",
      '- role: "farmer"',
      '- attachment: {"name":"avatar.png","type":"image/png","size":2048}',
      '- filters: {"query":"hello","limit":10}',
    ].join("\n"));

    const markdownPayload = [
      'nickname: "Agent"',
      "retries: 7",
      "enabled: false",
      "role: farmer",
      'attachment: {"name":"avatar.png","type":"image/png","size":2048}',
      'filters: {"query":"hello","limit":10}',
    ].join("\n");

    expect(parseActionInputs(markdownPayload)).toEqual({
      nickname: "Agent",
      retries: 7,
      enabled: false,
      role: "farmer",
      attachment: {
        name: "avatar.png",
        type: "image/png",
        size: 2048,
      },
      filters: {
        query: "hello",
        limit: 10,
      },
    });
  });

  it("preserves file input objects with host-specific extension fields", () => {
    const payload = {
      inputs: {
        attachment: {
          name: "avatar.png",
          type: "image/png",
          size: 2048,
          id: "file_123",
          url: "https://files.example.com/avatar.png",
          checksum: "sha256:abc123",
        },
      },
    };

    expect(parseActionInputs(payload)).toEqual({
      attachment: {
        name: "avatar.png",
        type: "image/png",
        size: 2048,
        id: "file_123",
        url: "https://files.example.com/avatar.png",
        checksum: "sha256:abc123",
      },
    });

    expect(normalizeActionInputPayloadToMarkdown(payload)).toBe(
      '- attachment: {"name":"avatar.png","type":"image/png","size":2048,"id":"file_123","url":"https://files.example.com/avatar.png","checksum":"sha256:abc123"}',
    );

    const markdownPayload = 'attachment: {"name":"avatar.png","type":"image/png","size":2048,"id":"file_123","url":"https://files.example.com/avatar.png","checksum":"sha256:abc123"}';
    expect(parseActionInputs(markdownPayload)).toEqual({
      attachment: {
        name: "avatar.png",
        type: "image/png",
        size: 2048,
        id: "file_123",
        url: "https://files.example.com/avatar.png",
        checksum: "sha256:abc123",
      },
    });
  });

  it("returns empty inputs for unsupported payload types", () => {
    expect(parseActionInputs(undefined)).toEqual({});
    expect(parseActionInputs(42)).toEqual({});
    expect(normalizeActionInputPayloadToMarkdown(undefined)).toBe("");
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
