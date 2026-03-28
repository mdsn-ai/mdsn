import { renderMarkdownFragment, type SerializableBlock } from "./markdown";

export type HeaderCarrier = {
  get(name: string): string | null;
  getSetCookie?: () => string[];
};

export function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return Object.fromEntries(cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf("=");
      if (eq === -1) {
        return [part, ""] as const;
      }
      return [part.slice(0, eq), decodeURIComponent(part.slice(eq + 1))] as const;
    }));
}

function splitCombinedSetCookieHeader(setCookieHeader: string): string[] {
  const results: string[] = [];
  let current = "";
  let inExpires = false;

  for (let index = 0; index < setCookieHeader.length; index += 1) {
    const character = setCookieHeader[index];
    if (!character) {
      continue;
    }

    if (character === ",") {
      if (inExpires) {
        current += character;
        continue;
      }
      results.push(current.trim());
      current = "";
      continue;
    }

    current += character;

    if (character === ";") {
      inExpires = false;
      continue;
    }

    if (!inExpires && /expires=/iu.test(current.slice(-8))) {
      inExpires = true;
    }
  }

  if (current.trim().length > 0) {
    results.push(current.trim());
  }

  return results.filter(Boolean);
}

function parseSetCookieLine(line: string): {
  name: string;
  value: string;
  attributes: Record<string, string>;
} | null {
  const segments = line.split(";").map((segment) => segment.trim()).filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  const pair = segments[0] ?? "";
  const eq = pair.indexOf("=");
  if (eq <= 0) {
    return null;
  }
  const name = pair.slice(0, eq).trim();
  const value = pair.slice(eq + 1).trim();
  if (!name) {
    return null;
  }

  const attributes: Record<string, string> = {};
  for (const attributeSegment of segments.slice(1)) {
    const attributeEq = attributeSegment.indexOf("=");
    if (attributeEq === -1) {
      attributes[attributeSegment.toLowerCase()] = "true";
      continue;
    }
    const key = attributeSegment.slice(0, attributeEq).trim().toLowerCase();
    const attributeValue = attributeSegment.slice(attributeEq + 1).trim();
    attributes[key] = attributeValue;
  }

  return {
    name,
    value,
    attributes,
  };
}

function shouldDeleteCookie(parsed: { value: string; attributes: Record<string, string> }): boolean {
  if (parsed.value === "") {
    return true;
  }

  const maxAge = parsed.attributes["max-age"];
  if (typeof maxAge === "string") {
    const numeric = Number(maxAge);
    if (Number.isFinite(numeric) && numeric <= 0) {
      return true;
    }
  }

  const expires = parsed.attributes.expires;
  if (typeof expires === "string") {
    const expiresAt = Date.parse(expires);
    if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
      return true;
    }
  }

  return false;
}

function normalizeSetCookieHeader(input: string | string[] | null | undefined): string[] {
  if (!input) {
    return [];
  }

  if (Array.isArray(input)) {
    return input.flatMap((entry) => splitCombinedSetCookieHeader(entry));
  }

  return splitCombinedSetCookieHeader(input);
}

export class HttpCookieJar {
  private readonly values = new Map<string, string>();

  constructor(initialValues?: Record<string, string>) {
    if (initialValues) {
      for (const [name, value] of Object.entries(initialValues)) {
        this.values.set(name, value);
      }
    }
  }

  get(name: string): string | undefined {
    return this.values.get(name);
  }

  set(name: string, value: string): void {
    this.values.set(name, value);
  }

  delete(name: string): void {
    this.values.delete(name);
  }

  clear(): void {
    this.values.clear();
  }

  toCookieHeader(): string {
    return Array.from(this.values.entries()).map(([name, value]) => `${name}=${value}`).join("; ");
  }

  applyToHeaders(headers: Record<string, string> = {}): Record<string, string> {
    const cookieHeader = this.toCookieHeader();
    if (!cookieHeader) {
      return { ...headers };
    }

    const existing = headers.Cookie ?? headers.cookie;
    if (!existing || String(existing).trim().length === 0) {
      return {
        ...headers,
        Cookie: cookieHeader,
      };
    }

    return {
      ...headers,
      Cookie: `${String(existing)}; ${cookieHeader}`,
    };
  }

  ingestSetCookieHeader(setCookieHeader: string | string[] | null | undefined): void {
    for (const line of normalizeSetCookieHeader(setCookieHeader)) {
      const parsed = parseSetCookieLine(line);
      if (!parsed) {
        continue;
      }

      if (shouldDeleteCookie(parsed)) {
        this.values.delete(parsed.name);
        continue;
      }
      this.values.set(parsed.name, parsed.value);
    }
  }

  ingestFromResponse(response: { headers: HeaderCarrier }): void {
    const headers = response.headers;
    const getSetCookie = headers.getSetCookie;
    if (typeof getSetCookie === "function") {
      this.ingestSetCookieHeader(getSetCookie.call(headers));
      return;
    }

    this.ingestSetCookieHeader(headers.get("set-cookie"));
  }
}

export interface RenderAuthRequiredFragmentOptions {
  heading?: string;
  message?: string;
  nextStep?: string;
  blockName?: string;
  emailInputName?: string;
  passwordInputName?: string;
  loginActionName?: string;
  loginTarget?: string;
  registerActionName?: string;
  registerTarget?: string;
  includeRegisterAction?: boolean;
}

export function renderAuthRequiredFragment(
  options: RenderAuthRequiredFragmentOptions = {},
): string {
  const heading = options.heading ?? "## Login Status";
  const message = options.message ?? "Login required: sign in before continuing.";
  const nextStep = options.nextStep
    ?? "Next step: enter email/password and run login, or go to register if no account exists.";

  const emailInputName = options.emailInputName ?? "email";
  const passwordInputName = options.passwordInputName ?? "password";
  const loginActionName = options.loginActionName ?? "login";
  const loginTarget = options.loginTarget ?? "/login";
  const includeRegisterAction = options.includeRegisterAction ?? true;
  const registerActionName = options.registerActionName ?? "go_register";
  const registerTarget = options.registerTarget ?? "/register";
  const blockName = options.blockName ?? "auth";

  const block: SerializableBlock = {
    name: blockName,
    inputs: [
      { name: emailInputName, type: "text", required: true },
      { name: passwordInputName, type: "text", required: true, secret: true },
    ],
    reads: includeRegisterAction
      ? [{ name: registerActionName, target: registerTarget }]
      : [],
    writes: [
      { name: loginActionName, target: loginTarget, inputs: [emailInputName, passwordInputName] },
    ],
  };

  return renderMarkdownFragment({
    body: [
      heading,
      message,
      nextStep,
    ],
    block,
  });
}

export type SessionGuardSuccess<Session> = {
  ok: true;
  cookies: Record<string, string>;
  sessionId: string;
  session: Session;
};

export type SessionGuardFailure = {
  ok: false;
  status: 401;
  cookies: Record<string, string>;
  markdown: string;
};

export type SessionGuardResult<Session> =
  | SessionGuardSuccess<Session>
  | SessionGuardFailure;

export interface RequireSessionFromCookieOptions<Session> {
  cookieHeader?: string;
  cookieName: string;
  resolveSession: (sessionId: string) => Session | null;
  unauthorizedMarkdown?: string;
  unauthorizedMessage?: string;
}

export function requireSessionFromCookie<Session>(
  options: RequireSessionFromCookieOptions<Session>,
): SessionGuardResult<Session> {
  const cookies = parseCookieHeader(options.cookieHeader);
  const sessionId = cookies[options.cookieName];
  if (!sessionId) {
    return {
      ok: false,
      status: 401,
      cookies,
      markdown: options.unauthorizedMarkdown ?? renderAuthRequiredFragment({
        message: options.unauthorizedMessage ?? "Login required: sign in before continuing.",
      }),
    };
  }

  const session = options.resolveSession(sessionId);
  if (!session) {
    return {
      ok: false,
      status: 401,
      cookies,
      markdown: options.unauthorizedMarkdown ?? renderAuthRequiredFragment({
        message: options.unauthorizedMessage ?? "Session expired: sign in again to continue.",
      }),
    };
  }

  return {
    ok: true,
    cookies,
    sessionId,
    session,
  };
}
