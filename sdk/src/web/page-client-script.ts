function serializeForInlineScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003C")
    .replace(/>/g, "\\u003E")
    .replace(/&/g, "\\u0026");
}

export function getPageClientRuntimeScript(): string {
  return `
(() => {
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function createRegionMarker(kind, blockName) {
    return "<!--mdsn:block-region:" + kind + ":" + escapeHtml(blockName) + "-->";
  }

  function createBlockRegionMarkup(blockName, innerHtml) {
    return createRegionMarker("start", blockName) + '<section class="mdsn-block-region" data-mdsn-block-region="' + escapeHtml(blockName) + '">' + innerHtml + "</section>" + createRegionMarker("end", blockName);
  }

  function normalizeRoutePath(routePath) {
    if (!routePath || routePath === "/") {
      return "/";
    }
    if (String(routePath).startsWith("/")) {
      return String(routePath).replace(/\\/+$|$/u, "") || "/";
    }
    return ("/" + String(routePath)).replace(/\\/+$|$/u, "") || "/";
  }

  function markdownPathToRoutePath(pathname) {
    if (!pathname || !String(pathname).toLowerCase().endsWith(".md")) {
      return null;
    }

    const normalized = normalizeRoutePath(pathname);
    if (normalized === "/index.md") {
      return "/";
    }

    const stripped = normalized.slice(0, -3);
    if (stripped.endsWith("/index")) {
      return stripped.slice(0, -6) || "/";
    }

    return stripped.length > 0 ? stripped : "/";
  }

  function mapTargetToHttpPath(target) {
    if (/^https?:\\/\\//i.test(String(target))) {
      return String(target);
    }

    const markdownRoutePath = markdownPathToRoutePath(target);
    if (markdownRoutePath) {
      return markdownRoutePath;
    }
    return String(target);
  }

  function replaceBlockRegionMarkup(html, blockName, replacementInnerHtml) {
    const escapedName = escapeHtml(blockName).replace(/[.*+?^$()|[\\]\\\\]/g, "\\\\$&");
    const pattern = new RegExp("<!--mdsn:block-region:start:" + escapedName + "-->[\\\\s\\\\S]*?<!--mdsn:block-region:end:" + escapedName + "-->", "g");
    return html.replace(pattern, createBlockRegionMarkup(blockName, replacementInnerHtml));
  }

  function trimTrailingBlankLines(value) {
    return String(value).replace(/\\n+$/u, "\\n");
  }

  function extractExecutableMdsnBlocks(markdown) {
    const lines = String(markdown).split(/\\r?\\n/);
    const keptLines = [];
    const blocks = [];
    const fence = String.fromCharCode(96) + String.fromCharCode(96) + String.fromCharCode(96);
    let index = 0;

    while (index < lines.length) {
      const line = lines[index];
      const trimmed = line.trim();

      if (trimmed === fence + "mdsn") {
        index += 1;
        const blockLines = [];
        while (index < lines.length && lines[index].trim() !== fence) {
          blockLines.push(lines[index]);
          index += 1;
        }
        if (index >= lines.length) {
          throw new Error("Unterminated mdsn code block");
        }
        blocks.push(blockLines.join("\\n"));
        index += 1;
        continue;
      }

      keptLines.push(line);
      index += 1;
    }

    return {
      markdownWithoutMdsn: trimTrailingBlankLines(keptLines.join("\\n")),
      blocks,
    };
  }

  function isIdentifier(value) {
    return /^[a-zA-Z_][\\w-]*$/.test(value);
  }

  function parseIdentifierList(raw) {
    const trimmed = String(raw || "").trim();
    if (!trimmed) return [];
    const items = trimmed.split(",").map((part) => part.trim()).filter(Boolean);
    for (const item of items) {
      if (!isIdentifier(item)) {
        throw new Error("Invalid identifier in argument list: " + item);
      }
    }
    return items;
  }

  function parseStringArrayLiteral(raw) {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
      throw new Error("Invalid array literal: " + raw);
    }
    return parsed;
  }

  function parseBlockHeaderLine(line) {
    const match = String(line).trim().match(/^block\\s+([a-zA-Z_][\\w-]*)\\s*\\{$/);
    if (!match) {
      throw new Error("Invalid block declaration: " + line);
    }
    return match[1];
  }

  function parseInputLine(line, blockName) {
    const match = String(line)
      .trim()
      .match(/^INPUT\\s+(text|number|boolean|choice|asset)(?:\\s+(.*?))?\\s*->\\s*([a-zA-Z_][\\w-]*)$/);
    if (!match) {
      throw new Error("Invalid input declaration: " + line);
    }

    const type = match[1];
    const trailing = String(match[2] || "").trim();
    const name = match[3];
    const required = /\\brequired\\b/u.test(trailing);
    const secret = /\\bsecret\\b/u.test(trailing);
    const optionsLiteral = (trailing.match(/(\\[.*\\])/u) || [])[1];
    const normalizedTrailing = trailing
      .replace(/\\brequired\\b/gu, "")
      .replace(/\\bsecret\\b/gu, "")
      .replace(/(\\[.*\\])/u, "")
      .trim();
    if (normalizedTrailing) {
      throw new Error("Invalid input declaration: " + line);
    }
    const input = {
      id: blockName + "::input::" + name,
      block: blockName,
      name,
      type,
      required,
      secret,
    };

    if (optionsLiteral) {
      input.options = parseStringArrayLiteral(optionsLiteral);
    }

    if (input.type === "choice" && (!input.options || input.options.length === 0)) {
      throw new Error("Choice input " + name + " in block " + blockName + " must define options");
    }

    if (input.type !== "choice" && input.options) {
      throw new Error("Only choice input " + name + " in block " + blockName + " can define options");
    }

    return input;
  }

  function parseReadOrWriteLine(line, kind, blockName, index) {
    const match = kind === "read"
      ? String(line).trim().match(/^GET\\s+"([^"]+)"(?:\\s*\\(([^)]*)\\))?\\s*->\\s*([a-zA-Z_][\\w-]*)$/)
      : String(line).trim().match(/^POST\\s+"([^"]+)"\\s*\\(([^)]*)\\)\\s*->\\s*([a-zA-Z_][\\w-]*)$/);
    if (!match) {
      throw new Error("Invalid " + kind + " declaration: " + line);
    }

    const target = match[1];
    const rawInputs = match[2];
    const name = match[3];

    return {
      id: blockName + "::" + kind + "::" + index,
      block: blockName,
      name,
      target,
      inputs: parseIdentifierList(rawInputs || ""),
      order: index,
    };
  }

  function getNextOperationOrder(block) {
    return block.reads.length + block.writes.length;
  }

  function parseMdsnBlocks(blocks) {
    const documentBlocks = [];
    let currentBlock = null;

    for (const blockText of blocks) {
      const lines = String(blockText).split(/\\r?\\n/);
      let index = 0;

      while (index < lines.length) {
        const line = String(lines[index]).trim();
        if (!line) {
          index += 1;
          continue;
        }

        if (!currentBlock) {
          if (line.startsWith("block ")) {
            currentBlock = {
              name: parseBlockHeaderLine(line),
              inputs: [],
              reads: [],
              writes: [],
            };
            documentBlocks.push(currentBlock);
            index += 1;
            continue;
          }

          if (line === "}") {
            throw new Error("Unexpected block terminator: " + line);
          }

          throw new Error("Unsupported MDSN statement: " + line);
        }

        if (line === "}") {
          currentBlock = null;
          index += 1;
          continue;
        }

        if (line.startsWith("INPUT ")) {
          currentBlock.inputs.push(parseInputLine(line, currentBlock.name));
          index += 1;
          continue;
        }

        if (line.startsWith("GET ")) {
          currentBlock.reads.push(parseReadOrWriteLine(line, "read", currentBlock.name, getNextOperationOrder(currentBlock)));
          index += 1;
          continue;
        }

        if (line.startsWith("POST ")) {
          currentBlock.writes.push(parseReadOrWriteLine(line, "write", currentBlock.name, getNextOperationOrder(currentBlock)));
          index += 1;
          continue;
        }

        throw new Error("Unsupported MDSN statement: " + line);
      }
    }

    if (currentBlock) {
      throw new Error("Unterminated block declaration: " + currentBlock.name);
    }

    return {
      blocks: documentBlocks,
    };
  }

  function parseBlockFragment(raw) {
    const extracted = extractExecutableMdsnBlocks(raw);
    if (extracted.blocks.length > 1) {
      throw new Error("A block fragment may contain at most one mdsn code block");
    }
    if (extracted.blocks.length === 0) {
      return {
        markdown: extracted.markdownWithoutMdsn,
        blocks: [],
      };
    }
    const parsed = parseMdsnBlocks(extracted.blocks);
    return {
      markdown: extracted.markdownWithoutMdsn,
      blocks: parsed.blocks,
    };
  }

  const bootstrapElement = document.getElementById("mdsn-bootstrap");
  if (!bootstrapElement || !bootstrapElement.textContent) return;

  const bootstrap = JSON.parse(bootstrapElement.textContent);
  if (!bootstrap || bootstrap.version !== "vNext") return;

  const root = document.querySelector("[data-mdsn-root]");
  if (!(root instanceof HTMLElement)) return;

  const statusElement = document.querySelector("[data-mdsn-status]");
  const inputDefinitionsById = new Map();
  const operationsById = new Map();

  function registerBlock(block) {
    for (const input of block.inputs || []) {
      inputDefinitionsById.set(input.id, input);
    }
    for (const read of block.reads || []) {
      operationsById.set(read.id, { ...read, kind: "read" });
    }
    for (const write of block.writes || []) {
      operationsById.set(write.id, { ...write, kind: "write" });
    }
  }

  function clearBlock(blockName) {
    for (const key of Array.from(inputDefinitionsById.keys())) {
      if (String(key).startsWith(blockName + "::input::")) {
        inputDefinitionsById.delete(key);
      }
    }
    for (const [key, value] of Array.from(operationsById.entries())) {
      if (value && value.block === blockName) {
        operationsById.delete(key);
      }
    }
  }

  function parseOperationOrder(operationId, kind) {
    const pattern = new RegExp("::" + kind + "::(\\\\d+)$");
    const match = String(operationId || "").match(pattern);
    return match ? Number(match[1]) : 0;
  }

  function registerBlockFromDom(blockName) {
    clearBlock(blockName);
    for (const element of document.querySelectorAll("[data-mdsn-input]")) {
      const inputId = element.getAttribute("data-mdsn-input");
      const name = element.getAttribute("data-input-name");
      const type = element.getAttribute("data-input-type");
      if (!inputId || !inputId.startsWith(blockName + "::input::") || !name || !type) {
        continue;
      }

      inputDefinitionsById.set(inputId, {
        id: inputId,
        block: blockName,
        name,
        type,
        required: element.getAttribute("data-required") === "true",
        secret: element.getAttribute("data-secret") === "true",
      });
    }

    for (const element of document.querySelectorAll("[data-mdsn-read]")) {
      const operationId = element.getAttribute("data-mdsn-read");
      const target = element.getAttribute("data-target");
      if (!operationId || !operationId.startsWith(blockName + "::read::") || !target) {
        continue;
      }

      operationsById.set(operationId, {
        id: operationId,
        block: blockName,
        kind: "read",
        name: element.getAttribute("data-op-name") || element.textContent || "read",
        target,
        inputs: parseIdentifierList(element.getAttribute("data-inputs") || ""),
        order: parseOperationOrder(operationId, "read"),
      });
    }

    for (const element of document.querySelectorAll("[data-mdsn-write]")) {
      const operationId = element.getAttribute("data-mdsn-write");
      const target = element.getAttribute("data-target");
      if (!operationId || !operationId.startsWith(blockName + "::write::") || !target) {
        continue;
      }

      operationsById.set(operationId, {
        id: operationId,
        block: blockName,
        kind: "write",
        name: element.getAttribute("data-op-name") || element.textContent || "write",
        target,
        inputs: parseIdentifierList(element.getAttribute("data-inputs") || ""),
        order: parseOperationOrder(operationId, "write"),
      });
    }

  }

  for (const block of bootstrap.blocks || []) {
    registerBlock(block);
  }

  function updateStatus(message, state) {
    if (!(statusElement instanceof HTMLElement)) return;
    statusElement.textContent = message;
    if (typeof state === "string") {
      statusElement.dataset.state = state;
    }
    statusElement.hidden = !message;
  }

  function findInputElement(inputId) {
    const elements = document.querySelectorAll("[data-mdsn-input]");
    for (const element of elements) {
      if (element instanceof HTMLElement && element.getAttribute("data-mdsn-input") === inputId) {
        return element;
      }
    }
    return null;
  }

  function getInputValue(definition) {
    const element = findInputElement(definition.id);
    if (!element) {
      return bootstrap.inputState ? bootstrap.inputState[definition.id] : "";
    }

    if (element instanceof HTMLInputElement && element.type === "checkbox") {
      return Boolean(element.checked);
    }

    if (element instanceof HTMLInputElement && element.type === "number") {
      return element.value === "" ? "" : Number(element.value);
    }

    return element.value;
  }

  function serializeInputsAsMarkdown(inputs) {
    return Object.entries(inputs)
      .filter((entry) => entry[1] !== undefined)
      .map((entry) => "- " + entry[0] + ": " + JSON.stringify(entry[1]))
      .join("\\n");
  }

  function applyQueryParams(target, inputs) {
    const source = String(target || "");
    if (!inputs || Object.keys(inputs).length === 0) {
      return source;
    }
    const parts = source.split("?");
    const basePath = parts[0] || "";
    const existingQuery = parts[1] ? new URLSearchParams(parts[1]) : new URLSearchParams();
    for (const entry of Object.entries(inputs)) {
      const name = entry[0];
      const value = entry[1];
      if (value === undefined || value === null || value === "") {
        continue;
      }
      existingQuery.set(name, String(value));
    }
    const queryString = existingQuery.toString();
    return queryString ? basePath + "?" + queryString : basePath;
  }

  async function runOperation(operationId, button) {
    const operation = operationsById.get(operationId);
    if (!operation) return;

    if (button instanceof HTMLButtonElement) {
      button.disabled = true;
    }

    updateStatus("Loading...", "loading");

    try {
      const inputs = {};
      for (const inputName of operation.inputs || []) {
        const inputId = operation.block + "::input::" + inputName;
        const definition = inputDefinitionsById.get(inputId);
        if (!definition) continue;
        inputs[inputName] = getInputValue(definition);
      }

      const method = operation.kind === "read" ? "GET" : "POST";
      const mappedTarget = mapTargetToHttpPath(operation.target);
      const requestTarget = method === "GET" ? applyQueryParams(mappedTarget, inputs) : mappedTarget;
      const requestInit = method === "GET"
        ? {
          method,
          headers: { Accept: "text/html" },
        }
        : {
          method,
          headers: {
            "content-type": "text/markdown",
            Accept: "text/html",
          },
          body: serializeInputsAsMarkdown(inputs),
        };
      const response = await fetch(requestTarget, requestInit);
      const contentType = response.headers.get("content-type") || "";
      const payload = await response.text();
      if (contentType && !contentType.includes("text/html")) {
        throw new Error("Invalid action response: expected text/html fragment");
      }

      root.innerHTML = replaceBlockRegionMarkup(root.innerHTML, operation.block, payload);
      registerBlockFromDom(operation.block);
      bindActions("[data-mdsn-read]", "data-mdsn-read");
      bindActions("[data-mdsn-write]", "data-mdsn-write");
      updateStatus(response.ok ? "Updated." : "Failed: action returned an error fragment.", response.ok ? "success" : "error");
    } catch (error) {
      updateStatus("Failed: " + (error instanceof Error ? error.message : String(error)), "error");
    } finally {
      if (button instanceof HTMLButtonElement) {
        button.disabled = false;
      }
    }
  }

  function bindActions(selector, attributeName) {
    for (const element of document.querySelectorAll(selector)) {
      if (!(element instanceof HTMLButtonElement)) continue;
      if (element.dataset.bound === "true") continue;
      const operationId = element.getAttribute(attributeName);
      if (!operationId) continue;
      element.addEventListener("click", () => {
        void runOperation(operationId, element);
      });
      element.dataset.bound = "true";
    }
  }

  bindActions("[data-mdsn-read]", "data-mdsn-read");
  bindActions("[data-mdsn-write]", "data-mdsn-write");
})();
`;
}

export function serializePageClientRuntimeScript(): string {
  return serializeForInlineScript(getPageClientRuntimeScript());
}
