import { mountMdsnElements } from "@mdsnai/sdk/elements";
import { createHeadlessHost } from "@mdsnai/sdk/web";

export function mountExpressStarter(root: HTMLElement, fetchImpl: typeof fetch): void {
  const host = createHeadlessHost({ root, fetchImpl });
  mountMdsnElements({ root, host }).mount();
}
