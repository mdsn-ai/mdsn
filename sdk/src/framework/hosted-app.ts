import express from "express";
import { parsePageDefinition } from "../core/document/page-definition";
import { executeActionHandler, type ActionHandler } from "../server/action-host";
import { parseActionInputs } from "../server/action-inputs";
import { mapPageTargetToHttpPath } from "../server/page-links";
import { renderHostedPage, type RenderHostedPageOptions } from "../server/page-host";
import { wantsMarkdown } from "../server/negotiate";
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
      for (const operation of [...block.reads, ...block.writes]) {
        const targetPath = mapPageTargetToHttpPath(operation.target);
        const actionId = normalizeActionId(operation.target);
        if (!actionId) {
          continue;
        }

        const existing = bindings.get(targetPath);
        if (existing && (existing.actionId !== actionId || existing.blockName !== block.name)) {
          throw new Error(`Action target must bind to one stable block context: ${targetPath}`);
        }

        bindings.set(targetPath, {
          actionId,
          blockName: block.name,
        });
      }
    }
  }

  return bindings;
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

  app.use(express.json());
  app.use(express.text({
    type: ["text/markdown", "text/plain"],
    limit: "1mb",
  }));
  app.use(express.urlencoded({ extended: true }));
  if (typeof options.publicDir === "string") {
    app.use(express.static(options.publicDir));
  }

  app.get("/__mdsn/client.js", (_req, res) => {
    res.type("application/javascript; charset=utf-8").send(getPageClientRuntimeScript());
  });

  app.post("*", async (req, res, next) => {
    const binding = actionBindings.get(req.path);
    if (!binding) {
      next();
      return;
    }

    const action = options.actions?.[binding.actionId];
    if (!action) {
      res.status(404).json({
        ok: false,
        errorCode: "NOT_FOUND",
      });
      return;
    }

    try {
      const result = await executeActionHandler(action, {
        inputs: parseActionInputs(req.body),
      });
      if (result.ok && result.kind === "fragment") {
        if (wantsMarkdown(req.headers.accept)) {
          res.status(200).type("text/markdown; charset=utf-8").send(result.markdown);
          return;
        }

        res.status(200).json({
          ...result,
          html: renderBlockFragmentHtml(result.markdown, binding.blockName, {
            mapActionTarget: options.render?.mapActionTarget ?? mapPageTargetToHttpPath,
            markdown: options.render?.markdown,
          }),
        });
        return;
      }

      res.status(result.ok ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({
        ok: false,
        errorCode: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get("*", (req, res) => {
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
