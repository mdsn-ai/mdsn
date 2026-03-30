import { LitElement, css, html } from "lit";

import { baseTheme } from "../theme.js";

export class MdsnFormElement extends LitElement {
  static styles = [
    baseTheme,
    css`
      :host {
        display: block;
      }

      ::slotted(form) {
        display: grid;
        gap: 14px;
        margin: 0;
      }
    `
  ];

  render() {
    return html`<slot></slot>`;
  }
}
