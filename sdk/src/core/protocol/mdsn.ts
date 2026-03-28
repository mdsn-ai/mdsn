import type { BlockDefinition } from "../model/block";
import {
  getNextOperationOrder,
  parseBlockHeaderLine,
  parseInputLine,
  parseReadOrWriteLine,
} from "./statements";

function createBlock(name: string): BlockDefinition {
  return {
    name,
    inputs: [],
    reads: [],
    writes: [],
  };
}

export function parseMdsnBlocks(blocks: string[]): {
  blocks: BlockDefinition[];
} {
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

      if (line.startsWith("INPUT ")) {
        currentBlock.inputs.push(parseInputLine(line, currentBlock.name));
        index += 1;
        continue;
      }

      if (line.startsWith("GET ")) {
        currentBlock.reads.push(
          parseReadOrWriteLine(line, "read", currentBlock.name, getNextOperationOrder(currentBlock)),
        );
        index += 1;
        continue;
      }

      if (line.startsWith("POST ")) {
        currentBlock.writes.push(
          parseReadOrWriteLine(line, "write", currentBlock.name, getNextOperationOrder(currentBlock)),
        );
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
    blocks: documentBlocks,
  };
}
