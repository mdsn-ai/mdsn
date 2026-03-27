import { describe, expect, it } from "vitest";
import {
  parseBlockHeaderLine,
  parseInputLine,
  parseReadOrWriteLine,
  parseRedirectLine,
  parseSchemaBlock,
} from "../sdk/src/core/protocol/statements";

describe("new core protocol statements", () => {
  it("parses block headers and inputs", () => {
    expect(parseBlockHeaderLine("block login {")).toBe("login");

    expect(parseInputLine("input password!: text secret", "login")).toMatchObject({
      id: "login::input::password",
      name: "password",
      type: "text",
      required: true,
      secret: true,
    });

    expect(parseInputLine('input role!: choice ["admin", "member"]', "login")).toMatchObject({
      id: "login::input::role",
      type: "choice",
      options: ["admin", "member"],
    });
  });

  it("parses read write and redirect statements without result clauses", () => {
    expect(parseReadOrWriteLine('read refresh: "/messages"', "read", "chat", 0)).toMatchObject({
      id: "chat::read::0",
      name: "refresh",
      target: "/messages",
      inputs: [],
      order: 0,
    });

    expect(parseReadOrWriteLine('write send: "/messages" (message)', "write", "chat", 1)).toMatchObject({
      id: "chat::write::1",
      name: "send",
      target: "/messages",
      inputs: ["message"],
      order: 1,
    });

    expect(parseRedirectLine('redirect "/login"', "chat", 2)).toMatchObject({
      id: "chat::redirect::2",
      block: "chat",
      target: "/login",
      order: 2,
    });
  });

  it("parses schema blocks", () => {
    expect(
      parseSchemaBlock(
        [
          "schema payload_schema {",
          '  "type": "object"',
          "}",
        ],
        0,
      ),
    ).toMatchObject({
      schema: {
        name: "payload_schema",
      },
      nextIndex: 3,
    });
  });
});
