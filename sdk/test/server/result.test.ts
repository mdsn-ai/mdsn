import { describe, expect, it } from "vitest";

import { composePage } from "@mdsnai/sdk/core";
import * as serverBunApi from "@mdsnai/sdk/server/bun";
import * as serverNodeApi from "@mdsnai/sdk/server/node";

import * as serverApi from "../../src/server/index.js";
import { block, fail, ok, signIn, signOut } from "../../src/server/index.js";

describe("result helpers", () => {
  it("keeps low-level node and html helpers out of the main server package entry", () => {
    expect("createNodeRequestListener" in serverApi).toBe(false);
    expect("renderHtmlDocument" in serverApi).toBe(false);
    expect("createNodeHost" in serverApi).toBe(false);
    expect("navigate" in serverApi).toBe(false);
    expect("createHost" in serverNodeApi).toBe(true);
    expect("createNodeRequestListener" in serverNodeApi).toBe(true);
    expect("createHost" in serverBunApi).toBe(true);
  });

  it("wraps successful fragments", () => {
    const result = ok({
      fragment: {
        markdown: "# Hello",
        blocks: []
      },
      status: 201
    });

    expect(result.status).toBe(201);
    expect(result.fragment.markdown).toBe("# Hello");
  });

  it("creates session mutations", () => {
    expect(signIn({ userId: "u_1" })).toEqual({
      type: "sign-in",
      session: { userId: "u_1" }
    });
    expect(signOut()).toEqual({ type: "sign-out" });
  });

  it("wraps failures as fragment responses", () => {
    const result = fail({
      fragment: {
        markdown: "## Error",
        blocks: []
      },
      status: 401
    });

    expect(result.status).toBe(401);
  });

  it("builds a successful block-scoped response directly from a composed page", () => {
    const page = composePage(
      `# Guestbook

<!-- mdsn:block guestbook -->

\`\`\`mdsn
BLOCK guestbook {
  GET "/list" -> refresh label:"Refresh"
}
\`\`\`
`,
      {
        blocks: {
          guestbook: "## 2 live messages\n\n- Welcome\n- Hello"
        }
      }
    );

    const result = block(page, "guestbook");

    expect(result.status).toBe(200);
    expect(result.fragment).toEqual({
      markdown: "## 2 live messages\n\n- Welcome\n- Hello",
      blocks: [page.blocks[0]]
    });
  });
});
