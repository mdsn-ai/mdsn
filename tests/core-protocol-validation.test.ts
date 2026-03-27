import { describe, expect, it } from "vitest";
import { validateDocumentStructure } from "../sdk/src/core/protocol/validation";

describe("new core protocol validation", () => {
  it("accepts a block model with static redirects and block anchors", () => {
    expect(() => {
      validateDocumentStructure(
        [],
        [
          {
            name: "login",
            inputs: [
              {
                id: "login::input::account",
                block: "login",
                name: "account",
                type: "text",
                required: true,
                secret: false,
              },
            ],
            reads: [],
            writes: [
              {
                id: "login::write::0",
                block: "login",
                name: "submit",
                target: "/login",
                inputs: ["account"],
                order: 0,
              },
            ],
            redirects: [
              {
                id: "login::redirect::1",
                block: "login",
                target: "/chat",
                order: 1,
              },
            ],
          },
        ],
        [{ name: "login" }],
      );
    }).not.toThrow();
  });

  it("rejects missing schema references and unknown block anchors", () => {
    expect(() => {
      validateDocumentStructure(
        [],
        [
          {
            name: "search",
            inputs: [
              {
                id: "search::input::filters",
                block: "search",
                name: "filters",
                type: "json",
                required: true,
                secret: false,
                schema: "filters_schema",
              },
            ],
            reads: [],
            writes: [],
            redirects: [],
          },
        ],
        [{ name: "missing" }],
      );
    }).toThrow();
  });
});
