import { describe, expect, it } from "vitest";
import { createPageBootstrap } from "../sdk/src/web/page-bootstrap";

describe("new web page bootstrap", () => {
  it("seeds only input state for the new markdown-fragment model", () => {
    const bootstrap = createPageBootstrap({
      frontmatter: {},
      markdown: "# Profile",
      schemas: [],
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
              id: "profile::input::payload",
              block: "profile",
              name: "payload",
              type: "json",
              required: true,
              secret: false,
              schema: "payload_schema",
            },
          ],
          reads: [],
          writes: [],
          redirects: [],
        },
      ],
    });

    expect(bootstrap).toEqual({
      version: "vNext",
      frontmatter: {},
      markdown: "# Profile",
      schemas: [],
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
              id: "profile::input::payload",
              block: "profile",
              name: "payload",
              type: "json",
              required: true,
              secret: false,
              schema: "payload_schema",
            },
          ],
          reads: [],
          writes: [],
          redirects: [],
        },
      ],
      inputState: {
        "profile::input::enabled": false,
        "profile::input::payload": "",
      },
    });
  });
});
