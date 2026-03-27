import type { DocumentDefinition } from "../core/model/document";
import { renderPageHtmlDocument } from "./page-html";
import { createPageRenderModel, type PageRenderModel } from "./page-render";

export interface CreateRenderModelOptions {
  mapTarget?: (target: string) => string;
}

export type RenderModel = PageRenderModel;

export function createRenderModel(
  document: DocumentDefinition,
  options?: CreateRenderModelOptions,
): RenderModel {
  return createPageRenderModel(document, {
    mapActionTarget: options?.mapTarget,
  });
}

export function renderDefaultHtmlDocument(
  model: RenderModel,
  options?: {
    title?: string;
    lang?: string;
  },
): string {
  return renderPageHtmlDocument(model, options);
}

export function renderPageHtml(
  document: DocumentDefinition,
  options?: CreateRenderModelOptions,
): string {
  return renderDefaultHtmlDocument(createRenderModel(document, options));
}
