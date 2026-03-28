import { describe, expect, it } from "vitest";
import {
  parseBlockHeaderLine,
  parseInputLine,
  parseReadOrWriteLine,
} from "../sdk/src/core/protocol/statements";

describe("new core protocol statements", () => {
  it("parses block headers and inputs", () => {
    expect(parseBlockHeaderLine("block login {")).toBe("login");

    expect(parseInputLine("INPUT text secret required -> password", "login")).toMatchObject({
      id: "login::input::password",
      name: "password",
      type: "text",
      required: true,
      secret: true,
    });

    expect(parseInputLine('INPUT choice ["admin", "member"] required -> role', "login")).toMatchObject({
      id: "login::input::role",
      type: "choice",
      options: ["admin", "member"],
    });
  });

  it("parses GET and POST statements", () => {
    expect(parseReadOrWriteLine('GET "/messages" -> refresh', "read", "chat", 0)).toMatchObject({
      id: "chat::read::0",
      name: "refresh",
      target: "/messages",
      inputs: [],
      order: 0,
    });

    expect(parseReadOrWriteLine('POST "/messages" (message) -> send', "write", "chat", 1)).toMatchObject({
      id: "chat::write::1",
      name: "send",
      target: "/messages",
      inputs: ["message"],
      order: 1,
    });
  });
});
