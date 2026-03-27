import { parsePageDefinition } from "../core/document/page-definition";
import { createPageRenderModel } from "../web/page-render";
import { renderPageHtmlContent, renderPageHtmlDocument } from "../web/page-html";
import { applyLayoutTemplate, resolveLocaleForRoutePath } from "./layout";
import {
  resolveCanonicalUrl,
  resolveHreflangLinks,
  resolveMarkdownAlternateUrl,
} from "./page-links";
import { isNotAcceptableRequest, wantsHtml } from "./negotiate";

export interface HostedPageResponse {
  status: number;
  contentType: string;
  body: string;
}

export interface RenderHostedPageOptions {
  accept?: string;
  routePath?: string;
  siteTitle?: string;
  siteDescription?: string;
  siteBaseUrl?: string;
  locales?: string[];
  defaultLocale?: string;
  markdown?: {
    linkify?: boolean;
    typographer?: boolean;
  };
  mapActionTarget?: (target: string) => string;
  layoutTemplate?: string;
}

export function renderHostedPage(
  rawPage: string,
  options: RenderHostedPageOptions,
): HostedPageResponse {
  if (isNotAcceptableRequest(options.accept)) {
    return {
      status: 406,
      contentType: "text/plain; charset=utf-8",
      body: "Not Acceptable",
    };
  }

  if (!wantsHtml(options.accept)) {
    return {
      status: 200,
      contentType: "text/markdown; charset=utf-8",
      body: rawPage,
    };
  }

  const document = parsePageDefinition(rawPage);
  const routePath = options.routePath ?? "/";
  const model = createPageRenderModel(document, {
    mapActionTarget: options.mapActionTarget,
    markdown: options.markdown,
  });
  const locale = resolveLocaleForRoutePath(
    routePath,
    options.locales ?? ["en"],
    options.defaultLocale ?? "en",
  );
  const title = typeof document.frontmatter.title === "string" && document.frontmatter.title.trim().length > 0
    ? document.frontmatter.title
    : options.siteTitle;
  const description = typeof document.frontmatter.description === "string" && document.frontmatter.description.trim().length > 0
    ? document.frontmatter.description
    : options.siteDescription ?? "";
  const defaultLocale = options.defaultLocale ?? locale;

  const body = options.layoutTemplate
    ? applyLayoutTemplate(options.layoutTemplate, {
        title: title ?? "MDSN Page",
        description,
        content: renderPageHtmlContent(model),
        locale,
        defaultLocale,
        pathname: routePath,
        canonicalUrl: resolveCanonicalUrl(routePath, options.siteBaseUrl),
        siteName: options.siteTitle,
        markdownAlternateUrl: resolveMarkdownAlternateUrl(routePath, options.siteBaseUrl),
        hreflangLinks: resolveHreflangLinks({
          routePath,
          locales: options.locales ?? ["en"],
          defaultLocale,
          siteBaseUrl: options.siteBaseUrl,
        }),
      })
    : renderPageHtmlDocument(
        model,
        {
          title,
          lang: locale,
        },
      );

  return {
    status: 200,
    contentType: "text/html; charset=utf-8",
    body,
  };
}
