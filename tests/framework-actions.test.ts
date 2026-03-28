import { describe, expect, it } from "vitest";
import {
  actionFilePathToActionId,
  createActionRegistry,
  defineActions,
  defineAction,
  resolveActionById,
} from "../sdk/src/server/action";

describe("defineAction", () => {
  it("returns the original action definition", async () => {
    const action = defineAction({
      async run() {
        return "ok";
      },
    });

    await expect(action.run({} as never)).resolves.toEqual("ok");
  });

  it("returns markdown fragments directly", async () => {
    const action = defineAction({
      async run() {
        return "## Done";
      },
    });

    await expect(action.run({} as never)).resolves.toEqual("## Done");
  });

  it("returns the original multi-action definition map", async () => {
    const actions = defineActions({
      list: defineAction({
        async run() {
          return "# List";
        },
      }),
      post: defineAction({
        async run() {
          return "# Post";
        },
      }),
    });

    await expect(actions.list.run({} as never)).resolves.toEqual("# List");
    await expect(actions.post.run({} as never)).resolves.toEqual("# Post");
  });
});

describe("framework action registry", () => {
  it("derives action ids from action file paths", () => {
    expect(actionFilePathToActionId("server/search.cjs", "server")).toBe("search");
    expect(actionFilePathToActionId("server/posts/create.mjs", "server")).toBe("posts/create");
  });

  it("creates a registry and resolves actions by id", async () => {
    const searchAction = defineAction({
      async run() {
        return "# Search";
      },
    });
    const createAction = defineAction({
      async run() {
        return "# Created";
      },
    });

    const registry = createActionRegistry([
      { id: "search", action: searchAction },
      { id: "posts/create", action: createAction },
    ]);

    expect(resolveActionById(registry, "search")).toBe(searchAction);
    expect(resolveActionById(registry, "posts/create")).toBe(createAction);
    expect(resolveActionById(registry, "missing")).toBeUndefined();
  });
});
