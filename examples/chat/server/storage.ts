import crypto from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export type ChatUser = {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

export type ChatSession = {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
};

export type ChatMessage = {
  id: string;
  userId: string;
  room: string;
  content: string;
  createdAt: string;
  username: string;
};

export type ChatStorage = {
  createUser(input: { username: string; email: string; password: string }): ChatUser;
  authenticateUser(input: { email: string; password: string }): ChatUser | null;
  createSession(userId: string): ChatSession;
  getSession(sessionId: string): (ChatSession & { user: ChatUser }) | null;
  deleteSession(sessionId: string): void;
  appendMessage(input: { userId: string; room?: string; content: string }): ChatMessage;
  listRecentMessages(limit?: number, room?: string): ChatMessage[];
  reset(): void;
  close(): void;
};

const DEFAULT_ROOM = "main";
const DEFAULT_MESSAGE_LIMIT = 50;

function nowIso(): string {
  return new Date().toISOString();
}

function createId(): string {
  return crypto.randomBytes(16).toString("hex");
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function openDatabase(dbPath: string): DatabaseSync {
  mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      room TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_room_created_at ON messages(room, created_at);
  `);
  return db;
}

function rowToUser(row: Record<string, unknown>): ChatUser {
  return {
    id: String(row.id),
    username: String(row.username),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    createdAt: String(row.created_at),
  };
}

export function createChatStorage(dbPath: string): ChatStorage {
  const db = openDatabase(dbPath);

  const findUserByIdentity = db.prepare(`
    SELECT id, username, email, password_hash, created_at
    FROM users
    WHERE username = ? OR email = ?
    LIMIT 1
  `);

  const findUserByEmail = db.prepare(`
    SELECT id, username, email, password_hash, created_at
    FROM users
    WHERE email = ?
    LIMIT 1
  `);

  const insertUser = db.prepare(`
    INSERT INTO users (id, username, email, password_hash, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertSession = db.prepare(`
    INSERT INTO sessions (id, user_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `);

  const deleteSession = db.prepare(`
    DELETE FROM sessions
    WHERE id = ?
  `);

  const findSession = db.prepare(`
    SELECT
      s.id AS session_id,
      s.user_id,
      s.created_at AS session_created_at,
      s.expires_at,
      u.id,
      u.username,
      u.email,
      u.password_hash,
      u.created_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ?
    LIMIT 1
  `);

  const insertMessage = db.prepare(`
    INSERT INTO messages (id, user_id, room, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const listMessages = db.prepare(`
    SELECT
      m.id,
      m.user_id,
      m.room,
      m.content,
      m.created_at,
      u.username
    FROM messages m
    JOIN users u ON u.id = m.user_id
    WHERE m.room = ?
    ORDER BY m.created_at DESC
    LIMIT ?
  `);

  const deleteMessages = db.prepare("DELETE FROM messages");
  const deleteSessions = db.prepare("DELETE FROM sessions");
  const deleteUsers = db.prepare("DELETE FROM users");

  return {
    createUser(input) {
      const username = input.username.trim();
      const email = input.email.trim().toLowerCase();
      const passwordHash = hashPassword(input.password);
      const existing = findUserByIdentity.get(username, email) as Record<string, unknown> | undefined;

      if (existing) {
        throw new Error("IDENTITY_CONFLICT");
      }

      const user: ChatUser = {
        id: createId(),
        username,
        email,
        passwordHash,
        createdAt: nowIso(),
      };
      insertUser.run(user.id, user.username, user.email, user.passwordHash, user.createdAt);
      return user;
    },

    authenticateUser(input) {
      const email = input.email.trim().toLowerCase();
      const passwordHash = hashPassword(input.password);
      const existing = findUserByEmail.get(email) as Record<string, unknown> | undefined;
      if (!existing) {
        return null;
      }

      const user = rowToUser(existing);
      if (user.passwordHash !== passwordHash) {
        return null;
      }

      return user;
    },

    createSession(userId) {
      const session: ChatSession = {
        id: createId(),
        userId,
        createdAt: nowIso(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      };
      insertSession.run(session.id, session.userId, session.createdAt, session.expiresAt);
      return session;
    },

    getSession(sessionId) {
      const row = findSession.get(sessionId) as Record<string, unknown> | undefined;
      if (!row) {
        return null;
      }

      if (new Date(String(row.expires_at)).getTime() <= Date.now()) {
        return null;
      }

      return {
        id: String(row.session_id),
        userId: String(row.user_id),
        createdAt: String(row.session_created_at),
        expiresAt: String(row.expires_at),
        user: rowToUser(row),
      };
    },

    deleteSession(sessionId) {
      deleteSession.run(sessionId);
    },

    appendMessage(input) {
      const message: ChatMessage = {
        id: createId(),
        userId: input.userId,
        room: input.room ?? DEFAULT_ROOM,
        content: input.content,
        createdAt: nowIso(),
        username: "",
      };
      insertMessage.run(message.id, message.userId, message.room, message.content, message.createdAt);
      const latest = listMessages.get(message.room, 1) as Record<string, unknown> | undefined;
      return {
        id: String(latest?.id ?? message.id),
        userId: String(latest?.user_id ?? message.userId),
        room: String(latest?.room ?? message.room),
        content: String(latest?.content ?? message.content),
        createdAt: String(latest?.created_at ?? message.createdAt),
        username: String(latest?.username ?? ""),
      };
    },

    listRecentMessages(limit = DEFAULT_MESSAGE_LIMIT, room = DEFAULT_ROOM) {
      const rows = listMessages.all(room, limit) as Array<Record<string, unknown>>;
      return rows
        .map((row) => ({
          id: String(row.id),
          userId: String(row.user_id),
          room: String(row.room),
          content: String(row.content),
          createdAt: String(row.created_at),
          username: String(row.username),
        }))
        .reverse();
    },

    reset() {
      deleteMessages.run();
      deleteSessions.run();
      deleteUsers.run();
    },

    close() {
      db.close();
    },
  };
}
