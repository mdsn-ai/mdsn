import { describe, expect, it } from "vitest";

import { MdsnValidationError, parsePage, validatePage } from "../../src/core/index.js";

describe("validatePage", () => {
  it("rejects duplicate block names", () => {
    const page = parsePage(`\`\`\`mdsn
BLOCK guestbook {
  GET "/list" -> refresh
}

BLOCK guestbook {
  GET "/list-2" -> refresh2
}
\`\`\`
`);

    expect(() => validatePage(page)).toThrow(MdsnValidationError);
  });

  it("rejects missing anchor mappings when anchors exist", () => {
    const page = parsePage(`# Demo

<!-- mdsn:block guestbook -->

\`\`\`mdsn
BLOCK other {
  GET "/list" -> refresh
}
\`\`\`
`);

    expect(() => validatePage(page)).toThrow(/Anchor "guestbook" does not match/);
  });

  it("rejects invalid stream naming", () => {
    const page = parsePage(`\`\`\`mdsn
BLOCK updates {
  GET "/stream" -> refresh accept:"text/event-stream"
}
\`\`\`
`);

    expect(() => validatePage(page)).toThrow(/must not define an operation name/);
  });

  it("rejects empty choice option lists", () => {
    const page = parsePage(`\`\`\`mdsn
BLOCK compose {
  INPUT choice [] -> status
  GET "/list" -> refresh
}
\`\`\`
`);

    expect(() => validatePage(page)).toThrow(/must declare at least one option/);
  });

  it("rejects options on non-choice inputs", () => {
    const page = parsePage(`\`\`\`mdsn
BLOCK compose {
  INPUT text ["draft"] -> status
  GET "/list" -> refresh
}
\`\`\`
`);

    expect(() => validatePage(page)).toThrow(/Only choice inputs may declare options/);
  });

  it("accepts POST operations with an explicit empty input list", () => {
    const page = parsePage(`\`\`\`mdsn
BLOCK auth {
  POST "/logout" () -> logout label:"Log Out"
}
\`\`\`
`);

    expect(() => validatePage(page)).not.toThrow();
  });
});
