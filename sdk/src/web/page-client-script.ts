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

  function parseSchemaLiteral(raw) {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Schema body must be a JSON object");
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
      .match(/^input\\s+([a-zA-Z_][\\w-]*)(!)?:\\s*(text|number|boolean|choice|file|json)(?:\\s+(secret))?(?:\\s+(\\[.*\\]))?(?:\\s+([a-zA-Z_][\\w-]*))?$/);
    if (!match) {
      throw new Error("Invalid input declaration: " + line);
    }

    const name = match[1];
    const requiredMarker = match[2];
    const type = match[3];
    const secretMarker = match[4];
    const optionsLiteral = match[5];
    const schemaName = match[6];
    const input = {
      id: blockName + "::input::" + name,
      block: blockName,
      name,
      type,
      required: requiredMarker === "!",
      secret: secretMarker === "secret",
    };

    if (optionsLiteral) {
      input.options = parseStringArrayLiteral(optionsLiteral);
    }

    if (schemaName) {
      input.schema = schemaName;
    }

    if (input.type === "choice" && (!input.options || input.options.length === 0)) {
      throw new Error("Choice input " + name + " in block " + blockName + " must define options");
    }

    if (input.type === "json" && !input.schema) {
      throw new Error("JSON input " + name + " in block " + blockName + " must define schema");
    }

    return input;
  }

  function parseReadOrWriteLine(line, kind, blockName, index) {
    const match = String(line)
      .trim()
      .match(/^(read|write)\\s+([a-zA-Z_][\\w-]*)\\s*:\\s*"([^"]+)"(?:\\s*\\(([^)]*)\\))?$/);
    if (!match) {
      throw new Error("Invalid " + kind + " declaration: " + line);
    }

    const parsedKind = match[1];
    const name = match[2];
    const target = match[3];
    const rawInputs = match[4];
    if (parsedKind !== kind) {
      throw new Error("Expected " + kind + " declaration: " + line);
    }

    return {
      id: blockName + "::" + kind + "::" + index,
      block: blockName,
      name,
      target,
      inputs: parseIdentifierList(rawInputs || ""),
      order: index,
    };
  }

  function parseRedirectLine(line, blockName, index) {
    const match = String(line).trim().match(/^redirect\\s+"([^"]+)"$/);
    if (!match) {
      throw new Error("Invalid redirect declaration: " + line);
    }

    return {
      id: blockName + "::redirect::" + index,
      block: blockName,
      target: match[1],
      order: index,
    };
  }

  function parseSchemaBlock(lines, startIndex) {
    const firstLine = String(lines[startIndex]).trim();
    const match = firstLine.match(/^schema\\s+([a-zA-Z_][\\w-]*)\\s*(\\{.*)?$/);
    if (!match) {
      throw new Error("Invalid schema declaration: " + firstLine);
    }

    const name = match[1];
    let literal = (match[2] || "").trim();
    let braceDepth = (literal.match(/\\{/g) || []).length - (literal.match(/\\}/g) || []).length;
    let index = startIndex;

    while (braceDepth > 0) {
      index += 1;
      if (index >= lines.length) {
        throw new Error("Unterminated schema declaration: " + name);
      }
      literal += "\\n" + lines[index];
      braceDepth += (lines[index].match(/\\{/g) || []).length;
      braceDepth -= (lines[index].match(/\\}/g) || []).length;
    }

    if (!literal.startsWith("{")) {
      throw new Error("schema " + name + " must start with {");
    }

    return {
      schema: {
        name,
        shape: parseSchemaLiteral(literal),
      },
      nextIndex: index + 1,
    };
  }

  function getNextOperationOrder(block) {
    return block.reads.length + block.writes.length + block.redirects.length;
  }

  function parseMdsnBlocks(blocks) {
    const schemas = [];
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
          if (line.startsWith("schema ")) {
            const parsedSchema = parseSchemaBlock(lines, index);
            schemas.push(parsedSchema.schema);
            index = parsedSchema.nextIndex;
            continue;
          }

          if (line.startsWith("block ")) {
            currentBlock = {
              name: parseBlockHeaderLine(line),
              inputs: [],
              reads: [],
              writes: [],
              redirects: [],
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

        if (line.startsWith("input ")) {
          currentBlock.inputs.push(parseInputLine(line, currentBlock.name));
          index += 1;
          continue;
        }

        if (line.startsWith("read ")) {
          currentBlock.reads.push(parseReadOrWriteLine(line, "read", currentBlock.name, getNextOperationOrder(currentBlock)));
          index += 1;
          continue;
        }

        if (line.startsWith("write ")) {
          currentBlock.writes.push(parseReadOrWriteLine(line, "write", currentBlock.name, getNextOperationOrder(currentBlock)));
          index += 1;
          continue;
        }

        if (line.startsWith("redirect ")) {
          currentBlock.redirects.push(parseRedirectLine(line, currentBlock.name, getNextOperationOrder(currentBlock)));
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
      schemas,
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
    for (const redirect of block.redirects || []) {
      operationsById.set(redirect.id, { ...redirect, kind: "redirect" });
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

  async function runOperation(operationId, button) {
    const operation = operationsById.get(operationId);
    if (!operation) return;

    if (button instanceof HTMLButtonElement) {
      button.disabled = true;
    }

    updateStatus("Loading...", "loading");

    try {
      if (operation.kind === "redirect") {
        window.location.assign(mapTargetToHttpPath(operation.target));
        return;
      }

      const inputs = {};
      for (const inputName of operation.inputs || []) {
        const inputId = operation.block + "::input::" + inputName;
        const definition = inputDefinitionsById.get(inputId);
        if (!definition) continue;
        inputs[inputName] = getInputValue(definition);
      }

      const response = await fetch(mapTargetToHttpPath(operation.target), {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "application/json",
        },
        body: serializeInputsAsMarkdown(inputs),
      });
      const result = await response.json();

      if (!result || result.ok !== true) {
        const message = result && typeof result.message === "string"
          ? result.message
          : result && typeof result.errorCode === "string"
            ? result.errorCode
            : "Action failed.";
        updateStatus("Failed: " + message, "error");
        return;
      }

      if (result.kind === "redirect" && typeof result.location === "string") {
        window.location.assign(result.location);
        return;
      }

      if (
        result.kind === "fragment"
        && typeof result.markdown === "string"
        && typeof result.html === "string"
      ) {
        const fragment = parseBlockFragment(result.markdown);
        root.innerHTML = replaceBlockRegionMarkup(root.innerHTML, operation.block, result.html);
        clearBlock(operation.block);
        if (fragment.blocks[0]) {
          registerBlock(fragment.blocks[0]);
        }
        bindActions("[data-mdsn-read]", "data-mdsn-read");
        bindActions("[data-mdsn-write]", "data-mdsn-write");
        bindActions("[data-mdsn-redirect]", "data-mdsn-redirect");
        updateStatus("Updated.", "success");
        return;
      }

      updateStatus("Failed: Invalid action response.", "error");
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
  bindActions("[data-mdsn-redirect]", "data-mdsn-redirect");
})();
`;
}

export function serializePageClientRuntimeScript(): string {
  return serializeForInlineScript(getPageClientRuntimeScript());
}
