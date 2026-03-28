import { describe, expect, it } from "vitest";
import { validateDocumentStructure } from "../sdk/src/core/protocol/validation";

describe("new core protocol validation", () => {
  it("accepts a block model with operations and block anchors", () => {
    expect(() => {
      validateDocumentStructure(
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
          },
        ],
        [{ name: "login" }],
      );
    }).not.toThrow();
  });

  it("rejects unknown block anchors", () => {
    expect(() => {
      validateDocumentStructure(
        [
          {
            name: "search",
            inputs: [
              {
                id: "search::input::filters",
                block: "search",
                name: "filters",
                type: "text",
                required: true,
                secret: false,
              },
            ],
            reads: [],
            writes: [],
          },
        ],
        [{ name: "missing" }],
      );
    }).toThrow();
  });
});
