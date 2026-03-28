import MarkdownIt from "markdown-it";
import type { BlockDefinition } from "../core/model/block";
import type { DocumentDefinition } from "../core/model/document";
import { createPageBootstrap, type PageBootstrap } from "./page-bootstrap";
import { createBlockRegionMarkup } from "./block-runtime";
import {
  createParsedPage,
  type MarkdownContainer,
  type ParsedPage,
} from "./headless";

export interface PageRenderModel {
  markdownHtml: string;
  bootstrap: PageBootstrap;
  document: DocumentDefinition;
  page: ParsedPage;
}

export interface RenderMarkdownOptions {
  linkify?: boolean;
  typographer?: boolean;
}

export interface CreatePageRenderOptions {
  mapActionTarget?: (target: string) => string;
  markdown?: RenderMarkdownOptions;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createMarkdownRenderer(options?: RenderMarkdownOptions): MarkdownIt {
  return new MarkdownIt({
    html: true,
    linkify: options?.linkify ?? true,
    typographer: options?.typographer ?? false,
  });
}

function renderInput(block: BlockDefinition): string {
  if (block.inputs.length === 0) return "";

  const items = block.inputs.map((input) => {
    const required = input.required ? " required" : "";
    const requiredFlag = input.required ? ' data-required="true"' : "";
    const secretFlag = input.secret ? ' data-secret="true"' : "";
    const inputType = input.type === "boolean"
      ? "checkbox"
      : input.secret
        ? "password"
        : input.type === "number"
          ? "number"
          : input.type === "asset"
            ? "url"
          : "text";

    if (input.type === "choice") {
      const options = (input.options ?? [])
        .map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`)
        .join("");
      return `<label>${escapeHtml(input.name)}<select id="${escapeHtml(input.id)}" data-mdsn-input="${escapeHtml(input.id)}" data-input-name="${escapeHtml(input.name)}" data-input-type="${escapeHtml(input.type)}"${requiredFlag}${secretFlag}${required}><option value=""></option>${options}</select></label>`;
    }

    return `<label>${escapeHtml(input.name)}<input id="${escapeHtml(input.id)}" type="${inputType}" data-mdsn-input="${escapeHtml(input.id)}" data-input-name="${escapeHtml(input.name)}" data-input-type="${escapeHtml(input.type)}"${requiredFlag}${secretFlag}${required} /></label>`;
  }).join("");

  return `<div class="mdsn-block-inputs">${items}</div>`;
}

function renderActions(block: BlockDefinition, options?: CreatePageRenderOptions): string {
  const readButtons = block.reads.map((read) =>
    `<button type="button" data-mdsn-read="${escapeHtml(read.id)}" data-op-name="${escapeHtml(read.name)}" data-target="${escapeHtml(options?.mapActionTarget?.(read.target) ?? read.target)}" data-inputs="${escapeHtml(read.inputs.join(","))}">${escapeHtml(read.name)}</button>`
  );
  const writeButtons = block.writes.map((write) =>
    `<button type="button" data-mdsn-write="${escapeHtml(write.id)}" data-op-name="${escapeHtml(write.name)}" data-target="${escapeHtml(options?.mapActionTarget?.(write.target) ?? write.target)}" data-inputs="${escapeHtml(write.inputs.join(","))}">${escapeHtml(write.name)}</button>`
  );

  const buttons = [...readButtons, ...writeButtons].join("");
  return buttons.length > 0 ? `<div class="mdsn-block-actions">${buttons}</div>` : "";
}

function renderBlockPanelContent(block: BlockDefinition, options?: CreatePageRenderOptions): string {
  return `<section class="mdsn-block-panel" data-mdsn-block-panel="${escapeHtml(block.name)}"><header><strong>${escapeHtml(block.name)}</strong></header>${renderInput(block)}${renderActions(block, options)}</section>`;
}

export function renderBlockPanelHtml(
  block: BlockDefinition,
  options?: CreatePageRenderOptions,
  mode: "region" | "plain" = "region",
): string {
  const content = renderBlockPanelContent(block, options);
  return mode === "plain" ? content : createBlockRegionMarkup(block.name, content);
}

function renderMarkdownContainer(
  container: MarkdownContainer,
  renderer: MarkdownIt,
): string {
  return renderer.render(container.markdown);
}

function renderParsedPage(
  page: ParsedPage,
  options?: CreatePageRenderOptions,
): string {
  const renderer = createMarkdownRenderer(options?.markdown);
  const blockByName = new Map(page.blocks.map((block) => [block.name, block] as const));

  return page.segments.map((segment) => {
    if (segment.type === "container") {
      return renderMarkdownContainer(segment.container, renderer);
    }

    const block = blockByName.get(segment.anchor.name);
    return block ? renderBlockPanelHtml(block, options, "region") : "";
  }).join("");
}

export function createPageRenderModel(
  document: DocumentDefinition,
  options?: CreatePageRenderOptions,
): PageRenderModel {
  const page = createParsedPage(document);

  return {
    markdownHtml: renderParsedPage(page, options),
    bootstrap: createPageBootstrap(document),
    document,
    page,
  };
}
