import type { MdsnFragment, MdsnPage } from "../core/index.js";

export interface MdsnRequest {
  method: "GET" | "POST";
  url: string;
  headers: Record<string, string | undefined>;
  query?: Record<string, string>;
  body?: string;
  cookies: Record<string, string>;
}

export interface MdsnResponse {
  status: number;
  headers: Record<string, string>;
  body: string | AsyncIterable<string>;
}

export interface MdsnSessionSnapshot {
  [key: string]: unknown;
}

export type MdsnSessionMutation =
  | { type: "sign-in"; session: MdsnSessionSnapshot }
  | { type: "refresh"; session: MdsnSessionSnapshot }
  | { type: "sign-out" };

export interface MdsnSessionProvider {
  read(request: MdsnRequest): Promise<MdsnSessionSnapshot | null>;
  commit(mutation: MdsnSessionMutation | null, response: MdsnResponse): Promise<void>;
  clear(session: MdsnSessionSnapshot | null, response: MdsnResponse, request: MdsnRequest): Promise<void>;
}

export interface MdsnProtocolDiscovery {
  markdownHref: string;
  llmsTxtHref?: string;
}

export interface MdsnHtmlDiscoveryLinks extends Partial<MdsnProtocolDiscovery> {}

export interface MdsnHtmlDiscoveryContext {
  request: MdsnRequest;
  kind: "page" | "fragment";
  route?: string;
}

export type MdsnHtmlDiscoveryResolver =
  | MdsnHtmlDiscoveryLinks
  | ((context: MdsnHtmlDiscoveryContext) => MdsnHtmlDiscoveryLinks | null | undefined);

export interface MdsnActionResult {
  fragment?: MdsnFragment;
  page?: MdsnPage;
  route?: string;
  status?: number;
  headers?: Record<string, string>;
  session?: MdsnSessionMutation;
}

export type MdsnStreamChunk = string | MdsnFragment;

export interface MdsnStreamResult {
  stream: AsyncIterable<MdsnStreamChunk> | Iterable<MdsnStreamChunk>;
  route?: string;
  status?: number;
  headers?: Record<string, string>;
  session?: MdsnSessionMutation;
}

export interface MdsnHandlerContext {
  request: MdsnRequest;
  inputs: Record<string, string>;
  session: MdsnSessionSnapshot | null;
}

export type MdsnHandlerResult = MdsnActionResult | MdsnStreamResult;

export type MdsnHandler = (context: MdsnHandlerContext) => Promise<MdsnHandlerResult> | MdsnHandlerResult;

export interface MdsnPageHandlerContext {
  request: MdsnRequest;
  session: MdsnSessionSnapshot | null;
}

export type MdsnPageHandler = (context: MdsnPageHandlerContext) => Promise<MdsnPage | null> | MdsnPage | null;
