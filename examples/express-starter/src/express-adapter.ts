import { serializeMarkdownBody } from "@mdsnai/sdk/core";
import type { MdsnRequest, MdsnResponse } from "@mdsnai/sdk/server";

interface MdsnRequestHandler {
  handle(request: MdsnRequest): Promise<MdsnResponse>;
}

type HeaderValue = string | string[] | undefined;

export interface ExpressLikeRequest {
  method?: string;
  url?: string;
  originalUrl?: string;
  protocol?: string;
  headers: Record<string, HeaderValue>;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string>;
  get?(name: string): string | undefined;
}

export interface ExpressLikeResponse {
  status(code: number): this;
  setHeader(name: string, value: string): this;
  end(chunk?: string): void;
  write(chunk: string): void;
}

export interface CreateExpressMdsnHandlerOptions {
  transformHtml?: (html: string) => string;
}

function normalizeHeaderValue(value: HeaderValue): string | undefined {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return value;
}

function parseCookies(rawCookie: string | undefined): Record<string, string> {
  if (!rawCookie?.trim()) {
    return {};
  }

  const cookies: Record<string, string> = {};
  for (const pair of rawCookie.split(";")) {
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

function toRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") {
    return {};
  }
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, String(item)]));
}

function normalizeBody(body: unknown, contentType: string | undefined): string | undefined {
  if (typeof body === "string") {
    return body;
  }
  if (!body) {
    return undefined;
  }
  if (contentType?.includes("application/x-www-form-urlencoded")) {
    return serializeMarkdownBody(toRecord(body));
  }
  if (typeof Buffer !== "undefined" && body instanceof Buffer) {
    return body.toString("utf8");
  }
  return String(body);
}

function toMdsnRequest(request: ExpressLikeRequest): MdsnRequest {
  const method = request.method === "POST" ? "POST" : "GET";
  const host = request.get?.("host") ?? normalizeHeaderValue(request.headers.host) ?? "127.0.0.1";
  const urlPath = request.originalUrl ?? request.url ?? "/";
  const headers = Object.fromEntries(
    Object.entries(request.headers).map(([name, value]) => [name.toLowerCase(), normalizeHeaderValue(value)])
  ) as Record<string, string | undefined>;
  headers.accept ??= "text/html";

  const normalizedBody = normalizeBody(request.body, headers["content-type"]);
  if (normalizedBody && headers["content-type"]?.includes("application/x-www-form-urlencoded")) {
    headers["content-type"] = "text/markdown";
  }

  return {
    method,
    url: new URL(urlPath, `${request.protocol ?? "http"}://${host}`).toString(),
    headers,
    ...(normalizedBody ? { body: normalizedBody } : {}),
    cookies: request.cookies ?? parseCookies(headers.cookie)
  };
}

export function createExpressMdsnHandler(
  handler: MdsnRequestHandler,
  options: CreateExpressMdsnHandlerOptions = {}
) {
  return async (request: ExpressLikeRequest, response: ExpressLikeResponse): Promise<void> => {
    const result = await handler.handle(toMdsnRequest(request));
    response.status(result.status);
    for (const [name, value] of Object.entries(result.headers)) {
      response.setHeader(name, value);
    }

    const contentType = String(result.headers["content-type"] ?? "");
    if (typeof result.body === "string") {
      response.end(contentType.includes("text/html") && options.transformHtml ? options.transformHtml(result.body) : result.body);
      return;
    }

    for await (const chunk of result.body) {
      response.write(chunk);
    }
    response.end();
  };
}
