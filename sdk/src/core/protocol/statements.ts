import type { BlockDefinition, ReadDefinition, RedirectDefinition, WriteDefinition } from "../model/block";
import type { InputDefinition, InputType } from "../model/input";
import type { SchemaDefinition } from "../model/schema";

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

function parseSchemaLiteral(raw: string): Record<string, unknown> {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Schema body must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

export function parseBlockHeaderLine(line: string): string {
  const match = line.trim().match(/^block\s+([a-zA-Z_][\w-]*)\s*\{$/);
  if (!match) {
    throw new Error(`Invalid block declaration: ${line}`);
  }
  return match[1];
}

export function parseInputLine(line: string, blockName: string): InputDefinition {
  const match = line
    .trim()
    .match(
      /^input\s+([a-zA-Z_][\w-]*)(!)?:\s*(text|number|boolean|choice|file|json)(?:\s+(secret))?(?:\s+(\[.*\]))?(?:\s+([a-zA-Z_][\w-]*))?$/,
    );
  if (!match) {
    throw new Error(`Invalid input declaration: ${line}`);
  }

  const [, name, requiredMarker, type, secretMarker, optionsLiteral, schemaName] = match;
  const input: InputDefinition = {
    id: `${blockName}::input::${name}`,
    block: blockName,
    name,
    type: type as InputType,
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
    throw new Error(`Choice input ${name} in block ${blockName} must define options`);
  }

  if (input.type === "json" && !input.schema) {
    throw new Error(`JSON input ${name} in block ${blockName} must define schema`);
  }

  return input;
}

export function parseReadOrWriteLine(
  line: string,
  kind: "read" | "write",
  blockName: string,
  index: number,
): ReadDefinition | WriteDefinition {
  const match = line
    .trim()
    .match(/^(read|write)\s+([a-zA-Z_][\w-]*)\s*:\s*"([^"]+)"(?:\s*\(([^)]*)\))?$/);
  if (!match) {
    throw new Error(`Invalid ${kind} declaration: ${line}`);
  }

  const [, parsedKind, name, target, rawInputs] = match;
  if (parsedKind !== kind) {
    throw new Error(`Expected ${kind} declaration: ${line}`);
  }

  const base = {
    id: `${blockName}::${kind}::${index}`,
    block: blockName,
    name,
    target,
    inputs: parseIdentifierList(rawInputs ?? ""),
    order: index,
  };

  return kind === "read" ? base as ReadDefinition : base as WriteDefinition;
}

export function parseRedirectLine(
  line: string,
  blockName: string,
  index: number,
): RedirectDefinition {
  const match = line.trim().match(/^redirect\s+"([^"]+)"$/);
  if (!match) {
    throw new Error(`Invalid redirect declaration: ${line}`);
  }

  return {
    id: `${blockName}::redirect::${index}`,
    block: blockName,
    target: match[1],
    order: index,
  };
}

export function parseSchemaBlock(lines: string[], startIndex: number): {
  schema: SchemaDefinition;
  nextIndex: number;
} {
  const firstLine = lines[startIndex].trim();
  const match = firstLine.match(/^schema\s+([a-zA-Z_][\w-]*)\s*(\{.*)?$/);
  if (!match) {
    throw new Error(`Invalid schema declaration: ${firstLine}`);
  }

  const name = match[1];
  let literal = (match[2] ?? "").trim();
  let braceDepth = (literal.match(/\{/g) ?? []).length - (literal.match(/\}/g) ?? []).length;
  let index = startIndex;

  while (braceDepth > 0) {
    index += 1;
    if (index >= lines.length) {
      throw new Error(`Unterminated schema declaration: ${name}`);
    }
    literal += "\n" + lines[index];
    braceDepth += (lines[index].match(/\{/g) ?? []).length;
    braceDepth -= (lines[index].match(/\}/g) ?? []).length;
  }

  if (!literal.startsWith("{")) {
    throw new Error(`schema ${name} must start with {`);
  }

  return {
    schema: {
      name,
      shape: parseSchemaLiteral(literal),
    },
    nextIndex: index + 1,
  };
}

export function getNextOperationOrder(block: BlockDefinition): number {
  return block.reads.length + block.writes.length + block.redirects.length;
}
