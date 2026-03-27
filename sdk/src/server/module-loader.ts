import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const requireFromCwd = createRequire(path.join(process.cwd(), "package.json"));

export type ImportModuleFromFileOptions = {
  fresh?: boolean;
};

function toImportSpecifier(filePath: string, options: ImportModuleFromFileOptions): string {
  const url = pathToFileURL(filePath);
  if (options.fresh) {
    url.searchParams.set("ts", String(Date.now()));
  }
  return url.href;
}

function requireModuleFromFile(filePath: string, options: ImportModuleFromFileOptions): Record<string, unknown> {
  if (!options.fresh) {
    return requireFromCwd(filePath) as Record<string, unknown>;
  }

  const resolvedPath = requireFromCwd.resolve(filePath);
  delete requireFromCwd.cache[resolvedPath];
  return requireFromCwd(filePath) as Record<string, unknown>;
}

export async function importModuleFromFile(
  filePath: string,
  options: ImportModuleFromFileOptions = {},
): Promise<Record<string, unknown>> {
  try {
    return await import(toImportSpecifier(filePath, options)) as Record<string, unknown>;
  } catch (importError) {
    try {
      return requireModuleFromFile(filePath, options);
    } catch {
      throw importError;
    }
  }
}
