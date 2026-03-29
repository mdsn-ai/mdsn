import { isStreamAccept, type BlockDefinition, type ReadDefinition, type WriteDefinition } from "../model/block";
import type { InputDefinition, InputType } from "../model/input";

function isIdentifier(value: string): boolean {
  return /^[a-zA-Z_][\w-]*$/.test(value);
}

function parseIdentifierList(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const items = trimmed.split(",").map((part) => part.trim()).filter(Boolean);
  for (const item of items) {
    if (!isIdentifier(item)) {
      throw new Error(`Invalid identifier in argument list: ${item}`);
    }
  }
  return items;
}

function parseStringArrayLiteral(raw: string): string[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
    throw new Error(`Invalid array literal: ${raw}`);
  }
  return parsed;
}

export function parseBlockHeaderLine(line: string): string {
  const match = line.trim().match(/^BLOCK\s+([a-zA-Z_][\w-]*)\s*\{$/);
  if (!match) {
    throw new Error(`Invalid block declaration: ${line}`);
  }
  return match[1];
}

export function parseInputLine(line: string, blockName: string): InputDefinition {
  const match = line.trim().match(/^INPUT\s+(text|number|boolean|choice|asset)(?:\s+(.*?))?\s*->\s*([a-zA-Z_][\w-]*)$/);
  if (!match) {
    throw new Error(`Invalid input declaration: ${line}`);
  }

  const [, type, trailing, name] = match;
  const tail = (trailing ?? "").trim();

  const required = /\brequired\b/u.test(tail);
  const secret = /\bsecret\b/u.test(tail);
  const optionsMatch = tail.match(/(\[.*\])/u);
  const optionsLiteral = optionsMatch?.[1];
  const normalizedTail = tail
    .replace(/\brequired\b/gu, "")
    .replace(/\bsecret\b/gu, "")
    .replace(/(\[.*\])/u, "")
    .trim();
  if (normalizedTail) {
    throw new Error(`Invalid input declaration: ${line}`);
  }

  const input: InputDefinition = {
    id: `${blockName}::input::${name}`,
    block: blockName,
    name,
    type: type as InputType,
    required,
    secret,
  };

  if (optionsLiteral) {
    input.options = parseStringArrayLiteral(optionsLiteral);
  }

  if (input.type === "choice" && (!input.options || input.options.length === 0)) {
    throw new Error(`Choice input ${name} in block ${blockName} must define options`);
  }

  if (input.type !== "choice" && input.options) {
    throw new Error(`Only choice input ${name} in block ${blockName} can define options`);
  }

  return input;
}

export function parseReadOrWriteLine(
  line: string,
  kind: "read",
  blockName: string,
  index: number,
): ReadDefinition;
export function parseReadOrWriteLine(
  line: string,
  kind: "write",
  blockName: string,
  index: number,
): WriteDefinition;
export function parseReadOrWriteLine(
  line: string,
  kind: "read" | "write",
  blockName: string,
  index: number,
): ReadDefinition | WriteDefinition {
  if (kind === "read") {
    const match = line.trim().match(
      /^GET\s+"([^"]+)"(?:\s*\(([^)]*)\))?(?:\s+accept:"([^"]+)")?(?:\s*->\s*([a-zA-Z_][\w-]*))?$/,
    );
    if (!match) {
      throw new Error(`Invalid ${kind} declaration: ${line}`);
    }

    const [, target, rawInputs, accept, name] = match;
    if (!name && !isStreamAccept(accept)) {
      throw new Error(`Invalid ${kind} declaration: ${line}`);
    }
    if (isStreamAccept(accept) && name) {
      throw new Error(`Invalid ${kind} declaration: ${line}`);
    }

    return {
      id: `${blockName}::${kind}::${index}`,
      block: blockName,
      name,
      target,
      inputs: parseIdentifierList(rawInputs ?? ""),
      accept,
      order: index,
    };
  }

  const match = line.trim().match(/^POST\s+"([^"]+)"\s*\(([^)]*)\)\s*->\s*([a-zA-Z_][\w-]*)$/);
  if (!match) {
    throw new Error(`Invalid ${kind} declaration: ${line}`);
  }

  const [, target, rawInputs, name] = match;

  const base = {
    id: `${blockName}::${kind}::${index}`,
    block: blockName,
    name,
    target,
    inputs: parseIdentifierList(rawInputs ?? ""),
    order: index,
  };

  return base as WriteDefinition;
}

export function getNextOperationOrder(block: BlockDefinition): number {
  return block.reads.length + block.writes.length;
}
