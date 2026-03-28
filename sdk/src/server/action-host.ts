export type ActionHandler<Context = unknown> = (ctx: Context) => Promise<string> | string;

export async function executeActionHandler<Context>(
  handler: ActionHandler<Context>,
  ctx?: Context,
): Promise<string> {
  const result = await handler(ctx as Context);
  if (typeof result !== "string") {
    throw new Error("Invalid action result: expected markdown string");
  }
  return result;
}
