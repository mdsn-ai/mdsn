import type { BlockDefinition } from "../model/block";
import type { SchemaDefinition } from "../model/schema";
import {
  getNextOperationOrder,
  parseBlockHeaderLine,
  parseInputLine,
  parseReadOrWriteLine,
  parseRedirectLine,
  parseSchemaBlock,
} from "./statements";

function createBlock(name: string): BlockDefinition {
  return {
    name,
    inputs: [],
    reads: [],
    writes: [],
    redirects: [],
  };
}

export function parseMdsnBlocks(blocks: string[]): {
  schemas: SchemaDefinition[];
  blocks: BlockDefinition[];
} {
  const schemas: SchemaDefinition[] = [];
  const documentBlocks: BlockDefinition[] = [];
  let currentBlock: BlockDefinition | null = null;

  for (const blockText of blocks) {
    const lines = blockText.split(/\r?\n/);
    let index = 0;

    while (index < lines.length) {
      const line = lines[index].trim();
      if (!line) {
        index += 1;
        continue;
      }

      if (!currentBlock) {
        if (line.startsWith("schema ")) {
          const parsed = parseSchemaBlock(lines, index);
          schemas.push(parsed.schema);
          index = parsed.nextIndex;
          continue;
        }

        if (line.startsWith("block ")) {
          currentBlock = createBlock(parseBlockHeaderLine(line));
          documentBlocks.push(currentBlock);
          index += 1;
          continue;
        }

        if (line === "}") {
          throw new Error(`Unexpected block terminator: ${line}`);
        }

        throw new Error(`Unsupported MDSN statement: ${line}`);
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
        currentBlock.reads.push(
          parseReadOrWriteLine(line, "read", currentBlock.name, getNextOperationOrder(currentBlock)),
        );
        index += 1;
        continue;
      }

      if (line.startsWith("write ")) {
        currentBlock.writes.push(
          parseReadOrWriteLine(line, "write", currentBlock.name, getNextOperationOrder(currentBlock)),
        );
        index += 1;
        continue;
      }

      if (line.startsWith("redirect ")) {
        currentBlock.redirects.push(parseRedirectLine(line, currentBlock.name, getNextOperationOrder(currentBlock)));
        index += 1;
        continue;
      }

      throw new Error(`Unsupported MDSN statement: ${line}`);
    }
  }

  if (currentBlock) {
    throw new Error(`Unterminated block declaration: ${currentBlock.name}`);
  }

  return {
    schemas,
    blocks: documentBlocks,
  };
}
