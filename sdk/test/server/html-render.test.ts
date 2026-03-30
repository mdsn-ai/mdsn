import { describe, expect, it } from "vitest";

import { renderHtmlDocument } from "../../src/server/html-render.js";

describe("renderHtmlDocument", () => {
  it("renders fragments into readable html", () => {
    const html = renderHtmlDocument({
      markdown: "# Guestbook",
      blocks: [
        {
          name: "guestbook",
          inputs: [
            { name: "message", type: "text", required: true, secret: false }
          ],
          operations: [
            {
              method: "POST",
              target: "/post",
              name: "submit",
              inputs: ["message"],
              label: "Submit"
            }
          ]
        }
      ]
    });

    expect(html).toContain("<mdsn-block");
    expect(html).toContain('action="/post"');
    expect(html).toContain("Submit");
    expect(html).toContain('id="mdsn-bootstrap"');
    expect(html).toContain('"kind":"fragment"');
  });

  it("renders GET actions as progressive enhancement forms", () => {
    const html = renderHtmlDocument({
      markdown: "# Guestbook",
      blocks: [
        {
          name: "guestbook",
          inputs: [],
          operations: [
            {
              method: "GET",
              target: "/list",
              name: "refresh",
              inputs: [],
              label: "Refresh"
            }
          ]
        }
      ]
    });

    expect(html).toContain('<form method="GET" action="/list"');
    expect(html).toContain("Refresh");
    expect(html).toContain('data-mdsn-action-variant="secondary"');
  });

  it("renders stream GET declarations as non-interactive stream markers", () => {
    const html = renderHtmlDocument({
      markdown: "# Guestbook",
      blocks: [
        {
          name: "guestbook",
          inputs: [],
          operations: [
            {
              method: "GET",
              target: "/stream",
              inputs: [],
              accept: "text/event-stream"
            }
          ]
        }
      ]
    });

    expect(html).not.toContain('<form method="GET" action="/stream"');
    expect(html).toContain('data-mdsn-stream-target="/stream"');
  });

  it("renders markdown bullet lists as structured message items", () => {
    const html = renderHtmlDocument({
      markdown: "# Guestbook\n\n## Messages\n\n- Welcome\n- Looks great now",
      blocks: []
    });

    expect(html).toContain("<ul>");
    expect(html).toContain("<li>Welcome</li>");
    expect(html).toContain("<li>Looks great now</li>");
  });

  it("does not render block anchor comments as visible page text", () => {
    const html = renderHtmlDocument({
      markdown: "# Guestbook\n\n<!-- mdsn:block guestbook -->",
      blockContent: {
        guestbook: "## 2 live messages\n\n- Welcome\n- Hello"
      },
      blocks: [
        {
          name: "guestbook",
          inputs: [],
          operations: [
            {
              method: "GET",
              target: "/list",
              name: "refresh",
              inputs: [],
              label: "Refresh"
            }
          ]
        }
      ]
    });

    expect(html).not.toContain("&lt;!-- mdsn:block guestbook --&gt;");
    expect(html).toContain('data-mdsn-block="guestbook"');
    expect(html).toContain("2 live messages");
    expect(html).toContain("<li>Hello</li>");
  });

  it("omits hidden block anchors and controls when a page only exposes a subset of blocks", () => {
    const html = renderHtmlDocument({
      markdown: "# Account\n\n<!-- mdsn:block auth -->\n\n<!-- mdsn:block vault -->",
      blockContent: {
        auth: "## Please sign in",
        vault: "## 0 saved notes"
      },
      blocks: [
        {
          name: "auth",
          inputs: [
            { name: "nickname", type: "text", required: true, secret: false }
          ],
          operations: [
            {
              method: "POST",
              target: "/login",
              name: "login",
              inputs: ["nickname"],
              label: "Sign In"
            }
          ]
        }
      ]
    });

    expect(html).toContain('data-mdsn-block="auth"');
    expect(html).toContain('action="/login"');
    expect(html).not.toContain('data-mdsn-block="vault"');
    expect(html).not.toContain('action="/notes"');
  });

  it("renders fragment markdown inside the block for single-block action responses", () => {
    const html = renderHtmlDocument({
      markdown: "## 2 live messages\n\n- Welcome\n- Still usable",
      blocks: [
        {
          name: "guestbook",
          inputs: [{ name: "message", type: "text", required: true, secret: false }],
          operations: [
            {
              method: "POST",
              target: "/post",
              name: "submit",
              inputs: ["message"],
              label: "Submit"
            }
          ]
        }
      ]
    });

    expect(html).toContain('data-mdsn-block="guestbook"');
    expect(html).toContain("2 live messages");
    expect(html).toContain("<li>Still usable</li>");
  });

  it("renders an explicit continue target marker for browser navigation responses", () => {
    const html = renderHtmlDocument(
      {
        markdown: "## Account created for Ada\n\nUse `open_vault` to continue.",
        blocks: [
          {
            name: "register",
            inputs: [],
            operations: [
              {
                method: "GET",
                target: "/vault",
                name: "open_vault",
                inputs: [],
                label: "Open Vault"
              }
            ]
          }
        ]
      },
      {
        continueTarget: "/vault"
      }
    );

    expect(html).toContain('data-mdsn-continue-target="/vault"');
    expect(html).toContain("Open Vault");
    expect(html).toContain('"continueTarget":"/vault"');
  });

  it("renders page bootstrap data for headless framework hosts", () => {
    const html = renderHtmlDocument(
      {
        markdown: "# Guestbook\n\n<!-- mdsn:block guestbook -->",
        blockContent: {
          guestbook: "## 1 live message\n\n- Hello"
        },
        blocks: [
          {
            name: "guestbook",
            inputs: [{ name: "message", type: "text", required: true, secret: false }],
            operations: [
              {
                method: "POST",
                target: "/post",
                name: "submit",
                inputs: ["message"],
                label: "Submit"
              }
            ]
          }
        ]
      },
      {
        kind: "page",
        route: "/guestbook"
      }
    );

    expect(html).toContain('id="mdsn-bootstrap"');
    expect(html).toContain('"kind":"page"');
    expect(html).toContain('"route":"/guestbook"');
    expect(html).toContain('"name":"guestbook"');
    expect(html).toContain('"markdown":"## 1 live message');
  });

  it("renders supported input types with matching html controls", () => {
    const html = renderHtmlDocument({
      markdown: "# Compose",
      blocks: [
        {
          name: "compose",
          inputs: [
            { name: "title", type: "text", required: false, secret: false },
            { name: "quantity", type: "number", required: true, secret: false },
            { name: "published", type: "boolean", required: false, secret: false },
            { name: "status", type: "choice", required: false, secret: false, options: ["draft", "published"] },
            { name: "attachment", type: "asset", required: true, secret: false },
            { name: "password", type: "text", required: true, secret: true }
          ],
          operations: [
            {
              method: "POST",
              target: "/submit",
              name: "submit",
              inputs: ["title", "quantity", "published", "status", "attachment", "password"],
              label: "Submit"
            }
          ]
        }
      ]
    });

    expect(html).toContain('input name="title" type="text"');
    expect(html).toContain('input name="quantity" type="number" required');
    expect(html).toContain('data-required="true"');
    expect(html).toContain('class="mdsn-label-text"');
    expect(html).toContain('class="mdsn-required"');
    expect(html).toContain('input name="published" type="checkbox"');
    expect(html).toContain('<select name="status">');
    expect(html).toContain('<option value="draft">draft</option>');
    expect(html).toContain('<option value="published">published</option>');
    expect(html).toContain('input name="attachment" type="file" required');
    expect(html).toContain('input name="password" type="password" required');
  });

  it("renders logout actions as quiet utility buttons", () => {
    const html = renderHtmlDocument({
      markdown: "# Vault",
      blocks: [
        {
          name: "session",
          inputs: [],
          operations: [
            {
              method: "POST",
              target: "/vault/logout",
              name: "logout",
              inputs: [],
              label: "Log Out"
            }
          ]
        }
      ]
    });

    expect(html).toContain('data-mdsn-action-variant="quiet"');
    expect(html).toContain("Log Out");
  });

  it("uses an injected markdown renderer when rendering html", () => {
    const html = renderHtmlDocument(
      {
        markdown: "# Guestbook",
        blocks: []
      },
      {
        markdownRenderer: {
          render(markdown) {
            return `<article data-renderer="custom">${markdown.toUpperCase()}</article>`;
          }
        }
      }
    );

    expect(html).toContain('data-renderer="custom"');
    expect(html).toContain("GUESTBOOK");
  });
});
