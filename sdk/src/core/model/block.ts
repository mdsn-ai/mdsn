import type { InputDefinition } from "./input";

export interface ReadDefinition {
  id: string;
  block: string;
  name: string;
  target: string;
  inputs: string[];
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

export interface RedirectDefinition {
  id: string;
  block: string;
  target: string;
  order: number;
}

export interface BlockDefinition {
  name: string;
  inputs: InputDefinition[];
  reads: ReadDefinition[];
  writes: WriteDefinition[];
  redirects: RedirectDefinition[];
}
