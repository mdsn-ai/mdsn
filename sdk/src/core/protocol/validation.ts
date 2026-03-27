import type { BlockDefinition } from "../model/block";
import type { BlockAnchorDefinition } from "../model/document";
import type { SchemaDefinition } from "../model/schema";

export function validateDocumentStructure(
  schemas: SchemaDefinition[],
  blocks: BlockDefinition[],
  blockAnchors: BlockAnchorDefinition[],
): void {
  const schemaNames = new Set<string>();
  for (const schema of schemas) {
    if (schemaNames.has(schema.name)) {
      throw new Error(`Duplicate schema name: ${schema.name}`);
    }
    schemaNames.add(schema.name);
  }

  const blockNames = new Set<string>();
  for (const block of blocks) {
    if (blockNames.has(block.name)) {
      throw new Error(`Duplicate block name: ${block.name}`);
    }
    blockNames.add(block.name);
  }

  const anchorNames = new Set<string>();
  for (const anchor of blockAnchors) {
    if (anchorNames.has(anchor.name)) {
      throw new Error(`Duplicate block anchor: ${anchor.name}`);
    }
    anchorNames.add(anchor.name);
    if (!blockNames.has(anchor.name)) {
      throw new Error(`Unknown block ${anchor.name} referenced by mdsn:block anchor`);
    }
  }

  if (blockAnchors.length > 0) {
    for (const block of blocks) {
      if (!anchorNames.has(block.name)) {
        throw new Error(`Missing mdsn:block anchor for block ${block.name}`);
      }
    }
  }

  for (const block of blocks) {
    const inputNames = new Set<string>();
    const operationNames = new Set<string>();

    for (const input of block.inputs) {
      if (inputNames.has(input.name)) {
        throw new Error(`Duplicate input name in block ${block.name}: ${input.name}`);
      }
      inputNames.add(input.name);
      if (input.schema && !schemaNames.has(input.schema)) {
        throw new Error(`Unknown schema ${input.schema} referenced by input ${input.name}`);
      }
    }

    for (const operation of [...block.reads, ...block.writes]) {
      if (operationNames.has(operation.name)) {
        throw new Error(`Duplicate operation name in block ${block.name}: ${operation.name}`);
      }
      operationNames.add(operation.name);
      for (const inputName of operation.inputs) {
        if (!inputNames.has(inputName)) {
          throw new Error(`Unknown input ${inputName} referenced by ${operation.id}`);
        }
      }
    }
  }
}
