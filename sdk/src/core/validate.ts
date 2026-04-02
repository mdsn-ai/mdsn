import { MdsnValidationError } from "./errors.js";
import type { MdsnBlock, MdsnOperation, MdsnPage } from "./types.js";

const identifierPattern = /^[a-zA-Z_][\w-]*$/;

function assertUnique(values: string[], messageFactory: (value: string) => string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      throw new MdsnValidationError(messageFactory(value));
    }
    seen.add(value);
  }
}

function validateInputs(block: MdsnBlock): void {
  assertUnique(
    block.inputs.map((input) => input.name),
    (name) => `Duplicate input "${name}" in block "${block.name}".`
  );

  for (const input of block.inputs) {
    if (!identifierPattern.test(input.name)) {
      throw new MdsnValidationError(`Invalid input name "${input.name}".`);
    }
    if (input.type === "choice") {
      if (!input.options || input.options.length === 0) {
        throw new MdsnValidationError(`Choice input "${input.name}" must declare at least one option.`);
      }
    } else if (input.options && input.options.length > 0) {
      throw new MdsnValidationError(`Only choice inputs may declare options. Received options on "${input.name}".`);
    }
  }
}

function validateOperationNames(block: MdsnBlock): void {
  const names = block.operations.flatMap((operation) => (operation.name ? [operation.name] : []));
  assertUnique(names, (name) => `Duplicate operation "${name}" in block "${block.name}".`);
}

function validateOperationReferences(block: MdsnBlock): void {
  const inputNames = new Set(block.inputs.map((input) => input.name));
  let autoGetCount = 0;
  for (const operation of block.operations) {
    for (const input of operation.inputs) {
      if (!inputNames.has(input)) {
        throw new MdsnValidationError(
          `Operation "${operation.name ?? operation.target}" references undeclared input "${input}" in block "${block.name}".`
        );
      }
    }
    if (operation.method === "GET") {
      validateGetOperation(operation, block.name);
      if (operation.auto) {
        autoGetCount += 1;
      }
    } else {
      validatePostOperation(operation, block.name);
    }
  }
  if (autoGetCount > 1) {
    throw new MdsnValidationError(`Block "${block.name}" may define at most one auto GET operation.`);
  }
}

function validateGetOperation(operation: MdsnOperation, blockName: string): void {
  if (operation.method !== "GET") {
    return;
  }
  const isStream = operation.accept === "text/event-stream";
  if (isStream && operation.name) {
    throw new MdsnValidationError(
      `Stream GET "${operation.target}" in block "${blockName}" must not define an operation name.`
    );
  }
  if (!isStream && !operation.name) {
    throw new MdsnValidationError(
      `GET "${operation.target}" in block "${blockName}" must define an operation name.`
    );
  }
  if (operation.auto && operation.inputs.length > 0) {
    throw new MdsnValidationError(
      `Auto GET "${operation.target}" in block "${blockName}" must not declare inputs.`
    );
  }
  if (operation.auto && operation.accept) {
    throw new MdsnValidationError(
      `Auto GET "${operation.target}" in block "${blockName}" must not declare an accept override.`
    );
  }
}

function validatePostOperation(operation: MdsnOperation, blockName: string): void {
  if (operation.method !== "POST") {
    return;
  }
  if (!operation.name) {
    throw new MdsnValidationError(
      `POST "${operation.target}" in block "${blockName}" must define an operation name.`
    );
  }
  if (operation.auto) {
    throw new MdsnValidationError(
      `POST "${operation.target}" in block "${blockName}" must not declare auto.`
    );
  }
}

export function validatePage(page: MdsnPage): MdsnPage {
  assertUnique(page.blocks.map((block) => block.name), (name) => `Duplicate block "${name}".`);
  assertUnique(page.blockAnchors, (name) => `Duplicate block anchor "${name}".`);

  const blockNames = new Set(page.blocks.map((block) => block.name));
  for (const anchor of page.blockAnchors) {
    if (!blockNames.has(anchor)) {
      throw new MdsnValidationError(`Anchor "${anchor}" does not match any BLOCK.`);
    }
  }

  if (page.blockAnchors.length > 0) {
    for (const block of page.blocks) {
      if (!page.blockAnchors.includes(block.name)) {
        throw new MdsnValidationError(`Block "${block.name}" is missing a matching anchor.`);
      }
    }
  }

  for (const block of page.blocks) {
    validateInputs(block);
    validateOperationNames(block);
    validateOperationReferences(block);
  }

  return page;
}
