import type { MdsnRepresentation } from "./types.js";

interface AcceptEntry {
  mediaType: string;
  q: number;
}

function parseAcceptHeader(acceptHeader: string): AcceptEntry[] {
  return acceptHeader
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [mediaType = "", ...params] = part.split(";").map((value) => value.trim());
      const qParam = params.find((value) => value.startsWith("q="));
      const q = qParam ? Number(qParam.slice(2)) : 1;
      return {
        mediaType: mediaType.toLowerCase(),
        q: Number.isFinite(q) ? q : 1
      };
    });
}

export function negotiateRepresentation(acceptHeader?: string): MdsnRepresentation {
  if (!acceptHeader) {
    return "html";
  }

  const accepted = parseAcceptHeader(acceptHeader);
  const weightByRepresentation: Record<Exclude<MdsnRepresentation, "not-acceptable">, number> = {
    "event-stream": 0,
    markdown: 0,
    html: 0
  };

  for (const entry of accepted) {
    if (entry.q <= 0) {
      continue;
    }

    if (entry.mediaType === "text/event-stream") {
      weightByRepresentation["event-stream"] = Math.max(weightByRepresentation["event-stream"], entry.q);
      continue;
    }

    if (entry.mediaType === "text/markdown") {
      weightByRepresentation.markdown = Math.max(weightByRepresentation.markdown, entry.q);
      continue;
    }

    if (["text/html", "text/*", "*/*"].includes(entry.mediaType)) {
      weightByRepresentation.html = Math.max(weightByRepresentation.html, entry.q);
    }
  }

  const candidates = (Object.entries(weightByRepresentation) as Array<
    [Exclude<MdsnRepresentation, "not-acceptable">, number]
  >).filter(([, weight]) => weight > 0);
  if (candidates.length === 0) {
    return "not-acceptable";
  }

  const tieBreaker: Record<Exclude<MdsnRepresentation, "not-acceptable">, number> = {
    "event-stream": 3,
    markdown: 2,
    html: 1
  };

  candidates.sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }
    return tieBreaker[right[0]] - tieBreaker[left[0]];
  });

  const winner = candidates[0]?.[0];
  if (!winner) {
    return "not-acceptable";
  }

  return winner;
}
