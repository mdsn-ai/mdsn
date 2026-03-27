import { normalizeActionResult, type ActionResult } from "../core/action";

export type ActionHandler<Context = unknown> = (ctx: Context) => Promise<unknown> | unknown;

export async function executeActionHandler<Context>(
  handler: ActionHandler<Context>,
  ctx?: Context,
): Promise<ActionResult> {
  const result = await handler(ctx as Context);
  return normalizeActionResult(result);
}
