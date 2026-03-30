import { LitElement, css, html } from "lit";

import { baseTheme } from "../theme.js";

export class MdsnErrorElement extends LitElement {
  private slotText = "";

  static styles = [
    baseTheme,
    css`
      :host {
        display: block;
        margin: 14px 0;
        padding: 14px 16px;
        border-radius: 16px;
        background: linear-gradient(180deg, #fff1f2 0%, #ffe4e6 100%);
        color: #9f1239;
        border: 1px solid #fda4af;
      }
    `
  ];

  connectedCallback(): void {
    super.connectedCallback();
    this.slotText = this.textContent?.trim() ?? "";
  }

  private handleSlotChange(event: Event): void {
    const slot = event.target as HTMLSlotElement;
    this.slotText = slot
      .assignedNodes({ flatten: true })
      .map((node) => node.textContent ?? "")
      .join(" ")
      .trim();
    this.requestUpdate();
  }

  render() {
    return html`<slot @slotchange=${this.handleSlotChange}></slot><span hidden>${this.slotText}</span>`;
  }
}
