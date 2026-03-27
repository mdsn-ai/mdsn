export type FrameworkTarget = {
  kind: "action";
  target: string;
  actionPath: string;
};

export function parseFrameworkTarget(target: string): FrameworkTarget | null {
  if (!target || /\.md$/i.test(target) || /^https?:\/\//i.test(target)) {
    return null;
  }

  const actionPath = target.replace(/^\/+/, "");
  if (!actionPath) {
    return null;
  }

  return {
    kind: "action",
    target,
    actionPath,
  };
}

export function isActionTarget(target: string): boolean {
  return parseFrameworkTarget(target) !== null;
}
