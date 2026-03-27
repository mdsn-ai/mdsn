export type DevChange = {
  version: number;
  path: string;
  changedAt: number;
};

export type DevParseError = {
  path: string;
  message: string;
  timestamp: number;
};

export type DevActionError = {
  actionId: string;
  message: string;
  timestamp: number;
};

export type DevActionRun = {
  actionId: string;
  pathname: string;
  inputSummary: string;
  status: "ok" | "failure" | "error";
  timestamp: number;
};

export type DevEvent =
  | {
      type: "file-change";
      version: number;
      path: string;
      timestamp: number;
    }
  | ({
      type: "parse-error";
    } & DevParseError)
  | ({
      type: "action-error";
    } & DevActionError)
  | ({
      type: "action-run";
    } & DevActionRun);

export type DevState = {
  getVersion: () => number;
  getLastChangedAt: () => number | null;
  getRecentChanges: () => DevChange[];
  getRecentActionRuns: () => DevActionRun[];
  getRecentEvents: () => DevEvent[];
  getLatestParseError: () => DevParseError | null;
  getLatestActionError: () => DevActionError | null;
  recordActionRun: (run: DevActionRun) => void;
  setLatestParseError: (error: DevParseError | null) => void;
  setLatestActionError: (error: DevActionError | null) => void;
  bumpVersion: (changedPath?: string) => number;
};

export function createDevState(): DevState {
  let version = 0;
  let lastChangedAt: number | null = null;
  const recentChanges: DevChange[] = [];
  const recentActionRuns: DevActionRun[] = [];
  const recentEvents: DevEvent[] = [];
  let latestParseError: DevParseError | null = null;
  let latestActionError: DevActionError | null = null;

  function recordEvent(event: DevEvent) {
    recentEvents.unshift(event);
    if (recentEvents.length > 20) {
      recentEvents.length = 20;
    }
  }

  return {
    getVersion() {
      return version;
    },
    getLastChangedAt() {
      return lastChangedAt;
    },
    getRecentChanges() {
      return [...recentChanges];
    },
    getRecentActionRuns() {
      return [...recentActionRuns];
    },
    getRecentEvents() {
      return [...recentEvents];
    },
    getLatestParseError() {
      return latestParseError;
    },
    getLatestActionError() {
      return latestActionError;
    },
    recordActionRun(run) {
      recentActionRuns.unshift(run);
      if (recentActionRuns.length > 10) {
        recentActionRuns.length = 10;
      }
      recordEvent({
        type: "action-run",
        ...run,
      });
    },
    setLatestParseError(error) {
      latestParseError = error;
      if (error) {
        recordEvent({
          type: "parse-error",
          ...error,
        });
      }
    },
    setLatestActionError(error) {
      latestActionError = error;
      if (error) {
        recordEvent({
          type: "action-error",
          ...error,
        });
      }
    },
    bumpVersion(changedPath) {
      version += 1;
      lastChangedAt = Date.now();
      if (changedPath) {
        recentChanges.unshift({
          version,
          path: changedPath,
          changedAt: lastChangedAt,
        });
        if (recentChanges.length > 10) {
          recentChanges.length = 10;
        }
        recordEvent({
          type: "file-change",
          version,
          path: changedPath,
          timestamp: lastChangedAt,
        });
      }
      return version;
    },
  };
}
