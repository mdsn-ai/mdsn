declare module "markdown-it" {
  type MarkdownItOptions = {
    html?: boolean;
    linkify?: boolean;
    typographer?: boolean;
  };

  class MarkdownIt {
    constructor(options?: MarkdownItOptions);
    render(markdown: string): string;
  }

  export = MarkdownIt;
}
