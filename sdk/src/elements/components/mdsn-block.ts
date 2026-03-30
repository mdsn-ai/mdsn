import { LitElement, css, html } from "lit";

import { baseTheme } from "../theme.js";

export class MdsnBlockElement extends LitElement {
  private slotText = "";

  static styles = [
    baseTheme,
    css`
      :host {
        display: block;
        margin: 20px 0;
        padding: 20px;
        border: 1px solid rgba(148, 163, 184, 0.24);
        border-radius: 22px;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.96) 100%);
        box-shadow: 0 20px 44px rgba(15, 23, 42, 0.08);
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
