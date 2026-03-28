import { describe, expect, it } from "vitest";
import { createPageBootstrap } from "../sdk/src/web/page-bootstrap";

describe("new web page bootstrap", () => {
  it("seeds only input state for the new markdown-fragment model", () => {
    const bootstrap = createPageBootstrap({
      frontmatter: {},
      markdown: "# Profile",
      blockAnchors: [{ name: "profile" }],
      blocks: [
        {
          name: "profile",
          inputs: [
            {
              id: "profile::input::enabled",
              block: "profile",
              name: "enabled",
              type: "boolean",
              required: false,
              secret: false,
            },
            {
              id: "profile::input::asset",
              block: "profile",
              name: "asset",
              type: "asset",
              required: true,
              secret: false,
            },
          ],
          reads: [],
          writes: [],
        },
      ],
    });

    expect(bootstrap).toEqual({
      version: "vNext",
      frontmatter: {},
      markdown: "# Profile",
      blockAnchors: [{ name: "profile" }],
      blocks: [
        {
          name: "profile",
          inputs: [
            {
              id: "profile::input::enabled",
              block: "profile",
              name: "enabled",
              type: "boolean",
              required: false,
              secret: false,
            },
            {
              id: "profile::input::asset",
              block: "profile",
              name: "asset",
              type: "asset",
              required: true,
              secret: false,
            },
          ],
          reads: [],
          writes: [],
        },
      ],
      inputState: {
        "profile::input::enabled": false,
        "profile::input::asset": "",
      },
    });
  });
});
