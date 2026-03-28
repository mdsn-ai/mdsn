export type InputType = "text" | "number" | "boolean" | "choice" | "asset";

export interface InputDefinition {
  id: string;
  block: string;
  name: string;
  type: InputType;
  required: boolean;
  secret: boolean;
  options?: string[];
}
