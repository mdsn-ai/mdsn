import express from "express";
import { parsePageDefinition } from "../core/document/page-definition";
import type { ActionFailure, ActionResult } from "../core/action";
import type { BlockDefinition } from "../core/model/block";
import { executeActionHandler, type ActionHandler } from "../server/action-host";
import { parseActionInputs } from "../server/action-inputs";
import { renderMarkdownFragment, type SerializableBlock } from "../server/markdown";
import { mapPageTargetToHttpPath } from "../server/page-links";
import { renderHostedPage, type RenderHostedPageOptions } from "../server/page-host";
import { wantsHtml, wantsMarkdown } from "../server/negotiate";
import { resolveRoutedPageForPath, sortRoutedPagesForMatching } from "../server/route-matcher";
import { renderBlockFragmentHtml } from "../web/fragment-render";
import { getPageClientRuntimeScript } from "../web/page-client-script";

export interface CreateHostedAppOptions {
  pages: Record<string, string>;
  actions?: Record<string, ActionHandler<{ inputs: Record<string, unknown> }>>;
  publicDir?: string;
  render?: Omit<RenderHostedPageOptions, "accept" | "routePath" | "layoutTemplate"> & {
    resolveLayoutTemplate?: (routePath: string, rawPage: string) => string | undefined;
  };
}

type ActionBinding = {
  actionId: string;
  blockName: string;
  block: BlockDefinition;
  kind: "read" | "write";
};

type RoutedPage = {
  routePath: string;
  source: string;
};

function normalizeActionId(target: string): string | null {
  const trimmed = String(target).trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed)) {
    return null;
  }
  if (trimmed.toLowerCase().endsWith(".md")) {
    return null;
  }
  return trimmed.replace(/^\/+/u, "");
}

function createActionBindingKey(method: "GET" | "POST", path: string): string {
  return `${method}:${path}`;
}

function buildActionBindings(pages: Record<string, string>): Map<string, ActionBinding> {
  const bindings = new Map<string, ActionBinding>();

  for (const pageSource of Object.values(pages)) {
    let document;
    try {
      document = parsePageDefinition(pageSource);
    } catch {
      continue;
    }
    for (const block of document.blocks) {
      for (const operation of block.reads) {
        const targetPath = mapPageTargetToHttpPath(operation.target);
        const actionId = normalizeActionId(operation.target);
        if (!actionId) {
          continue;
        }

        const key = createActionBindingKey("GET", targetPath);
        const existing = bindings.get(key);
        if (
          existing
          && (existing.actionId !== actionId || existing.blockName !== block.name || existing.kind !== "read")
        ) {
          throw new Error(`Action target must bind to one stable block context: GET ${targetPath}`);
        }

        bindings.set(key, {
          actionId,
          blockName: block.name,
          block,
          kind: "read",
        });
      }

      for (const operation of block.writes) {
        const targetPath = mapPageTargetToHttpPath(operation.target);
        const actionId = normalizeActionId(operation.target);
        if (!actionId) {
          continue;
        }

        const key = createActionBindingKey("POST", targetPath);
        const existing = bindings.get(key);
        if (
          existing
          && (existing.actionId !== actionId || existing.blockName !== block.name || existing.kind !== "write")
        ) {
          throw new Error(`Action target must bind to one stable block context: POST ${targetPath}`);
        }

        bindings.set(key, {
          actionId,
          blockName: block.name,
          block,
          kind: "write",
        });
      }
    }
  }

  return bindings;
}

function blockToSerializableBlock(block: BlockDefinition): SerializableBlock {
  return {
    name: block.name,
    inputs: block.inputs.map((input) => ({
      name: input.name,
      type: input.type,
      required: input.required,
      secret: input.secret,
      options: input.options,
    })),
    reads: block.reads.map((read) => ({
      name: read.name,
      target: read.target,
      inputs: read.inputs,
    })),
    writes: block.writes.map((write) => ({
      name: write.name,
      target: write.target,
      inputs: write.inputs,
    })),
  };
}

function renderActionResultFragment(binding: ActionBinding, result: ActionResult): string {
  if (result.ok && result.kind === "fragment") {
    return result.markdown;
  }

  const failure = result as ActionFailure;
  const fieldErrorEntries = Object.entries(failure.fieldErrors ?? {});
  return renderMarkdownFragment({
    body: [
      "## Action Status",
      failure.message ?? "This action could not be completed.",
      ...(fieldErrorEntries.length > 0
        ? ["### Input Hints", ...fieldErrorEntries.map(([field, message]) => `- ${field}: ${message}`)]
        : ["Review the required fields and try again."]),
    ],
    block: blockToSerializableBlock(binding.block),
  });
}

function sendActionFragment(
  reqAccept: string | undefined,
  status: number,
  markdown: string,
  binding: ActionBinding,
  res: express.Response,
  options: CreateHostedAppOptions,
): void {
  if (wantsMarkdown(reqAccept) || !wantsHtml(reqAccept)) {
    res.status(status).type("text/markdown; charset=utf-8").send(markdown);
    return;
  }

  res.status(status).type("text/html; charset=utf-8").send(
    renderBlockFragmentHtml(markdown, binding.blockName, {
      mapActionTarget: options.render?.mapActionTarget ?? mapPageTargetToHttpPath,
      markdown: options.render?.markdown,
    }),
  );
}

export function createHostedApp(options: CreateHostedAppOptions) {
  const app = express();
  const actionBindings = buildActionBindings(options.pages);
  const routedPages = sortRoutedPagesForMatching(
    Object.entries(options.pages).map(([routePath, source]) => ({
      routePath,
      source,
    }) satisfies RoutedPage),
  );

  app.use(express.text({
    type: ["text/markdown"],
    limit: "1mb",
  }));
  if (typeof options.publicDir === "string") {
    app.use(express.static(options.publicDir));
  }

  app.get("/__mdsn/client.js", (_req, res) => {
    res.type("application/javascript; charset=utf-8").send(getPageClientRuntimeScript());
  });

  async function handleActionRequest(
    req: express.Request,
    res: express.Response,
    method: "GET" | "POST",
    next: express.NextFunction,
  ): Promise<void> {
    const binding = actionBindings.get(createActionBindingKey(method, req.path));
    if (!binding) {
      next();
      return;
    }

    const action = options.actions?.[binding.actionId];
    if (!action) {
      sendActionFragment(
        req.headers.accept,
        404,
        renderMarkdownFragment({
          body: [
            "## Action Status",
            "This action is not available on the current server.",
          ],
          block: blockToSerializableBlock(binding.block),
        }),
        binding,
        res,
        options,
      );
      return;
    }

    try {
      if (method === "POST") {
        const contentType = req.headers["content-type"] ?? "";
        const normalized = String(contentType).toLowerCase();
        if (!normalized.includes("text/markdown")) {
          sendActionFragment(
            req.headers.accept,
            415,
            renderMarkdownFragment({
              body: [
                "## Action Status",
                "Unsupported content type for write action.",
                "Use `Content-Type: text/markdown` with Markdown key-value lines.",
              ],
              block: blockToSerializableBlock(binding.block),
            }),
            binding,
            res,
            options,
          );
          return;
        }
      }

      const result = await executeActionHandler(action, {
        inputs: method === "GET"
          ? parseActionInputs(req.query)
          : parseActionInputs(typeof req.body === "string" ? req.body : ""),
      });
      const markdown = renderActionResultFragment(binding, result);
      sendActionFragment(
        req.headers.accept,
        result.ok ? 200 : 400,
        markdown,
        binding,
        res,
        options,
      );
    } catch (error) {
      sendActionFragment(
        req.headers.accept,
        500,
        renderMarkdownFragment({
          body: [
            "## Action Status",
            "The action failed due to an internal error.",
            error instanceof Error ? error.message : String(error),
          ],
          block: blockToSerializableBlock(binding.block),
        }),
        binding,
        res,
        options,
      );
    }
  }

  app.post("*", async (req, res, next) => {
    await handleActionRequest(req, res, "POST", next);
  });

  app.get("*", async (req, res) => {
    const actionBinding = actionBindings.get(createActionBindingKey("GET", req.path));
    if (actionBinding) {
      await handleActionRequest(req, res, "GET", () => undefined);
      return;
    }

    const matchedPage = resolveRoutedPageForPath(req.path, routedPages);
    if (!matchedPage) {
      res.status(404).type("text/plain; charset=utf-8").send("Not Found");
      return;
    }

    const rendered = renderHostedPage(matchedPage.source, {
      accept: req.headers.accept,
      routePath: req.path,
      siteTitle: options.render?.siteTitle,
      siteDescription: options.render?.siteDescription,
      siteBaseUrl: options.render?.siteBaseUrl,
      locales: options.render?.locales,
      defaultLocale: options.render?.defaultLocale,
      markdown: options.render?.markdown,
      mapActionTarget: options.render?.mapActionTarget ?? mapPageTargetToHttpPath,
      layoutTemplate: options.render?.resolveLayoutTemplate?.(req.path, matchedPage.source),
    });

    res.status(rendered.status).type(rendered.contentType).send(rendered.body);
  });

  return app;
}
