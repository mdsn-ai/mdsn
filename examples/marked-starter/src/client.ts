import { mountMdsnElements } from "@mdsnai/sdk/elements";
import { createHeadlessHost } from "@mdsnai/sdk/web";
import { marked } from "marked";

const markdownRenderer = {
  render(markdown: string): string {
    return marked.parse(markdown) as string;
  }
};

export function mountMarkedStarter(root: HTMLElement, fetchImpl: typeof fetch): void {
  const host = createHeadlessHost({ root, fetchImpl });
  mountMdsnElements({ root, host, markdownRenderer }).mount();
}
