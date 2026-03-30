import type { IncomingMessage, RequestListener, ServerResponse } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { pipeline } from "node:stream/promises";

import { serializeMarkdownBody } from "../core/index.js";

import type { MdsnRequest, MdsnResponse } from "./types.js";

interface MdsnRequestHandler {
  handle(request: MdsnRequest): Promise<MdsnResponse>;
}

export interface CreateNodeRequestListenerOptions {
  transformHtml?: (html: string) => string;
  maxBodyBytes?: number;
}

export interface NodeStaticMount {
  urlPrefix: string;
  directory: string;
}

export interface CreateNodeHostOptions extends CreateNodeRequestListenerOptions {
  rootRedirect?: string;
  ignoreFavicon?: boolean;
  staticFiles?: Record<string, string>;
  staticMounts?: NodeStaticMount[];
}

const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;

class PayloadTooLargeError extends Error {
  constructor() {
    super("Payload Too Large");
  }
}

async function readBody(request: IncomingMessage, maxBodyBytes: number): Promise<string | undefined> {
  let body = "";
  let totalBytes = 0;

  for await (const chunk of request) {
    const textChunk = typeof chunk === "string" ? chunk : chunk.toString("utf8");
    const chunkBytes = typeof chunk === "string" ? Buffer.byteLength(chunk) : chunk.byteLength;
    totalBytes += chunkBytes;
    if (totalBytes > maxBodyBytes) {
      throw new PayloadTooLargeError();
    }
    body += textChunk;
  }
  return body || undefined;
}

function normalizeHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return value;
}

function parseCookies(header: string | undefined): Record<string, string> {
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

function normalizeBody(body: string | undefined, contentType: string): string | undefined {
  if (!body) {
    return undefined;
  }
  if (!contentType.includes("application/x-www-form-urlencoded")) {
    return body;
  }
  const params = new URLSearchParams(body);
  return serializeMarkdownBody(Object.fromEntries(params.entries()));
}

function getContentType(filePath: string): string {
  const extension = extname(filePath);
  return extension === ".js"
    ? "text/javascript"
    : extension === ".css"
      ? "text/css"
      : extension === ".map" || extension === ".json"
        ? "application/json"
        : extension === ".html"
          ? "text/html"
          : extension === ".svg"
            ? "image/svg+xml"
            : extension === ".mjs"
              ? "text/javascript"
              : extension === ".txt"
                ? "text/plain"
                : "application/octet-stream";
}

function toEtag(size: number, mtimeMs: number): string {
  return `W/"${size.toString(16)}-${Math.floor(mtimeMs).toString(16)}"`;
}

async function tryServeStaticFile(request: IncomingMessage, response: ServerResponse, filePath: string): Promise<boolean> {
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return false;
    }

    const contentType = getContentType(filePath);
    const etag = toEtag(fileStat.size, fileStat.mtimeMs);
    response.setHeader("content-type", contentType);
    response.setHeader("cache-control", "public, max-age=0, must-revalidate");
    response.setHeader("etag", etag);

    if (request.headers["if-none-match"] === etag) {
      response.statusCode = 304;
      response.end();
      return true;
    }

    response.statusCode = 200;
    await pipeline(createReadStream(filePath), response);
    return true;
  } catch {
    return false;
  }
}

function resolveMountedFile(directory: string, urlPrefix: string, pathname: string): string | null {
  if (!pathname.startsWith(urlPrefix)) {
    return null;
  }

  const relativePath = pathname.slice(urlPrefix.length);
  const baseDirectory = resolve(directory);
  const target = resolve(baseDirectory, relativePath);
  if (target !== baseDirectory && !target.startsWith(`${baseDirectory}/`)) {
    return null;
  }
  return target;
}

function toMdsnRequest(request: IncomingMessage, body: string | undefined): MdsnRequest {
  const method = request.method === "POST" ? "POST" : "GET";
  const host = request.headers.host ?? "127.0.0.1";
  const headers = Object.fromEntries(
    Object.entries(request.headers).map(([key, value]) => [key, normalizeHeaderValue(value)])
  ) as Record<string, string | undefined>;
  headers.accept ??= "text/html";
  if (body && headers["content-type"]?.includes("application/x-www-form-urlencoded")) {
    headers["content-type"] = "text/markdown";
  }

  return {
    method,
    url: new URL(request.url ?? "/", `http://${host}`).toString(),
    headers,
    ...(body ? { body } : {}),
    cookies: parseCookies(headers.cookie)
  };
}

async function writeResponse(response: ServerResponse, result: MdsnResponse, transformHtml?: (html: string) => string): Promise<void> {
  response.statusCode = result.status;
  for (const [key, value] of Object.entries(result.headers)) {
    response.setHeader(key, value);
  }
  const contentType = String(result.headers["content-type"] ?? "");
  if (typeof result.body === "string") {
    response.end(contentType.includes("text/html") && transformHtml ? transformHtml(result.body) : result.body);
    return;
  }

  for await (const chunk of result.body) {
    response.write(chunk);
  }
  response.end();
}

export function createNodeRequestListener(
  handler: MdsnRequestHandler,
  options: CreateNodeRequestListenerOptions = {}
): RequestListener {
  return async (request, response) => {
    const contentType = request.headers["content-type"] ?? "";
    const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
    let normalizedBody: string | undefined;
    try {
      normalizedBody = normalizeBody(await readBody(request, maxBodyBytes), contentType);
    } catch (error) {
      if (error instanceof PayloadTooLargeError) {
        response.statusCode = 413;
        response.setHeader("content-type", "text/markdown");
        response.end("## Payload Too Large\n\nRequest body exceeded maxBodyBytes.");
        return;
      }
      throw error;
    }
    const result = await handler.handle(toMdsnRequest(request, normalizedBody));
    await writeResponse(response, result, options.transformHtml);
  };
}

export function createNodeHost(handler: MdsnRequestHandler, options: CreateNodeHostOptions = {}): RequestListener {
  const requestListener = createNodeRequestListener(handler, options);

  return async (request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);

    if (options.rootRedirect && url.pathname === "/") {
      response.statusCode = 302;
      response.setHeader("location", options.rootRedirect);
      response.end();
      return;
    }

    if (options.ignoreFavicon !== false && url.pathname === "/favicon.ico") {
      response.statusCode = 204;
      response.end();
      return;
    }

    const staticFile = options.staticFiles?.[url.pathname];
    if (staticFile && (await tryServeStaticFile(request, response, staticFile))) {
      return;
    }

    for (const mount of options.staticMounts ?? []) {
      const target = resolveMountedFile(mount.directory, mount.urlPrefix, url.pathname);
      if (target && (await tryServeStaticFile(request, response, target))) {
        return;
      }
    }

    await requestListener(request, response);
  };
}
