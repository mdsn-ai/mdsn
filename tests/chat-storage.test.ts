import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createChatStorage } from "../examples/chat/server/storage";

let activeDir: string | null = null;

afterEach(async () => {
  if (activeDir) {
    await rm(activeDir, { recursive: true, force: true });
    activeDir = null;
  }
});

async function withStorage(run: (storage: ReturnType<typeof createChatStorage>) => void | Promise<void>) {
  activeDir = await mkdtemp(path.join(os.tmpdir(), "mdsn-chat-storage-"));
  const storage = createChatStorage(path.join(activeDir, "chat.sqlite"));
  try {
    await run(storage);
  } finally {
    storage.close();
  }
}

describe("chat storage", () => {
  it("persists registered users and authenticates them by email and password", async () => {
    await withStorage((storage) => {
      const user = storage.createUser({
        username: "AgentAlpha",
        email: "alpha@example.com",
        password: "secret",
      });

      const sameUser = storage.authenticateUser({
        email: "alpha@example.com",
        password: "secret",
      });

      expect(sameUser?.id).toBe(user.id);

      const missingUser = storage.authenticateUser({
        email: "alpha@example.com",
        password: "wrong-secret",
      });

      expect(missingUser).toBeNull();

      const session = storage.createSession(user.id);
      const hydrated = storage.getSession(session.id);
      expect(hydrated?.user.username).toBe("AgentAlpha");
      expect(hydrated?.user.email).toBe("alpha@example.com");
    });
  });

  it("rejects duplicate usernames or emails during registration", async () => {
    await withStorage((storage) => {
      storage.createUser({
        username: "AgentAlpha",
        email: "alpha@example.com",
        password: "secret",
      });

      expect(() => storage.createUser({
        username: "AgentAlpha",
        email: "beta@example.com",
        password: "secret",
      })).toThrowError("IDENTITY_CONFLICT");

      expect(() => storage.createUser({
        username: "AgentBeta",
        email: "alpha@example.com",
        password: "secret",
      })).toThrowError("IDENTITY_CONFLICT");
    });
  });

  it("returns only the latest 50 messages in display order", async () => {
    await withStorage((storage) => {
      const user = storage.createUser({
        username: "AgentAlpha",
        email: "alpha@example.com",
        password: "secret",
      });

      for (let index = 1; index <= 55; index += 1) {
        storage.appendMessage({
          userId: user.id,
          content: `message-${index}`,
        });
      }

      const messages = storage.listRecentMessages();
      expect(messages).toHaveLength(50);
      expect(messages[0]?.content).toBe("message-6");
      expect(messages.at(-1)?.content).toBe("message-55");
    });
  });
});
