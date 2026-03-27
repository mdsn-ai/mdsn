import React, { startTransition, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type { BlockDefinition } from "@mdsnai/sdk/core";
import type {
  MarkdownBlockNode,
  MarkdownInlineNode,
  ParsedFragment,
  ParsedPage,
} from "@mdsnai/sdk/web";
import { parseFragment, parsePage } from "@mdsnai/sdk/web";

type ActionFailure = {
  ok: false;
  errorCode: string;
  fieldErrors?: Record<string, string>;
  message?: string;
};

function MarkdownInlines({ nodes }: { nodes: MarkdownInlineNode[] }) {
  return (
    <>
      {nodes.map((node, index) => {
        const key = `${node.type}-${index}`;
        switch (node.type) {
          case "text":
            return <React.Fragment key={key}>{node.value}</React.Fragment>;
          case "strong":
            return <strong key={key}><MarkdownInlines nodes={node.children} /></strong>;
          case "em":
            return <em key={key}><MarkdownInlines nodes={node.children} /></em>;
          case "inline_code":
            return <code key={key}>{node.value}</code>;
          case "link":
            return <a key={key} href={node.href} title={node.title}>{<MarkdownInlines nodes={node.children} />}</a>;
          case "image":
            return <img key={key} src={node.src} alt={node.alt} title={node.title} />;
          case "softbreak":
            return <React.Fragment key={key}>{"\n"}</React.Fragment>;
          case "hardbreak":
            return <br key={key} />;
          case "html_inline":
            return <span key={key} dangerouslySetInnerHTML={{ __html: node.value }} />;
        }
      })}
    </>
  );
}

function MarkdownBlocks({ nodes }: { nodes: MarkdownBlockNode[] }) {
  return (
    <>
      {nodes.map((node, index) => {
        const key = `${node.type}-${index}`;
        switch (node.type) {
          case "heading": {
            const content = <MarkdownInlines nodes={node.children} />;
            if (node.depth === 1) return <h1 key={key}>{content}</h1>;
            if (node.depth === 2) return <h2 key={key}>{content}</h2>;
            if (node.depth === 3) return <h3 key={key}>{content}</h3>;
            if (node.depth === 4) return <h4 key={key}>{content}</h4>;
            if (node.depth === 5) return <h5 key={key}>{content}</h5>;
            return <h6 key={key}>{content}</h6>;
          }
          case "paragraph":
            return <p key={key}><MarkdownInlines nodes={node.children} /></p>;
          case "list": {
            const ListTag = (node.ordered ? "ol" : "ul") as "ol" | "ul";
            return (
              <ListTag key={key} start={node.ordered ? node.start : undefined}>
                {node.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>
                    <MarkdownBlocks nodes={item} />
                  </li>
                ))}
              </ListTag>
            );
          }
          case "blockquote":
            return <blockquote key={key}><MarkdownBlocks nodes={node.children} /></blockquote>;
          case "code":
            return <pre key={key}><code>{node.value}</code></pre>;
          case "html":
            return <div key={key} dangerouslySetInnerHTML={{ __html: node.value }} />;
          case "thematic_break":
            return <hr key={key} />;
          case "table":
            return (
              <table key={key}>
                <thead>
                  <tr>
                    {node.header.map((cell, cellIndex) => (
                      <th key={`${key}-head-${cellIndex}`}><MarkdownInlines nodes={cell} /></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {node.rows.map((row, rowIndex) => (
                    <tr key={`${key}-row-${rowIndex}`}>
                      {row.map((cell, cellIndex) => (
                        <td key={`${key}-cell-${rowIndex}-${cellIndex}`}>
                          <MarkdownInlines nodes={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
        }
      })}
    </>
  );
}

function findBlock(page: ParsedPage, name: string): BlockDefinition | undefined {
  return page.blocks.find((block) => block.name === name);
}

function findTarget(block: BlockDefinition | undefined, kind: "read" | "write", name: string): string | null {
  if (!block) return null;
  if (kind === "read") {
    return block.reads.find((item) => item.name === name)?.target ?? null;
  }
  return block.writes.find((item) => item.name === name)?.target ?? null;
}

function serializeInputsAsMarkdown(inputs: Record<string, unknown>): string {
  return Object.entries(inputs)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => `- ${name}: ${JSON.stringify(value)}`)
    .join("\n");
}

async function postMarkdownAction(target: string, inputs: Record<string, unknown>): Promise<string | ActionFailure> {
  const response = await fetch(target, {
    method: "POST",
    headers: {
      "content-type": "text/markdown",
      Accept: "text/markdown",
    },
    body: serializeInputsAsMarkdown(inputs),
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return await response.json() as ActionFailure;
  }

  return await response.text();
}

function GuestbookBlock(props: {
  page: ParsedPage;
  fragment: ParsedFragment | null;
  onFragment: (fragment: ParsedFragment) => void;
}) {
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const block = props.fragment?.block ?? findBlock(props.page, "guestbook");

  async function refresh() {
    const target = findTarget(block, "read", "refresh");
    if (!target) return;
    setBusy(true);
    setError(null);
    const result = await postMarkdownAction(target, {});
    setBusy(false);

    if (typeof result !== "string") {
      setError(result.message ?? result.errorCode);
      return;
    }

    startTransition(() => {
      props.onFragment(parseFragment(result));
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const target = findTarget(block, "write", "submit");
    if (!target) return;
    setBusy(true);
    setError(null);
    const result = await postMarkdownAction(target, { nickname, message });
    setBusy(false);

    if (typeof result !== "string") {
      setError(result.fieldErrors?.message ?? result.message ?? result.errorCode);
      return;
    }

    setMessage("");
    startTransition(() => {
      props.onFragment(parseFragment(result));
    });
  }

  const fragmentContainers = props.fragment?.containers ?? [];

  return (
    <section className="rg-card rg-guestbook">
      <div className="rg-card-copy">
        {fragmentContainers.length > 0
          ? fragmentContainers.map((container) => (
            <MarkdownBlocks key={container.id} nodes={container.nodes} />
          ))
          : <p className="rg-muted">Loading messages…</p>}
      </div>
      <form className="rg-form" onSubmit={submit}>
        <label>
          <span>Nickname</span>
          <input value={nickname} onChange={(event) => setNickname(event.target.value)} />
        </label>
        <label>
          <span>Message</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
          />
        </label>
        {error ? <p className="rg-error">{error}</p> : null}
        <div className="rg-actions">
          <button type="button" onClick={refresh} disabled={busy}>Refresh</button>
          <button type="submit" disabled={busy}>Send</button>
        </div>
      </form>
    </section>
  );
}

function App() {
  const [pageSource, setPageSource] = useState<string>("");
  const [fragment, setFragment] = useState<ParsedFragment | null>(null);
  const [loading, setLoading] = useState(true);

  const page = useMemo(() => (pageSource ? parsePage(pageSource) : null), [pageSource]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const pageResponse = await fetch("/page.md");
      const pageMarkdown = await pageResponse.text();
      if (cancelled) return;
      setPageSource(pageMarkdown);

      const refreshResponse = await postMarkdownAction("/list", {});
      if (cancelled) return;
      if (typeof refreshResponse === "string") {
        setFragment(parseFragment(refreshResponse));
      }

      setLoading(false);
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!page) {
    return <main className="rg-shell"><p>Loading…</p></main>;
  }

  return (
    <main className="rg-shell">
      <div className="rg-layout">
        {page.segments.map((segment, index) => {
          if (segment.type === "container") {
            return (
              <section key={`${segment.type}-${index}`} className="rg-copy">
                <MarkdownBlocks nodes={segment.container.nodes} />
              </section>
            );
          }

          if (segment.anchor.name === "guestbook") {
            return (
              <div key={`${segment.type}-${index}`} className="rg-sidebar">
                <GuestbookBlock
                  page={page}
                  fragment={fragment}
                  onFragment={setFragment}
                />
              </div>
            );
          }

          return null;
        })}
      </div>
      {loading ? <p className="rg-status">Loading guestbook state…</p> : null}
    </main>
  );
}

const root = document.getElementById("react-guestbook-root");
if (!root) {
  throw new Error("Missing react-guestbook-root");
}

createRoot(root).render(<App />);
