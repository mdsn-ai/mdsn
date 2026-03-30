import { mountMdsnElements } from "@mdsnai/sdk/elements";
import { createHeadlessHost } from "@mdsnai/sdk/web";

export function mountAuthSessionExample(root: HTMLElement | Document, fetchImpl: typeof fetch): void {
  const host = createHeadlessHost({ root, fetchImpl });
  mountMdsnElements({ root, host }).mount();
}
