import {
  MdsnParseError,
  negotiateRepresentation,
  parseMarkdownBody,
  serializeFragment,
  serializePage,
  type MdsnMarkdownRenderer,
  type MdsnPage
} from "../core/index.js";

import { renderHtmlDocument } from "./html-render.js";
import { MdsnRouter } from "./router.js";
import { fail } from "./result.js";
import type { MdsnActionResult, MdsnHandler, MdsnHandlerResult, MdsnPageHandler, MdsnRequest, MdsnResponse, MdsnSessionProvider, MdsnStreamChunk, MdsnStreamResult } from "./types.js";

export interface CreateMdsnServerOptions {
  session?: MdsnSessionProvider;
  renderHtml?: typeof renderHtmlDocument;
  markdownRenderer?: MdsnMarkdownRenderer;
}

function getPathname(request: MdsnRequest): string {
  return new URL(request.url).pathname;
}

function getInputs(request: MdsnRequest): Record<string, string> {
  if (request.method === "GET") {
    const url = new URL(request.url);
    return Object.fromEntries(url.searchParams.entries());
  }
  return parseMarkdownBody(request.body ?? "");
}

function isSupportedWriteContentType(contentType: string | undefined): boolean {
  if (!contentType) {
    return false;
  }
  return contentType.includes("text/markdown");
}

function hasRequestBody(request: MdsnRequest): boolean {
  return typeof request.body === "string" && request.body.trim().length > 0;
}

function createErrorFragment(title: string, detail?: string) {
  return {
    markdown: detail ? `## ${title}\n\n${detail}` : `## ${title}`,
    blocks: []
  };
}

function createInternalServerErrorResult() {
  return fail({
    status: 500,
    fragment: createErrorFragment(
      "Internal Server Error",
      "The host hit an unexpected failure. Retry the previous action or refresh the page."
    )
  });
}

function getRenderablePage(page: MdsnPage) {
  const visibleBlockNames = page.visibleBlockNames ? new Set(page.visibleBlockNames) : null;
  const blocks = visibleBlockNames ? page.blocks.filter((block) => visibleBlockNames.has(block.name)) : page.blocks;
  const blockContent =
    page.blockContent && visibleBlockNames
      ? Object.fromEntries(Object.entries(page.blockContent).filter(([name]) => visibleBlockNames.has(name)))
      : page.blockContent;

  return blockContent
    ? {
        markdown: page.markdown,
        blockContent,
        blocks
      }
    : {
        markdown: page.markdown,
        blocks
      };
}

function resolveResponseBody(result: MdsnActionResult, representation: "markdown" | "html", renderHtml: typeof renderHtmlDocument): string {
  if (result.page) {
    return representation === "markdown"
      ? serializePage(result.page)
      : renderHtml(
          getRenderablePage(result.page),
          {
            kind: "page",
            ...(result.navigation?.target ? { continueTarget: result.navigation.target } : {})
          }
        );
  }

  if (!result.fragment) {
    throw new Error("Action results must include either a fragment or a page.");
  }

  return representation === "markdown"
    ? serializeFragment(result.fragment)
    : renderHtml(result.fragment, {
        kind: "fragment",
        ...(result.navigation?.target ? { continueTarget: result.navigation.target } : {})
      });
}

function isStreamResult(result: MdsnHandlerResult): result is MdsnStreamResult {
  return "stream" in result;
}

function toAsyncIterable(stream: AsyncIterable<MdsnStreamChunk> | Iterable<MdsnStreamChunk>): AsyncIterable<MdsnStreamChunk> {
  if (Symbol.asyncIterator in stream) {
    return stream as AsyncIterable<MdsnStreamChunk>;
  }

  return (async function* () {
    yield* stream as Iterable<MdsnStreamChunk>;
  })();
}

function serializeSseMessage(markdown: string): string {
  const normalized = markdown.replaceAll("\r\n", "\n");
  const lines = normalized.split("\n");
  return `${lines.map((line) => `data: ${line}`).join("\n")}\n\n`;
}

function createStreamBody(result: MdsnHandlerResult): string | AsyncIterable<string> {
  if (!isStreamResult(result)) {
    if (!result.fragment) {
      throw new Error("Non-stream event-stream responses must include a fragment.");
    }
    return serializeSseMessage(serializeFragment(result.fragment));
  }

  return (async function* () {
    for await (const chunk of toAsyncIterable(result.stream)) {
      const markdown = typeof chunk === "string" ? chunk : serializeFragment(chunk);
      yield serializeSseMessage(markdown);
    }
  })();
}

function createResponse(result: MdsnHandlerResult, representation: "markdown" | "html" | "event-stream", renderHtml: typeof renderHtmlDocument): MdsnResponse {
  const headers: Record<string, string> = {
    "content-type":
      representation === "markdown" ? "text/markdown" : representation === "html" ? "text/html" : "text/event-stream",
    ...(result.headers ?? {})
  };

  const body =
    representation === "markdown"
      ? resolveResponseBody(result as MdsnActionResult, "markdown", renderHtml)
      : representation === "html"
        ? resolveResponseBody(result as MdsnActionResult, "html", renderHtml)
        : createStreamBody(result);

  return {
    status: result.status ?? 200,
    headers,
    body
  };
}

function createPageResponse(
  page: MdsnPage,
  representation: "markdown" | "html",
  renderHtml: typeof renderHtmlDocument,
  route?: string
): MdsnResponse {
  return {
    status: 200,
    headers: {
      "content-type": representation === "markdown" ? "text/markdown" : "text/html"
    },
    body:
      representation === "markdown"
        ? serializePage(page)
        : renderHtml(getRenderablePage(page), {
            kind: "page",
            ...(route ? { route } : {})
          })
  };
}

export function createMdsnServer(options: CreateMdsnServerOptions = {}) {
  const router = new MdsnRouter();
  const sessionProvider = options.session;
  const htmlRenderer =
    options.renderHtml ??
    ((fragment, renderOptions) =>
      renderHtmlDocument(fragment, {
        ...renderOptions,
        ...(options.markdownRenderer ? { markdownRenderer: options.markdownRenderer } : {})
      }));

  return {
    get(path: string, handler: MdsnHandler): void {
      router.get(path, handler);
    },
    page(path: string, handler: MdsnPageHandler): void {
      router.page(path, handler);
    },
    post(path: string, handler: MdsnHandler): void {
      router.post(path, handler);
    },
    async handle(request: MdsnRequest): Promise<MdsnResponse> {
      const representation = negotiateRepresentation(request.headers.accept);
      if (representation === "not-acceptable") {
        return createResponse(
          fail({
            status: 406,
            fragment: {
              markdown: "## Not Acceptable",
              blocks: []
            }
          }),
          "markdown",
          htmlRenderer
        );
      }

      const pathname = getPathname(request);
      const session = sessionProvider ? await sessionProvider.read(request) : null;

      if (request.method === "GET") {
        const pageHandler = router.resolvePage(pathname);
        if (pageHandler) {
          if (representation === "event-stream") {
            return createResponse(
              fail({
                status: 406,
                fragment: createErrorFragment("Not Acceptable", "Page routes do not support text/event-stream.")
              }),
              "markdown",
              htmlRenderer
            );
          }
          let page: MdsnPage | null;
          try {
            page = await pageHandler({
              request,
              session
            });
          } catch {
            return createResponse(createInternalServerErrorResult(), representation, htmlRenderer);
          }
          if (page) {
            return createPageResponse(page, representation, htmlRenderer, pathname);
          }
        }
      }

      const handler = router.resolve(request.method, pathname);
      if (!handler) {
        return createResponse(
          fail({
            status: 404,
            fragment: {
              markdown: "## Not Found",
              blocks: []
            }
          }),
          representation,
          htmlRenderer
        );
      }

      if (request.method === "POST" && hasRequestBody(request) && !isSupportedWriteContentType(request.headers["content-type"])) {
        return createResponse(
          fail({
            status: 415,
            fragment: createErrorFragment(
              "Unsupported Media Type",
              'POST requests must use Content-Type: "text/markdown".'
            )
          }),
          representation,
          htmlRenderer
        );
      }

      let inputs: Record<string, string>;
      try {
        inputs = getInputs(request);
      } catch (error) {
        if (error instanceof MdsnParseError) {
          return createResponse(
            fail({
              status: 400,
              fragment: createErrorFragment("Invalid Request Body", error.message)
            }),
            representation,
            htmlRenderer
          );
        }
        throw error;
      }

      let result: MdsnHandlerResult;
      try {
        result = await handler({
          request,
          inputs,
          session
        });
      } catch {
        return createResponse(createInternalServerErrorResult(), representation, htmlRenderer);
      }
      const response = createResponse(result, representation, htmlRenderer);

      if (sessionProvider) {
        try {
          if (result.session?.type === "sign-out") {
            await sessionProvider.clear(session, response, request);
          } else {
            await sessionProvider.commit(result.session ?? null, response);
          }
        } catch {
          return createResponse(createInternalServerErrorResult(), representation, htmlRenderer);
        }
      }

      return response;
    }
  };
}
