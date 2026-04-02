import {
  MdsnParseError,
  negotiateRepresentation,
  parseMarkdownBody,
  serializeFragment,
  serializePage,
  type MdsnBlock,
  type MdsnFragment,
  type MdsnMarkdownRenderer,
  type MdsnOperation,
  type MdsnPage
} from "../core/index.js";

import { toMarkdownContentType } from "./content-type.js";
import { injectHtmlDiscoveryLinks, renderHtmlDocument } from "./html-render.js";
import { MdsnRouter } from "./router.js";
import { fail } from "./result.js";
import type {
  MdsnActionResult,
  MdsnHandler,
  MdsnHandlerResult,
  MdsnHtmlDiscoveryContext,
  MdsnHtmlDiscoveryLinks,
  MdsnHtmlDiscoveryResolver,
  MdsnPageHandler,
  MdsnRequest,
  MdsnResponse,
  MdsnSessionProvider,
  MdsnSessionSnapshot,
  MdsnStreamChunk,
  MdsnStreamResult
} from "./types.js";

export interface CreateMdsnServerOptions {
  session?: MdsnSessionProvider;
  renderHtml?: typeof renderHtmlDocument;
  markdownRenderer?: MdsnMarkdownRenderer;
  htmlDiscovery?: MdsnHtmlDiscoveryResolver;
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

function normalizeDiscoveryLink(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function resolveHtmlDiscoveryLinks(
  htmlDiscovery: MdsnHtmlDiscoveryResolver | undefined,
  context: MdsnHtmlDiscoveryContext
): MdsnHtmlDiscoveryLinks | null {
  if (!htmlDiscovery) {
    return null;
  }

  const resolved = typeof htmlDiscovery === "function" ? htmlDiscovery(context) : htmlDiscovery;
  if (!resolved) {
    return null;
  }

  const markdownHref = normalizeDiscoveryLink(resolved.markdownHref);
  const llmsTxtHref = normalizeDiscoveryLink(resolved.llmsTxtHref);
  if (!markdownHref && !llmsTxtHref) {
    return null;
  }

  return {
    ...(markdownHref ? { markdownHref } : {}),
    ...(llmsTxtHref ? { llmsTxtHref } : {})
  };
}

function discoveryLinksToHeader(links: MdsnHtmlDiscoveryLinks | null): string | undefined {
  if (!links) {
    return undefined;
  }

  const values = [
    links.markdownHref ? `<${links.markdownHref}>; rel="alternate"; type="text/markdown"` : "",
    links.llmsTxtHref ? `<${links.llmsTxtHref}>; rel="llms-txt"` : ""
  ].filter(Boolean);

  return values.length > 0 ? values.join(", ") : undefined;
}

function mergeLinkHeader(headers: Record<string, string>, linkHeader: string | undefined): Record<string, string> {
  if (!linkHeader) {
    return headers;
  }

  return {
    ...headers,
    link: headers.link ? `${headers.link}, ${linkHeader}` : linkHeader
  };
}

function isAutoDependency(operation: MdsnOperation): boolean {
  return operation.method === "GET" && operation.auto === true;
}

function applySessionMutation(
  session: MdsnSessionSnapshot | null,
  mutation: MdsnActionResult["session"] | undefined
): MdsnSessionSnapshot | null {
  if (!mutation) {
    return session;
  }

  if (mutation.type === "sign-out") {
    return null;
  }

  return mutation.session;
}

function createImplicitGetRequest(target: string, request: MdsnRequest): MdsnRequest {
  const targetUrl = new URL(target, request.url);
  return {
    ...request,
    method: "GET",
    url: targetUrl.toString(),
    headers: {
      ...request.headers,
      accept: "text/markdown"
    },
    query: Object.fromEntries(targetUrl.searchParams.entries())
  };
}

function applyImplicitFragmentToPage(
  page: MdsnPage,
  blockName: string,
  operation: MdsnOperation,
  fragment: MdsnFragment
): MdsnPage {
  const existingBlock = page.blocks.find((block) => block.name === blockName);
  const returnedBlock = fragment.blocks.find((block) => block.name === blockName) ?? fragment.blocks[0];
  const nextBlock =
    returnedBlock ??
    (existingBlock
      ? {
          ...existingBlock,
          operations: existingBlock.operations.filter((entry) => entry !== operation)
        }
      : undefined);

  return {
    ...page,
    blocks: page.blocks.map((block) => (block.name === blockName && nextBlock ? nextBlock : block)),
    blockContent: {
      ...(page.blockContent ?? {}),
      [blockName]: fragment.markdown
    }
  };
}

async function resolveAutoTarget(
  target: string,
  request: MdsnRequest,
  session: MdsnSessionSnapshot | null,
  router: MdsnRouter
): Promise<MdsnActionResult | null> {
  const implicitRequest = createImplicitGetRequest(target, request);
  const pathname = getPathname(implicitRequest);
  const pageHandler = router.resolvePage(pathname);

  if (pageHandler) {
    const page = await pageHandler({
      request: implicitRequest,
      session
    });

    if (!page) {
      return null;
    }

    return {
      status: 200,
      route: pathname,
      page
    };
  }

  const handler = router.resolve("GET", pathname);
  if (!handler) {
    return null;
  }

  const result = await handler({
    request: implicitRequest,
    inputs: Object.fromEntries(new URL(implicitRequest.url).searchParams.entries()),
    session
  });

  if (isStreamResult(result)) {
    return null;
  }

  return result;
}

function findAutoDependency(blocks: MdsnBlock[]): { blockName: string; operation: MdsnOperation } | null {
  for (const block of blocks) {
    const operation = block.operations.find(isAutoDependency);
    if (operation) {
      return {
        blockName: block.name,
        operation
      };
    }
  }

  return null;
}

async function resolveAutoDependencies(
  page: MdsnPage,
  request: MdsnRequest,
  session: MdsnSessionSnapshot | null,
  router: MdsnRouter
): Promise<MdsnPage> {
  let currentPage = page;
  let currentSession = session;

  for (let pass = 0; pass < 10; pass += 1) {
    let resolved = false;

    for (const block of currentPage.blocks) {
      const operation = block.operations.find(isAutoDependency);
      if (!operation) {
        continue;
      }

      const result = await resolveAutoTarget(operation.target, request, currentSession, router);
      if (!result) {
        continue;
      }

      currentSession = applySessionMutation(currentSession, result.session);

      if (result.page) {
        currentPage = result.page;
      } else if (result.fragment) {
        currentPage = applyImplicitFragmentToPage(currentPage, block.name, operation, result.fragment);
      } else {
        continue;
      }

      resolved = true;
      break;
    }

    if (!resolved) {
      return currentPage;
    }
  }

  return currentPage;
}

async function resolveAutoActionResult(
  result: MdsnActionResult,
  request: MdsnRequest,
  session: MdsnSessionSnapshot | null,
  router: MdsnRouter
): Promise<MdsnActionResult> {
  if (result.page) {
    return {
      ...result,
      page: await resolveAutoDependencies(result.page, request, session, router)
    };
  }

  if (!result.fragment) {
    return result;
  }

  let current = result;

  for (let pass = 0; pass < 10; pass += 1) {
    const currentSession = applySessionMutation(session, current.session);
    const dependency = findAutoDependency(current.fragment?.blocks ?? []);
    if (!dependency) {
      return current;
    }

    const resolved = await resolveAutoTarget(dependency.operation.target, request, currentSession, router);
    if (!resolved) {
      return current;
    }

    if (resolved.page) {
      return {
        ...current,
        ...(resolved.route ? { route: resolved.route } : current.route ? { route: current.route } : {}),
        page: await resolveAutoDependencies(resolved.page, request, currentSession, router)
      };
    }

    if (resolved.fragment) {
      current = {
        ...current,
        ...(resolved.route ? { route: resolved.route } : current.route ? { route: current.route } : {}),
        fragment: resolved.fragment,
        ...(resolved.session ? { session: resolved.session } : {})
      };
      continue;
    }

    return current;
  }

  return current;
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

function toProtocolRenderOptions(discoveryLinks: MdsnHtmlDiscoveryLinks | null, fallbackMarkdownHref?: string) {
  const markdownHref = discoveryLinks?.markdownHref ?? fallbackMarkdownHref;
  if (!markdownHref) {
    return {};
  }

  return {
    protocol: {
      discovery: {
        markdownHref,
        ...(discoveryLinks?.llmsTxtHref ? { llmsTxtHref: discoveryLinks.llmsTxtHref } : {})
      }
    }
  };
}

function resolveResponseBody(
  result: MdsnActionResult,
  representation: "markdown" | "html",
  renderHtml: typeof renderHtmlDocument,
  discoveryLinks: MdsnHtmlDiscoveryLinks | null,
  request: MdsnRequest
): string {
  if (result.page) {
    return representation === "markdown"
      ? serializePage(result.page)
      : renderHtml(
          getRenderablePage(result.page),
          {
            kind: "page",
            ...(result.route ? { route: result.route } : {}),
            ...toProtocolRenderOptions(discoveryLinks, result.route ?? getPathname(request)),
            ...(discoveryLinks?.markdownHref ? { alternateMarkdownHref: discoveryLinks.markdownHref } : {}),
            ...(discoveryLinks?.llmsTxtHref ? { llmsTxtHref: discoveryLinks.llmsTxtHref } : {})
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
        ...(result.route ? { route: result.route } : {}),
        ...toProtocolRenderOptions(discoveryLinks, result.route ?? getPathname(request)),
        ...(discoveryLinks?.markdownHref ? { alternateMarkdownHref: discoveryLinks.markdownHref } : {}),
        ...(discoveryLinks?.llmsTxtHref ? { llmsTxtHref: discoveryLinks.llmsTxtHref } : {})
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

function createResponse(
  result: MdsnHandlerResult,
  representation: "markdown" | "html" | "event-stream",
  renderHtml: typeof renderHtmlDocument,
  request: MdsnRequest,
  htmlDiscovery: MdsnHtmlDiscoveryResolver | undefined
): MdsnResponse {
  const discoveryLinks =
    representation === "html"
      ? resolveHtmlDiscoveryLinks(htmlDiscovery, {
          request,
          kind: "page" in result && result.page ? "page" : "fragment",
          ...("route" in result && result.route ? { route: result.route } : {})
        })
      : null;

  const headers = mergeLinkHeader({
    "content-type":
      representation === "markdown" ? toMarkdownContentType() : representation === "html" ? "text/html" : "text/event-stream",
    ...(result.headers ?? {})
  }, discoveryLinksToHeader(discoveryLinks));

  const body =
    representation === "markdown"
      ? resolveResponseBody(result as MdsnActionResult, "markdown", renderHtml, discoveryLinks, request)
      : representation === "html"
        ? resolveResponseBody(result as MdsnActionResult, "html", renderHtml, discoveryLinks, request)
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
  request: MdsnRequest,
  htmlDiscovery: MdsnHtmlDiscoveryResolver | undefined,
  route?: string
): MdsnResponse {
  const discoveryLinks =
    representation === "html"
      ? resolveHtmlDiscoveryLinks(htmlDiscovery, {
          request,
          kind: "page",
          ...(route ? { route } : {})
        })
      : null;

  return {
    status: 200,
    headers: mergeLinkHeader({
      "content-type": representation === "markdown" ? toMarkdownContentType() : "text/html"
    }, discoveryLinksToHeader(discoveryLinks)),
    body:
      representation === "markdown"
        ? serializePage(page)
        : renderHtml(getRenderablePage(page), {
            kind: "page",
            ...(route ? { route } : {}),
            ...toProtocolRenderOptions(discoveryLinks, route ?? getPathname(request)),
            ...(discoveryLinks?.markdownHref ? { alternateMarkdownHref: discoveryLinks.markdownHref } : {}),
            ...(discoveryLinks?.llmsTxtHref ? { llmsTxtHref: discoveryLinks.llmsTxtHref } : {})
          })
  };
}

export function createMdsnServer(options: CreateMdsnServerOptions = {}) {
  const router = new MdsnRouter();
  const sessionProvider = options.session;
  const baseHtmlRenderer =
    options.renderHtml ??
    ((fragment, renderOptions) =>
      renderHtmlDocument(fragment, {
        ...renderOptions,
        ...(options.markdownRenderer ? { markdownRenderer: options.markdownRenderer } : {})
      }));
  const htmlRenderer: typeof renderHtmlDocument = (fragment, renderOptions = {}) =>
    injectHtmlDiscoveryLinks(baseHtmlRenderer(fragment, renderOptions), renderOptions);

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
          htmlRenderer,
          request,
          options.htmlDiscovery
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
              htmlRenderer,
              request,
              options.htmlDiscovery
            );
          }
          let page: MdsnPage | null;
          try {
            page = await pageHandler({
              request,
              session
            });
          } catch {
            return createResponse(createInternalServerErrorResult(), representation, htmlRenderer, request, options.htmlDiscovery);
          }
          if (page) {
            const resolvedPage = await resolveAutoDependencies(page, request, session, router);
            return createPageResponse(resolvedPage, representation, htmlRenderer, request, options.htmlDiscovery, pathname);
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
          htmlRenderer,
          request,
          options.htmlDiscovery
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
          htmlRenderer,
          request,
          options.htmlDiscovery
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
            htmlRenderer,
            request,
            options.htmlDiscovery
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
        return createResponse(createInternalServerErrorResult(), representation, htmlRenderer, request, options.htmlDiscovery);
      }
      const resolvedResult = !isStreamResult(result)
        ? await resolveAutoActionResult(result, request, session, router)
        : result;
      const response = createResponse(resolvedResult, representation, htmlRenderer, request, options.htmlDiscovery);

      if (sessionProvider) {
        try {
          if (resolvedResult.session?.type === "sign-out") {
            await sessionProvider.clear(session, response, request);
          } else {
            await sessionProvider.commit(resolvedResult.session ?? null, response);
          }
        } catch {
          return createResponse(createInternalServerErrorResult(), representation, htmlRenderer, request, options.htmlDiscovery);
        }
      }

      return response;
    }
  };
}
