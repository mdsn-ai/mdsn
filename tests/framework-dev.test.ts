import { describe, expect, it } from "vitest";
import { createDevState } from "../sdk/src/server/dev";

describe("framework dev state", () => {
  it("starts at version 0 and increments when bumped", () => {
    const devState = createDevState();

    expect(devState.getVersion()).toBe(0);

    devState.bumpVersion();
    devState.bumpVersion();

    expect(devState.getVersion()).toBe(2);
  });

  it("tracks the last change timestamp when bumped", () => {
    const before = Date.now();
    const devState = createDevState();

    expect(devState.getLastChangedAt()).toBeNull();

    devState.bumpVersion();

    const lastChangedAt = devState.getLastChangedAt();
    expect(lastChangedAt).not.toBeNull();
    expect(lastChangedAt as number).toBeGreaterThanOrEqual(before);
  });

  it("keeps the most recent file changes in reverse chronological order", () => {
    const devState = createDevState();

    devState.bumpVersion("pages/index.md");
    devState.bumpVersion("server/hello.cjs");
    devState.bumpVersion("public/logo.png");

    expect(devState.getRecentChanges()).toEqual([
      { version: 3, path: "public/logo.png", changedAt: expect.any(Number) },
      { version: 2, path: "server/hello.cjs", changedAt: expect.any(Number) },
      { version: 1, path: "pages/index.md", changedAt: expect.any(Number) },
    ]);
  });

  it("records the latest parse and action errors", () => {
    const devState = createDevState();

    expect(devState.getLatestParseError()).toBeNull();
    expect(devState.getLatestActionError()).toBeNull();

    devState.setLatestParseError({
      path: "pages/broken.md",
      message: "Invalid block declaration",
      timestamp: 123,
    });
    devState.setLatestActionError({
      actionId: "search",
      message: "Boom",
      timestamp: 456,
    });

    expect(devState.getLatestParseError()).toEqual({
      path: "pages/broken.md",
      message: "Invalid block declaration",
      timestamp: 123,
    });
    expect(devState.getLatestActionError()).toEqual({
      actionId: "search",
      message: "Boom",
      timestamp: 456,
    });
  });

  it("records recent action runs in reverse chronological order", () => {
    const devState = createDevState();

    expect(devState.getRecentActionRuns()).toEqual([]);

    devState.recordActionRun({
      actionId: "search",
      pathname: "/search",
      inputSummary: '{"query":"bags"}',
      status: "ok",
      timestamp: 100,
    });
    devState.recordActionRun({
      actionId: "search",
      pathname: "/search",
      inputSummary: '{"query":"shoes"}',
      status: "failure",
      timestamp: 200,
    });

    expect(devState.getRecentActionRuns()).toEqual([
      {
        actionId: "search",
        pathname: "/search",
        inputSummary: '{"query":"shoes"}',
        status: "failure",
        timestamp: 200,
      },
      {
        actionId: "search",
        pathname: "/search",
        inputSummary: '{"query":"bags"}',
        status: "ok",
        timestamp: 100,
      },
    ]);
  });

  it("records recent dev events across file changes, action runs, and errors", () => {
    const devState = createDevState();

    expect(devState.getRecentEvents()).toEqual([]);

    devState.bumpVersion("pages/index.md");
    devState.recordActionRun({
      actionId: "search",
      pathname: "/search",
      inputSummary: '{"query":"bags"}',
      status: "ok",
      timestamp: 200,
    });
    devState.setLatestActionError({
      actionId: "search",
      message: "Boom",
      timestamp: 300,
    });

    expect(devState.getRecentEvents()).toEqual([
      {
        type: "action-error",
        actionId: "search",
        message: "Boom",
        timestamp: 300,
      },
      {
        type: "action-run",
        actionId: "search",
        pathname: "/search",
        inputSummary: '{"query":"bags"}',
        status: "ok",
        timestamp: 200,
      },
      {
        type: "file-change",
        version: 1,
        path: "pages/index.md",
        timestamp: expect.any(Number),
      },
    ]);
  });
});
