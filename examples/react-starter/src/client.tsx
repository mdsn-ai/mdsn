import { createHeadlessHost, type HeadlessSnapshot, type MdsnHeadlessHost } from "@mdsnai/sdk/web";
import { marked } from "marked";
import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

function humanizeLabel(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function renderMarkdown(markdown: string): string {
  return marked.parse(markdown) as string;
}

function RenderMarkdown({ markdown }: { markdown: string }) {
  const html = useMemo(() => renderMarkdown(markdown), [markdown]);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

function ReactMdsnHeadlessHost() {
  const [host, setHost] = useState<MdsnHeadlessHost | null>(null);
  const [snapshot, setSnapshot] = useState<HeadlessSnapshot | null>(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const nextHost = createHeadlessHost({
      root: document,
      fetchImpl: window.fetch.bind(window)
    });
    setHost(nextHost);
    const unsubscribe = nextHost.subscribe((next) => {
      setSnapshot(next);
      setStatus(next.status);
      setError(next.error ?? "");
    });
    nextHost.mount();

    return () => {
      unsubscribe();
      nextHost.unmount();
      setHost(null);
    };
  }, []);

  if (!snapshot) {
    return null;
  }

  async function handleGet(operation: HeadlessSnapshot["blocks"][number]["operations"][number]) {
    if (host) {
      await host.submit(operation, {});
    }
  }

  async function handlePost(
    event: React.FormEvent<HTMLFormElement>,
    operation: HeadlessSnapshot["blocks"][number]["operations"][number]
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) {
      return;
    }
    const payload: Record<string, string> = {};
    for (const name of operation.inputs) {
      payload[name] = values[name] ?? "";
    }
    if (host) {
      await host.submit(operation, payload);
      setValues((current) => {
        const next = { ...current };
        for (const name of operation.inputs) {
          next[name] = "";
        }
        return next;
      });
    }
  }

  return (
    <div className="framework-shell">
      <div className="framework-status">
        <span className="framework-pill">React headless host: {status}</span>
        {error ? <span className="framework-error">{error}</span> : null}
      </div>
      <main className="framework-page">
        <RenderMarkdown markdown={snapshot.markdown} />

        {snapshot.blocks.map((block) => (
          <section key={block.name} className="framework-block">
            <RenderMarkdown markdown={block.markdown} />

            {block.operations.some((operation) => operation.method === "GET") ? (
              <div className="framework-actions">
                {block.operations
                  .filter((operation) => operation.method === "GET")
                  .map((operation) => (
                    <button
                      key={operation.target}
                      type="button"
                      className="framework-button framework-button-secondary"
                      onClick={() => void handleGet(operation)}
                    >
                      {operation.label ?? operation.name ?? operation.target}
                    </button>
                  ))}
              </div>
            ) : null}

            {block.operations
              .filter((operation) => operation.method === "POST")
              .map((operation) => (
                <form
                  key={operation.target}
                  className="framework-form"
                  onSubmit={(event) => void handlePost(event, operation)}
                >
                  {block.inputs
                    .filter((input) => operation.inputs.includes(input.name))
                    .map((input) => (
                      <label key={input.name} className="framework-field">
                        <span className="framework-label">
                          {humanizeLabel(input.name)}
                          {input.required ? <span className="framework-required">*</span> : null}
                        </span>
                        {input.type === "choice" ? (
                          <select
                            name={input.name}
                            required={input.required}
                            value={values[input.name] ?? ""}
                            onChange={(event) =>
                              setValues((current) => ({ ...current, [input.name]: event.target.value }))
                            }
                          >
                            {(input.options ?? []).map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : input.type === "boolean" ? (
                          <input
                            name={input.name}
                            type="checkbox"
                            required={input.required}
                            checked={values[input.name] === "true"}
                            onChange={(event) =>
                              setValues((current) => ({
                                ...current,
                                [input.name]: event.target.checked ? "true" : "false"
                              }))
                            }
                          />
                        ) : input.type === "asset" ? (
                          <input
                            name={input.name}
                            type="file"
                            required={input.required}
                            onChange={(event) =>
                              setValues((current) => ({
                                ...current,
                                [input.name]: event.target.files?.[0]?.name ?? ""
                              }))
                            }
                          />
                        ) : (
                          <input
                            name={input.name}
                            type={input.secret ? "password" : input.type === "number" ? "number" : "text"}
                            required={input.required}
                            placeholder={input.name === "message" ? "Write something worth keeping" : ""}
                            value={values[input.name] ?? ""}
                            onChange={(event) =>
                              setValues((current) => ({ ...current, [input.name]: event.target.value }))
                            }
                          />
                        )}
                      </label>
                    ))}

                  <button className="framework-button" type="submit" disabled={snapshot.status === "loading"}>
                    {operation.label ?? operation.name ?? operation.target}
                  </button>
                </form>
              ))}
          </section>
        ))}
      </main>
    </div>
  );
}

export function mountReactStarter(host: HTMLElement): void {
  createRoot(host).render(<ReactMdsnHeadlessHost />);
}
