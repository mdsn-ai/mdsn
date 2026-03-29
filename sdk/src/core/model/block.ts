import type { InputDefinition } from "./input";

export const STREAM_ACCEPT = "text/event-stream";

export function isStreamAccept(accept?: string): boolean {
  return String(accept ?? "").toLowerCase() === STREAM_ACCEPT;
}

export interface ReadDefinition {
  id: string;
  block: string;
  name?: string;
  target: string;
  inputs: string[];
  accept?: string;
  order: number;
}

export interface WriteDefinition {
  id: string;
  block: string;
  name: string;
  target: string;
  inputs: string[];
  order: number;
}

export interface BlockDefinition {
  name: string;
  inputs: InputDefinition[];
  reads: ReadDefinition[];
  writes: WriteDefinition[];
}
