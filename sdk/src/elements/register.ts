import { MdsnActionElement } from "./components/mdsn-action.js";
import { MdsnBlockElement } from "./components/mdsn-block.js";
import { MdsnErrorElement } from "./components/mdsn-error.js";
import { MdsnFieldElement } from "./components/mdsn-field.js";
import { MdsnFormElement } from "./components/mdsn-form.js";
import { MdsnPageElement } from "./components/mdsn-page.js";

export function registerMdsnElements(): void {
  if (!customElements.get("mdsn-page")) {
    customElements.define("mdsn-page", MdsnPageElement);
  }
  if (!customElements.get("mdsn-block")) {
    customElements.define("mdsn-block", MdsnBlockElement);
  }
  if (!customElements.get("mdsn-form")) {
    customElements.define("mdsn-form", MdsnFormElement);
  }
  if (!customElements.get("mdsn-field")) {
    customElements.define("mdsn-field", MdsnFieldElement);
  }
  if (!customElements.get("mdsn-action")) {
    customElements.define("mdsn-action", MdsnActionElement);
  }
  if (!customElements.get("mdsn-error")) {
    customElements.define("mdsn-error", MdsnErrorElement);
  }
}
