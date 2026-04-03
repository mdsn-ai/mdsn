import { readFile, stat } from "node:fs/promises";
import { extname, resolve } from "node:path";

import { serializeMarkdownBody } from "../core/index.js";

import { toMarkdownContentType } from "./content-type.js";
import type { MdsnRequest, MdsnResponse } from "./types.js";

interface MdsnRequestHandler {
  handle(request: MdsnRequest): Promise<MdsnResponse>;
}

export interface CreateBunHostOptions {
  rootRedirect?: string;
  ignoreFavicon?: boolean;
  staticFiles?: Record<string, string>;
  staticMounts?: BunStaticMount[];
  transformHtml?: (html: string) => string;
  maxBodyBytes?: number;
}

export interface BunStaticMount {
  urlPrefix: string;
  directory: string;
}

const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;

class PayloadTooLargeError extends Error {
  constructor() {
    super("Payload Too Large");
  }
}

function parseCookies(header: string | null): Record<string, string> {
  if (!header?.trim()) {
    return {};
  }

  const cookies: Record<string, string> = {};
  for (const pair of header.split(";")) {
    const [rawName, ...rawValue] = pair.split("=");
    const name = rawName?.trim();
    if (!name) {
      continue;
    }
    const serializedValue = rawValue.join("=").trim();
    try {
      cookies[name] = decodeURIComponent(serializedValue);
    } catch {
      cookies[name] = serializedValue;
    }
  }
  return cookies;
}

function normalizeBody(body: string | undefined, contentType: string | null): string | undefined {
  if (!body) {
    return undefined;
  }
  if (!contentType?.includes("application/x-www-form-urlencoded")) {
    return body;
  }
  const params = new URLSearchParams(body);
  return serializeMarkdownBody(Object.fromEntries(params.entries()));
}

async function readBody(request: Request, maxBodyBytes: number): Promise<string | undefined> {
  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : Number.NaN;
  if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
    throw new PayloadTooLargeError();
  }

  const text = await request.text();
  if (!text) {
    return undefined;
  }

  if (Buffer.byteLength(text) > maxBodyBytes) {
    throw new PayloadTooLargeError();
  }

  return text;
}

function getContentType(filePath: string): string {
  const extension = extname(filePath);
  return extension === ".js" || extension === ".mjs"
    ? "text/javascript"
    : extension === ".css"
      ? "text/css"
      : extension === ".map" || extension === ".json"
        ? "application/json"
        : extension === ".html"
          ? "text/html"
          : extension === ".svg"
            ? "image/svg+xml"
            : extension === ".txt"
              ? "text/plain"
              : "application/octet-stream";
}

function resolveMountedFile(directory: string, urlPrefix: string, pathname: string): string | null {
  const normalizedPrefix =
    urlPrefix.length > 1 && urlPrefix.endsWith("/") ? urlPrefix.slice(0, -1) : urlPrefix;

  if (normalizedPrefix === "/") {
    const baseDirectory = resolve(directory);
    const target = resolve(baseDirectory, pathname.replace(/^\/+/, ""));
    if (target !== baseDirectory && !target.startsWith(`${baseDirectory}/`)) {
      return null;
    }
    return target;
  }

  if (pathname !== normalizedPrefix && !pathname.startsWith(`${normalizedPrefix}/`)) {
    return null;
  }

  const relativePath = pathname.slice(normalizedPrefix.length).replace(/^\/+/, "");
  const baseDirectory = resolve(directory);
  const target = resolve(baseDirectory, relativePath);
  if (target !== baseDirectory && !target.startsWith(`${baseDirectory}/`)) {
    return null;
  }
  return target;
}

async function tryServeStaticFile(filePath: string): Promise<Response | null> {
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return null;
    }

    const body = await readFile(filePath);
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": getContentType(filePath),
        "cache-control": "public, max-age=0, must-revalidate"
      }
    });
  } catch {
    return null;
  }
}

function toMdsnRequest(request: Request, body: string | undefined): MdsnRequest {
  const headers: Record<string, string | undefined> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  headers.accept ??= "text/html";
  if (body && headers["content-type"]?.includes("application/x-www-form-urlencoded")) {
    headers["content-type"] = "text/markdown";
  }

  return {
    method: request.method === "POST" ? "POST" : "GET",
    url: request.url,
    headers,
    ...(body ? { body } : {}),
    cookies: parseCookies(request.headers.get("cookie"))
  };
}

function toReadableStream(body: AsyncIterable<string>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const iterator = body[Symbol.asyncIterator]();

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const chunk = await iterator.next();
      if (chunk.done) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(chunk.value));
    },
    async cancel() {
      if (typeof iterator.return === "function") {
        await iterator.return();
      }
    }
  });
}

function toResponse(result: MdsnResponse, transformHtml?: (html: string) => string): Response {
  const headers = new Headers(result.headers);
  const contentType = headers.get("content-type") ?? "";

  if (typeof result.body === "string") {
    return new Response(contentType.includes("text/html") && transformHtml ? transformHtml(result.body) : result.body, {
      status: result.status,
      headers
    });
  }

  return new Response(toReadableStream(result.body), {
    status: result.status,
    headers
  });
}

export function createHost(handler: MdsnRequestHandler, options: CreateBunHostOptions = {}) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);

    if (options.rootRedirect && url.pathname === "/") {
      return new Response(null, {
        status: 302,
        headers: {
          location: options.rootRedirect
        }
      });
    }

    if (options.ignoreFavicon !== false && url.pathname === "/favicon.ico") {
      return new Response(null, { status: 204 });
    }

    const staticFile = options.staticFiles?.[url.pathname];
    if (staticFile) {
      const response = await tryServeStaticFile(staticFile);
      if (response) {
        return response;
      }
    }

    for (const mount of options.staticMounts ?? []) {
      const target = resolveMountedFile(mount.directory, mount.urlPrefix, url.pathname);
      if (!target) {
        continue;
      }
      const response = await tryServeStaticFile(target);
      if (response) {
        return response;
      }
    }

    const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
    let normalizedBody: string | undefined;
    try {
      normalizedBody = normalizeBody(await readBody(request, maxBodyBytes), request.headers.get("content-type"));
    } catch (error) {
      if (error instanceof PayloadTooLargeError) {
        return new Response("## Payload Too Large\n\nRequest body exceeded maxBodyBytes.", {
          status: 413,
          headers: {
            "content-type": toMarkdownContentType()
          }
        });
      }
      throw error;
    }

    const result = await handler.handle(toMdsnRequest(request, normalizedBody));
    return toResponse(result, options.transformHtml);
  };
}
