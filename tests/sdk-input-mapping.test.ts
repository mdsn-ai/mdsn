import { describe, expect, it } from "vitest";
import { parsePageDefinition } from "../sdk/src/core";
import { createRenderModel } from "../sdk/src/web";

const INPUT_TYPES_PAGE = `---
id: types
title: Input Mapping
---

# Input Mapping

<!-- mdsn:block types -->

\`\`\`mdsn
schema filters_schema {
  "type": "object",
  "properties": {
    "query": { "type": "string" }
  },
  "required": ["query"]
}

block types {
  input nickname!: text
  input password!: text secret
  input quantity!: number
  input agree!: boolean
  input role!: choice ["admin", "user"]
  input image!: file
  input filters!: json filters_schema
  write submit: "/submit" (nickname, password, quantity, agree, role, image, filters)
}
\`\`\`
`;

describe("sdk input mapping", () => {
  it("maps every supported input type to the expected html control", () => {
    const document = parsePageDefinition(INPUT_TYPES_PAGE);
    const model = createRenderModel(document);

    expect(model.markdownHtml).toContain('<input id="types::input::nickname" type="text"');
    expect(model.markdownHtml).toContain('data-mdsn-input="types::input::nickname"');
    expect(model.markdownHtml).toContain('data-input-type="text"');

    expect(model.markdownHtml).toContain('<input id="types::input::password" type="password"');
    expect(model.markdownHtml).toContain('data-secret="true"');

    expect(model.markdownHtml).toContain('<input id="types::input::quantity" type="number"');
    expect(model.markdownHtml).toContain('data-input-type="number"');

    expect(model.markdownHtml).toContain('<input id="types::input::agree" type="checkbox"');
    expect(model.markdownHtml).toContain('data-input-type="boolean"');

    expect(model.markdownHtml).toContain('<select id="types::input::role"');
    expect(model.markdownHtml).toContain('<option value="admin">admin</option>');
    expect(model.markdownHtml).toContain('<option value="user">user</option>');

    expect(model.markdownHtml).toContain('<input id="types::input::image" type="file"');
    expect(model.markdownHtml).toContain('data-input-type="file"');

    expect(model.markdownHtml).toContain('<textarea id="types::input::filters"');
    expect(model.markdownHtml).toContain('rows="8"');
    expect(model.markdownHtml).toContain('spellcheck="false"');
    expect(model.markdownHtml).toContain('data-input-type="json"');
  });

  it("marks required inputs consistently in the dom", () => {
    const document = parsePageDefinition(INPUT_TYPES_PAGE);
    const model = createRenderModel(document);

    expect(model.markdownHtml).toContain('data-required="true" required');
  });

  it("derives bootstrap input state by input type", () => {
    const document = parsePageDefinition(INPUT_TYPES_PAGE);
    const model = createRenderModel(document);

    expect(model.bootstrap.inputState).toMatchObject({
      "types::input::nickname": "",
      "types::input::password": "",
      "types::input::quantity": null,
      "types::input::agree": false,
      "types::input::role": "",
      "types::input::image": "",
      "types::input::filters": "",
    });
  });
});
