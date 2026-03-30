import { LitElement, css, html } from "lit";

import { baseTheme } from "../theme.js";

export class MdsnFieldElement extends LitElement {
  static styles = [
    baseTheme,
    css`
      :host {
        display: block;
      }

      ::slotted(label) {
        display: grid;
        gap: 8px;
        font-size: 0.82rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #475569;
        font-weight: 700;
      }

      ::slotted(label input) {
        border: 1px solid rgba(148, 163, 184, 0.32);
        border-radius: 14px;
        padding: 12px 14px;
        font: inherit;
        background: rgba(255, 255, 255, 0.92);
        color: #0f172a;
      }
    `
  ];

  render() {
    return html`<slot></slot>`;
  }
}
