import type { MdsnSessionMutation, MdsnSessionSnapshot } from "./types.js";

export function signIn(session: MdsnSessionSnapshot): MdsnSessionMutation {
  return {
    type: "sign-in",
    session
  };
}

export function refreshSession(session: MdsnSessionSnapshot): MdsnSessionMutation {
  return {
    type: "refresh",
    session
  };
}

export function signOut(): MdsnSessionMutation {
  return {
    type: "sign-out"
  };
}
