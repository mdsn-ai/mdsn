import { LitElement, css, html } from "lit";

import { baseTheme } from "../theme.js";

export class MdsnPageElement extends LitElement {
  private slotText = "";

  static styles = [
    baseTheme,
    css`
      :host {
        display: block;
        min-height: 100vh;
        padding: 32px 18px;
        background:
          radial-gradient(circle at top, rgba(20, 184, 166, 0.18), transparent 28%),
          linear-gradient(180deg, #f7fbfb 0%, #eef4f7 100%);
      }

      .shell {
        max-width: 820px;
        margin: 0 auto;
        border: 1px solid rgba(148, 163, 184, 0.22);
        border-radius: 28px;
        background: rgba(255, 255, 255, 0.82);
        backdrop-filter: blur(18px);
        box-shadow: 0 28px 80px rgba(15, 23, 42, 0.08);
        padding: 28px;
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
    return html`<div class="shell"><slot @slotchange=${this.handleSlotChange}></slot><span hidden>${this.slotText}</span></div>`;
  }
}
