import { css } from "lit";

export const baseTheme = css`
  :host {
    box-sizing: border-box;
    font-family: "IBM Plex Sans", "Avenir Next", ui-sans-serif, system-ui, sans-serif;
    color: #0f172a;
  }

  *, *::before, *::after {
    box-sizing: inherit;
  }
`;
