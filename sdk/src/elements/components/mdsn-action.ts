import { LitElement, css, html } from "lit";

import { baseTheme } from "../theme.js";

export class MdsnActionElement extends LitElement {
  static styles = [
    baseTheme,
    css`
      :host {
        display: inline-block;
      }

      ::slotted(button) {
        border: 0;
        border-radius: 999px;
        padding: 11px 18px;
        font: inherit;
        font-weight: 700;
        color: white;
        background: linear-gradient(180deg, #14b8a6 0%, #0f766e 100%);
        box-shadow: 0 12px 24px rgba(15, 118, 110, 0.22);
        cursor: pointer;
        transition: transform 160ms ease, box-shadow 160ms ease;
      }

      ::slotted(button:hover) {
        transform: translateY(-1px);
        box-shadow: 0 16px 30px rgba(15, 118, 110, 0.28);
      }
    `
  ];

  render() {
    return html`<slot></slot>`;
  }
}
