import type { InputType } from "../core";

export type MarkdownValueType = "text" | "list" | "table" | "json" | "image";

export type MarkdownTableValue = {
  columns: string[];
  rows: Array<Array<string | number | boolean | null | undefined>>;
};

export type MarkdownImageValue =
  | string
  | {
    src: string;
    alt?: string;
    title?: string;
  };

export type MarkdownValue =
  | string
  | string[]
  | Record<string, unknown>
  | MarkdownTableValue
  | MarkdownImageValue;

export type SerializableInput = {
  name: string;
  type: InputType;
  required?: boolean;
  secret?: boolean;
  options?: string[];
};

export type SerializableRead = {
  name: string;
  target: string;
  inputs?: string[];
};

export type SerializableWrite = {
  name: string;
  target: string;
  inputs?: string[];
};

export type SerializableBlock = {
  name: string;
  inputs?: SerializableInput[];
  reads?: SerializableRead[];
  writes?: SerializableWrite[];
};

export type RenderMarkdownFragmentOptions = {
  body?: string | string[];
  block?: SerializableBlock;
};

function joinBody(body: string | string[] | undefined): string {
  if (!body) {
    return "";
  }
  return Array.isArray(body)
    ? body.filter((part) => part.trim().length > 0).join("\n\n")
    : body.trim();
}

function escapeTableCell(value: unknown): string {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, "<br />");
}

function formatIdentifierList(inputs: string[] | undefined, options?: { always?: boolean }): string {
  if (inputs && inputs.length > 0) {
    return ` (${inputs.join(", ")})`;
  }
  return options?.always ? " ()" : "";
}

export function renderMarkdownValue(type: "text", value: string, options?: never): string;
export function renderMarkdownValue(type: "list", value: string[], options?: never): string;
export function renderMarkdownValue(type: "table", value: MarkdownTableValue, options?: never): string;
export function renderMarkdownValue(type: "json", value: Record<string, unknown>, options?: { indent?: number }): string;
export function renderMarkdownValue(type: "image", value: MarkdownImageValue, options?: never): string;
export function renderMarkdownValue(type: MarkdownValueType, value: MarkdownValue, options?: { indent?: number }): string {
  switch (type) {
    case "text":
      return String(value);
    case "list":
      return (value as string[]).map((item) => `- ${item}`).join("\n");
    case "table": {
      const table = value as MarkdownTableValue;
      const header = `| ${table.columns.map(escapeTableCell).join(" | ")} |`;
      const divider = `| ${table.columns.map(() => "---").join(" | ")} |`;
      const rows = table.rows.map((row) => `| ${row.map(escapeTableCell).join(" | ")} |`);
      return [header, divider, ...rows].join("\n");
    }
    case "json":
      return `\`\`\`json\n${JSON.stringify(value, null, options?.indent ?? 2)}\n\`\`\``;
    case "image": {
      const image = value as MarkdownImageValue;
      if (typeof image === "string") {
        return `![](${image})`;
      }
      const title = image.title ? ` "${image.title.replace(/"/g, '\\"')}"` : "";
      return `![${image.alt ?? ""}](${image.src}${title})`;
    }
  }
}

export function serializeBlock(block: SerializableBlock): string {
  const lines = ["```mdsn", `block ${block.name} {`];

  for (const input of block.inputs ?? []) {
    const requiredMarker = input.required ? " required" : "";
    const secretMarker = input.secret ? " secret" : "";
    const optionsLiteral = input.options ? ` ${JSON.stringify(input.options)}` : "";
    lines.push(`  INPUT ${input.type}${requiredMarker}${secretMarker}${optionsLiteral} -> ${input.name}`);
  }

  for (const read of block.reads ?? []) {
    lines.push(`  GET "${read.target}"${formatIdentifierList(read.inputs)} -> ${read.name}`);
  }

  for (const write of block.writes ?? []) {
    lines.push(`  POST "${write.target}"${formatIdentifierList(write.inputs, { always: true })} -> ${write.name}`);
  }

  lines.push("}", "```");
  return lines.join("\n");
}

export function renderMarkdownFragment(options: RenderMarkdownFragmentOptions): string {
  const parts: string[] = [];
  const body = joinBody(options.body);

  if (body) {
    parts.push(body);
  }

  if (options.block) {
    parts.push(serializeBlock(options.block));
  }

  return parts.join("\n\n").trimEnd() + "\n";
}
