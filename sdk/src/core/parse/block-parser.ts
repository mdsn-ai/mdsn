import { MdsnParseError } from "../errors.js";
import type { MdsnBlock, MdsnInput, MdsnOperation } from "../types.js";

const identifierPattern = /^[a-zA-Z_][\w-]*$/;

function parseChoiceOptions(text: string): string[] {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new MdsnParseError(`Invalid choice options ${text}.`);
  }

  if (!Array.isArray(value)) {
    throw new MdsnParseError(`Invalid choice options ${text}.`);
  }

  if (!value.every((option) => typeof option === "string")) {
    throw new MdsnParseError(`Invalid choice option in ${text}.`);
  }

  return value;
}

function parseInput(line: string): MdsnInput {
  const match = line.match(/^INPUT\s+(text|number|boolean|choice|asset)(?:\s+(required))?(?:\s+(secret))?(?:\s+(\[[^\]]*\]))?\s+->\s+([a-zA-Z_][\w-]*)$/);
  if (!match) {
    throw new MdsnParseError(`Invalid INPUT syntax: ${line}`);
  }

  const [, type, required, secret, optionText, name] = match;
  return {
    name: name!,
    type: type as MdsnInput["type"],
    required: required === "required",
    secret: secret === "secret",
    ...(optionText ? { options: parseChoiceOptions(optionText) } : {})
  };
}

function parseInputList(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

function parseOperation(line: string): MdsnOperation {
  const match = line.match(/^(GET|POST)\s+"([^"]+)"(?:\s+\(([^)]*)\))?(?:\s+->\s+([a-zA-Z_][\w-]*))?(?:\s+label:"([^"]+)")?(?:\s+accept:"([^"]+)")?$/);
  if (!match) {
    throw new MdsnParseError(`Invalid operation syntax: ${line}`);
  }

  const [, method, target, inputsRaw, name, label, accept] = match;
  const inputs = parseInputList(inputsRaw);
  if (method === "POST" && inputsRaw === undefined) {
    throw new MdsnParseError("POST operations must declare an input list.");
  }
  if (method === "POST" && !name) {
    throw new MdsnParseError("POST operations must declare an operation name.");
  }
  return {
    method: method as MdsnOperation["method"],
    target,
    name: name || undefined,
    inputs,
    label: label || undefined,
    accept: accept || undefined
  } as MdsnOperation;
}

export function parseBlocks(source: string): MdsnBlock[] {
  if (!source.trim()) {
    return [];
  }

  const blocks: MdsnBlock[] = [];
  const lines = source.split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = (lines[index] ?? "").trim();
    if (!line) {
      index += 1;
      continue;
    }

    const blockMatch = line.match(/^BLOCK\s+([a-zA-Z_][\w-]*)\s*\{$/);
    if (!blockMatch) {
      throw new MdsnParseError(`Expected BLOCK declaration, received: ${line}`);
    }

    const name = blockMatch[1]!;
    if (!identifierPattern.test(name)) {
      throw new MdsnParseError(`Invalid block name ${name}.`);
    }

    const inputs: MdsnInput[] = [];
    const operations: MdsnOperation[] = [];
    index += 1;

    while (index < lines.length) {
      const inner = (lines[index] ?? "").trim();
      if (!inner) {
        index += 1;
        continue;
      }
      if (inner === "}") {
        break;
      }
      if (inner.startsWith("INPUT ")) {
        inputs.push(parseInput(inner));
      } else if (inner.startsWith("GET ") || inner.startsWith("POST ")) {
        operations.push(parseOperation(inner));
      } else {
        throw new MdsnParseError(`Unknown block statement: ${inner}`);
      }
      index += 1;
    }

    if ((lines[index] ?? "").trim() !== "}") {
      throw new MdsnParseError(`Unclosed block ${name}.`);
    }

    blocks.push({ name, inputs, operations });
    index += 1;
  }

  return blocks;
}
