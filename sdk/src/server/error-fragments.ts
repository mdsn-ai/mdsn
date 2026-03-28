import { renderMarkdownFragment, type SerializableBlock } from "./markdown";

export interface RenderErrorFragmentOptions {
  preface?: string[];
  heading?: string;
  message: string;
  nextStep?: string;
  details?: string[];
  block?: SerializableBlock;
}

export function renderErrorFragment(options: RenderErrorFragmentOptions): string {
  return renderMarkdownFragment({
    body: [
      ...(options.preface ?? []),
      options.heading ?? "## Action Status",
      options.message,
      ...(options.details ?? []),
      options.nextStep,
    ].filter((value): value is string => typeof value === "string" && value.trim().length > 0),
    block: options.block,
  });
}

export interface RenderActionNotAvailableFragmentOptions {
  heading?: string;
  message?: string;
  nextStep?: string;
  block?: SerializableBlock;
}

export function renderActionNotAvailableFragment(
  options: RenderActionNotAvailableFragmentOptions = {},
): string {
  return renderErrorFragment({
    heading: options.heading ?? "## Action Status",
    message: options.message ?? "This action is not available on the current server.",
    nextStep: options.nextStep ?? "Next step: follow another declared action or reload the current page definition.",
    block: options.block,
  });
}

export interface RenderUnsupportedContentTypeFragmentOptions {
  heading?: string;
  message?: string;
  nextStep?: string;
  block?: SerializableBlock;
}

export function renderUnsupportedContentTypeFragment(
  options: RenderUnsupportedContentTypeFragmentOptions = {},
): string {
  return renderErrorFragment({
    heading: options.heading ?? "## Action Status",
    message: options.message ?? "Unsupported content type for write action.",
    nextStep: options.nextStep
      ?? "Next step: resend with `Content-Type: text/markdown` and a plain-text `key: value` body.",
    block: options.block,
  });
}

export interface RenderInternalErrorFragmentOptions {
  heading?: string;
  message?: string;
  nextStep?: string;
  error?: unknown;
  block?: SerializableBlock;
}

export function renderInternalErrorFragment(
  options: RenderInternalErrorFragmentOptions = {},
): string {
  return renderErrorFragment({
    heading: options.heading ?? "## Action Status",
    message: options.message ?? "The action failed due to an internal error.",
    nextStep: options.nextStep ?? "Next step: retry the action, or inspect server logs if the problem persists.",
    details: options.error == null
      ? []
      : [options.error instanceof Error ? options.error.message : String(options.error)],
    block: options.block,
  });
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
  const emailInputName = options.emailInputName ?? "email";
  const passwordInputName = options.passwordInputName ?? "password";
  const loginActionName = options.loginActionName ?? "login";
  const loginTarget = options.loginTarget ?? "/login";
  const includeRegisterAction = options.includeRegisterAction ?? true;
  const registerActionName = options.registerActionName ?? "go_register";
  const registerTarget = options.registerTarget ?? "/register";

  const block: SerializableBlock = {
    name: options.blockName ?? "auth",
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

  return renderErrorFragment({
    heading: options.heading ?? "## Login Status",
    message: options.message ?? "Login required: sign in before continuing.",
    nextStep: options.nextStep
      ?? "Next step: enter email/password and run login, or go to register if no account exists.",
    block,
  });
}
