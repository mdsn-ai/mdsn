import { basicMarkdownRenderer, type MdsnMarkdownRenderer } from "../core/index.js";
import { type MdsnHeadlessHost, type HeadlessSnapshot } from "../web/index.js";
import { html, render } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import { registerMdsnElements } from "./register.js";

export interface MountMdsnElementsOptions {
  root: ParentNode;
  host: MdsnHeadlessHost;
  markdownRenderer?: MdsnMarkdownRenderer;
}

export interface MdsnElementsRuntime extends MdsnHeadlessHost {}

function humanizeLabel(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function renderMarkdown(markdown: string, markdownRenderer: MdsnMarkdownRenderer) {
  return unsafeHTML(markdownRenderer.render(markdown));
}

function ensureContainer(root: ParentNode): HTMLElement {
  if (root instanceof Document) {
    const existing = root.querySelector("[data-mdsn-elements-root]");
    if (existing instanceof HTMLElement) {
      return existing;
    }
    const host = root.createElement("div");
    host.setAttribute("data-mdsn-elements-root", "");
    root.body.append(host);
    return host;
  }
  return root as HTMLElement;
}

function ensureGlobalStyle(document: Document): void {
  if (document.getElementById("mdsn-elements-headless-style")) {
    return;
  }
  const style = document.createElement("style");
  style.id = "mdsn-elements-headless-style";
  style.textContent = `
    mdsn-page {
      display: none !important;
    }
    [data-mdsn-elements-root] {
      display: block;
    }
  `;
  document.head.append(style);
}

function getDocument(root: ParentNode): Document {
  return root instanceof Document ? root : root.ownerDocument ?? document;
}

export function mountMdsnElements(options: MountMdsnElementsOptions): MdsnElementsRuntime {
  registerMdsnElements();

  const document = getDocument(options.root);
  const container = ensureContainer(options.root);
  ensureGlobalStyle(document);
  const host = options.host;
  const markdownRenderer = options.markdownRenderer ?? basicMarkdownRenderer;

  let unsubscribe: (() => void) | null = null;
  const valuesByForm: Record<string, Record<string, string>> = {};

  function getFormKey(blockName: string, operation: { method: string; target: string; name?: string }): string {
    return `${blockName}:${operation.method}:${operation.target}:${operation.name ?? ""}`;
  }

  function getFormValues(formKey: string): Record<string, string> {
    valuesByForm[formKey] ??= {};
    return valuesByForm[formKey]!;
  }

  function onInput(formKey: string, name: string, value: string): void {
    getFormValues(formKey)[name] = value;
  }

  function renderSnapshot(snapshot: HeadlessSnapshot): void {
    render(
      html`
        <mdsn-page>
          ${snapshot.markdown ? renderMarkdown(snapshot.markdown, markdownRenderer) : ""}
          ${snapshot.blocks.map((block) => {
            const getOperations = [];
            const postOperations = [];
            for (const operation of block.operations) {
              if (operation.method === "GET") {
                getOperations.push(operation);
              } else {
                postOperations.push(operation);
              }
            }
            const inputsByName = new Map(block.inputs.map((input) => [input.name, input]));

            return html`
              <mdsn-block data-mdsn-block=${block.name}>
                ${block.markdown ? renderMarkdown(block.markdown, markdownRenderer) : ""}

                ${getOperations.length
                  ? html`
                      <div class="mdsn-elements-actions">
                        ${getOperations.map(
                          (operation) => html`
                              <mdsn-action>
                                <button
                                  type="button"
                                  @click=${() => {
                                    void host.submit(operation, {});
                                  }}
                                >
                                  ${operation.label ?? operation.name ?? operation.target}
                                </button>
                              </mdsn-action>
                            `
                        )}
                      </div>
                    `
                  : ""}

                ${postOperations.map((operation) => {
                  const formKey = getFormKey(block.name, operation);
                  const formValues = getFormValues(formKey);
                  const renderableInputs = operation.inputs
                    .map((name) => inputsByName.get(name))
                    .filter((input): input is NonNullable<typeof input> => Boolean(input));

                  return html`
                    <mdsn-form>
                      <form
                        @submit=${(event: Event) => {
                          event.preventDefault();
                          const form = event.currentTarget as HTMLFormElement;
                          if (typeof form.reportValidity === "function" && !form.reportValidity()) {
                            return;
                          }
                          const payload: Record<string, string> = {};
                          for (const name of operation.inputs) {
                            payload[name] = formValues[name] ?? "";
                          }
                          void host.submit(operation, payload);
                          valuesByForm[formKey] = {};
                        }}
                      >
                        ${renderableInputs.map((input) => {
                              const label = html`<span class="mdsn-label-text">
                                ${humanizeLabel(input.name)}
                                ${input.required ? html`<span class="mdsn-required" aria-hidden="true">*</span>` : ""}
                              </span>`;

                              if (input.type === "choice") {
                                return html`
                                  <mdsn-field>
                                    <label>
                                      ${label}
                                      <select
                                        name=${input.name}
                                        ?required=${input.required}
                                        .value=${formValues[input.name] ?? ""}
                                        @change=${(event: Event) => {
                                          onInput(formKey, input.name, (event.currentTarget as HTMLSelectElement).value);
                                        }}
                                      >
                                        ${(input.options ?? []).map(
                                          (option) => html`<option value=${option}>${option}</option>`
                                        )}
                                      </select>
                                    </label>
                                  </mdsn-field>
                                `;
                              }

                              if (input.type === "boolean") {
                                return html`
                                  <mdsn-field>
                                    <label>
                                      ${label}
                                      <input
                                        name=${input.name}
                                        type="checkbox"
                                        ?required=${input.required}
                                        .checked=${formValues[input.name] === "true"}
                                        @change=${(event: Event) => {
                                          onInput(
                                            formKey,
                                            input.name,
                                            (event.currentTarget as HTMLInputElement).checked ? "true" : "false"
                                          );
                                        }}
                                      >
                                    </label>
                                  </mdsn-field>
                                `;
                              }

                              if (input.type === "asset") {
                                return html`
                                  <mdsn-field>
                                    <label>
                                      ${label}
                                      <input
                                        name=${input.name}
                                        type="file"
                                        ?required=${input.required}
                                        @change=${(event: Event) => {
                                          onInput(
                                            formKey,
                                            input.name,
                                            (event.currentTarget as HTMLInputElement).files?.[0]?.name ?? ""
                                          );
                                        }}
                                      >
                                    </label>
                                  </mdsn-field>
                                `;
                              }

                              return html`
                                <mdsn-field>
                                  <label>
                                    ${label}
                                    <input
                                      name=${input.name}
                                      type=${input.secret ? "password" : input.type === "number" ? "number" : "text"}
                                      ?required=${input.required}
                                      .value=${formValues[input.name] ?? ""}
                                      placeholder=${input.name === "message" ? "Write something worth keeping" : ""}
                                      @input=${(event: Event) => {
                                        onInput(formKey, input.name, (event.currentTarget as HTMLInputElement).value);
                                      }}
                                    >
                                  </label>
                                </mdsn-field>
                              `;
                            })}
                        <mdsn-action>
                          <button type="submit">${operation.label ?? operation.name ?? operation.target}</button>
                        </mdsn-action>
                      </form>
                    </mdsn-form>
                  `;
                })}
              </mdsn-block>
            `;
          })}
        </mdsn-page>
      `,
      container
    );
  }

  return {
    mount(): void {
      unsubscribe = host.subscribe((snapshot) => {
        renderSnapshot(snapshot);
      });
      host.mount();
    },
    unmount(): void {
      unsubscribe?.();
      unsubscribe = null;
      host.unmount();
      render(html``, container);
    },
    subscribe(listener) {
      return host.subscribe(listener);
    },
    getSnapshot() {
      return host.getSnapshot();
    },
    submit(operation, valuesMap) {
      return host.submit(operation, valuesMap);
    },
    visit(target) {
      return host.visit(target);
    }
  };
}
