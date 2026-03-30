import type { MdsnHandler, MdsnPageHandler } from "./types.js";

export class MdsnRouter {
  private readonly getHandlers = new Map<string, MdsnHandler>();
  private readonly postHandlers = new Map<string, MdsnHandler>();
  private readonly pageHandlers = new Map<string, MdsnPageHandler>();

  get(path: string, handler: MdsnHandler): void {
    this.getHandlers.set(path, handler);
  }

  post(path: string, handler: MdsnHandler): void {
    this.postHandlers.set(path, handler);
  }

  page(path: string, handler: MdsnPageHandler): void {
    this.pageHandlers.set(path, handler);
  }

  resolve(method: "GET" | "POST", path: string): MdsnHandler | undefined {
    if (method === "GET") {
      return this.getHandlers.get(path);
    }
    return this.postHandlers.get(path);
  }

  resolvePage(path: string): MdsnPageHandler | undefined {
    return this.pageHandlers.get(path);
  }
}
