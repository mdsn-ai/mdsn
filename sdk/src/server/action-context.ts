import type express from "express";
import type { ActionContext } from "./action";

export interface CreateActionContextFromRequestOptions {
  inputs?: Record<string, unknown>;
  pathname?: string;
  cookies?: Record<string, string>;
  env?: Record<string, string | undefined>;
  siteTitle?: string;
  siteBaseUrl?: string;
}

export function createActionContextFromRequest(
  req: express.Request,
  options: CreateActionContextFromRequestOptions = {},
): ActionContext {
  const body = (req.body ?? {}) as {
    inputs?: Record<string, unknown>;
    pathname?: string;
  };

  return {
    inputs: options.inputs ?? body.inputs ?? {},
    params: Object.fromEntries(Object.entries(req.params).map(([key, value]) => [key, String(value)])),
    query: new URLSearchParams(
      Object.entries(req.query).flatMap(([key, value]) => {
        if (value === undefined) return [];
        if (Array.isArray(value)) {
          return value.map((item) => [key, String(item)] as [string, string]);
        }
        return [[key, String(value)] as [string, string]];
      }),
    ),
    pathname: options.pathname ?? (typeof body.pathname === "string" ? body.pathname : req.path),
    request: req,
    cookies: options.cookies ?? {},
    env: options.env ?? process.env,
    site: {
      title: options.siteTitle,
      baseUrl: options.siteBaseUrl,
    },
  };
}
